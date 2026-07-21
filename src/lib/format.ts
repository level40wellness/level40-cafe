/** Every price is stored as fils (AED minor units) and formatted only for display. */
export function formatFils(fils: number) {
  return `AED ${(fils / 100).toFixed(2)}`;
}
