"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, FileSpreadsheet, Upload } from "lucide-react";

import { importProductsAction, type ImportReport } from "@/server/actions/admin/import";
import { Modal } from "./modal";

/**
 * Retail-only toolbar: download a blank template, export the current catalogue
 * to edit, or upload a filled-in sheet. Sits next to "Add product" in the shop
 * manager. Export/template are plain links to the admin GET route; only the
 * upload needs a dialog.
 */
export function ProductImportBar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <a
        className="a-btn ghost"
        href="/api/admin/products/export?template=1"
        download
      >
        <FileSpreadsheet size={15} aria-hidden="true" /> Template
      </a>
      <a className="a-btn ghost" href="/api/admin/products/export" download>
        <Download size={15} aria-hidden="true" /> Export
      </a>
      <button type="button" className="a-btn ghost" onClick={() => setOpen(true)}>
        <Upload size={15} aria-hidden="true" /> Import CSV
      </button>
      {open && <ImportDialog onClose={() => setOpen(false)} />}
    </>
  );
}

function ImportDialog({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [report, action, pending] = useActionState(importProductsAction, null);

  const changed =
    report?.ok === true &&
    report.created + report.updated + report.categoriesCreated > 0;

  function handleClose() {
    // Refresh so imported rows appear in the table behind the dialog; the action
    // already revalidated the public pages server-side.
    if (changed) router.refresh();
    onClose();
  }

  return (
    <Modal wide title="Import products" subtitle="Retail shop" onClose={handleClose}>
      <form action={action} className="a-stack">
        <p className="muted" style={{ lineHeight: 1.5 }}>
          Upload a CSV in the template format. Rows are matched by{" "}
          <strong>SKU</strong> — an existing SKU updates that product, a new one
          adds it. Category paths like <code>Mats &gt; Jute Mats</code> are created
          automatically if missing. A blank <em>Images</em> cell leaves existing
          photos untouched.
        </p>

        <input
          type="file"
          name="file"
          accept=".csv,text/csv"
          required
          className="a-input"
          aria-label="CSV file"
        />

        {report?.ok === false && report.error && (
          <p className="a-error-summary">{report.error}</p>
        )}

        {report?.ok === true && <ImportSummary report={report} />}

        <div className="a-modal-foot" style={{ margin: "0 -1.6rem -1.6rem" }}>
          <button type="button" className="a-btn ghost" onClick={handleClose}>
            Close
          </button>
          <button type="submit" className="a-btn primary" disabled={pending}>
            {pending ? "Importing…" : "Upload & import"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ImportSummary({ report }: { report: ImportReport }) {
  return (
    <div
      style={{
        border: "1px solid var(--a-border, #e6ddce)",
        borderRadius: ".6rem",
        padding: "1rem 1.2rem",
        display: "grid",
        gap: ".6rem",
      }}
    >
      <div style={{ display: "flex", flexWrap: "wrap", gap: "1.2rem", fontWeight: 600 }}>
        <span>Added: {report.created}</span>
        <span>Updated: {report.updated}</span>
        {report.categoriesCreated > 0 && (
          <span>New categories: {report.categoriesCreated}</span>
        )}
        {report.skipped > 0 && (
          <span style={{ color: "#a85f43" }}>Skipped: {report.skipped}</span>
        )}
      </div>

      {report.rowErrors.length > 0 && (
        <div>
          <p className="muted" style={{ marginBottom: ".35rem" }}>
            Rows that were skipped:
          </p>
          <ul
            style={{
              margin: 0,
              paddingLeft: "1.1rem",
              maxHeight: 220,
              overflowY: "auto",
              fontSize: ".85rem",
              lineHeight: 1.5,
            }}
          >
            {report.rowErrors.map((rowError) => (
              <li key={rowError.row}>
                Row {rowError.row}: {rowError.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {report.created + report.updated === 0 && report.rowErrors.length === 0 && (
        <p className="muted">Nothing to import — the file had no product rows.</p>
      )}
    </div>
  );
}
