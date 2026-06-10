const test = require('node:test');
const assert = require('node:assert/strict');
const { ValkeySessionStore, sessionTtlSeconds } = require('../src/session/valkeyStore');

function callStore(store, method, ...args) {
  return new Promise((resolve, reject) => {
    store[method](...args, (error, value) => error ? reject(error) : resolve(value));
  });
}

function createFakeClient() {
  const data = new Map();
  const calls = [];
  return {
    data,
    calls,
    async get(key) {
      calls.push(['get', key]);
      return data.get(key) || null;
    },
    async set(key, value, mode, ttl) {
      calls.push(['set', key, value, mode, ttl]);
      data.set(key, value);
      return 'OK';
    },
    async del(key) {
      calls.push(['del', key]);
      data.delete(key);
      return 1;
    },
    async expire(key, ttl) {
      calls.push(['expire', key, ttl]);
      return data.has(key) ? 1 : 0;
    }
  };
}

test('Valkey session store persists, reads, touches, and destroys sessions', async () => {
  const client = createFakeClient();
  const store = new ValkeySessionStore({ client, prefix: 'test:sess:' });
  const sessionData = { user: { id: 1 }, cookie: { maxAge: 60_000 } };

  await callStore(store, 'set', 'abc', sessionData);
  assert.deepEqual(await callStore(store, 'get', 'abc'), sessionData);
  await callStore(store, 'touch', 'abc', sessionData);
  await callStore(store, 'destroy', 'abc');
  assert.equal(await callStore(store, 'get', 'abc'), null);

  assert.deepEqual(client.calls[0].slice(0, 2), ['set', 'test:sess:abc']);
  assert.equal(client.calls[0][3], 'EX');
  assert.equal(client.calls[0][4], 60);
  assert.deepEqual(client.calls[2], ['expire', 'test:sess:abc', 60]);
  assert.deepEqual(client.calls[3], ['del', 'test:sess:abc']);
});

test('Valkey session store removes already expired sessions', async () => {
  const client = createFakeClient();
  const store = new ValkeySessionStore({ client, prefix: 'test:sess:' });

  await callStore(store, 'set', 'expired', { cookie: { expires: new Date(Date.now() - 1000) } });

  assert.deepEqual(client.calls, [['del', 'test:sess:expired']]);
});

test('session TTL defaults to seven days', () => {
  assert.equal(sessionTtlSeconds({ cookie: {} }), 60 * 60 * 24 * 7);
});
