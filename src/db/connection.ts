import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import dotenv from "dotenv";

dotenv.config();

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://postgres:password@localhost:5432/speedball_hub";

const pool = new Pool({
  connectionString,
});

export const db = drizzle({ client: pool, schema });

export type Database = typeof db;
