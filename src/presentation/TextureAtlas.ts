import { DynamicTexture, Scene, Texture, VertexBuffer, FloatArray } from '@babylonjs/core';
import { v4 as uuid } from 'uuid';
import { defaults as _defaults } from 'lodash-es';

interface IAtlasOptions {
    size?: number,
    frameSize?: number,
    flipY?: boolean
}

interface ISlot {
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

export class TextureAtlas {
    private dt: DynamicTexture;

    private counter = 0;
    public count =  0;
    private rows: number;
    private cols: number;

    constructor(private options: IAtlasOptions, private scene: Scene) {
        _defaults(options, defaults);

        this.rows = this.cols = options.size / options.frameSize;
        this.count = this.rows * this.cols;
        this.dt = new DynamicTexture(uuid(), {
            width: options.size,
            height: options.size
        }, scene, true);
    }

    private get ctx() {
        return this.dt.getContext();
    }

    get texture(): Texture {
        return this.dt;
    }

    get isFull(): boolean {
        return this.counter >= this.count;
    }

    // reproject(buffer: FloatArray, slot: ISlot) {
    //     console.log(buffer);
    //     for(let i = 0; i < buffer.length; i += 2) {
    //         buffer[i] = slot.x + this.normalizeUvComponent(buffer[i]) * slot.width;
    //         buffer[i + 1] = slot.y + this.normalizeUvComponent(buffer[i + 1]) * slot.height;
    //     }
    // }

    // private normalizeUvComponent(component: number) {
    //     while(component < 0) component += 1;
    //     return component % 1;
    // }

    async addTextureAsync(url: string): Promise<ISlot> {
        if(this.isFull) {
            throw "Atlas is already full!";
        }

        const img = await this.loadImage(url);

        const x = this.counter % this.cols;
        const y = Math.floor(this.counter / this.cols);
        this.ctx.save();
        this.ctx.translate(this.options.frameSize * x, this.options.frameSize * y);

        if(this.options.flipY) {
            this.ctx.translate(0, this.options.frameSize);
            this.ctx.scale(1, -1);
        }

        this.ctx.drawImage(img, 0, 0, this.options.frameSize, this.options.frameSize);
        this.ctx.restore();
        
        this.counter++;

        return {
            x: x / this.cols,
            y: 1 - ((y + 1) / this.rows),
            width: 1 / this.cols,
            height: 1 / this.rows
        };
    }

    update() {
        this.dt.update();
    }
    
    private async loadImage(url: string): Promise<HTMLImageElement> {
        return new Promise((resolve, reject) => {
            const imgToDraw = new window.Image();
            imgToDraw.crossOrigin = 'Anonymous';
            imgToDraw.src = url;
            imgToDraw.onload = () => {
                resolve(imgToDraw);
            };
            imgToDraw.onerror = reject;
          });
    }
}