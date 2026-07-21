"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { mealPlans } from "@/db/schema";
import { requireAdmin } from "@/server/guards";
import {
  type ActionResult,
  fromUnknownError,
  fromZodError,
} from "./result";

/** Same integer-safe parse as products; see the note in products.ts. */
function parseAedToFils(input: string): number | null {
  const trimmed = input.trim().replace(/^AED\s*/i, "");
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(trimmed)) return null;

  const [dirhams, fils = ""] = trimmed.split(".");
  return Number(dirhams) * 100 + Number(fils.padEnd(2, "0"));
}

const planSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  description: z.string().trim().max(2000).optional(),
  price: z.string().trim(),
  mealsPerWeek: z.coerce.number().int().min(1).max(21),
  durationWeeks: z.coerce.number().int().min(1).max(52),
  // One feature per line is how the subscription page renders them.
  features: z.string().trim().max(2000).optional(),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
  active: z.boolean(),
});

function parse(formData: FormData) {
  return planSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    price: formData.get("price") ?? "",
    mealsPerWeek: formData.get("mealsPerWeek") || 5,
    durationWeeks: formData.get("durationWeeks") || 1,
    features: formData.get("features") || undefined,
    sortOrder: formData.get("sortOrder") || 0,
    active: formData.get("active") === "on",
  });
}

function splitFeatures(value: string | undefined) {
  if (!value) return [];
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 20);
}

function revalidatePlans() {
  revalidatePath("/subscription");
  revalidatePath("/admin/meal-plans");
}

export async function createMealPlanAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();

    const parsed = parse(formData);
    if (!parsed.success) return fromZodError(parsed.error);

    const priceFils = parseAedToFils(parsed.data.price);
    if (priceFils === null) {
      return {
        ok: false,
        error: "Please correct the highlighted fields.",
        fieldErrors: { price: "Enter an amount like 740 or 740.00." },
      };
    }

    await db.insert(mealPlans).values({
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      priceFils,
      mealsPerWeek: parsed.data.mealsPerWeek,
      durationWeeks: parsed.data.durationWeeks,
      features: splitFeatures(parsed.data.features),
      sortOrder: parsed.data.sortOrder,
      active: parsed.data.active,
      createdBy: admin.id,
    });

    revalidatePlans();
    return { ok: true, message: `"${parsed.data.name}" created.` };
  } catch (error) {
    return fromUnknownError(error, "Could not create the meal plan.");
  }
}

export async function updateMealPlanAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  try {
    await requireAdmin();

    const id = z.uuid().safeParse(formData.get("id"));
    if (!id.success) return { ok: false, error: "Unknown meal plan." };

    const parsed = parse(formData);
    if (!parsed.success) return fromZodError(parsed.error);

    const priceFils = parseAedToFils(parsed.data.price);
    if (priceFils === null) {
      return {
        ok: false,
        error: "Please correct the highlighted fields.",
        fieldErrors: { price: "Enter an amount like 740 or 740.00." },
      };
    }

    const updated = await db
      .update(mealPlans)
      .set({
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        priceFils,
        mealsPerWeek: parsed.data.mealsPerWeek,
        durationWeeks: parsed.data.durationWeeks,
        features: splitFeatures(parsed.data.features),
        sortOrder: parsed.data.sortOrder,
        active: parsed.data.active,
        updatedAt: new Date(),
      })
      .where(eq(mealPlans.id, id.data))
      .returning({ id: mealPlans.id });

    if (updated.length === 0) {
      return { ok: false, error: "That meal plan no longer exists." };
    }

    revalidatePlans();
    return { ok: true, message: `"${parsed.data.name}" saved.` };
  } catch (error) {
    return fromUnknownError(error, "Could not save the meal plan.");
  }
}

/**
 * Retires a plan rather than deleting it. subscriptions.mealPlanId is
 * ON DELETE SET NULL, so a hard delete would sever live subscriptions from the
 * plan they were sold under — and Phase 5 has to bill against exactly that.
 */
export async function retireMealPlanAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  try {
    await requireAdmin();

    const id = z.uuid().safeParse(formData.get("id"));
    if (!id.success) return { ok: false, error: "Unknown meal plan." };

    const updated = await db
      .update(mealPlans)
      .set({ active: false, updatedAt: new Date() })
      .where(eq(mealPlans.id, id.data))
      .returning({ name: mealPlans.name });

    if (updated.length === 0) {
      return { ok: false, error: "That meal plan no longer exists." };
    }

    revalidatePlans();
    return {
      ok: true,
      message: `"${updated[0].name}" withdrawn from sale. Existing subscribers are unaffected.`,
    };
  } catch (error) {
    return fromUnknownError(error, "Could not retire the meal plan.");
  }
}
