import axios from 'axios';
import { sprintf } from 'sprintf-js';
import { Book } from '../model/Book';
import { BookmeterEntry } from '../model/BookmeterEntry';
import { BookResponse } from '../model/BookResponse';
import async  from 'async';

import { range } from 'lodash';
import { UserInfo } from '../model/UserInfo';
import debugFn from 'debug';
const debug = debugFn('BookmeterClient');

const READ_URL = 'https://bookmeter.com/users/%d/books/read.json?page=%d';
const SEARCH_URL = 'https://bookmeter.com/users/search.json?name=%s';


// TODO: remove "contents" property on BookmeterEntry
export class BookmeterClient {

    // https://bookmeter.com/books/8242918/external_book_stores.json
    // https://bookmeter.com/books/8242918/related_books/series.json?limit=8
    // https://bookmeter.com/books/8242918/related_books/author.json?limit=8
    // https://bookmeter.com/books/8242918/reviews.json?offset=0&limit=40
    
    public static async FindUser(userName: string): Promise<UserInfo|undefined>
    {
        const url = sprintf(SEARCH_URL, userName);
        const response = await axios.get(url);
        const data = response.data as BookResponse<UserInfo>;

        return data.resources.find(user => user.name == userName);
    }

    public static async GetResponse(userId: number, page?: number): Promise<BookResponse<BookmeterEntry>>  {
        // Page is 1-based
        const url = sprintf(READ_URL, userId, (page ?? 0) + 1)
        debug(`Fetching ${url}...`);
        const response =  await axios.get(url);
        debug(`Got response for ${url}`);
        return response.data as BookResponse<BookmeterEntry>;
    }

    public static async GetAllBookEntries(userId: number): Promise<BookmeterEntry[]>  {
        const entries: BookmeterEntry[] = [];
 
        const firstPage = await this.GetResponse(userId, 0);
        const pageSize = firstPage.metadata.limit;
        const count = firstPage.metadata.count;
        const pageCount = Math.ceil(count / pageSize);
        const pages = range(1, pageCount);
        
        // Push into entries array
        Array.prototype.push.apply(entries, firstPage.resources);

        // Return type seems to be wrong, so cast to any...
        const results: any = await async.mapLimit(pages, 10, async (p, callback) => await this.GetBookEntries(userId, p));

        for(let result of results) {
            Array.prototype.push.apply(entries, result);
        }

        // for(let i = 1; i < pageCount; i++) {
        //     let newEntries = await this.getBookEntries(i);
        //     Array.prototype.push.apply(entries, newEntries);
        // }

        return entries;
    }

    /**
     * Gets a book entries page
     * @param page 
     */
    public static async GetBookEntries(userId: number, page?: number): Promise<BookmeterEntry[]>  {
        const res = await this.GetResponse(userId, page);
        return res.resources;
    }
    
    public static async GetAllBooks(userId: number): Promise<Book[]>  {
        const entries = await this.GetAllBookEntries(userId);
        return entries.map(entry => entry.book);
    }

    /**
     * Gets a book page.
     * @param page 
     */
    public static async GetBooks(userId: number, page?: number): Promise<Book[]> {
        const entries = await this.GetBookEntries(userId, page);
        return entries.map(entry => entry.book);
    }
}