import { BookEntry } from '../model/BookEntry';
import { Engine, Scene, FreeCamera, Vector3, HemisphericLight, MeshBuilder, PBRMetallicRoughnessMaterial, Color3, SceneLoader, CannonJSPlugin, PhysicsImpostor, PhysicsViewer, AmmoJSPlugin, Quaternion, UniversalCamera, DirectionalLight, ShadowGenerator, Mesh, TransformNode, Texture, Tools, Animation, FramingBehavior, EasingFunction, ActionManager, ExecuteCodeAction } from '@babylonjs/core';
import cannon from 'cannon';
import ammojs from 'ammojs-typed';
import '@babylonjs/loaders';
import '@babylonjs/gui';
import "@babylonjs/core/Debug/debugLayer";
import '@babylonjs/inspector';
import Axios from 'axios'
import { DateTime } from 'luxon';
import _ from 'lodash';
import { convolutionPixelShader } from '@babylonjs/core/Shaders/convolution.fragment';

export class LibraryController {
    private entries: BookEntry[];
    private entities: { [key: number]: Mesh } = {}
    private initialized = false;
    private engine: Engine;
    private scene: Scene;
    private shadowGenerator: ShadowGenerator;

    constructor(
        private canvas: HTMLCanvasElement
    ) {
        window.addEventListener('resize', () => this.onResize())
    }

    init() {
        Tools.UseFallbackTexture = false;

        this.canvas.classList.add('active');
        this.engine = new Engine(this.canvas, true);
        const gravityVector = new Vector3(0,-9.81, 0);
        // const physicsPlugin = new CannonJSPlugin(null, null, cannon);
        const physicsPlugin = new AmmoJSPlugin(null, ammojs);

        this.scene = new Scene(this.engine);
        this.scene.enablePhysics(gravityVector, physicsPlugin);

        // Setup camera
        const camera = new FreeCamera('camera', new Vector3(0, 1.5, -10), this.scene);
        camera.keysDown.push('S'.charCodeAt(0));
        camera.keysUp.push('W'.charCodeAt(0));
        camera.keysLeft.push('A'.charCodeAt(0));
        camera.keysRight.push('D'.charCodeAt(0));
        camera.ellipsoidOffset = new Vector3(0.0,-1.0,0.0);
        camera.ellipsoid = new Vector3(0.5, 1.0,0.5);
        camera.checkCollisions = true;
        camera.applyGravity = true;
        camera.speed = 0.1;

        camera.setTarget(Vector3.Zero());
        camera.attachControl(this.canvas, false);


        // Setup lighting
        const light = new HemisphericLight('light1', new Vector3(0, 1, 0), this.scene);
        const light2 = new DirectionalLight("dir01", new Vector3(-1, -2, -1), this.scene);
        light2.position = new Vector3(20, 40, 20);
        const environment = this.scene.createDefaultSkybox();
        
        // Setup ground
        const ground = MeshBuilder.CreateBox('ground1', { height: 0.5, width: 100, depth: 100}, this.scene);
        ground.material = new PBRMetallicRoughnessMaterial('groundMat', this.scene);
        ground.physicsImpostor = new PhysicsImpostor(ground, PhysicsImpostor.BoxImpostor, { mass: 0, restitution: 0.9 }, this.scene);
        ground.checkCollisions = true;
        // ground.isVisible = false;
        // Setup shadows
        this.shadowGenerator = new ShadowGenerator(1024, light2);
        ground.receiveShadows = true;

        this.scene.debugLayer.show({
            showExplorer: true,
            showInspector: true
        })

        this.engine.runRenderLoop(() => {
            this.scene.render();
        });
    }

    private spawn(book: BookEntry) {
        
    }

