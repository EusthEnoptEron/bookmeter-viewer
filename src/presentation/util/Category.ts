import { BookEntity } from '../entities/BookEntity';
import { Grouper, IGrouping } from './Grouper';

export class Category {
    constructor(
        public label: string,
        public apply: (grouper: Grouper) => [IGrouping, BookEntity[]][]
    ) {}
}