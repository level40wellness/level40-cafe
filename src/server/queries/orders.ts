import "server-only";
import { desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { orderItems, orders } from "@/db/schema";
import { getSession } from "@/server/guards";

export interface OrderView {
  id: string;
  orderNumber: number;
  status: string;
  fulfilment: "dine_in" | "pickup";
  tableNumber: string | null;
  subtotalFils: number;
  vatRateBp: number;
  vatFils: number;
  totalFils: number;
  placedAt: Date;
  items: {
    id: string;
    name: string;
    quantity: number;
    unitPriceFils: number;
    lineTotalFils: number;
  }[];
}

/**
 * Looked up by UUID rather than order number: the number comes from an identity
 * sequence, so keying on it would make every other customer's order guessable.
 *
 * Guest orders have no user to check against, so possession of the id is the
 * credential — which is why it must stay a UUID and never appear in a sitemap,
 * log or referrer.
 */
export async function getOrderById(id: string): Promise<OrderView | null> {
  const row = await db.query.orders.findFirst({
    where: eq(orders.id, id),
    with: { items: true },
  });

  if (!row) return null;

  // A signed-in customer's order is only visible to them.
  if (row.userId) {
    const session = await getSession();
    if (session?.user.id !== row.userId) return null;
  }

  return toView(row);
}

/** The signed-in customer's own orders. Never accepts a caller-supplied id. */
export async function getMyOrders(): Promise<OrderView[]> {
  const session = await getSession();

  if (!session?.user) return [];

  const rows = await db.query.orders.findMany({
    where: eq(orders.userId, session.user.id),
    orderBy: [desc(orders.placedAt)],
    with: { items: true },
  });

  return rows.map(toView);
}

type OrderRow = typeof orders.$inferSelect & {
  items: (typeof orderItems.$inferSelect)[];
};

function toView(row: OrderRow): OrderView {
  return {
    id: row.id,
    orderNumber: row.orderNumber,
    status: row.status,
    fulfilment: row.fulfilment,
    tableNumber: row.tableNumber,
    subtotalFils: row.subtotalFils,
    vatRateBp: row.vatRateBp,
    vatFils: row.vatFils,
    totalFils: row.totalFils,
    placedAt: row.placedAt,
    items: row.items.map((item) => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      unitPriceFils: item.unitPriceFils,
      lineTotalFils: item.lineTotalFils,
    })),
  };
}
