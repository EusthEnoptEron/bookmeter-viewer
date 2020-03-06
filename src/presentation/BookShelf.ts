import {
    Scene,
    Mesh,
    BoxBuilder,
    MeshBuilder,
    PBRMetallicRoughnessMaterial,
    Texture,
    Vector3,
    AbstractMesh,
    Node,
    TransformNode
} from "@babylonjs/core";

import { PBRScalableMaterial } from "./materials/PBRScalableMaterial";
import { Constants } from './Constants';
const TEXTURE_PATH = "/assets/textures/Wood37";

export class BookShelf extends AbstractMesh {
    private static _Material: PBRScalableMaterial;

    private _plates: AbstractMesh[] = [];
    private _leftSide: AbstractMesh;
    private _rightSide: AbstractMesh;
    private _backSide: AbstractMesh;

    private _template: Mesh = null;

    constructor(
        name: string,
        private scene: Scene,
        private _width: number = 1.0,
        private _height: number = 2.0,
        private _depth: number = 0.3,
        private _thickness: number = 0.03,
        private _offset = .15,
        plateCount: number = 5
    ) {
        super(name, scene);

        this._backSide = this.createBlock("Shelf_Back");
        this._leftSide = this.createBlock("Shelf_Left");
        this._rightSide = this.createBlock("Shelf_Right");

        for (let i = 0; i < plateCount; i++) {
            this._plates.push(this.createBlock(`Shelf_Plate-${i}`));
        }

        this.fit();
    }

    private fit() {
        this._leftSide.scaling = new Vector3(this._thickness, this._height, this._depth);
        this._leftSide.position.y = 1.0;
        this._leftSide.position.x = -this._width * 0.5 + this._thickness * 0.5;

        this._backSide.position.y = 1.0;
        this._backSide.position.z = -this._depth * 0.5 + this._thickness * 0.5;
        this._backSide.scaling = new Vector3(
            this._width - this._thickness * 2,
            this._height,
            this._thickness
        );

        this._rightSide.scaling = new Vector3(this._thickness, this._height, this._depth);
        this._rightSide.position.y = 1.0;
        this._rightSide.position.x = this._width * 0.5 - this._thickness * 0.5;

        this._plates.forEach((plate, i) => {
            plate.scaling.y = this._thickness;
            plate.scaling.x = this._width - this._thickness * 2;
            plate.scaling.z = this._depth - this._thickness;
            
            plate.position.y = i * ((this._height - this._offset - this._thickness) / (this._plates.length - 1)) + this._offset;
        });
    }

    private createBlock(name: string): AbstractMesh {
        if(this._template == null) {
            this._template = MeshBuilder.CreateTiledBox(name, {
                depth: 1.0,
                width: 1.0,
                height: 1.0,
                tileSize: 0.7
            });

            this._template.material = this.getMaterial();
            this._template.parent = this;
            this._template.receiveShadows = true;
            return this._template;
        }

        const instance = this._template.createInstance(name);
        instance.parent = this;

        return instance;
    }

    static CalculateOptimalWidth(bookCount: number, rowCount: number) {
        const booksPerRow = Math.ceil(bookCount / rowCount);
        return BookShelf.SpacePerBook * booksPerRow + 0.1;
    }

    get rows() {
        return this._plates.length - 1;
    }

    get width() {
        return this._width;
    }

    set width(width: number) {
        this._width = width;
        this.fit();
    }

    get effectiveWidth() {
        return this.width - this._thickness * 2;
    }

    private static get SpacePerBook() {
        return (Constants.BOOK_THICKNESS + 0.01);
    }

    private get spacePerRow() {
        return Math.floor(this.effectiveWidth / BookShelf.SpacePerBook);
    }

    get bookCount(): number {
        return this.spacePerRow * (this._plates.length - 1);
    }

    getBookPosition(no: number): Vector3 {
        const col = no % this.spacePerRow;
        const row = this.rows - Math.floor(no / this.spacePerRow) - 1;

        const pos = new Vector3(
            this.effectiveWidth * 0.5 - col * BookShelf.SpacePerBook - BookShelf.SpacePerBook * 0.5,
            this._plates[row].position.y + this._thickness * 0.5 + Constants.BOOK_HEIGHT * 0.5,
            -this._depth * 0.5 + this._thickness + Constants.BOOK_WIDTH * 0.5
        );

        return pos;
    }

    getAbsoluteBookPosition(no: number): Vector3 {
        return Vector3.TransformCoordinates(this.getBookPosition(no), this.getWorldMatrix());
    }

    private getMaterial(): PBRMetallicRoughnessMaterial {
        const mat = new PBRMetallicRoughnessMaterial("Box_Mat", this.scene);
        mat.baseTexture = new Texture(`${TEXTURE_PATH}_col.jpg`, this.scene);
        mat.normalTexture = new Texture(`${TEXTURE_PATH}_nrm.jpg`, this.scene);
        mat.metallicRoughnessTexture = new Texture(
            `${TEXTURE_PATH}_rghMtl.jpg`,
            this.scene
        );

        return mat;
    }
}
