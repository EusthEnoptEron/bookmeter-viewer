import { Book } from './Book';
import { User } from './User';

export interface BookEntry {
    path: string;
    id: number;
    priority?: any;
    created_at: string;
    page: number;
    author_name: string;
    bookcase_names: string[];
    book: Book;
    user: User;
}
