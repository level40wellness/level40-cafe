import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminTopbar } from "@/components/admin/admin-topbar";
import { getSession, isAdmin } from "@/server/guards";

export const metadata: Metadata = {
  title: "Admin Console",
  robots: { index: false, follow: false, nocache: true },
};

/**
 * Every admin screen reads live operational data behind a session check, so
 * none of it may be prerendered at build time or served from a shared cache.
 */
export const dynamic = "force-dynamic";

function initialsFor(name: string | null | undefined, email: string) {
  return (
    (name || email)
      .split(/\s+|@/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "L4"
  );
}

/**
 * The authorization boundary for the whole console.
 *
 * The source app checked `isCurrentUserAdmin()` in the browser and hid the tabs
 * on failure, which protected the pixels rather than the data. This runs on the
 * server before any child renders, and every mutation behind it calls
 * requireAdmin() again — the layout is the first gate, not the only one.
 */
export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await getSession();

  if (!session?.user) {
    redirect(`/auth?next=${encodeURIComponent("/admin")}`);
  }

  if (!(await isAdmin(session.user.id))) {
    return (
      <section className="admin-denied">
        <div className="admin-denied-card">
          <h1>Admin access required</h1>
          <p>
            You are signed in as <b>{session.user.email}</b>, but this account
            does not have the admin role.
          </p>
          <p className="hint">
            An existing admin can grant access from Users &amp; Admins. There is
            no way to grant it to yourself.
          </p>
          <Link href="/" className="a-btn primary">
            Back to site
          </Link>
        </div>
      </section>
    );
  }

  // Formatted on the server, in the café's timezone rather than the viewer's.
  const today = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Dubai",
  }).format(new Date());

  return (
    <div className="admin-shell">
      <AdminSidebar />
      <div className="admin-main">
        <AdminTopbar
          today={today}
          initials={initialsFor(session.user.name, session.user.email)}
        />
        <main className="admin-content">{children}</main>
      </div>
    </div>
  );
}
