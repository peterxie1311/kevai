import { build } from 'esbuild';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
const result = await build({ entryPoints: ['src/main.ts'], bundle: true, write: false, format: 'iife', target: 'es2022', minify: true });
const js = result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const html = (await readFile('index.html', 'utf8')).replace('<!--APP-->', `<script>${js}</script>`);
await mkdir('dist', { recursive: true });
await writeFile('dist/index.html', html);
console.log('Built dist/index.html (self-contained; double-click to open)');
