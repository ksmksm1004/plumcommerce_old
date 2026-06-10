const path = require('path');
const fs = require('fs');
require('dotenv').config();

const IMAGE_DIR = path.resolve(process.env.IMAGE_DIR || './public/image');
if (!fs.existsSync(IMAGE_DIR)) fs.mkdirSync(IMAGE_DIR, { recursive: true });

const DB_WRITER_HOST = process.env.DB_WRITER_HOST || process.env.DB_HOST || 'database-1.cluster-cp6kgueq0eik.ap-northeast-2.rds.amazonaws.com';
const DB_READER_HOST = process.env.DB_READER_HOST || process.env.DB_HOST || 'database-1.cluster-ro-cp6kgueq0eik.ap-northeast-2.rds.amazonaws.com';
const DB_SSL = String(process.env.DB_SSL || 'true').toLowerCase() === 'true';
const commonDbConfig = {
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: DB_SSL ? { rejectUnauthorized: true } : undefined
};

const S3_BUCKET = process.env.S3_BUCKET || 'sm-plum-615299743460-ap-northeast-2-an';
const AWS_REGION = process.env.AWS_REGION || 'ap-northeast-2';

const VALKEY_PRIMARY_ENDPOINT = process.env.VALKEY_PRIMARY_ENDPOINT || 'cache-0001-001.cache.kjbeur.apn2.cache.amazonaws.com:6379';
const VALKEY_REPLICA_ENDPOINT = process.env.VALKEY_REPLICA_ENDPOINT || 'cache-0001-002.cache.kjbeur.apn2.cache.amazonaws.com:6379';
const VALKEY_TLS = String(process.env.VALKEY_TLS || 'true').toLowerCase() === 'true';
const VALKEY_URL = process.env.VALKEY_URL || `${VALKEY_TLS ? 'rediss' : 'redis'}://${VALKEY_PRIMARY_ENDPOINT}`;

module.exports = {
  PORT: Number(process.env.PORT || 3000),
  NODE_ENV: process.env.NODE_ENV || 'development',
  AUTO_MIGRATE_SCHEMA: String(process.env.AUTO_MIGRATE_SCHEMA || 'false').toLowerCase() === 'true',
  DB: {
    writer: { ...commonDbConfig, host: DB_WRITER_HOST },
    reader: { ...commonDbConfig, host: DB_READER_HOST }
  },
  IMAGE_DIR,
  S3: {
    bucket: S3_BUCKET,
    bucketArn: process.env.S3_BUCKET_ARN || `arn:aws:s3:::${S3_BUCKET}`,
    region: AWS_REGION,
    originPrefix: (process.env.S3_ORIGIN_PREFIX || 'image/origin').replace(/^\/+|\/+$/g, ''),
    thumbnailPrefix: (process.env.S3_THUMBNAIL_PREFIX || 'image/thumbnail').replace(/^\/+|\/+$/g, ''),
    publicBaseUrl: (process.env.IMAGE_BASE_URL || `https://${S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com`).replace(/\/$/, '')
  },
  MAX_IMAGE_SIZE_BYTES: Number(process.env.MAX_IMAGE_SIZE_BYTES || 10 * 1024 * 1024),
  SESSION_BACKEND: process.env.SESSION_BACKEND || 'memory',
  SESSION_SECRET: process.env.SESSION_SECRET || 'dev-secret',
  SESSION_DB_TABLE: process.env.SESSION_DB_TABLE || 'sessions',
  VALKEY: {
    url: VALKEY_URL,
    primaryEndpoint: VALKEY_PRIMARY_ENDPOINT,
    replicaEndpoint: VALKEY_REPLICA_ENDPOINT,
    tls: VALKEY_TLS,
    prefix: process.env.VALKEY_PREFIX || 'plum:sess:'
  },
  PAYMENT: {
    BASE_URL: process.env.PAYMENT_BASE_URL,
    TIMEOUT: Number(process.env.PAYMENT_TIMEOUT_MS || 1500),
    ALLOWLISTED_EGRESS_IP: process.env.ALLOWLISTED_EGRESS_IP
  }
};
