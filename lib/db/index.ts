import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

export type Db = NodePgDatabase<typeof schema>;

export function hasDb(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

// One pool per process — Next dev hot-reloads modules, so park it on globalThis.
const g = globalThis as unknown as { __kcPool?: Pool; __kcDb?: Db };

export function db(): Db {
  if (!g.__kcDb) {
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
    g.__kcPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      // Railway's internal network is plaintext; public proxy URLs want TLS.
      ssl: /railway\.internal|localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL)
        ? undefined
        : { rejectUnauthorized: false },
    });
    g.__kcDb = drizzle(g.__kcPool, { schema });
  }
  return g.__kcDb;
}

export { schema };
