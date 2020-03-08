import { Scene, Engine, Vector3, Camera, FreeCamera, Color4, Light, DirectionalLight, CubeTexture, ParticleSystem, Texture, Animation, Color3, StandardMaterial, MeshBuilder, SceneLoader, AbstractMesh, Mesh, ShadowGenerator, Animatable } from "@babylonjs/core";
import { CustomEngine } from "./util/CustomEngine";

import './util/AnimationHelper';

export class SceneController {
    scene: Scene;
    engine: Engine;
    camera: FreeCamera;
    shadowLight: DirectionalLight;
    floorMesh: AbstractMesh;
    ribbon: Mesh;
    particleSystem: ParticleSystem;
    shadowGenerator: ShadowGenerator;

    readonly ready: Promise<void>;

    private _ribbonRotation: Animatable;
    private _interactive: boolean = false;

    constructor(private canvas: HTMLCanvasElement) {
        window.addEventListener("resize", () => this.onResize());

        this.ready = this.setupScene();
        this.ready.then(() => {
            this.engine.runRenderLoop(() => {
                this.scene.render();
            });
        });
    }

    private async setupScene() {
        this.engine = new CustomEngine(this.canvas, true);

        this.scene = new Scene(this.engine);
        this.scene.clearColor = new Color4(0, 0, 0, 0);
        this.scene.gravity = new Vector3(0, -9.81, 0);

        // Setup camera
        this.camera = this.buildCamera();

        this.setupLighting();

        this.shadowGenerator = new ShadowGenerator(1024, this.shadowLight);
        this.shadowGenerator.useBlurExponentialShadowMap = true;
        this.shadowGenerator.blurKernel = 32;

        this.floorMesh = await this.buildFloor();
        this.ribbon = this.buildRibbon();
        this.particleSystem = this.buildParticleSystem();
    }

    private setupLighting() {
        this.shadowLight = new DirectionalLight(
            "shadowLight",
            new Vector3(0, -4, -2).normalize(),
            this.scene
        );
        this.shadowLight.position = new Vector3(0, 5, 5);

        const hdrTexture = CubeTexture.CreateFromPrefilteredData(
            "/assets/envSpecularHDR.dds",
            this.scene
        );
        hdrTexture.gammaSpace = false;
        hdrTexture.rotationY = Math.PI;
        this.scene.environmentTexture = hdrTexture;
    }

    private buildCamera(): FreeCamera {
        const camera = new FreeCamera(
            "camera",
            new Vector3(0, 6.0, 0),
            // new Vector3(0, 6.0, 0),
            this.scene
        );

        camera.id = "mainCamera";

        // @ts-ignore
        window["camera"] = camera;

        camera.keysDown.push("S".charCodeAt(0));
        camera.keysUp.push("W".charCodeAt(0));
        camera.keysLeft.push("A".charCodeAt(0));
        camera.keysRight.push("D".charCodeAt(0));
        camera.ellipsoid = new Vector3(0.5, 0.8, 0.5);
        camera.checkCollisions = true;
        camera.applyGravity = false;
        camera.speed = 0.1;
        camera.minZ = 0.01;

        camera.applyGravity = true;

        return camera;
    }

    
    private async buildFloor(): Promise<AbstractMesh> {
        // const meshes = await SceneLoader.ImportMeshAsync('', '/assets/', 'box.glb', this.scene);
        // meshes.meshes[1].receiveShadows = true;
        const meshes = await SceneLoader.ImportMeshAsync(
            "",
            "/assets/",
            "floor.glb",
            this.scene
        );
        meshes.meshes[1].receiveShadows = true;
        meshes.meshes[1].visibility = 0.0;
        meshes.meshes[1].checkCollisions = true;

        return meshes.meshes[1];
    }

