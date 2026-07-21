/**
 * Narrows a caller-supplied `?next=` value to a path on this site.
 *
 * The value reaches us through a query string, so it is attacker-controlled: a
 * link to /auth?next=https://evil.example would otherwise turn our own login
 * page into a credible redirect to someone else's. Only a plain absolute path
 * is accepted.
 *
 * "//evil.example" is protocol-relative and resolves off-site, and browsers
 * normalise the backslash forms to the same thing, so both are rejected
 * alongside anything carrying a scheme.
 */
export function safeInternalPath(
  value: string | null | undefined,
  fallback = "/",
): string {
  if (!value || !value.startsWith("/")) return fallback;
  if (/^\/[/\\]/.test(value)) return fallback;

  return value;
}
