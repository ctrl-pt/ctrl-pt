import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {test} from 'node:test';
import {fileURLToPath} from 'node:url';
import {parseCalendar, validateSnapshot} from './github-live.mjs';

// A Sunday rollover drops the previous week, while GitHub's heading can still
// include its 15 contributions: 598 in the heading, 583 in the visible cells.
function calendarHtml({total = 583, length = 365} = {}) {
  const days = Array.from({length}, (_, index) => {
    const date = new Date(Date.UTC(2025, 9, 19 + index)).toISOString().slice(0, 10);
    const count = index === 0 ? 583 : 0;
    return `<td id="day-${index}" data-date="${date}" data-level="${count ? 4 : 0}"></td>
      <tool-tip for="day-${index}">${count || 'No'} contributions on ${date}.</tool-tip>`;
  });
  return `<h2 id="js-contribution-activity-description">${total} contributions in the last year</h2>${days.join('')}`;
}

test('parses a complete calendar whose heading matches its daily counts', () => {
  const calendar = parseCalendar(calendarHtml());
  assert.equal(calendar.totalContributions, 583);
  assert.equal(calendar.weeks.flat().length, 365);
  assert.deepEqual(calendar.range, ['2025-10-19', '2026-10-18']);
});

test('Sunday rollover uses daily counts even when the heading retains the previous week', () => {
  const calendar = parseCalendar(calendarHtml({total: 598}));
  assert.equal(calendar.totalContributions, 583);
  const snapshot = validateSnapshot({
    ...calendar,
    account: {login: 'ctrl-pt', followers: 0, public_repos: 0},
    repos: [],
  });
  assert.equal(snapshot.totalContributions, 583);
  assert.deepEqual(snapshot.range, ['2025-10-19', '2026-10-18']);
});

test('calendar CLI preserves JSON stdout and reports a stale heading on stderr', () => {
  const parsed = spawnSync(process.execPath, [fileURLToPath(new URL('./parse-calendar.mjs', import.meta.url))], {
    input: calendarHtml({total: 598}), encoding: 'utf8',
  });
  assert.equal(parsed.status, 0, parsed.stderr);
  assert.equal(JSON.parse(parsed.stdout).totalContributions, 583);
  assert.match(parsed.stderr, /heading reports 598; using 583/);
});

test('rejects an incomplete contribution year', () => {
  assert.throws(() => parseCalendar(calendarHtml({length: 349})), /Incomplete contribution year/);
});

test('rejects a missing daily tooltip instead of inventing its contribution count', () => {
  const html = calendarHtml({total: 598}).replace(/<tool-tip for="day-1">.*?<\/tool-tip>/, '');
  assert.throws(() => parseCalendar(html), /Missing contribution tooltip/);
});

test('rejects duplicate contribution dates', () => {
  const html = calendarHtml().replace('data-date="2025-10-20"', 'data-date="2025-10-19"');
  assert.throws(() => parseCalendar(html), /Duplicate or unidentified contribution cell/);
});

test('rejects a gap in the calendar dates', () => {
  const html = calendarHtml().replace('data-date="2026-10-18"', 'data-date="2026-10-19"');
  assert.throws(() => parseCalendar(html), /non-contiguous contribution dates/);
});

test('rejects an unrecognized tooltip', () => {
  const html = calendarHtml().replace('583 contributions on', 'Unknown activity on');
  assert.throws(() => parseCalendar(html), /Unrecognized contribution tooltip/);
});
