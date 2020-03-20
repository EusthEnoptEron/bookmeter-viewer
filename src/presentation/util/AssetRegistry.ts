import { AssetsManager, Mesh, Scene, Texture } from '@babylonjs/core';

const WOOD_TEXTURE_PATH = "/assets/textures/Wood37";
const PLASTIC_TEXTURE_PATH = "/assets/textures/Plastic004_512";

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

    public plasticColorTexture: Texture;
    public plasticRoughnessTexture: Texture;
    public plasticNormalTexture: Texture;

    public bookModel: Mesh;

    async load(scene: Scene): Promise<void> {
        const manager = new AssetsManager(scene);
        manager.addTextureTask("wood_col", `${WOOD_TEXTURE_PATH}_col.jpg`).onSuccess = task => this.woodColorTexture = task.texture;
        manager.addTextureTask("wood_nrm", `${WOOD_TEXTURE_PATH}_nrm.jpg`).onSuccess = task => this.woodNormalTexture = task.texture;
        manager.addTextureTask("wood_rgh", `${WOOD_TEXTURE_PATH}_rghMtl.jpg`).onSuccess = task => this.woodRoughnessTexture = task.texture;

        manager.addTextureTask("plastic_col", `${PLASTIC_TEXTURE_PATH}_Color.jpg`).onSuccess = task => this.plasticColorTexture = task.texture;
        manager.addTextureTask("plastic_nrm", `${PLASTIC_TEXTURE_PATH}_Normal.jpg`).onSuccess = task => this.plasticNormalTexture = task.texture;
        manager.addTextureTask("plastic_rgh", `${PLASTIC_TEXTURE_PATH}_rghMtl.jpg`).onSuccess = task => this.plasticRoughnessTexture = task.texture;

        manager.addMeshTask('book', '', '/assets/', 'book.glb').onSuccess = task => {
            this.bookModel = task.loadedMeshes[1] as Mesh;
            this.bookModel.setEnabled(false);
            this.bookModel.isVisible = false;
        };

        manager.useDefaultLoadingScreen = false;
        await manager.loadAsync();
    }
}