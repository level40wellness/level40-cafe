"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

/**
 * A listbox that can be styled, replacing the native <select> whose dropdown is
 * drawn by the OS and takes no CSS at all — on /admin/orders that meant a
 * console themed down to the hairline opening a grey system menu.
 *
 * Built on the popover API rather than an absolutely-positioned div because the
 * control sits in a <td> inside .a-table-wrap{overflow-x:auto}, itself inside
 * .admin-content{overflow-x:auto}. A positioned panel is clipped by both. The
 * top layer is outside that stacking entirely, and brings light-dismiss and
 * Escape with it — the same reason modal.tsx uses a real <dialog>.
 */

export type AdminSelectOption = {
  value: string;
  label: string;
};

/** Keeps the panel off the viewport edge, and off the trigger. */
const VIEWPORT_MARGIN = 8;
const TRIGGER_GAP = 6;

export function AdminSelect({
  options,
  value,
  placeholder = "Select…",
  disabled = false,
  label,
  onSelect,
}: {
  options: readonly AdminSelectOption[];
  /** Omitted where the control is an action rather than a stored value. */
  value?: string;
  placeholder?: string;
  disabled?: boolean;
  /** The accessible name — a table cell has no room for a visible <label>. */
  label: string;
  onSelect: (value: string) => void;
}) {
  const panelId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const selectedIndex = options.findIndex((option) => option.value === value);
  const selected = selectedIndex >= 0 ? options[selectedIndex] : undefined;

  /**
   * Light dismiss and Escape are handled by the browser, which closes the
   * popover without telling React. Mirroring the toggle event back into state
   * is what keeps aria-expanded honest.
   */
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;

    function handleToggle(event: Event) {
      // ToggleEvent is not in every lib.dom we build against; the field is.
      setOpen((event as Event & { newState?: string }).newState === "open");
    }

    panel.addEventListener("toggle", handleToggle);
    return () => panel.removeEventListener("toggle", handleToggle);
  }, []);

  // Focus moves to the panel so the arrow keys have somewhere to land.
  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open]);

  /**
   * Fixed coordinates are measured once, at open. Scrolling the table would
   * slide the trigger out from under them, so the panel closes rather than
   * follows — cheaper than tracking, and the list is one click away again.
   */
  useEffect(() => {
    if (!open) return;

    function close() {
      panelRef.current?.hidePopover();
    }

    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);

    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  function place() {
    const trigger = triggerRef.current;
    const panel = panelRef.current;
    if (!trigger || !panel) return;

    const anchor = trigger.getBoundingClientRect();
    panel.style.minWidth = `${anchor.width}px`;

    // Measured after showPopover, so the panel has its final size.
    const box = panel.getBoundingClientRect();

    let top = anchor.bottom + TRIGGER_GAP;
    if (top + box.height > window.innerHeight - VIEWPORT_MARGIN) {
      const above = anchor.top - TRIGGER_GAP - box.height;
      // Flip above the trigger, unless that overflows too — then pin to the
      // bottom edge, which is what a row near the fold needs.
      top =
        above >= VIEWPORT_MARGIN
          ? above
          : Math.max(VIEWPORT_MARGIN, window.innerHeight - VIEWPORT_MARGIN - box.height);
    }

    const left = Math.max(
      VIEWPORT_MARGIN,
      Math.min(anchor.left, window.innerWidth - VIEWPORT_MARGIN - box.width),
    );

    panel.style.top = `${top}px`;
    panel.style.left = `${left}px`;
  }

  function openPanel() {
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
    panelRef.current?.showPopover();
    place();
  }

  function choose(index: number) {
    const option = options[index];
    if (!option) return;

    panelRef.current?.hidePopover();
    // Returning focus is what makes repeated edits down a column workable.
    triggerRef.current?.focus();
    onSelect(option.value);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setActiveIndex((index) => Math.min(index + 1, options.length - 1));
        break;
      case "ArrowUp":
        event.preventDefault();
        setActiveIndex((index) => Math.max(index - 1, 0));
        break;
      case "Home":
        event.preventDefault();
        setActiveIndex(0);
        break;
      case "End":
        event.preventDefault();
        setActiveIndex(options.length - 1);
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        choose(activeIndex);
        break;
      case "Tab":
        // Escape is the browser's; Tab has to be ours or focus lands in a
        // panel that is still open behind the rest of the page.
        panelRef.current?.hidePopover();
        break;
      default:
        break;
    }
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="a-select a-sel-trigger"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        onClick={() => (open ? panelRef.current?.hidePopover() : openPanel())}
      >
        <span className={selected ? undefined : "is-placeholder"}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown aria-hidden="true" />
      </button>

      <div
        ref={panelRef}
        id={panelId}
        role="listbox"
        aria-label={label}
        aria-activedescendant={
          open && options[activeIndex] ? `${panelId}-${activeIndex}` : undefined
        }
        tabIndex={-1}
        popover="auto"
        className="a-sel-panel"
        onKeyDown={handleKeyDown}
      >
        {options.map((option, index) => (
          <div
            key={option.value}
            id={`${panelId}-${index}`}
            role="option"
            aria-selected={option.value === value}
            className={`a-sel-opt${index === activeIndex ? " is-active" : ""}`}
            // Pointer selection runs through the same path as the keyboard.
            onMouseEnter={() => setActiveIndex(index)}
            onClick={() => choose(index)}
          >
            <span>{option.label}</span>
            {option.value === value && <Check aria-hidden="true" />}
          </div>
        ))}
      </div>
    </>
  );
}
