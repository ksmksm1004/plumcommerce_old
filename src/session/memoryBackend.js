const session = require('express-session');
const SessionBackend = require('./backend');

class MemoryBackend extends SessionBackend {
  createStore() {
    return new session.MemoryStore();
  }
}
module.exports = MemoryBackend;
