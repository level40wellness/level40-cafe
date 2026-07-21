"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { useSession, signOut } from "@/lib/auth-client";
import { useCart } from "@/lib/cart";
import { BrandLogo } from "./brand-logo";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/menu", label: "Cafe Menu" },
  { href: "/shop", label: "NeatByNicky Retail" },
  { href: "/subscription", label: "Meal Plans" },
  { href: "/contact", label: "Contact" },
] as const;

function initialsFor(name: string | null | undefined, email: string) {
  return (name || email)
    .split(/\s+|@/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function SiteHeader() {
  const { count, setDrawerOpen } = useCart();
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const pathname = usePathname();

  const user = session?.user;

  useEffect(() => {
    if (!menuOpen) return;

    function onPointerDown(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  return (
    <header className="nav solid">
      <div className="wrap nav-in">
        <BrandLogo />

        <nav className="links">
          {NAV.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={isActive ? "active" : undefined}
                aria-current={isActive ? "page" : undefined}
                onClick={() => setMobileOpen(false)}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="nav-cart">
          {user ? (
            <div ref={menuRef} style={{ position: "relative", marginRight: ".9rem" }}>
              <button
                type="button"
                aria-label="Account menu"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((open) => !open)}
                title={user.email}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: "50%",
                  border: "1px solid var(--gold-soft)",
                  background: "transparent",
                  color: "var(--gold-soft)",
                  cursor: "pointer",
                  fontSize: ".72rem",
                  letterSpacing: ".08em",
                  fontWeight: 600,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 0,
                }}
              >
                {initialsFor(user.name, user.email) || "?"}
              </button>

              {menuOpen && (
                <div
                  role="menu"
                  style={{
                    position: "absolute",
                    insetInlineEnd: 0,
                    top: "calc(100% + 10px)",
                    minWidth: 220,
                    background: "#1f160e",
                    border: "1px solid rgba(212,168,67,.25)",
                    borderRadius: 10,
                    boxShadow: "0 12px 32px rgba(0,0,0,.35)",
                    padding: ".6rem 0",
                    zIndex: 60,
                  }}
                >
                  <div
                    style={{
                      padding: ".2rem 1rem .7rem",
                      borderBottom: "1px solid rgba(212,168,67,.15)",
                    }}
                  >
                    <div
                      style={{
                        color: "var(--cream)",
                        fontSize: ".85rem",
                        fontWeight: 600,
                      }}
                    >
                      {user.name || "Account"}
                    </div>
                    <div
                      style={{
                        color: "var(--gold-soft)",
                        fontSize: ".72rem",
                        marginTop: 2,
                        wordBreak: "break-all",
                      }}
                    >
                      {user.email}
                    </div>
                  </div>
                  {/*
                    Drawn only for admins, and only ever a shortcut: /admin
                    checks the role again on the server before it renders, so
                    revealing this to a customer would cost them a click, not
                    access.
                  */}
                  {user.isAdmin && (
                    <Link
                      href="/admin"
                      onClick={() => setMenuOpen(false)}
                      style={{
                        display: "block",
                        color: "var(--gold)",
                        padding: ".7rem 1rem",
                        fontSize: ".78rem",
                        letterSpacing: ".14em",
                        textTransform: "uppercase",
                        textDecoration: "none",
                        fontWeight: 600,
                      }}
                    >
                      Management Panel
                    </Link>
                  )}
                  <Link
                    href="/account/orders"
                    onClick={() => setMenuOpen(false)}
                    style={{
                      display: "block",
                      color: "var(--cream)",
                      padding: ".7rem 1rem",
                      fontSize: ".78rem",
                      letterSpacing: ".14em",
                      textTransform: "uppercase",
                      textDecoration: "none",
                    }}
                  >
                    Your orders
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      void signOut();
                    }}
                    style={{
                      width: "100%",
                      textAlign: "start",
                      background: "transparent",
                      border: "none",
                      color: "var(--cream)",
                      padding: ".7rem 1rem",
                      cursor: "pointer",
                      fontSize: ".78rem",
                      letterSpacing: ".14em",
                      textTransform: "uppercase",
                    }}
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/auth"
              className="hide-sm"
              style={{
                fontSize: ".7rem",
                letterSpacing: ".22em",
                textTransform: "uppercase",
                color: "var(--gold-soft)",
                marginInlineEnd: ".9rem",
                textDecoration: "none",
              }}
            >
              Sign in
            </Link>
          )}

          <button
            type="button"
            className="cart-btn"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open cart"
            style={{ background: "transparent", cursor: "pointer" }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M6 7h12l-1.2 12.2a2 2 0 0 1-2 1.8H9.2a2 2 0 0 1-2-1.8L6 7Z" />
              <path d="M9 7a3 3 0 0 1 6 0" />
            </svg>
            <span>Cart{count > 0 ? ` (${count})` : ""}</span>
            {count > 0 ? (
              <em className="cart-badge" aria-hidden="true">
                {count}
              </em>
            ) : null}
          </button>

          <button
            type="button"
            className="menu-toggle"
            aria-label="Menu"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((open) => !open)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div style={{ padding: "1rem 32px 1.4rem", background: "rgba(44,30,20,.96)" }}>
          <div
            className="wrap"
            style={{ display: "flex", flexDirection: "column", gap: ".2rem" }}
          >
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                style={{
                  color: "var(--cream)",
                  fontSize: ".78rem",
                  letterSpacing: ".18em",
                  textTransform: "uppercase",
                  padding: ".7rem 0",
                  borderBottom: "1px solid rgba(212,168,67,.15)",
                }}
              >
                {item.label}
              </Link>
            ))}
            {!user && (
              <Link
                href="/auth"
                onClick={() => setMobileOpen(false)}
                style={{
                  color: "var(--gold-soft)",
                  fontSize: ".72rem",
                  letterSpacing: ".22em",
                  textTransform: "uppercase",
                  padding: ".9rem 0 .2rem",
                }}
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
