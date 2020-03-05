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
    VertexData,
    HemisphericLight,
    DynamicTexture,
    Quaternion
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
import { Grouper } from './Grouper';
import { DateTime } from 'luxon';
import { BookGrouping } from './BookGrouping';

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
            new Vector3(0, 2.0, 0),
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

        camera.attachControl(this.canvas, false);
    
        // Setup lighting
        var light = new HemisphericLight("light1", new Vector3(0, 1, 0), this.scene);
        light.intensity = 0.6;
        light.specular = Color3.Black();
    
        // const light = new HemisphericLight('light1', new Vector3(0, 1, 0), this.scene);
        const light2 = new DirectionalLight(
            "dir01",
            new Vector3(0, -0.5, -1.0),
            this.scene
        );
        light2.position = new Vector3(0, 5, 5);

        const hdrTexture = CubeTexture.CreateFromPrefilteredData(
            "/assets/wooden_lounge_1kSpecularHDR.dds",
            // "https://assets.babylonjs.com/environments/environmentSpecular.env",
            this.scene
        );
        hdrTexture.gammaSpace = false;
        // hdrTexture.rotationY = Math.PI * 0.5;
        // this.scene.environmentTexture = hdrTexture;
        this.scene.createDefaultSkybox(hdrTexture);

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
        groundMat.baseColor = new Color3(.3, .3, .3);
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

        const grouper = new Grouper(books);
        // const groupings = grouper.group(book => {
        //     return {
        //         sortKey: book.created_at.substr(0, 4),
        //         text: book.created_at.substr(0, 4)
        //     };
        // });
        const groupings = grouper.group((book, i) => {
            return {
                sortKey: Math.floor(i / 40) + '',
                text: '#' + (Math.floor(i / 40) + 1)
            };
        }, book => book.author_name);

        const radius = 5;
        let focused: AbstractMesh = null;
        let focusedOrigin: [Vector3, Vector3];
        let focusChangeable = true;
        let counter = 0;
        let success = 0;
        let fail = 0;

        for(let i = 0; i < groupings.length; i++) {
            const group = groupings[i];
            const grouping = new BookGrouping(group[0].text, this.scene);
            const angle = (i / groupings.length) * Math.PI * 2;

            this.shadowGenerator.addShadowCaster(grouping);

            grouping.position = new Vector3(
                Math.cos(angle) * radius,
                0.0,
                Math.sin(angle) * radius
            );
            grouping.lookAt(Vector3.Zero());
            grouping.group = group[0];
            grouping.books = group[1];


            for(let book of grouping.books) {
                try {
                    const mesh = await this.bookBuilder.createMesh(book);
                    this.shadowGenerator.addShadowCaster(mesh);
    
                    mesh.position = new Vector3(0, 5, 0);
                    mesh.setParent(grouping);
                    
                    this.entities[book.id] = mesh;
                    const pos = grouping.getBookPosition(book);
                    let rot = new Vector3(0, -Math.PI * 0.5, 0);

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
                                    pos.add(new Vector3(0, 0, 0.2)),
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
        }

        console.log("Success: " + success);
        console.log("Fail: " + fail);
    }

    private onResize() {
        this.engine?.resize();
    }
}
