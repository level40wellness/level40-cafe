"use client";

import { useState } from "react";

import { formatDubaiDateTime } from "@/lib/format";
import type { CustomerData } from "@/server/queries/admin";
import { EmptyRow, PanelHead, StatCards } from "./ui";

export function CustomerManager({ customers }: { customers: CustomerData[] }) {
  const [query, setQuery] = useState("");
  const customerCount = customers.length;

  const filtered = customers.filter((row) => {
    const term = query.trim().toLowerCase();
    if (!term) return true;
    return (
      row.email.toLowerCase().includes(term) ||
      row.name?.toLowerCase().includes(term)
    );
  });

  return (
    <div>
      <StatCards
        items={[
          {
            label: "Customers",
            value: String(customerCount),
            meta: "Full console access",
            accent: true,
          },
        ]}
      />

      <PanelHead
        title="Customers"
        subtitle="Every customer and its details appears here."
      >
        <div className="a-search">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search name or email…"
            aria-label="Search customers"
          />
        </div>
      </PanelHead>

      <div className="a-table-wrap">
        <table className="a-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Username</th>
              <th>Email</th>
              <th>Last Active</th>
              <th>Registered on</th>
              <th>Country</th>
              <th>Postal code</th>
              <th>Orders</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <EmptyRow colSpan={5}>No accounts match that search.</EmptyRow>
            ) : (
              filtered.map((row) => {
                return (
                  <tr key={row.id}>
                    <td>
                      <div className="primary-cell">{row.name || "-"}</div>
                    </td>
                    <td>
                      <div>{row.username || "-"}</div>
                    </td>
                    <td>
                      <div>{row.email || "-"}</div>
                    </td>
                    <td>
                      <span className="muted" style={{ marginTop: 0 }}>
                        {row.lastActive
                          ? formatDubaiDateTime(new Date(row.lastActive))
                          : "Never"}
                      </span>
                    </td>
                    <td>
                      <span className="muted" style={{ marginTop: 0 }}>
                        {row.dateRegistered
                          ? formatDubaiDateTime(new Date(row.dateRegistered))
                          : "Never"}
                      </span>
                    </td>
                    <td className="right">
                      <div>{row.country || "-"}</div>
                    </td>
                    <td className="right">
                      <div>{row.postalCode || "-"}</div>
                    </td>
                    <td className="right">
                      <div>{row.orderCount || "0"}</div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
