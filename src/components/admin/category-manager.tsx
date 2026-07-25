"use client";

import { useMemo, useState } from "react";
import { CornerDownRight, Pencil, Plus, Trash2 } from "lucide-react";

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

const KIND_RANK = { cafe: 0, retail: 1, both: 2 } as const;

/** `null` means "new"; a row means "edit"; `undefined` means the modal is shut. */
type Editing = AdminCategory | null | undefined;

interface TreeRow {
  item: AdminCategory;
  depth: number;
}

/**
 * Depth-first flatten so children render directly under their parent, indented.
 * Roots are grouped by kind first (café before retail) so the two catalogues
 * stay apart; siblings follow sortOrder then name.
 */
function buildTree(items: AdminCategory[]): TreeRow[] {
  const childrenOf = new Map<string | null, AdminCategory[]>();
  for (const item of items) {
    const key = item.parentId ?? null;
    const list = childrenOf.get(key);
    if (list) list.push(item);
    else childrenOf.set(key, [item]);
  }

  const compare = (a: AdminCategory, b: AdminCategory) =>
    KIND_RANK[a.kind] - KIND_RANK[b.kind] ||
    a.sortOrder - b.sortOrder ||
    a.name.localeCompare(b.name);

  const rows: TreeRow[] = [];
  const visited = new Set<string>();

  const walk = (parentId: string | null, depth: number) => {
    for (const item of (childrenOf.get(parentId) ?? []).slice().sort(compare)) {
      if (visited.has(item.id)) continue;
      visited.add(item.id);
      rows.push({ item, depth });
      walk(item.id, depth + 1);
    }
  };
  walk(null, 0);

  // A category whose parent id points nowhere would otherwise vanish; surface
  // it at the top level rather than dropping it silently.
  for (const item of items) {
    if (!visited.has(item.id)) rows.push({ item, depth: 0 });
  }

  return rows;
}

export function CategoryManager({ items }: { items: AdminCategory[] }) {
  const [editing, setEditing] = useState<Editing>(undefined);
  const [query, setQuery] = useState("");
  const [kindFilter, setKindFilter] = useState<"all" | AdminCategory["kind"]>("all");

  const remove = useAdminAction(deleteCategoryAction);

  const { rows, nameById, childCountById } = useMemo(() => {
    const nameById = new Map(items.map((item) => [item.id, item.name]));
    const childCountById = new Map<string, number>();
    for (const item of items) {
      if (item.parentId) {
        childCountById.set(item.parentId, (childCountById.get(item.parentId) ?? 0) + 1);
      }
    }
    return { rows: buildTree(items), nameById, childCountById };
  }, [items]);

  const filtered = rows.filter(({ item }) => {
    if (kindFilter !== "all" && item.kind !== kindFilter) return false;
    const term = query.trim().toLowerCase();
    if (!term) return true;
    return (
      item.name.toLowerCase().includes(term) ||
      item.slug.toLowerCase().includes(term)
    );
  });

  function handleDelete(item: AdminCategory) {
    if (item.productCount > 0) {
      window.alert(
        `"${item.name}" still holds ${item.productCount} product${item.productCount === 1 ? "" : "s"} and cannot be deleted until they are moved.`,
      );
      return;
    }

    const children = childCountById.get(item.id) ?? 0;
    if (children > 0) {
      window.alert(
        `"${item.name}" has ${children} sub-categor${children === 1 ? "y" : "ies"}. Delete or move them first.`,
      );
      return;
    }

    if (!window.confirm(`Delete "${item.name}"? This cannot be undone.`)) return;

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
        subtitle="Sections used across the café menu and the retail shop. Sub-categories nest under their parent."
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
              <th>Parent</th>
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
              <EmptyRow colSpan={8}>
                {items.length === 0
                  ? "No categories yet."
                  : "Nothing matches that filter."}
              </EmptyRow>
            ) : (
              filtered.map(({ item, depth }) => (
                <tr key={item.id}>
                  <td>
                    <div
                      className="a-who"
                      style={{ paddingLeft: depth * 20, gap: ".4rem" }}
                    >
                      {depth > 0 && (
                        <CornerDownRight
                          size={14}
                          aria-hidden="true"
                          style={{ opacity: 0.5, flexShrink: 0 }}
                        />
                      )}
                      <span className="primary-cell">{item.name}</span>
                    </div>
                  </td>
                  <td>
                    <span className="muted">
                      {item.parentId ? (nameById.get(item.parentId) ?? "—") : "—"}
                    </span>
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
          items={items}
          onClose={() => setEditing(undefined)}
        />
      )}
    </div>
  );
}

