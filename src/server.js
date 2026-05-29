const express = require('express');
const path = require('path');
const session = require('express-session');
const MemoryBackend = require('./session/memoryBackend');
const DbBackend = require('./session/dbBackend');
const { PORT, SESSION_BACKEND, SESSION_SECRET } = require('./config/env');
const routes = require('./routes');
const ensureSchema = require('./db/ensureSchema');

const app = express();
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use('/image', express.static(path.resolve('./public/image')));
app.use('/styles', express.static(path.resolve('./public/styles')));
app.use('/assets', express.static(path.resolve('./public/assets')));

const backend = SESSION_BACKEND === 'db' ? new DbBackend() : new MemoryBackend();
app.use(session({
  secret: SESSION_SECRET,
  name: 'plum.sid',
  resave: false,
  saveUninitialized: false,
  rolling: true,
  store: backend.createStore(),
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 * 24 * 7
  }
}));

app.use((req, res, next) => {
  res.locals.currentUser = req.session.user || null;
  res.locals.currentAdmin = req.session.admin || null;
  next();
});

app.use(routes);

async function start() {
  await ensureSchema();
  app.listen(PORT, () => console.log(`Plum Commerce app on ${PORT}`));
}

start().catch(error => {
  console.error('Failed to start Plum Commerce app', error);
  process.exit(1);
});
