/**
 * Safely add missing columns to share_snapshots table using INFORMATION_SCHEMA.
 * Run via: node scripts/migrate_share_columns.js
 * Requires: dotenv and mysql in node_modules
 */
const mysql = require('mysql');

// Use same connection pattern as init-db.js
const conn = mysql.createConnection({
  host: '127.0.0.1',
  user: 'root',
  password: 'Yzj_201002930951',
  database: 'timegreenpath',
  multipleStatements: true,
});

// All possible extra columns beyond the base table (id, share_id, user_id, data, expires_at, created_at)
const EXTRA_COLUMNS = [
  { name: 'revoked', def: 'TINYINT(1) NOT NULL DEFAULT 0', after: 'data' },
  { name: 'password', def: 'VARCHAR(64) DEFAULT NULL', after: 'revoked' },
  { name: 'max_views', def: 'INT DEFAULT NULL', after: 'password' },
  { name: 'current_views', def: 'INT NOT NULL DEFAULT 0', after: 'max_views' },
  { name: 'remark', def: 'VARCHAR(255) DEFAULT NULL', after: 'current_views' },
  { name: 'allow_copy', def: 'TINYINT(1) NOT NULL DEFAULT 1', after: 'remark' },
  { name: 'track_visitors', def: 'TINYINT(1) NOT NULL DEFAULT 0', after: 'allow_copy' },
  { name: 'todo_id', def: 'INT DEFAULT NULL', after: 'user_id' },
];

conn.connect(async (err) => {
  if (err) {
    console.error('Connect failed:', err.message);

    // Try again with empty password (the server uses empty password)
    const conn2 = mysql.createConnection({
      host: '127.0.0.1',
      user: 'root',
      password: '',
      database: 'timegreenpath',
      multipleStatements: true,
    });
    conn2.connect((err2) => {
      if (err2) {
        console.error('Also failed with empty password:', err2.message);
        process.exit(1);
      }
      runMigration(conn2);
    });
    return;
  }
  runMigration(conn);
});

async function runMigration(conn) {
  try {
    // Get existing columns
    const columns = await new Promise((resolve, reject) => {
      conn.query('DESCRIBE share_snapshots', (err, rows) => {
        if (err) return reject(err);
        resolve(rows.map(r => r.Field));
      });
    });

    console.log('Existing columns:', columns.join(', '));

    let added = 0;
    for (const col of EXTRA_COLUMNS) {
      if (!columns.includes(col.name)) {
        await new Promise((resolve, reject) => {
          const sql = `ALTER TABLE share_snapshots ADD COLUMN \`${col.name}\` ${col.def} AFTER \`${col.after}\``;
          conn.query(sql, (err) => {
            if (err) return reject(err);
            console.log(`  + Added column: ${col.name}`);
            added++;
            resolve();
          });
        });
      } else {
        console.log(`  - ${col.name} already exists`);
      }
    }

    if (added === 0) {
      console.log('\nAll columns already exist — no migration needed.');
    } else {
      console.log(`\nAdded ${added} new column(s).`);
      // Show updated schema
      const updated = await new Promise((resolve, reject) => {
        conn.query('DESCRIBE share_snapshots', (err, rows) => {
          if (err) return reject(err);
          resolve(rows.map(r => r.Field));
        });
      });
      console.log('Updated columns:', updated.join(', '));
    }

    conn.end();
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err.message);
    conn.end();
    process.exit(1);
  }
}
