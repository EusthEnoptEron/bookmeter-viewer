import { BookEntry } from "../../model/BookEntry";
import { orderBy, chunk, Many, ListIteratee, NotVoid } from "lodash";

export interface IGrouping {
    text: string;
    sortKey: string;
    skipKeyExtractor?: (entry: BookEntry) => string;
}

export class Grouper {
    private _groupings: Map<string, [IGrouping, BookEntry[]]> = new Map();
    private _books: BookEntry[] = [];

    constructor(books: BookEntry[] = null) {
        if(books) {
            this.setEntries(books);
        }
    }

    setEntries(books: BookEntry[]) {
        this._books = orderBy(books, book => book.created_at);
    }

    group(
        rule: (book: BookEntry, i: number) => IGrouping,
        sorter: Many<ListIteratee<BookEntry>> = 'book.title',
        sortDirection: "asc" | "desc" | ("asc" | "desc")[] = "asc",
    ): [IGrouping, BookEntry[]][] {
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
        labelSupplier: (chunk: BookEntry[]) => string,
        sorter: string | string[] = 'book.title',
        sortDirection: "asc" | "desc" | ("asc" | "desc")[] = "asc",
        skipKeyExtractor: (entry: BookEntry) => string = null
    ): [IGrouping, BookEntry[]][] {
        this._books = orderBy(this._books, sorter, sortDirection);
        
        const chunks = chunk(this._books, chunkSize);
        const result: [IGrouping, BookEntry[]][] = [];

        let i = 0;
        for(let chunk of chunks) {
            const group = {
                sortKey: '#' + i,
                text: labelSupplier(chunk),
                skipKeyExtractor
            };
            
            result.push([group, chunk]);
            i++;
        }

        return result;
    }
}
