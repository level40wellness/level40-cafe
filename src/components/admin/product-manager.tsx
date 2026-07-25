"use client";

import Image from "next/image";
import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";

import { formatFils } from "@/lib/format";
import {
  createProductAction,
  deleteProductsAction,
  setProductFlagAction,
  updateProductAction,
} from "@/server/actions/admin/products";
import type { AdminProduct } from "@/server/queries/admin";
import { formatColorOptions } from "@/lib/product-csv";
import { Field, FormError, useAdminAction } from "./admin-form";
import { type DraftImage, ImageUploader } from "./image-uploader";
import { Modal } from "./modal";
import { ProductImportBar } from "./product-import";
import { EmptyRow, PanelHead, StatCards } from "./ui";

type Kind = "cafe" | "retail";
type Editing = AdminProduct | null | undefined;

interface AssignableCategory {
  id: string;
  name: string;
  active: boolean;
}

export function ProductManager({
  kind,
  items,
  categories,
}: {
  kind: Kind;
  items: AdminProduct[];
  categories: AssignableCategory[];
}) {
  const isCafe = kind === "cafe";
  const noun = isCafe ? "menu item" : "product";

  const [editing, setEditing] = useState<Editing>(undefined);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());

  const remove = useAdminAction(deleteProductsAction, {
    onSuccess: () => setSelected(new Set()),
  });
  const flag = useAdminAction(setProductFlagAction);

  const filtered = items.filter((item) => {
    const term = query.trim().toLowerCase();
    if (!term) return true;
    return (
      item.name.toLowerCase().includes(term) ||
      (item.categoryName ?? "").toLowerCase().includes(term)
    );
  });

  const allShownSelected =
    filtered.length > 0 && filtered.every((item) => selected.has(item.id));

  function toggleOne(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  function toggleAllShown() {
    const next = new Set(selected);
    for (const item of filtered) {
      if (allShownSelected) next.delete(item.id);
      else next.add(item.id);
    }
    setSelected(next);
  }

  function handleBulkDelete() {
    const count = selected.size;
    if (count === 0) return;

    const confirmed = window.confirm(
      `Delete ${count} ${noun}${count === 1 ? "" : "s"}? This cannot be undone. ` +
        `Past orders keep their own record of what was bought and are unaffected.`,
    );
    if (!confirmed) return;

    const formData = new FormData();
    for (const id of selected) formData.append("id", id);
    void remove.submit(formData);
  }

  function toggleFlag(item: AdminProduct, field: "active" | "inStock") {
    const formData = new FormData();
    formData.set("id", item.id);
    formData.set("field", field);
    formData.set("value", String(!item[field]));
    void flag.submit(formData);
  }

  return (
    <div>
      <StatCards
        items={[
          {
            label: isCafe ? "Menu items" : "Products",
            value: String(items.length),
            meta: isCafe ? "Café catalogue" : "Retail catalogue",
            accent: true,
          },
          {
            label: "Live",
            value: String(items.filter((item) => item.active).length),
            meta: "Visible to customers",
          },
          {
            label: "Out of stock",
            value: String(
              items.filter((item) => item.active && !item.inStock).length,
            ),
            meta: "Live but unavailable",
          },
          {
            label: "No image",
            value: String(
              items.filter((item) => item.images.length === 0).length,
            ),
            meta: "Renders as a placeholder",
          },
        ]}
      />

      <PanelHead
        title={isCafe ? "Café menu" : "Retail shop"}
        subtitle={
          isCafe
            ? "Items here appear on /menu and can be ordered from a table."
            : "Items here appear on /shop."
        }
      >
        <div className="a-search">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search name or category…"
            aria-label={`Search ${noun}s`}
          />
        </div>
        {selected.size > 0 && (
          <button
            type="button"
            className="a-btn ghost"
            style={{ borderColor: "#c4856a", color: "#a85f43" }}
            disabled={remove.pending}
            onClick={handleBulkDelete}
          >
            <Trash2 size={15} aria-hidden="true" />
            {remove.pending ? "Deleting…" : `Delete ${selected.size}`}
          </button>
        )}
        {/* Bulk CSV upload/export is retail-only; the café menu is edited by hand. */}
        <ProductImportBar kind={kind} />
        <button
          type="button"
          className="a-btn primary"
          disabled={categories.length === 0}
          onClick={() => setEditing(null)}
        >
          <Plus size={15} aria-hidden="true" /> Add {noun}
        </button>
      </PanelHead>

      {categories.length === 0 && (
        <p className="a-error-summary" style={{ marginBottom: "1.2rem" }}>
          There are no {isCafe ? "café" : "retail"} categories yet. Create one
          first — every {noun} has to belong to a category to appear on the
          site.
        </p>
      )}

      <div className="a-table-wrap">
        <table className="a-table">
          <thead>
            <tr>
              <th style={{ width: 40 }}>
                <input
                  type="checkbox"
                  aria-label={`Select all ${noun}s shown`}
                  checked={allShownSelected}
                  onChange={toggleAllShown}
                  disabled={filtered.length === 0}
                />
              </th>
              <th>{isCafe ? "Dish" : "Product"}</th>
              <th>Category</th>
              <th className="right">Price</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <EmptyRow colSpan={6}>
                {items.length === 0
                  ? `No ${noun}s yet.`
                  : "Nothing matches that search."}
              </EmptyRow>
            ) : (
              filtered.map((item) => (
                <tr key={item.id}>
                  <td>
                    <input
                      type="checkbox"
                      aria-label={`Select ${item.name}`}
                      checked={selected.has(item.id)}
                      onChange={() => toggleOne(item.id)}
                    />
                  </td>
                  <td>
                    <div className="a-who">
                      {item.images[0] ? (
                        <Image
                          src={item.images[0].path}
                          alt=""
                          width={44}
                          height={44}
                          className="a-avatar"
                          style={{ objectFit: "cover" }}
                          unoptimized
                        />
                      ) : (
                        <div className="a-avatar gold">{item.emoji ?? "—"}</div>
                      )}
                      <div>
                        <div className="primary-cell">{item.name}</div>
                        {item.description && (
                          <span className="muted">
                            {item.description.slice(0, 70)}
                            {item.description.length > 70 ? "…" : ""}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>{item.categoryName ?? "—"}</td>
                  <td className="right num">{formatFils(item.priceFils)}</td>
                  <td>
                    <div
                      style={{
                        display: "flex",
                        gap: ".35rem",
                        flexWrap: "wrap",
                      }}
                    >
                      <button
                        type="button"
                        className={`a-badge ${item.active ? "active" : "cancelled"}`}
                        style={{
                          marginLeft: 0,
                          cursor: "pointer",
                          border: "none",
                        }}
                        disabled={flag.pending}
                        title={item.active ? "Hide from the site" : "Publish"}
                        onClick={() => toggleFlag(item, "active")}
                      >
                        {item.active ? "Live" : "Hidden"}
                      </button>
                      <button
                        type="button"
                        className={`a-badge ${item.inStock ? "ready" : "overdue"}`}
                        style={{ marginLeft: 0, cursor: "pointer" }}
                        disabled={flag.pending}
                        title={
                          item.inStock
                            ? "Mark out of stock"
                            : "Mark back in stock"
                        }
                        onClick={() => toggleFlag(item, "inStock")}
                      >
                        {item.inStock ? "In stock" : "Out"}
                      </button>
                    </div>
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
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editing !== undefined && (
        <ProductDialog
          kind={kind}
          product={editing}
          categories={categories}
          onClose={() => setEditing(undefined)}
        />
      )}
    </div>
  );
}

function ProductDialog({
  kind,
  product,
  categories,
  onClose,
}: {
  kind: Kind;
  product: AdminProduct | null;
  categories: AssignableCategory[];
  onClose: () => void;
}) {
  const isEdit = product !== null;
  const isCafe = kind === "cafe";

  const [images, setImages] = useState<DraftImage[]>(
    product?.images.map((image) => ({ path: image.path })) ?? [],
  );

  const form = useAdminAction(
    isEdit ? updateProductAction : createProductAction,
    { onSuccess: onClose },
  );

  return (
    <Modal
      wide
      title={
        isEdit
          ? `Edit ${isCafe ? "menu item" : "product"}`
          : `New ${isCafe ? "menu item" : "product"}`
      }
      subtitle={isCafe ? "Café menu" : "Retail shop"}
      onClose={onClose}
    >
      <form action={form.submit} className="a-stack">
        <input type="hidden" name="kind" value={kind} />
        {isEdit && <input type="hidden" name="id" value={product.id} />}
        {/* The uploader keeps its own state, so the list travels as JSON. */}
        <input type="hidden" name="images" value={JSON.stringify(images)} />

        <FormError message={form.formError} />

        <Field
          label="Name"
          htmlFor="product-name"
          error={form.fieldErrors?.name}
        >
          <input
            id="product-name"
            name="name"
            className="a-input"
            defaultValue={product?.name ?? ""}
            aria-invalid={Boolean(form.fieldErrors?.name)}
            required
            maxLength={120}
          />
        </Field>

        <Field
          label="Description"
          htmlFor="product-description"
          error={form.fieldErrors?.description}
        >
          <textarea
            id="product-description"
            name="description"
            className="a-textarea"
            defaultValue={product?.description ?? ""}
            maxLength={2000}
          />
        </Field>

        <div className="a-grid-2">
          <Field
            label="Price (AED)"
            htmlFor="product-price"
            error={form.fieldErrors?.price}
          >
            <input
              id="product-price"
              name="price"
              className="a-input"
              inputMode="decimal"
              placeholder="42.50"
              defaultValue={product ? (product.priceFils / 100).toFixed(2) : ""}
              aria-invalid={Boolean(form.fieldErrors?.price)}
              required
            />
          </Field>

          <Field
            label="Category"
            htmlFor="product-category"
            error={form.fieldErrors?.categoryId}
          >
            <select
              id="product-category"
              name="categoryId"
              className="a-select-i"
              defaultValue={product?.categoryId ?? ""}
              aria-invalid={Boolean(form.fieldErrors?.categoryId)}
              required
            >
              <option value="" disabled>
                Choose a category…
              </option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                  {category.active ? "" : " (hidden)"}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="a-grid-3">
          <Field
            label="Emoji"
            htmlFor="product-emoji"
            error={form.fieldErrors?.emoji}
          >
            <input
              id="product-emoji"
              name="emoji"
              className="a-input"
              defaultValue={product?.emoji ?? ""}
              placeholder="🥘"
              maxLength={8}
            />
          </Field>

          <Field
            label="Tags"
            htmlFor="product-tags"
            error={form.fieldErrors?.tags}
          >
            <input
              id="product-tags"
              name="tags"
              className="a-input"
              defaultValue={product?.tags.join(", ") ?? ""}
              placeholder="vegan, gluten free"
            />
          </Field>

          <Field
            label="Sort order"
            htmlFor="product-sort"
            error={form.fieldErrors?.sortOrder}
          >
            <input
              id="product-sort"
              name="sortOrder"
              className="a-input"
              type="number"
              min={0}
              max={9999}
              defaultValue={product?.sortOrder ?? 0}
            />
          </Field>
        </div>

        {/* Variant options are retail-only. One price per product, so these are
            just the choices a customer picks — separated by | like the CSV. */}
        {!isCafe && (
          <div className="a-grid-2">
            <Field
              label="Sizes"
              htmlFor="product-sizes"
              error={form.fieldErrors?.sizes}
            >
              <input
                id="product-sizes"
                name="sizes"
                className="a-input"
                defaultValue={product?.sizeOptions.join(" | ") ?? ""}
                placeholder="S | M | L | XL"
              />
            </Field>

            <Field
              label="Colours"
              htmlFor="product-colors"
              error={form.fieldErrors?.colors}
            >
              <input
                id="product-colors"
                name="colors"
                className="a-input"
                defaultValue={
                  product ? formatColorOptions(product.colorOptions) : ""
                }
                placeholder="Black:#000000 | Blue:#0066bf | Cream"
              />
            </Field>
          </div>
        )}

        <ImageUploader value={images} onChange={setImages} />

        <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
          <label className="a-check">
            <input
              type="checkbox"
              name="inStock"
              defaultChecked={product?.inStock ?? true}
            />
            In stock
          </label>
          <label className="a-check">
            <input
              type="checkbox"
              name="active"
              defaultChecked={product?.active ?? true}
            />
            Visible on the site
          </label>
        </div>

        <div className="a-modal-foot" style={{ margin: "0 -1.6rem -1.6rem" }}>
          <button type="button" className="a-btn ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            className="a-btn primary"
            disabled={form.pending}
          >
            {form.pending ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
