"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";
import Image from "next/image";
import { ImagePlus, Info, UploadCloud, X } from "lucide-react";
import { toast } from "sonner";

import { makeThumbUrl, MAX_UPLOAD_BYTES, optimiseForUpload } from "@/lib/client-image";
import {
  isAcceptedImage,
  nameKey,
  parseMenuPhotoName,
  splitNutrition,
  validateRow,
} from "@/lib/menu-photo-name";
import { importMenuPhotosAction } from "@/server/actions/admin/menu-photo-import";
import { AdminSelect } from "./admin-select";
import { Modal } from "./modal";

const MAX_FILES = 100;
/** Source photos above this are refused before any work; the shrink step handles the rest. */
const MAX_SOURCE_BYTES = 30 * 1024 * 1024;
const UPLOAD_CONCURRENCY = 4;
const SAVE_CHUNK = 10;

interface CategoryOption {
  id: string;
  name: string;
  active: boolean;
}

interface ExistingItem {
  name: string;
  categoryId: string | null;
}

type RowStatus = "idle" | "uploading" | "saving" | "created" | "updated" | "failed";

interface Row {
  id: string;
  file: File;
  thumb: string | null;
  name: string;
  description: string;
  nutrition: string;
  /** Kept as typed so "12." mid-edit is not rewritten under the cursor. */
  price: string;
  /** Null follows the dialog's default category. */
  categoryId: string | null;
  include: boolean;
  status: RowStatus;
  message: string;
  imageUrl: string | null;
}

const fileKey = (file: File) => `${file.name}|${file.size}|${file.lastModified}`;

function priceOf(text: string): number | null {
  const value = Number.parseFloat(text.replace(",", ".").trim());
  return Number.isFinite(value) ? value : null;
}

/** Runs `worker` over `items` with at most `limit` in flight. */
async function pool<T>(items: T[], limit: number, worker: (item: T) => Promise<void>) {
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) await worker(items[next++]);
    }),
  );
}

async function uploadWithRetry(file: File, signal: AbortSignal): Promise<string> {
  const blob = await optimiseForUpload(file);
  if (blob.size > MAX_UPLOAD_BYTES) throw new Error("This photo is over 8 MB.");

  const extension = blob.type === "image/webp" ? "webp" : blob.type === "image/jpeg" ? "jpg" : (file.name.split(".").pop() ?? "png");
  const stem = file.name.replace(/\.[^.]+$/, "").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").slice(0, 60) || "menu-photo";

  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const result = await upload(`menu/${stem}.${extension}`, blob, {
        access: "public",
        handleUploadUrl: "/api/admin/blob",
        contentType: blob.type || undefined,
        abortSignal: signal,
      });
      return result.url;
    } catch (error) {
      lastError = error;
      if (signal.aborted) break;
      await new Promise((resolve) => setTimeout(resolve, 600 * (attempt + 1)));
    }
  }
  throw lastError instanceof Error ? lastError : new Error("The upload did not complete.");
}

export function MenuPhotoImportButton({
  categories,
  existing,
  disabled,
}: {
  categories: CategoryOption[];
  existing: ExistingItem[];
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" className="a-btn ghost" disabled={disabled} onClick={() => setOpen(true)}>
        <ImagePlus size={15} aria-hidden="true" /> Import photos
      </button>
      {open && <PhotoImportDialog categories={categories} existing={existing} onClose={() => setOpen(false)} />}
    </>
  );
}

