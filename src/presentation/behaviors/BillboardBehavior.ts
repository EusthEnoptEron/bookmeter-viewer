import { TransformNode, Behavior, Observer, Scene, Camera } from '@babylonjs/core';

export class BillboardBehavior implements Behavior<TransformNode> {
    name = "Billboard";
    node: TransformNode = null;
    camera: Camera;

    private _observer: Observer<Scene>;
    constructor() {
    }

    attach(node: TransformNode) {
        this.node = node;
        this.camera = this.node.getScene().getCameraByID('mainCamera');

        this._observer = node.getScene().onBeforeRenderObservable.add(this.update.bind(this));
    }

    update() {
        this.node.rotationQuaternion = this.camera.absoluteRotation;
    }

    detach() {
        this.node.getScene().onBeforeRenderObservable.remove(this._observer);
    }

    init() {

    }
}