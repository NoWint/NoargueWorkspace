const mysql = require('mysql2');

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'timegreenpath',
  port: parseInt(process.env.DB_PORT) || 3306,
  connectionLimit: 10,
  waitForConnections: true,
  queueLimit: 0,
  charset: 'utf8mb4',
  timezone: '+08:00'
});

const query = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    pool.getConnection((err, connection) => {
      if (err) {
        reject(err);
        return;
      }
      connection.query(sql, params, (error, results) => {
        connection.release();
        if (error) {
          reject(error);
        } else {
          resolve(results);
        }
      });
    });
  });
};

const transaction = async (callback) => {
  return new Promise((resolve, reject) => {
    pool.getConnection((err, connection) => {
      if (err) {
        reject(err);
        return;
      }
      connection.beginTransaction(async (error) => {
        if (error) {
          connection.release();
          reject(error);
          return;
        }
        try {
          const result = await callback(connection);
          connection.commit((commitErr) => {
            if (commitErr) {
              connection.rollback();
              connection.release();
              reject(commitErr);
            } else {
              connection.release();
              resolve(result);
            }
          });
        } catch (callbackErr) {
          connection.rollback();
          connection.release();
          reject(callbackErr);
        }
      });
    });
  });
};

module.exports = { query, transaction, pool };
