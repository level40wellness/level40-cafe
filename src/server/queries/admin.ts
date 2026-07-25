import "server-only";
import { and, asc, count, desc, eq, inArray, or, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  account,
  categories,
  mealPlans,
  orderStatus,
  orders,
  products,
  session,
  subscriptions,
  user,
  userRole,
} from "@/db/schema";
import type { ColorOption } from "@/db/schema";
import { requireAdmin } from "@/server/guards";

/**
 * Admin reads. Separate from queries/catalog.ts because these deliberately
 * return rows the public side filters out — hidden products, unpaid orders —
 * and so each one opens with requireAdmin() rather than an `active` filter.
 *
 * "Today" means today in Dubai. Postgres would otherwise bucket by UTC, which
 * rolls over at 4am local and would show the morning's covers on the previous
 * day's figure.
 */
const DUBAI_TODAY = sql`(now() at time zone 'Asia/Dubai')::date`;

export interface OverviewStats {
  openOrders: number;
  awaitingPayment: number;
  ordersToday: number;
  revenueTodayFils: number;
  activeProducts: number;
  hiddenProducts: number;
  outOfStock: number;
  categories: number;
}

export async function getOverviewStats(): Promise<OverviewStats> {
  await requireAdmin();

  const placedToday = sql`(${orders.placedAt} at time zone 'Asia/Dubai')::date = ${DUBAI_TODAY}`;

  const [orderStats, catalogStats, categoryStats] = await Promise.all([
    db
      .select({
        // The kitchen queue: paid for, not yet handed over.
        openOrders:
          sql<number>`count(*) filter (where ${orders.status} in ('paid','preparing','ready'))`.mapWith(
            Number,
          ),
        awaitingPayment:
          sql<number>`count(*) filter (where ${orders.status} = 'pending_payment')`.mapWith(
            Number,
          ),
        ordersToday: sql<number>`count(*) filter (where ${placedToday})`.mapWith(
          Number,
        ),
        // Cancelled, refunded and failed orders are excluded — takings, not gross.
        revenueTodayFils: sql<number>`coalesce(sum(${orders.totalFils}) filter (
          where ${placedToday}
            and ${orders.status} in ('paid','preparing','ready','completed')
        ), 0)`.mapWith(Number),
      })
      .from(orders),
    db
      .select({
        activeProducts:
          sql<number>`count(*) filter (where ${products.active})`.mapWith(Number),
        hiddenProducts:
          sql<number>`count(*) filter (where not ${products.active})`.mapWith(
            Number,
          ),
        outOfStock:
          sql<number>`count(*) filter (where ${products.active} and not ${products.inStock})`.mapWith(
            Number,
          ),
      })
      .from(products),
    db.select({ categories: count() }).from(categories),
  ]);

  return { ...orderStats[0], ...catalogStats[0], ...categoryStats[0] };
}

/**
 * Every category including hidden ones, with a live product count so the
 * console can warn before a delete that would orphan rows.
 */
export async function getAdminCategories() {
  await requireAdmin();

  return db
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      kind: categories.kind,
      parentId: categories.parentId,
      sortOrder: categories.sortOrder,
      active: categories.active,
      productCount: count(products.id),
    })
    .from(categories)
    .leftJoin(products, eq(products.categoryId, categories.id))
    .groupBy(categories.id)
    .orderBy(asc(categories.kind), asc(categories.sortOrder), asc(categories.name));
}

export type AdminCategory = Awaited<ReturnType<typeof getAdminCategories>>[number];

export interface AdminProduct {
  id: string;
  name: string;
  description: string | null;
  priceFils: number;
  categoryId: string | null;
  categoryName: string | null;
  tags: string[];
  emoji: string | null;
  sizeOptions: string[];
  colorOptions: ColorOption[];
  inStock: boolean;
  active: boolean;
  sortOrder: number;
  images: { id: string; path: string; alt: string | null; sortOrder: number }[];
}

/**
 * Unlike the public catalogue this returns hidden and out-of-stock rows — the
 * console exists to find and fix exactly those.
 */
export async function getAdminProducts(
  kind: "cafe" | "retail",
): Promise<AdminProduct[]> {
  await requireAdmin();

  const rows = await db.query.products.findMany({
    orderBy: [asc(products.sortOrder), asc(products.name)],
    with: {
      images: {
        columns: { id: true, path: true, alt: true, sortOrder: true },
        orderBy: (image, { asc: ascending }) => [ascending(image.sortOrder)],
      },
      category: { columns: { name: true, kind: true } },
    },
  });

  return rows
    .filter(
      (row) => row.category?.kind === kind || row.category?.kind === "both",
    )
    .map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      priceFils: row.priceFils,
      categoryId: row.categoryId,
      categoryName: row.category?.name ?? null,
      tags: row.tags,
      emoji: row.emoji,
      sizeOptions: row.sizeOptions,
      colorOptions: row.colorOptions,
      inStock: row.inStock,
      active: row.active,
      sortOrder: row.sortOrder,
      images: row.images,
    }));
}

