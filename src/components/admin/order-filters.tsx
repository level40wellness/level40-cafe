"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

const CHIPS = [
  { value: "open", label: "Needs action" },
  { value: "all", label: "All" },
  { value: "pending_payment", label: "Awaiting payment" },
  { value: "paid", label: "Paid" },
  { value: "preparing", label: "Preparing" },
  { value: "ready", label: "Ready" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
] as const;

/**
 * Filter state lives in the URL rather than component state, so the query runs
 * on the server, a filtered queue can be bookmarked or handed to a colleague,
 * and a refresh does not silently drop back to the default view.
 */
export function OrderFilters({
  status,
  search,
  counts,
}: {
  status: string;
  search: string;
  counts: Record<string, number>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [term, setTerm] = useState(search);

  function apply(next: Record<string, string | undefined>) {
    const updated = new URLSearchParams(params.toString());

    for (const [key, value] of Object.entries(next)) {
      if (value) updated.set(key, value);
      else updated.delete(key);
    }

    router.push(`${pathname}?${updated.toString()}`);
  }

  return (
    <>
      <form
        className="a-panel-head"
        onSubmit={(event) => {
          event.preventDefault();
          apply({ q: term.trim() || undefined });
        }}
      >
        <div className="titles">
          <h2>Order queue</h2>
          <p>Live tickets from café tables and pickup.</p>
        </div>
        <div className="tools">
          <div className="a-search">
            <input
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              placeholder="Order number, name or email…"
              aria-label="Search orders"
            />
          </div>
          <button type="submit" className="a-btn ghost">
            Search
          </button>
        </div>
      </form>

      <div className="a-filter-chips">
        {CHIPS.map((chip) => (
          <button
            key={chip.value}
            type="button"
            className={`a-chip-btn${status === chip.value ? " on" : ""}`}
            onClick={() => apply({ status: chip.value })}
          >
            {chip.label} <span className="count">{counts[chip.value] ?? 0}</span>
          </button>
        ))}
      </div>
    </>
  );
}
