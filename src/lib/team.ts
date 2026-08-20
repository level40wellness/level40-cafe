/**
 * The designations offered in the admin "Add team member" dropdown, in the
 * order they should sort on the public page. Shared by the form and the
 * server action so the validated set and the offered set cannot drift.
 */
export const TEAM_DESIGNATIONS = [
  "Founder",
  "Our Chef",
  "Nutritionist",
  "Yoga Teacher",
  "Our Barista",
] as const;

export type TeamDesignation = (typeof TEAM_DESIGNATIONS)[number];
