import { BookEntry } from '../model/BookEntry';
import Axios from 'axios';
import { Book } from '../model/Book';
import { AmazonInfos } from '../model/AmazonInfos';
import { UrlUtils } from '../util/UrlUtils';

export class BackendClient {
    public static async GetBookEntries(userId: number|string): Promise<BookEntry[]> {
        const response = await Axios.get(`/books/${userId}`);
        return response.data;
    }

    public static async GetBooks(userId: number|string): Promise<Book[]> {
        const entries = await this.GetBookEntries(userId);
        return entries.map(e => e.book);
    }

    public static async GetDetails(book: Book): Promise<AmazonInfos | null> {
        const asin = UrlUtils.ExtractAsin(book.amazon_urls?.registration);
        if(asin) {
            try {
                const result = await Axios.get(`/books/details/${asin}`);
                return result.data;
            } catch(e) {
                console.error(e);
            }
        }

        return null;
    }
}