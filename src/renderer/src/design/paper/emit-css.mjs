#!/usr/bin/env node
/** Regenerate tokens.css from tokens.ts. Run from repo root:
 *    node --experimental-strip-types src/renderer/src/design/paper/emit-css.mjs
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const dir = dirname(fileURLToPath(import.meta.url));
const { emitPaperCss } = await import(pathToFileURL(join(dir, 'tokens.ts')).href);
const out = join(dir, 'tokens.css');
writeFileSync(out, emitPaperCss());
console.log('wrote', out);
