import {
    Mesh, AbstractMesh, Vector3
} from "@babylonjs/core";
import { Book } from "../../model/Book";
import { BookEntry } from "../../model/BookEntry";
import { User } from '../../model/User';
import { ISelectable } from '../SelectionManager';
import '../util/AnimationHelper';

export class BookEntity implements BookEntry, ISelectable {
    private _selected: boolean;

    constructor(public bookEntry: BookEntry, public mesh: AbstractMesh) {}
    

    private _targetPosition: Vector3;
    private _targetRotation: Vector3;

    setTarget(targetPosition: Vector3, targetRotation: Vector3) {
        this._targetPosition = targetPosition;
        this._targetRotation = targetRotation;

        this.mesh.transitionTo('position', targetPosition, 1.0);
        this.mesh.transitionTo('rotation', targetRotation, 1.0);
    }

    onSelect() {
        this._selected = true;
    }

    onDeselect() {
        this._selected = false;
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
    get priority(): any { return this.bookEntry.priority; }
    get created_at(): string { return this.bookEntry.created_at; }
    get page(): number { return this.bookEntry.page; }
    get author_name(): string { return this.bookEntry.author_name; }
    get bookcase_names(): string[] { return this.bookEntry.bookcase_names; }
    get user(): User { return this.bookEntry.user; }
}
