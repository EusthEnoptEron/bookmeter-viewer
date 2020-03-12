import { AbstractMesh, ActionManager, ExecuteCodeAction, Scene, Vector3, MeshBuilder, Texture, AssetsManager } from "@babylonjs/core";
// import "@babylonjs/core/Debug/debugLayer";
// import '@babylonjs/gui';
// import '@babylonjs/inspector';
import "@babylonjs/loaders/glTF";
import { BookEntry } from "../model/BookEntry";
import { BookGrouping } from "./entities/BookGrouping";
import { SceneController } from './SceneController';
import { BookBuilder } from "./util/BookBuilder";
import { Grouper } from "./util/Grouper";
import  './util/AnimationHelper';
import { BookPanel } from './entities/BookPanel';
import { BookEntity } from './entities/BookEntity';
import { AtlasBase } from './materials/AtlasBase';
import { BackendClient } from '../backend/BackendClient';
import { PromiseUtil } from './util/PromiseUtil';
import { MemoryPool } from './util/MemoryPool';
import { SelectionManager } from './SelectionManager';

export class LibraryController {
    private _entries: BookEntry[];
    private _initialized = false;
    private _bookBuilder: BookBuilder;
    private _scene: Scene;
    private _grouper: Grouper;
    private _user: string;
    private _textPanel: BookPanel;
    private _groupingPool: MemoryPool<BookGrouping>;
    private _selectionManager = new SelectionManager();
    private hasEntered = false;

    constructor(private sceneController: SceneController) {
        this._scene = sceneController.scene;
        this._bookBuilder = new BookBuilder(this._scene, this.sceneController.shadowGenerator);
        this._textPanel = new BookPanel("", this._scene);
        this._grouper = new Grouper();
        this._groupingPool = new MemoryPool<BookGrouping>(() => new BookGrouping("Grouping", this._scene));
    }

    private async onEnterLibrary() {
        document.body.classList.add("playing");
        this.sceneController.interactive = true;

        await this.sceneController.ready;
        this.sceneController.floorMesh.transitionTo('visibility', 1.0, 1.0);
        this.sceneController.rotationSpeed = 0;

        await new Promise((r) => window.setTimeout(r,1000));
    }

    private async onLeaveLibrary() {
        document.body.classList.remove("playing");
        this.sceneController.interactive = false;

        await this.sceneController.ready;
        this.sceneController.floorMesh.transitionTo('visibility', 0.0, 1.0);
        this.sceneController.rotationSpeed = 1;
    }

    async setEntries(user: string, books: BookEntry[]) {
        this._entries = books;
        this._user = user;

        const meshes = await this._bookBuilder.createMeshes(books, user);
        const entities = books.map((book, i) => new BookEntity(book, meshes[i]));

        this._grouper.setEntries(entities);
        this._groupingPool.prewarm(10);
    }

    
    async show() {
        if (!this.hasEntered) {
            await this.onEnterLibrary();
            this.hasEntered = true;
        }

        AssetsManager
        // const groupings = grouper.group(book => {
        //     return {
        //         sortKey: book.created_at.substr(0, 4),
        //         text: book.created_at.substr(0, 4)
        //     };
        // });
        const groupings = this._grouper.chunk(
            60,
            books => {
                return books[0].author_name + " ... " + books[books.length - 1].book.author.name;
            },
            book => book.book.author.name
        );

        const radius = 2.5;
        let focused: AbstractMesh = null;
        let focusedOrigin: [Vector3, Vector3];
        let focusChangeable = true;
        let counter = 0;
        let success = 0;
        let fail = 0;

        for (let i = 0; i < groupings.length; i++) {
            const group = groupings[i];
            const grouping = this._groupingPool.spawn();
            const angle = -(i / groupings.length) * Math.PI * 2 + Math.PI * 0.5;

            this.sceneController.shadowGenerator.addShadowCaster(grouping);

            grouping.position = new Vector3(
                Math.cos(angle) * radius,
                0.0,
                Math.sin(angle) * radius
            );
            grouping.lookAt(Vector3.Zero());
            grouping.group = group[0];
            grouping.books = group[1];

            for (let book of grouping.books) {
                await PromiseUtil.Delay(10);

                try {
                    const entity = book as BookEntity;
                    const mesh = entity.mesh;

                    mesh.position = new Vector3(0, 5, 0);
                    mesh.isVisible = true;
                    mesh.setParent(grouping);

                    const pos = grouping.getBookPosition(book);
                    let rot = new Vector3(0, -Math.PI * 0.5, 0);

                    entity.setTarget(pos, rot);
                
                    let actionManager = new ActionManager(this._scene);
                    mesh.actionManager = actionManager;
                    //ON MOUSE ENTER
                    mesh.actionManager.registerAction(
                        new ExecuteCodeAction(
                            ActionManager.OnPointerOverTrigger,
                            () => this._selectionManager.setFocused(entity)
                        )
                    );
                    mesh.actionManager.registerAction(
                        new ExecuteCodeAction(
                            ActionManager.OnPointerOutTrigger, 
                            () => { this._selectionManager.setUnfocused(entity) }
                        )
                    );

                    success++;
                } catch (e) {
                    console.error(e);
                    fail++;
                }
            }
        }

        // this.bookBuilder.applyAllAtlases();

        console.log("Success: " + success);
        console.log("Fail: " + fail);
    }
}
