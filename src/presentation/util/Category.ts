import { Grouper, IGrouping } from './Grouper';
import { BookEntry } from '../../model/BookEntry';
import { BookEntity } from '../entities/BookEntity';

export class Category {
    constructor(
        public label: string,
        public apply: (grouper: Grouper) => [IGrouping, BookEntity[]][]
    ) {}
}