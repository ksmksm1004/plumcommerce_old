const test = require('node:test');
const assert = require('node:assert');

test('health payload shape', () => {
  const payload = { status: 'ok' };
  assert.equal(payload.status, 'ok');
});
