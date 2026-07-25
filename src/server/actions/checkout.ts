"use server";

import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { orderItems, orders, payments, products } from "@/db/schema";
import { env } from "@/env";
import { getPaymentGateway } from "@/lib/payments";
import { getSession } from "@/server/guards";
import { consumeRateLimit } from "@/server/rate-limit";

/**
 * The client sends product ids and quantities. It does not send prices, and
 * none are read from what it sends — every figure below is recomputed from the
 * database. The source app posted a browser-calculated total and charged it.
 */
const checkoutSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(80),
  phone: z.string().trim().min(7, "Please enter a valid phone").max(20),
  email: z.email("Please enter a valid email").max(120),
  fulfilment: z.enum(["dine_in", "pickup"]),
  tableNumber: z.string().trim().max(20).nullable(),
  notes: z.string().trim().max(500).optional(),
  lines: z
    .array(
      z.object({
        productId: z.uuid(),
        qty: z.number().int().min(1).max(99),
        size: z.string().trim().max(50).nullish(),
        color: z.string().trim().max(50).nullish(),
      }),
    )
    .min(1, "Your cart is empty")
    .max(50),
});

export type CheckoutInput = z.input<typeof checkoutSchema>;

export type CheckoutResult =
  | { ok: true; redirectUrl: string; orderNumber: number }
  | { ok: false; error: string };

export async function createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
  /**
   * Before validation on purpose. Anyone can call this without signing in, and
   * each success writes three tables and opens a gateway session — so the flood
   * worth stopping is the whole call, malformed ones included.
   */
  const limit = await consumeRateLimit({
    name: "checkout",
    windowSeconds: 900,
    max: 15,
  });

  if (!limit.allowed) {
    const minutes = Math.ceil(limit.retryAfterSeconds / 60);

    return {
      ok: false,
      error: `Too many orders from this device. Please try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`,
    };
  }

  const parsed = checkoutSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid details" };
  }

  const data = parsed.data;

  // Group by product *and* chosen variant, so each variant is its own order
  // line and a repeated (product, size, colour) is only counted once.
  type Group = {
    productId: string;
    size: string | null;
    color: string | null;
    qty: number;
  };
  const groups = new Map<string, Group>();
  for (const line of data.lines) {
    const size = line.size?.trim() || null;
    const color = line.color?.trim() || null;
    const key = `${line.productId}|${size ?? ""}|${color ?? ""}`;
    const existing = groups.get(key);
    if (existing) existing.qty += line.qty;
    else groups.set(key, { productId: line.productId, size, color, qty: line.qty });
  }

  const productIds = [...new Set([...groups.values()].map((group) => group.productId))];

  const rows = await db
    .select({
      id: products.id,
      name: products.name,
      priceFils: products.priceFils,
      active: products.active,
      inStock: products.inStock,
      sizeOptions: products.sizeOptions,
      colorOptions: products.colorOptions,
    })
    .from(products)
    .where(inArray(products.id, productIds));

  const available = new Map(rows.map((row) => [row.id, row]));

  const items: {
    productId: string;
    name: string;
    size: string | null;
    color: string | null;
    unitPriceFils: number;
    quantity: number;
    lineTotalFils: number;
  }[] = [];

  for (const group of groups.values()) {
    const product = available.get(group.productId);

    if (!product || !product.active) {
      return { ok: false, error: "An item in your cart is no longer available." };
    }
    if (!product.inStock) {
      return { ok: false, error: `${product.name} is out of stock.` };
    }

    // The chosen variant is re-validated against the product's own options —
    // the browser cannot smuggle in a size or colour that is not offered.
    if (product.sizeOptions.length > 0 && (!group.size || !product.sizeOptions.includes(group.size))) {
      return { ok: false, error: `Please choose a size for ${product.name}.` };
    }
    if (
      product.colorOptions.length > 0 &&
      (!group.color || !product.colorOptions.some((option) => option.name === group.color))
    ) {
      return { ok: false, error: `Please choose a colour for ${product.name}.` };
    }

    // A product without options never carries one, even if the client sent it.
    const size = product.sizeOptions.length > 0 ? group.size : null;
    const color = product.colorOptions.length > 0 ? group.color : null;

    items.push({
      productId: group.productId,
      name: product.name,
      size,
      color,
      unitPriceFils: product.priceFils,
      quantity: group.qty,
      lineTotalFils: product.priceFils * group.qty,
    });
  }

  const subtotalFils = items.reduce((total, item) => total + item.lineTotalFils, 0);
  const vatRateBp = env.VAT_RATE_BP;
  const vatFils = Math.round((subtotalFils * vatRateBp) / 10000);
  const totalFils = subtotalFils + vatFils;

  const session = await getSession();
  const orderId = randomUUID();
  const paymentId = randomUUID();
  const gateway = getPaymentGateway();

  // batch() runs inside one server-side transaction. The Neon HTTP driver has
  // no interactive transactions, so the id is generated up front rather than
  // read back from the first insert.
  await db.batch([
    db.insert(orders).values({
      id: orderId,
      userId: session?.user.id ?? null,
      status: "pending_payment",
      fulfilment: data.fulfilment,
      tableNumber: data.fulfilment === "dine_in" ? data.tableNumber : null,
      contactName: data.name,
      contactEmail: data.email,
      contactPhone: data.phone,
      notes: data.notes ?? null,
      subtotalFils,
      vatRateBp,
      vatFils,
      totalFils,
    }),
    db.insert(orderItems).values(
      items.map((item) => ({
        orderId,
        productId: item.productId,
        name: item.name,
        size: item.size,
        color: item.color,
        unitPriceFils: item.unitPriceFils,
        quantity: item.quantity,
        lineTotalFils: item.lineTotalFils,
      })),
    ),
    db.insert(payments).values({
      id: paymentId,
      orderId,
      provider: gateway.provider,
      status: "pending",
      amountFils: totalFils,
    }),
  ]);

  const [created] = await db
    .select({ orderNumber: orders.orderNumber })
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);

  // Deliberately after the order exists: an orphaned gateway session is
  // harmless and expires, whereas taking money with no order record is not.
  const checkoutSession = await gateway.createCheckoutSession({
    orderId,
    orderNumber: created.orderNumber,
    amountFils: totalFils,
    customerEmail: data.email,
    // Keyed by the order's UUID, not its number. Order numbers come from an
    // identity sequence, so ?order=1001 would let anyone walk the whole table.
    returnUrl: new URL(
      `/order-confirmation?order=${orderId}`,
      env.BETTER_AUTH_URL,
    ).toString(),
  });

  await db
    .update(payments)
    .set({ providerSessionId: checkoutSession.sessionId })
    .where(eq(payments.id, paymentId));

  return {
    ok: true,
    redirectUrl: checkoutSession.redirectUrl,
    orderNumber: created.orderNumber,
  };
}
