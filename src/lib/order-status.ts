export const ORDER_STATUSES = [
  "pending_payment",
  "paid",
  "preparing",
  "ready",
  "completed",
  "payment_failed",
  "cancelled",
  "refunded",
] as const;

export type OrderStatusValue = (typeof ORDER_STATUSES)[number];

/**
 * What a human behind the counter is allowed to change an order to.
 *
 * Two rules are encoded here that the source app had no way to express, since
 * its status was a free string in the admin's own localStorage:
 *
 * 1. Nothing transitions *to* `paid`. Only the payment webhook may do that,
 *    against a verified signature and a matching amount. If staff could set it
 *    by hand, "paid" would stop meaning "the money arrived" and the takings
 *    figure on the overview would be unreconcilable.
 * 2. `completed`, `cancelled` and `refunded` are terminal apart from a refund.
 *    Reopening a finished order would let the same ticket be worked twice.
 *
 * This lives outside the "use server" module so the client can render the
 * right options — a module with that directive may only export async
 * functions, and the server action re-checks the table regardless. The list
 * shown to staff is a convenience; the enforcement is on the server.
 */
const ALLOWED_TRANSITIONS: Record<OrderStatusValue, readonly OrderStatusValue[]> = {
  pending_payment: ["cancelled"],
  payment_failed: ["cancelled"],
  paid: ["preparing", "cancelled", "refunded"],
  preparing: ["ready", "cancelled", "refunded"],
  ready: ["completed", "refunded"],
  completed: ["refunded"],
  cancelled: [],
  refunded: [],
};

export function allowedNextStatuses(current: OrderStatusValue) {
  return ALLOWED_TRANSITIONS[current];
}

export function isAllowedTransition(
  from: OrderStatusValue,
  to: OrderStatusValue,
) {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

const STATUS_LABELS: Record<OrderStatusValue, string> = {
  pending_payment: "Awaiting payment",
  paid: "Paid",
  preparing: "Preparing",
  ready: "Ready",
  completed: "Completed",
  payment_failed: "Payment failed",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

export function orderStatusLabel(status: OrderStatusValue) {
  return STATUS_LABELS[status];
}
