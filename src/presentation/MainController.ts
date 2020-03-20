import { Router } from '../util/Router';
import isEmpty from 'lodash/isEmpty';
import { filter } from 'rxjs/operators';
import { BackendClient } from '../backend/BackendClient';
import { LibraryController } from './LibraryController';
import { SceneController } from './SceneController';
import { PromiseUtil } from './util/PromiseUtil';
import { SelectionManager, ISelectable } from './SelectionManager';
import { TemplateExecutor, startCase } from 'lodash';
import nProgress from 'nprogress';
import 'nprogress/nprogress.css';
import { BookEntry } from '../model/BookEntry';
import { fromKana } from 'romaji';
import { StringUtils } from '../util/StringUtils';
import { DateTime } from 'luxon';
import isbnUtils from 'isbn-utils';

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
        
        this.router.onState()
            .pipe(filter(uri => !isEmpty(uri)))
            .subscribe(uri => this.onUser(uri));

        this.outlineContent = this.outlineContainer.querySelector('.target');

        this.selectionManager.onSelectionChanged.subscribe(selection => this.onSelectionChanged(selection));
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
            
            this.selectionManager.setSelection(null);
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

    private configureLoadingBar() {
        nProgress.configure({
            parent: '#container'
        });
    }

    private async onSelectionChanged(selection: ISelectable) {
        if(selection === null) {
            this.outlineContent.innerHTML = "";
            this.outlineContainer.classList.remove("active");
        } else {
            // @ts-ignore
            const entry = selection as BookEntry;
            const romaji = startCase(fromKana(entry.details?.titleReading ?? ""));

            this.outlineContent.innerHTML = this.outlineTemplate({ 
                image_url: entry.book.image_url,
                titleReading: entry.details?.titleReading,
                titleReadingRomaji: romaji,
                title: entry.book.title.replace(/\([^\)]+\)$/, ''),
                subtitle: entry.book.title.replace(/^.+(\([^\)]+\))$/, '$1'),
                author: entry.book.author.name,
                publicationDate: StringUtils.FormatPublicationDate(entry.details?.publicationDate),
                readDate: StringUtils.ParseBookmeterDate(entry.created_at).toLocaleString(DateTime.DATE_MED),
                pageCount: entry.book.page,
                registrationCount: entry.book.registration_count,
                bookmeterUrl: 'https://www.bookmeter.com' + entry.book.path,
                amazonUrl: entry.book.amazon_urls?.registration,
                isbn: entry.details?.isbn
                    ? isbnUtils.asIsbn13(entry.details.isbn, true)
                    : 'Unknown'
            }); 
            this.outlineContainer.classList.add("active");

            let details: { description?: string } = (selection as any).details;
            if(!details || !details.description) {
                console.log("Fetch details from Amazon...");
                details = await BackendClient.GetDetails((selection as any).book);
            }

            if(this.selectionManager.currentSelection === selection) {
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