import { ActionManager, ExecuteCodeAction, Scene, Vector3, SceneOptimizer, SceneOptimizerOptions, ShadowsOptimization, ParticlesOptimization, TextureOptimization, RenderTargetsOptimization, HardwareScalingOptimization } from "@babylonjs/core";
// import "@babylonjs/core/Debug/debugLayer";
// import '@babylonjs/gui';
// import '@babylonjs/inspector';
import "@babylonjs/loaders/glTF";
import { max } from 'lodash';
import { BookEntry } from "../model/BookEntry";
import { BillboardBehavior } from './behaviors/BillboardBehavior';
import { BookEntity } from './entities/BookEntity';
import { BookGrouping } from "./entities/BookGrouping";
import { BookPanel } from './entities/BookPanel';
import { BookSeparator, BookSeparatorBuilder } from './entities/BookSeparator';
import { CategoryBubble } from './entities/CategoryBubble';
import { SceneController } from './SceneController';
import { SelectionManager } from './SelectionManager';
import './util/AnimationHelper';
import { BookBuilder } from "./util/BookBuilder";
import { Category } from './util/Category';
import { CategoryBuilder } from './util/CategoryBuilder';
import { Grouper } from "./util/Grouper";
import { MemoryPool } from './util/MemoryPool';
import { PromiseUtil } from './util/PromiseUtil';
import { BehaviorSubject } from 'rxjs';


export class LibraryController {
    private _entries = new BehaviorSubject<BookEntry[]>([]);
    private _entities: BookEntity[] = [];
    private _initialized = false;
    private _bookBuilder: BookBuilder;
    private _scene: Scene;
    private _grouper: Grouper;
    private _user: string;
    private _textPanel: BookPanel;
    private _groupingPool: MemoryPool<BookGrouping>;
    private _separatorPool: MemoryPool<BookSeparator>;
    private hasEntered = false;

    private _selectedCategory: CategoryBubble;
    private _bubbles: CategoryBubble[];
    private _groupings: BookGrouping[] = [];
    private _abortController: AbortController;

    constructor(private sceneController: SceneController, private _selectionManager: SelectionManager) {
        this._scene = sceneController.scene;
        this._bookBuilder = new BookBuilder(this._scene, this.sceneController.shadowGenerator);
        this._textPanel = new BookPanel("", this._scene);
        this._grouper = new Grouper();
        this._groupingPool = new MemoryPool<BookGrouping>(() => { 
            const instance = new BookGrouping("Grouping", this._scene, this._separatorPool);
            this.sceneController.shadowGenerator.addShadowCaster(instance);
            return instance;
        });

        this._separatorPool = new MemoryPool<BookSeparator>(() => {
            return BookSeparatorBuilder.CreateSeparator(this._scene);
        });

        this._selectionManager.onFocusChanged.subscribe(target => {
            this._textPanel.setTarget(target as BookEntity);
        });
    }

    private setupCategories() {
        this._bubbles = new CategoryBuilder(this._scene).build();
        const offset = this._bubbles.length * 0.5 * Math.PI * 0.1;
        for(let [i, bubble] of this._bubbles.entries()) {
            const rad = Math.PI * 0.5 - (i * Math.PI * 0.1) + offset;
            bubble.mesh.position = new Vector3(
                Math.cos(rad) * 15,
                8,
                Math.sin(rad) * 15
            );
            bubble.mesh.scaling = new Vector3(3,3,3);
            bubble.mesh.setEnabled(false);
            bubble.mesh.addBehavior(new BillboardBehavior());
            
            bubble.onPicked.subscribe(_ => {
                if(bubble.selected) {
                    return;
                }

                if(this._selectedCategory) {
                    this._selectedCategory.selected = false;
                }
                this._selectedCategory = bubble;
                if(this._selectedCategory) {
                    this._selectedCategory.selected = true;
                }

                this.onCategoryChanged(this._selectedCategory.category);
            });
        }

        this._selectedCategory = this._bubbles[0];
        this._bubbles[0].selected = true;
    }

    private async onEnterLibrary() {
        if(!this._initialized) {
            this.setupCategories();
            this._initialized = true;
        }
        
        document.body.classList.add("playing");
        this.sceneController.interactive = true;

        await this.sceneController.ready;
        this.sceneController.floorMesh.transitionTo('visibility', 1.0, 1.0);
        this.sceneController.rotationSpeed = 0;

        this._bubbles.forEach(bubble => bubble.mesh.setEnabled(true));

        await new Promise((r) => window.setTimeout(r,1000));
    }

    private async onLeaveLibrary() {
        document.body.classList.remove("playing");
        this.sceneController.interactive = false;

        await this.sceneController.ready;
        this.sceneController.floorMesh.transitionTo('visibility', 0.0, 1.0);
        this.sceneController.rotationSpeed = 1;

        this._bubbles.forEach(bubble => bubble.mesh.setEnabled(false));
    }

    onEntries() {
        return this._entries.asObservable();
    }

    clearEntries() {
        if(this._entries.value.length == 0) {
            return;
        }

        this._entries.next([]);
        this._grouper.setEntries([]);

        for(let book of this._entities) {
            book.mesh.dispose();
        }
    }

