import { promises as fsp, existsSync } from 'fs';
import { join, dirname } from 'path';
import { DateTime } from 'luxon';
import { Cache } from './Cache';

export interface ICachePosition {
    exists(): Promise<boolean>;
    getLastModified(): Promise<DateTime | null>;
    writeString(value: string): Promise<void>;
    writeBuffer(value: Buffer): Promise<void>;
    readString(): Promise<string>;
    readBuffer(): Promise<Buffer>;
}

export class FileCachePosition implements ICachePosition {
    private _filePath: string;
    constructor(path: string) {
        this._filePath = join(Cache.GetPath(), path);
    }

    async exists(): Promise<boolean> {
        return existsSync(this._filePath);
    }

    async getLastModified(): Promise<DateTime | null> {
        if(!this.exists()) {
            return null;
        }

        const stats = await fsp.lstat(this._filePath);
        return DateTime.fromJSDate(stats.mtime);
    }

    private async ensureDirectory() {
        const directory = dirname(this._filePath);
        if(!existsSync(directory)) {
            await fsp.mkdir(directory, { recursive: true });
        }
    }

    async writeString(value: string): Promise<void> {
        await this.ensureDirectory();
        return fsp.writeFile(this._filePath, value, 'utf-8');
    }

    async writeBuffer(value: Buffer): Promise<void> {
        await this.ensureDirectory();
        return fsp.writeFile(this._filePath, value, 'binary');
    }
    
    readString(): Promise<string> {
        return fsp.readFile(this._filePath, 'utf-8');
    }

    readBuffer(): Promise<Buffer> {
        return fsp.readFile(this._filePath);
    }
}