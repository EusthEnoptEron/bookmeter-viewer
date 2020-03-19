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
}