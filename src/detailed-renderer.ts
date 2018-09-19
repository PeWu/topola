import * as d3 from 'd3';

import {Renderer, RendererOptions, TreeIndi, TreeNode, TreeNodeSelection} from './api';
import {Date, FamDetails, IndiDetails} from './data';

const INDI_MIN_HEIGHT = 58;
const INDI_MIN_WIDTH = 64;
const FAM_MIN_HEIGHT = 10;
const FAM_MIN_WIDTH = 15;
const IMAGE_WIDTH = 70;
/** Minimum box height when an image is present. */
const IMAGE_HEIGHT = 90;


/** Calculates the length of the given text in pixels when rendered. */
export function getLength(text: string, textClass: string) {
  const g = d3.select('svg').append('g').attr('class', 'detailed node');
  const x = g.append('text').attr('class', textClass).text(text);
  const w = (x.node() as SVGTextContentElement).getComputedTextLength();
  g.remove();
  return w;
}


const MONTHS: Map<number, string> = new Map([
  [1, 'Jan'],
  [2, 'Feb'],
  [3, 'Mar'],
  [4, 'Apr'],
  [5, 'May'],
  [6, 'Jun'],
  [7, 'Jul'],
  [8, 'Aug'],
  [9, 'Sep'],
  [10, 'Oct'],
  [11, 'Nov'],
  [12, 'Dec'],
]);


const SEX_SYMBOLS: Map<string, string> =
    new Map([['F', '\u2640'], ['M', '\u2642']]);


/** Simple date formatter. */
function formatDate(date: Date) {
  return [
    date.qualifier, date.day, date.month && MONTHS.get(date.month), date.year
  ].join(' ');
}


interface DetailsLine {
  symbol: string;
  text: string;
}


interface OffsetIndi {
  indi: TreeIndi;
  generation: number;
  xOffset: number;
  yOffset: number;
}


/** Extracts lines of details for a person. */
function getIndiDetails(indi: IndiDetails): DetailsLine[] {
  const detailsList: DetailsLine[] = [];
  const birthDate = indi.getBirthDate() && indi.getBirthDate().date &&
      formatDate(indi.getBirthDate().date);
  const birthPlace = indi.getBirthPlace();
  const deathDate = indi.getDeathDate() && indi.getDeathDate().date &&
      formatDate(indi.getDeathDate().date);
  const deathPlace = indi.getDeathPlace();
  if (birthDate) {
    detailsList.push({symbol: '', text: birthDate});
  }
  if (birthPlace) {
    detailsList.push({symbol: '', text: birthPlace});
  }
  if (birthDate || birthPlace) {
    detailsList[0].symbol = '*';
  }
  const listIndex = detailsList.length;
  if (deathDate) {
    detailsList.push({symbol: '', text: deathDate});
  }
  if (deathPlace) {
    detailsList.push({symbol: '', text: deathPlace});
  }
  if (deathDate || deathPlace) {
    detailsList[listIndex].symbol = '+';
  }
  return detailsList;
}


/** Extracts lines of details for a family. */
function getFamDetails(fam: FamDetails): DetailsLine[] {
  const detailsList: DetailsLine[] = [];
  const marriageDate = fam.getMarriageDate() && fam.getMarriageDate().date &&
      formatDate(fam.getMarriageDate().date);
  const marriagePlace = fam.getMarriagePlace();
  if (marriageDate) {
    detailsList.push({symbol: '', text: marriageDate});
  }
  if (marriagePlace) {
    detailsList.push({symbol: '', text: marriagePlace});
  }
  if (marriageDate || marriagePlace) {
    detailsList[0].symbol = '\u26AD';
  }
  return detailsList;
}


/**
 * Renders some details about a person such as date and place of birth
 * and death.
 */
export class DetailedRenderer implements Renderer {
  constructor(readonly options: RendererOptions<IndiDetails, FamDetails>) {}

