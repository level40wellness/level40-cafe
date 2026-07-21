"use client";

import {
  type OrderStatusValue,
  allowedNextStatuses,
  orderStatusLabel,
} from "@/lib/order-status";
import { setOrderStatusAction } from "@/server/actions/admin/orders";
import { useAdminAction } from "./admin-form";

/**
 * Only the transitions the server would accept are offered. Statuses with
 * nowhere left to go render as plain text rather than an empty dropdown that
 * looks broken.
 */
export function OrderStatusSelect({
  orderId,
  status,
}: {
  orderId: string;
  status: OrderStatusValue;
}) {
  const action = useAdminAction(setOrderStatusAction);
  const options = allowedNextStatuses(status);

  if (options.length === 0) {
    return <span className="muted" style={{ marginTop: 0 }}>No further changes</span>;
  }

  return (
    <select
      className="a-select"
      value={status}
      disabled={action.pending}
      aria-label="Change order status"
      onChange={(event) => {
        const formData = new FormData();
        formData.set("id", orderId);
        formData.set("status", event.target.value);
        void action.submit(formData);
      }}
    >
      <option value={status}>{orderStatusLabel(status)}</option>
      {options.map((option) => (
        <option key={option} value={option}>
          → {orderStatusLabel(option)}
        </option>
      ))}
    </select>
  );
}
