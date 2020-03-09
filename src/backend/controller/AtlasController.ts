import { Controller } from './Controller';
import { Router, Request, Response, NextFunction } from 'express';
import { BackendAtlas } from '../BackendAtlas';
import { BookmeterService } from '../BookmeterService';
import async from 'async';
import  _ from 'lodash';
import { RequestFileError } from '@babylonjs/core';
import { Cache } from '../Cache';

export class AtlasController extends Controller {
    constructor() {
        super();
    }

    setup(router: Router) {
       router.get("/:userName", this.getAtlas.bind(this));
    }

    async getAtlas(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = await BookmeterService.GetUserId(req.params.userName);
            const idString = req.query.ids as string;
            if(!idString || !idString.match(/^(\d+-?)+$/)) {
                res.status(400).send();
                return;
            }

            const cacheKey = userId + "/" + idString;
            if(req.header('If-Modified-Since')) {
                res.status(304).send();
                return;
            }


            let buffer = await Cache.GetImage(userId + "/" + idString);

            if(buffer === null) {
                const ids = idString.split('-').map(parseInt);
                const atlas = new BackendAtlas({ frameSize: 128, size: 4096 });
    
                const booksMap = _.keyBy(await BookmeterService.GetBooks(userId), book => book.id);
                const books = ids.map(id => booksMap[id]);

                if(ids.some(id => !id)) {
                    throw "Invalid ID!";
                }
    
                console.log("Drawing images...");
                // Return type seems to be wrong, so cast to any...
                await async.mapLimit(books, 10, async book => await atlas.addTextureAsync(book.book.image_url));

                buffer = atlas.toJpeg();
                await Cache.SaveImage(cacheKey, buffer);
            }

            const lastModifiedDate = await Cache.GetImageLastModified(cacheKey);
            res.header('Content-Type', 'image/jpeg');
            res.header('Cache-Control', 'public, max-age=31536000');
            res.header('Last-Modified', lastModifiedDate.toHTTP());
            res.end(buffer);
        } catch(e) {
            next(e);
        } 
    }
}