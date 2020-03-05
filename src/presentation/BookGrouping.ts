import { IGrouping } from './Grouper';
import { AbstractMesh, Node, Scene, Mesh, MeshBuilder, VertexBuffer, Color4, PBRMaterial, TransformNode, Vector3, Matrix } from '@babylonjs/core';
import { BookShelf } from './BookShelf';
import { BookEntry } from '../model/BookEntry';
import randomColor from 'randomcolor';

const PODEST_HEIGHT = 0.1;
export class BookGrouping extends AbstractMesh {
    private static _templatePodest: Mesh = null;

    private _group: IGrouping;
    private _books: BookEntry[];
    private _shelf: BookShelf;
    private _podest: AbstractMesh;

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
        this._shelf = new BookShelf('bookShelf', scene);
        this._shelf.parent = this;
        this._shelf.position.y = PODEST_HEIGHT;
    }

    get group() {
        return this._group;
    }

    set group(group: IGrouping) {
        this._group = group;
    }

    get books() {
        return this._books;
    }

    set books(books: BookEntry[]) {
        this._books = books;

        this._shelf.width = Math.max(1, BookShelf.CalculateOptimalWidth(books.length, this._shelf.rows));
        this._podest.scaling.x = this._podest.scaling.z = this._shelf.width * 1.5;
    }

    getBookPosition(book: BookEntry) {
        const idx = this.books.indexOf(book);
        if(idx >= 0) {
            console.log(this._shelf.getPoseMatrix());

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
                diameter: 1.0
            });
            
            const mat = new PBRMaterial("podest-mat", scene);
            mat.roughness = 0.3;
            mat.metallic = 0.5;

            this._templatePodest.material = mat;
            this._templatePodest.registerInstancedBuffer(VertexBuffer.ColorKind, 4);

            return this._templatePodest;
        } else {
            return this._templatePodest.createInstance('podest_instance');
        }
    }
}