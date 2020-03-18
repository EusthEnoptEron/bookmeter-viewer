export interface BookDetails {
    /** summary.isbn */
    isbn?: string,
    /** onix.DescriptiveDetail.TitleDetail.TitleElement.TitleText.collationkey */
    titleReading?: string,
    /** onix.CollateralDetail.TextContent  */
    description?: string

    /** summary.pubdate (yyyy-MM / yyyyMMdd) */
    publicationDate?: string
}