import { Mesh, VertexData, Scene, DynamicTexture, PBRMetallicRoughnessMaterial, Color3, Color4, Texture, BaseTexture } from '@babylonjs/core';

export class Label extends Mesh {

    private _texture: DynamicTexture;

    constructor(name: string, scene: Scene, private _text: string, options: { width: number, height: number, baseTexture?: BaseTexture }) {
        super(name, scene);
        
        const vertexData = VertexData.CreatePlane({ width: options.width, height: options.height });
        vertexData.applyToMesh(this, false);
        
        this._texture = new DynamicTexture(`${name}_tex`, { width: 512, height: 128 }, scene, true);

        const mat = new PBRMetallicRoughnessMaterial(`${name}_mat`, scene);
        this.material = mat;

        if(options.baseTexture) {
            console.log("I have a base texture", options.baseTexture);
            mat.baseTexture = options.baseTexture;
            mat.normalTexture = this._texture;
            // mat.metallicRoughnessTexture = this._texture;
            // mat.metallic = 0.0;
            // mat.roughness = 1.0;
        } else {
            console.log("I have no base texture", options.baseTexture);

            mat.baseColor = Color3.Gray();
            mat.baseTexture = this._texture;
            mat.metallic = 1.0;
            mat.roughness = 0.5;
        }
    
        mat.freeze();

        
        this.redraw();
    }

    private redraw() {
        const ctx = this._texture.getContext();
        const size = this._texture.getSize();

        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, size.width, size.height);

        ctx.font = 'bold 64px Ubuntu';
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#FFFFFF";
        ctx.fillText(this._text, size.width * 0.5, size.height * 0.5, size.width * 0.9);

        const data = ctx.getImageData(0, 0, size.width, size.height);
        const modified = ctx.createImageData(data);
        const stride = data.width * 4;
        const pixels = data.width * data.height;

        function getPixel(x: number, y: number): number {
            return data.data[y * stride + x * 4];
        }

        for(let x = 1; x < data.width - 1; x++)
        for(let y = 1; y < data.height; y++) {
            const idx = y * stride + x * 4;
            const Gx = getPixel(x - 1, y - 1)
                     - getPixel(x + 1, y - 1)
                     + getPixel(x - 1, y) * 2
                     - getPixel(x + 1, y) * 2
                     + getPixel(x - 1, y + 1)
                     - getPixel(x + 1, y + 1);

            const Gy = getPixel(x - 1, y - 1)
                     + getPixel(x, y - 1) * 2
                     + getPixel(x + 1, y - 1)
                     - getPixel(x - 1, y + 1)
                     - getPixel(x, y + 1) * 2
                     - getPixel(x + 1, y + 1);

            modified.data[idx] = Gx;
            modified.data[idx + 1] = Gy;
            modified.data[idx + 2] = 255;
            modified.data[idx + 3] = 255;
        }
        console.log(modified.data);

        ctx.putImageData(modified, 0, 0);

        this._texture.update();
    }
    

    setText(text: string) {
        this._text = text;
        this.redraw();
    }
}