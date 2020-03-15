import { AbstractMesh, ActionManager, Color4, DynamicTexture, ExecuteCodeAction, Mesh, MeshBuilder, Scene, Texture, Vector2, VertexBuffer, BaseTexture } from '@babylonjs/core';
import { uniq } from 'lodash';
import { DateTime } from 'luxon';
import { CategoryBubble } from '../entities/CategoryBubble';
import { PBRScalableMaterial } from '../materials/PBRScalableMaterial';
import { ScalableMaterial } from '../materials/ScalableMaterial';
import { Category } from './Category';

export const Categories = [
    new Category('By Author', grouper => {
        return grouper.chunk(60,
            books => {
                const authors = uniq(books.map(book => book.book.author.name).filter(author => author));
                
                if(authors.length == 0) {
                    return '';
                }
                if(authors.length == 1) {
                    return authors[0];
                }
                return authors[0] + " ... " + authors[authors.length - 1];
            },
            ['book.author.name', 'book.created_at'],
            ['asc', 'asc'],
            book => book.book.author.name    
        )
    }),
    new Category('By Year', grouper => {
        return grouper.group(book => {
            return {
                sortKey: book.created_at.substr(0, 4),
                text: book.created_at.substr(0, 4),
                skipKeyExtractor: b => b.created_at.substr(5, 2)
            };
        }, 
        'created_at')
    }),
    new Category('By Weekday', grouper => {
        return grouper.group(book => {
            const date = DateTime.fromFormat(book.created_at, 'yyyy/MM/dd');
            
            return {
                sortKey: date.weekday.toString(),
                text: date.isValid ? date.toFormat('cccc') : 'Unknown',
                skipKeyExtractor: null
            };
        },
        [book => DateTime.fromFormat(book.created_at, 'yyyy/MM/dd').weekday.toString(), 'created_at'],
        ['asc', 'asc'])
    }),
];

export class CategoryBuilder {
    private _itemWidth = 512;
    private _itemHeight = 512;
    private _texture: DynamicTexture;

    constructor(private _scene: Scene) {}
    build(): CategoryBubble[] {
        let result: CategoryBubble[] = [];
        let width = 1024;
        let count = Categories.length;
        let cols = (width / this._itemWidth);
        let rows = Math.ceil(count / cols);
        let height = Math.pow(2, Math.ceil(Math.log2(this._itemHeight * rows)));

        console.log(`Creating a texture of ${width}x${height}`);
        this._texture = new DynamicTexture('categories_tex', { width, height }, this._scene, true);
        this._texture.wrapU = Texture.WRAP_ADDRESSMODE;
        this._texture.wrapV = Texture.WRAP_ADDRESSMODE;

        const template = this.createTemplate(this._texture);

        const ctx = this._texture.getContext();
        ctx.font = 'bold 64px Ubuntu';
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = 'rgba(0,0,0,0)';
        ctx.fillRect(0, 0, width, height);
        for(let [i, category] of Categories.entries()) {
            const x = (i % cols) * this._itemWidth;
            const y = (Math.floor(i / cols)) * this._itemHeight;
            const cx = x + this._itemWidth * 0.5;
            const cy = y + this._itemHeight * 0.5;

            // ctx.beginPath();
            // ctx.fillStyle = '#56970a';
            // ctx.arc(cx, cy, this._itemWidth * 0.45, 0, Math.PI * 2);
            // ctx.fill();
            // ctx.closePath();

            ctx.fillStyle = 'white';
            ctx.fillText(category.label, cx, cy, this._itemWidth * 0.9);
            
            const instance = template.instantiateHierarchy() as AbstractMesh;
            const textMesh = (instance.getChildMeshes()[0] as AbstractMesh);
            textMesh.instancedBuffers[PBRScalableMaterial.ScaleKind] = new Vector2(1 / cols, 1 / rows);
            textMesh.instancedBuffers[PBRScalableMaterial.OffsetKind] = new Vector2(x / width, (1 / rows) - (y / height));

            instance.instancedBuffers[PBRScalableMaterial.ScaleKind] = new Vector2(0.5, 1.0);
            instance.instancedBuffers[PBRScalableMaterial.OffsetKind] = new Vector2(0.0, 0.0);
            instance.instancedBuffers[VertexBuffer.ColorKind] = Color4.FromHexString('#56970aFF');

            const am = new ActionManager(this._scene);

            const bubble = new CategoryBubble(instance, category);

            instance.actionManager = am;
            am.registerAction( new ExecuteCodeAction(
                ActionManager.OnPointerOverTrigger,
                () => {
                    instance.instancedBuffers[VertexBuffer.ColorKind] = Color4.FromHexString('#76A72aFF');
                }
            ));
            am.registerAction( new ExecuteCodeAction(
                ActionManager.OnPointerOutTrigger,
                () => {
                    instance.instancedBuffers[VertexBuffer.ColorKind] = Color4.FromHexString('#56970aFF');
                }
            ));
            am.registerAction( new ExecuteCodeAction(
                ActionManager.OnPickTrigger,
                () => {
                    bubble.onPicked.next();
                }
            ));

            bubble.onSelected.subscribe(selected => {
                instance.instancedBuffers[PBRScalableMaterial.OffsetKind] = new Vector2(selected ? 0.5 : 0.0, 0.0);
            });
            result.push(bubble);
        }

        this._texture.update();
        return result;
    }

    private createTemplate(texture: DynamicTexture): Mesh {
        const disc = MeshBuilder.CreatePlane('Category-Template', {});
        const material = new ScalableMaterial('Category-Material', this._scene);
        const discTex = this.createDiscTexture();
        disc.material = material;
        material.setTexture('mainTex', discTex);
        disc.registerInstancedBuffer(PBRScalableMaterial.ScaleKind, 2);
        disc.registerInstancedBuffer(PBRScalableMaterial.OffsetKind, 2);
        disc.registerInstancedBuffer(VertexBuffer.ColorKind, 4);

        const textMesh = MeshBuilder.CreatePlane('Category-Text', {}, this._scene);
        const textMat = new ScalableMaterial('Category-Text-Mat', this._scene);
        textMesh.material = textMat;
        textMesh.registerInstancedBuffer(PBRScalableMaterial.ScaleKind, 2);
        textMesh.registerInstancedBuffer(PBRScalableMaterial.OffsetKind, 2);
        textMat.setTexture('mainTex', texture);
        textMat.zOffset = -1;

        textMesh.parent = disc;
        textMesh.isVisible = false;
        
        disc.isVisible = false;
        return disc;
    }

    private createDiscTexture(): Texture {
        const tex = new DynamicTexture('Disc-Tex', { width: 512, height: 256 }, this._scene, true);
        const ctx = tex.getContext();

        ctx.fillStyle = 'white';

        ctx.beginPath();
        ctx.fillStyle = 'white';
        ctx.arc(128, 128, 125, 0, Math.PI * 2);
        ctx.fill();
        ctx.closePath();

        ctx.beginPath();
        ctx.fillStyle = '#AAA';
        ctx.arc(128 + 256, 128, 125, 0, Math.PI * 2);
        ctx.fill();
        ctx.closePath();

        ctx.beginPath();
        ctx.fillStyle = 'white';
        ctx.arc(128 + 256, 128, 110, 0, Math.PI * 2);
        ctx.fill();
        ctx.closePath();

        tex.update();

        return tex;
    }
}