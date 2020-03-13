import { Controller } from './Controller'
import { Router, NextFunction, Request, Response } from 'express';
import { Cache } from '../Cache';
import { BookmeterService } from '../BookmeterService';
import amazon, { IAmazonProductClient } from 'amazon-product-api';

export class BookController extends Controller {
    
    private _amazonClient: IAmazonProductClient;
    constructor() {
        super();
    }

    setup(router: Router) {
        router.get('/details/:amazonId', this.getDetails.bind(this));
        router.get('/:userId', this.getBooks.bind(this));

        this._amazonClient = amazon.createClient({
            awsId: process.env.AMAZON_API_KEY,
            awsSecret: process.env.AMAZON_PRIVATE_KEY,
            awsTag: process.env.AMAZON_ASSOCIATE_TAG
        });
    }

    async getBooks(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = await BookmeterService.GetUserId(req.params.userId);
            const books = await BookmeterService.GetBooks(userId);
            res.send(books);
        } catch(e) {
            next(e);
        }
    }

    async getDetails(req: Request, res: Response, next: NextFunction) {
        try {
            const answer = await this._amazonClient.itemLookup({
                itemId: req.params.amazonId,
                domain: 'ecs.amazonaws.jp'
            });

            res.send(JSON.stringify(answer));
        } catch(e) {
            next(JSON.stringify(e));
        }
    }

}