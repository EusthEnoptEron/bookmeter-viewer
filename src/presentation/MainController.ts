import isbnUtils from 'isbn-utils';
import { startCase, TemplateExecutor, isEmpty } from 'lodash';
import { DateTime } from 'luxon';
import nProgress from 'nprogress';
import 'nprogress/nprogress.css';
import { fromKana } from 'romaji';
import { filter, map, take } from 'rxjs/operators';
import { BackendClient } from '../backend/BackendClient';
import { BookEntry } from '../model/BookEntry';
import { Router } from '../util/Router';
import { StringUtils } from '../util/StringUtils';
import { LibraryController } from './LibraryController';
import { SceneController } from './SceneController';
import { ISelectable, SelectionManager } from './SelectionManager';
import { PromiseUtil } from './util/PromiseUtil';

export class MainController {
    private router: Router;
    private library: LibraryController;
    private selectionManager: SelectionManager;
    private scene: SceneController;

    private outlineContent: HTMLElement;
    constructor(
        private inputField: HTMLInputElement,
        private inputButton: HTMLButtonElement,
        private canvas: HTMLCanvasElement,
        private outlineContainer: HTMLElement,
        private outlineTemplate: TemplateExecutor,
        private errorContainer: HTMLElement) {
        this.router = new Router();

        this.configureLoadingBar();
        this.scene = new SceneController(this.canvas);
        this.selectionManager = new SelectionManager();
        this.library = new LibraryController(this.scene, this.selectionManager);
        
        this.router.onStatePart(0)
            .subscribe(uri => this.onUser(uri));

        this.router.onStatePart(1)
            .pipe(map(num => {
                const id = parseInt(num);
                return isNaN(id)
                    ? null
                    : id;
            }))
            .subscribe(id => this.selectId(id));

        this.outlineContent = this.outlineContainer.querySelector('.target');

        this.selectionManager.onSelectionChanged.subscribe(selection => {
            if(selection === null || selection === undefined) {
                // this is handled elsewhere
                return;
            }

            // @ts-ignore
            const book = selection as BookEntry;
            this.router.navigatePart(1, book?.id?.toString());
        });

        inputField.addEventListener('change', () => this.onValidate());
        inputField.addEventListener('keyup', () => this.onValidate());
        inputButton.addEventListener('click', () => this.onVisualize());
        inputField.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.onValidate();
        });

        const closeBtn = outlineContainer.querySelector('.btn-close');
        closeBtn.addEventListener('click', e => {
            e.preventDefault();
            this.clearSelection();
        });

        window.addEventListener('keyup', (e) => {
            if(e.keyCode == 27) { // Escape
                this.clearSelection();
            }
        });
        
        this.scene.ready.then(() => {
            document.body.classList.add("rendering");
        });

        
        this.onValidate();
    }

    private clearSelection() {
        console.log("CLEAR SELECTION");
        const selectedInRouter = this.router.getPart(1);
        const selectedInManager = this.selectionManager.currentSelection != null;

        if(!selectedInRouter) return;

        if(selectedInManager) {
            this.router.navigateBack();
        } else {
            this.router.navigatePart(1, null);            
        }
    }

    private configureLoadingBar() {
        nProgress.configure({
            parent: '#container'
        });
    }

    private async selectId(id: number | null) {
        console.log("ON SELECT", id);

        if(id === null) {
            this.onSelectionChanged(null);
            this.selectionManager.setSelection(null);

        } else {
            const entries = await this.library.onEntries()
                .pipe(filter(e => e.length > 0))
                .pipe(take(1))
                .toPromise();

            const selectedEntry = entries.find(e => e.id == id);
            this.onSelectionChanged(selectedEntry);
        }
    }

    private async onSelectionChanged(selection: BookEntry | null) {
        if(selection === null || selection === undefined) {
            this.outlineContent.innerHTML = "";
            this.outlineContainer.classList.remove("active");
        } else {
            const romaji = startCase(fromKana(selection.details?.titleReading ?? ""));

            this.outlineContent.innerHTML = this.outlineTemplate({ 
                image_url: selection.book.image_url,
                titleReading: selection.details?.titleReading,
                titleReadingRomaji: romaji,
                title: selection.book.title.replace(/\([^\)]+\)$/, ''),
                subtitle: selection.book.title.replace(/^.+(\([^\)]+\))$/, '$1'),
                author: selection.book.author.name,
                publicationDate: StringUtils.FormatPublicationDate(selection.details?.publicationDate),
                readDate: StringUtils.ParseBookmeterDate(selection.created_at).toLocaleString(DateTime.DATE_MED),
                pageCount: selection.book.page.toLocaleString(),
                registrationCount: selection.book.registration_count.toLocaleString(),
                bookmeterUrl: 'https://www.bookmeter.com' + selection.book.path,
                amazonUrl: selection.book.amazon_urls?.registration,
                isbn: selection.details?.isbn
                    ? isbnUtils.asIsbn13(selection.details.isbn, true)
                    : 'Unknown'
            }); 
            this.outlineContainer.classList.add("active");

            let details: { description?: string } = (selection as any).details;
            if(!details || !details.description) {
                console.log("Fetch details from Amazon...");
                details = await BackendClient.GetDetails((selection as any).book);
            }

            // @ts-ignore
            if(this.router.getPart(1) === selection.id.toString()) {
                // Hasn't changed!

                const description = this.outlineContent.querySelector('.description');
                if(details && details.description) {
                    description.innerHTML = details.description;
                } else {
                    description.innerHTML = 'No data available. (´・ω・｀)';
                }
            }
        }
    }

    private async onUser(user: string) {
        console.log("ON USER", user);
        this.errorContainer.textContent = '';

        if(!isEmpty(user)) {
            this.inputField.value = user;
            this.inputField.disabled = true;
            this.inputButton.disabled = true;
            try {
                nProgress.start();
                
                await this.scene.ready;
                const entries = await BackendClient.GetBookEntries(user);
                await this.library.setEntries(user, entries);

                nProgress.done();

                await PromiseUtil.Delay(1000);
                this.library.show();
            } catch(e) {
                nProgress.done();
                console.error(e.response);
                this.errorContainer.textContent = e?.response?.data ?? e;
                this.inputField.disabled = false;
                this.inputButton.disabled = false;
            }
        } else {
            await this.library.hide();
            this.library.clearEntries();

            this.inputField.value = '';
            this.inputField.disabled = false;
            this.inputButton.disabled = false;
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