  getPreferredIndiSize(id: string): [number, number] {
    const indi = this.options.data.getIndi(id);
    const details = getIndiDetails(indi);

    const height = d3.max([
      INDI_MIN_HEIGHT + details.length * 14,
      indi.getImageUrl() && IMAGE_HEIGHT,
    ]);

    const maxDetailsWidth =
        d3.max(details.map((x) => getLength(x.text, 'details')));
    const width = d3.max([
      maxDetailsWidth + 22,
      getLength(indi.getFirstName(), 'name') + 8,
      getLength(indi.getLastName(), 'name') + 8,
      INDI_MIN_WIDTH,
    ]) + (indi.getImageUrl() ? IMAGE_WIDTH : 0);
    return [width, height];
  }

  getPreferredFamSize(id: string): [number, number] {
    const fam = this.options.data.getFam(id);
    const details = getFamDetails(fam);

    const height = d3.max([10 + details.length * 14, FAM_MIN_HEIGHT]);
    const maxDetailsWidth =
        d3.max(details.map((x) => getLength(x.text, 'details')));
    const width = d3.max([maxDetailsWidth + 22, FAM_MIN_WIDTH]);
    return [width, height];
  }

  render(enter: TreeNodeSelection, update: TreeNodeSelection): void {
    enter = enter.append('g').attr('class', 'detailed');
    update = update.select('g');

    const indiUpdate = enter.merge(update).selectAll('g.indi').data((node) => {
      const result: OffsetIndi[] = [];
      const famXOffset = !this.options.horizontal && node.data.family ?
          d3.max([-this.getFamPositionVertical(node.data), 0]) :
          0;
      const famYOffset = this.options.horizontal && node.data.family ?
          d3.max([-this.getFamPositionHorizontal(node.data), 0]) :
          0;
      if (node.data.indi) {
        result.push({
          indi: node.data.indi,
          generation: node.data.generation,
          xOffset: famXOffset,
          yOffset: 0
        });
      }
      if (node.data.spouse) {
        result.push({
          indi: node.data.spouse,
          generation: node.data.generation,
          xOffset: (!this.options.horizontal && node.data.indi) ?
              node.data.indi.width + famXOffset :
              0,
          yOffset: (this.options.horizontal && node.data.indi) ?
              node.data.indi.height + famYOffset :
              0
        });
      }
      return result;
    }, (data: OffsetIndi) => data.indi.id);

    const indiEnter = indiUpdate.enter().append('g').attr('class', 'indi');
    const indiMerged = indiEnter.merge(indiUpdate);
    const indiTransition =
        this.options.animate ? indiMerged.transition() : indiMerged;
    indiTransition.attr(
        'transform', (node) => `translate(${node.xOffset}, ${node.yOffset})`);

    this.renderIndi(indiEnter, indiUpdate);

    const familyEnter = enter
                            .select(function(node) {
                              return node.data.family ? this : null;
                            })
                            .append('g')
                            .attr('class', 'family');
    const familyUpdate = update
                             .select(function(node) {
                               return node.data.family ? this : null;
                             })
                             .select('g.family');

    const familyMerged = familyEnter.merge(familyUpdate);
    const familyTransition =
        this.options.animate ? familyMerged.transition() : familyMerged;
    familyTransition.attr(
        'transform', (node) => this.getFamTransform(node.data));
    this.renderFamily(familyEnter, familyUpdate);
  }

  getCss() {
    return `
.detailed text {
  font: 12px verdana;
}

.detailed .name {
  font-weight: bold;
}

.link {
  fill: none;
  stroke: #000;
  stroke-width: 1px;
}

.additional-marriage {
  stroke-dasharray: 2;
}

.detailed rect {
  stroke: black;
}

.detailed {
  stroke-width: 2px;
}

.detailed .details {
  font-size: 10px;
}

.detailed .id {
  font-size: 10px;
  font-style: italic;
}

.detailed rect {
  fill: #ffffdd;
}

.generation-11 .detailed rect, .generation1 .detailed rect {
  fill: #edffdb;
}

.generation-10 .detailed rect, .generation2 .detailed rect {
  fill: #dbffdb;
}

.generation-9 .detailed rect, .generation3 .detailed rect {
  fill: #dbffed;
}

.generation-8 .detailed rect, .generation4 .detailed rect {
  fill: #dbffff;
}

.generation-7 .detailed rect, .generation5 .detailed rect {
  fill: #dbedff;
}

.generation-6 .detailed rect, .generation6 .detailed rect {
  fill: #dbdbff;
}

.generation-5 .detailed rect, .generation7 .detailed rect {
  fill: #eddbff;
}

.generation-4 .detailed rect, .generation8 .detailed rect {
  fill: #ffdbff;
}

.generation-3 .detailed rect, .generation9 .detailed rect {
  fill: #ffdbed;
}

.generation-2 .detailed rect, .generation10 .detailed rect {
  fill: #ffdbdb;
}

.generation-1 .detailed rect, .generation11 .detailed rect {
  fill: #ffeddb;
}`;
  }