    async setEntries(books: BookEntry[]) {
        this.entries = books;

        if(!this.initialized) {
            this.init();
            this.initialized = true;
        }
        
        this.scene.disablePhysicsEngine();
        const container = await SceneLoader.LoadAssetContainerAsync('/models/', 'book.glb', this.scene);
        container.addAllToScene();

        let mesh = new Mesh('Book', this.scene);
        // container.meshes[1].physicsImpostor = new PhysicsImpostor(container.meshes[1], PhysicsImpostor.SphereImpostor, { mass: 0 }, this.scene);
        container.meshes[1].setParent(mesh);
        container.meshes[2].setParent(mesh);

        const box = MeshBuilder.CreateBox('collider', { width: 0.2, depth: 0.25, height: 0.1 });
        // box.physicsImpostor = new PhysicsImpostor(box, PhysicsImpostor.BoxImpostor,{ mass: 0}, this.scene);
        box.isVisible = false;
        box.setParent(mesh);

        mesh.position.y = 2.0;
        // mesh.physicsImpostor = new PhysicsImpostor(mesh, PhysicsImpostor.NoImpostor, { mass: 1.0, restitution: 0.1 }, this.scene);
        mesh.setEnabled(false);

        
        let success = 0;
        let fail = 0;

        function getKey(book: BookEntry) {
            return book.created_at.substr(0, 4);
        }

        // DateTime.fromFormat(el.created_at, 'yyyy/MM/dd')
        const groups = _.groupBy(this.entries, getKey);
        const keys = _.sortBy(Object.keys(groups), k => k);
        const lineCount = 10;
        const bookWidth = 0.06;
        const bookHeight = 0.27;
        const lineWidth = lineCount * bookWidth;
        const gap = 0.1;
        
        let focused: Mesh = null;
        let focusedOrigin: [Vector3, Vector3];
        let focusChangeable = true;

        let counter = 0;
        let existant = [];

        console.log(keys);
        for(let book of books) {
            try {
                const texture: Texture = await new Promise((resolve, reject) => { let tex: Texture = new Texture(book.book.image_url, this.scene, false, null, null, 
                    () => resolve(tex), 
                    e => {
                        console.log("REJECT");
                        reject(e);
                    })});

                let newBook = mesh.clone(book.book.title);
                newBook.position = new Vector3(0, 5, 0);
                newBook.setEnabled(true);

                const mat = new PBRMetallicRoughnessMaterial('bookMat', this.scene);
                mat.metallic = 0;
                mat.roughness = 0.7;
                mat.baseTexture = texture;

                newBook.getChildMeshes(true, n => n.name.indexOf('model') >= 0)[0].material = mat;

                this.entities[book.id] = newBook;

                let key = getKey(book);
                let groupIndex = keys.indexOf(key);
                let internalIndex = groups[key].indexOf(book);

                let x = internalIndex % lineCount;
                let y = Math.floor(internalIndex / lineCount);

                existant.push(`${x}-${y}-${groupIndex}`);
                // console.log(x, y, groupIndex, internalIndex);
                let offset = groupIndex * (lineWidth + gap);
                
                let pos = new Vector3(offset + x * bookWidth, 0.5 + bookHeight * y, 0);
                let rot = new Vector3(Math.PI * 0.5, -Math.PI * 0.5, 0);
                let posName = `pos${counter}`;
                let rotName = `rot${counter}`;
                Animation.CreateAndStartAnimation(posName, newBook, 'position', 60, 60, newBook.position, pos, Animation.ANIMATIONLOOPMODE_CONSTANT);
                Animation.CreateAndStartAnimation(rotName, newBook, 'rotation', 60, 60, newBook.rotation, rot, Animation.ANIMATIONLOOPMODE_CONSTANT);

                const collider = newBook.getChildMeshes(true, n => n.name.indexOf('model') >= 0)[0];
                let actionManager = new ActionManager(this.scene);
                collider.actionManager = actionManager;
                //ON MOUSE ENTER
                collider.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnPointerOverTrigger, async (ev) => {
                    if(!focusChangeable) return;

                    if(focused) {
                        console.log("Unfocus " + focused.name);	                    
                        this.scene.stopAnimation(focused);
                        Animation.CreateAndStartAnimation(posName+"-temp", focused, 'position', 60, 10, focused.position, focusedOrigin[0], Animation.ANIMATIONLOOPMODE_CONSTANT);
                        Animation.CreateAndStartAnimation(rotName+"-temp", focused, 'rotation', 60, 10, focused.rotation, focusedOrigin[1], Animation.ANIMATIONLOOPMODE_CONSTANT);
                    }
                    focused = newBook;
                    focusChangeable = false;
                    focusedOrigin = [pos, rot];
                    console.log("Focus " + newBook.name);
                    this.scene.stopAnimation(focused);
                    Animation.CreateAndStartAnimation(posName, newBook, 'position', 60, 10, newBook.position, pos.add(new Vector3(0,0, -0.2)), Animation.ANIMATIONLOOPMODE_CONSTANT);
                    Animation.CreateAndStartAnimation(rotName, newBook, 'rotation', 60, 20, newBook.rotation, new Vector3(Math.PI * 0.5, 0, 0), Animation.ANIMATIONLOOPMODE_CONSTANT);

                    // collider.actionManager = null;
                    // await new Promise(r => setTimeout(r, 1000));
                    // collider.actionManager = actionManager;

                }));
                collider.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnPointerOutTrigger, async (ev) => {
                    focusChangeable = true;
                }));
                // collider.physicsImpostor = new PhysicsImpostor(collider, PhysicsImpostor.BoxImpostor,{ mass: 0}, this.scene);
                // newBook.physicsImpostor = new PhysicsImpostor(newBook, PhysicsImpostor.NoImpostor, { mass: 1.0, friction: 100, restitution: 0.5 }, this.scene);
                success++;
            } catch(e) {
                console.error(e);
                fail++;
            }

        }
        
        console.log("Success: " + success);
        console.log("Fail: " + fail);


        
        // console.log(keys);
        // for(let key of keys) {
        //     let books = groups[key];
            
        //     Animation.CreateAndStartAnimation("pos", newBook, 'position', 60, 60, new Vector3(0, 5, 0), new Vector3(0, 0.5, 0), Animation.ANIMATIONLOOPMODE_CONSTANT);
        //     Animation.CreateAndStartAnimation("rot", newBook, 'rotation', 60, 60, Vector3.Zero(), new Vector3(Math.PI * 0.5, -Math.PI * 0.5, 0), Animation.ANIMATIONLOOPMODE_CONSTANT);
        // }
        
        // Animation.CreateAndStartAnimation("test", newBook, 'position', 60, 60, new Vector3(0, 5, 0), new Vector3(0, 0, 0), Animation.ANIMATIONLOOPMODE_CONSTANT);

        

        // this.shadowGenerator.addShadowCaster(mesh);
        // mesh.physicsImpostor = new PhysicsImpostor(mesh)
        // console.log(mesh);

    }

    private onResize() {
        this.engine?.resize();
    }
}