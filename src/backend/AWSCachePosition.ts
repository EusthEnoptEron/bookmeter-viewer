import S3 from 'aws-sdk/clients/s3';
import { ICachePosition, FileCachePosition } from './CachePosition';
import _ from 'lodash';
import debugFn from 'debug';
import { DateTime } from 'luxon';

const debug = debugFn('viewer:aws');

const s3 = new S3({
    endpoint: process.env.AWS_ENDPOINT,
    accessKeyId: process.env.AWS_KEY,
    secretAccessKey: process.env.AWS_SECRET
});

const prefix = process.env.AWS_PREFIX ?? '';
const bucket = process.env.AWS_BUCKET ?? '';

export class AWSCachePosition implements ICachePosition {
    private _path: string;
    private _params: { Bucket: string, Key: string };

    constructor(path: string) {
        this._path = prefix + path;
        this._params = {
            Bucket: bucket,
            Key: this._path
        };
    }

    async exists(): Promise<boolean> {
        try {
            await s3.headObject(this._params).promise();
            return true;
        } catch(e) {
            return false;
        }
    }

    async getLastModified(): Promise<DateTime | null> {
        try {
            const response = await s3.headObject(this._params).promise();
            return DateTime.fromJSDate(response.LastModified);
        } catch(e) {
            return null;
        }
    }

    async writeString(value: string): Promise<void> {
        debug("Writing %s", this._path);
        await s3.putObject({
            Bucket: bucket,
            Key: this._path,
            Body: value
        }).promise();
    }

    async writeBuffer(value: Buffer): Promise<void> {
        debug("Writing %s", this._path);
        await s3.putObject({
            Bucket: bucket,
            Key: this._path,
            Body: value
        }).promise();
    }

    async readString(): Promise<string> {
        debug("Reading %s", this._path);

        const result = await s3.getObject(this._params).promise();
        debug("Done reading %s", this._path);
        return result.Body.toString('utf8');
    }
    async readBuffer(): Promise<Buffer> {
        debug("Reading %s", this._path);
        const result = await s3.getObject(this._params).promise();
        debug("Done reading %s", this._path);
        return result.Body as Buffer;
    }
}