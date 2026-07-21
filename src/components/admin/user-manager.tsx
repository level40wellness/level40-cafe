"use client";

import { useState } from "react";

import { formatDubaiDateTime } from "@/lib/format";
import {
  grantAdminAction,
  revokeAdminAction,
} from "@/server/actions/admin/users";
import type { AdminUserRow } from "@/server/queries/admin";
import { useAdminAction } from "./admin-form";
import { EmptyRow, PanelHead, StatCards } from "./ui";

const PROVIDER_LABEL: Record<string, string> = {
  credential: "Password",
  google: "Google",
};

export function UserManager({
  users,
  currentUserId,
}: {
  users: AdminUserRow[];
  currentUserId: string;
}) {
  const [query, setQuery] = useState("");
  const grant = useAdminAction(grantAdminAction);
  const revoke = useAdminAction(revokeAdminAction);

  const adminCount = users.filter((row) => row.isAdmin).length;
  const pending = grant.pending || revoke.pending;

  const filtered = users.filter((row) => {
    const term = query.trim().toLowerCase();
    if (!term) return true;
    return (
      row.email.toLowerCase().includes(term) ||
      row.name.toLowerCase().includes(term)
    );
  });

  function toggleAdmin(row: AdminUserRow) {
    const formData = new FormData();
    formData.set("userId", row.id);

    if (!row.isAdmin) {
      if (
        !window.confirm(
          `Give ${row.email} full admin access? They will be able to change prices, read every order and manage other admins.`,
        )
      ) {
        return;
      }
      void grant.submit(formData);
      return;
    }

    if (!window.confirm(`Remove admin access from ${row.email}?`)) return;
    void revoke.submit(formData);
  }

  return (
    <div>
      <StatCards
        items={[
          {
            label: "Admins",
            value: String(adminCount),
            meta: "Full console access",
            accent: true,
          },
          {
            label: "Accounts",
            value: String(users.length),
            meta: "Everyone who has signed in",
          },
          {
            label: "Google sign-in",
            value: String(
              users.filter((row) => row.providers.includes("google")).length,
            ),
            meta: "Linked a Google account",
          },
          {
            label: "Password sign-in",
            value: String(
              users.filter((row) => row.providers.includes("credential")).length,
            ),
            meta: "Set a password",
          },
        ]}
      />

      <PanelHead
        title="Users & admins"
        subtitle="Anyone who signs in appears here. Admin access is granted, never claimed."
      >
        <div className="a-search">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search name or email…"
            aria-label="Search users"
          />
        </div>
      </PanelHead>

      <div className="a-table-wrap">
        <table className="a-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Signs in with</th>
              <th>Last seen</th>
              <th>Role</th>
              <th className="right">Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <EmptyRow colSpan={5}>No accounts match that search.</EmptyRow>
            ) : (
              filtered.map((row) => {
                const isSelf = row.id === currentUserId;
                // Mirrors the server: the last admin, and yourself, are locked.
                const lockedReason = isSelf
                  ? "You cannot remove your own access"
                  : row.isAdmin && adminCount <= 1
                    ? "The last admin cannot be removed"
                    : null;

                return (
                  <tr key={row.id}>
                    <td>
                      <div className="primary-cell">
                        {row.name || row.email.split("@")[0]}
                      </div>
                      <span className="muted">
                        {row.email}
                        {isSelf && " · you"}
                      </span>
                    </td>
                    <td>
                      {row.providers.length === 0
                        ? "—"
                        : row.providers
                            .map((id) => PROVIDER_LABEL[id] ?? id)
                            .join(", ")}
                    </td>
                    <td>
                      <span className="muted" style={{ marginTop: 0 }}>
                        {row.lastSeenAt
                          ? formatDubaiDateTime(new Date(row.lastSeenAt))
                          : "Never"}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`a-badge ${row.isAdmin ? "active" : "draft"}`}
                        style={{ marginLeft: 0 }}
                      >
                        {row.isAdmin ? "Admin" : "Customer"}
                      </span>
                    </td>
                    <td className="right">
                      <button
                        type="button"
                        className={`a-btn ${row.isAdmin ? "ghost" : "primary"}`}
                        disabled={pending || lockedReason !== null}
                        title={lockedReason ?? undefined}
                        onClick={() => toggleAdmin(row)}
                      >
                        {row.isAdmin ? "Remove admin" : "Make admin"}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <p className="muted" style={{ marginTop: "1rem", display: "block" }}>
        There is no way to grant yourself the admin role. The source app had a
        &ldquo;claim admin&rdquo; button on this screen that any signed-in
        visitor could press; it is deliberately not carried over.
      </p>
    </div>
  );
}
