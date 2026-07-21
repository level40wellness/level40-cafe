"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

/**
 * Rendered as a native <dialog> so the browser supplies the focus trap, the
 * Escape handling and the inert backdrop. The source app used a plain div,
 * which left keyboard focus loose behind the overlay.
 */
export function Modal({
  title,
  subtitle,
  wide,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  wide?: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement | null>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    // showModal() is what enables the focus trap; the `open` attribute alone
    // renders the dialog inline and does none of that.
    if (!dialog.open) dialog.showModal();

    // Escape fires `cancel`, which would close the dialog without telling the
    // parent, leaving its state saying "open" against a closed dialog.
    function handleCancel(event: Event) {
      event.preventDefault();
      onClose();
    }

    dialog.addEventListener("cancel", handleCancel);
    return () => dialog.removeEventListener("cancel", handleCancel);
  }, [onClose]);

  return (
    <dialog
      ref={ref}
      className="a-modal-overlay"
      // Clicking the backdrop is the dialog element itself; clicks on the card
      // stop at the card, so this only fires outside it.
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
    >
      <div className={`a-modal-card${wide ? " wide" : ""}`}>
        <div className="a-modal-head">
          <div>
            <h3>{title}</h3>
            {subtitle && <span className="sub">{subtitle}</span>}
          </div>
          <button
            type="button"
            className="a-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
        <div className="a-modal-body">{children}</div>
      </div>
    </dialog>
  );
}
