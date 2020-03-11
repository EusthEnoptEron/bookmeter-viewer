import { BookEntry } from "../../model/BookEntry";
import { orderBy, chunk } from "lodash";

export interface IGrouping {
    text: string;
    sortKey: string;
}

export class Grouper {
    private _groupings: Map<string, BookEntry[]> = new Map();
    private _books: BookEntry[] = [];

    constructor(books: BookEntry[]) {
        this._books = orderBy(books, book => book.created_at);
    }

    group(
        rule: (book: BookEntry, i: number) => IGrouping,
        presorter: (book: BookEntry) => any = null,
        sortDirection: "asc" | "desc" = "asc"
    ): [IGrouping, BookEntry[]][] {
        this._groupings.clear();
        const knownGroupings: { [key: string]: IGrouping} = {};

        if(presorter == null) {
            this._books = orderBy(this._books, book => book.created_at);
        } else {
            this._books = orderBy(this._books, presorter);
        }

        let i = 0;
        for(let book of this._books) {
            const group = rule(book, i++);
            knownGroupings[group.sortKey] = group;

            if (!this._groupings.has(group.sortKey)) {
                this._groupings.set(group.sortKey, [book]);
            } else {
                this._groupings.get(group.sortKey).push(book);
            }
        }

        let groups = Object.values(knownGroupings);
        groups = orderBy(groups, g => g.sortKey, sortDirection);

        return groups.map(group => [group, this._groupings.get(group.sortKey)]);
    }


    chunk(
        chunkSize: number,
        labelSupplier: (chunk: BookEntry[]) => string,
        sorter: (book: BookEntry) => any = b => b.book.title,
        sortDirection: "asc" | "desc" = "asc"
    ): [IGrouping, BookEntry[]][] {
        this._groupings.clear();
        this._books = orderBy(this._books, sorter, sortDirection);
        
        const chunks = chunk(this._books, chunkSize);
        const result: [IGrouping, BookEntry[]][] = [];

        let i = 0;
        for(let chunk of chunks) {
            const group = {
                sortKey: '#' + i,
                text: labelSupplier(chunk)
            };
            
            this._groupings.set(group.sortKey, chunk);
            result.push([group, chunk]);
            i++;
        }

        return result;
    }
}
