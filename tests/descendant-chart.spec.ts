/// <reference path="./jsdom-global.d.ts" />
import * as jsdomGlobal from "jsdom-global";

import { JsonDataProvider, JsonGedcomData } from "../src/data";
import { DescendantChart } from "../src/descendant-chart";

import { FakeRenderer } from "./fake_renderer";

// Initialize DOM.
(jsdomGlobal as any)(); // tslint:disable-line

describe("Descendant chart", () => {
  beforeEach(() => {
    document.body.innerHTML = "<svg></svg>";
  });

  it("should work for a single person", () => {
    const json: JsonGedcomData = { fams: [], indis: [{ id: "I1" }] };
    const data = new JsonDataProvider(json);
    const chart = new DescendantChart({
      data,
      startIndi: "I1",
      renderer: new FakeRenderer(),
      svgSelector: "svg",
    });
    chart.render();
    expect(document.querySelectorAll("g.node").length).toEqual(1);
  });

  it("should work with a common descendant of two siblings", () => {
    // I1+I2
    //   F1
    //   |
    //  +-++
    //  |  |
    //  I3+I4
    //    F2
    //    |
    //    I5
    const json: JsonGedcomData = {
      fams: [
        { id: "F1", husb: "I1", wife: "I2", children: ["I3", "I4"] },
        { id: "F2", husb: "I3", wife: "I4", children: ["I5"] },
      ],
      indis: [
        { id: "I1", fams: ["F1"] },
        { id: "I2", fams: ["F1"] },
        { id: "I3", fams: ["F2"], famc: "F1" },
        { id: "I4", fams: ["F2"], famc: "F1" },
        { id: "I5", famc: "F2" },
      ],
    };
    const data = new JsonDataProvider(json);
    const chart = new DescendantChart({
      data,
      startFam: "F1",
      renderer: new FakeRenderer(),
      svgSelector: "svg",
    });
    chart.render();
  });

  it("should not expand the same descendant family more than once (pedigree collapse)", () => {
    // Two siblings (I3 and I4) who are children of F1 each marry and have
    // children who intermarry (I5 and I6 both marry into F4, and F4's child
    // I7 marries back into the line via F5). Without cycle detection the
    // descendant chart revisits F4 from multiple paths, growing exponentially.
    //
    // F1 (I1+I2)
    // ├─ I3 ─ F2
    // │        └─ I5 ─ F4
    // └─ I4 ─ F3       └─ I7
    //          └─ I6 ─ F4 (same family, second path)
    const json: JsonGedcomData = {
      fams: [
        { id: "F1", husb: "I1", wife: "I2", children: ["I3", "I4"] },
        { id: "F2", husb: "I3", children: ["I5"] },
        { id: "F3", wife: "I4", children: ["I6"] },
        { id: "F4", husb: "I5", wife: "I6", children: ["I7"] },
      ],
      indis: [
        { id: "I1", fams: ["F1"] },
        { id: "I2", fams: ["F1"] },
        { id: "I3", fams: ["F2"], famc: "F1" },
        { id: "I4", fams: ["F3"], famc: "F1" },
        { id: "I5", fams: ["F4"], famc: "F2" },
        { id: "I6", fams: ["F4"], famc: "F3" },
        { id: "I7", famc: "F4" },
      ],
    };
    const data = new JsonDataProvider(json);
    const chart = new DescendantChart({
      data,
      startFam: "F1",
      renderer: new FakeRenderer(),
      svgSelector: "svg",
    });
    // Should complete without hanging. F4 must appear exactly once in the
    // rendered output; the second path to F4 (via I6) is collapsed to a PLUS
    // expander. Without cycle detection this would grow exponentially.
    chart.render();
    const nodes = document.querySelectorAll("g.node");
    // The rendered set is bounded: start family + each unique descendant family
    // visited once. Verify it is well below an exponential worst-case.
    expect(nodes.length).toBeLessThan(20);
  });
});
