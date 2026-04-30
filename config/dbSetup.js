const fs = require("fs/promises");
const path = require("path");
const pool = require("../config/db");

async function clearDatabase() {
  try {
    const { rows } = await pool.query(
      "SELECT tablename FROM pg_tables WHERE schemaname = 'public'"
    );

    if (rows.length === 0) {
      console.log("Database cleared");
      return;
    }

    const tableNames = rows
      .map((row) => `"${row.tablename.replace(/"/g, '""')}"`)
      .join(", ");

    await pool.query(`TRUNCATE TABLE ${tableNames} RESTART IDENTITY CASCADE`);
    console.log("Database cleared");
  } catch (error) {
    console.error("Error clearing database:", error.message);
    throw error;
  }
}

async function dropAllTables() {
  try {
    const { rows } = await pool.query(
      "SELECT tablename FROM pg_tables WHERE schemaname = 'public'"
    );

    if (rows.length === 0) {
      console.log("Tables dropped");
      return;
    }

    const tableNames = rows
      .map((row) => `"${row.tablename.replace(/"/g, '""')}"`)
      .join(", ");

    await pool.query(`DROP TABLE IF EXISTS ${tableNames} CASCADE`);
    console.log("Tables dropped");
  } catch (error) {
    console.error("Error dropping tables:", error.message);
    throw error;
  }
}

async function applySchema() {
  try {
    const schemaPath = path.join(__dirname, "../config/schema.sql");
    const schemaSql = await fs.readFile(schemaPath, "utf-8");

    await pool.query(schemaSql);
    console.log("Schema applied");
  } catch (error) {
    console.error("Error applying schema:", error.message);
    throw error;
  }
}

async function resetDatabase() {
  try {
    await dropAllTables();
    await applySchema();
  } catch (error) {
    console.error("Error resetting database:", error.message);
    throw error;
  }
}

async function seedDatabase() {
  try {
    await pool.query(
      `INSERT INTO users (business_name, email, password_hash, public_key, encrypted_private_key)
       VALUES
       ($1, $2, $3, $4, $5),
       ($6, $7, $8, $9, $10)
       ON CONFLICT (email) DO NOTHING`,
      [
        "Acme Pvt Ltd",
        "owner@acme.com",
        "dummy_hash_1",
        "public_key_1",
        "encrypted_private_key_1",
        "Beta Traders",
        "admin@beta.com",
        "dummy_hash_2",
        "public_key_2",
        "encrypted_private_key_2",
      ]
    );
  } catch (error) {
    console.error("Error seeding database:", error.message);
    throw error;
  }
}

module.exports = {
  clearDatabase,
  dropAllTables,
  applySchema,
  resetDatabase,
  seedDatabase,
};
