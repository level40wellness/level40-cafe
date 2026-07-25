import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { OrderStatusSelect } from "@/components/admin/order-status-select";
import { OrderStatusBadge, PanelHead } from "@/components/admin/ui";
import { formatDubaiDateTime, formatFils } from "@/lib/format";
import { getAdminOrderById } from "@/server/queries/admin";

export default async function AdminOrderDetailPage({
  params,
}: {
  // params is a Promise in Next 16.
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  const order = await getAdminOrderById(orderId);

  if (!order) notFound();

  const vatRatePercent = (order.vatRateBp / 100).toFixed(order.vatRateBp % 100 === 0 ? 0 : 2);

  return (
    <div>
      <Link
        href="/admin/orders"
        className="a-btn ghost"
        style={{ marginBottom: "1.4rem" }}
      >
        <ChevronLeft size={15} aria-hidden="true" /> Back to queue
      </Link>

      <PanelHead
        title={`Order #${order.orderNumber}`}
        subtitle={`Placed ${formatDubaiDateTime(order.placedAt)} · ${
          order.fulfilment === "dine_in"
            ? `Dine-in${order.tableNumber ? `, table ${order.tableNumber}` : ""}`
            : "Pickup"
        }`}
      >
        <OrderStatusBadge status={order.status} />
        <OrderStatusSelect orderId={order.id} status={order.status} />
      </PanelHead>

      <div className="a-panels">
        <div className="a-panel">
          <h3>Items</h3>
          <table className="a-table" style={{ background: "transparent" }}>
            <thead>
              <tr>
                <th>Item</th>
                <th className="right">Qty</th>
                <th className="right">Unit</th>
                <th className="right">Line</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div className="primary-cell">{item.name}</div>
                    {(item.size || item.color) && (
                      <span className="muted">
                        {[item.size, item.color].filter(Boolean).join(" · ")}
                      </span>
                    )}
                    {item.productId === null && (
                      <span className="muted">
                        Product since deleted — this line keeps its own record
                      </span>
                    )}
                  </td>
                  <td className="right num">{item.quantity}</td>
                  <td className="right num">{formatFils(item.unitPriceFils)}</td>
                  <td className="right num">{formatFils(item.lineTotalFils)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3} className="right">
                  Subtotal
                </td>
                <td className="right num">{formatFils(order.subtotalFils)}</td>
              </tr>
              <tr>
                <td colSpan={3} className="right">
                  VAT ({vatRatePercent}%)
                </td>
                <td className="right num">{formatFils(order.vatFils)}</td>
              </tr>
              <tr>
                <td colSpan={3} className="right">
                  <b>Total</b>
                </td>
                <td className="right num">
                  <b>{formatFils(order.totalFils)}</b>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="a-panel">
          <h3>Customer</h3>
          <div className="a-inv-row">
            <div className="who">
              <b>{order.contactName}</b>
              <span>{order.contactEmail}</span>
            </div>
          </div>
          {order.contactPhone && (
            <div className="a-inv-row">
              <div className="who">
                <b>Phone</b>
                <span>{order.contactPhone}</span>
              </div>
            </div>
          )}
          <div className="a-inv-row">
            <div className="who">
              <b>Account</b>
              <span>
                {order.userId ? "Signed-in customer" : "Guest checkout"}
              </span>
            </div>
          </div>
          {order.notes && (
            <div className="a-inv-row">
              <div className="who">
                <b>Notes</b>
                <span>{order.notes}</span>
              </div>
            </div>
          )}

          <h3 style={{ marginTop: "1.6rem" }}>Payments</h3>
          {order.payments.length === 0 ? (
            <p className="muted">No payment attempt recorded.</p>
          ) : (
            order.payments.map((payment) => (
              <div className="a-inv-row" key={payment.id}>
                <div className="who">
                  <b>{formatFils(payment.amountFils)}</b>
                  <span>
                    {payment.provider} · {formatDubaiDateTime(payment.createdAt)}
                  </span>
                </div>
                <span className={`a-badge ${payment.status === "succeeded" ? "paid" : payment.status === "failed" ? "overdue" : "pending"}`}>
                  {payment.status}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
