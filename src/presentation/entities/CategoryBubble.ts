import { AbstractMesh } from "@babylonjs/core";
import { Observable, Subject, BehaviorSubject } from "rxjs";
import { Category } from "../util/Category";

export class CategoryBubble {
    public readonly onPicked = new Subject<void>();
    private _onSelected = new BehaviorSubject<boolean>(false);

    constructor(
        public mesh: AbstractMesh, 
        public category: Category
    ) {}


    get onSelected(): Observable<boolean> {
        return this._onSelected.asObservable();
    }
    get selected(): boolean {
        return this._onSelected.value;
    }

    set selected(value: boolean) {
        this._onSelected.next(value);
    }
}