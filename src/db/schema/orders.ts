import { relations } from "drizzle-orm";
import {
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { user } from "./auth";
import { mealPlans, products } from "./catalog";

/**
 * None of this exists in the source app. Orders, subscriptions and invoices
 * live in the customer's own localStorage there, which means the admin panel
 * physically cannot see a customer's order.
 *
 *   pending_payment ─┬─► paid ─► preparing ─► ready ─► completed
 *                    ├─► payment_failed
 *                    └─► cancelled          paid ─► refunded
 */
export const orderStatus = pgEnum("order_status", [
  "pending_payment",
  "paid",
  "preparing",
  "ready",
  "completed",
  "payment_failed",
  "cancelled",
  "refunded",
]);

export const fulfilmentType = pgEnum("fulfilment_type", ["dine_in", "pickup"]);

export const paymentStatus = pgEnum("payment_status", [
  "pending",
  "succeeded",
  "failed",
  "refunded",
]);

export const subscriptionStatus = pgEnum("subscription_status", [
  "pending_payment",
  "active",
  "past_due",
  "paused",
  "cancelled",
  "expired",
]);

export const orders = pgTable(
  "orders",
  {
    id: uuid().primaryKey().defaultRandom(),
    // Identity column, not Math.random(). The source app generated NK-###### in
    // the browser, so two customers could collide.
    orderNumber: integer()
      .generatedByDefaultAsIdentity({ startWith: 1000 })
      .notNull()
      .unique(),
    // Null for guest checkout; the contact fields below still identify them.
    userId: text().references(() => user.id, { onDelete: "set null" }),
    status: orderStatus().default("pending_payment").notNull(),
    fulfilment: fulfilmentType().notNull(),
    tableNumber: text(),
    contactName: text().notNull(),
    contactEmail: text().notNull(),
    contactPhone: text(),
    notes: text(),
    // Every figure is recomputed server-side from database prices at checkout.
    // The source app calculated these in the browser and trusted the result.
    subtotalFils: integer().notNull(),
    // Basis points, stored per order (500 = 5%). If the UAE VAT rate ever
    // changes, historic orders and their invoices stay correct.
    vatRateBp: integer().notNull(),
    vatFils: integer().notNull(),
    totalFils: integer().notNull(),
    placedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("orders_user_id_idx").on(table.userId),
    index("orders_status_idx").on(table.status),
  ],
);

/**
 * Name and price are snapshotted at purchase time. A later price change or a
 * deleted product must never retroactively alter what someone was charged.
 */
export const orderItems = pgTable(
  "order_items",
  {
    id: uuid().primaryKey().defaultRandom(),
    orderId: uuid()
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: uuid().references(() => products.id, { onDelete: "set null" }),
    name: text().notNull(),
    // Snapshot of the buyer's chosen variant; null for products without options.
    size: text(),
    color: text(),
    unitPriceFils: integer().notNull(),
    quantity: integer().notNull(),
    lineTotalFils: integer().notNull(),
  },
  (table) => [index("order_items_order_id_idx").on(table.orderId)],
);

export const payments = pgTable(
  "payments",
  {
    id: uuid().primaryKey().defaultRandom(),
    orderId: uuid().references(() => orders.id, { onDelete: "set null" }),
    provider: text().notNull(),
    providerSessionId: text(),
    // Idempotency lives here. Gateways retry webhooks; a unique constraint on
    // the event id makes double-processing impossible rather than unlikely.
    providerEventId: text().unique(),
    status: paymentStatus().default("pending").notNull(),
    amountFils: integer().notNull(),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("payments_order_id_idx").on(table.orderId)],
);

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    mealPlanId: uuid().references(() => mealPlans.id, { onDelete: "set null" }),
    status: subscriptionStatus().default("pending_payment").notNull(),
    // Snapshotted like order items, for the same reason.
    planName: text().notNull(),
    pricePerPeriodFils: integer().notNull(),
    durationWeeks: integer().notNull(),
    currentPeriodStart: timestamp({ withTimezone: true }),
    currentPeriodEnd: timestamp({ withTimezone: true }),
    providerSubscriptionId: text(),
    cancelledAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("subscriptions_user_id_idx").on(table.userId)],
);

/**
 * UAE tax invoices are legally specified: a TRN, a gap-free sequential number
 * and a stated VAT breakdown. An identity column provides the sequence.
 */
export const invoices = pgTable("invoices", {
  id: uuid().primaryKey().defaultRandom(),
  invoiceNumber: integer()
    .generatedByDefaultAsIdentity({ startWith: 1 })
    .notNull()
    .unique(),
  orderId: uuid().references(() => orders.id, { onDelete: "set null" }),
  subscriptionId: uuid().references(() => subscriptions.id, { onDelete: "set null" }),
  trn: text().notNull(),
  subtotalFils: integer().notNull(),
  vatRateBp: integer().notNull(),
  vatFils: integer().notNull(),
  totalFils: integer().notNull(),
  issuedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
});

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(user, { fields: [orders.userId], references: [user.id] }),
  items: many(orderItems),
  payments: many(payments),
  invoices: many(invoices),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  order: one(orders, { fields: [payments.orderId], references: [orders.id] }),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  user: one(user, { fields: [subscriptions.userId], references: [user.id] }),
  mealPlan: one(mealPlans, {
    fields: [subscriptions.mealPlanId],
    references: [mealPlans.id],
  }),
}));

export const invoicesRelations = relations(invoices, ({ one }) => ({
  order: one(orders, { fields: [invoices.orderId], references: [orders.id] }),
  subscription: one(subscriptions, {
    fields: [invoices.subscriptionId],
    references: [subscriptions.id],
  }),
}));