const express = require('express');
const path = require('path');
const session = require('express-session');
const MemoryBackend = require('./session/memoryBackend');
const DbBackend = require('./session/dbBackend');
const { PORT, SESSION_BACKEND, SESSION_SECRET } = require('./config/env');
const routes = require('./routes');

const app = express();
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use('/image', express.static(path.resolve('./public/image')));

const backend = SESSION_BACKEND === 'db' ? new DbBackend() : new MemoryBackend();
app.use(session({ secret: SESSION_SECRET, resave: false, saveUninitialized: false, store: backend.createStore() }));

app.use(routes);

app.listen(PORT, () => console.log(`Plum Commerce app on ${PORT}`));
