import { BaseType, select, Selection } from 'd3-selection';
import { ChartColors } from '.';
import { FamDetails, IndiDetails } from './data';
import { formatDateOrRange } from './date-format';
import { max } from 'd3-array';
import 'd3-transition';
import {
  Renderer,
  RendererOptions,
  TreeEntry,
  TreeNode,
  TreeNodeSelection,
} from './api';
import {
  CompositeRenderer,
  getFamPositionHorizontal,
  getFamPositionVertical,
} from './composite-renderer';

const INDI_MIN_HEIGHT = 44;
const INDI_MIN_WIDTH = 64;
const FAM_MIN_HEIGHT = 10;
const FAM_MIN_WIDTH = 15;
const IMAGE_WIDTH = 70;
/** Minimum box height when an image is present. */
const IMAGE_HEIGHT = 90;
const DETAILS_HEIGHT = 14;

const ANIMATION_DELAY_MS = 200;
const ANIMATION_DURATION_MS = 500;

const textLengthCache = new Map<string, number>();

/** Calculates the length of the given text in pixels when rendered. */
export function getLength(text: string, textClass: string): number {
  const cacheKey = `${text}|${textClass}`;
  if (textLengthCache.has(cacheKey)) {
    return textLengthCache.get(cacheKey)!;
  }
  const g = select('svg').append('g').attr('class', 'detailed node');
  const x = g.append('text').attr('class', textClass).text(text);
  const length = (x.node() as SVGTextContentElement).getComputedTextLength();
  g.remove();
  textLengthCache.set(cacheKey, length);
  return length;
}

const SEX_SYMBOLS: Map<string, string> = new Map([
  ['F', '\u2640'],
  ['M', '\u2642'],
]);

interface DetailsLine {
  symbol: string;
  text: string;
}

interface OffsetIndi {
  indi: TreeEntry;
  generation: number;
  xOffset: number;
  yOffset: number;
}

/**
 * Renders some details about a person such as date and place of birth
 * and death.
 */
export class DetailedRenderer extends CompositeRenderer implements Renderer {
  constructor(readonly options: RendererOptions<IndiDetails, FamDetails>) {
    super(options);
  }

  private getColoringClass() {
    switch (this.options.colors) {
      case ChartColors.NO_COLOR:
        return 'nocolor';
      case ChartColors.COLOR_BY_SEX:
        return 'bysex';
      default:
        return 'bygeneration';
    }
  }

  /** Extracts lines of details for a person. */
  private getIndiDetails(indi: IndiDetails): DetailsLine[] {
    const detailsList: DetailsLine[] = [];
    const birthDate =
      indi.getBirthDate() &&
      formatDateOrRange(indi.getBirthDate()!, this.options.locale);
    const birthPlace = indi.getBirthPlace();
    const deathDate =
      indi.getDeathDate() &&
      formatDateOrRange(indi.getDeathDate()!, this.options.locale);
    const deathPlace = indi.getDeathPlace();
    if (birthDate) {
      detailsList.push({ symbol: '', text: birthDate });
    }
    if (birthPlace) {
      detailsList.push({ symbol: '', text: birthPlace });
    }
    if (birthDate || birthPlace) {
      detailsList[0].symbol = '*';
    }
    const listIndex = detailsList.length;
    if (deathDate) {
      detailsList.push({ symbol: '', text: deathDate });
    }
    if (deathPlace) {
      detailsList.push({ symbol: '', text: deathPlace });
    }
    if (deathDate || deathPlace) {
      detailsList[listIndex].symbol = '+';
    } else if (indi.isConfirmedDeath()) {
      detailsList.push({ symbol: '+', text: '' });
    }
    return detailsList;
  }

  /** Extracts lines of details for a family. */
  private getFamDetails(fam: FamDetails): DetailsLine[] {
    const detailsList: DetailsLine[] = [];
    const marriageDate =
      fam.getMarriageDate() &&
      formatDateOrRange(fam.getMarriageDate()!, this.options.locale);
    const marriagePlace = fam.getMarriagePlace();
    if (marriageDate) {
      detailsList.push({ symbol: '', text: marriageDate });
    }
    if (marriagePlace) {
      detailsList.push({ symbol: '', text: marriagePlace });
    }
    if (marriageDate || marriagePlace) {
      detailsList[0].symbol = '\u26AD';
    }
    return detailsList;
  }

