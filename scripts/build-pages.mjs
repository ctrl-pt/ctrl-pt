import {cp, mkdir, readFile, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {validateSnapshot} from './github-live.mjs';
import {renderStats, renderCalendar, renderSnake} from './svg-render.mjs';

const root = new URL('../', import.meta.url);
const output = new URL('_site/', root);
const snapshot = validateSnapshot(JSON.parse(await readFile(new URL('data/github.json', root), 'utf8')));
if (!snapshot.fetchedAt) throw new Error('A verified collection timestamp is required');
const data = {...snapshot, source: 'github-actions-snapshot', freshness: 'scheduled'};

await mkdir(new URL('api/', output), {recursive: true});
await cp(new URL('web/', root), output, {recursive: true});
await writeFile(new URL('data.js', output), '// Offline copy of the same published GitHub snapshot.\nwindow.PROFILE_FALLBACK = '+JSON.stringify(data)+';\n');
await writeFile(new URL('api/github.json', output), JSON.stringify(data, null, 2)+'\n');
const images = {
  'stats.svg': renderStats(data),
  'stats-mobile.svg': renderStats(data, true),
  'calendar.svg': renderCalendar(data),
  'calendar-mobile.svg': renderCalendar(data, true),
  'snake.svg': renderSnake(data),
  'snake-static.svg': renderSnake(data, false, true),
};
for (const [name, svg] of Object.entries(images)) await writeFile(new URL('api/'+name, output), svg);
await writeFile(new URL('.nojekyll', output), '');
console.log('Built GitHub Pages at '+fileURLToPath(output)+' using snapshot '+data.fetchedAt);
