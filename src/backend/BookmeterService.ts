import { Cache } from './Cache';
import { BookmeterClient } from './BookmeterClient';
import { BookEntry } from '../model/BookEntry';
import { StoreEntry } from './StoreEntry';

export class BookmeterService {
    private static readonly NUMBER_REGEX = /^\d+$/;

    static async GetUserId(userNameOrId: string): Promise<number> {
        if(userNameOrId === null || userNameOrId === undefined || userNameOrId.length == 0) {
            throw "User id is missing!";
        }

        if(userNameOrId.match(this.NUMBER_REGEX)) {
            return parseInt(userNameOrId);
        }

        const userId = Cache.GetUser(userNameOrId);
        if(userId !== null) {
            return userId;
        }
        
        const user = await BookmeterClient.FindUser(userNameOrId);
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