import { Router } from '../util/Router';
import isEmpty from 'lodash/isEmpty';
import { filter } from 'rxjs/operators';
import { BackendClient } from '../backend/BackendClient';
import { LibraryController } from './LibraryController';

export class MainController {
    private router: Router;
    private library: LibraryController;

    constructor(
        private inputField: HTMLInputElement,
        private inputButton: HTMLButtonElement,
        private canvas: HTMLCanvasElement) {
            this.router = new Router();

            this.router.onState()
                .pipe(filter(uri => !isEmpty(uri)))
                .subscribe(uri => this.onUser(uri));

            this.library = new LibraryController(this.canvas);
            
            inputField.addEventListener('change', () => this.onValidate());
            inputField.addEventListener('keyup', () => this.onValidate());
            inputButton.addEventListener('click', () => this.onVisualize());
            
            this.onValidate();
        }

    private async onUser(user: string) {
        if(!isEmpty(user)) {
            this.inputField.value = user;
            this.inputField.disabled = true;
            this.inputButton.disabled = true;
            try {
                const entries = await BackendClient.GetBookEntries(user);
                this.library.setEntries(entries);
                
            } catch(e) {
                console.error(e);
                this.inputField.disabled = false;
                this.inputButton.disabled = false;
            }
        }
    }

    private onValidate() {
        this.inputButton.disabled = this.inputField.disabled || isEmpty(this.inputField.value);
    }

    private onVisualize() {
        if(!isEmpty(this.inputField.value)) {
            this.router.navigate(this.inputField.value);
        }
    }
}