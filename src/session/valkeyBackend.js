const Valkey = require('iovalkey');
const SessionBackend = require('./backend');
const { ValkeySessionStore } = require('./valkeyStore');
const { VALKEY } = require('../config/env');

class ValkeyBackend extends SessionBackend {
  createStore() {
    const client = new Valkey(VALKEY.url, {
      enableReadyCheck: true,
      maxRetriesPerRequest: 3
    });
    client.on('error', error => console.error('Valkey session client error', error));

    return new ValkeySessionStore({ client, prefix: VALKEY.prefix });
  }
}

module.exports = ValkeyBackend;
