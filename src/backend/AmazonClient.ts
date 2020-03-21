import Axios, { AxiosInstance } from 'axios';
import cheerio from 'cheerio';
import striptags from 'striptags';
import { AmazonInfos } from '../model/AmazonInfos';
import { PromiseUtil } from '../presentation/util/PromiseUtil';
import debugFn from 'debug';

const BASE_URL = 'https://www.amazon.co.jp/dp/';
const debug = debugFn('viewer:amazon');

export class AmazonClient {

    private static _Instance: AmazonClient;

    private _client: AxiosInstance;

    constructor() {
        AmazonClient._Instance = this;

        this._client = Axios.create({ 
            withCredentials: true, 
            responseType: 'text', 
            headers: {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.132 Safari/537.36' }
        });
    }

    public static get Instance() {
        if(!this._Instance) {
            this._Instance = new AmazonClient();
        }

        return this._Instance;
    }

    async GetInfos(asin: string): Promise<AmazonInfos | null> {
        let error;
        for(let attempt = 0; attempt < 3; attempt++) {
            try {
                const result = await this._client(BASE_URL + asin);
                const $ = cheerio.load(result.data);
            
                const description = striptags($('#productDescription p').eq(0).html()?.replace(/\<br\>/g, '\n')).trim();
                const isbn = $('#detail_bullets_id b:contains("ISBN-13")').parent().text()?.replace(/ISBN.+:/, '').trim();

                return {
                    description,
                    isbn
                };
            } catch(e) {
                debug(`Failed fetching ${asin} (${attempt})`);
                error = e;

                await PromiseUtil.Delay(1000);
            }
        }

        debug("Failed completely: ", error);
        return null;
    }
}