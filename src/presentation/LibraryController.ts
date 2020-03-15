import { ActionManager, AssetsManager, ExecuteCodeAction, Scene, Vector3 } from "@babylonjs/core";
// import "@babylonjs/core/Debug/debugLayer";
// import '@babylonjs/gui';
// import '@babylonjs/inspector';
import "@babylonjs/loaders/glTF";
import { BookEntry } from "../model/BookEntry";
import { BookEntity } from './entities/BookEntity';
import { BookGrouping } from "./entities/BookGrouping";
import { BookPanel } from './entities/BookPanel';
import { SceneController } from './SceneController';
import { SelectionManager } from './SelectionManager';
import './util/AnimationHelper';
import { BookBuilder } from "./util/BookBuilder";
import { Grouper } from "./util/Grouper";
import { MemoryPool } from './util/MemoryPool';
import { PromiseUtil } from './util/PromiseUtil';
import { uniq } from 'lodash';
import { Categories, CategoryBuilder } from './util/CategoryBuilder';
import { CategoryBubble } from './entities/CategoryBubble';
import { BillboardBehavior } from './behaviors/BillboardBehavior';


export class LibraryController {
    private _entries: BookEntry[];
    private _initialized = false;
    private _bookBuilder: BookBuilder;
    private _scene: Scene;
    private _grouper: Grouper;
    private _user: string;
    private _textPanel: BookPanel;
    private _groupingPool: MemoryPool<BookGrouping>;
    private hasEntered = false;

    constructor(private sceneController: SceneController, private _selectionManager: SelectionManager) {
        this._scene = sceneController.scene;
        this._bookBuilder = new BookBuilder(this._scene, this.sceneController.shadowGenerator);
        this._textPanel = new BookPanel("", this._scene);
        this._grouper = new Grouper();
        this._groupingPool = new MemoryPool<BookGrouping>(() => new BookGrouping("Grouping", this._scene));

        this._selectionManager.onFocusChanged.subscribe(target => {
            this._textPanel.setTarget(target as BookEntity);
        });

        let selected: CategoryBubble = null;
        const bubbles = new CategoryBuilder(this._scene).build();
        for(let [i, bubble] of bubbles.entries()) {
            const rad = Math.PI * 0.5 - (i * Math.PI * 0.1);
            bubble.mesh.position = new Vector3(
                Math.cos(rad) * 15,
                8,
                Math.sin(rad) * 15
            );
            bubble.mesh.scaling = new Vector3(3,3,3);
            bubble.mesh.addBehavior(new BillboardBehavior());

            bubble.onPicked.subscribe(_ => {
                if(selected) {
                    selected.selected = false;
                }
                selected = bubble;
                if(selected) {
                    selected.selected = true;
                }
            });
        }
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

        for(let entity of entities) {
            let actionManager = new ActionManager(entity.mesh.getScene());
            entity.mesh.actionManager = actionManager;

            let hovered = false;
            //ON MOUSE ENTER
            entity.mesh.actionManager.registerAction(
                new ExecuteCodeAction(
                    ActionManager.OnPointerOverTrigger,
                    () => {
                        hovered = true;
                        this._selectionManager.setFocused(entity);
                    }
                )
            );
            entity.mesh.actionManager.registerAction(
                new ExecuteCodeAction(
                    ActionManager.OnPointerOutTrigger, 
                    () => { this._selectionManager.setUnfocused(entity) }
                )
            );
            entity.mesh.actionManager.registerAction(
                new ExecuteCodeAction(
                    ActionManager.OnPickTrigger, 
                    (e) => {
                        if(e.sourceEvent?.pointerType === 'mouse' || !hovered) {
                            this._selectionManager.setSelection(entity) 
                        }
                        hovered = false;
                    }
                )
            );
        }

        this._grouper.setEntries(entities);
        this._groupingPool.prewarm(10);
    }

    
    async show() {
        if (!this.hasEntered) {
            await this.onEnterLibrary();
            this.hasEntered = true;
        }

        const groupings = Categories[0].apply(this._grouper);
        const radius = Math.max(1, this._entries.length * 0.006);
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

            for (let book of group[1]) {
                await PromiseUtil.Delay(10);

                try {
                    const entity = book as BookEntity;
                    const mesh = entity.mesh;

                    mesh.position = new Vector3(0, 5, 0);
                    mesh.isVisible = true;
                    mesh.setParent(grouping);
                    entity.setTarget(
                        grouping.getBookPosition(book), 
                        new Vector3(0, -Math.PI * 0.5, 0)
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
