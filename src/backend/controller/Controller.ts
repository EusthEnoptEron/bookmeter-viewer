import { Router } from 'express';

export abstract class Controller {
    router: Router;

    constructor() {
        this.router = Router();
        this.setup(this.router);
    }

    abstract setup(router: Router): void;
}