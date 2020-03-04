import axios from 'axios';
import { sprintf } from 'sprintf-js';
import { Book } from '../model/Book';
import { BookEntry } from '../model/BookEntry';
import { BookResponse } from '../model/BookResponse';
import async  from 'async';

import _ from 'lodash';
import { UserInfo } from '../model/UserInfo';

const READ_URL = 'https://bookmeter.com/users/%d/books/read.json?page=%d';
const SEARCH_URL = 'https://bookmeter.com/users/search.json?name=%s';

export class BookmeterClient {

    public static async findUser(userName: string): Promise<UserInfo|null>
    {
        const url = sprintf(SEARCH_URL, userName);
        const response = await axios.get(url);
        const data = response.data as BookResponse<UserInfo>;

        if(data.resources.length > 0) {
            return data.resources[0];
        }
        
        return null;
    }

    public static async getResponse(userId: number, page?: number): Promise<BookResponse<BookEntry>>  {
        const url = sprintf(READ_URL, userId, page ?? 0)
        console.log(`Fetching ${url}...`);
        const response =  await axios.get(url);
        console.log(`Got response for ${url}`);
        return response.data as BookResponse<BookEntry>;
    }

    public static async getAllBookEntries(userId: number): Promise<BookEntry[]>  {
        const entries: BookEntry[] = [];
 
        const firstPage = await this.getResponse(userId, 0);
        const pageSize = firstPage.metadata.limit;
        const count = firstPage.metadata.count;
        const pageCount = Math.ceil(count / pageSize);
        const pages = _.range(1, pageCount);
        
        // Push into entries array
        Array.prototype.push.apply(entries, firstPage.resources);

        // Return type seems to be wrong, so cast to any...
        const results: any = await async.mapLimit(pages, 10, async (p, callback) => {
            // The code is transpiled, so async can't automagically recognize async methods...
            try {
                const results = await this.getBookEntries(userId, p);
                callback(null, results);
            } catch(e) {
                callback(e);
            }
        });

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
    public static async getBookEntries(userId: number, page?: number): Promise<BookEntry[]>  {
        const res = await this.getResponse(userId, page);
        return res.resources;
    }
    
    public static async getAllBooks(userId: number): Promise<Book[]>  {
        const entries = await this.getAllBookEntries(userId);
        return entries.map(entry => entry.book);
    }

    /**
     * Gets a book page.
     * @param page 
     */
    public static async getBooks(userId: number, page?: number): Promise<Book[]> {
        const entries = await this.getBookEntries(userId, page);
        return entries.map(entry => entry.book);
    }
}