import { Book } from './Book';
import { User } from './User';
import { BookDetails } from './BookDetails';

export interface BookmeterEntry {
    path: string;
    id: number;
    priority?: any;
    created_at: string;
    page: number;
    author_name: string;
    bookcase_names: string[];
    book: Book;
    user: User;
    contents: Book;
}