  getPreferredIndiSize(id: string): [number, number] {
    const indi = this.options.data.getIndi(id)!;
    const details = this.getIndiDetails(indi);
    const idAndSexHeight = indi.showId() || indi.showSex() ? DETAILS_HEIGHT : 0;

    const height = max([
      INDI_MIN_HEIGHT + details.length * DETAILS_HEIGHT + idAndSexHeight,
      indi.getImageUrl() ? IMAGE_HEIGHT : 0,
    ])!;

    const maxDetailsWidth = max(
      details.map((x) => getLength(x.text, 'details'))
    )!;
    const width =
      max([
        maxDetailsWidth + 22,
        getLength(indi.getFirstName() || '', 'name') + 8,
        getLength(indi.getLastName() || '', 'name') + 8,
        getLength(id, 'id') + 32,
        INDI_MIN_WIDTH,
      ])! + (indi.getImageUrl() ? IMAGE_WIDTH : 0);
    return [width, height];
  }

  getPreferredFamSize(id: string): [number, number] {
    const fam = this.options.data.getFam(id)!;
    const details = this.getFamDetails(fam);

    const height = max([10 + details.length * DETAILS_HEIGHT, FAM_MIN_HEIGHT])!;
    const maxDetailsWidth = max(
      details.map((x) => getLength(x.text, 'details'))
    )!;
    const width = max([maxDetailsWidth + 22, FAM_MIN_WIDTH])!;
    return [width, height];
  }

  render(enter: TreeNodeSelection, update: TreeNodeSelection): void {
    enter = enter.append('g').attr('class', 'detailed');
    update = update.select('g');

    const indiUpdate = enter
      .merge(update)
      .selectAll('g.indi')
      .data(
        (node) => {
          const result: OffsetIndi[] = [];
          const famXOffset =
            !this.options.horizontal && node.data.family
              ? max([-getFamPositionVertical(node.data), 0])!
              : 0;
          const famYOffset =
            this.options.horizontal && node.data.family
              ? max([-getFamPositionHorizontal(node.data), 0])!
              : 0;
          if (node.data.indi) {
            result.push({
              indi: node.data.indi,
              generation: node.data.generation!,
              xOffset: famXOffset,
              yOffset: 0,
            });
          }
          if (node.data.spouse) {
            result.push({
              indi: node.data.spouse,
              generation: node.data.generation!,
              xOffset:
                !this.options.horizontal && node.data.indi
                  ? node.data.indi.width! + famXOffset
                  : 0,
              yOffset:
                this.options.horizontal && node.data.indi
                  ? node.data.indi.height! + famYOffset
                  : 0,
            });
          }
          return result;
        },
        (data: OffsetIndi) => data.indi.id
      );

    const indiEnter = indiUpdate
      .enter()
      .append('g' as string)
      .attr('class', 'indi');
    this.transition(indiEnter.merge(indiUpdate)).attr(
      'transform',
      (node) => `translate(${node.xOffset}, ${node.yOffset})`
    );

    this.renderIndi(indiEnter, indiUpdate);

    const familyEnter = enter
      .select(function (node) {
        return node.data.family ? this : null;
      })
      .append('g' as string)
      .attr('class', 'family');
    const familyUpdate = update
      .select(function (node) {
        return node.data.family ? this : null;
      })
      .select('g.family');

    this.transition(familyEnter.merge(familyUpdate)).attr('transform', (node) =>
      this.getFamTransform(node.data)
    );
    this.renderFamily(familyEnter, familyUpdate);
  }

