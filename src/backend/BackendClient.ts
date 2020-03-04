import { BookEntry } from '../model/BookEntry';
import Axios from 'axios';
import { Book } from '../model/Book';

export class BackendClient {
    public static async getBookEntries(userId: number|string): Promise<BookEntry[]> {
        const response = await Axios.get(`/books/${userId}`);
        return response.data;
    }

    public static async getBooks(userId: number|string): Promise<Book[]> {
        const entries = await this.getBookEntries(userId);
        return entries.map(e => e.book);
    }
}