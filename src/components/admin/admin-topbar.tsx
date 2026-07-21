"use client";

import { usePathname } from "next/navigation";

import { activeNavItem } from "@/lib/admin-nav";

/**
 * `today` is formatted on the server and passed down rather than computed here.
 * A client-side `new Date()` renders the browser's timezone over the server's
 * markup, which is a hydration mismatch and, for a Dubai café whose staff may
 * travel, the wrong date on the screen.
 */
export function AdminTopbar({
  today,
  initials,
}: {
  today: string;
  initials: string;
}) {
  const pathname = usePathname();
  const active = activeNavItem(pathname);

  return (
    <header className="admin-topbar">
      <h1>{active?.label ?? "Dashboard"}</h1>
      <div className="admin-topbar-right">
        <span className="admin-date">{today}</span>
        <span className="admin-avatar">{initials}</span>
      </div>
    </header>
  );
}
