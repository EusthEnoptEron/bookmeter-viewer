import Axios from 'axios';
import cheerio from 'cheerio';
import striptags from 'striptags';
import { AmazonInfos } from '../model/AmazonInfos';

const BASE_URL = 'https://www.amazon.co.jp/dp/';

export class AmazonClient {
    static async GetInfos(asin: string): Promise<AmazonInfos | null> {
        try {
            const result = await Axios.get(BASE_URL + asin);
            const $ = cheerio.load(result.data);
        
            const description = striptags($('#productDescription p').eq(0).html()?.replace(/\<br\>/g, '\n')).trim();
            const isbn = $('#detail_bullets_id b:contains("ISBN-13")').parent().text()?.replace(/ISBN.+:/, '').trim();

            return {
                description,
                isbn
            };
        } catch(e) {
            console.log(e);
            return null;
        }
    }
}