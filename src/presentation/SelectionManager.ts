import { Observable, BehaviorSubject } from 'rxjs';

export interface ISelectable {
    onSelect(): void;
    onDeselect(): void;

    onMouseOver(): void;
    onMouseOut(): void;
}

export class SelectionManager {
    private _selection: ISelectable;
    get currentSelection() {
        return this._selection;
    }

    private _focuses: ISelectable[] = [];
    get currentFocus() {
        return this._focuses.length > 0
            ? this._focuses[0]
            : null;
    }

    private _selectionSubject = new BehaviorSubject<ISelectable>(null);
    get onSelectionChanged() {
        return this._selectionSubject.asObservable();
    }

    private _focusSubject = new BehaviorSubject<ISelectable>(null);
    get onFocusChanged() {
        return this._focusSubject.asObservable();
    }

    setSelection(selection: ISelectable) {
        this._selection?.onDeselect();
        this._selection = selection;
        this._selection?.onSelect();

        this._selectionSubject.next(selection);
    }

    setFocused(element: ISelectable) {
        this._focuses.push(element);

        if(this._focuses.length == 1) {
            this.currentFocus?.onMouseOver();
            this._focusSubject.next(this.currentFocus);
            return true;
        }

        return false;
    }

    setUnfocused(element: ISelectable) {
        const idx = this._focuses.indexOf(element);
        if(idx >= 0) {
            this._focuses.splice(idx, 1);
        }

        if(idx == 0) {
            element?.onMouseOut();
            
            if(this._focuses.length > 0) {
                this.currentFocus?.onMouseOver();
            }
            
            this._focusSubject.next(this.currentFocus);
        }
     
    }

}