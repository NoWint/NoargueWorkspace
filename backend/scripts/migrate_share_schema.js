/**
 * Run missing migrations for share_snapshots table.
 * MySQL 5.5 compatible — uses INFORMATION_SCHEMA to check column existence.
 */
const mysql = require('mysql2');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const conn = mysql.createConnection({
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'Yzj_201002930951',
  database: process.env.DB_NAME || 'timegreenpath',
  port: parseInt(process.env.DB_PORT) || 3306,
  multipleStatements: true,
});

const MIGRATIONS = [
  {
    name: '016 — add revoked',
    sql: `ALTER TABLE share_snapshots ADD COLUMN revoked TINYINT(1) NOT NULL DEFAULT 0 AFTER data;`,
  },
  {
    name: '022 — add share options',
    sql: `
      ALTER TABLE share_snapshots
        ADD COLUMN password VARCHAR(64) DEFAULT NULL AFTER revoked,
        ADD COLUMN max_views INT DEFAULT NULL AFTER password,
        ADD COLUMN current_views INT NOT NULL DEFAULT 0 AFTER max_views,
        ADD COLUMN remark VARCHAR(255) DEFAULT NULL AFTER current_views,
        ADD COLUMN allow_copy TINYINT(1) NOT NULL DEFAULT 1 AFTER remark,
        ADD COLUMN track_visitors TINYINT(1) NOT NULL DEFAULT 0 AFTER allow_copy;`,
  },
  {
    name: '025 — hash password (rename/ensure)',
    sql: `ALTER TABLE share_snapshots MODIFY password VARCHAR(64) DEFAULT NULL;`,
  },
  {
    name: '029 — add todo_id',
    sql: `ALTER TABLE share_snapshots ADD COLUMN todo_id INT DEFAULT NULL AFTER user_id;`,
  },
];

conn.connect(async (err) => {
  if (err) { console.error('Connect failed:', err.message); process.exit(1); }

  // Show current schema
  const [rows] = await conn.promise().query('DESCRIBE share_snapshots');
  const existingColumns = rows.map(r => r.Field);
  console.log('Existing columns:', existingColumns.join(', '));

  let applied = 0;
  for (const m of MIGRATIONS) {
    // Check which columns in this migration's ALTER already exist
    const cols = m.sql.match(/ADD COLUMN\s+`?(\w+)`?\s/g);
    if (cols) {
      const colNames = cols.map(c => c.replace(/ADD COLUMN\s+`?(\w+)`?.*/, '$1'));
      const allExist = colNames.every(c => existingColumns.includes(c));
      if (allExist) {
        console.log(`  ✓ ${m.name} — all columns exist, skipping`);
        continue;
      }
    }
    try {
      // For MySQL 5.5, use PROCEDURE-based column check
      const colName = m.sql.match(/ADD COLUMN\s+`?(\w+)`?\s/);
      const colDef = m.sql.match(/ADD COLUMN\s+`?\w+`?\s+(.*?)(?:,|$)/);

      // Split multi-column ALTER into individual statements
      const statements = m.sql
        .split(',')
        .map(s => s.trim())
        .filter(s => s.toUpperCase().startsWith('ALTER') || s.toUpperCase().startsWith('ADD COLUMN'));

      let alterParts = [];
      for (const stmt of statements) {
        if (stmt.toUpperCase().startsWith('ALTER')) {
          alterParts = [stmt];
          continue;
        }
        // Extract column name from "ADD COLUMN xxx ..."
        const match = stmt.match(/ADD COLUMN\s+`?(\w+)`?\s+(.*)/);
        if (match) {
          const colName = match[1];
          const colDef = match[2];
          const exists = existingColumns.includes(colName);
          if (!exists) {
            console.log(`  → Adding column: ${colName}`);
            const [r] = await conn.promise().query(`ALTER TABLE share_snapshots ADD COLUMN \`${colName}\` ${colDef}`);
            existingColumns.push(colName);
            applied++;
          } else {
            console.log(`  - ${colName} exists, skipping`);
          }
        }
      }
    } catch (e) {
      // Column-level ALTER TABLE might still fail on MySQL 5.5
      console.log(`  ! ${m.name}: ${e.message}`);
    }
  }

  console.log(`\nDone. Applied ${applied} new columns.`);

  const [rows2] = await conn.promise().query('DESCRIBE share_snapshots');
  console.log('Updated columns:', rows2.map(r => r.Field).join(', '));

  conn.end();
});
