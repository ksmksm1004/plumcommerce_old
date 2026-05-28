const MySQLStoreFactory = require('express-mysql-session');
const SessionBackend = require('./backend');
const { DB, SESSION_DB_TABLE } = require('../config/env');

class DbBackend extends SessionBackend {
  createStore() {
    const MySQLStore = MySQLStoreFactory(require('express-session'));
    return new MySQLStore({ ...DB, createDatabaseTable: true, schema: { tableName: SESSION_DB_TABLE } });
  }
}
module.exports = DbBackend;
