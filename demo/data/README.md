# demo/data

This directory holds sample genealogical datasets used by the demo application
and the Playwright screenshot tests. The files are provided in two formats:

- **GEDCOM** (`.ged`) — the standard plain-text genealogy exchange format,
  parsed at runtime by `gedcomToJson`.
- **JSON** (`.json`) — the internal topola JSON format (arrays of `indis` and
  `fams`), loaded directly by the chart without parsing.

The screenshot tests in [tests/screenshots.spec.ts](tests/screenshots.spec.ts)
reference these files by URL to render charts in different configurations and
compare them against committed baselines.

## Files

| File | Description |
| --- | --- |
| [demo/data/family.ged](demo/data/family.ged) | A small GEDCOM 5.5.1 file exported from GenealogyJ. Contains 26 individuals (I1–I26) and 10 families (F1–F10). Used by the screenshot tests for the "relatives" scenario with `DetailedRenderer` and color-by-sex. |
| [demo/data/family2.ged](demo/data/family2.ged) | A larger GEDCOM 5.5.1 file exported from GenealogyJ. Contains 64 individuals (I1–I64) and 33 families (F1–F33). An extended version of the same family tree, with additional marriages, families with only one parent, and other edge cases. Used by the screenshot tests for the "kinship" scenario. |
| [demo/data/data.json](demo/data/data.json) | A large topola-JSON dataset sourced from [kielakowie.pl](http://kielakowie.pl/). Contains hundreds of individuals and families with marriage dates and places. Used by the screenshot tests for the "hourglass", "ancestors", "descendants", and "fancy" scenarios. |
| [demo/data/tudor.json](demo/data/tudor.json) | A topola-JSON dataset of the English Tudor dynasty, sourced from [genealogyoflife.com](http://genealogyoflife.com/tng/gedcom/EnglishTudorHouse.ged). Used by the screenshot tests for the "tudor" scenario with `AncestorChart` and `DetailedRenderer`. |
