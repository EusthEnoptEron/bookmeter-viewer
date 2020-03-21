import { Cache } from './Cache';
import { BookmeterClient } from './BookmeterClient';
import { BookEntry } from '../model/BookEntry';
import { StoreEntry } from './StoreEntry';
import { WebException } from './WebException';
import {  AmazonClient } from './AmazonClient';
import { AmazonInfos } from '../model/AmazonInfos';
import { BookmeterEntry } from '../model/BookmeterEntry';
import { UrlUtils } from '../util/UrlUtils';
import { OpenBDClient } from './OpenBDClient';
import isbnUtils from 'isbn-utils';
import _ from 'lodash';
import { OpenBDBook } from '../model/OpenBD';
import debugFn from 'debug';
const debug = debugFn('viewer:bmservice');

export class BookService {
    private static readonly NUMBER_REGEX = /^\d+$/;

    static async GetUserId(userNameOrId: string): Promise<number> {
        if(userNameOrId === null || userNameOrId === undefined || userNameOrId.length == 0) {
            throw new WebException(400, "Please provide a user name.");
        }

        if(userNameOrId.match(this.NUMBER_REGEX)) {
            return parseInt(userNameOrId);
        }

        const userId = Cache.GetUser(userNameOrId);
        if(userId !== null) {
            return userId;
        }
        
        const user = await BookmeterClient.FindUser(userNameOrId);
        if(user === undefined) {
            throw new WebException(404, 'User could not be found.');
        }
        Cache.PutUser(user.name, user.id);

        return user.id;
    }

    static async GetBooks(userId: number): Promise<BookEntry[]> {
        let booksEntry = Cache.GetBooks(userId);

        if(booksEntry === null) {
            booksEntry = new StoreEntry();
            booksEntry.promise = this.GetAllBooks(userId);
            Cache.PutBooks(userId, booksEntry);
        }

        if(!booksEntry.items) {
            const items = await booksEntry.promise;
            booksEntry.items = items;

            Cache.SaveBooks();
        }
        
        return booksEntry.items;
    }

    private static async GetAllBooks(userId: number): Promise<BookEntry[]> {
        const rawBooks: BookmeterEntry[] = await BookmeterClient.GetAllBookEntries(userId);
        const books: BookEntry[] = rawBooks.map(this.MapBookmeterEntry.bind(this));
        
        // Group by isbn
        const bookMap = _.groupBy(books, b => b.details.isbn ?? '-');
        const isbns = Object.keys(bookMap).filter(k => k != '-');

        // Fetch data from OpenBD backend
        debug(`Fetching ${isbns.length} details (of ${books.length} books)...`);
        const details = await OpenBDClient.GetBooks(isbns);

        debug(`Got ${details.length} details in response!`);
        for(let detail of details) {
            if(!detail) {
                debug(`Got an empty detail reply.`);
                continue;
            }

            let isbn = detail.summary.isbn;
            if(isbn.length == 10) {
                isbn = isbnUtils.asIsbn13(isbn, false);
            }

            const groupedBooks = bookMap[isbn];
            if(!groupedBooks) {
                debug(`Could not map ISBN: ${isbn}`);
                continue;
            }
            
            this.ApplyDetails(detail, groupedBooks);
        }
        
        return books;
    }

    static async GetDetails(asin: string): Promise<AmazonInfos> {
        asin = asin?.replace(/\W/g, '').trim();

        if(!asin) {
            throw new WebException(400, 'Invalid asin');
        }

        let details = Cache.GetDetails(asin);
        if(details === null) {
            details = await AmazonClient.Instance.GetInfos(asin);
            Cache.PutDetails(asin, details);
        }

        return details;
    }

    static async GetCovers(entries: BookEntry[]) {
        
    }

    private static ExtractIsbn(amazonLink: string) {
        const asin = UrlUtils.ExtractAsin(amazonLink);
        const isbn = isbnUtils.parse(asin);
        
        if(isbn && isbn.isValid()) {
            return isbn.asIsbn13();
        }
        return null;
    }

    private static MapBookmeterEntry(entry: BookmeterEntry): BookEntry {
        return {
            book: entry.book,
            bookcase_names: entry.bookcase_names,
            created_at: entry.created_at,
            id: entry.id,
            path: entry.path,
            details: {
                isbn: this.ExtractIsbn(entry.book.amazon_urls?.registration)
            }
        };
    }

    private static ApplyDetails(details: OpenBDBook, entries: BookEntry[]) {
        const descriptions = details.onix?.CollateralDetail?.TextContent?.filter(t => t.TextType == '03');
        const description = descriptions != null && descriptions.length > 0
            ? descriptions[0].Text
            : null;
        
        
        for(let book of entries) {
            book.details.description = description;
            book.details.publicationDate = this.NormalizeDate(details.summary.pubdate);
            book.details.titleReading = details.onix.DescriptiveDetail.TitleDetail.TitleElement.TitleText.collationkey;
        }
    }

    private static NormalizeDate(date: string) {
        if(!date) {
            return null;
        }

        // The following patterns have been observed:
        // yyyy
        // yyyy-MM
        // yyyy-MM-dd
        // yyyyMMdd
        
        return date.replace(/[^0-9]/g, '');
    }
}