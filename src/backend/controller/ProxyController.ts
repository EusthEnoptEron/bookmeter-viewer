import { Controller } from './Controller';
import { Router, Request, Response, NextFunction } from 'express';
import Axios from 'axios';

export class ProxyController extends Controller {
    setup(router: Router) {
        router.get('', this.getUrl.bind(this));
    }

    async getUrl(req: Request, res: Response, next: NextFunction) {
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
    }
}