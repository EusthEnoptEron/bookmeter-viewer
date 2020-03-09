import { v4 as uuid } from 'uuid';
import { defaults as _defaults } from 'lodash';

export interface IAtlasOptions {
    size?: number,
    frameSize?: number,
    flipY?: boolean
}

export interface ISlot {
    x: number,
    y: number,
    width: number,
    height: number
}

const defaults: IAtlasOptions = {
    size: 4096,
    frameSize: 256,
    flipY: true
};


export abstract class AtlasBase {
    private counter = 0;
    public count =  0;
    private rows: number;
    private cols: number;

    constructor(private options: IAtlasOptions) {
        _defaults(options, defaults);

        this.rows = this.cols = options.size / options.frameSize;
        this.count = this.rows * this.cols;
    }

    abstract getContext(): CanvasRenderingContext2D;
    abstract loadImage(url: string): Promise<any>;

    get isFull(): boolean {
        return this.counter >= this.count;
    }

    async addTextureAsync(url: string): Promise<ISlot> {
        if(this.isFull) {
            throw "Atlas is already full!";
        }

        const x = this.counter % this.cols;
        const y = Math.floor(this.counter / this.cols);
        this.counter++;

        const ctx = this.getContext();
        const img = await this.loadImage(url);

        console.log("Image loaded.");

        ctx.save();
        ctx.translate(this.options.frameSize * x, this.options.frameSize * y);

        if(this.options.flipY) {
            ctx.translate(0, this.options.frameSize);
            ctx.scale(1, -1);
        }

        ctx.drawImage(img, 0, 0, this.options.frameSize, this.options.frameSize);
        ctx.restore();
        
        return {
            x: x / this.cols,
            y: 1 - ((y + 1) / this.rows),
            width: 1 / this.cols,
            height: 1 / this.rows
        };
    }
}