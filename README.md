# Topola – online genealogy visualization

![npm](https://img.shields.io/npm/v/topola.svg)
[![Node.js CI](https://github.com/PeWu/topola-viewer/actions/workflows/node.js.yml/badge.svg)](https://github.com/PeWu/topola/actions/workflows/node.js.yml)

Topola is a Typescript/Javascript library for embedding genealogy tree visualizations on web pags.
The library uses [D3](https://d3js.org/) under the hood for rendering SVG images.

Available chart types:
* Ancestors
* Descendants
* Hourglass chart (both ancestors and descendants)
* Relatives chart (descendants, ancestors and descendants of ancestors), based on the
  [All-in-one report](http://genj.sourceforge.net/wiki/en/reports/graphicaltree) in GenealogyJ
* Fancy chart, inspired by https://imgur.com/a/T02Kc7X

## Examples

Open the StackBlitz examples to play around with the code.

Basic usage: [StackBlitz](https://stackblitz.com/edit/topola-basic)

Using GEDCOM content: [StackBlitz](https://stackblitz.com/edit/topola-gedcom)

Displaying more data: [StackBlitz](https://stackblitz.com/edit/topola-moredata)

Animations: [StackBlitz](https://stackblitz.com/edit/topola-animations)

## Demo

Have a look at the [demo page](https://pewu.github.io/topola/) to see the current visualization
possibilities.

Try it with your own GEDCOM file: https://pewu.github.io/topola/upload

[Topola Genealogy Viewer](https://pewu.github.io/topola-viewer/) is a complete web application
build around this library. It can also be used as a
[Webtrees addon](https://github.com/PeWu/topola-webtrees).

## Running
To run the demo, run these commands:
```
npm install
npm start
```

# Future

The aim of this project is to create a feature-rich library for creating interactive genealogy
visualizations for the Web.
