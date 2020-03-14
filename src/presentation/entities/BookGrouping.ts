import { IGrouping } from '../util/Grouper';
import { AbstractMesh, Node, Scene, Mesh, MeshBuilder, VertexBuffer, Color4, PBRMaterial, TransformNode, Vector3, Matrix, PBRMetallicRoughnessMaterial, Texture, Vector4 } from '@babylonjs/core';
import { BookShelf } from './BookShelf';
import { BookEntry } from '../../model/BookEntry';
import randomColor from 'randomcolor';
import { Label } from './Label';
import { AssetRegistry } from '../util/AssetRegistry';

const PODEST_HEIGHT = 0.1;
const MARBLE_TEXTURE_PATH = "/assets/textures/Marble012_2K";

export class BookGrouping extends AbstractMesh {
    private static _templatePodest: Mesh = null;

    private _group: IGrouping;
    private _books: BookEntry[];
    private _shelf: BookShelf;
    private _podest: AbstractMesh;
    private _label: Label;

    constructor(name: string, scene: Scene)  {
        super(name, scene);

        // Set up podest
        const color = randomColor({ format: 'rgbArray' }) as any;
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

    set books(books: BookEntry[]) {
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
        
        this._shelf.width = Math.max(1, BookShelf.CalculateOptimalWidth(this._books.length, this._shelf.rows));
        this._podest.scaling.x = this._podest.scaling.z = this._shelf.width * 1.5;
        this._label.scaling.x = this._shelf.width - 0.03;
    }

    getBookPosition(book: BookEntry) {
        const idx = this.books.indexOf(book);
        if(idx >= 0) {
            return this._shelf.position.add(this._shelf.getBookPosition(idx));
        } else {
            return Vector3.Zero();
        }
    }

    getAbsoluteBookPosition(book: BookEntry) {
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
            mat.baseTexture = AssetRegistry.Instance.marbleColorTexture;;
            mat.metallicRoughnessTexture =  AssetRegistry.Instance.marbleRoughnessTexture;

            this._templatePodest.material = mat;
            this._templatePodest.receiveShadows = true;
            this._templatePodest.registerInstancedBuffer(VertexBuffer.ColorKind, 4);

            return this._templatePodest;
        } else {
            return this._templatePodest.createInstance('podest_instance');
        }
    }

}