import { DynamicTexture, Scene, Texture } from '@babylonjs/core';
import { v4 as uuid } from 'uuid';
import { AtlasBase, IAtlasOptions } from './AtlasBase';

export class TextureAtlas extends AtlasBase {
    private dt: DynamicTexture;

    constructor(options: IAtlasOptions, private scene: Scene) {
        super(options);

        this.dt = new DynamicTexture(uuid(), {
            width: options.size,
            height: options.size
        }, scene, true);
    }

    get texture(): Texture {
        return this.dt;
    }

    update() {
        this.dt.update();
    }

    getContext() {
        return this.dt.getContext();
    }
    
    async loadImage(url: string): Promise<any> {
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