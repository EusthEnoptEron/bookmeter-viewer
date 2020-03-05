import {
    AbstractMesh,
    ActionManager,
    AmmoJSPlugin,
    Animation,
    Color3,
    CubeTexture,
    DirectionalLight,
    Engine,
    ExecuteCodeAction,
    FreeCamera,
    MeshBuilder,
    PBRMetallicRoughnessMaterial,
    PhysicsImpostor,
    Scene,
    ShadowGenerator,
    Tools,
    Vector3,
    PBRMaterial,
    VertexData
} from "@babylonjs/core";

// import cannon from 'cannon';
import ammojs from "ammojs-typed";
import { groupBy, sortBy } from "lodash";
import { BookEntry } from "../model/BookEntry";
import { BookBuilder } from "./BookBuilder";
import { CustomEngine } from "./CustomEngine";

// import "@babylonjs/core/Debug/debugLayer";
// import '@babylonjs/gui';
// import '@babylonjs/inspector';
import "@babylonjs/loaders/glTF";
import { BookShelf } from './BookShelf';

export class LibraryController {
    private entries: BookEntry[];
    private entities: { [key: number]: AbstractMesh } = {};
    private initialized = false;
    private engine: Engine;
    private scene: Scene;
    private shadowGenerator: ShadowGenerator;
    private bookBuilder: BookBuilder;

    constructor(private canvas: HTMLCanvasElement) {
        window.addEventListener("resize", () => this.onResize());
    }

    private init() {
        Tools.UseFallbackTexture = false;

        this.canvas.classList.add("active");
        this.engine = new CustomEngine(this.canvas, true);
        const gravityVector = new Vector3(0, -9.81, 0);
        // const physicsPlugin = new CannonJSPlugin(null, null, cannon);
        const physicsPlugin = new AmmoJSPlugin(null, ammojs);

        this.scene = new Scene(this.engine);
        this.scene.enablePhysics(gravityVector, physicsPlugin);

        // Setup camera
        const camera = new FreeCamera(
            "camera",
            new Vector3(0, 2.0, -10),
            this.scene
        );
        camera.keysDown.push("S".charCodeAt(0));
        camera.keysUp.push("W".charCodeAt(0));
        camera.keysLeft.push("A".charCodeAt(0));
        camera.keysRight.push("D".charCodeAt(0));
        camera.ellipsoid = new Vector3(0.5, .8, 0.5);
        camera.checkCollisions = true;
        camera.applyGravity = true;
        camera.speed = 0.1;
        camera.minZ = 0.01;

        camera.setTarget(Vector3.Zero());
        camera.attachControl(this.canvas, false);

        // Setup lighting
        // const light = new HemisphericLight('light1', new Vector3(0, 1, 0), this.scene);
        const light2 = new DirectionalLight(
            "dir01",
            new Vector3(-1, -2, -1),
            this.scene
        );
        light2.position = new Vector3(20, 40, 20);

        const hdrTexture = CubeTexture.CreateFromPrefilteredData(
            "/assets/wooden_lounge_1kSpecularHDR.dds",
            this.scene
        );
        hdrTexture.gammaSpace = false;
        this.scene.environmentTexture = hdrTexture;

        // Setup ground
        const ground = MeshBuilder.CreateBox(
            "ground1",
            { height: 0.5, width: 100, depth: 100 },
            this.scene
        );
        ground.position = new Vector3(0, -0.25, 0);
        const groundMat = new PBRMetallicRoughnessMaterial(
            "groundMat",
            this.scene
        );
        groundMat.baseColor = new Color3(1.0, 1.0, 1.0);
        groundMat.metallic = 0;
        groundMat.roughness = 0.9;
        ground.material = groundMat;
        ground.physicsImpostor = new PhysicsImpostor(
            ground,
            PhysicsImpostor.BoxImpostor,
            { mass: 0, restitution: 0.9 },
            this.scene
        );
        ground.checkCollisions = true;
        // ground.isVisible = false;
        // Setup shadows
        this.shadowGenerator = new ShadowGenerator(1024, light2);
        this.shadowGenerator.useBlurExponentialShadowMap = true;
        this.shadowGenerator.blurKernel = 32;

        ground.receiveShadows = true;

        this.bookBuilder = new BookBuilder(this.scene);

        // this.scene.debugLayer.show({
        //     showExplorer: true,
        //     showInspector: true
        // })

        this.engine.runRenderLoop(() => {
            this.scene.render();
        });
    }

