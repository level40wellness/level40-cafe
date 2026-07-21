"use client";

import { useState } from "react";
import { Archive, Pencil, Plus } from "lucide-react";

import { formatFils } from "@/lib/format";
import {
  createMealPlanAction,
  retireMealPlanAction,
  updateMealPlanAction,
} from "@/server/actions/admin/meal-plans";
import type { AdminMealPlan } from "@/server/queries/admin";
import { Field, FormError, useAdminAction } from "./admin-form";
import { Modal } from "./modal";
import { EmptyRow, PanelHead, StatCards } from "./ui";

type Editing = AdminMealPlan | null | undefined;

export function MealPlanManager({ items }: { items: AdminMealPlan[] }) {
  const [editing, setEditing] = useState<Editing>(undefined);
  const retire = useAdminAction(retireMealPlanAction);

  function handleRetire(plan: AdminMealPlan) {
    const warning =
      plan.subscriberCount > 0
        ? `"${plan.name}" has ${plan.subscriberCount} active subscriber${plan.subscriberCount === 1 ? "" : "s"}. Withdrawing it stops new sign-ups; existing subscriptions continue and keep billing as sold. Continue?`
        : `Withdraw "${plan.name}" from sale?`;

    if (!window.confirm(warning)) return;

    const formData = new FormData();
    formData.set("id", plan.id);
    void retire.submit(formData);
  }

  return (
    <div>
      <StatCards
        items={[
          {
            label: "Plans on sale",
            value: String(items.filter((plan) => plan.active).length),
            meta: "Shown on /subscription",
            accent: true,
          },
          {
            label: "Withdrawn",
            value: String(items.filter((plan) => !plan.active).length),
            meta: "Kept for existing subscribers",
          },
          {
            label: "Subscribers",
            value: String(
              items.reduce((total, plan) => total + plan.subscriberCount, 0),
            ),
            meta: "Active, paused or past due",
          },
          {
            label: "Cheapest plan",
            value:
              items.filter((plan) => plan.active).length > 0
                ? formatFils(
                    Math.min(
                      ...items
                        .filter((plan) => plan.active)
                        .map((plan) => plan.priceFils),
                    ),
                  )
                : "—",
            meta: "Entry price point",
          },
        ]}
      />

      <PanelHead
        title="Meal plans"
        subtitle="Subscription tiers offered on the meal plans page."
      >
        <button
          type="button"
          className="a-btn primary"
          onClick={() => setEditing(null)}
        >
          <Plus size={15} aria-hidden="true" /> Add plan
        </button>
      </PanelHead>

      <div className="a-table-wrap">
        <table className="a-table">
          <thead>
            <tr>
              <th>Plan</th>
              <th className="right">Price</th>
              <th className="right">Meals / week</th>
              <th className="right">Weeks</th>
              <th className="right">Subscribers</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <EmptyRow colSpan={7}>No meal plans yet.</EmptyRow>
            ) : (
              items.map((plan) => (
                <tr key={plan.id}>
                  <td>
                    <div className="primary-cell">{plan.name}</div>
                    {plan.description && (
                      <span className="muted">
                        {plan.description.slice(0, 80)}
                        {plan.description.length > 80 ? "…" : ""}
                      </span>
                    )}
                  </td>
                  <td className="right num">{formatFils(plan.priceFils)}</td>
                  <td className="right num">{plan.mealsPerWeek}</td>
                  <td className="right num">{plan.durationWeeks}</td>
                  <td className="right num">{plan.subscriberCount}</td>
                  <td>
                    <span
                      className={`a-badge ${plan.active ? "active" : "cancelled"}`}
                      style={{ marginLeft: 0 }}
                    >
                      {plan.active ? "On sale" : "Withdrawn"}
                    </span>
                  </td>
                  <td className="right">
                    <button
                      type="button"
                      className="a-icon-btn"
                      aria-label={`Edit ${plan.name}`}
                      onClick={() => setEditing(plan)}
                    >
                      <Pencil size={16} aria-hidden="true" />
                    </button>
                    {plan.active && (
                      <button
                        type="button"
                        className="a-icon-btn"
                        aria-label={`Withdraw ${plan.name}`}
                        disabled={retire.pending}
                        onClick={() => handleRetire(plan)}
                      >
                        <Archive size={16} aria-hidden="true" />
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editing !== undefined && (
        <MealPlanDialog plan={editing} onClose={() => setEditing(undefined)} />
      )}
    </div>
  );
}

function MealPlanDialog({
  plan,
  onClose,
}: {
  plan: AdminMealPlan | null;
  onClose: () => void;
}) {
  const isEdit = plan !== null;
  const form = useAdminAction(
    isEdit ? updateMealPlanAction : createMealPlanAction,
    { onSuccess: onClose },
  );

  return (
    <Modal
      wide
      title={isEdit ? "Edit meal plan" : "New meal plan"}
      subtitle="Subscription tier"
      onClose={onClose}
    >
      <form action={form.submit} className="a-stack">
        {isEdit && <input type="hidden" name="id" value={plan.id} />}
        <FormError message={form.formError} />

        <Field label="Name" htmlFor="plan-name" error={form.fieldErrors?.name}>
          <input
            id="plan-name"
            name="name"
            className="a-input"
            defaultValue={plan?.name ?? ""}
            aria-invalid={Boolean(form.fieldErrors?.name)}
            required
            maxLength={120}
          />
        </Field>

        <Field
          label="Description"
          htmlFor="plan-description"
          error={form.fieldErrors?.description}
        >
          <textarea
            id="plan-description"
            name="description"
            className="a-textarea"
            defaultValue={plan?.description ?? ""}
            maxLength={2000}
          />
        </Field>

        <div className="a-grid-3">
          <Field
            label="Price (AED)"
            htmlFor="plan-price"
            error={form.fieldErrors?.price}
          >
            <input
              id="plan-price"
              name="price"
              className="a-input"
              inputMode="decimal"
              placeholder="740.00"
              defaultValue={plan ? (plan.priceFils / 100).toFixed(2) : ""}
              aria-invalid={Boolean(form.fieldErrors?.price)}
              required
            />
          </Field>

          <Field
            label="Meals per week"
            htmlFor="plan-meals"
            error={form.fieldErrors?.mealsPerWeek}
          >
            <input
              id="plan-meals"
              name="mealsPerWeek"
              className="a-input"
              type="number"
              min={1}
              max={21}
              defaultValue={plan?.mealsPerWeek ?? 5}
              required
            />
          </Field>

          <Field
            label="Duration (weeks)"
            htmlFor="plan-weeks"
            error={form.fieldErrors?.durationWeeks}
          >
            <input
              id="plan-weeks"
              name="durationWeeks"
              className="a-input"
              type="number"
              min={1}
              max={52}
              defaultValue={plan?.durationWeeks ?? 1}
              required
            />
          </Field>
        </div>

        <Field
          label="Features — one per line"
          htmlFor="plan-features"
          error={form.fieldErrors?.features}
        >
          <textarea
            id="plan-features"
            name="features"
            className="a-textarea"
            defaultValue={plan?.features.join("\n") ?? ""}
            placeholder={"Chef-designed menu\nFree delivery in JVC\nPause any week"}
            maxLength={2000}
          />
        </Field>

        <div className="a-grid-2">
          <Field
            label="Sort order"
            htmlFor="plan-sort"
            error={form.fieldErrors?.sortOrder}
          >
            <input
              id="plan-sort"
              name="sortOrder"
              className="a-input"
              type="number"
              min={0}
              max={9999}
              defaultValue={plan?.sortOrder ?? 0}
            />
          </Field>

          <label className="a-check" style={{ alignSelf: "end", paddingBottom: ".7rem" }}>
            <input
              type="checkbox"
              name="active"
              defaultChecked={plan?.active ?? true}
            />
            On sale
          </label>
        </div>

        <div className="a-modal-foot" style={{ margin: "0 -1.6rem -1.6rem" }}>
          <button type="button" className="a-btn ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="a-btn primary" disabled={form.pending}>
            {form.pending ? "Saving…" : "Save plan"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
