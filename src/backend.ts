import express from 'express';
import { StoreEntry } from './backend/StoreEntry';
import { BookmeterClient } from './backend/BookmeterClient';
import fs from 'fs';
import path from 'path';
import { DateTime } from 'luxon';
import Axios from 'axios';
import { nextTick } from 'async';

const port = 8080;
const app = express()
const storePath = __dirname + '/store.json';

const store: { [key: number]: StoreEntry } = {}
const userMapping: { [key: string]: number } = {}

async function saveStore() {
    const cache = JSON.stringify(store);
    console.log("Saving store...");
    await fs.promises.writeFile(storePath, cache);
}

async function loadStore() {
    if(fs.existsSync(storePath)) {
        console.log("Loading cache...");
        const cache = await fs.promises.readFile(storePath, 'utf-8');
        const deserialized = JSON.parse(cache);

        for(let key of Object.keys(deserialized)) {
            deserialized[key].createdAt = DateTime.fromISO(deserialized[key].createdAt);
            store[parseInt(key)] = deserialized[key];
        }
    }
}

app.use(express.static(path.join(__dirname, '../dist')));

app.get('/proxy', async function(req, res, next) {
    const url = req.query.url;
    if(url) {
        try {
            const headers = req.headers;
            delete headers.host;
            const response = await Axios.get(url, {
                validateStatus: _ => true,
                responseType: 'arraybuffer',
                headers: headers
            });

            for(let header of Object.keys(response.headers)) {
                res.header(header, response.headers[header]);
            }

            res.send(Buffer.from(response.data, 'binary'));
        } catch(e) {
            next(e);
        }
    } else 
    {
        res.status(400).send("No URL given.");
    }
});

// respond with "hello world" when a GET request is made to the homepage
app.get('/books/:userId(\\d+)', async function (req, res, next) {
    const userId = parseInt(req.params.userId);
    let entry = store[userId];

    if(entry?.createdAt.diffNow().as('days') < 1) {
        console.log(`Getting old entries for user ${userId}`);

        try {
            const entries = entry.items ? entry.items : await entry.promise;
            res.send(entries);
        } catch (e) {
            next(e);
        }
    } else {
        console.log(`Getting first-time entries for user ${userId}`);

        entry = new StoreEntry();
        entry.promise = BookmeterClient.GetAllBookEntries(userId);
        store[userId] = entry;

        try {
            const entries = await entry.promise;
            entry.items = entries;

            res.send(entries);

            saveStore();
        } catch (e) {
            next(e);
        }
    }
});

app.get('/books/:userName', async function (req, res, next) {
    if(userMapping[req.params.userName]) {
        res.redirect(`/books/${userMapping[req.params.userName]}`);
        return;
    }
    try {
        const user = await BookmeterClient.FindUser(req.params.userName);
        if(user != null) {
            userMapping[req.params.userName] = user.id;
            res.redirect(`/books/${user.id}`);
        } else {
            res.status(404).send('User could not be found');
        }
    } catch(e) {
        next(e);
    }
});

app.get('*', function(req, res) {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
});

loadStore();

app.listen(port, () => console.log(`Example app listening on port ${port}!`));