  getCss() {
    return `
.detailed text {
  font-family: verdana, arial, sans-serif;
  font-size: 12px;
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

.detailed rect.nocolor {
  fill: #ffffff;
}

.detailed rect.bysex {
  fill: #eeeeee;
}

.detailed rect.bysex.male {
  fill: #dbffff;
}

.detailed rect.bysex.female {
  fill: #ffdbed;
}

.detailed rect.bygeneration {
  fill: #ffffdd;
}

.generation-11 .detailed rect.bygeneration, .generation1 .detailed rect.bygeneration {
  fill: #edffdb;
}

.generation-10 .detailed rect.bygeneration, .generation2 .detailed rect.bygeneration {
  fill: #dbffdb;
}

.generation-9 .detailed rect.bygeneration, .generation3 .detailed rect.bygeneration {
  fill: #dbffed;
}

.generation-8 .detailed rect.bygeneration, .generation4 .detailed rect.bygeneration {
  fill: #dbffff;
}

.generation-7 .detailed rect.bygeneration, .generation5 .detailed rect.bygeneration {
  fill: #dbedff;
}

.generation-6 .detailed rect.bygeneration, .generation6 .detailed rect.bygeneration {
  fill: #dbdbff;
}

.generation-5 .detailed rect.bygeneration, .generation7 .detailed rect.bygeneration {
  fill: #eddbff;
}

.generation-4 .detailed rect.bygeneration, .generation8 .detailed rect.bygeneration {
  fill: #ffdbff;
}

.generation-3 .detailed rect.bygeneration, .generation9 .detailed rect.bygeneration {
  fill: #ffdbed;
}

.generation-2 .detailed rect.bygeneration, .generation10 .detailed rect.bygeneration {
  fill: #ffdbdb;
}

.generation-1 .detailed rect.bygeneration, .generation11 .detailed rect.bygeneration {
  fill: #ffeddb;
}`;
  }

  private transition<T>(selection: Selection<BaseType, T, BaseType, {}>) {
    return this.options.animate
      ? selection
          .transition()
          .delay(ANIMATION_DELAY_MS)
          .duration(ANIMATION_DURATION_MS)
      : selection;
  }

  private getFamTransform(node: TreeNode): string {
    if (this.options.horizontal) {
      return `translate(${
        (node.indi && node.indi.width) || node.spouse!.width
      }, ${max([getFamPositionHorizontal(node), 0])})`;
    }
    return `translate(${max([getFamPositionVertical(node), 0])}, ${
      (node.indi && node.indi.height) || node.spouse!.height
    })`;
  }

  private getSexClass(indiId: string) {
    const sex = this.options.data.getIndi(indiId)?.getSex();
    switch (sex) {
      case 'M':
        return 'male';
      case 'F':
        return 'female';
      default:
        return '';
    }
  }

