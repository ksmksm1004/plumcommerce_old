const crypto = require('crypto');
const path = require('path');
const { S3Client, PutObjectCommand, DeleteObjectsCommand } = require('@aws-sdk/client-s3');
const { S3 } = require('../config/env');

const client = new S3Client({ region: S3.region });

function safeFilename(originalname) {
  const ext = path.extname(originalname).toLowerCase().replace(/[^a-z0-9.]/g, '') || '.jpg';
  const base = path.basename(originalname, path.extname(originalname))
    .replace(/[^a-z0-9_-]+/gi, '_')
    .replace(/^_+|_+$/g, '') || 'product';
  return `${Date.now()}-${crypto.randomUUID()}-${base}${ext}`;
}

function keysForFilename(filename) {
  return {
    image: `${S3.originPrefix}/${filename}`,
    thumbnail: `${S3.thumbnailPrefix}/${filename}`
  };
}

async function uploadOriginal(file) {
  const filename = safeFilename(file.originalname);
  const keys = keysForFilename(filename);

  await client.send(new PutObjectCommand({
    Bucket: S3.bucket,
    Key: keys.image,
    Body: file.buffer,
    ContentType: file.mimetype,
    ServerSideEncryption: 'AES256'
  }));

  return keys;
}

async function deleteImages(keys) {
  const uniqueKeys = [...new Set(keys.filter(key => key && key.startsWith('image/')))].map(Key => ({ Key }));
  if (!uniqueKeys.length) return;

  await client.send(new DeleteObjectsCommand({
    Bucket: S3.bucket,
    Delete: { Objects: uniqueKeys, Quiet: true }
  }));
}

function thumbnailKeyForImage(key) {
  if (!key || !key.startsWith(`${S3.originPrefix}/`)) return key;
  return `${S3.thumbnailPrefix}/${key.slice(S3.originPrefix.length + 1)}`;
}

function storageKeyForImage(key) {
  if (key.startsWith('image/')) return key.replace(/^\/+/, '');

  const filename = path.basename(key);
  const prefix = filename.startsWith('thumb_') ? S3.thumbnailPrefix : S3.originPrefix;
  return `${prefix}/${filename}`;
}

function imageUrl(key) {
  if (!key) return '';
  if (/^https?:\/\//i.test(key)) return key;

  const storageKey = storageKeyForImage(key);
  return `${S3.publicBaseUrl}/${storageKey.split('/').map(encodeURIComponent).join('/')}`;
}

module.exports = { uploadOriginal, deleteImages, imageUrl, thumbnailKeyForImage };
