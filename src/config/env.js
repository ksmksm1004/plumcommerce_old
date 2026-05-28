const path = require('path');
const fs = require('fs');
require('dotenv').config();

const IMAGE_DIR = path.resolve(process.env.IMAGE_DIR || './public/image');
if (!fs.existsSync(IMAGE_DIR)) fs.mkdirSync(IMAGE_DIR, { recursive: true });

module.exports = {
  PORT: Number(process.env.PORT || 3000),
  NODE_ENV: process.env.NODE_ENV || 'development',
  DB: {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  },
  IMAGE_DIR,
  SESSION_BACKEND: process.env.SESSION_BACKEND || 'memory',
  SESSION_SECRET: process.env.SESSION_SECRET || 'dev-secret',
  SESSION_DB_TABLE: process.env.SESSION_DB_TABLE || 'sessions',
  PAYMENT: {
    BASE_URL: process.env.PAYMENT_BASE_URL,
    TIMEOUT: Number(process.env.PAYMENT_TIMEOUT_MS || 1500),
    ALLOWLISTED_EGRESS_IP: process.env.ALLOWLISTED_EGRESS_IP
  }
};