function PhotoImportDialog({
  categories,
  existing,
  onClose,
}: {
  categories: CategoryOption[];
  existing: ExistingItem[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [defaultCategory, setDefaultCategory] = useState(categories.find((c) => c.active)?.id ?? categories[0]?.id ?? "");
  const [running, setRunning] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0, stage: "" });

  const rowsRef = useRef(rows);
  useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);
  // Written synchronously when an upload lands: React state may not have
  // re-rendered by the time stage 2 starts, and a stale read would skip a row.
  const urlsRef = useRef(new Map<string, string>());
  const abortRef = useRef<AbortController | null>(null);
  const seen = useRef(new Set<string>());
  const thumbsToFree = useRef(new Set<string>());

  const categoryName = useMemo(() => new Map(categories.map((c) => [c.id, c.name])), [categories]);
  const existingByName = useMemo(() => {
    const map = new Map<string, ExistingItem[]>();
    for (const item of existing) map.set(nameKey(item.name), [...(map.get(nameKey(item.name)) ?? []), item]);
    return map;
  }, [existing]);

  const patch = useCallback((id: string, change: Partial<Row>) => {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...change } : row)));
  }, []);

  // Free thumbnails and cancel in-flight uploads when the dialog goes away.
  useEffect(() => {
    const thumbs = thumbsToFree.current;
    return () => {
      abortRef.current?.abort();
      for (const url of thumbs) URL.revokeObjectURL(url);
    };
  }, []);

  // A closed tab mid-run strands uploaded photos and half an import.
  useEffect(() => {
    if (!running) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [running]);

  const addFiles = useCallback(
    async (list: FileList | File[]) => {
      const incoming = Array.from(list);
      const notImages: string[] = [];
      const tooBig: string[] = [];
      const fresh: File[] = [];

      for (const file of incoming) {
        if (!isAcceptedImage(file)) notImages.push(file.name);
        else if (file.size > MAX_SOURCE_BYTES) tooBig.push(file.name);
        else if (!seen.current.has(fileKey(file))) fresh.push(file);
      }

      const room = MAX_FILES - rowsRef.current.length;
      const accepted = fresh.slice(0, Math.max(0, room));
      if (fresh.length > accepted.length) {
        toast.error(`Up to ${MAX_FILES} photos per import — ${fresh.length - accepted.length} not added.`);
      }
      if (notImages.length > 0) {
        toast.error(`Skipped ${notImages.length} file${notImages.length === 1 ? "" : "s"} that are not JPEG, PNG, WebP or AVIF images.`);
      }
      if (tooBig.length > 0) {
        toast.error(`Skipped ${tooBig.length} photo${tooBig.length === 1 ? "" : "s"} over 30 MB.`);
      }
      if (accepted.length === 0) return;

      const added: Row[] = accepted.map((file) => {
        seen.current.add(fileKey(file));
        const parsed = parseMenuPhotoName(file.name);
        return {
          id: crypto.randomUUID(),
          file,
          thumb: null,
          name: parsed.name,
          description: parsed.description,
          nutrition: parsed.nutrition,
          price: parsed.priceAed === null ? "" : String(parsed.priceAed),
          categoryId: null,
          include: true,
          status: "idle",
          message: "",
          imageUrl: null,
        };
      });
      setRows((current) => [...current, ...added]);

      // Thumbnails last, a few at a time, so the table appears instantly.
      await pool(added, 3, async (row) => {
        const url = await makeThumbUrl(row.file);
        if (url) thumbsToFree.current.add(url);
        patch(row.id, { thumb: url });
      });
    },
    [patch],
  );

  // Derived, per row, on every render: cheap, and always matches what was typed.
  const view = useMemo(() => {
    const firstWithName = new Map<string, string>();
    return rows.map((row) => {
      const key = nameKey(row.name);
      const matches = key ? (existingByName.get(key) ?? []) : [];
      const firstId = key ? firstWithName.get(key) : undefined;
      if (key && !firstId) firstWithName.set(key, row.id);

      const issues = validateRow({
        name: row.name,
        description: row.description,
        nutrition: row.nutrition,
        priceAed: row.price.trim() === "" ? null : priceOf(row.price),
      });
      if (row.price.trim() !== "" && priceOf(row.price) === null) issues.errors.push("Price is not a number.");

      const effectiveCategory = matches.length === 1 ? (matches[0].categoryId ?? defaultCategory) : (row.categoryId ?? defaultCategory);
      if (matches.length <= 1 && !effectiveCategory) issues.errors.push("Choose a category.");
      if (matches.length > 1) issues.errors.push("Several menu items share this name — rename one in the menu first.");

      return {
        row,
        issues,
        matches: matches.length,
        updatesCategory: matches.length === 1 ? matches[0].categoryId : null,
        effectiveCategory,
        duplicateOf: firstId && firstId !== row.id ? firstId : null,
      };
    });
  }, [rows, existingByName, defaultCategory]);

  const runnable = view.filter(
    (item) =>
      item.row.include &&
      (item.row.status === "idle" || item.row.status === "failed") &&
      item.issues.errors.length === 0,
  );
  const counts = {
    created: rows.filter((r) => r.status === "created").length,
    updated: rows.filter((r) => r.status === "updated").length,
    failed: rows.filter((r) => r.status === "failed").length,
  };
  const finished = rows.length > 0 && !running && counts.created + counts.updated + counts.failed > 0;

  async function run() {
    if (running || runnable.length === 0) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setRunning(true);

    const targets = runnable;
    setProgress({ done: 0, total: targets.length * 2, stage: "Optimising & uploading photos" });
    let done = 0;
    const tick = (stage?: string) => setProgress((p) => ({ ...p, done: ++done, stage: stage ?? p.stage }));

    try {
      // Stage 1 — shrink + upload. A row that already has its URL from an
      // earlier attempt skips straight on, so Retry never re-uploads.
      await pool(targets, UPLOAD_CONCURRENCY, async ({ row }) => {
        if (row.imageUrl || urlsRef.current.has(row.id)) return tick();
        patch(row.id, { status: "uploading", message: "" });
        try {
          const url = await uploadWithRetry(row.file, controller.signal);
          urlsRef.current.set(row.id, url);
          patch(row.id, { imageUrl: url, status: "idle" });
        } catch (error) {
          patch(row.id, {
            status: "failed",
            message: error instanceof Error ? error.message : "The upload did not complete.",
          });
        }
        tick();
      });

      if (controller.signal.aborted) return;

      // Stage 2 — save in small chunks; only text and URLs go to the server.
      setProgress((p) => ({ ...p, stage: "Saving menu items" }));
      const ready = targets.filter(({ row }) => urlsRef.current.has(row.id));
      const failedUploads = targets.length - ready.length;
      for (let i = 0; i < failedUploads; i += 1) tick();

      for (let start = 0; start < ready.length; start += SAVE_CHUNK) {
        const chunk = ready.slice(start, start + SAVE_CHUNK);
        for (const { row } of chunk) patch(row.id, { status: "saving" });

        try {
          // Fields are locked while running, so the click-time snapshot is current.
          const response = await importMenuPhotosAction(
            chunk.map(({ row, effectiveCategory }) => ({
              name: row.name,
              description: row.description,
              nutrition: row.nutrition,
              priceAed: row.price.trim() === "" ? null : priceOf(row.price),
              categoryId: effectiveCategory,
              imageUrl: urlsRef.current.get(row.id)!,
            })),
          );

          if (!response.ok) {
            for (const { row } of chunk) patch(row.id, { status: "failed", message: response.error ?? "The import failed." });
          } else {
            for (const result of response.results) {
              patch(chunk[result.index].row.id, { status: result.status, message: result.message });
            }
          }
        } catch {
          for (const { row } of chunk) patch(row.id, { status: "failed", message: "Connection lost — use Retry failed." });
        }
        for (let i = 0; i < chunk.length; i += 1) tick();
      }
    } finally {
      setRunning(false);
      abortRef.current = null;
    }
  }

  function handleClose() {
    if (running) {
      toast.message("Import in progress — it will finish in a moment.");
      return;
    }
    if (counts.created + counts.updated > 0) router.refresh();
    onClose();
  }

  const retrying = counts.failed > 0 && runnable.length > 0 && runnable.every((item) => item.row.status === "failed");
  const importLabel = retrying
    ? `Retry ${runnable.length} failed`
    : runnable.length === 0
      ? "Import"
      : `Import ${runnable.length} item${runnable.length === 1 ? "" : "s"}`;
  const percent = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <Modal wide title="Import menu from photos" subtitle="Menu Options" onClose={handleClose}>
      <div className="a-stack">
        <FormatGuide />

        <div className="a-field">
          <span className="a-field-label">Add new items to category</span>
          <AdminSelect
            label="Default category for new items"
            value={defaultCategory}
            disabled={running}
            options={categories.map((c) => ({ value: c.id, label: c.active ? c.name : `${c.name} (hidden)` }))}
            onSelect={setDefaultCategory}
          />
        </div>

        <div
          className={`a-mpi-drop${dragging ? " is-over" : ""}`}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            if (!running) void addFiles(event.dataTransfer.files);
          }}
        >
          <UploadCloud size={26} aria-hidden="true" />
          <strong>Drop menu photos here</strong>
          <span className="muted">JPEG, PNG, WebP or AVIF · up to {MAX_FILES} photos · shrunk automatically before upload</span>
          <label className="a-btn ghost" style={{ cursor: "pointer" }}>
            Choose photos
            <input
              type="file"
              hidden
              multiple
              disabled={running}
              accept="image/jpeg,image/png,image/webp,image/avif"
              onChange={(event) => {
                if (event.target.files) void addFiles(event.target.files);
                event.target.value = "";
              }}
            />
          </label>
        </div>

        {rows.length > 0 && (
          <ul className="a-mpi-list" aria-label="Photos to import">
            {view.map(({ row, issues, matches, updatesCategory, duplicateOf }) => {
              const locked = running || row.status === "created" || row.status === "updated";
              const state = rowState(row, issues.errors.length > 0, matches, duplicateOf !== null);
              return (
                <li key={row.id} className={`a-mpi-row${row.include ? "" : " is-off"}`}>
                  <div className="a-mpi-thumb">
                    {row.thumb ? <Image src={row.thumb} alt="" width={64} height={64} unoptimized /> : <span aria-hidden="true" />}
                  </div>

                  <div className="a-mpi-fields">
                    <div className="a-mpi-line">
                      <input
                        className="a-input"
                        aria-label="Item name"
                        placeholder="Item name"
                        value={row.name}
                        disabled={locked}
                        aria-invalid={issues.errors.some((e) => e.startsWith("Name")) || undefined}
                        onChange={(event) => patch(row.id, { name: event.target.value })}
                      />
                      <input
                        className="a-input a-mpi-price"
                        aria-label="Price in AED"
                        placeholder="AED"
                        inputMode="decimal"
                        value={row.price}
                        disabled={locked}
                        aria-invalid={issues.errors.some((e) => e.startsWith("Price")) || undefined}
                        onChange={(event) => patch(row.id, { price: event.target.value })}
                      />
                    </div>
                    <input
                      className="a-input"
                      aria-label="Description"
                      placeholder="Description (optional)"
                      value={row.description}
                      disabled={locked}
                      onChange={(event) => patch(row.id, { description: event.target.value })}
                    />
                    <input
                      className="a-input"
                      aria-label="Nutrition"
                      placeholder="Nutrition, comma separated (optional)"
                      value={row.nutrition}
                      disabled={locked}
                      onChange={(event) => patch(row.id, { nutrition: event.target.value })}
                    />
                    {splitNutrition(row.nutrition).length > 0 && (
                      <div className="nutri-row a-mpi-pills" aria-label="Nutrition as shown on the menu">
                        {splitNutrition(row.nutrition).map((fact, position) => (
                          <span key={`${fact}-${position}`} className="nutri-pill">
                            {fact}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="a-mpi-meta">
                      <span className={`a-badge ${state.badge}`}>{state.label}</span>
                      {matches === 1 ? (
                        <span className="muted">Stays in {categoryName.get(updatesCategory ?? "") ?? "its category"}</span>
                      ) : (
                        <span className="a-mpi-cat">
                          <AdminSelect
                            label={`Category for ${row.name || "this item"}`}
                            value={row.categoryId ?? defaultCategory}
                            disabled={locked}
                            options={categories.map((c) => ({ value: c.id, label: c.active ? c.name : `${c.name} (hidden)` }))}
                            onSelect={(value) => patch(row.id, { categoryId: value })}
                          />
                        </span>
                      )}
                      <span className="muted a-mpi-file" title={row.file.name}>
                        {row.file.name}
                      </span>
                    </div>
                    {(row.message || issues.errors.length > 0 || (row.status === "idle" && issues.warnings.length > 0) || duplicateOf) && (
                      <p className={`a-mpi-note${row.status === "failed" || issues.errors.length > 0 ? " is-error" : ""}`}>
                        {row.message ||
                          issues.errors[0] ||
                          (duplicateOf ? "Same name as an earlier photo in this batch — it would add a second photo to that item." : issues.warnings[0])}
                      </p>
                    )}
                  </div>

                  <div className="a-mpi-actions">
                    <label className="a-check" title="Include in import">
                      <input
                        type="checkbox"
                        checked={row.include}
                        disabled={locked}
                        aria-label={`Include ${row.name || row.file.name}`}
                        onChange={(event) => patch(row.id, { include: event.target.checked })}
                      />
                    </label>
                    <button
                      type="button"
                      className="a-icon-btn"
                      aria-label={`Remove ${row.name || row.file.name}`}
                      disabled={locked}
                      onClick={() => {
                        seen.current.delete(fileKey(row.file));
                        if (row.thumb) URL.revokeObjectURL(row.thumb);
                        setRows((current) => current.filter((r) => r.id !== row.id));
                      }}
                    >
                      <X size={14} aria-hidden="true" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {running && (
          <div className="a-mpi-progress" role="status" aria-live="polite">
            <div className="a-mpi-bar">
              <span style={{ width: `${percent}%` }} />
            </div>
            <span className="muted">
              {progress.stage}… {percent}%
            </span>
          </div>
        )}

        {finished && (
          <p className="a-mpi-summary" role="status">
            <strong>{counts.created}</strong> added · <strong>{counts.updated}</strong> updated
            {counts.failed > 0 && (
              <>
                {" "}
                · <strong style={{ color: "#a85f43" }}>{counts.failed}</strong> need attention
              </>
            )}
            . The public menu refreshes within 5 minutes.
          </p>
        )}

        <div className="a-modal-foot" style={{ margin: "0 -1.6rem -1.6rem" }}>
          <span className="muted" style={{ marginRight: "auto", alignSelf: "center" }}>
            {rows.length > 0 ? `${runnable.length} of ${rows.length} ready` : "No photos added yet"}
          </span>
          <button type="button" className="a-btn ghost" onClick={handleClose}>
            {finished ? "Done" : "Close"}
          </button>
          <button type="button" className="a-btn primary" disabled={running || runnable.length === 0} onClick={() => void run()}>
            {running ? "Importing…" : importLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function rowState(row: Row, hasErrors: boolean, matches: number, duplicate: boolean): { badge: string; label: string } {
  switch (row.status) {
    case "uploading":
      return { badge: "pending", label: "Uploading" };
    case "saving":
      return { badge: "pending", label: "Saving" };
    case "created":
      return { badge: "paid", label: "Added" };
    case "updated":
      return { badge: "paid", label: "Updated" };
    case "failed":
      return { badge: "overdue", label: "Failed" };
  }
  if (hasErrors) return { badge: "overdue", label: "Needs a fix" };
  if (duplicate) return { badge: "pending", label: "Duplicate" };
  if (matches === 1) return { badge: "paused", label: "Updates existing" };
  return { badge: "ready", label: "New item" };
}

function FormatGuide() {
  return (
    <details className="a-mpi-guide">
      <summary>
        <Info size={15} aria-hidden="true" /> How to name the photos
      </summary>
      <div className="a-mpi-guide-body">
        <p className="a-mpi-pattern">
          <b>Name</b>
          <i>:</i>
          <b>Description</b>
          <i>-</i>
          <b>Price</b>
          <i>(</i>
          <b>nutrition, comma separated</b>
          <i>)</i>
        </p>
        <ul>
          <li>
            <code>Basement:sautéed mushroom-19(1,2,3).jpg</code> → name, description, AED 19 and nutrition.
          </li>
          <li>
            <code>Americano-16.png</code> → description and nutrition are optional; name and price are enough.
          </li>
          <li>
            Windows does not allow <code>:</code> in file names — use <code>;</code> instead, e.g.{" "}
            <code>Basement;sautéed mushroom-19(1,2,3).jpg</code>.
          </li>
          <li>An item whose name already exists is updated: price always, description and nutrition only if the file name gives them, and the photo becomes its main one.</li>
          <li>Everything is editable below before anything is saved. Items without a price are added hidden until you set one.</li>
        </ul>
      </div>
    </details>
  );
}
