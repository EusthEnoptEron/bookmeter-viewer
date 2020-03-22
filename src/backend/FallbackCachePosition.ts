import S3 from 'aws-sdk/clients/s3';
import { ICachePosition, FileCachePosition } from './CachePosition';
import _ from 'lodash';
import debugFn from 'debug';
import { AWSCachePosition } from './AWSCachePosition';
import { DateTime } from 'luxon';

const debug = debugFn('viewer:fallback');

export class FallbackPosition implements ICachePosition {
    private _aws: AWSCachePosition;
    private _fs: FileCachePosition;
    private _existsOnFS: boolean | null = null;
    constructor(path: string) {
        this._aws = new AWSCachePosition(path);
        this._fs = new FileCachePosition(path);
    }

    async exists(): Promise<boolean> {
         this._existsOnFS = await this._fs.exists();
         
         if(this._existsOnFS) {
             return true;
         }

         return this._aws.exists();
    }

    async getLastModified(): Promise<DateTime | null> {
        const res1 = await this._fs.getLastModified();
        if(res1 === null) {
            return this._aws.getLastModified();
        } else {
            return res1;
        }
    }

    async writeString(value: string): Promise<void> {
        const p1 = this._fs.writeString(value);
        const p2 = this._aws.writeString(value);

        await Promise.all([p1, p2]);
    }

    async writeBuffer(value: Buffer): Promise<void> {
        const p1 = this._fs.writeBuffer(value);
        const p2 = this._aws.writeBuffer(value);

        await Promise.all([p1, p2]);
    }

    async readString(): Promise<string> {
        if(this._existsOnFS !== false) {
            try {
                const result = await this._fs.readString();
                return result;
            } catch(e) {}
        }

        const result = await this._aws.readString();
        await this._fs.writeString(result);

        this._existsOnFS = true;
        return result;
    }

    async readBuffer(): Promise<Buffer> {
        if(this._existsOnFS !== false) {
            try {
                const result = await this._fs.readBuffer();
                return result;
            } catch(e) {}
        }

        const result = await this._aws.readBuffer();
        await this._fs.writeBuffer(result);

        this._existsOnFS = true;
        return result;
    }

}