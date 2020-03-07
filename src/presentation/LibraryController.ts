import { AbstractMesh, ActionManager, ExecuteCodeAction, Scene, Vector3 } from "@babylonjs/core";
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

export class LibraryController {
    private entries: BookEntry[];
    private entities: { [key: number]: AbstractMesh } = {};
    private initialized = false;
    private bookBuilder: BookBuilder;
    private scene: Scene;

    private hasEntered = false;

    constructor(private sceneController: SceneController) {
        this.scene = sceneController.scene;
        this.bookBuilder = new BookBuilder(this.scene);
    }

    private async onEnterLibrary() {
        document.body.classList.add("rendering");
        this.sceneController.interactive = true;

        await this.sceneController.ready;
        this.sceneController.floorMesh.transitionTo('visibility', 1.0, 1.0);
        this.sceneController.rotationSpeed = 0;
    }

    private async onLeaveLibrary() {
        document.body.classList.remove("rendering");
        this.sceneController.interactive = false;

        await this.sceneController.ready;
        this.sceneController.floorMesh.transitionTo('visibility', 0.0, 1.0);
        this.sceneController.rotationSpeed = 1;
    }

    async setEntries(books: BookEntry[]) {
        this.entries = books;

        if (!this.hasEntered) {
            await this.onEnterLibrary();
            this.hasEntered = true;
        }

        const textPanel = new BookPanel("", this.scene);
        const grouper = new Grouper(books);
        // const groupings = grouper.group(book => {
        //     return {
        //         sortKey: book.created_at.substr(0, 4),
        //         text: book.created_at.substr(0, 4)
        //     };
        // });
        const groupings = grouper.group(
            (book, i) => {
                return {
                    sortKey: Math.floor(i / 60) + "",
                    text: "#" + (Math.floor(i / 60) + 1)
                };
            },
            book => book.author_name
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
            const grouping = new BookGrouping(group[0].text, this.scene);
            const angle = (i / groupings.length) * Math.PI * 2;

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
                try {
                    const mesh = await this.bookBuilder.createMesh(book);
                    this.sceneController.shadowGenerator.addShadowCaster(mesh);

                    mesh.position = new Vector3(0, 5, 0);
                    mesh.setParent(grouping);

                    this.entities[book.id] = mesh;
                    const pos = grouping.getBookPosition(book);
                    let rot = new Vector3(0, -Math.PI * 0.5, 0);

                    mesh.transitionTo('position', pos, 1.0);
                    mesh.transitionTo('rotation', rot, 1.0);
                    
                    let actionManager = new ActionManager(this.scene);
                    mesh.actionManager = actionManager;
                    //ON MOUSE ENTER
                    mesh.actionManager.registerAction(
                        new ExecuteCodeAction(
                            ActionManager.OnPointerOverTrigger,
                            async ev => {
                                if (!focusChangeable) return;

                                if (focused) {
                                    console.log("Unfocus " + focused.name);
                                    focused.stopAnimations();
                                    focused.transitionTo('position', focusedOrigin[0], 0.2);
                                    focused.transitionTo('rotation', focusedOrigin[1], 0.2);
                                }

                                textPanel.setTarget(mesh, book);
                                focused = mesh;
                                focusChangeable = false;
                                focusedOrigin = [pos, rot];

                                console.log("Focus " + mesh.name);
                                focused.stopAnimations();
                                focused.transitionTo('position', pos.add(new Vector3(0, 0, 0.2)), 0.1);
                                focused.transitionTo('rotation', Vector3.Zero(), 0.2);
                            }
                        )
                    );
                    mesh.actionManager.registerAction(
                        new ExecuteCodeAction(
                            ActionManager.OnPointerOutTrigger,
                            async ev => {
                                focusChangeable = true;
                            }
                        )
                    );

                    success++;
                } catch (e) {
                    console.error(e);
                    fail++;
                }
            }
        }

        console.log("Success: " + success);
        console.log("Fail: " + fail);
    }
}
