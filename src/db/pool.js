const mysql = require('mysql2/promise');
const { DB } = require('../config/env');

const pool = mysql.createPool({
  host: DB.host,
  user: DB.user,
  password: DB.password,
  database: DB.database,
  port: DB.port,
  connectionLimit: 10
});

module.exports = pool;