    private buildRibbon(): Mesh {
        const paths: Vector3[][] = [[], [], [], []];

        const steps = 200;
        const frequency = 8;
        const distance = 25;
        const height = distance / 12;
        const offset = height * 2;

        const baseColor = new Color4(86 / 255, 151 / 255, 10 / 255, 1.0);
        const darkColor = baseColor.scale(0.85);
        const colors: Color4[] = [];

        for (let i = 0; i < steps; i++) {
            const t = i / (steps - 1);
            const y = Math.sin(t * Math.PI * 2 * frequency) * height + offset;
            const x = Math.cos(t * Math.PI * 2) * distance;
            const z = Math.sin(t * Math.PI * 2) * distance;

            paths[0].push(new Vector3(x, -100, z));
            paths[1].push(new Vector3(x, y - height * 0.4, z));
            paths[2].push(new Vector3(x, y - height * 0.4, z));
            paths[3].push(new Vector3(x, y, z));
        }

        Array.prototype.push.apply(
            colors,
            new Array<Color4>(steps).fill(baseColor)
        );
        Array.prototype.push.apply(
            colors,
            new Array<Color4>(steps).fill(baseColor)
        );
        Array.prototype.push.apply(
            colors,
            new Array<Color4>(steps).fill(darkColor)
        );
        Array.prototype.push.apply(
            colors,
            new Array<Color4>(steps).fill(darkColor)
        );

        const ribbon = MeshBuilder.CreateRibbon(
            "Ribbon",
            {
                pathArray: paths,
                colors: colors
            },
            this.scene
        );

        const mat: StandardMaterial = new StandardMaterial(
            "Ribbon Mart",
            this.scene
        );
        ribbon.material = mat;
        // ribbon.scaling = new Vector3(100, 100, 100);
        mat.diffuseColor = Color3.White();
        mat.emissiveColor = Color3.White();
        // mat.emissiveColor = new Color3(86 / 255, 151 / 255, 10 / 255);
        mat.disableLighting = true;

        this._ribbonRotation = Animation.CreateAndStartAnimation(
            "rotate_mesh",
            ribbon,
            "rotation.y",
            60,
            60 * 100,
            0,
            Math.PI * 2,
            Animation.ANIMATIONLOOPMODE_CYCLE
        );

        return ribbon;
    }

    private buildParticleSystem() {
        // Create a particle system
        var particleSystem = new ParticleSystem("particles", 100, this.scene);

        //Texture of each particle
        particleSystem.particleTexture = new Texture(
            "/assets/textures/sprite.png",
            this.scene
        );

        // Colors of all particles
        particleSystem.color1 = Color4.FromHexString("#367700FF");
        particleSystem.color2 = Color4.FromHexString("#56970aFF");
        particleSystem.colorDead = Color4.FromHexString("#56970a00");

        // Size of each particle (random between...
        particleSystem.minSize = 1;
        particleSystem.maxSize = 7;

        particleSystem.blendMode = ParticleSystem.BLENDMODE_STANDARD;

        // Life time of each particle (random between...
        particleSystem.minLifeTime = 2;
        particleSystem.maxLifeTime = 5;

        // Emission rate
        particleSystem.emitRate = 15;
        particleSystem.preWarmCycles = 100;
        particleSystem.preWarmStepOffset = 10;

        /******* Emission Space ********/
        particleSystem.createDirectedCylinderEmitter(
            55,
            10,
            0,
            Vector3.Up(),
            Vector3.Up()
        );

        // Speed
        particleSystem.minEmitPower = 5;
        particleSystem.maxEmitPower = 10;
        particleSystem.updateSpeed = 0.005;

        // Start the particle system
        particleSystem.start();

        return particleSystem;
    }

    private onResize() {
        this.engine?.resize();
    }

    get interactive() { return this._interactive; }
    set interactive(interactive: boolean) {
        if(this._interactive == interactive) return;

        this._interactive = interactive;
    
        if(interactive) {
            this.camera.applyGravity = true;
            this.camera.attachControl(this.canvas, false);
            this.camera.transitionTo('position.y', 1.7, 1);
        } else {
            this.camera.applyGravity = false;
            this.camera.detachControl(this.canvas);
            this.camera.transitionTo('position.y', 6.0, 1);
        }
    }

    set rotationSpeed(ratio: number) {
        this._ribbonRotation.speedRatio = ratio;
    }
}
