const mysql = require('mysql');

const conn = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'timegreenpath',
});

conn.connect((err) => {
  if (err) { console.error('Connect failed:', err.message); process.exit(1); }
  conn.query('DESCRIBE share_snapshots', (err, rows) => {
    if (err) { console.error('DESCRIBE failed:', err.message); process.exit(1); }
    console.log('Columns in share_snapshots:');
    rows.forEach(r => console.log(`  ${r.Field} (${r.Type}) ${r.Null === 'YES' ? 'NULL' : 'NOT NULL'}${r.Default ? ' default: ' + r.Default : ''}`));
    conn.end();
  });
});
