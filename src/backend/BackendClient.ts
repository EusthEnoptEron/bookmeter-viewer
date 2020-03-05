import { BookEntry } from '../model/BookEntry';
import Axios from 'axios';
import { Book } from '../model/Book';

export class BackendClient {
    public static async GetBookEntries(userId: number|string): Promise<BookEntry[]> {
        const response = await Axios.get(`/books/${userId}`);
        return response.data;
    }

    public static async GetBooks(userId: number|string): Promise<Book[]> {
        const entries = await this.GetBookEntries(userId);
        return entries.map(e => e.book);
    }
}