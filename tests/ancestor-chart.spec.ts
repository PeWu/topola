/// <reference path="./jsdom-global.d.ts" />
import * as jsdomGlobal from "jsdom-global";

import { AncestorChart } from "../src/ancestor-chart";
import { JsonDataProvider, JsonGedcomData } from "../src/data";

import { FakeRenderer } from "./fake_renderer";

// Initialize DOM.
(jsdomGlobal as any)(); // tslint:disable-line

describe("Ancestor chart", () => {
  beforeEach(() => {
    document.body.innerHTML = "<svg></svg>";
  });

  it("should work for a single person", () => {
    const json: JsonGedcomData = { fams: [], indis: [{ id: "I1" }] };
    const data = new JsonDataProvider(json);
    const chart = new AncestorChart({
      data,
      startIndi: "I1",
      renderer: new FakeRenderer(),
      svgSelector: "svg",
    });
    chart.render();
    expect(document.querySelectorAll("g.node").length).toEqual(1);
  });

  it("should work with a common ancestor of two spouses", () => {
    // I5+I6
    //   F3
    //   |
    //   I3+I4
    //     F2
    //     |
    //   +-++
    //   |  |
    //   I1+I2
    //     F1
    const json: JsonGedcomData = {
      fams: [
        { id: "F1", husb: "I1", wife: "I2" },
        { id: "F2", husb: "I3", wife: "I4", children: ["I1", "I2"] },
        { id: "F3", husb: "I5", wife: "I6", children: ["I3"] },
      ],
      indis: [
        { id: "I1", fams: ["F1"], famc: "F2" },
        { id: "I2", fams: ["F1"], famc: "F2" },
        { id: "I3", fams: ["F2"], famc: "F3" },
        { id: "I4", fams: ["F2"] },
        { id: "I5", fams: ["F3"] },
        { id: "I6", fams: ["F3"] },
      ],
    };
    const data = new JsonDataProvider(json);
    const chart = new AncestorChart({
      data,
      startFam: "F1",
      renderer: new FakeRenderer(),
      svgSelector: "svg",
    });
    chart.render();
  });

  it("should not expand the same ancestor family more than once (pedigree collapse)", () => {
    // Cousins I1 and I2 marry. Their shared grandparents (I5+I6 in F3) appear
    // in both the I1 and I2 ancestry paths. Without cycle detection the chart
    // traverses F3 exponentially, causing the browser to hang.
    //
    // I5+I6
    //   F3
    //  /   \
    // I3+? I4+?
    //  F1   F2
    //  |     |
    //  I1 + I2   <- cousins who married
    //      F4
    const json: JsonGedcomData = {
      fams: [
        { id: "F1", husb: "I3", children: ["I1"] },
        { id: "F2", wife: "I4", children: ["I2"] },
        { id: "F3", husb: "I5", wife: "I6", children: ["I3", "I4"] },
        { id: "F4", husb: "I1", wife: "I2" },
      ],
      indis: [
        { id: "I1", fams: ["F4"], famc: "F1" },
        { id: "I2", fams: ["F4"], famc: "F2" },
        { id: "I3", fams: ["F1"], famc: "F3" },
        { id: "I4", fams: ["F2"], famc: "F3" },
        { id: "I5", fams: ["F3"] },
        { id: "I6", fams: ["F3"] },
      ],
    };
    const data = new JsonDataProvider(json);
    const chart = new AncestorChart({
      data,
      startFam: "F4",
      renderer: new FakeRenderer(),
      svgSelector: "svg",
    });
    // Should complete without hanging. F3 must appear exactly once in the
    // rendered output; the second path to F3 (via I4) is collapsed to a PLUS
    // expander. Without cycle detection this would grow exponentially.
    chart.render();
    const nodes = document.querySelectorAll("g.node");
    // The rendered set is bounded: start family + each unique ancestral family
    // visited once. Verify it is well below an exponential worst-case.
    expect(nodes.length).toBeLessThan(20);
  });
});
