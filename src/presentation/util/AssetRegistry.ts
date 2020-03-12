import { Texture, AssetsManager, Scene, TextureAssetTask, Mesh } from '@babylonjs/core';

const WOOD_TEXTURE_PATH = "/assets/textures/Wood37";
const MARBLE_TEXTURE_PATH = "/assets/textures/Marble012_2K";

export class AssetRegistry 
{
    private static _Registry: AssetRegistry = null;
    public static get Instance() {
        if(this._Registry === null) {
            this._Registry = new AssetRegistry();
        }

        return this._Registry;
    }

    public woodColorTexture: Texture;
    public woodNormalTexture: Texture;
    public woodRoughnessTexture: Texture;

    public marbleColorTexture: Texture;
    public marbleRoughnessTexture: Texture;

    public bookModel: Mesh;

    async load(scene: Scene): Promise<void> {
        const manager = new AssetsManager(scene);
        manager.addTextureTask("wood_col", `${WOOD_TEXTURE_PATH}_col.jpg`).onSuccess = task => this.woodColorTexture = task.texture;
        manager.addTextureTask("wood_nrm", `${WOOD_TEXTURE_PATH}_nrm.jpg`).onSuccess = task => this.woodNormalTexture = task.texture;
        manager.addTextureTask("wood_rgh", `${WOOD_TEXTURE_PATH}_rghMtl.jpg`).onSuccess = task => this.woodRoughnessTexture = task.texture;

        manager.addTextureTask("marble_col", `${MARBLE_TEXTURE_PATH}_Color.jpg`).onSuccess = task => this.marbleColorTexture = task.texture;
        manager.addTextureTask("marble_rgh", `${MARBLE_TEXTURE_PATH}_rghMtl.jpg`).onSuccess = task => this.marbleRoughnessTexture = task.texture;

        manager.addMeshTask('book', '', '/assets/', 'book.glb').onSuccess = task => {
            this.bookModel = task.loadedMeshes[1] as Mesh;
            this.bookModel.setEnabled(false);
            this.bookModel.isVisible = false;
        };

        await manager.loadAsync();
    }
}