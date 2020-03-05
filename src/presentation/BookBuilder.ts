import { SceneLoader, Scene, Mesh, PBRMaterial, AbstractMesh, Vector2 } from '@babylonjs/core';
import uuid = require('uuid');
import { PBRCustomMaterial } from '@babylonjs/materials';
import { BookEntry } from '../model/BookEntry';
import { TextureAtlas } from './TextureAtlas';


export class BookBuilder {
    private _baseMesh: Mesh;
    private _atlases: TextureAtlas[] = [];
    private _isWarmedUp = false;

    constructor(private scene: Scene) {
    }

    private async prepare(): Promise<void> {
        const meshes = await SceneLoader.ImportMeshAsync('', '/assets/', 'book.glb', this.scene);
        this._baseMesh = meshes.meshes[1] as Mesh;
        this._baseMesh.setParent(null);
        this._baseMesh.setEnabled(false);
        this._baseMesh.registerInstancedBuffer('customUvOffset', 2);
        this._baseMesh.registerInstancedBuffer('customUvScale', 2);
        this._baseMesh.material = this.generateMaterial();
    }

    async createMesh(book: BookEntry): Promise<AbstractMesh> {
        if (!this._isWarmedUp || this.currentAtlas.isFull) {
            await this.prepare();
            this._isWarmedUp = true;
        }

        const slot = await this.currentAtlas.addTextureAsync(book.book.image_url);
        const mesh = this._baseMesh.createInstance(book.book.title);
        this.currentAtlas.update();

        mesh.instancedBuffers.customUvOffset = new Vector2(slot.x, slot.y);
        mesh.instancedBuffers.customUvScale = new Vector2(slot.width, slot.height);
        
        mesh.setEnabled(true);

        return mesh;
    }

    private get currentAtlas() { return this._atlases[this._atlases.length - 1]; }

    private generateAtlas() {
        return new TextureAtlas({
            frameSize: 256
        }, this.scene);
    }

    private generateMaterial(): PBRMaterial {
        const mat = new PBRCustomMaterial(`bookMat-${uuid.v4()}`, this.scene);
        const atlas = this.generateAtlas();
        this._atlases.push(atlas);
        
        mat.metallic = 0;
        mat.roughness = 0.7;
        mat.albedoTexture = atlas.texture;
        
        mat.Vertex_Begin(`
            attribute vec2 customUvOffset;
            attribute vec2 customUvScale;
        `);
        mat.Vertex_Before_PositionUpdated(`
            uvUpdated = (uvUpdated * customUvScale) + customUvOffset;
        `);
        return mat;
    }

}