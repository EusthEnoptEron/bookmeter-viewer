import { Scene, Texture } from '@babylonjs/core';

export class PromiseUtil {
    static Delay(millis: number): Promise<void> {
        return new Promise(resolve => window.setTimeout(resolve, millis));
    }

    static LoadTexture(url: string, scene: Scene): Promise<Texture> {
        return new Promise((resolve, fail) => {
            let tex: Texture;
            tex = new Texture(url, scene, null, null, null, () => resolve(tex), fail);
        });
    }
}