import {
  type OrderStatusValue,
  orderStatusLabel,
} from "@/lib/order-status";

export function StatCards({
  items,
}: {
  items: { label: string; value: string; meta?: string; accent?: boolean }[];
}) {
  return (
    <div className="a-stats">
      {items.map((item) => (
        <div
          key={item.label}
          className={`a-card${item.accent ? " accent" : ""}`}
        >
          <div className="lbl">{item.label}</div>
          <div className="val">{item.value}</div>
          {item.meta && <div className="meta">{item.meta}</div>}
        </div>
      ))}
    </div>
  );
}

export function PanelHead({
  title,
  subtitle,
  children,
}: {
  title?: string;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="a-panel-head">
      <div className="titles">
        {title && <h2>{title}</h2>}
        {subtitle && <p>{subtitle}</p>}
      </div>
      {children && <div className="tools">{children}</div>}
    </div>
  );
}

/**
 * Maps the eight order states onto the badge colours level40.css defines.
 * Grouping is by what the counter staff need to distinguish — money owed, in
 * progress, done, dead — rather than one colour per enum value.
 */
const STATUS_CLASS: Record<OrderStatusValue, string> = {
  pending_payment: "pending",
  paid: "paid",
  preparing: "pending",
  ready: "ready",
  completed: "completed",
  payment_failed: "overdue",
  cancelled: "cancelled",
  refunded: "draft",
};

export function OrderStatusBadge({ status }: { status: OrderStatusValue }) {
  return (
    <span className={`a-badge ${STATUS_CLASS[status]}`} style={{ marginLeft: 0 }}>
      {orderStatusLabel(status)}
    </span>
  );
}

export function EmptyRow({
  colSpan,
  children,
}: {
  colSpan: number;
  children: React.ReactNode;
}) {
  return (
    <tr>
      <td colSpan={colSpan} className="a-empty">
        {children}
      </td>
    </tr>
  );
}
