import { AbstractMesh, Mesh, PBRMaterial, Scene, ShadowGenerator, Texture, Tools, Vector2 } from '@babylonjs/core';
import { chunk } from 'lodash';
import { v4 as uuid } from 'uuid';
import { BookEntry } from '../../model/BookEntry';
import { UrlUtils } from '../../util/UrlUtils';
import { AtlasBase, ISlot } from '../materials/AtlasBase';
import { PBRScalableMaterial } from '../materials/PBRScalableMaterial';
import { TextureAtlas } from '../materials/TextureAtlas';
import { AssetRegistry } from './AssetRegistry';

let atlasSize = 4096;
let frameSize = 256;

export class BookBuilder {
    private _baseMesh: Mesh;
    private _atlases: TextureAtlas[] = [];
    private _isWarmedUp = false;

    constructor(private scene: Scene, private shadowGenerator: ShadowGenerator) {
        if(atlasSize > scene.getEngine().getCaps().maxTextureSize) {
            // Play it safe
            atlasSize = 2048;
            frameSize = 128;
        }
    }

    private async prepare(): Promise<void> {
        this._baseMesh = await this.createBaseMesh();
    }

    private async createBaseMesh(atlasTexture: Texture = null): Promise<Mesh> {
        // const meshes = await SceneLoader.ImportMeshAsync('', '/assets/', 'book.glb', this.scene);
        // const mesh = meshes.meshes[1] as Mesh;
        const mesh = AssetRegistry.Instance.bookModel.clone();
        mesh.makeGeometryUnique();
        mesh.setParent(null);
        mesh.registerInstancedBuffer(PBRScalableMaterial.ScaleKind, 2);
        mesh.registerInstancedBuffer(PBRScalableMaterial.OffsetKind, 2);
        mesh.material = this.generateMaterial(atlasTexture);

        return mesh;
    }

    async createMeshes(books: BookEntry[], user: string): Promise<AbstractMesh[]> {
        const chunks = chunk(books, AtlasBase.CalculateSpace(atlasSize, frameSize));
        const meshes: AbstractMesh[] = [];

        for(let group of chunks) {
            Tools.UseFallbackTexture = false;
            
            const url = UrlUtils.GetAtlasUrl(user, group, frameSize, atlasSize);
            const texture = await BookBuilder.LoadTexture(url, this.scene);
            const baseMesh = await this.createBaseMesh(texture);

            let i = 0;

            for(let book of group) {
                const slot = AtlasBase.CalculateSlot(i, atlasSize, frameSize);
                const mesh = this.createInstance(book, baseMesh, slot);

                meshes.push(mesh);
                i++;
            }
        }
        
        return meshes;
    }

    async createMesh(book: BookEntry): Promise<AbstractMesh> {
        if (!this._isWarmedUp || this.currentAtlas.isFull) {
            await this.prepare();
            this._isWarmedUp = true;
        }

        const slot = await this.currentAtlas.addTextureAsync(UrlUtils.WrapUrl(book.book.image_url));
        const mesh = this.createInstance(book, this._baseMesh, slot);

        this.currentAtlas.update();

        return mesh;
    }

    private createInstance(book: BookEntry, baseMesh: Mesh, slot: ISlot) {
        const mesh = baseMesh.createInstance(book.book.title);

        mesh.instancedBuffers[PBRScalableMaterial.OffsetKind] = new Vector2(slot.x, slot.y);
        mesh.instancedBuffers[PBRScalableMaterial.ScaleKind] = new Vector2(slot.width, slot.height);
        mesh.isVisible = false;

        this.shadowGenerator.addShadowCaster(mesh);

        return mesh;
    }

    applyAllAtlases() {
        for(let atlas of this._atlases) {
            atlas.update();
        }
    }

    private get currentAtlas() { return this._atlases[this._atlases.length - 1]; }

    private generateAtlas() {
        return new TextureAtlas({
            frameSize: 256
        }, this.scene);
    }

    private generateMaterial(texture: Texture = null): PBRMaterial {
        const mat = new PBRScalableMaterial(`bookMat-${uuid()}`, this.scene);

        mat.metallic = 0;
        mat.roughness = 0.7;
        
        if(texture === null) {
            const atlas = this.generateAtlas();
            this._atlases.push(atlas);
            mat.albedoTexture = atlas.texture;
        } else {
            mat.albedoTexture = texture;
        }
        
        return mat;
    }

    private static LoadTexture(url: string, scene: Scene): Promise<Texture> {
        return new Promise((resolve, fail) => {
            let tex: Texture;
            tex = new Texture(url, scene, false, true, Texture.BILINEAR_SAMPLINGMODE, () => resolve(tex), fail);
        });
    }

}