import {parseCalendar} from './github-live.mjs';
let html='';
for await (const chunk of process.stdin) html+=chunk;
process.stdout.write(JSON.stringify(parseCalendar(html)));
