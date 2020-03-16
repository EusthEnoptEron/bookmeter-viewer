import { BookEntry } from "../../model/BookEntry";
import { orderBy, chunk, Many, ListIteratee, NotVoid } from "lodash";
import { BookEntity } from '../entities/BookEntity';
import { uniq } from 'lodash';

export interface IGrouping {
    text: string;
    sortKey: string;
    skipKeyExtractor?: (entry: BookEntry) => string;
}

export class Grouper {
    private _groupings: Map<string, [IGrouping, BookEntity[]]> = new Map();
    private _books: BookEntity[] = [];

    constructor(books: BookEntity[] = null) {
        if(books) {
            this.setEntries(books);
        }
    }

    setEntries(books: BookEntity[]) {
        this._books = orderBy(books, book => book.created_at);
    }

    group(
        rule: (book: BookEntity, i: number) => IGrouping,
        sorter: Many<ListIteratee<BookEntity>> = 'book.title',
        sortDirection: "asc" | "desc" | ("asc" | "desc")[] = "asc",
    ): [IGrouping, BookEntity[]][] {
        this._groupings.clear();
        const knownGroupings: { [key: string]: IGrouping} = {};
        this._books = orderBy(this._books, sorter, sortDirection);

        let i = 0;
        for(let book of this._books) {
            const group = rule(book, i++);
            knownGroupings[group.sortKey] = group;

            if (!this._groupings.has(group.sortKey)) {
                this._groupings.set(group.sortKey, [group, [book]]);
            } else {
                this._groupings.get(group.sortKey)[1].push(book);
            }
        }

        return Array.from(this._groupings.values());
    }


    chunk(
        chunkSize: number,
        labelSupplier: (entity: BookEntity) => string,
        sorter: string | string[] = 'book.title',
        sortDirection: "asc" | "desc" | ("asc" | "desc")[] = "asc",
        skipKeyExtractor: (entry: BookEntity) => string = null
    ): [IGrouping, BookEntity[]][] {
        this._books = orderBy(this._books, sorter, sortDirection);
        
        const chunks = chunk(this._books, chunkSize);
        const result: [IGrouping, BookEntity[]][] = [];

        let i = 0;
        for(let chunk of chunks) {
            const group = {
                sortKey: '#' + i,
                text: this.getChunkText(chunk, labelSupplier),
                skipKeyExtractor
            };
            
            result.push([group, chunk]);
            i++;
        }

        return result;
    }

    private getChunkText(books: BookEntity[], labelSupplier: (entity: BookEntity) => string): string {
        const values = uniq(books.map(labelSupplier).filter(val => val));
                
        if(values.length == 0) {
            return '';
        }
        if(values.length == 1) {
            return values[0];
        }
        return values[0] + " ... " + values[values.length - 1];
    }
}
