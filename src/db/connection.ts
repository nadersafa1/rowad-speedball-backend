import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://postgres:password@localhost:5432/speedball_hub";

// Disable prefetch as it's not supported for "Transaction" pool mode
const client = postgres(connectionString, {
  max: 1,
  prepare: false,
});

export const db = drizzle(client, { schema });
