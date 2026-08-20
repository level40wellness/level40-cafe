"use client";

import Image from "next/image";
import { useState } from "react";
import { upload } from "@vercel/blob/client";
import { Star, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

export interface DraftImage {
  path: string;
  alt?: string;
}

const MAX_IMAGES = 5;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/avif"];

/**
 * Uploads straight from the browser to Blob storage; /api/admin/blob only
 * hands out a scoped token. The bytes never pass through a server action, so
 * a 4 MB photo is not competing with the 1 MB action body limit.
 *
 * The uploaded URLs are held in form state and only written to the database
 * when the product is saved — abandoning the dialog costs a stored object but
 * never leaves a half-written product row.
 */
export function ImageUploader({
  value,
  onChange,
  max = MAX_IMAGES,
  label = "Images — the first is used as the thumbnail",
}: {
  value: DraftImage[];
  onChange: (next: DraftImage[]) => void;
  /** Cap on how many images this form accepts; defaults to the product limit. */
  max?: number;
  label?: string;
}) {
  const [busy, setBusy] = useState(false);

  async function handleFiles(fileList: FileList) {
    // With a single-image cap the next upload replaces the current photo
    // rather than being refused — "change the photo" is the common edit.
    const replacing = max === 1;
    const remaining = replacing ? 1 : max - value.length;

    if (remaining <= 0) {
      toast.error(`At most ${max} image${max === 1 ? "" : "s"} here.`);
      return;
    }

    const files = Array.from(fileList);
    const accepted = files.filter((file) => ACCEPTED.includes(file.type));

    if (accepted.length < files.length) {
      toast.error("Only JPEG, PNG, WebP and AVIF images can be uploaded.");
    }
    if (accepted.length === 0) return;

    const batch = accepted.slice(0, remaining);
    if (accepted.length > remaining) {
      toast.message(`Uploading ${remaining} of ${accepted.length} — that is the limit.`);
    }

    setBusy(true);

    try {
      const uploaded = await Promise.all(
        batch.map((file) =>
          upload(file.name, file, {
            access: "public",
            handleUploadUrl: "/api/admin/blob",
          }),
        ),
      );

      const added = uploaded.map((blob) => ({ path: blob.url }));
      onChange(replacing ? added : [...value, ...added]);
      toast.success(
        `${uploaded.length} image${uploaded.length === 1 ? "" : "s"} uploaded.`,
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "The upload did not complete.",
      );
    } finally {
      setBusy(false);
    }
  }

  function makePrimary(index: number) {
    if (index <= 0) return;
    const next = [...value];
    const [picked] = next.splice(index, 1);
    onChange([picked, ...next]);
  }

  return (
    <div className="a-field">
      <span className="a-field-label">{label}</span>

      {value.length > 0 && (
        <div className="a-img-grid">
          {value.map((image, index) => (
            <div
              key={image.path}
              className={`a-img-tile${index === 0 ? " is-primary" : ""}`}
            >
              <Image
                src={image.path}
                alt=""
                width={96}
                height={96}
                className="a-img-thumb"
                unoptimized
              />
              {index === 0 && <span className="a-img-flag">Primary</span>}
              <div className="a-img-tools">
                {index !== 0 && (
                  <button
                    type="button"
                    className="a-icon-btn"
                    aria-label="Use as thumbnail"
                    onClick={() => makePrimary(index)}
                  >
                    <Star size={14} aria-hidden="true" />
                  </button>
                )}
                <button
                  type="button"
                  className="a-icon-btn"
                  aria-label="Remove image"
                  onClick={() =>
                    onChange(value.filter((_, position) => position !== index))
                  }
                >
                  <Trash2 size={14} aria-hidden="true" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <label className={`a-btn ghost${busy ? " is-busy" : ""}`} style={{ cursor: "pointer" }}>
        <Upload size={15} aria-hidden="true" />
        {busy
          ? "Uploading…"
          : max === 1
            ? value.length > 0
              ? "Replace photo"
              : "Add photo"
            : `Add images (${value.length}/${max})`}
        <input
          type="file"
          accept={ACCEPTED.join(",")}
          multiple={max > 1}
          hidden
          disabled={busy || (max > 1 && value.length >= max)}
          onChange={(event) => {
            if (event.target.files) void handleFiles(event.target.files);
            // Allows re-selecting the same file after a removal.
            event.target.value = "";
          }}
        />
      </label>
    </div>
  );
}
