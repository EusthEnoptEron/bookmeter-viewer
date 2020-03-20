import { Node } from '@babylonjs/core';

export class MemoryPool<T extends Node> {
    private _elements: T[] = [];

    constructor(private _construct: () => T) {
    }

    prewarm(count: number) {
        while(this._elements.length < count) {
            const el = this._construct();
            el.setEnabled(false);
            this._elements.push(el);
        }
    }

    spawn(): T {
        if(this._elements.length > 0) {
            return this.prepareForSpawn(this._elements.shift());
        }

        return this.prepareForSpawn(this._construct());
    }

    private prepareForSpawn(el: T): T {
        el.setEnabled(true);
        return el;
    }

    despawn(el: T) {
        el.setEnabled(false);
        el.parent = null;
        this._elements.push(el);
    }
}