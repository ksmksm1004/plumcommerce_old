const test = require('node:test');
const assert = require('node:assert/strict');

process.env.IMAGE_BASE_URL = 'https://plum.ps5.kr';

const { S3 } = require('../src/config/env');
const { imageUrl } = require('../src/services/imageStorage');

test('legacy product filenames resolve under the S3 origin prefix', () => {
  assert.equal(
    imageUrl('product_01.jpg'),
    `${S3.publicBaseUrl}/${S3.originPrefix}/product_01.jpg`
  );
});

test('legacy thumbnail filenames resolve under the S3 thumbnail prefix', () => {
  assert.equal(
    imageUrl('thumb_product_01.jpg'),
    `${S3.publicBaseUrl}/${S3.thumbnailPrefix}/thumb_product_01.jpg`
  );
});

test('stored S3 keys retain their origin or thumbnail path', () => {
  assert.equal(
    imageUrl('image/origin/product photo.jpg'),
    `${S3.publicBaseUrl}/image/origin/product%20photo.jpg`
  );
  assert.equal(
    imageUrl('image/thumbnail/product photo.jpg'),
    `${S3.publicBaseUrl}/image/thumbnail/product%20photo.jpg`
  );
});

test('absolute image URLs remain unchanged', () => {
  const url = 'https://cdn.example.com/image/thumbnail/product.jpg';
  assert.equal(imageUrl(url), url);
});
