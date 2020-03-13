import { Router } from '../util/Router';
import isEmpty from 'lodash/isEmpty';
import { filter } from 'rxjs/operators';
import { BackendClient } from '../backend/BackendClient';
import { LibraryController } from './LibraryController';
import { SceneController } from './SceneController';
import { Scene } from '@babylonjs/core';
import { PromiseUtil } from './util/PromiseUtil';
import { SelectionManager, ISelectable } from './SelectionManager';
import { TemplateExecutor } from 'lodash';

export class MainController {
    private router: Router;
    private library: LibraryController;
    private selectionManager: SelectionManager;
    private scene: SceneController;

    constructor(
        private inputField: HTMLInputElement,
        private inputButton: HTMLButtonElement,
        private canvas: HTMLCanvasElement,
        private outlineContainer: HTMLElement,
        private outlineTemplate: TemplateExecutor) {
        this.router = new Router();

        this.scene = new SceneController(this.canvas);
        this.selectionManager = new SelectionManager();
        this.library = new LibraryController(this.scene, this.selectionManager);
        
        this.router.onState()
            .pipe(filter(uri => !isEmpty(uri)))
            .subscribe(uri => this.onUser(uri));

        this.selectionManager.onSelectionChanged.subscribe(selection => this.onSelectionChanged(selection));
        inputField.addEventListener('change', () => this.onValidate());
        inputField.addEventListener('keyup', () => this.onValidate());
        inputButton.addEventListener('click', () => this.onVisualize());
        inputField.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.onValidate();
        });

        window.addEventListener('keyup', (e) => {
            if(e.keyCode == 27) { // Escape
                this.selectionManager.setSelection(null);
            }
        });
        
        this.scene.ready.then(() => {
            document.body.classList.add("rendering");
        });

        

        this.onValidate();
    }

    private onSelectionChanged(selection: ISelectable) {
        if(selection === null) {
            this.outlineContainer.innerHTML = "";
            this.outlineContainer.classList.remove("active");
        } else {
            this.outlineContainer.innerHTML = this.outlineTemplate({ entry: selection });
            this.outlineContainer.classList.add("active");
        }
    }

    private async onUser(user: string) {
        if(!isEmpty(user)) {
            this.inputField.value = user;
            this.inputField.disabled = true;
            this.inputButton.disabled = true;
            try {
                await this.scene.ready;
                const entries = await BackendClient.GetBookEntries(user);
                await this.library.setEntries(user, entries);
                await PromiseUtil.Delay(1000);

                this.library.show();
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