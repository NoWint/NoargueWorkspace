const mysql = require('mysql');
require('dotenv').config();

const conn = mysql.createConnection({
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'timegreenpath',
  port: parseInt(process.env.DB_PORT) || 3306,
});

conn.connect((err) => {
  if (err) { console.error('Connect failed:', err.message); process.exit(1); }
  conn.query('DESCRIBE share_snapshots', (err, rows) => {
    if (err) { console.error('DESCRIBE failed:', err.message); process.exit(1); }
    console.log('Columns in share_snapshots:');
    rows.forEach(r => console.log(`  ${r.Field} (${r.Type}) ${r.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${r.Default ? 'default: '+r.Default : ''}`));
    conn.end();
  });
});
