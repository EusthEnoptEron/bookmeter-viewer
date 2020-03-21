import { get, set, trim, takeWhile, isEqual } from 'lodash';
import { Observable, BehaviorSubject } from 'rxjs';
import { map, distinctUntilChanged } from 'rxjs/operators';

enum Mode {
    History,
    Hash
}

export class Router {
    private root = '/';
    private mode: Mode;

    private stateSubject: BehaviorSubject<string[]> = new BehaviorSubject<string[]>([]);
    
    constructor(options?: { mode?: Mode, root?: string }) {
        this.mode = window.history.pushState ? Mode.History : Mode.Hash;

        if(options?.mode) this.mode = options.mode;
        if(options?.root) this.root = options.root;

        this.update();
        this.listen();
    }

    onState(): Observable<string[]> {
        return this.stateSubject.asObservable();
    }

    onStatePart(index: number): Observable<string> {
        return this.stateSubject.asObservable()
            .pipe(map(parts => get(parts, index)))
            .pipe(distinctUntilChanged());
    }

    navigatePart(index: number, part: string) {
        console.log(index, part);
        let fragment = [...this.stateSubject.value];
        set(fragment, index, part);
        fragment = takeWhile(fragment, f => f);

        console.log(this.stateSubject.value, fragment);
        this.navigate(fragment.join('/'));
    }

    navigate(path: string) {
        if(this.mode == Mode.History) {
            window.history.pushState(null, null, this.root + trim(path, '/'));
        } else {
            window.location.href =  window.location.href.replace(/#.*$/, '#' + path);
        }

        this.update();
    }

    getPart(index: number) {
        return get(this.stateSubject.value, index);
    }

    navigateBack() {
        window.history.back();
    }

    private getFragment() {
        let fragment = '';
        if(this.mode == Mode.History) {
            fragment = decodeURI(window.location.pathname + window.location.search);
            fragment = trim(fragment, '/').replace(/\?.+$/, '');
            if(this.root !== '/') {
                fragment = fragment.replace(this.root, '');
            }
        } else {
            const match = window.location.href.match(/#(.*)$/);
            fragment = match ? match[1] : '';
        }

        return trim(fragment, '/');
    }

    private listen() {
        if(this.mode == Mode.History) {
            window.addEventListener('popstate', e => this.update());
            this.update();
        } else {
            window.setInterval(() => this.update(), 500);
        }
    }

    private update() {
        let uri = this.getFragment();
        console.log("Check fragment...: " + uri);
        let parts = uri.split('/');
        
        if(!isEqual(this.stateSubject.value, parts)) {
            this.stateSubject.next(parts);
        }
    }
    
}