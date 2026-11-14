/* Obfuscates the app code chunks in dist/assets after `vite build`.
   Skips the geo-* chunk — it is 2MB of base64 coastline data, not code. */
import JavaScriptObfuscator from 'javascript-obfuscator';
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';

const dir = 'dist/assets';
for (const f of readdirSync(dir)) {
  if (!f.endsWith('.js') || f.startsWith('geo-')) continue;
  const p = `${dir}/${f}`;
  const before = statSync(p).size;
  const out = JavaScriptObfuscator.obfuscate(readFileSync(p, 'utf8'), {
    compact: true,
    identifierNamesGenerator: 'hexadecimal',
    renameGlobals: false,
    stringArray: true,
    stringArrayThreshold: 0.75,
    stringArrayRotate: true,
    stringArrayShuffle: true,
    stringArrayEncoding: ['base64'],
    controlFlowFlattening: false,   // keep the 60fps render loop fast
    deadCodeInjection: false,
    selfDefending: false,
    sourceMap: false,
  });
  writeFileSync(p, out.getObfuscatedCode());
  console.log(`obfuscated ${f}: ${(before / 1024).toFixed(0)}kB -> ${(statSync(p).size / 1024).toFixed(0)}kB`);
}