/** Every plan including retired ones, with a live subscriber count. */
export async function getAdminMealPlans() {
  await requireAdmin();

  return db
    .select({
      id: mealPlans.id,
      name: mealPlans.name,
      description: mealPlans.description,
      priceFils: mealPlans.priceFils,
      mealsPerWeek: mealPlans.mealsPerWeek,
      durationWeeks: mealPlans.durationWeeks,
      features: mealPlans.features,
      sortOrder: mealPlans.sortOrder,
      active: mealPlans.active,
      subscriberCount: sql<number>`count(${subscriptions.id}) filter (
        where ${subscriptions.status} in ('active','past_due','paused')
      )`.mapWith(Number),
    })
    .from(mealPlans)
    .leftJoin(subscriptions, eq(subscriptions.mealPlanId, mealPlans.id))
    .groupBy(mealPlans.id)
    .orderBy(asc(mealPlans.sortOrder), asc(mealPlans.name));
}

export type AdminMealPlan = Awaited<ReturnType<typeof getAdminMealPlans>>[number];

/** Categories an admin may assign a product of this kind to. */
export async function getAssignableCategories(kind: "cafe" | "retail") {
  await requireAdmin();

  const rows = await db
    .select({
      id: categories.id,
      name: categories.name,
      kind: categories.kind,
      active: categories.active,
    })
    .from(categories)
    .where(inArray(categories.kind, [kind, "both"]))
    .orderBy(asc(categories.sortOrder), asc(categories.name));

  return rows;
}

const ORDER_LIST_COLUMNS = {
  id: orders.id,
  orderNumber: orders.orderNumber,
  contactName: orders.contactName,
  contactEmail: orders.contactEmail,
  status: orders.status,
  fulfilment: orders.fulfilment,
  tableNumber: orders.tableNumber,
  totalFils: orders.totalFils,
  placedAt: orders.placedAt,
} as const;

export async function getRecentOrders(limit = 6) {
  await requireAdmin();

  return db
    .select(ORDER_LIST_COLUMNS)
    .from(orders)
    .orderBy(desc(orders.placedAt))
    .limit(limit);
}

export type AdminOrderRow = Awaited<ReturnType<typeof getRecentOrders>>[number];

export type OrderStatusValue = (typeof orderStatus.enumValues)[number];

/**
 * The queue. Defaults to the statuses that still need someone to act, because
 * that is what the counter screen is for — the full history is a filter away.
 */
export async function getAdminOrders({
  status,
  search,
}: {
  status?: OrderStatusValue | "open" | "all";
  search?: string;
} = {}) {
  await requireAdmin();

  const conditions = [];

  if (status === "open") {
    conditions.push(inArray(orders.status, ["paid", "preparing", "ready"]));
  } else if (status && status !== "all") {
    conditions.push(eq(orders.status, status));
  }

  const term = search?.trim();
  if (term) {
    const digits = term.replace(/\D/g, "");
    const like = `%${term.toLowerCase()}%`;

    conditions.push(
      or(
        sql`lower(${orders.contactEmail}) like ${like}`,
        sql`lower(${orders.contactName}) like ${like}`,
        // The staff read "#1042" off a ticket; match on the number too.
        digits ? eq(orders.orderNumber, Number(digits)) : undefined,
      )!,
    );
  }

  return db
    .select(ORDER_LIST_COLUMNS)
    .from(orders)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(orders.placedAt))
    .limit(200);
}

export async function getOrderStatusCounts() {
  await requireAdmin();

  const rows = await db
    .select({ status: orders.status, total: count() })
    .from(orders)
    .groupBy(orders.status);

  const counts = Object.fromEntries(
    orderStatus.enumValues.map((value) => [value, 0]),
  ) as Record<OrderStatusValue, number>;

  let all = 0;
  for (const row of rows) {
    counts[row.status] = row.total;
    all += row.total;
  }

  return {
    ...counts,
    all,
    open: counts.paid + counts.preparing + counts.ready,
  };
}

/**
 * Everyone who has ever signed in, with their sign-in method and whether they
 * hold the admin role.
 *
 * `providers` is aggregated from the account table rather than assumed: a
 * customer who signed up with a password and later used Google has both, and
 * showing only one would misrepresent how they get in.
 */
export async function getAdminUsers() {
  await requireAdmin();

  const rows = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      providers: sql<string[]>`coalesce(array_agg(distinct ${account.providerId}) filter (where ${account.providerId} is not null), '{}')`,
      lastSeenAt: sql<Date | null>`max(${session.createdAt})`,
      isAdmin: sql<boolean>`bool_or(${userRole.role} = 'admin')`,
    })
    .from(user)
    .leftJoin(account, eq(account.userId, user.id))
    .leftJoin(session, eq(session.userId, user.id))
    .leftJoin(userRole, eq(userRole.userId, user.id))
    .groupBy(user.id)
    .orderBy(desc(user.createdAt))
    .limit(500);

  return rows.map((row) => ({ ...row, isAdmin: row.isAdmin ?? false }));
}

export type AdminUserRow = Awaited<ReturnType<typeof getAdminUsers>>[number];

/** Full detail for one order, including its payment attempts. */
export async function getAdminOrderById(id: string) {
  await requireAdmin();

  const order = await db.query.orders.findFirst({
    where: eq(orders.id, id),
    with: {
      items: true,
      payments: { orderBy: (payment, { desc: descending }) => [descending(payment.createdAt)] },
    },
  });

  return order ?? null;
}
