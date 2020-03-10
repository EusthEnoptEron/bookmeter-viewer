import {
    Mesh, AbstractMesh
} from "@babylonjs/core";
import { Book } from "../../model/Book";
import { BookEntry } from "../../model/BookEntry";
import { User } from '../../model/User';

export class BookEntity implements BookEntry {
    constructor(public bookEntry: BookEntry, public mesh: AbstractMesh) {}
    
    get book(): Book {
        return this.bookEntry.book;
    }

    get path(): string { return this.bookEntry.path; }
    get id(): number { return this.bookEntry.id; }
    get priority(): any { return this.bookEntry.priority; }
    get created_at(): string { return this.bookEntry.created_at; }
    get page(): number { return this.bookEntry.page; }
    get author_name(): string { return this.bookEntry.author_name; }
    get bookcase_names(): string[] { return this.bookEntry.bookcase_names; }
    get user(): User { return this.bookEntry.user; }
}
