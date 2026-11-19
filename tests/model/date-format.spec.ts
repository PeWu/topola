import { describe, expect, it, vi } from 'vitest';
import { formatDate, formatDateOrRange } from '../../src/model/index.js';

describe('Date formatter (topola/model)', () => {
  describe('robustness', () => {
    it('creates one Intl formatter per locale and shape of date', () => {
      const RealFormat = Intl.DateTimeFormat;
      const created: string[] = [];
      const spy = vi
        .spyOn(Intl, 'DateTimeFormat')
        .mockImplementation(function (
          locale?: string | string[],
          options?: Intl.DateTimeFormatOptions,
        ) {
          created.push(`${String(locale)}:${Object.keys(options ?? {}).length}`);
          return new RealFormat(locale, options);
        } as typeof Intl.DateTimeFormat);
      try {
        // A locale no other test uses, so that nothing is cached yet.
        for (let i = 0; i < 50; i++) {
          expect(formatDate({ day: 9, month: 6, year: 2019 }, 'nl')).toBe(
            '9 jun 2019',
          );
          expect(formatDate({ year: 1850 + i }, 'nl')).toBe(String(1850 + i));
        }
        expect(created).toEqual(['nl:4', 'nl:2']);
      } finally {
        spy.mockRestore();
      }
    });

    it('formats with the language of a locale that Intl does not accept, and with English month names if it has none', () => {
      // A POSIX locale name: its language is a locale for Intl, and month
      // and qualifier are in one language.
      expect(formatDate({ day: 9, month: 6, year: 2019 }, 'pl_PL.UTF-8')).toBe(
        '9 cze 2019',
      );
      expect(
        formatDate(
          { qualifier: 'abt', day: 3, month: 3, year: 1850 },
          'pl_PL.UTF-8',
        ),
      ).toBe(formatDate({ qualifier: 'abt', day: 3, month: 3, year: 1850 }, 'pl'));
      const before = { dateRange: { to: { month: 3, year: 1850 } } };
      expect(formatDateOrRange(before, 'de_DE.UTF-8')).toBe(
        formatDateOrRange(before, 'de'),
      );
      expect(formatDateOrRange(before, 'de_DE.UTF-8')).not.toContain('Mar ');

      // No language that Intl knows: English.
      for (const locale of ['C', 'C.UTF-8', 'x']) {
        expect(formatDate({ day: 9, month: 6, year: 2019 }, locale)).toBe(
          '9 Jun 2019',
        );
        expect(formatDate({ year: 1850 }, locale)).toBe('1850');
      }

      // POSIX / @modifier / whitespace locales without country code
      expect(
        formatDate({ qualifier: 'abt', day: 9, month: 6, year: 2019 }, 'pl.UTF-8'),
      ).toBe(formatDate({ qualifier: 'abt', day: 9, month: 6, year: 2019 }, 'pl'));
      expect(
        formatDate({ qualifier: 'abt', day: 9, month: 3, year: 2019 }, 'de@euro'),
      ).toBe(formatDate({ qualifier: 'abt', day: 9, month: 3, year: 2019 }, 'de'));
      expect(
        formatDate({ qualifier: 'abt', day: 9, month: 6, year: 2019 }, ' pl '),
      ).toBe(formatDate({ qualifier: 'abt', day: 9, month: 6, year: 2019 }, 'pl'));
    });

    it('treats null fields from JSON as absent, translates uppercase qualifiers, and caps formatterCache', () => {
      const parseDate = (json: string) =>
        JSON.parse(json) as Parameters<typeof formatDate>[0];

      expect(
        formatDate(parseDate('{"day": null, "month": 6, "year": 1990}'), 'pl'),
      ).toBe(formatDate({ month: 6, year: 1990 }, 'pl'));
      expect(
        formatDate(parseDate('{"day": null, "month": 6, "year": 1990}')),
      ).toBe('Jun 1990');
      expect(
        formatDate(parseDate('{"day": 15, "month": null, "year": 1990}')),
      ).toBe('15 1990');
      expect(
        formatDate(parseDate('{"day": 15, "month": 6, "year": null}')),
      ).toBe('15 Jun');
      expect(
        formatDate(
          parseDate(
            '{"day": null, "month": null, "year": null, "qualifier": null, "text": null}',
          ),
        ),
      ).toBe('');
      expect(
        formatDateOrRange(
          JSON.parse('{"date": null, "dateRange": {"from": null, "to": null}}'),
          'pl',
        ),
      ).toBe('');

      // Uppercase qualifiers in JSON ModelData
      expect(formatDate({ year: 1900, qualifier: 'ABT' }, 'pl')).toBe(
        'ok. 1900',
      );
      expect(formatDate({ year: 1900, qualifier: 'ABT' })).toBe('abt 1900');

      // Bounded formatterCache across > 260 distinct locale tags
      for (let i = 0; i < 300; i++) {
        expect(formatDate({ day: 1, month: 1, year: 2000 }, `en-x-t${i}`)).toBe(
          '1 Jan 2000',
        );
        expect(formatDate({ day: 1, month: 6, year: 2000 }, `pl-x-t${i}`)).toContain(
          '2000',
        );
      }
    });

    it('asks Intl for every date once', () => {
      const RealFormat = Intl.DateTimeFormat;
      let formatted = 0;
      const spy = vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(function (
        locale?: string | string[],
        options?: Intl.DateTimeFormatOptions,
      ) {
        const real = new RealFormat(locale, options);
        return {
          format(date: Date) {
            formatted++;
            return real.format(date);
          },
        } as Intl.DateTimeFormat;
      } as typeof Intl.DateTimeFormat);
      try {
        const expected = new RealFormat('fi', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          timeZone: 'UTC',
        }).format(new Date(Date.UTC(2019, 5, 9)));
        // A locale no other test uses, so that nothing is remembered yet.
        for (let i = 0; i < 50; i++) {
          expect(formatDate({ day: 9, month: 6, year: 2019 }, 'fi')).toBe(
            expected,
          );
          expect(formatDate({ year: 1850 }, 'fi')).toBe('1850');
        }
        expect(formatted).toBe(2);
        // Another date, and the same date in another locale, are new.
        formatDate({ day: 10, month: 6, year: 2019 }, 'fi');
        formatDate({ day: 9, month: 6, year: 2019 }, 'fi-FI');
        expect(formatted).toBe(4);
      } finally {
        spy.mockRestore();
      }
    });

    it('shows a date that does not exist as it is given, in every locale', () => {
      const cases: Array<[Parameters<typeof formatDate>[0], string]> = [
        [{ day: 31, month: 2, year: 2000 }, '31 Feb 2000'],
        [{ day: 32, month: 1, year: 2000 }, '32 Jan 2000'],
        [{ day: 0, month: 1, year: 2000 }, '0 Jan 2000'],
        [{ month: 13, year: 2000 }, '13 2000'],
        [{ year: -44 }, '-44'],
        [{ year: 0 }, '0'],
        [{ year: NaN }, 'NaN'],
      ];
      for (const [date, expected] of cases) {
        expect(formatDate(date)).toBe(expected);
        expect(formatDate(date, 'pl')).toBe(expected);
      }
      // Dates that exist are formatted by the locale as before.
      expect(formatDate({ day: 29, month: 2, year: 2000 }, 'pl')).toBe(
        '29 lut 2000',
      );
      expect(formatDate({ day: 15, year: 50 }, 'pl')).toBe(
        formatDate({ day: 15, year: 50 }, 'pl-PL'),
      );
      expect(formatDate({ year: 50 }, 'pl')).toBe('50');
    });

    it('does not depend on the time zone of the host', () => {
      // Samoa skipped 30 Dec 2011: in local time that day does not exist.
      const before = process.env.TZ;
      process.env.TZ = 'Pacific/Apia';
      try {
        expect(new Date(2011, 11, 30).getDate()).toBe(31);
        expect(formatDate({ day: 30, month: 12, year: 2011 }, 'pl')).toBe(
          '30 gru 2011',
        );
        expect(formatDate({ day: 30, month: 12, year: 2011 }, 'de')).toBe(
          '30. Dez. 2011',
        );
      } finally {
        if (before === undefined) delete process.env.TZ;
        else process.env.TZ = before;
      }
    });
  });

  describe('formatDate', () => {
    it('formats simple dates in default and English locales', () => {
      expect(formatDate({ day: 9, month: 6, year: 2019 })).toBe('9 Jun 2019');
      expect(formatDate({ day: 31, month: 12, year: 1600 })).toBe(
        '31 Dec 1600',
      );
      expect(formatDate({ day: 9, month: 6, year: 2019 }, 'en')).toBe(
        '9 Jun 2019',
      );
      expect(formatDate({ day: 9, month: 6, year: 2019 }, 'en-US')).toBe(
        '9 Jun 2019',
      );
      expect(formatDate({ day: 9, month: 6, year: 2019 }, 'en-GB')).toBe(
        '9 Jun 2019',
      );
    });

    it('formats simple dates in Czech locale', () => {
      expect(formatDate({ day: 9, month: 6, year: 2019 }, 'cs')).toBe(
        '9. 6. 2019',
      );
      expect(formatDate({ day: 31, month: 12, year: 1600 }, 'cs')).toBe(
        '31. 12. 1600',
      );
    });

    it('formats qualified dates across en, cs, pl, and sv without extra spaces', () => {
      expect(
        formatDate({ day: 9, month: 6, year: 2019, qualifier: 'abt' }, 'en'),
      ).toBe('abt 9 Jun 2019');
      expect(
        formatDate(
          { day: 31, month: 12, year: 1600, qualifier: 'before' },
          'en-US',
        ),
      ).toBe('before 31 Dec 1600');
      expect(formatDate({ year: 1850, qualifier: 'after' }, 'en')).toBe(
        'after 1850',
      );

      expect(
        formatDate({ day: 9, month: 6, year: 2019, qualifier: 'abt' }, 'cs'),
      ).toBe('okolo 9. 6. 2019');
      expect(
        formatDate(
          { day: 31, month: 12, year: 1600, qualifier: 'before' },
          'cs',
        ),
      ).toBe('před 31. 12. 1600');
      expect(formatDate({ year: 1850, qualifier: 'after' }, 'cs')).toBe(
        'po 1850',
      );

      expect(formatDate({ year: 1850, qualifier: 'abt' }, 'sv')).toBe(
        'ung. 1850',
      );
      expect(formatDate({ year: 1850, qualifier: 'cal' }, 'sv')).toBe(
        'ber. 1850',
      );
      expect(formatDate({ year: 1850, qualifier: 'est' }, 'sv')).toBe(
        'uppsk. 1850',
      );
    });

    it('preserves years 0..99 AD without 1900..1999 Date constructor shift', () => {
      expect(formatDate({ day: 15, month: 3, year: 44 }, 'pl')).toContain('44');
      expect(formatDate({ day: 15, month: 3, year: 44 }, 'pl')).not.toContain(
        '1944',
      );
      expect(formatDate({ year: 6 }, 'de')).toBe('6');
    });

    it('avoids Feb-30 rollover when day=31 and month is omitted, and preserves unknown qualifiers', () => {
      expect(formatDate({ day: 31, year: 1800 }, 'pl')).toContain('31');
      expect(
        formatDate({ year: 1900, qualifier: 'customQual' }, 'pl'),
      ).toBe('customQual 1900');
      expect(formatDate({ year: 1900, qualifier: 'ABT' }, 'es')).toBe(
        'abt 1900',
      );
      expect(formatDate({ year: 1900, qualifier: 'CAL' }, 'nl')).toBe(
        'cal 1900',
      );
      expect(formatDate({ year: 1900, qualifier: 'EST' }, 'C')).toBe(
        'est 1900',
      );
    });
  });

  describe('formatDateOrRange', () => {
    it('formats date and dateRange across en, cs, and sv', () => {
      expect(
        formatDateOrRange({ date: { day: 9, month: 6, year: 2019 } }),
      ).toBe('9 Jun 2019');
      expect(
        formatDateOrRange(
          { dateRange: { from: { day: 9, month: 6, year: 2019 } } },
          'en',
        ),
      ).toBe('after 9 Jun 2019');
      expect(
        formatDateOrRange({ dateRange: { from: { year: 1600 } } }, 'cs'),
      ).toBe('po 1600');
      expect(
        formatDateOrRange({ dateRange: { to: { year: 1600 } } }, 'cs'),
      ).toBe('před 1600');
      expect(
        formatDateOrRange({ dateRange: { from: { year: 1600 } } }, 'sv'),
      ).toBe('efter 1600');
      expect(
        formatDateOrRange({ dateRange: { to: { year: 1600 } } }, 'sv'),
      ).toBe('före 1600');
      expect(
        formatDateOrRange(
          {
            dateRange: {
              from: { day: 3, month: 5, year: 2018 },
              to: { day: 9, month: 6, year: 2019 },
            },
          },
          'cs',
        ),
      ).toBe('3. 5. 2018 .. 9. 6. 2019');
    });
  });
});
