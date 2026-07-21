"use client";

import {
  type OrderStatusValue,
  allowedNextStatuses,
  orderStatusLabel,
} from "@/lib/order-status";
import { setOrderStatusAction } from "@/server/actions/admin/orders";
import { AdminSelect } from "./admin-select";
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
    <AdminSelect
      label="Change order status"
      // No value: the current status is already the badge in the column
      // alongside. The native control had to carry it as the selected option,
      // which is why every row read "Paid → Paid"; this one only offers moves.
      placeholder="Move to…"
      disabled={action.pending}
      options={options.map((option) => ({
        value: option,
        label: orderStatusLabel(option),
      }))}
      onSelect={(next) => {
        const formData = new FormData();
        formData.set("id", orderId);
        formData.set("status", next);
        void action.submit(formData);
      }}
    />
  );
}
