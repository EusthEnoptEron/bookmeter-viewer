import {
    Mesh, AbstractMesh, Vector3, Observer, Scene, TransformNode, Quaternion
} from "@babylonjs/core";
import { Book } from "../../model/Book";
import { BookEntry } from "../../model/BookEntry";
import { User } from '../../model/User';
import { ISelectable } from '../SelectionManager';
import '../util/AnimationHelper';
import { BookDetails } from '../../model/BookDetails';

export class BookEntity implements BookEntry, ISelectable {
    private _selected: boolean;

    constructor(public bookEntry: BookEntry, public mesh: AbstractMesh) {}
    
    private _parent: TransformNode;
    private _targetPosition: Vector3;
    private _targetRotation: Vector3;

    setTarget(targetPosition: Vector3, targetRotation: Vector3) {
        this._parent = this.mesh.parent as TransformNode;
        this._targetPosition = targetPosition;
        this._targetRotation = targetRotation;

        this.mesh.unfreezeWorldMatrix();
        this.mesh.transitionTo('position', targetPosition, 1.0);
        this.mesh.transitionTo('rotation', targetRotation, 1.0).onAnimationEndObservable.add(() => {
            this.mesh.freezeWorldMatrix();
        });
    }

    onSelect() {
        this._selected = true;

        // const cam = this.mesh.getScene().getCameraByID("mainCamera");

        // this.mesh.setParent(cam);
        // this.mesh.transitionTo('position', Vector3.Forward().scale(0.5), 0.5);
        // this.mesh.transitionTo('rotation', Vector3.Zero(), 0.5);
    }

    onDeselect() {
        this._selected = false;

        // this.mesh.setParent(this._parent);
        // this.mesh.transitionTo('position', this._targetPosition, 0.5);
        // this.mesh.transitionTo('rotation', this._targetRotation, 0.5);
    }

    onMouseOver() {
        if(this._selected) return;

        this.mesh.stopAnimations();
        this.mesh.transitionTo('position', this._targetPosition.add(new Vector3(0, 0, 0.2)), 0.1);
        this.mesh.transitionTo('rotation', Vector3.Zero(), 0.2);
    }

    onMouseOut() {
        if(this._selected) return;

        this.mesh.stopAnimations();
        this.mesh.transitionTo('position', this._targetPosition, 0.2);
        this.mesh.transitionTo('rotation', this._targetRotation, 0.2);
    }

    get book(): Book {  return this.bookEntry.book;}
    get path(): string { return this.bookEntry.path; }
    get id(): number { return this.bookEntry.id; }
    get created_at(): string { return this.bookEntry.created_at; }
    get bookcase_names(): string[] { return this.bookEntry.bookcase_names; }
    get details(): BookDetails { return this.bookEntry.details; }
}
