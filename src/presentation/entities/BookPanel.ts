import { Mesh, MeshBuilder, Nullable, Quaternion, Scene, TransformNode } from '@babylonjs/core';
import { AdvancedDynamicTexture, Control, Ellipse, Rectangle, StackPanel, TextBlock } from '@babylonjs/gui';
import TWEEN from '@tweenjs/tween.js';
import '../util/AnimationHelper';
import { BookEntity } from './BookEntity';


export class BookPanel extends TransformNode {
    private _texture: AdvancedDynamicTexture;
    private _mesh: Mesh;

    private _target: BookEntity;

    private _rect: Rectangle;
    private _text: TextBlock;

    private _infoStack: StackPanel;
    private _authorPanel: Rectangle;
    private _pagePanel: Rectangle;
    private _datePanel: Rectangle;

    private _currentTween: TWEEN.Tween;

    private _width = 1;
    constructor(name: string, scene: Scene) {
        super(name, scene);
        this._mesh = MeshBuilder.CreatePlane(`${name}_plane`, { width: this._width, height: 1 }, scene);
        this._mesh.parent = this;
        this._mesh.rotation.y = Math.PI;
        this._mesh.isVisible = false;


        this.rotationQuaternion = Quaternion.Identity();

        this._texture = AdvancedDynamicTexture.CreateForMesh(this._mesh, 1024, 1024, false);

        var rect1 = this._rect = new Rectangle();
        rect1.width = 1;
        rect1.heightInPixels = 100;
        rect1.cornerRadius = 50;
        rect1.color = "#367700";
        rect1.thickness = 10;
        rect1.background = "#f5f6f2";
        rect1.top = -200;
        this._texture.addControl(rect1);

        const text = this._text = new TextBlock("");
        text.width = 1;
        text.fontFamily = `"Kosugi Maru"`;
        text.fontSizeInPixels = 40;

        rect1.addControl(text);

        this._infoStack = new StackPanel("StackPanel");
        this._infoStack.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        this._infoStack.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        this._infoStack.left = '65%';
        this._infoStack.topInPixels = 390;
        this._infoStack.width = 1;
        this._infoStack.height = 1;

        this._authorPanel = this.makeSubInfoPanel('作');
        this._pagePanel = this.makeSubInfoPanel('項');
        this._datePanel = this.makeSubInfoPanel('時');


        this._infoStack.addControl(this._authorPanel);
        this._infoStack.addControl(this._datePanel);
        this._infoStack.addControl(this._pagePanel);
        this._texture.addControl(this._infoStack);

        scene.onBeforeRenderObservable.add(() => this.update());
    }

    private makeSubInfoPanel(character: string): Rectangle {
        var container  = new Rectangle();
        container.width = 0.35;
        container.heightInPixels = 110;
        container.paddingTopInPixels = 10;
        container.cornerRadius = 100;
        container.color = "#367700";
        container.thickness = 10;
        container.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        container.background = "#f5f6f2";

        const ellipse = new Ellipse("Ellipse");
        container.addControl(ellipse);

        ellipse.thickness = 5;
        ellipse.color = "#367700";
        ellipse.background = "#56970a";
        ellipse.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        ellipse.leftInPixels = 10;
        ellipse.heightInPixels = 70;
        ellipse.widthInPixels = 70;
        ellipse.rotation = Math.PI * 0.2;
        
        const charText = new TextBlock("Character", character);
        ellipse.addControl(charText);

        charText.fontFamily = `"Kosugi Maru"`;
        charText.fontSizeInPixels = 40;
        charText.color = "white";

        const text = new TextBlock("Text", "");
        container.addControl(text);
        text.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        text.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        
        text.fontFamily = `"Kosugi Maru"`;
        text.fontSizeInPixels = 40;
        text.color = "#367700";
        text.text = "";
        text.leftInPixels = 90;

        return container;
    }

    update() {
        if(!this._target) return;

        const offset = this._target.mesh.getBoundingInfo().boundingSphere.radius * 1.5;
        // const targetPosition = this._target.absolutePosition.add(this._target.right.scale((-offset - this._width * 0.5 )));
// 
        // this.position = Vector3.Lerp(this.position, this._target.absolutePosition, this._scene.getEngine().getDeltaTime() * 0.005);
        this.position = this._target.mesh.absolutePosition;
        this.rotationQuaternion = this._target.mesh.absoluteRotationQuaternion;
    }

