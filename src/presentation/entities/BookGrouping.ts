import { IGrouping } from '../util/Grouper';
import { AbstractMesh, Node, Scene, Mesh, MeshBuilder, VertexBuffer, Color4, PBRMaterial, TransformNode, Vector3, Matrix, PBRMetallicRoughnessMaterial, Texture, Vector4 } from '@babylonjs/core';
import { BookShelf } from './BookShelf';
import randomColor from 'randomcolor';
import { Label } from './Label';
import { AssetRegistry } from '../util/AssetRegistry';
import { BookEntity } from './BookEntity';
import { v4 as uuid } from 'uuid';
import TWEEN from '@tweenjs/tween.js';

const PODEST_HEIGHT = 0.1;

export class BookGrouping extends AbstractMesh {
    private static _templatePodest: Mesh = null;

    private _group: IGrouping;
    private _books: BookEntity[];
    private _shelf: BookShelf;
    private _podest: AbstractMesh;
    private _label: Label;
    private _id = uuid();
    width: number = 1.0;

    constructor(name: string, scene: Scene)  {
        super(name, scene);

        // Set up podest
        const color = randomColor({ format: 'rgbArray', luminosity: 'light' }) as any;
        console.log(color);
        this._podest = BookGrouping.CreatePodest(scene);
        this._podest.parent = this;
        this._podest.position.y = PODEST_HEIGHT * 0.5;
        this._podest.instancedBuffers[VertexBuffer.ColorKind] = new Color4(
            color[0] / 255,
            color[1] / 255,
            color[2] / 255,
            1.0
        );

        // Set up book shelf
        this._shelf = new BookShelf('bookShelf', scene, undefined, undefined, undefined, undefined, 0.25);
        this._shelf.parent = this;
        this._shelf.position.y = PODEST_HEIGHT;

        this._label = new Label(`${name}_label`, scene, "", { width: 1, height: 0.25, baseTexture:  AssetRegistry.Instance.woodColorTexture });
        // this._label.position.z += 0.5;
        // this._label.position.y += PODEST_HEIGHT + 0.125;
        // this._label.lookAt(new Vector3(0, -1, -1));
        this._label.lookAt(new Vector3(0, 0, -1));

        this._label.position.y += PODEST_HEIGHT + 0.125;
        this._label.position.z += 0.1;

        this._label.parent = this;
    }

    hurlOutBooks() {
        for(let book of this._books) {
            if (book) {
                book.mesh.setParent(null);
                book.setTarget(
                    new Vector3(Math.random(), Math.random() + 4, Math.random()),
                    new Vector3(
                        Math.random() * Math.PI * 2, 
                        Math.random() * Math.PI * 2, 
                        Math.random() * Math.PI * 2
                    )
                )
            }
        }

        this._books.length = 0;
    }

    get group() {
        return this._group;
    }

    set group(group: IGrouping) {
        this._group = group;
        this._label.setText(group.text);
    }

    get books() {
        return this._books;
    }

    set books(books: BookEntity[]) {
        this._books = [...books];

        if(this.group.skipKeyExtractor != null) {
            let prevKey: string = this.group.skipKeyExtractor(this._books[0]);

            for(let i = 1; i < this._books.length; i++) {
                let key = this.group.skipKeyExtractor(this._books[i]);

                if(key != prevKey) {
                    this._books.splice(i, 0, null);
                    i++;

                    prevKey = key;
                }
            }
        }
        
        this.width = Math.max(0.4, BookShelf.CalculateOptimalWidth(this._books.length, this._shelf.rows));
        new TWEEN.Tween({ width: this._shelf.width })
            .to({ width: this.width}, 200)
            .onTarget(this._shelf)
            .withId(this._id)
            .start();

        this._podest.scaling.x = this._podest.scaling.z = this.width * 1.5;
        this._label.scaling.x = this.width - 0.03;
    }

    getBookPosition(book: BookEntity) {
        const idx = this.books.indexOf(book);
        if(idx >= 0) {
            return this._shelf.position.add(this._shelf.getBookPosition(idx));
        } else {
            return Vector3.Zero();
        }
    }

    getAbsoluteBookPosition(book: BookEntity) {
        const idx = this.books.indexOf(book);
        if(idx >= 0) {
            return this._shelf.getAbsoluteBookPosition(idx);
        } else {
            return Vector3.Zero();
        }
    }

    private static CreatePodest(scene: Scene) {
        if(this._templatePodest == null) {
            this._templatePodest = MeshBuilder.CreateCylinder('podest', {
                height: PODEST_HEIGHT,
                diameter: 1.0,
                tessellation: 50,
                faceUV: [
                    new Vector4(0, 0, 1, 1),
                    new Vector4(0, 0, 20, 1),
                    new Vector4(0, 0, 1, 1),
                ]
            });
            
            const mat = new PBRMetallicRoughnessMaterial("Marble_Mat", scene);
            mat.baseTexture = AssetRegistry.Instance.plasticColorTexture;;
            mat.metallicRoughnessTexture =  AssetRegistry.Instance.plasticRoughnessTexture;
            mat.normalTexture =  AssetRegistry.Instance.plasticNormalTexture;

            this._templatePodest.material = mat;
            this._templatePodest.receiveShadows = true;
            this._templatePodest.registerInstancedBuffer(VertexBuffer.ColorKind, 4);

            return this._templatePodest;
        } else {
            return this._templatePodest.createInstance('podest_instance');
        }
    }

}