"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { orderStatus, orders } from "@/db/schema";
import { isAllowedTransition, orderStatusLabel } from "@/lib/order-status";
import { requireAdmin } from "@/server/guards";
import { type ActionResult, fromUnknownError } from "./result";

export async function setOrderStatusAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  try {
    await requireAdmin();

    const parsed = z
      .object({ id: z.uuid(), status: z.enum(orderStatus.enumValues) })
      .safeParse({
        id: formData.get("id"),
        status: formData.get("status"),
      });

    if (!parsed.success) return { ok: false, error: "Unknown order or status." };

    const [order] = await db
      .select({ status: orders.status, orderNumber: orders.orderNumber })
      .from(orders)
      .where(eq(orders.id, parsed.data.id))
      .limit(1);

    if (!order) return { ok: false, error: "That order no longer exists." };

    if (order.status === parsed.data.status) {
      return { ok: true, message: "" };
    }

    if (!isAllowedTransition(order.status, parsed.data.status)) {
      return {
        ok: false,
        error: `An order that is "${orderStatusLabel(order.status)}" cannot be moved to "${orderStatusLabel(parsed.data.status)}".`,
      };
    }

    /**
     * Re-checking the current status inside the UPDATE closes the window
     * between the read above and the write. Two staff members on two tablets
     * can otherwise both read "paid" and both advance it, and the second
     * write would silently win.
     */
    const updated = await db
      .update(orders)
      .set({ status: parsed.data.status, updatedAt: new Date() })
      .where(and(eq(orders.id, parsed.data.id), eq(orders.status, order.status)))
      .returning({ id: orders.id });

    if (updated.length === 0) {
      return {
        ok: false,
        error: "Someone else changed this order first. Reload to see its current state.",
      };
    }

    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${parsed.data.id}`);
    revalidatePath("/admin");
    revalidatePath("/account/orders");

    return {
      ok: true,
      message: `Order #${order.orderNumber} is now "${orderStatusLabel(parsed.data.status)}".`,
    };
  } catch (error) {
    return fromUnknownError(error, "Could not update the order.");
  }
}
