import { AtlasBase, IAtlasOptions } from '../presentation/materials/AtlasBase';
import { createCanvas, loadImage, Canvas, Image } from 'canvas';
import Axios, { AxiosResponse } from 'axios';
import { Cache } from './Cache';
import debugFn from 'debug';
const debug = debugFn('BackendAtlas');

export class BackendAtlas extends AtlasBase {
    private _canvas: Canvas;

    constructor(options: IAtlasOptions) {
        super(options);
        
        this._canvas = createCanvas(options.size, options.size);
    }

    getContext(): CanvasRenderingContext2D {
        return this._canvas.getContext("2d");
    }

    toJpeg(quality: number = 80): Buffer {
        return this._canvas.toBuffer('image/jpeg', { quality: quality });
    }

    async loadImage(url: string): Promise<any> {
        let buffer = await Cache.GetImage(url);
        if(buffer === null) {
            debug(`Loading ${url}...`);
            const response: AxiosResponse<Buffer> = await Axios.get(url, {
                responseType: 'arraybuffer'
            });

            buffer = response.data;

            // Fire and forget
            debug(`Saving ${url} to cache...`)
            await Cache.SaveImage(url, buffer);

        }

        return await loadImage(buffer);
    }

}