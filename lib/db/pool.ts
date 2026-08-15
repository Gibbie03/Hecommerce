import { Pool } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var __icommercePool: Pool | undefined;
}

function createPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }
  return new Pool({ connectionString });
}

// Reuse the pool across hot reloads in dev.
export const pool = global.__icommercePool ?? createPool();
if (process.env.NODE_ENV !== "production") {
  global.__icommercePool = pool;
}
