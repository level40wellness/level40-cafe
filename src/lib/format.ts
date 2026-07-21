/** Every price is stored as fils (AED minor units) and formatted only for display. */
export function formatFils(fils: number) {
  return `AED ${(fils / 100).toFixed(2)}`;
}

/**
 * Timestamps are rendered in the café's timezone, not the reader's.
 *
 * These strings are produced on the server and shipped as markup, so a viewer's
 * locale would otherwise disagree with what the server rendered and trip
 * hydration. Pinning it also means a manager checking the queue from abroad
 * reads the same clock as the kitchen.
 */
const DUBAI_DATE_TIME = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "Asia/Dubai",
});

export function formatDubaiDateTime(value: Date) {
  return DUBAI_DATE_TIME.format(value);
}
