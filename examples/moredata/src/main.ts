import { createChart } from 'topola/core';
import { createModelGraph, type ModelDataInput } from 'topola/model';
import { createDetailedNodePlugin, generationScheme } from 'topola/presets';
import data from './data.json';

const TNG_PERSON_URL =
  'http://kielakowie.pl/tng/getperson.php?tree=tree381&personID=';
const TNG_FAM_URL =
  'http://kielakowie.pl/tng/familygroup.php?tree=tree381&familyID=';

const graph = createModelGraph(data as ModelDataInput);

const chart = createChart({
  svg: '#chart',
  config: {
    graph,
    chart: 'hourglass',
    nodePlugin: createDetailedNodePlugin({ model: graph }),
    schemes: [generationScheme()],
    onPersonClick: ({ id }) => {
      window.open(TNG_PERSON_URL + encodeURIComponent(id), '_blank', 'noopener');
    },
    onFamilyClick: ({ id }) => {
      window.open(TNG_FAM_URL + encodeURIComponent(id), '_blank', 'noopener');
    },
  },
});

// Starting from I9555 automatically shows their marriage (F3047) at the root.
chart.update({ startIndi: 'I9555' });
