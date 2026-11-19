# src

This directory contains the TypeScript source of Topola 4, organized into five isolated subdirectories with compile-time (`tsc -b`) and test-time (`tests/architecture.spec.ts`) barrel-only import boundaries:

```text
src/
├── index.ts                      # Convenience barrel re-exporting all five public entry points
├── core/                         # topola/core (zero knowledge of personal fields or dates)
│   ├── index.ts
│   ├── internal.ts               # Cross-subpackage internal barrel (not in package.json exports)
│   ├── types.ts
│   ├── axes.ts
│   ├── id-generator.ts
│   ├── class-token.ts
│   ├── tree-builder.ts
│   ├── hourglass-layout.ts
│   ├── relatives-layout.ts
│   ├── tidy-tree.ts
│   ├── d3-flextree.d.ts
│   ├── layout.ts
│   ├── text-measurer.ts
│   ├── css-generator.ts
│   ├── default-link-layer.ts
│   ├── expander-renderer.ts
│   └── chart.ts
├── toolkit/                      # topola/toolkit (imports ONLY ../core/{index,internal}.js)
│   ├── index.ts
│   ├── text-box.ts
│   └── couple-assembler.ts
├── model/                        # topola/model (imports ONLY ../core/index.js)
│   ├── index.ts
│   ├── internal.ts               # Cross-subpackage internal barrel (not in package.json exports)
│   ├── types.ts
│   ├── graph-adapter.ts
│   ├── date-format.ts
│   └── confidence.ts
├── presets/                      # topola/presets (imports ONLY public or internal barrels)
│   ├── index.ts
│   ├── simple.ts
│   ├── detailed.ts
│   ├── circle.ts
│   ├── fancy.ts
│   └── schemes.ts
└── gedcom/                       # topola/gedcom (imports ONLY ../model/index.js)
    ├── index.ts
    ├── gedcom-parser.ts
    └── parse-gedcom.d.ts
```
