import { Category } from './Category';
import { uniq } from 'lodash';
import { DateTime } from 'luxon';

export const Categories = [
    new Category('By Author', grouper => {
        return grouper.chunk(60,
            books => {
                const authors = uniq(books.map(book => book.book.author.name).filter(author => author));
                
                if(authors.length == 0) {
                    return '';
                }
                if(authors.length == 1) {
                    return authors[0];
                }
                return authors[0] + " ... " + authors[authors.length - 1];
            },
            ['book.author.name', 'book.created_at'],
            ['asc', 'asc'],
            book => book.book.author.name    
        )
    }),
    new Category('By Year', grouper => {
        return grouper.group(book => {
            return {
                sortKey: book.created_at.substr(0, 4),
                text: book.created_at.substr(0, 4),
                skipKeyExtractor: b => b.created_at.substr(5, 2)
            };
        }, 
        'created_at')
    }),
    new Category('By Weekday', grouper => {
        return grouper.group(book => {
            const date = DateTime.fromFormat(book.created_at, 'yyyy/MM/dd');
            
            return {
                sortKey: date.weekday.toString(),
                text: date.isValid ? date.toFormat('cccc') : 'Unknown',
                skipKeyExtractor: null
            };
        },
        [book => DateTime.fromFormat(book.created_at, 'yyyy/MM/dd').weekday.toString(), 'created_at'],
        ['asc', 'asc'])
    }),
];

export class CategoryBuilder {

}