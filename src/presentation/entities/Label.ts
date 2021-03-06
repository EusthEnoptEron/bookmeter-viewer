import { BaseTexture, Color3, DynamicTexture, Mesh, PBRMetallicRoughnessMaterial, Scene, VertexData, StandardMaterial } from '@babylonjs/core';

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
            mat.baseTexture = options.baseTexture;
        }

        mat.emissiveTexture = this._texture;
        mat.metallic = 0.0;
        mat.roughness = 1.0;
        mat.emissiveColor = Color3.White();
        // else {
        //     mat.baseColor = Color3.Gray();
        //     mat.baseTexture = this._texture;
        //     mat.metallic = 1.0;
        //     mat.roughness = 0.5;
        // }
    
        // mat.freeze();

        
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
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        ctx.fillText(this._text, size.width * 0.5, size.height * 0.5, size.width * 0.9);
        ctx.strokeText(this._text, size.width * 0.5, size.height * 0.5, size.width * 0.9);

        this._texture.update();
    }
    

    setText(text: string) {
        this._text = text;
        this.redraw();
    }
}