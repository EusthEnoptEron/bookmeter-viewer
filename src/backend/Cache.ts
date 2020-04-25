import fs, { promises as fsp } from 'fs';
import md5 from 'js-md5';
import _ from 'lodash';
import { DateTime } from 'luxon';
import path from 'path';
import { AmazonInfos } from '../model/AmazonInfos';
import { StoreEntry } from './StoreEntry';
import debugFn from 'debug';
import { ICachePosition, FileCachePosition } from './CachePosition';
import { AWSCachePosition } from './AWSCachePosition';
import { FallbackPosition } from './FallbackCachePosition';
const hasS3 = !!process.env.AWS_KEY;

const debug = debugFn('viewer:cache');
const bookStore = hasS3
    ? new AWSCachePosition('books.json')
    : new FileCachePosition('books.json');
    
type CachingLevel = 'local' | 'both';

export class Cache {
    private static store: { [key: number]: StoreEntry } = {}
    private static userMapping: { [key: string]: number } = {}
    private static details: { [key: string]: AmazonInfos } = {}
    private static path = __dirname;

    static SetPath(path: string) {
        this.path = path;
    }

    static GetPath() {
        return this.path;
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
        return Math.abs(entry.createdAt.diffNow().as('days')) > 3;
    }

    static async Load(): Promise<void> {
        if(await bookStore.exists()) {
            debug("Loading books from cache...");
            const json = await bookStore.readString();
            const deserialized = JSON.parse(json);
    
            for(let key of Object.keys(deserialized)) {
                deserialized[key].createdAt = DateTime.fromISO(deserialized[key].createdAt);
                this.store[parseInt(key)] = deserialized[key];
            }
        }
    }

    private static NormalizeTitle(title: string) {
        return _.kebabCase(title.normalize('NFKC').replace(/[^\d](\d+?)[^\d].*$/g, '$1').replace(/[\s]/g, ''));
    }

    static async GetImage(url: string, cachingLevel: CachingLevel = 'local'): Promise<Buffer | null> {
        const position = this.GetImagePosition(url, cachingLevel);
        
        if(await position.exists()) {
            debug(`Loading ${url} from cache...`);
            return position.readBuffer();
        }

        return null;
    }

    static async SaveImage(url: string, data: Buffer, cachingLevel: CachingLevel = 'local') {
        if(!data.length) {
            throw "Invalid picture: " + url;
        }

        const p = this.GetImagePosition(url, cachingLevel);
        await p.writeBuffer(data);
    }

    private static GetImagePosition(url: string, cachingLevel: CachingLevel) {
        let safeString = url.replace(/\W/g, "_");
        if(safeString.length > 150) {
            let firstPart = safeString.substr(0, 150);
            let secondPart = md5(safeString.substr(150));
            safeString = firstPart + "#" + secondPart;
        }

        const path = 'image-cache/' +  safeString.substr(0, 2) +"/"+ safeString + ".bin";
        if(cachingLevel == 'local' || !hasS3) {
            return new FileCachePosition(path);
        } else {
            return new FallbackPosition(path);
        }
    }
    
    static GetImageLastModified(url: string, cachingLevel: CachingLevel = 'local'): Promise<DateTime | null> {
        const position = this.GetImagePosition(url, cachingLevel);
        return position.getLastModified();
    }

    static async SaveBooks(): Promise<void> {
        debug("Saving books...");
        const json = JSON.stringify(this.store);
        await bookStore.writeString(json);
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