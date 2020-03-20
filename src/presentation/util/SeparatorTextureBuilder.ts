import { Texture, DynamicTexture, Scene, Vector2 } from '@babylonjs/core';

export class SeparatorTextureBuilder {
    
    private _capacity: number;
    private _cols: number;
    private _rows: number;

    private _tex: DynamicTexture;

    private _fontSize: number;
    private _dirty: boolean;
    private _padding: number;

    constructor(scene: Scene, private _textureWidth = 2048, private _textureHeight = 1024, private _slotWidth = 32, private _slotHeight = 128) {
        this._cols = Math.floor(_textureWidth / _slotWidth);
        this._rows = Math.floor(_textureHeight / _slotHeight);

        this._capacity = this._cols * this._rows;
        console.log("Capacity for: " + this._capacity);

        this._tex = new DynamicTexture('Separator_Texts', { 
            width: _textureWidth,
            height: _textureHeight
         }, scene, true);

        const ctx = this._tex.getContext();
        ctx.fillStyle = 'green';
        ctx.fillRect(0, 0, this._textureWidth, this._textureHeight);

        this._fontSize = Math.round(this._slotWidth * 0.8);
        this._padding = this._slotHeight * 0.03;
    }

    get texture(): Texture {
        return this._tex;
    }

    setText(text: string, id: number) {
        console.log(`[${id}] ${text}`);
        this._dirty = true;
        const ctx = this._tex.getContext();

        let parts: [string, boolean][] = [];
        let current = 0;
        let tate = false;

        for(let i = 0; i < text.length; i++) {
            const requiresTate = text.charCodeAt(i) > 128;
            if(requiresTate || requiresTate != tate || i == 0) {
                if(current != i) {
                    parts.push([text.substring(current, i), tate]);
                }
                current = i;
                tate = requiresTate;
            }
        }

        parts.push([text.substring(current), tate]);

        ctx.font = `${this._fontSize}px "Kosugi Maru"`;
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'left';

        const totalWidth = ctx.measureText(text).width;
        const maxHeight = this._slotHeight - this._padding * 2;
        const factor = Math.min(1,  maxHeight / totalWidth);

        const col = id % this._cols;
        const row = Math.floor(id / this._cols);
        const x = col * this._slotWidth;
        const y = row * this._slotHeight;

        ctx.fillStyle = 'white';
        ctx.fillRect(x, y, this._slotWidth, this._slotHeight);

        ctx.fillStyle = 'black';
        ctx.save();
        ctx.translate(x + this._slotWidth * 0.5, y + this._padding);

        for(let part of parts) {
            const maxWidth = ctx.measureText(part[0]).width * factor;

            if(!part[1]) {
                // gotta rotate
                ctx.save();
                ctx.rotate(-Math.PI * 0.5);
                ctx.textAlign = 'right';
                ctx.fillText(part[0], 0, 0, maxWidth);
                ctx.restore();
            } else {
                ctx.font = `${this._fontSize * factor}px "Kosugi Maru"`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'top';
                ctx.fillText(part[0], 0, 0);
                ctx.textBaseline = 'middle';
                ctx.font = `${this._fontSize}px "Kosugi Maru"`;
            }

            ctx.translate(0, maxWidth);
        }
        ctx.restore();
    }

    getScale(): Vector2 {
        return new Vector2(
            this._slotWidth / this._textureWidth,
            this._slotHeight / this._textureHeight
        );
    }

    getOffset(id: number): Vector2 {
        const col = id % this._cols;
        const row = Math.floor(id / this._cols);

        return new Vector2(
            col / this._cols,
            1 - (1 / this._rows) * (row + 1)
        );
    }

    update() {
        if(this._dirty) {
            this._dirty = false;
            this._tex.update();
        }
    }


}