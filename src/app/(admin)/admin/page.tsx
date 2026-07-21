import Link from "next/link";

import {
  EmptyRow,
  OrderStatusBadge,
  PanelHead,
  StatCards,
} from "@/components/admin/ui";
import { formatDubaiDateTime, formatFils } from "@/lib/format";
import { getOverviewStats, getRecentOrders } from "@/server/queries/admin";

export default async function AdminOverviewPage() {
  const [stats, recent] = await Promise.all([
    getOverviewStats(),
    getRecentOrders(),
  ]);

  return (
    <div>
      <StatCards
        items={[
          {
            label: "Open orders",
            value: String(stats.openOrders),
            meta: "Paid, not yet handed over",
            accent: true,
          },
          {
            label: "Orders today",
            value: String(stats.ordersToday),
            meta: "Since midnight, Dubai time",
          },
          {
            label: "Takings today",
            value: formatFils(stats.revenueTodayFils),
            meta: "Excludes cancelled and failed",
          },
          {
            label: "Awaiting payment",
            value: String(stats.awaitingPayment),
            meta: "Checkouts never completed",
          },
        ]}
      />

      <StatCards
        items={[
          {
            label: "Live catalogue",
            value: String(stats.activeProducts),
            meta: "Visible to customers",
          },
          {
            label: "Hidden",
            value: String(stats.hiddenProducts),
            meta: "Saved but not published",
          },
          {
            label: "Out of stock",
            value: String(stats.outOfStock),
            meta: "Live but unavailable",
          },
          {
            label: "Categories",
            value: String(stats.categories),
            meta: "Across menu and shop",
          },
        ]}
      />

      <PanelHead title="Latest orders" subtitle="Newest first, across all channels">
        <Link href="/admin/orders" className="a-btn ghost">
          Open queue
        </Link>
      </PanelHead>

      <div className="a-table-wrap">
        <table className="a-table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Customer</th>
              <th>Placed</th>
              <th className="right">Total</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {recent.length === 0 ? (
              <EmptyRow colSpan={5}>No orders yet.</EmptyRow>
            ) : (
              recent.map((order) => (
                <tr key={order.id}>
                  <td>
                    <Link href={`/admin/orders/${order.id}`} className="primary-cell">
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
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
