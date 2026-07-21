import "server-only";
import { z } from "zod";

/**
 * Validated at module load so a missing or malformed variable fails the build
 * rather than surfacing as a runtime error on a customer's first request.
 *
 * Each migration phase adds only the variables it actually uses — auth secrets
 * in Phase 1, payment provider in Phase 3, blob token in Phase 4.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.url(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
    .join("\n");
  throw new Error(`Invalid environment variables:\n${issues}`);
}

export const env = parsed.data;
