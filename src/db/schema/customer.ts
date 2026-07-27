import {
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const customers = pgTable("customers", {
  id: uuid("id").primaryKey().defaultRandom(),

  name: text("name"),
  username: text("username"),
  email: text("email").notNull(),

  country: text("country"),
  city: text("city"),
  state: text("state"),
  postcode: text("postcode"),

  dateRegistered: timestamp("date_registered", {
    mode: "date",
  }),

  lastActive: timestamp("last_active", {
    mode: "date",
  }),

  lastOrder: timestamp("last_order", {
    mode: "date",
  }),

  ordersCount: integer("orders_count").notNull().default(0),

  totalSpend: numeric("total_spend", {
    precision: 10,
    scale: 2,
  })
    .notNull()
    .default("0"),

  averageOrderValue: numeric("average_order_value", {
    precision: 10,
    scale: 2,
  })
    .notNull()
    .default("0"),
});
