import { Controller } from './Controller';
import { Router, Request, Response, NextFunction } from 'express';
import { BackendAtlas } from '../BackendAtlas';
import { BookService } from '../BookService';
import async from 'async';
import  _ from 'lodash';
import { Cache } from '../Cache';
import debugFn from 'debug';
const debug = debugFn('viewer:atlascontroller');

const DEFAULT_ATLAS_SIZE = 4096;
const DEFAULT_ATLAS_FRAME_SIZE = 256;

export class AtlasController extends Controller {
    constructor() {
        super();
    }

    setup(router: Router) {
       router.get("/:userName", this.getAtlas.bind(this));
    }

    async getAtlas(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = await BookService.GetUserId(req.params.userName);
            const idString = req.query.ids as string;
            const frameSize = this.validateAtlasSize(req.query.frameSize as string, 9, DEFAULT_ATLAS_FRAME_SIZE);
            const atlasSize =  this.validateAtlasSize(req.query.atlasSize as string, 13, DEFAULT_ATLAS_SIZE);

            if(!idString || !idString.match(/^(\d+-?)+$/)) {
                res.status(400).send();
                return;
            }
            
            const cacheKey = req.url;
            debug(cacheKey, frameSize, atlasSize);
            if(req.header('If-Modified-Since') && Cache.GetImageLastModified(cacheKey) !== null) {
                res.status(304).send();
                return;
            }

            let buffer = await Cache.GetImage(req.url);

            if(buffer === null) {
                const ids = idString.split('-').map(str => parseInt(str));
                const atlas = new BackendAtlas({ frameSize: frameSize, size: atlasSize });
    
                const booksMap = _.keyBy(await BookService.GetBooks(userId), book => book.id);
                const books = _.take(ids.map(id => booksMap[id]), atlas.count);

                if(books.some(book => !book)) {
                    throw "Invalid IDs found!";
                }
    
                debug("Drawing images...");
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

    private validateAtlasSize(userInput: string, maxLog: number, defaultSize: number) {
        // @ts-ignore
        if(isFinite(userInput)) {
            let atlasSize = parseInt(userInput);
            let log = Math.log2(atlasSize);
            
            if(log <= maxLog) {
                log = Math.ceil(log);
                return Math.pow(2, log);
            }
        }

        return defaultSize;
    }
    
}