/** Categories that sit beneath `rootId`, so the editor cannot pick one as its own parent. */
function descendantsOf(rootId: string, items: AdminCategory[]): Set<string> {
  const childrenOf = new Map<string, AdminCategory[]>();
  for (const item of items) {
    if (!item.parentId) continue;
    const list = childrenOf.get(item.parentId);
    if (list) list.push(item);
    else childrenOf.set(item.parentId, [item]);
  }

  const result = new Set<string>();
  const stack = [rootId];
  while (stack.length > 0) {
    const current = stack.pop()!;
    for (const child of childrenOf.get(current) ?? []) {
      if (result.has(child.id)) continue;
      result.add(child.id);
      stack.push(child.id);
    }
  }
  return result;
}

function CategoryDialog({
  category,
  items,
  onClose,
}: {
  category: AdminCategory | null;
  items: AdminCategory[];
  onClose: () => void;
}) {
  const isEdit = category !== null;
  const form = useAdminAction(
    isEdit ? updateCategoryAction : createCategoryAction,
    { onSuccess: onClose },
  );

  const [kind, setKind] = useState<AdminCategory["kind"]>(category?.kind ?? "retail");
  const [parentId, setParentId] = useState<string>(category?.parentId ?? "");

  // A category cannot be its own parent, nor sit under one of its own
  // descendants, nor cross to a different catalogue side.
  const excluded = useMemo(
    () => (category ? descendantsOf(category.id, items) : new Set<string>()),
    [category, items],
  );

  const parentOptions = items.filter((item) => {
    if (category && item.id === category.id) return false;
    if (excluded.has(item.id)) return false;
    return item.kind === kind || item.kind === "both" || kind === "both";
  });

  function pathLabel(item: AdminCategory): string {
    const names: string[] = [];
    const seen = new Set<string>();
    let current: AdminCategory | undefined = item;
    while (current && !seen.has(current.id)) {
      seen.add(current.id);
      names.unshift(current.name);
      current = current.parentId
        ? items.find((candidate) => candidate.id === current!.parentId)
        : undefined;
    }
    return names.join(" › ");
  }

  return (
    <Modal
      title={isEdit ? "Edit category" : "New category"}
      subtitle={isEdit ? category.slug : "Menu or shop section"}
      onClose={onClose}
    >
      <form action={form.submit} className="a-stack">
        {isEdit && <input type="hidden" name="id" value={category.id} />}
        {/* The parent select is controlled, so its value posts even though the
            native select is re-rendered when the kind filter changes. */}
        <input type="hidden" name="parentId" value={parentId} />
        <FormError message={form.formError} />

        <Field label="Name" htmlFor="category-name" error={form.fieldErrors?.name}>
          <input
            id="category-name"
            name="name"
            className="a-input"
            defaultValue={category?.name ?? ""}
            aria-invalid={Boolean(form.fieldErrors?.name)}
            placeholder="e.g. Jute Mats"
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
              value={kind}
              onChange={(event) => {
                const next = event.target.value as AdminCategory["kind"];
                setKind(next);
                // Drop a parent that no longer belongs to the chosen side.
                const parent = parentId ? items.find((i) => i.id === parentId) : null;
                if (
                  parent &&
                  parent.kind !== next &&
                  parent.kind !== "both" &&
                  next !== "both"
                ) {
                  setParentId("");
                }
              }}
            >
              <option value="cafe">Café menu</option>
              <option value="retail">Retail shop</option>
              <option value="both">Both</option>
            </select>
          </Field>

          <Field
            label="Parent category"
            htmlFor="category-parent"
            error={form.fieldErrors?.parentId}
          >
            <select
              id="category-parent"
              className="a-select-i"
              value={parentId}
              aria-invalid={Boolean(form.fieldErrors?.parentId)}
              onChange={(event) => setParentId(event.target.value)}
            >
              <option value="">— None (top level) —</option>
              {parentOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {pathLabel(option)}
                  {option.active ? "" : " (hidden)"}
                </option>
              ))}
            </select>
          </Field>
        </div>

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
