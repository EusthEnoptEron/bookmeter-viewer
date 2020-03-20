import { DateTime } from 'luxon';

export class StringUtils {

    static ParsePublicationDate(dateString: string): DateTime | null {
        if(!dateString || !dateString.match(/^[0-9]+$/)) {
            return null;
        }

        if(dateString.length == 4) {
            return DateTime.fromFormat(dateString, 'yyyy');
        }
        if(dateString.length == 6) {
            return DateTime.fromFormat(dateString, 'yyyyMM');
        }
        if(dateString.length == 8) {
            return DateTime.fromFormat(dateString, 'yyyyMMdd');
        }

        return null;
    }

    static ParseBookmeterDate(dateString: string): DateTime {
        return DateTime.fromFormat(dateString, 'yyyy/MM/dd');
    }

    static FormatPublicationDate(dateString: string): string {
        const parsed  = this.ParsePublicationDate(dateString);
        if(parsed === null) {
            return 'Unknown';
        }

        if(dateString.length == 4) {
            return parsed.toFormat('yyyy');
        }

        if(dateString.length == 6) {
            return parsed.toLocaleString({
                year: 'numeric',
                month: 'short'
            });
        }

        return parsed.toLocaleString(DateTime.DATE_MED);
    }
}