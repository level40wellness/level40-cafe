import Link from "next/link";

import { OrderFilters } from "@/components/admin/order-filters";
import { OrderStatusSelect } from "@/components/admin/order-status-select";
import { EmptyRow, OrderStatusBadge, StatCards } from "@/components/admin/ui";
import { formatDubaiDateTime, formatFils } from "@/lib/format";
import { ORDER_STATUSES, type OrderStatusValue } from "@/lib/order-status";
import { getAdminOrders, getOrderStatusCounts } from "@/server/queries/admin";

type StatusFilter = OrderStatusValue | "open" | "all";

function parseStatus(value: string | undefined): StatusFilter {
  if (value === "all" || value === "open") return value;
  if (value && (ORDER_STATUSES as readonly string[]).includes(value)) {
    return value as OrderStatusValue;
  }
  // The counter wants the tickets that still need work, not all history.
  return "open";
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const { status: rawStatus, q } = await searchParams;
  const status = parseStatus(rawStatus);
  const search = q?.trim() ?? "";

  const [orders, counts] = await Promise.all([
    getAdminOrders({ status, search }),
    getOrderStatusCounts(),
  ]);

  return (
    <div>
      <StatCards
        items={[
          {
            label: "Needs action",
            value: String(counts.open),
            meta: "Paid, not yet handed over",
            accent: true,
          },
          {
            label: "Awaiting payment",
            value: String(counts.pending_payment),
            meta: "Checkout never completed",
          },
          {
            label: "Completed",
            value: String(counts.completed),
            meta: "All time",
          },
          {
            label: "Refunded",
            value: String(counts.refunded),
            meta: "All time",
          },
        ]}
      />

      <OrderFilters status={status} search={search} counts={counts} />

      <div className="a-table-wrap">
        <table className="a-table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Customer</th>
              <th>Placed</th>
              <th className="right">Total</th>
              <th>Status</th>
              <th>Move to</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <EmptyRow colSpan={6}>
                {search
                  ? `Nothing matches "${search}".`
                  : "No orders in this view."}
              </EmptyRow>
            ) : (
              orders.map((order) => (
                <tr key={order.id}>
                  <td>
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="primary-cell"
                    >
                      #{order.orderNumber}
                    </Link>
                    <span className="muted">
                      {order.fulfilment === "dine_in"
                        ? `Dine-in${order.tableNumber ? ` · Table ${order.tableNumber}` : ""}`
                        : "Pickup"}
                    </span>
                  </td>
                  <td>
                    <div className="primary-cell">{order.contactName}</div>
                    <span className="muted">{order.contactEmail}</span>
                  </td>
                  <td>
                    <span className="muted" style={{ marginTop: 0 }}>
                      {formatDubaiDateTime(order.placedAt)}
                    </span>
                  </td>
                  <td className="right num">{formatFils(order.totalFils)}</td>
                  <td>
                    <OrderStatusBadge status={order.status} />
                  </td>
                  <td>
                    <OrderStatusSelect orderId={order.id} status={order.status} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
