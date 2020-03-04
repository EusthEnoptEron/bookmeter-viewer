import { BookEntry } from '../model/BookEntry';
import { DateTime } from 'luxon';

export class StoreEntry {
    public createdAt: DateTime;
    public items?: BookEntry[];
    public promise: Promise<BookEntry[]>

    constructor() {
        this.createdAt = DateTime.local()
    }
}