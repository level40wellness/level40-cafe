CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text,
	"username" text,
	"email" text NOT NULL,
	"country" text,
	"city" text,
	"state" text,
	"postcode" text,
	"date_registered" timestamp,
	"last_active" timestamp,
	"last_order" timestamp,
	"orders_count" integer DEFAULT 0 NOT NULL,
	"total_spend" numeric(10, 2) DEFAULT '0' NOT NULL,
	"average_order_value" numeric(10, 2) DEFAULT '0' NOT NULL
);
