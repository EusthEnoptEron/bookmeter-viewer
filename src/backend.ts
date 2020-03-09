import express from 'express';
import { StoreEntry } from './backend/StoreEntry';
import { BookmeterClient } from './backend/BookmeterClient';
import fs from 'fs';
import path from 'path';
import { DateTime } from 'luxon';
import Axios from 'axios';
import { nextTick } from 'async';
import { BackendAtlas } from './backend/BackendAtlas';
import { BookController } from './backend/controller/BookController';
import { Cache } from './backend/Cache';
import { AtlasController } from './backend/controller/AtlasController';
import { ProxyController } from './backend/controller/ProxyController';

const port = 8080;
const app = express()
const bookController = new BookController();
const atlasControler = new AtlasController();
const proxyController = new ProxyController();

Cache.SetPath(__dirname);
Cache.Load();

app.use(express.static(path.join(__dirname, '../dist')));
app.use('/books', bookController.router);
app.use('/atlas', atlasControler.router);
app.get('/proxy', proxyController.router);
app.get('*', function(req, res) {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
});

app.listen(port, () => console.log(`Example app listening on port ${port}!`));