    setTarget(entity: Nullable<BookEntity>) {
        this._mesh.isVisible = entity != null;
        this._target = entity;

        if(entity == null) return;

        this._text.text = this.formatBookTitle(entity.book.title);

        const authorText = (this._authorPanel.getChildByName('Text') as TextBlock);
        const pageText = (this._pagePanel.getChildByName('Text') as TextBlock);
        const dateText = (this._datePanel.getChildByName('Text') as TextBlock);

        this._authorPanel.widthInPixels = 0;
        this._pagePanel.widthInPixels = 0;
        this._datePanel.widthInPixels = 0;

        if(entity.book.author.name) {
            this._authorPanel.isVisible = true;
            authorText.text = entity.book.author.name;
        } else {
            this._authorPanel.isVisible = false;
        }

        if(entity.book.page) {
            this._pagePanel.isVisible = true;
            pageText.text = entity.book.page + 'p';
        } else {
            this._pagePanel.isVisible = false;
        }

        if(entity.created_at) {
            this._datePanel.isVisible = true;
            dateText.text = entity.created_at;
        } else {
            this._datePanel.isVisible = false;
        }

        const fontSize = 40;
        const requiredWidth = Math.min(920, this.measureWidthWithFontSize(this._text.text, 40));
        this._text.fontSizeInPixels = fontSize;

        const authorRequiredWidth = Math.min(200, this.measureWidthWithFontSize(authorText.text, 40));
        authorText.fontSizeInPixels = fontSize;

        const pageRequiredWidth = Math.min(350, this.measureWidthWithFontSize(pageText.text, 40));
        pageText.fontSizeInPixels = fontSize;

        const dateRequiredWidth = Math.min(350, this.measureWidthWithFontSize(dateText.text, 40));
        dateText.fontSizeInPixels = fontSize;

        authorText.widthInPixels = authorRequiredWidth;
        const authorTween = new TWEEN.Tween({widthInPixels: 0})
            .to({widthInPixels: authorRequiredWidth + 140}, 200)
            .easing(TWEEN.Easing.Sinusoidal.InOut)
            .onTarget(this._authorPanel);

        pageText.widthInPixels = pageRequiredWidth;
        const pageTween = new TWEEN.Tween({widthInPixels: 0})
            .to({widthInPixels: pageRequiredWidth + 140}, 200)
            .easing(TWEEN.Easing.Sinusoidal.InOut)
            .onTarget(this._pagePanel);

        dateText.widthInPixels = dateRequiredWidth;
        const dateTween = new TWEEN.Tween({widthInPixels: 0})
            .to({widthInPixels: dateRequiredWidth + 140}, 200)
            .easing(TWEEN.Easing.Sinusoidal.InOut)
            .onTarget(this._datePanel);

        if(this._currentTween) {
            this._currentTween.stopChainedTweens();
            TWEEN.remove(this._currentTween);
        }

        this._text.widthInPixels = requiredWidth;
        this._currentTween = new TWEEN.Tween({ widthInPixels: 0})
            .to({ widthInPixels: requiredWidth + 60}, 300)
            .easing(TWEEN.Easing.Sinusoidal.InOut)
            .onTarget(this._rect)
            .chain(authorTween, pageTween, dateTween)
            .start();

    }

    private formatBookTitle(title: string): string {
        return title.replace(/\([^(]*?\)$/, '').trim();
    }

    private evaluateFontSizeAndWidth(text: string, startFontSize: number, maxWidth: number): [number, number] {
        let width = this.measureWidthWithFontSize(text, startFontSize);
        while(width > maxWidth) {
            startFontSize--;
            width = this.measureWidthWithFontSize(text, startFontSize);
        }

        return [startFontSize, width];
    }

    private measureWidthWithFontSize(text: string, fontSize: number) {
        const ctx = this._texture.getContext();
        ctx.font =  `${fontSize}px 'Kosugi Maru'`;
        return ctx.measureText(text).width;
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


// @ts-ignore
TextBlock.prototype._drawText = function(text: string, textWidth: number, y: number, context: CanvasRenderingContext2D): void {
    var width = this._currentMeasure.width;
    var x = 0;
    switch (this._textHorizontalAlignment) {
        case Control.HORIZONTAL_ALIGNMENT_LEFT:
            context.textAlign = "left";
            break;
        case Control.HORIZONTAL_ALIGNMENT_RIGHT:
            x = this.widthInPixels;
            context.textAlign = "right";
            break;
        case Control.HORIZONTAL_ALIGNMENT_CENTER:
            x = this.widthInPixels * 0.5;
            context.textAlign = "center";
            break;
    }

    if (this.shadowBlur || this.shadowOffsetX || this.shadowOffsetY) {
        context.shadowColor = this.shadowColor;
        context.shadowBlur = this.shadowBlur;
        context.shadowOffsetX = this.shadowOffsetX;
        context.shadowOffsetY = this.shadowOffsetY;
    }

    if (this.outlineWidth) {
        context.strokeText(text, this._currentMeasure.left + x, y);
    }
    context.fillText(text, this._currentMeasure.left + x, y, this.widthInPixels);
}