    async setEntries(user: string, books: BookEntry[]) {
        this._entries.next(books);
        this._user = user;

        const meshes = await this._bookBuilder.createMeshes(books, user);
        const entities = this._entities = books.map((book, i) => new BookEntity(book, meshes[i]));

        for(let entity of entities) {
            const localEntity = entity;
            let actionManager = new ActionManager(entity.mesh.getScene());
            entity.mesh.position = new Vector3(0, 5, 0);
            entity.mesh.actionManager = actionManager;
            let hovered = false;

            //ON MOUSE ENTER
            entity.mesh.actionManager.registerAction(
                new ExecuteCodeAction(
                    ActionManager.OnPointerOverTrigger,
                    () => {
                        hovered = true;
                        this._selectionManager.setFocused(localEntity);
                    }
                )
            );
            entity.mesh.actionManager.registerAction(
                new ExecuteCodeAction(
                    ActionManager.OnPointerOutTrigger, 
                    () => { 
                        hovered = false;
                        this._selectionManager.setUnfocused(localEntity) 
                    }
                )
            );
            entity.mesh.actionManager.registerAction(
                new ExecuteCodeAction(
                    ActionManager.OnLeftPickTrigger, 
                    (e) => {
                        // LeftPick is sometimes called before OnPointerOver on mobile...
                        if(localEntity.isInMotion || !hovered) {
                            return;
                        }

                        this._selectionManager.setSelection(localEntity) 
                    }
                )
            );
        }

        this._grouper.setEntries(entities);
        this._groupingPool.prewarm(10);
        this._separatorPool.prewarm(10);
    }

    async onCategoryChanged(category: Category) {
        this.show();
    }
    
    async hide() {
        if(!this.hasEntered) {
            return;
        }

        if(this._abortController) {
            this._abortController.abort();
        }

        await this.onLeaveLibrary();
        this.hasEntered = false;

        for(let grouping of this._groupings) {
            grouping.hurlOutBooks();
            this._groupingPool.despawn(grouping);
        }
    }

    async show() {
        if(this._abortController) {
            this._abortController.abort();
        }

        this._abortController = new AbortController();
        this._show(this._abortController.signal);
    }

    private async _show(signal: AbortSignal) {
        if (!this.hasEntered) {
            await this.onEnterLibrary();
            this.hasEntered = true;
        }

        if(signal.aborted) return;

        for(let grouping of this._groupings) {
            grouping.hurlOutBooks();
            this._groupingPool.despawn(grouping);
        }

        this._groupings = [];
        const groupings = this._selectedCategory.category.apply(this._grouper);
        // const radius = Math.max(1, this._entries.length * 0.006);
        let success = 0;
        let fail = 0; 

        groupings.forEach((group, i) => {
            const grouping = this._groupingPool.spawn();
            this._groupings.push(grouping);
            
            grouping.group = group[0];
            grouping.books = group[1];
        });

        const maxWidth = max(this._groupings.map(g => g.width)) * 1.5;
        const radius = Math.min(14, maxWidth * 0.5 / Math.sin(Math.PI / this._groupings.length));

        this._groupings.forEach((grouping, i) => {
            const angle = -(i / groupings.length) * Math.PI * 2 + Math.PI * 0.5;
            const pos = new Vector3(
                Math.cos(angle) * radius,
                0.001,
                Math.sin(angle) * radius
            );
            const rot = (i / groupings.length) * Math.PI * 2 + Math.PI;

            grouping.unfreezeWorldMatrix();
            if(grouping.position.length() == 0) {
                grouping.position = pos;
                grouping.rotation.y = rot;
            } else {
                grouping.transitionTo('position', pos, 0.2);
                grouping.transitionTo('rotation.y', rot, 0.2).onAnimationEndObservable.add(() => {
                    grouping.freezeWorldMatrix();
                });
            }
           
        })

        await PromiseUtil.Delay(600);
        if(signal.aborted) return;

        groupings.forEach(async (group, i) => {
            for (let book of group[1]) {
                await PromiseUtil.Delay(10);
                if(signal.aborted) return;

                try {
                    const entity = book;
                    const mesh = entity.mesh;

                    // mesh.position = new Vector3(0, 5, 0);
                    mesh.isVisible = true;
                    mesh.setParent(this._groupings[i]);
                    entity.setTarget(
                        this._groupings[i].getBookPosition(book), 
                        new Vector3(0, -Math.PI * 0.5, 0)
                    );
                
                    success++;
                } catch (e) {
                    console.error(e);
                    fail++;
                }
            }
        });

       
        await PromiseUtil.Delay(max(groupings.map(g => g.length)) * 10 + 1000);

        console.log("Initiate optimization...");
        SceneOptimizer.OptimizeAsync(this._scene, this.getSceneOptimizations(), () => {
            console.log("Optimization successful...");
        }, () => {
            console.error("Optimization failed...");
        });

    }

    private getSceneOptimizations() {
        var result = new SceneOptimizerOptions(30, 2000);

        var priority = 0;
        result.optimizations.push(new ShadowsOptimization(priority));

        // Next priority
        priority++;
        result.optimizations.push(new ParticlesOptimization(priority));

        // Next priority
        priority++;
        result.optimizations.push(new TextureOptimization(priority, 1024));

        // Next priority
        priority++;
        result.optimizations.push(new RenderTargetsOptimization(priority));
        result.optimizations.push(new TextureOptimization(priority, 512));


        // Next priority
        priority++;
        result.optimizations.push(new HardwareScalingOptimization(priority, 4, 2));

        return result;
    }
}
