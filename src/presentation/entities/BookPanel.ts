import { AbstractMesh, Scene, TransformNode, Mesh, MeshBuilder, Vector3, Quaternion, ColorGradingTexture, Observer } from '@babylonjs/core';
import {AdvancedDynamicTexture, Rectangle, TextBlock } from '@babylonjs/gui'
import { BookEntry } from '../../model/BookEntry';
import { DateTime } from 'luxon';

export class BookPanel extends TransformNode {
    private _texture: AdvancedDynamicTexture;
    private _mesh: Mesh;

    private _target: AbstractMesh;
    private _targetModel: BookEntry;

    private _rect: Rectangle;
    private _text: TextBlock;
    private _outline: Rectangle;

    private _width = 1;
    constructor(name: string, scene: Scene) {
        super(name, scene);
        this._mesh = MeshBuilder.CreatePlane(`${name}_plane`, { width: this._width, height: 1 }, scene);
        this._mesh.parent = this;
        this._mesh.rotation.y = Math.PI;

        this.rotationQuaternion = Quaternion.Identity();

        this._texture = AdvancedDynamicTexture.CreateForMesh(this._mesh, 1024, 1024, false);
        var rect1 = this._rect = new Rectangle();
        rect1.width = 1;
        rect1.height = 0.1;
        rect1.cornerRadius = 20;
        rect1.color = "#367700";
        rect1.thickness = 10;
        rect1.background = "#f5f6f2";
        rect1.top = -200;
        this._texture.addControl(rect1);

        const text = this._text = new TextBlock("");
        text.width = 1;
        text.fontSize = 20;
        rect1.addControl(text);

        this._outline = new Rectangle();
        this._outline.width = 0.3;
        this._outline.height = 0.35;
        this._outline.cornerRadius = 20;
        this._outline.color = "#367700";
        this._outline.thickness = 10;
        this._outline.background = "transparent";
        this._texture.addControl(this._outline);

        scene.onBeforeRenderObservable.add(() => this.update());
    }

    update() {
        if(!this._target) return;

        // console.log("Mov");
        const offset = this._target.getBoundingInfo().boundingSphere.radius * 1.5;
        // const targetPosition = this._target.absolutePosition.add(this._target.right.scale((-offset - this._width * 0.5 )));
// 
        // this.position = Vector3.Lerp(this.position, this._target.absolutePosition, this._scene.getEngine().getDeltaTime() * 0.005);
        this.position = this._target.absolutePosition;
        this.rotationQuaternion = this._target.absoluteRotationQuaternion;
    }

    setTarget(mesh: AbstractMesh, model: BookEntry) {
        this._target = mesh;
        this._targetModel = model;
        this._text.text = model.book.title;

        let t = -0.1;

        this._outline.onBeforeDrawObservable.clear();
        this._outline.onAfterDrawObservable.clear();
        this._outline.onBeforeDrawObservable.add(() => {
            const ctx = this._texture.getContext();
            ctx.setLineDash([Math.max(0, t * 1000), 10000]);

            t += this._scene.getEngine().getDeltaTime() * 0.001;

            this._texture.invalidateRect(0, 0, 1024, 1024);
            this._texture.markAsDirty();
        });

        this._outline.onAfterDrawObservable.add(() => {
            this._texture.getContext().setLineDash([]);
        });
    }

    private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
        if (w < 2 * r) r = w / 2;
        if (h < 2 * r) r = h / 2;
        ctx.beginPath();
        ctx.moveTo(x+r, y);
        ctx.arcTo(x+w, y,   x+w, y+h, r);
        ctx.arcTo(x+w, y+h, x,   y+h, r);
        ctx.arcTo(x,   y+h, x,   y,   r);
        ctx.arcTo(x,   y,   x+w, y,   r);
        ctx.closePath();
        return this;
      }
}