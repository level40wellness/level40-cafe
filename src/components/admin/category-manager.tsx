"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";

import {
  createCategoryAction,
  deleteCategoryAction,
  updateCategoryAction,
} from "@/server/actions/admin/categories";
import type { AdminCategory } from "@/server/queries/admin";
import { Field, FormError, useAdminAction } from "./admin-form";
import { Modal } from "./modal";
import { EmptyRow, PanelHead, StatCards } from "./ui";

const KIND_LABEL = {
  cafe: "Café menu",
  retail: "Retail shop",
  both: "Both",
} as const;

/** `null` means "new"; a row means "edit"; `undefined` means the modal is shut. */
type Editing = AdminCategory | null | undefined;

export function CategoryManager({ items }: { items: AdminCategory[] }) {
  const [editing, setEditing] = useState<Editing>(undefined);
  const [query, setQuery] = useState("");
  const [kindFilter, setKindFilter] = useState<"all" | AdminCategory["kind"]>("all");

  const remove = useAdminAction(deleteCategoryAction);

  const filtered = items.filter((item) => {
    if (kindFilter !== "all" && item.kind !== kindFilter) return false;
    const term = query.trim().toLowerCase();
    if (!term) return true;
    return (
      item.name.toLowerCase().includes(term) ||
      item.slug.toLowerCase().includes(term)
    );
  });

  function handleDelete(item: AdminCategory) {
    const warning =
      item.productCount > 0
        ? `"${item.name}" still holds ${item.productCount} product${item.productCount === 1 ? "" : "s"} and cannot be deleted until they are moved.`
        : `Delete "${item.name}"? This cannot be undone.`;

    if (item.productCount > 0) {
      window.alert(warning);
      return;
    }
    if (!window.confirm(warning)) return;

    const formData = new FormData();
    formData.set("id", item.id);
    void remove.submit(formData);
  }

  return (
    <div>
      <StatCards
        items={[
          {
            label: "Categories",
            value: String(items.length),
            meta: "Menu and shop combined",
            accent: true,
          },
          {
            label: "Café",
            value: String(
              items.filter((c) => c.kind === "cafe" || c.kind === "both").length,
            ),
            meta: "Shown on /menu",
          },
          {
            label: "Retail",
            value: String(
              items.filter((c) => c.kind === "retail" || c.kind === "both").length,
            ),
            meta: "Shown on /shop",
          },
          {
            label: "Hidden",
            value: String(items.filter((c) => !c.active).length),
            meta: "Not published",
          },
        ]}
      />

      <PanelHead
        title="Category master"
        subtitle="Sections used across the café menu and the retail shop."
      >
        <div className="a-search">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search name or slug…"
            aria-label="Search categories"
          />
        </div>
        <select
          className="a-select"
          value={kindFilter}
          aria-label="Filter by kind"
          onChange={(event) =>
            setKindFilter(event.target.value as typeof kindFilter)
          }
        >
          <option value="all">All kinds</option>
          <option value="cafe">Café only</option>
          <option value="retail">Retail only</option>
          <option value="both">Both</option>
        </select>
        <button
          type="button"
          className="a-btn primary"
          onClick={() => setEditing(null)}
        >
          <Plus size={15} aria-hidden="true" /> Add category
        </button>
      </PanelHead>

      <div className="a-table-wrap">
        <table className="a-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Slug</th>
              <th>Appears in</th>
              <th className="right">Products</th>
              <th className="right">Sort</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <EmptyRow colSpan={7}>
                {items.length === 0
                  ? "No categories yet."
                  : "Nothing matches that filter."}
              </EmptyRow>
            ) : (
              filtered.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div className="primary-cell">{item.name}</div>
                  </td>
                  <td>
                    <span className="muted">{item.slug}</span>
                  </td>
                  <td>{KIND_LABEL[item.kind]}</td>
                  <td className="right num">{item.productCount}</td>
                  <td className="right num">{item.sortOrder}</td>
                  <td>
                    <span
                      className={`a-badge ${item.active ? "active" : "cancelled"}`}
                      style={{ marginLeft: 0 }}
                    >
                      {item.active ? "Live" : "Hidden"}
                    </span>
                  </td>
                  <td className="right">
                    <button
                      type="button"
                      className="a-icon-btn"
                      aria-label={`Edit ${item.name}`}
                      onClick={() => setEditing(item)}
                    >
                      <Pencil size={16} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className="a-icon-btn"
                      aria-label={`Delete ${item.name}`}
                      disabled={remove.pending}
                      onClick={() => handleDelete(item)}
                    >
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editing !== undefined && (
        <CategoryDialog
          category={editing}
          onClose={() => setEditing(undefined)}
        />
      )}
    </div>
  );
}

function CategoryDialog({
  category,
  onClose,
}: {
  category: AdminCategory | null;
  onClose: () => void;
}) {
  const isEdit = category !== null;
  const form = useAdminAction(
    isEdit ? updateCategoryAction : createCategoryAction,
    { onSuccess: onClose },
  );

  return (
    <Modal
      title={isEdit ? "Edit category" : "New category"}
      subtitle={isEdit ? category.slug : "Menu or shop section"}
      onClose={onClose}
    >
      <form action={form.submit} className="a-stack">
        {isEdit && <input type="hidden" name="id" value={category.id} />}
        <FormError message={form.formError} />

        <Field label="Name" htmlFor="category-name" error={form.fieldErrors?.name}>
          <input
            id="category-name"
            name="name"
            className="a-input"
            defaultValue={category?.name ?? ""}
            aria-invalid={Boolean(form.fieldErrors?.name)}
            placeholder="e.g. Signatures"
            required
            maxLength={80}
          />
        </Field>

        <Field label="Slug" htmlFor="category-slug" error={form.fieldErrors?.slug}>
          <input
            id="category-slug"
            name="slug"
            className="a-input"
            defaultValue={category?.slug ?? ""}
            aria-invalid={Boolean(form.fieldErrors?.slug)}
            placeholder="Left blank, this is generated from the name"
            maxLength={80}
          />
        </Field>

        <div className="a-grid-2">
          <Field label="Appears in" htmlFor="category-kind" error={form.fieldErrors?.kind}>
            <select
              id="category-kind"
              name="kind"
              className="a-select-i"
              defaultValue={category?.kind ?? "retail"}
            >
              <option value="cafe">Café menu</option>
              <option value="retail">Retail shop</option>
              <option value="both">Both</option>
            </select>
          </Field>

          <Field
            label="Sort order"
            htmlFor="category-sort"
            error={form.fieldErrors?.sortOrder}
          >
            <input
              id="category-sort"
              name="sortOrder"
              className="a-input"
              type="number"
              min={0}
              max={9999}
              defaultValue={category?.sortOrder ?? 0}
            />
          </Field>
        </div>

        <label className="a-check">
          <input
            type="checkbox"
            name="active"
            defaultChecked={category?.active ?? true}
          />
          Visible on the site
        </label>

        <div className="a-modal-foot" style={{ margin: "0 -1.6rem -1.6rem" }}>
          <button type="button" className="a-btn ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="a-btn primary" disabled={form.pending}>
            {form.pending ? "Saving…" : "Save category"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
