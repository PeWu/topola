import * as fs from 'node:fs';
import * as path from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const SUBPACKAGES = ['core', 'toolkit', 'model', 'presets', 'gedcom'] as const;
type Subpackage = (typeof SUBPACKAGES)[number];

const ALLOWED_UPSTREAM: Record<Subpackage, readonly Subpackage[]> = {
  core: [],
  toolkit: ['core'],
  model: ['core'],
  presets: ['core', 'toolkit', 'model'],
  gedcom: ['model'],
};

function collectTsFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...collectTsFiles(full));
    } else if (entry.isFile() && entry.name.endsWith('.ts')) {
      out.push(full);
    }
  }
  return out.sort();
}

export function extractModuleSpecifiers(source: string): {
  moduleSpecs: string[];
  typeRefSpecs: string[];
} {
  const info = ts.preProcessFile(source, true, true);
  const moduleSpecs = [
    ...info.importedFiles.map((f) => f.fileName),
    ...info.referencedFiles.map((f) => f.fileName),
  ];
  const typeRefSpecs = info.typeReferenceDirectives.map((f) => f.fileName);
  return { moduleSpecs, typeRefSpecs };
}

describe('Architecture & module boundaries', () => {
  const srcRoot = path.resolve(__dirname, '../src');

  it('enforces strict barrel-only DAG imports across src/{core,toolkit,model,presets,gedcom}', () => {
    const violations: string[] = [];

    // Only src/index.ts may sit directly under src/, and it may only re-export subpath barrels
    const rootTsFiles = fs
      .readdirSync(srcRoot, { withFileTypes: true })
      .filter((e) => e.isFile() && e.name.endsWith('.ts'))
      .map((e) => e.name)
      .sort();
    if (rootTsFiles.join(',') !== 'index.ts') {
      violations.push(
        `src/: unexpected root .ts files [${rootTsFiles.join(', ')}] (expected only index.ts)`,
      );
    }
    const allowedRootSpecs = new Set(SUBPACKAGES.map((p) => `./${p}/index.js`));
    const rootInfo = extractModuleSpecifiers(
      fs.readFileSync(path.join(srcRoot, 'index.ts'), 'utf8'),
    );
    for (const spec of [...rootInfo.moduleSpecs, ...rootInfo.typeRefSpecs]) {
      if (!allowedRootSpecs.has(spec)) {
        violations.push(`index.ts: forbidden import "${spec}"`);
      }
    }

    // package.json exports must never expose internal.js barrels
    const pkgJson = JSON.parse(
      fs.readFileSync(path.resolve(srcRoot, '../package.json'), 'utf8'),
    ) as { exports?: Record<string, unknown> };
    for (const exportKey of Object.keys(pkgJson.exports ?? {})) {
      if (exportKey.includes('internal')) {
        violations.push(
          `package.json: exports must not expose internal subpath "${exportKey}"`,
        );
      }
    }

    for (const pkg of SUBPACKAGES) {
      const pkgDir = path.join(srcRoot, pkg);
      const files = collectTsFiles(pkgDir);
      const allowed = new Set(
        ALLOWED_UPSTREAM[pkg].flatMap((up) => [
          `../${up}/index.js`,
          `../${up}/internal.js`,
        ]),
      );

      for (const file of files) {
        const relFile = path.relative(srcRoot, file);
        const content = fs.readFileSync(file, 'utf8');
        const { moduleSpecs, typeRefSpecs } = extractModuleSpecifiers(content);

        for (const spec of typeRefSpecs) {
          if (spec === 'topola' || spec.startsWith('topola/')) {
            violations.push(
              `${relFile}: forbidden package type reference "${spec}"`,
            );
          }
          if (
            pkg !== 'gedcom' &&
            (spec === 'parse-gedcom' || spec.startsWith('parse-gedcom/'))
          ) {
            violations.push(
              `${relFile}: forbidden parse-gedcom type reference "${spec}" in ${pkg}`,
            );
          }
        }

        for (const spec of moduleSpecs) {
          if (!spec.startsWith('.')) {
            if (spec === 'topola' || spec.startsWith('topola/')) {
              violations.push(
                `${relFile}: forbidden package self-import "${spec}"`,
              );
            }
            if (
              pkg !== 'gedcom' &&
              (spec === 'parse-gedcom' || spec.startsWith('parse-gedcom/'))
            ) {
              violations.push(
                `${relFile}: forbidden external import "${spec}" in ${pkg}`,
              );
            }
            continue;
          }

          const resolved = path.resolve(path.dirname(file), spec);
          const relToPkg = path.relative(pkgDir, resolved);

          if (relToPkg.startsWith('..')) {
            // Cross-directory import: must be an allowed ../<upstream>/index.js barrel
            if (!allowed.has(spec)) {
              violations.push(
                `${relFile}: cross-directory import "${spec}" violates boundary (allowed: ${
                  Array.from(allowed).join(', ') || 'none'
                })`,
              );
            }
          } else {
            // Intra-directory import: must end in .js (or .d.ts only for triple-slash reference)
            if (!spec.endsWith('.js') && !spec.endsWith('.d.ts')) {
              violations.push(
                `${relFile}: intra-package relative import "${spec}" must use explicit .js extension for NodeNext ESM`,
              );
            }
          }
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it('extracts specifiers accurately across multi-line imports with apostrophe comments and references', () => {
    const sample = [
      '/// <reference path="./d3-flextree.d.ts" />',
      '/// <reference types="node" />',
      'import {',
      "  // Don't touch internals",
      '  layoutTidyTree,',
      '} from "../core/tidy-tree.js";',
      'const lazy = () => import("../gedcom/index.js");',
    ].join('\n');
    expect(extractModuleSpecifiers(sample)).toEqual({
      moduleSpecs: [
        '../core/tidy-tree.js',
        '../gedcom/index.js',
        './d3-flextree.d.ts',
      ],
      typeRefSpecs: ['node'],
    });
  });
});
