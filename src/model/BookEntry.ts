import { Book } from './Book';
import { User } from './User';
import { BookDetails } from './BookDetails';

export interface BookEntry {
    path: string;
    id: number;
    created_at: string;
    bookcase_names: string[];
    book: Book;
    details?: BookDetails;
}
