# demo/data

This directory holds sample genealogical datasets used by the demo application
and the tests. The files are provided in two formats:

- **GEDCOM** (`.ged`) — the standard plain-text genealogy exchange format,
  parsed at runtime by `gedcomToModel` (`topola/gedcom`).
- **JSON** (`.json`) — `ModelData` (`topola/model`: arrays of `indis` and
  `fams`), passed to `createModelGraph` without parsing.

The screenshot tests in [../../tests/screenshots.spec.ts](../../tests/screenshots.spec.ts)
reference these files by URL to render charts in different configurations and
compare them against committed baselines. The layout oracle
([../../tests/oracle/](../../tests/oracle/)) lays out all four of them.

## Files

| File | Description |
| --- | --- |
| [family.ged](family.ged) | A small GEDCOM 5.5.1 file exported from GenealogyJ. Contains 26 individuals (I1–I26) and 10 families (F1–F10). Used by the screenshot tests for the "relatives" scenario (`chart: 'relatives'`, Detailed preset, `sexScheme`) and the "colored-frame" scenario (hourglass, Detailed, `colorTarget: 'frame'`). |
| [family2.ged](family2.ged) | A larger GEDCOM 5.5.1 file exported from GenealogyJ. Contains 53 individuals (ids up to I64) and 33 families (F1–F33). An extended version of the same family tree, with additional marriages, families with only one parent, and other edge cases. Used by the layout oracle and the upload demo; no screenshot test uses it. |
| [data.json](data.json) | A large `ModelData` dataset sourced from [kielakowie.pl](http://kielakowie.pl/). Contains hundreds of individuals and families with marriage dates and places. Used by the screenshot tests for the "hourglass", "ancestors", "descendants", and "fancy" scenarios. |
| [tudor.json](tudor.json) | A `ModelData` dataset of the English Tudor dynasty, sourced from [genealogyoflife.com](http://genealogyoflife.com/tng/gedcom/EnglishTudorHouse.ged). Used by the screenshot tests for the "tudor" scenario (hourglass, Detailed preset, `generationScheme`). |
