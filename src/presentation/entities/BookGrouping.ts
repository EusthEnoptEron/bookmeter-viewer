import { AbstractMesh, Color4, Mesh, MeshBuilder, PBRMetallicRoughnessMaterial, Scene, Vector3, Vector4, VertexBuffer } from '@babylonjs/core';
import TWEEN from '@tweenjs/tween.js';
import randomColor from 'randomcolor';
import { v4 as uuid } from 'uuid';
import { AssetRegistry } from '../util/AssetRegistry';
import { IGrouping } from '../util/Grouper';
import { MemoryPool } from '../util/MemoryPool';
import { BookEntity } from './BookEntity';
import { BookSeparator } from './BookSeparator';
import { BookShelf } from './BookShelf';
import { Label } from './Label';

const PODEST_HEIGHT = 0.1;

export class BookGrouping extends AbstractMesh {
    private static _templatePodest: Mesh = null;

    private _group: IGrouping;
    private _books: (BookEntity | BookSeparator)[];
    private _shelf: BookShelf;
    private _podest: AbstractMesh;
    private _label: Label;
    private _id = uuid();
    width: number = 1.0;

    constructor(name: string, scene: Scene, private _separatorPool: MemoryPool<BookSeparator>)  {
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
        for(let entity of this._books) {
            if (entity instanceof BookEntity) {
                entity.mesh.setParent(null);
                entity.setTarget(
                    new Vector3(Math.random(), Math.random() + 4, Math.random()),
                    new Vector3(
                        Math.random() * Math.PI * 2, 
                        Math.random() * Math.PI * 2, 
                        Math.random() * Math.PI * 2
                    )
                )
            } else if(entity instanceof BookSeparator) {
                this._separatorPool.despawn(entity);
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

    private spawnSeparator(position: number, text: string) {

        const separator = this._separatorPool.spawn();

        separator.text = text;
        separator.parent = this;
        separator.mesh.isVisible = true;
        separator.scaling.y = 0.0;
        separator.rotation = new Vector3(0, Math.PI, 0);

        this._books.splice(position, 0, separator);
    }

    set books(books: BookEntity[]) {
        this._books = [...books];

        if(this.group.skipKeyExtractor != null) {
            let prevKey: string = this.group.skipKeyExtractor(books[0]);
            this.spawnSeparator(0, prevKey);
            let offset = 1;

            for(let i = 1; i < books.length; i++) {
                let key = this.group.skipKeyExtractor(books[i]);

                if(key != prevKey) {
                    this.spawnSeparator(i + offset, key);
                    offset++;
                    prevKey = key;
                }
            }
        } else {
            console.log("No keys...");
        }
        
        this.width = Math.max(0.4, BookShelf.CalculateOptimalWidth(this._books.length, this._shelf.rows));

        const seps = this._books.filter(b => b instanceof BookSeparator) as BookSeparator[];
        const showSeparators = new TWEEN.Tween({ w: 0 })
            .to({w: 1}, 200)
            .onStart(() => {
                for(let [i, entity] of this._books.entries()) {
                    if(entity instanceof BookSeparator) {
                        entity.position = this._shelf.position.add(this._shelf.getBookPosition(i));
                    }
                }
            })
            .onUpdate((vals) => {
                for(let sep of seps) {
                    sep.scaling.y = vals.w;
                }
            });

        new TWEEN.Tween({ width: this._shelf.width })
            .to({ width: this.width}, 200)
            .onTarget(this._shelf)
            .withId(this._id)
            .chain(showSeparators)
            .start();

        this._podest.scaling.x = this._podest.scaling.z = this.width * 1.5;
        this._label.scaling.x = this.width - 0.03;
    }

    getBookPosition(book: BookEntity) {
        const idx = this._books.indexOf(book);
        if(idx >= 0) {
            return this._shelf.position.add(this._shelf.getBookPosition(idx));
        } else {
            return Vector3.Zero();
        }
    }

    getAbsoluteBookPosition(book: BookEntity) {
        const idx = this._books.indexOf(book);
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
            mat.freeze();

            this._templatePodest.material = mat;
            this._templatePodest.receiveShadows = true;
            this._templatePodest.registerInstancedBuffer(VertexBuffer.ColorKind, 4);

            return this._templatePodest;
        } else {
            return this._templatePodest.createInstance('podest_instance');
        }
    }

}