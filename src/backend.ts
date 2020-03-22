import dotenv from 'dotenv';
dotenv.config();

import express, { NextFunction, Request, Response } from 'express';
import compression  from 'compression';
import path from 'path';
import { Cache } from './backend/Cache';
import { AtlasController } from './backend/controller/AtlasController';
import { BookController } from './backend/controller/BookController';
import { ProxyController } from './backend/controller/ProxyController';
import { WebException } from './backend/WebException';


const o = process.argv.indexOf('-o');
const publicPath = o == -1
    ? 'dist'
    : process.argv[o + 1];

const port = process.env.PORT ?? 8080;
const app = express()
const bookController = new BookController();
const atlasControler = new AtlasController();
const proxyController = new ProxyController();

Cache.SetPath(__dirname);
Cache.Load();

app.use(compression());
app.use(express.static(path.join(__dirname, '../' + publicPath)));
app.use('/books', bookController.router);
app.use('/atlas', atlasControler.router);
app.get('/proxy', proxyController.router);
app.get('*', function(req, res) {
    res.sendFile(path.join(__dirname, `../${publicPath}/index.html`));
});

// Error handler
app.use(function(err: any | WebException, req: Request, res: Response, next: NextFunction) {
    if(err instanceof WebException) {
        const e = err as WebException;
        res.status(e.code);
        res.send(e.message);
        return;
    }

    next(err);
});

app.listen(port, () => console.log(`Backend listening on port ${port}!`));