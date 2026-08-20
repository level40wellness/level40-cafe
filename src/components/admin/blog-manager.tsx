"use client";

import Image from "next/image";
import { useState } from "react";
import { Newspaper, Pencil, Plus, Trash2 } from "lucide-react";

import { MAX_BLOG_IMAGES, formatBlogDate } from "@/lib/blog";
import {
  createBlogPostAction,
  deleteBlogPostAction,
  updateBlogPostAction,
} from "@/server/actions/admin/blog";
import type { AdminBlogPost } from "@/server/queries/blog";
import { Field, FieldError, FormError, useAdminAction } from "./admin-form";
import { ImageUploader, type DraftImage } from "./image-uploader";
import { Modal } from "./modal";
import { EmptyRow, PanelHead, StatCards } from "./ui";

/** `null` means "new"; a row means "edit"; `undefined` means the modal is shut. */
type Editing = AdminBlogPost | null | undefined;

/** Date-input value (yyyy-mm-dd) for a stored publish timestamp. */
function toDateInput(date: Date | string) {
  return new Date(date).toISOString().slice(0, 10);
}

export function BlogManager({ items }: { items: AdminBlogPost[] }) {
  const [editing, setEditing] = useState<Editing>(undefined);
  const remove = useAdminAction(deleteBlogPostAction);

  function handleDelete(item: AdminBlogPost) {
    if (!window.confirm(`Remove "${item.title}"? This cannot be undone.`)) {
      return;
    }
    const formData = new FormData();
    formData.set("id", item.id);
    void remove.submit(formData);
  }

  return (
    <div>
      <StatCards
        items={[
          {
            label: "Journal posts",
            value: String(items.length),
            meta: "Shown on the homepage and /blog",
            accent: true,
          },
          {
            label: "Live",
            value: String(items.filter((p) => p.active).length),
            meta: "Visible on the site",
          },
          {
            label: "Hidden",
            value: String(items.filter((p) => !p.active).length),
            meta: "Drafts, not published",
          },
        ]}
      />

      <PanelHead
        title="Journal"
        subtitle="The two newest live posts appear on the homepage; every live post is listed on /blog."
      >
        <button
          type="button"
          className="a-btn primary"
          onClick={() => setEditing(null)}
        >
          <Plus size={15} aria-hidden="true" /> Add post
        </button>
      </PanelHead>

      <div className="a-table-wrap">
        <table className="a-table">
          <thead>
            <tr>
              <th>Post</th>
              <th>Hashtags</th>
              <th>Published</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <EmptyRow colSpan={5}>
                No posts yet — the homepage hides its journal section until one
                is live.
              </EmptyRow>
            ) : (
              items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div className="a-who" style={{ gap: ".6rem" }}>
                      {item.images[0] ? (
                        <Image
                          src={item.images[0]}
                          alt=""
                          width={48}
                          height={36}
                          className="a-img-thumb"
                          style={{ objectFit: "cover" }}
                          unoptimized
                        />
                      ) : (
                        <Newspaper
                          size={28}
                          aria-hidden="true"
                          style={{ opacity: 0.4, flexShrink: 0 }}
                        />
                      )}
                      <div>
                        <span className="primary-cell">{item.title}</span>
                        <div className="muted" style={{ fontSize: ".78rem" }}>
                          /blog/{item.slug}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="muted">
                      {item.hashtags.length > 0
                        ? item.hashtags.map((tag) => `#${tag}`).join(" ")
                        : "—"}
                    </span>
                  </td>
                  <td>{formatBlogDate(item.publishedAt)}</td>
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
                      aria-label={`Edit ${item.title}`}
                      onClick={() => setEditing(item)}
                    >
                      <Pencil size={16} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className="a-icon-btn"
                      aria-label={`Delete ${item.title}`}
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
        <BlogPostDialog post={editing} onClose={() => setEditing(undefined)} />
      )}
    </div>
  );
}

