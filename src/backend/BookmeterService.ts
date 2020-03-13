import { Cache } from './Cache';
import { BookmeterClient } from './BookmeterClient';
import { BookEntry } from '../model/BookEntry';
import { StoreEntry } from './StoreEntry';
import { WebException } from './WebException';

export class BookmeterService {
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
            booksEntry.promise = BookmeterClient.GetAllBookEntries(userId);
            Cache.PutBooks(userId, booksEntry);
        }

        if(!booksEntry.items) {
            const items = await booksEntry.promise;
            booksEntry.items = items;

            Cache.SaveBooks();
        }
        
        return booksEntry.items;
    }

    static async GetCovers(entries: BookEntry[]) {
        
    }
}