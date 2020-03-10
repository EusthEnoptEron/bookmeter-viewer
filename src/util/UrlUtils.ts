import { BookEntry } from '../model/BookEntry';

export class UrlUtils {
    static WrapUrl(url: string) {
        if (url.indexOf('bookmeter') >= 0) {
            url = '/proxy?url=' + url;
        }

        return url;
    }

    static GetAtlasUrl(user: string, books: BookEntry[], frameSize: number = 128, atlasSize: number = 4096): string {
        return `/atlas/${user}/?ids=${books.map(b => b.id).join('-')}&atlasSize=${atlasSize}&frameSize=${frameSize}`;
    }
}