function BlogPostDialog({
  post,
  onClose,
}: {
  post: AdminBlogPost | null;
  onClose: () => void;
}) {
  const isEdit = post !== null;
  const form = useAdminAction(
    isEdit ? updateBlogPostAction : createBlogPostAction,
    { onSuccess: onClose },
  );

  const [images, setImages] = useState<DraftImage[]>(
    post?.images.map((path) => ({ path })) ?? [],
  );

  return (
    <Modal
      title={isEdit ? "Edit post" : "New post"}
      subtitle={isEdit ? post.title : "Shown in the journal"}
      onClose={onClose}
    >
      <form action={form.submit} className="a-stack">
        {isEdit && <input type="hidden" name="id" value={post.id} />}
        {/* The uploader is a custom component, so its value posts via a
            hidden input. */}
        <input
          type="hidden"
          name="images"
          value={JSON.stringify(images.map((image) => image.path))}
        />
        <FormError message={form.formError} />

        <Field label="Title" htmlFor="post-title" error={form.fieldErrors?.title}>
          <input
            id="post-title"
            name="title"
            className="a-input"
            defaultValue={post?.title ?? ""}
            aria-invalid={Boolean(form.fieldErrors?.title)}
            placeholder="e.g. Five high-protein breakfasts we love"
            required
            maxLength={140}
          />
        </Field>

        <Field
          label="Slug — leave empty to derive from the title"
          htmlFor="post-slug"
          error={form.fieldErrors?.slug}
        >
          <input
            id="post-slug"
            name="slug"
            className="a-input"
            defaultValue={post?.slug ?? ""}
            aria-invalid={Boolean(form.fieldErrors?.slug)}
            placeholder="five-high-protein-breakfasts"
            maxLength={140}
            pattern="[a-z0-9-]*"
          />
        </Field>

        <Field
          label="Short description"
          htmlFor="post-excerpt"
          error={form.fieldErrors?.excerpt}
        >
          <textarea
            id="post-excerpt"
            name="excerpt"
            className="a-input"
            rows={2}
            defaultValue={post?.excerpt ?? ""}
            aria-invalid={Boolean(form.fieldErrors?.excerpt)}
            placeholder="One or two sentences shown on the cards."
            required
            maxLength={300}
          />
        </Field>

        <Field
          label="Full article — separate paragraphs with a blank line"
          htmlFor="post-content"
          error={form.fieldErrors?.content}
        >
          <textarea
            id="post-content"
            name="content"
            className="a-input"
            rows={8}
            defaultValue={post?.content ?? ""}
            aria-invalid={Boolean(form.fieldErrors?.content)}
            placeholder="The full story, shown on the post's own page."
          />
        </Field>

        <ImageUploader
          value={images}
          onChange={setImages}
          max={MAX_BLOG_IMAGES}
          label="Images — the first is the cover"
        />
        <FieldError message={form.fieldErrors?.images} />

        <Field
          label="Hashtags — separated by spaces or commas"
          htmlFor="post-hashtags"
          error={form.fieldErrors?.hashtags}
        >
          <input
            id="post-hashtags"
            name="hashtags"
            className="a-input"
            defaultValue={post?.hashtags.map((tag) => `#${tag}`).join(" ") ?? ""}
            aria-invalid={Boolean(form.fieldErrors?.hashtags)}
            placeholder="#wellness #highprotein #coffee"
          />
        </Field>

        <div className="a-grid-2">
          <Field
            label="Author"
            htmlFor="post-author"
            error={form.fieldErrors?.author}
          >
            <input
              id="post-author"
              name="author"
              className="a-input"
              defaultValue={post?.author ?? ""}
              aria-invalid={Boolean(form.fieldErrors?.author)}
              placeholder="e.g. Level 40 Kitchen"
              maxLength={80}
            />
          </Field>

          <Field
            label="Publish date"
            htmlFor="post-published"
            error={form.fieldErrors?.publishedAt}
          >
            <input
              id="post-published"
              name="publishedAt"
              className="a-input"
              type="date"
              defaultValue={toDateInput(post?.publishedAt ?? new Date())}
              aria-invalid={Boolean(form.fieldErrors?.publishedAt)}
              required
            />
          </Field>
        </div>

        <label className="a-check">
          <input
            type="checkbox"
            name="active"
            defaultChecked={post?.active ?? true}
          />
          Visible on the site
        </label>

        <div className="a-modal-foot" style={{ margin: "0 -1.6rem -1.6rem" }}>
          <button type="button" className="a-btn ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="a-btn primary" disabled={form.pending}>
            {form.pending ? "Saving…" : "Save post"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