    private spawn(book: BookEntry) {}

    async setEntries(books: BookEntry[]) {
        this.entries = books;

        if (!this.initialized) {
            this.init();
            this.initialized = true;
        }

        this.scene.disablePhysicsEngine();
        let success = 0;
        let fail = 0;

        function getKey(book: BookEntry) {
            return book.created_at.substr(0, 4);
        }

        // DateTime.fromFormat(el.created_at, 'yyyy/MM/dd')
        const groups = groupBy(this.entries, getKey);
        const keys = sortBy(Object.keys(groups), k => k);

        let focused: AbstractMesh = null;
        let focusedOrigin: [Vector3, Vector3];
        let focusChangeable = true;

        let counter = 0;
        let existant = [];

        let bookShelves: { [key: string]: BookShelf } = {};
        for (let book of books) {
            try {
                
                const mesh = await this.bookBuilder.createMesh(book);

                this.shadowGenerator.addShadowCaster(mesh);

                mesh.position = new Vector3(0, 5, 0);
                mesh.setEnabled(true);
                this.entities[book.id] = mesh;

                let key = getKey(book);
                let groupIndex = keys.indexOf(key);
                let internalIndex = groups[key].indexOf(book);
                
                if(!bookShelves[key]) {
                    let bookShelf = new BookShelf("BookShelf", this.scene, Math.max(1.0, BookShelf.CalculateOptimalWidth(groups[key].length, 4)));
                    this.shadowGenerator.addShadowCaster(bookShelf);
                    bookShelves[key] = bookShelf;
                    bookShelf.position.x = groupIndex * (1.0 + 0.1);
                }

                let pos = bookShelves[key].getPosition(internalIndex);
              
                let rot = new Vector3(0, Math.PI * 0.5, 0);
                let posName = `pos${counter}`;
                let rotName = `rot${counter}`;
                Animation.CreateAndStartAnimation(
                    posName,
                    mesh,
                    "position",
                    60,
                    60,
                    mesh.position,
                    pos,
                    Animation.ANIMATIONLOOPMODE_CONSTANT
                );
                Animation.CreateAndStartAnimation(
                    rotName,
                    mesh,
                    "rotation",
                    60,
                    60,
                    mesh.rotation,
                    rot,
                    Animation.ANIMATIONLOOPMODE_CONSTANT
                );

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
                                this.scene.stopAnimation(focused);
                                Animation.CreateAndStartAnimation(
                                    posName + "-temp",
                                    focused,
                                    "position",
                                    60,
                                    10,
                                    focused.position,
                                    focusedOrigin[0],
                                    Animation.ANIMATIONLOOPMODE_CONSTANT
                                );
                                Animation.CreateAndStartAnimation(
                                    rotName + "-temp",
                                    focused,
                                    "rotation",
                                    60,
                                    10,
                                    focused.rotation,
                                    focusedOrigin[1],
                                    Animation.ANIMATIONLOOPMODE_CONSTANT
                                );
                            }
                            focused = mesh;
                            focusChangeable = false;
                            focusedOrigin = [pos, rot];
                            console.log("Focus " + mesh.name);
                            this.scene.stopAnimation(focused);
                            Animation.CreateAndStartAnimation(
                                posName,
                                mesh,
                                "position",
                                60,
                                10,
                                mesh.position,
                                pos.add(new Vector3(0, 0, -0.2)),
                                Animation.ANIMATIONLOOPMODE_CONSTANT
                            );
                            Animation.CreateAndStartAnimation(
                                rotName,
                                mesh,
                                "rotation",
                                60,
                                20,
                                mesh.rotation,
                                new Vector3(0, 0, 0),
                                Animation.ANIMATIONLOOPMODE_CONSTANT
                            );
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

        console.log("Success: " + success);
        console.log("Fail: " + fail);
    }

    private onResize() {
        this.engine?.resize();
    }
}
