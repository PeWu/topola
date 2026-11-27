import {
  createChart,
  expanderKey,
  type ExpanderKey,
} from 'topola/core';
import { createModelGraph, type ModelDataInput } from 'topola/model';
import { createDetailedNodePlugin, generationScheme } from 'topola/presets';
import data from './data.json';

const graph = createModelGraph(data as ModelDataInput);
const viewport = document.getElementById('viewport')!;

let startIndi = 'I9555';
let baseGeneration = 0;
const collapsed = new Set<ExpanderKey>();

const chart = createChart({
  svg: '#chart',
  config: {
    graph,
    chart: 'hourglass',
    animate: true,
    expanders: true,
    nodePlugin: createDetailedNodePlugin({ model: graph }),
    schemes: [generationScheme()],
    // Click any person to smoothly refocus the tree on them.
    onPersonClick: ({ id, generation }) => {
      startIndi = id;
      baseGeneration = generation;
      chart.update({ startIndi, baseGeneration, collapsed });
    },
    // Click [+] / [-] to fold or unfold branches.
    onExpanderClick: ({ nodeId, slot }) => {
      const key = expanderKey(nodeId, slot);
      if (collapsed.has(key)) collapsed.delete(key);
      else collapsed.add(key);
      chart.update({ startIndi, baseGeneration, collapsed });
    },
    // Keep the focused person centered after every layout update.
    onLayout: (layout, { animated }) => {
      const left = Math.max(0, layout.origin[0] - viewport.clientWidth / 2);
      const top = Math.max(0, layout.origin[1] - viewport.clientHeight / 2);
      viewport.scrollTo({ left, top, behavior: animated ? 'smooth' : 'auto' });
    },
  },
});

chart.update({ startIndi, baseGeneration, collapsed });
