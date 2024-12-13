import { formatDate, formatDateOrRange } from '../src/date-format';

// Currently, formatDate[OrRange] does not care about excess spaces;
// the exact placement of redundant spaces should not be contractual behavior,
// so we remove/normalize them for this unit test, so that it will continue
// to pass even if the behavior gets fixed later.
function normalizeSpaces(str: string): string {
    return str.trim().replace(/  +/g, ' ');
}

describe('Date formatter', () => {
    describe('formatDate', () => {
        it('should format a simple date in the default locale', () => {
            expect(normalizeSpaces(formatDate({ day: 9, month: 6, year: 2019 }))).toEqual('9 Jun 2019');
            expect(normalizeSpaces(formatDate({ day: 31, month: 12, year: 1600 }))).toEqual('31 Dec 1600');
        });
        it('should format a simple date in the English locale', () => {
            expect(normalizeSpaces(formatDate({ day: 9, month: 6, year: 2019 }, 'en'))).toEqual('9 Jun 2019');
            expect(normalizeSpaces(formatDate({ day: 31, month: 12, year: 1600 }, 'en'))).toEqual('31 Dec 1600');
        });
        it('should format a simple date in the Czech locale', () => {
            expect(normalizeSpaces(formatDate({ day: 9, month: 6, year: 2019 }, 'cs'))).toEqual('9. 6. 2019');
            expect(normalizeSpaces(formatDate({ day: 31, month: 12, year: 1600 }, 'cs'))).toEqual('31. 12. 1600');
        });
        it('should format a qualified date in the English locale', () => {
            expect(normalizeSpaces(formatDate({ day: 9, month: 6, year: 2019, qualifier: 'abt' }, 'en'))).toEqual('abt 9 Jun 2019');
            expect(normalizeSpaces(formatDate({ day: 31, month: 12, year: 1600, qualifier: 'before' }, 'en'))).toEqual('before 31 Dec 1600');
            expect(normalizeSpaces(formatDate({ year: 1850, qualifier: 'after' }, 'en'))).toEqual('after 1850');
        });
        it('should format a qualified date in the Czech locale', () => {
            expect(normalizeSpaces(formatDate({ day: 9, month: 6, year: 2019, qualifier: 'abt' }, 'cs'))).toEqual('okolo 9. 6. 2019');
            expect(normalizeSpaces(formatDate({ day: 31, month: 12, year: 1600, qualifier: 'before' }, 'cs'))).toEqual('před 31. 12. 1600');
            expect(normalizeSpaces(formatDate({ year: 1850, qualifier: 'after' }, 'cs'))).toEqual('po 1850');
        });
    });
    describe('formatDateOrRange', () => {
        it('should format a simple date in the default locale', () => {
            expect(normalizeSpaces(formatDateOrRange({ date: { day: 9, month: 6, year: 2019 } }))).toEqual('9 Jun 2019');
            expect(normalizeSpaces(formatDateOrRange({ date: { day: 31, month: 12, year: 1600 } }))).toEqual('31 Dec 1600');
        });
        it('should format a simple date in the English locale', () => {
            expect(normalizeSpaces(formatDateOrRange({ date: { day: 9, month: 6, year: 2019 } }, 'en'))).toEqual('9 Jun 2019');
            expect(normalizeSpaces(formatDateOrRange({ date: { day: 31, month: 12, year: 1600 } }, 'en'))).toEqual('31 Dec 1600');
        });
        it('should format a simple date in the Czech locale', () => {
            expect(normalizeSpaces(formatDateOrRange({ date: { day: 9, month: 6, year: 2019 } }, 'cs'))).toEqual('9. 6. 2019');
            expect(normalizeSpaces(formatDateOrRange({ date: { day: 31, month: 12, year: 1600 } }, 'cs'))).toEqual('31. 12. 1600');
        });
        it('should format a qualified date in the English locale', () => {
            expect(normalizeSpaces(formatDateOrRange({ date: { day: 9, month: 6, year: 2019, qualifier: 'abt' } }, 'en'))).toEqual('abt 9 Jun 2019');
            expect(normalizeSpaces(formatDateOrRange({ date: { day: 31, month: 12, year: 1600, qualifier: 'before' } }, 'en'))).toEqual('before 31 Dec 1600');
            expect(normalizeSpaces(formatDateOrRange({ date: { year: 1850, qualifier: 'after' } }, 'en'))).toEqual('after 1850');
        });
        it('should format a qualified date in the Czech locale', () => {
            expect(normalizeSpaces(formatDateOrRange({ date: { day: 9, month: 6, year: 2019, qualifier: 'abt' } }, 'cs'))).toEqual('okolo 9. 6. 2019');
            expect(normalizeSpaces(formatDateOrRange({ date: { day: 31, month: 12, year: 1600, qualifier: 'before' } }, 'cs'))).toEqual('před 31. 12. 1600');
            expect(normalizeSpaces(formatDateOrRange({ date: { year: 1850, qualifier: 'after' } }, 'cs'))).toEqual('po 1850');
        });

        it('should format a from-date range in the English locale', () => {
            expect(normalizeSpaces(formatDateOrRange({ dateRange: { from: { day: 9, month: 6, year: 2019 } } }, 'en'))).toEqual('after 9 Jun 2019');
            expect(normalizeSpaces(formatDateOrRange({ dateRange: { from: { year: 1600 } } }, 'en'))).toEqual('after 1600');
        });
        it('should format a from-date range in the Czech locale', () => {
            expect(normalizeSpaces(formatDateOrRange({ dateRange: { from: { day: 9, month: 6, year: 2019 } } }, 'cs'))).toEqual('po 9. 6. 2019');
            expect(normalizeSpaces(formatDateOrRange({ dateRange: { from: { year: 1600 } } }, 'cs'))).toEqual('po 1600');
        });
        it('should format a to-date range in the English locale', () => {
            expect(normalizeSpaces(formatDateOrRange({ dateRange: { to: { day: 9, month: 6, year: 2019 } } }, 'en'))).toEqual('before 9 Jun 2019');
            expect(normalizeSpaces(formatDateOrRange({ dateRange: { to: { year: 1600 } } }, 'en'))).toEqual('before 1600');
        });
        it('should format a to-date range in the Czech locale', () => {
            expect(normalizeSpaces(formatDateOrRange({ dateRange: { to: { day: 9, month: 6, year: 2019 } } }, 'cs'))).toEqual('před 9. 6. 2019');
            expect(normalizeSpaces(formatDateOrRange({ dateRange: { to: { year: 1600 } } }, 'cs'))).toEqual('před 1600');
        });
        it('should format a from-to range in the English locale', () => {
            expect(normalizeSpaces(formatDateOrRange({ dateRange: { from: { day: 3, month: 5, year: 2018 }, to: { day: 9, month: 6, year: 2019 } } }, 'en'))).toEqual('3 May 2018 .. 9 Jun 2019');
            expect(normalizeSpaces(formatDateOrRange({ dateRange: { from: { year: 1595 }, to: { year: 1600 } } }, 'en'))).toEqual('1595 .. 1600');
        });
        it('should format a from-to range in the Czech locale', () => {
            expect(normalizeSpaces(formatDateOrRange({ dateRange: { from: { day: 3, month: 5, year: 2018 }, to: { day: 9, month: 6, year: 2019 } } }, 'cs'))).toEqual('3. 5. 2018 .. 9. 6. 2019');
            expect(normalizeSpaces(formatDateOrRange({ dateRange: { from: { year: 1595 }, to: { year: 1600 } } }, 'cs'))).toEqual('1595 .. 1600');
        });
    });
});
