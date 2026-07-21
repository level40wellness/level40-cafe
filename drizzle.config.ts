import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// drizzle-kit runs outside Next, so it does not pick up Next's env files on its
// own. Load in Next's precedence order — dotenv keeps the first value it sees,
// so .env.local wins over .env.
config({ path: ".env.local" });
config({ path: ".env" });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set in .env.local or .env");
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema",
  out: "./src/db/migrations",
  dbCredentials: { url: databaseUrl },
  casing: "snake_case",
  strict: true,
  verbose: true,
});
