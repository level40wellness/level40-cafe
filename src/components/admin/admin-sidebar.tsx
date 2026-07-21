"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ExternalLink, LogOut } from "lucide-react";

import { signOut } from "@/lib/auth-client";
import { ADMIN_NAV, activeNavItem } from "@/lib/admin-nav";

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const active = activeNavItem(pathname);

  /**
   * Navigating away is not cosmetic. The admin guard runs in a server
   * component, so clearing the session alone leaves the already-rendered
   * console on screen until something triggers a fetch.
   */
  async function handleSignOut() {
    await signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <aside className="admin-sidebar">
      <div className="admin-sidebar-brand">
        <b>level 40</b>
        <span>Admin Console</span>
      </div>

      <nav className="admin-nav">
        {ADMIN_NAV.map(({ href, label, icon: Icon }) => {
          const isActive = active?.href === href;

          return (
            <Link
              key={href}
              href={href}
              className={`admin-nav-item${isActive ? " is-active" : ""}`}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon aria-hidden="true" /> <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="admin-sidebar-foot">
        <Link href="/" className="admin-nav-item">
          <ExternalLink aria-hidden="true" /> <span>View site</span>
        </Link>
        <button
          type="button"
          className="admin-nav-item"
          onClick={() => void handleSignOut()}
        >
          <LogOut aria-hidden="true" /> <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
}
