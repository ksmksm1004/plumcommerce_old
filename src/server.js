const express = require('express');
const path = require('path');
const session = require('express-session');
const MemoryBackend = require('./session/memoryBackend');
const DbBackend = require('./session/dbBackend');
const ValkeyBackend = require('./session/valkeyBackend');
const { imageUrl } = require('./services/imageStorage');
const { PORT, SESSION_BACKEND, SESSION_SECRET, AUTO_MIGRATE_SCHEMA } = require('./config/env');
const routes = require('./routes');
const ensureSchema = require('./db/ensureSchema');

const app = express();

app.enable('trust proxy');

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
// maxAge와 setHeaders 옵션을 추가하여 백엔드가 이미지를 넘길 때 캐시 보증서를 강제로 붙이게 합니다.
app.use('/image', express.static(path.resolve('./public/image'), {
  maxAge: '1d', // 🌟 일주일 또는 하루(1d) 동안 브라우저/CDN 캐싱 허용
  setHeaders: (res, path, stat) => {
    res.set('Cache-Control', 'public, max-age=86400'); // CloudFront가 흡수할 수 있도록 public 마크 강제 주입
  }
}));
app.use('/styles', express.static(path.resolve('./public/styles')));
app.use('/assets', express.static(path.resolve('./public/assets')));

const backends = { memory: MemoryBackend, db: DbBackend, valkey: ValkeyBackend };
const Backend = backends[SESSION_BACKEND];
if (!Backend) throw new Error(`Unsupported SESSION_BACKEND: ${SESSION_BACKEND}`);
const backend = new Backend();
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
  res.locals.imageUrl = imageUrl;
  res.locals.currentUser = req.session.user || null;
  res.locals.currentAdmin = req.session.user?.role === 'admin' ? req.session.user : null;
  next();
});

app.use(routes);

async function start() {
  if (AUTO_MIGRATE_SCHEMA) await ensureSchema();
  app.listen(PORT, () => console.log(`Plum Commerce app on ${PORT}`));
}

start().catch(error => {
  console.error('Failed to start Plum Commerce app', error);
  process.exit(1);
});
