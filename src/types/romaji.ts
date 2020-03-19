declare module 'romaji' {
    export function fromKana(input: string): string;
    export function toHiragana(input: string): string;
    export function toKatakana(input: string): string;
}