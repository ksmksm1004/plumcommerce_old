const session = require('express-session');

const DEFAULT_TTL_SECONDS = 60 * 60 * 24 * 7;

function sessionTtlSeconds(sessionData) {
  const cookie = sessionData?.cookie || {};

  if (cookie.expires) {
    const remainingMs = new Date(cookie.expires).getTime() - Date.now();
    return Math.max(0, Math.ceil(remainingMs / 1000));
  }

  if (Number.isFinite(cookie.maxAge)) {
    return Math.max(0, Math.ceil(cookie.maxAge / 1000));
  }

  return DEFAULT_TTL_SECONDS;
}

class ValkeySessionStore extends session.Store {
  constructor({ client, prefix }) {
    super();
    this.client = client;
    this.prefix = prefix;
  }

  key(sessionId) {
    return `${this.prefix}${sessionId}`;
  }

  get(sessionId, callback) {
    this.client.get(this.key(sessionId))
      .then(value => callback(null, value ? JSON.parse(value) : null))
      .catch(callback);
  }

  set(sessionId, sessionData, callback = () => {}) {
    const ttl = sessionTtlSeconds(sessionData);
    if (ttl <= 0) {
      this.destroy(sessionId, callback);
      return;
    }

    this.client.set(this.key(sessionId), JSON.stringify(sessionData), 'EX', ttl)
      .then(() => callback(null))
      .catch(callback);
  }

  destroy(sessionId, callback = () => {}) {
    this.client.del(this.key(sessionId))
      .then(() => callback(null))
      .catch(callback);
  }

  touch(sessionId, sessionData, callback = () => {}) {
    const ttl = sessionTtlSeconds(sessionData);
    if (ttl <= 0) {
      this.destroy(sessionId, callback);
      return;
    }

    this.client.expire(this.key(sessionId), ttl)
      .then(() => callback(null))
      .catch(callback);
  }
}

module.exports = { ValkeySessionStore, sessionTtlSeconds };