  private renderIndi(
    enter: Selection<BaseType, OffsetIndi, BaseType, {}>,
    update: Selection<BaseType, OffsetIndi, BaseType, {}>
  ) {
    if (this.options.indiHrefFunc) {
      enter = enter
        .append('a')
        .attr('href', (data) => this.options.indiHrefFunc!(data.indi.id));
      update = update.select('a');
    }
    if (this.options.indiCallback) {
      enter.on('click', (event, data) =>
        this.options.indiCallback!({
          id: data.indi.id,
          generation: data.generation,
        })
      );
    }
    // Background.
    const background = enter
      .append('rect')
      .attr('rx', 5)
      .attr('stroke-width', 0)
      .attr(
        'class',
        (node) =>
          `background ${this.getColoringClass()} ${this.getSexClass(
            node.indi.id
          )}`
      )
      .merge(update.select('rect.background'));
    this.transition(background)
      .attr('width', (node) => node.indi.width!)
      .attr('height', (node) => node.indi.height!);

    // Clip path.
    const getClipId = (id: string) => `clip-${id}`;
    enter
      .append('clipPath')
      .attr('id', (node) => getClipId(node.indi.id))
      .append('rect')
      .attr('rx', 5)
      .merge(update.select('clipPath rect'))
      .attr('width', (node) => node.indi.width!)
      .attr('height', (node) => node.indi.height!);

    const getIndi = (data: OffsetIndi) =>
      this.options.data.getIndi(data.indi.id);

    const getDetailsWidth = (data: OffsetIndi) =>
      data.indi.width! - (getIndi(data)!.getImageUrl() ? IMAGE_WIDTH : 0);

    // Name.
    enter
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('class', 'name')
      .attr(
        'transform',
        (node) => `translate(${getDetailsWidth(node) / 2}, 17)`
      )
      .text((node) => getIndi(node)!.getFirstName());
    enter
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('class', 'name')
      .attr(
        'transform',
        (node) => `translate(${getDetailsWidth(node) / 2}, 33)`
      )
      .text((node) => getIndi(node)!.getLastName());

    // Extract details.
    const details = new Map<string, DetailsLine[]>();
    enter.each((node) => {
      const indi = getIndi(node)!;
      const detailsList = this.getIndiDetails(indi);
      details.set(node.indi.id, detailsList);
    });

    const maxDetails = max(Array.from(details.values(), (v) => v.length))!;

    // Render details.
    for (let i = 0; i < maxDetails; ++i) {
      const lineGroup = enter.filter(
        (data) => details.get(data.indi.id)!.length > i
      );
      lineGroup
        .append('text')
        .attr('text-anchor', 'middle')
        .attr('class', 'details')
        .attr('transform', `translate(9, ${49 + i * DETAILS_HEIGHT})`)
        .text((data) => details.get(data.indi.id)![i].symbol);
      lineGroup
        .append('text')
        .attr('class', 'details')
        .attr('transform', `translate(15, ${49 + i * DETAILS_HEIGHT})`)
        .text((data) => details.get(data.indi.id)![i].text);
    }

    // Render id.
    const id = enter
      .append('text')
      .attr('class', 'id')
      .text((data) => (getIndi(data)!.showId() ? data.indi.id : ''))
      .merge(update.select('text.id'));
    this.transition(id).attr(
      'transform',
      (data) => `translate(9, ${data.indi.height! - 5})`
    );

    // Render sex.
    const sex = enter
      .append('text')
      .attr('class', 'details sex')
      .attr('text-anchor', 'end')
      .text((data) => {
        const sexSymbol = SEX_SYMBOLS.get(getIndi(data)!.getSex() || '') || '';
        return getIndi(data)!.showSex() ? sexSymbol : '';
      })
      .merge(update.select('text.sex'));
    this.transition(sex).attr(
      'transform',
      (data) =>
        `translate(${getDetailsWidth(data) - 5}, ${data.indi.height! - 5})`
    );

    // Image.
    enter
      .filter((data) => !!getIndi(data)!.getImageUrl())
      .append('image')
      .attr('width', IMAGE_WIDTH)
      .attr('height', (data) => data.indi.height!)
      .attr('preserveAspectRatio', 'xMidYMin')
      .attr(
        'transform',
        (data) => `translate(${data.indi.width! - IMAGE_WIDTH}, 0)`
      )
      .attr('clip-path', (data) => `url(#${getClipId(data.indi.id)})`)
      .attr('href', (data) => getIndi(data)!.getImageUrl());

    // Border on top.
    const border = enter
      .append('rect')
      .attr('rx', 5)
      .attr('fill-opacity', 0)
      .attr('class', 'border')
      .merge(update.select('rect.border'));
    this.transition(border)
      .attr('width', (data) => data.indi.width!)
      .attr('height', (data) => data.indi.height!);
  }

  private renderFamily(enter: TreeNodeSelection, update: TreeNodeSelection) {
    if (this.options.famHrefFunc) {
      enter = enter
        .append('a')
        .attr('href', (node) =>
          this.options.famHrefFunc!(node.data.family!.id)
        );
    }
    if (this.options.famCallback) {
      enter.on('click', (event, node) =>
        this.options.famCallback!({
          id: node.data.family!.id,
          generation: node.data.generation!,
        })
      );
    }

    // Extract details.
    const details = new Map<string, DetailsLine[]>();
    enter.each((node) => {
      const famId = node.data.family!.id;
      const fam = this.options.data.getFam(famId)!;
      const detailsList = this.getFamDetails(fam);
      details.set(famId, detailsList);
    });
    const maxDetails = max(Array.from(details.values(), (v) => v.length))!;

    // Box.
    enter
      .filter((node) => {
        const detail = details.get(node.data.family!.id)!;
        return 0 < detail.length
      })
      .append('rect')
      .attr('class', this.getColoringClass())
      .attr('rx', 5)
      .attr('ry', 5)
      .attr('width', (node) => node.data.family!.width!)
      .attr('height', (node) => node.data.family!.height!);

    // Render details.
    for (let i = 0; i < maxDetails; ++i) {
      const lineGroup = enter.filter(
        (node) => details.get(node.data.family!.id)!.length > i
      );
      lineGroup
        .append('text')
        .attr('text-anchor', 'middle')
        .attr('class', 'details')
        .attr('transform', `translate(9, ${16 + i * DETAILS_HEIGHT})`)
        .text((node) => details.get(node.data.family!.id)![i].symbol);
      lineGroup
        .append('text')
        .attr('text-anchor', 'start')
        .attr('class', 'details')
        .attr('transform', `translate(15, ${16 + i * DETAILS_HEIGHT})`)
        .text((node) => details.get(node.data.family!.id)![i].text);
    }
  }
}