  /**
   * Returns the relative position of the family box for the vertical layout.
   */
  private getFamPositionVertical(node: TreeNode): number {
    const indiWidth = node.indi && node.indi.width || 0;
    const spouseWidth = node.spouse && node.spouse.width || 0;
    const familyWidth = node.family.width;
    if (!node.indi || !node.spouse || indiWidth + spouseWidth <= familyWidth) {
      return (indiWidth + spouseWidth - familyWidth) / 2;
    }
    if (familyWidth / 2 >= spouseWidth) {
      return indiWidth + spouseWidth - familyWidth;
    }
    if (familyWidth / 2 >= indiWidth) {
      return 0;
    }
    return indiWidth - familyWidth / 2;
  }

  /**
   * Returns the relative position of the family box for the horizontal layout.
   */
  private getFamPositionHorizontal(node: TreeNode): number {
    const indiHeight = node.indi && node.indi.height || 0;
    const spouseHeight = node.spouse && node.spouse.height || 0;
    const familyHeight = node.family.height;
    if (!node.indi || !node.spouse) {
      return (indiHeight + spouseHeight - familyHeight) / 2;
    }
    return indiHeight - familyHeight / 2;
  }

  private getFamTransform(node: TreeNode): string {
    if (this.options.horizontal) {
      return `translate(${node.indi && node.indi.width || node.spouse.width}, ${
          d3.max([this.getFamPositionHorizontal(node), 0])})`;
    }
    return `translate(${d3.max([this.getFamPositionVertical(node), 0])}, ${
        node.indi && node.indi.height || node.spouse.height})`;
  }

