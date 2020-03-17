import { StoreEntry } from './StoreEntry'
import fs from 'fs';
import { promises as fsp } from 'fs';
import path from 'path';
import { DateTime } from 'luxon';
import md5 from 'js-md5';
import { AmazonInfos } from '../model/AmazonInfos';

const STORE_NAME = 'store.json';
export class Cache {
    
    private static store: { [key: number]: StoreEntry } = {}
    private static userMapping: { [key: string]: number } = {}
    private static details: { [key: string]: AmazonInfos } = {}
    private static path = __dirname;

    static SetPath(path: string) {
        this.path = path;
    }

    public static GetUser(userName: string): number | null {
        if(Cache.userMapping[userName]) {
            return Cache.userMapping[userName];
        }

        return null;
    }

    public static PutUser(userName: string, id: number) {
        this.userMapping[userName] = id;
    }

    public static GetBooks(userId: number): StoreEntry | null {
        const entry = this.store[userId];
        if(entry === null || entry === undefined || this.IsEvicted(entry)) {
            return null;
        }

        return entry;
    }

    public static PutBooks(userId: number, entry: StoreEntry) {
        this.store[userId] = entry;
    }

    private static IsEvicted(entry: StoreEntry) {
        return entry.createdAt.diffNow().as('days') > 1;
    }

    private static get storePath() {
        return path.join(this.path, STORE_NAME);
    }

    static async Load(): Promise<void> {
        if(fs.existsSync(this.storePath)) {
            console.log("Loading books from cache...");
            const json = await fsp.readFile(this.storePath, 'utf-8');
            const deserialized = JSON.parse(json);
    
            for(let key of Object.keys(deserialized)) {
                deserialized[key].createdAt = DateTime.fromISO(deserialized[key].createdAt);
                this.store[parseInt(key)] = deserialized[key];
            }
        }
    }

    static GetImage(url: string): Promise<Buffer | null> {
        const path = this.GetImagePath(url);
        if(fs.existsSync(path)) {
            console.log(`Loading ${url} from cache...`);
            return fsp.readFile(path);
        }

        return null;
    }

    static async SaveImage(url: string, data: Buffer) {
        if(!data.length) {
            throw "Invalid picture: " + url;
        }

        const p = this.GetImagePath(url);
        const dirname = path.dirname(p);
        if(!fs.existsSync(dirname)) {
            await fsp.mkdir(dirname, { recursive: true })
        }

        await fsp.writeFile(p, data, 'binary');
    }

    private static GetImagePath(url: string) {
        let safeString = url.replace(/\W/g, "_");
        if(safeString.length > 150) {
            let firstPart = safeString.substr(0, 150);
            let secondPart = md5(safeString.substr(150));
            safeString = firstPart + "#" + secondPart;
        }

        return path.join(this.path, 'image-cache', safeString.substr(0, 2), safeString + ".bin");
    }
    
    static async GetImageLastModified(url: string): Promise<DateTime | null> {
        const path = this.GetImagePath(url);

        if(!fs.existsSync(path)) {
            return null;
        }
        
        const stats = await fsp.lstat(path);
        return DateTime.fromJSDate(stats.mtime);
    }

    static async SaveBooks(): Promise<void> {
        console.log("Saving books...");
        const json = JSON.stringify(this.store);
        await fsp.writeFile(this.storePath, json);
    }

    static GetDetails(asin: string): AmazonInfos | null {
        if(this.details[asin]) {
            return this.details[asin];
        }

        return null;
    }

    static PutDetails(asin: string, details: AmazonInfos) {
        this.details[asin] = details;
    }
}