import Axios from 'axios';
import _ from 'lodash';
import { OpenBDBook } from '../model/OpenBD';

const BASE_URL = 'https://api.openbd.jp/v1/';

export class OpenBDClient {
    static async GetCoverage(): Promise<string[]> {
        const result = await Axios.get(BASE_URL + 'coverage', { responseType: 'json'});
        return result.data;
    }

    static async GetBooks(isbns: string[]): Promise<OpenBDBook[]> {
        if(isbns.length == 0) return [];

        if(isbns.length > 1000) {
            const result: OpenBDBook[] = [];
            for(let chunk of _.chunk(isbns, 1000)) {
                const chunkResult = await this.GetBooks(chunk);

                Array.prototype.push.apply(result, chunkResult);
            }

            return result;
        } else {
            const result = await Axios.get(BASE_URL + 'get', { responseType: 'json', params: {
                isbn: isbns.join(',')
            }});

            return result.data;
        }   
    }
}