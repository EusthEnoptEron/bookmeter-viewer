export class UrlUtils {
    static WrapUrl(url: string) {
        if (url.indexOf('bookmeter') >= 0) {
            url = '/proxy?url=' + url;
        }

        return url;
    }
}