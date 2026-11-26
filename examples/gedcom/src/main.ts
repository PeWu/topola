import { createChart } from 'topola/core';
import { gedcomToModel } from 'topola/gedcom';
import { createModelGraph } from 'topola/model';
import { createSimpleNodePlugin } from 'topola/presets';

const gedcom = `
0 @I1@ INDI
1 NAME John /Smith/
1 FAMC @F1@
0 @I2@ INDI
1 NAME Peter /Smith/
0 @I3@ INDI
1 NAME Laura /Abbot/
0 @F1@ FAM
1 HUSB @I2@
1 WIFE @I3@
1 CHIL @I1@
`;

const model = gedcomToModel(gedcom);
const graph = createModelGraph(model);

const chart = createChart({
  svg: '#chart',
  config: {
    graph,
    chart: 'hourglass',
    direction: 'right',
    nodePlugin: createSimpleNodePlugin({ model: graph }),
  },
});

chart.update({ startIndi: model.indis[0]!.id });
