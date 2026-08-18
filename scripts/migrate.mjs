import { migrate } from "drizzle-orm/node-postgres/migrator";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

const { Pool } = pg;
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("DATABASE_URL is not defined.");
  process.exit(1);
}

const pool = new Pool({ connectionString: databaseUrl });
const db = drizzle(pool);

const waitForDatabase = async () => {
  console.log("Waiting for database...");

  for (let attempt = 1; attempt <= 30; attempt += 1) {
    try {
      await pool.query("select 1");
      console.log("Database ready.");
      return;
    } catch (error) {
      if (attempt === 30) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1_000));
    }
  }
};

const main = async () => {
  try {
    await waitForDatabase();
    console.log("Running database migrations...");
    await migrate(db, { migrationsFolder: "./drizzle" });
    console.log("Database migrations completed.");
  } catch (error) {
    console.error("Database migration failed.", error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
};

void main();
