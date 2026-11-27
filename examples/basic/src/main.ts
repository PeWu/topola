import { createChart } from 'topola/core';
import { createModelGraph, type ModelDataInput } from 'topola/model';
import { createDetailedNodePlugin, generationScheme } from 'topola/presets';

const data: ModelDataInput = {
  indis: [
    {
      id: 'I1',
      firstName: 'John',
      lastName: 'Smith',
      famc: 'F1',
    },
    {
      id: 'I2',
      firstName: 'Peter',
      lastName: 'Smith',
      fams: ['F1'],
    },
    {
      id: 'I3',
      firstName: 'Laura',
      lastName: 'Abbot',
      fams: ['F1'],
    },
  ],
  fams: [
    {
      id: 'F1',
      husb: 'I2',
      wife: 'I3',
      children: ['I1'],
    },
  ],
};

const graph = createModelGraph(data);

const chart = createChart({
  svg: '#chart',
  config: {
    graph,
    chart: 'hourglass',
    nodePlugin: createDetailedNodePlugin({ model: graph }),
    schemes: [generationScheme()],
  },
});

chart.update({ startIndi: 'I1' });
