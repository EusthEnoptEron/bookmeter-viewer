import { BookMetaData } from './BookMetaData';
import { BookEntry } from "./BookEntry";

export interface BookResponse<T> {
    metadata: BookMetaData,
    resources: T[]
}