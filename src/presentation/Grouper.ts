import { BookEntry } from "../model/BookEntry";
import { orderBy } from "lodash";

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
}
