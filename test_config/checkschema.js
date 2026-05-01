const fs = require("fs/promises");
const path = require("path");
const pool = require("../config/db");

async function generateSchemaFile() {
  const outputPath = path.join(__dirname, "actualScheme");

  try {
    const query = `
      SELECT
        table_schema,
        table_name,
        column_name,
        data_type,
        is_nullable,
        column_default,
        ordinal_position
      FROM information_schema.columns
      WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
      ORDER BY table_schema, table_name, ordinal_position;
    `;

    const { rows } = await pool.query(query);

    if (!rows.length) {
      await fs.writeFile(outputPath, "No tables found in database.\n", "utf8");
      console.log("Schema file written:", outputPath);
      return;
    }

    const grouped = {};

    for (const row of rows) {
      const tableKey = `${row.table_schema}.${row.table_name}`;

      if (!grouped[tableKey]) {
        grouped[tableKey] = [];
      }

      grouped[tableKey].push({
        column: row.column_name,
        type: row.data_type,
        nullable: row.is_nullable,
        default: row.column_default,
      });
    }

    const output = {
      generatedAt: new Date().toISOString(),
      totalTables: Object.keys(grouped).length,
      tables: grouped,
    };

    await fs.writeFile(outputPath, JSON.stringify(output, null, 2), "utf8");
    console.log("Schema file written:", outputPath);
  } catch (error) {
    console.error("Failed to generate schema:", error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

generateSchemaFile();
