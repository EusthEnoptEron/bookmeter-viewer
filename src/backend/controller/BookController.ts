import { Controller } from './Controller'
import { Router, NextFunction, Request, Response } from 'express';
import { Cache } from '../Cache';
import { BookService } from '../BookService';
import amazon, { IAmazonProductClient } from 'amazon-product-api';
import { AmazonClient } from '../AmazonClient';
import { WebException } from '../WebException';
import { DateTime } from 'luxon';

export class BookController extends Controller {
    
    // private _amazonClient: IAmazonProductClient;
    constructor() {
        super();
    }

    setup(router: Router) {
        router.get('/details/:asin', this.getDetails.bind(this));
        router.get('/:userId', this.getBooks.bind(this));

        // this._amazonClient = amazon.createClient({
        //     awsId: process.env.AMAZON_API_KEY,
        //     awsSecret: process.env.AMAZON_PRIVATE_KEY,
        //     awsTag: process.env.AMAZON_ASSOCIATE_TAG
        // });
    }

    async getBooks(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = await BookService.GetUserId(req.params.userId);
            const books = await BookService.GetBooks(userId);
            res.send(books);
        } catch(e) {
            next(e);
        }
    }

    async getDetails(req: Request, res: Response, next: NextFunction) {
        if(req.header('If-Modified-Since')) {
            // This won't change.
            res.status(304).send();
            return;
        }

        try {
            const details = await BookService.GetDetails(req.params.asin);

            res.header('Content-Type', 'application/json');
            res.header('Cache-Control', 'public, max-age=31536000');
            res.header('Last-Modified', DateTime.local().toHTTP());

            res.send(details); 
        } catch(e) {
            next(e);
        }
    }

}