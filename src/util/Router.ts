import _ from 'lodash';
import { Observable, BehaviorSubject } from 'rxjs';

enum Mode {
    History,
    Hash
}

export class Router {
    private root = '/';
    private mode: Mode;

    private stateSubject: BehaviorSubject<string> = new BehaviorSubject<string>('');

    constructor(options?: { mode?: Mode, root?: string }) {
        this.mode = window.history.pushState ? Mode.History : Mode.Hash;

        if(options?.mode) this.mode = options.mode;
        if(options?.root) this.root = options.root;

        this.update();
        // this.listen();
    }

    onState(): Observable<string> {
        return this.stateSubject.asObservable();
    }

    navigate(path: string) {
        if(this.mode == Mode.History) {
            window.history.pushState(null, null, this.root + _.trim(path, '/'));
        } else {
            window.location.href =  window.location.href.replace(/#.*$/, '#' + path);
        }

        this.update();
    }

    private getFragment() {
        let fragment = '';
        if(this.mode == Mode.History) {
            fragment = decodeURI(window.location.pathname + window.location.search);
            fragment = _.trim(fragment, '/').replace(/\?.+$/, '');
            if(this.root !== '/') {
                fragment = fragment.replace(this.root, '');
            }
        } else {
            const match = window.location.href.match(/#(.*)$/);
            fragment = match ? match[1] : '';
        }

        return _.trim(fragment, '/');
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

        if(this.stateSubject.value != uri) {
            this.stateSubject.next(uri);
        }
    }
    
}