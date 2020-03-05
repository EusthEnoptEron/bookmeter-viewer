import { Author } from './Author';
import { AmazonUrls } from './AmazonUrls';

export interface Book {
    id: number;
    path: string;
    amazon_urls?: AmazonUrls;
    title: string;
    image_url: string;
    registration_count: number;
    page: number;
    original: boolean;
    is_advertisable: boolean;
    author: Author;
}
