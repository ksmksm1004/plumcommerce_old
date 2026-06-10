const fs = require('fs');
const path = require('path');
const { writerPool: pool } = require('./pool');

async function runStatementsFromFile(filePath) {
  const sql = fs.readFileSync(filePath, 'utf8');
  const statements = sql.split(';').map(statement => statement.trim()).filter(Boolean);

  for (const statement of statements) {
    await pool.query(statement);
  }
}

async function columnExists(tableName, columnName) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS count
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?`,
    [tableName, columnName]
  );

  return Number(rows[0].count) > 0;
}

async function addColumnIfMissing(tableName, columnName, definition) {
  if (await columnExists(tableName, columnName)) return;
  await pool.query(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
}

async function ensureSchema() {
  await runStatementsFromFile(path.join(__dirname, '../../sql/schema.sql'));
  await addColumnIfMissing('products', 'thumbnail', 'VARCHAR(255) NULL');
  await addColumnIfMissing('users', 'role', "VARCHAR(20) DEFAULT 'user'");
}

module.exports = ensureSchema;
