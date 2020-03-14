import { Grouper, IGrouping } from './Grouper';
import { BookEntry } from '../../model/BookEntry';

export class Category {
    constructor(
        public label: string,
        public apply: (grouper: Grouper) => [IGrouping, BookEntry[]][]
    ) {}
}