const test = require('node:test');
const assert = require('node:assert/strict');

const { VALKEY } = require('../src/config/env');

test('Valkey defaults use the provided 2a primary and retain the 2c replica endpoint', () => {
  assert.equal(VALKEY.primaryEndpoint, 'cache-0001-001.cache.kjbeur.apn2.cache.amazonaws.com:6379');
  assert.equal(VALKEY.replicaEndpoint, 'cache-0001-002.cache.kjbeur.apn2.cache.amazonaws.com:6379');
  assert.equal(VALKEY.url, `rediss://${VALKEY.primaryEndpoint}`);
  assert.equal(VALKEY.tls, true);
});
