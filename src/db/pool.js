const mysql = require('mysql2/promise');
const { DB } = require('../config/env');
const fs = require('fs');
const path = require('path');

function createPool(config) {
  return mysql.createPool({
    ...config,
    connectionLimit: 10,
    waitForConnections: true,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,

    ssl: {
      rejectUnauthorized: true,
      ca: [fs.readFileSync(path.join(__dirname, '../certs/global-bundle.pem'))]
    }
  });
}

const writerPool = createPool(DB.writer);
const readerPool = createPool(DB.reader);
const readStatement = /^\s*(SELECT|SHOW|DESCRIBE|DESC|EXPLAIN)\b/i;

const pool = {
  query(sql, values) {
    return (readStatement.test(sql) ? readerPool : writerPool).query(sql, values);
  },
  execute(sql, values) {
    return (readStatement.test(sql) ? readerPool : writerPool).execute(sql, values);
  },
  getConnection() {
    return writerPool.getConnection();
  }
};

module.exports = pool;
module.exports.writerPool = writerPool;
module.exports.readerPool = readerPool;
