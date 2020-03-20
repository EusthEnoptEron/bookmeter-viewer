import { Scene, Mesh, VertexData, AbstractMesh, MeshBuilder, InstancedMesh, Vector2, TransformNode } from '@babylonjs/core';
import { Constants } from '../Constants';
import { v4 as uuid } from 'uuid';
import { PBRScalableMaterial } from '../materials/PBRScalableMaterial';
import { SeparatorTextureBuilder } from '../util/SeparatorTextureBuilder';

export class BookSeparator extends TransformNode {
    private _text: string = "";

    constructor(public mesh: InstancedMesh, public slot: number, private _textureBuilder: SeparatorTextureBuilder) {
        super(mesh.name + "_parent", mesh.getScene());
        mesh.parent = this;
    }

    get text() { return this._text; }
    set text(val: string) {
        if(this._text == val) return;

        this._text = val;
        this._textureBuilder.setText(val, this.slot);
    };
}

export class BookSeparatorBuilder {
    private static _textureBuilder: SeparatorTextureBuilder;
    private static _template: Mesh;
    private static _slotCounter = 0;
    static CreateSeparator(scene: Scene): BookSeparator {
        if(!this._template) {
            this._template = this.CreateSeparatorTemplate(scene);
            scene.onBeforeRenderObservable.add(() => {
                this._textureBuilder.update();
            });
        }

        const instance = this._template.createInstance(uuid());
        const slot = this._slotCounter++;
        instance.isVisible = false;
        instance.instancedBuffers[PBRScalableMaterial.ScaleKind] = this._textureBuilder.getScale();
        instance.instancedBuffers[PBRScalableMaterial.OffsetKind] = this._textureBuilder.getOffset(slot);

        return new BookSeparator(instance, slot, this._textureBuilder);
    }

    private static CreateSeparatorTemplate(scene: Scene): Mesh {
        if(!this._textureBuilder) {
            this._textureBuilder = new SeparatorTextureBuilder(scene);
        }

        const plane = MeshBuilder.CreatePlane(
            uuid(),    
        {
            width: Constants.BOOK_THICKNESS,
            height: Constants.BOOK_HEIGHT
        }, scene);

        const material = new PBRScalableMaterial(uuid(), scene);
        material.albedoTexture = this._textureBuilder.texture;
        material.metallic = 0.5;
        material.roughness = 0.5;
        plane.receiveShadows = true;
        plane.material = material;
        plane.registerInstancedBuffer(PBRScalableMaterial.ScaleKind, 2);
        plane.registerInstancedBuffer(PBRScalableMaterial.OffsetKind, 2);
        plane.setEnabled(false);
        plane.isVisible = false;
        
        return plane;
    }
}