  private renderIndi(
      enter: d3.Selection<d3.BaseType, OffsetIndi, d3.BaseType, {}>,
      update: d3.Selection<d3.BaseType, OffsetIndi, d3.BaseType, {}>) {
    if (this.options.indiHrefFunc) {
      enter = enter.append('a').attr(
          'href', (data) => this.options.indiHrefFunc(data.indi.id));
      update = update.select('a');
    }
    if (this.options.indiCallback) {
      enter.on(
          'click',
          (data) => this.options.indiCallback(
              {id: data.indi.id, generation: data.generation}));
    }
    // Background.
    const background = enter.append('rect')
                           .attr('rx', 5)
                           .attr('stroke-width', 0)
                           .attr('class', 'background')
                           .merge(update.select('rect.background'));
    const backgroundTransition =
        this.options.animate ? background.transition() : background;
    backgroundTransition.attr('width', (node) => node.indi.width)
        .attr('height', (node) => node.indi.height);

    // Clip path.
    const getClipId = (id: string) => `clip-${id}`;
    enter.append('clipPath')
        .attr('id', (node) => getClipId(node.indi.id))
        .append('rect')
        .attr('rx', 5)
        .merge(update.select('clipPath rect'))
        .attr('width', (node) => node.indi.width)
        .attr('height', (node) => node.indi.height);

    const getIndi = (data: OffsetIndi) =>
        this.options.data.getIndi(data.indi.id);

    const getDetailsWidth = (data: OffsetIndi) =>
        data.indi.width - (getIndi(data).getImageUrl() ? IMAGE_WIDTH : 0);


    // Name.
    enter.append('text')
        .attr('text-anchor', 'middle')
        .attr('class', 'name')
        .attr(
            'transform',
            (node) => `translate(${getDetailsWidth(node) / 2}, 17)`)
        .text((node) => getIndi(node).getFirstName());
    enter.append('text')
        .attr('text-anchor', 'middle')
        .attr('class', 'name')
        .attr(
            'transform',
            (node) => `translate(${getDetailsWidth(node) / 2}, 33)`)
        .text((node) => getIndi(node).getLastName());

    // Extract details.
    const details = new Map<string, DetailsLine[]>();
    enter.each((node) => {
      const indi = getIndi(node);
      const detailsList = getIndiDetails(indi);
      details.set(node.indi.id, detailsList);
    });

    const maxDetails = d3.max(Array.from(details.values(), (v) => v.length));

    // Render details.
    for (let i = 0; i < maxDetails; ++i) {
      const lineGroup =
          enter.filter((data) => details.get(data.indi.id).length > i);
      lineGroup.append('text')
          .attr('text-anchor', 'middle')
          .attr('class', 'details')
          .attr('transform', `translate(9, ${49 + i * 14})`)
          .text((data) => details.get(data.indi.id)[i].symbol);
      lineGroup.append('text')
          .attr('class', 'details')
          .attr('transform', `translate(15, ${49 + i * 14})`)
          .text((data) => details.get(data.indi.id)[i].text);
    }

    // Render id.
    const id = enter.append('text')
                   .attr('class', 'id')
                   .text((data) => data.indi.id)
                   .merge(update.select('text.id'));
    const idTransition = this.options.animate ? id.transition() : id;
    idTransition.attr(
        'transform', (data) => `translate(9, ${data.indi.height - 5})`);

    // Render sex.
    const sex = enter.append('text')
                    .attr('class', 'details sex')
                    .attr('text-anchor', 'end')
                    .text((data) => SEX_SYMBOLS.get(getIndi(data).getSex()))
                    .merge(update.select('text.sex'));
    const sexTransition = this.options.animate ? sex.transition() : sex;
    sexTransition.attr(
        'transform',
        (data) =>
            `translate(${getDetailsWidth(data) - 5}, ${data.indi.height - 5})`);


    // Image.
    enter.filter((data) => !!getIndi(data).getImageUrl())
        .append('image')
        .attr('width', IMAGE_WIDTH)
        .attr(
            'transform',
            (data) => `translate(${data.indi.width - IMAGE_WIDTH}, 0)`)
        .attr('clip-path', (data) => `url(#${getClipId(data.indi.id)})`)
        .attr('href', (data) => getIndi(data).getImageUrl());

    // Border on top.
    const border = enter.append('rect')
                       .attr('rx', 5)
                       .attr('fill-opacity', 0)
                       .attr('class', 'border')
                       .merge(update.select('rect.border'));
    const borderTransition =
        this.options.animate ? border.transition() : border;
    borderTransition.attr('width', (data) => data.indi.width)
        .attr('height', (data) => data.indi.height);
  }

  private renderFamily(enter: TreeNodeSelection, update: TreeNodeSelection) {
    if (this.options.famHrefFunc) {
      enter = enter.append('a').attr(
          'href', (node) => this.options.famHrefFunc(node.data.family.id));
    }
    if (this.options.famCallback) {
      enter.on(
          'click',
          (node) => this.options.famCallback(
              {id: node.data.family.id, generation: node.data.generation}));
    }

    // Box.
    enter.append('rect')
        .attr('rx', 5)
        .attr('ry', 5)
        .attr('width', (node) => node.data.family.width)
        .attr('height', (node) => node.data.family.height);

    // Extract details.
    const details = new Map<string, DetailsLine[]>();
    enter.each((node) => {
      const famId = node.data.family.id;
      const fam = this.options.data.getFam(famId);
      const detailsList = getFamDetails(fam);
      details.set(famId, detailsList);
    });
    const maxDetails = d3.max(Array.from(details.values(), (v) => v.length));

    // Render details.
    for (let i = 0; i < maxDetails; ++i) {
      const lineGroup =
          enter.filter((node) => details.get(node.data.family.id).length > i);
      lineGroup.append('text')
          .attr('text-anchor', 'middle')
          .attr('class', 'details')
          .attr('transform', `translate(9, ${16 + i * 14})`)
          .text((node) => details.get(node.data.family.id)[i].symbol);
      lineGroup.append('text')
          .attr('text-anchor', 'left')
          .attr('class', 'details')
          .attr('transform', `translate(15, ${16 + i * 14})`)
          .text((node) => details.get(node.data.family.id)[i].text);
    }
  }
}
