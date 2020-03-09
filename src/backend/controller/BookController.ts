import { Controller } from './Controller'
import { Router, NextFunction, Request, Response } from 'express';
import { Cache } from '../Cache';
import { BookmeterService } from '../BookmeterService';

export class BookController extends Controller {
    constructor() {
        super();
    }

    setup(router: Router) {
        router.get('/:userId', this.getBooks.bind(this));
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
}