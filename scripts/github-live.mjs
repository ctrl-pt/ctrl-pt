// All widgets share one ctrl-pt snapshot. No account credential is required.
const GITHUB_LOGIN = 'ctrl-pt';
const CALENDAR_URL = 'https://github.com/users/ctrl-pt/contributions';
const ACCOUNT_URL = 'https://api.github.com/users/ctrl-pt';
const REPOS_URL = 'https://api.github.com/users/ctrl-pt/repos';
const FALLBACK_URL = 'https://raw.githubusercontent.com/ctrl-pt/ctrl-pt/main/data/github.json';
const SNAPSHOT_TTL_MS = 180_000;
const STALE_LIMIT_MS = 86_400_000;
let liveSnapshot = null;
let inflightSnapshot = null;
let nextAttemptAt = 0;
let fallbackSnapshot = null;
let lastSourceError = null;

function decodeHtml(value) {
  return value.replace(/&(?:amp|quot|apos|lt|gt|nbsp|#\d+|#x[\da-f]+);/gi, entity => {
    const named = { '&amp;': '&', '&quot;': '"', '&apos;': "'", '&lt;': '<', '&gt;': '>', '&nbsp;': ' ' };
    if (named[entity.toLowerCase()] !== undefined) return named[entity.toLowerCase()];
    const hex = /^&#x/i.test(entity);
    return String.fromCodePoint(parseInt(entity.slice(hex ? 3 : 2, -1), hex ? 16 : 10));
  });
}

function attributes(tag) {
  const result = {};
  for (const match of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) {
    result[match[1].toLowerCase()] = decodeHtml(match[2] ?? match[3]);
  }
  return result;
}

function textOnly(html) {
  return decodeHtml(html.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function dateMilliseconds(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Invalid contribution date');
  const time = Date.parse(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(time) || new Date(time).toISOString().slice(0, 10) !== value) {
    throw new Error('Invalid contribution date');
  }
  return time;
}

function nonnegativeInteger(value, label) {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error(`Invalid ${label}`);
  return value;
}

function groupDays(days) {
  const weeks = [];
  for (const day of days) {
    if (!weeks.length || day.weekday === 0) weeks.push([]);
    weeks[weeks.length - 1].push(day);
  }
  return weeks;
}

function validateDays(days, total) {
  if (days.length < 350 || days.length > 375) throw new Error('Incomplete contribution year');
  days.sort((a, b) => a.date.localeCompare(b.date));
  let sum = 0;
  let previous = null;
  for (const day of days) {
    const time = dateMilliseconds(day.date);
    if (previous !== null && time - previous !== 86_400_000) {
      throw new Error('Duplicate or non-contiguous contribution dates');
    }
    day.weekday = new Date(time).getUTCDay();
    sum += nonnegativeInteger(day.contributionCount, 'contribution count');
    if (day.contributionLevel !== undefined && (!Number.isInteger(day.contributionLevel) || day.contributionLevel < 0 || day.contributionLevel > 4)) {
      throw new Error('Invalid contribution intensity');
    }
    previous = time;
  }
  if (sum !== nonnegativeInteger(total, 'contribution total')) throw new Error('Contribution total does not match day counts');
  return days;
}

// GitHub's level is a relative intensity; only the tooltip contains exact counts.
export function parseCalendar(html) {
  if (typeof html !== 'string') throw new Error('Invalid contribution response');
  let total = null;
  for (const match of html.matchAll(/<h2\b([^>]*)>([\s\S]*?)<\/h2>/gi)) {
    if (attributes(match[1]).id === 'js-contribution-activity-description') {
      const count = textOnly(match[2]).match(/^([\d,]+)\s+contributions?\b/i);
      if (total !== null || !count) throw new Error('Missing or ambiguous contribution total');
      total = Number(count[1].replace(/,/g, ''));
    }
  }
  if (total === null) throw new Error('Missing contribution total');
  const cells = new Map();
  const dates = new Set();
  for (const match of html.matchAll(/<td\b([^>]*)>/gi)) {
    const attrs = attributes(match[1]);
    if (attrs['data-date'] === undefined) continue;
    if (!attrs.id || cells.has(attrs.id) || dates.has(attrs['data-date'])) {
      throw new Error('Duplicate or unidentified contribution cell');
    }
    const level = Number(attrs['data-level']);
    if (attrs['data-level'] === undefined || !Number.isInteger(level) || level < 0 || level > 4) {
      throw new Error('Missing contribution intensity');
    }
    cells.set(attrs.id, { date: attrs['data-date'], contributionLevel: level, contributionCount: null });
    dates.add(attrs['data-date']);
  }
  for (const match of html.matchAll(/<tool-tip\b([^>]*)>([\s\S]*?)<\/tool-tip>/gi)) {
    const attrs = attributes(match[1]);
    const cell = cells.get(attrs.for);
    if (!cell) continue;
    if (cell.contributionCount !== null) throw new Error('Duplicate contribution tooltip');
    const label = textOnly(match[2]);
    const count = label.match(/^([\d,]+)\s+contributions?\s+on\b/i);
    if (/^No contributions\s+on\b/i.test(label)) cell.contributionCount = 0;
    else if (count) cell.contributionCount = Number(count[1].replace(/,/g, ''));
    else throw new Error('Unrecognized contribution tooltip');
  }
  const days = [...cells.values()];
  if (days.some(day => day.contributionCount === null)) throw new Error('Missing contribution tooltip');
  validateDays(days, total);
  return { weeks: groupDays(days), totalContributions: total, range: [days[0].date, days[days.length - 1].date] };
}

function validateSnapshot(data) {
  if (!data || data.account?.login?.toLowerCase() !== GITHUB_LOGIN || !Array.isArray(data.weeks) || !Array.isArray(data.repos)) {
    throw new Error('Invalid ctrl-pt snapshot');
  }
  const account = {
    login: GITHUB_LOGIN,
    followers: nonnegativeInteger(data.account.followers, 'follower count'),
    public_repos: nonnegativeInteger(data.account.public_repos, 'repository count'),
  };
  const days = data.weeks.flat().map(day => ({
    date: day.date,
    contributionCount: day.contributionCount,
    ...(day.contributionLevel === undefined ? {} : { contributionLevel: day.contributionLevel }),
  }));
  const computedTotal = days.reduce((sum, day) => sum + nonnegativeInteger(day.contributionCount, 'contribution count'), 0);
  validateDays(days, data.totalContributions ?? computedTotal);
  const repos = data.repos.map(repo => {
    if (typeof repo.name !== 'string' || !/^[\w.-]+$/.test(repo.name)) throw new Error('Invalid repository name');
    const expectedUrl = `https://github.com/${GITHUB_LOGIN}/${repo.name}`;
    if (repo.url !== expectedUrl) throw new Error('Invalid public repository URL');
    return {
      name: repo.name, url: expectedUrl,
      stargazerCount: nonnegativeInteger(repo.stargazerCount ?? 0, 'star count'),
      forkCount: nonnegativeInteger(repo.forkCount ?? 0, 'fork count'),
      primaryLanguage: typeof repo.primaryLanguage?.name === 'string' ? { name: repo.primaryLanguage.name } : null,
    };
  });
  const originalRepoCount = nonnegativeInteger(data.originalRepoCount ?? repos.length, 'original repository count');
  if (originalRepoCount < repos.length || originalRepoCount > account.public_repos || new Set(repos.map(repo => repo.name)).size !== repos.length) {
    throw new Error('Inconsistent original repository count');
  }
  return {
    snapshot: days[days.length - 1].date,
    fetchedAt: typeof data.fetchedAt === 'string' && Number.isFinite(Date.parse(data.fetchedAt)) ? data.fetchedAt : null,
    account, weeks: groupDays(days), totalContributions: computedTotal,
    originalRepoCount, repos, range: [days[0].date, days[days.length - 1].date],
    freshness: data.freshness, source: data.source,
  };
}

export function summarizeSnapshot(data) {
  const days = data.weeks.flat().slice().sort((a, b) => a.date.localeCompare(b.date));
  let current = 0;
  let longest = 0;
  let total = 0;
  let activeDays = 0;
  let peakDay = 0;
  const weekday = Array(7).fill(0);
  for (const day of days) {
    const count = nonnegativeInteger(day.contributionCount, 'contribution count');
    const dayOfWeek = new Date(dateMilliseconds(day.date)).getUTCDay();
    total += count;
    weekday[dayOfWeek] += count;
    peakDay = Math.max(peakDay, count);
    if (count > 0) { current += 1; activeDays += 1; longest = Math.max(longest, current); }
    else current = 0;
  }
  const result = {
    total, active_days: activeDays, longest_streak: longest, peak_day: peakDay,
    public_repos: data.account.public_repos, followers: data.account.followers,
    originals: data.originalRepoCount ?? data.repos.length,
    weekly: data.weeks.map(week => week.reduce((sum, day) => sum + day.contributionCount, 0)), weekday,
  };
  return { ...result, activeDays, longestStreak: longest, peakDay, publicRepos: result.public_repos, originalRepoCount: result.originals };
}

async function githubRequest(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(url, {
      headers: { Accept: url.startsWith('https://api.github.com/') ? 'application/vnd.github+json' : 'text/html, application/json;q=0.9', 'User-Agent': 'ctrl-pt-profile-live', 'X-GitHub-Api-Version': '2022-11-28' },
      signal: controller.signal,
      redirect: 'manual',
    });
    if (!response.ok) {
      const error = new Error(`Public GitHub source returned ${response.status}`);
      const retryAfter = Number(response.headers.get('Retry-After'));
      const resetAt = Number(response.headers.get('X-RateLimit-Reset')) * 1000;
      if (response.status === 429 || response.status === 403) {
        error.retryAt = Math.max(Date.now() + SNAPSHOT_TTL_MS, retryAfter > 0 ? Date.now() + retryAfter * 1000 : 0, resetAt > 0 ? resetAt + 1000 : 0);
      }
      throw error;
    }
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchRepositories() {
  const repos = [];
  for (let page = 1; page <= 10; page += 1) {
    const response = await githubRequest(`${REPOS_URL}?type=owner&per_page=100&sort=full_name&page=${page}`);
    const batch = await response.json();
    if (!Array.isArray(batch)) throw new Error('Invalid public repository response');
    for (const repo of batch) {
      if (repo.private !== false || repo.owner?.login?.toLowerCase() !== GITHUB_LOGIN) throw new Error('Unexpected repository owner or visibility');
      repos.push(repo);
    }
    if (!response.headers.get('Link')?.includes('rel="next"')) return repos;
  }
  throw new Error('Public repository pagination exceeds safety limit');
}

async function fetchLiveSnapshot() {
  const [calendar, account, allRepos] = await Promise.all([
    githubRequest(CALENDAR_URL).then(response => response.text()).then(parseCalendar),
    githubRequest(ACCOUNT_URL).then(response => response.json()),
    fetchRepositories(),
  ]);
  if (allRepos.length !== account.public_repos) throw new Error('Public repository count changed during retrieval');
  const originals = allRepos.filter(repo => repo.fork === false);
  if (allRepos.some(repo => typeof repo.fork !== 'boolean')) throw new Error('Missing repository fork status');
  const snapshot = validateSnapshot({
    ...calendar, account, fetchedAt: new Date().toISOString(),
    originalRepoCount: originals.length,
    repos: originals.map(repo => ({ name: repo.name, url: repo.html_url, stargazerCount: repo.stargazers_count, forkCount: repo.forks_count, primaryLanguage: repo.language ? { name: repo.language } : null })),
    freshness: 'live', source: 'github-public',
  });
  return snapshot;
}

function snapshotAge(snapshot) {
  if (!snapshot?.fetchedAt) return Infinity;
  const age = Date.now() - Date.parse(snapshot.fetchedAt);
  return age < -30_000 ? Infinity : Math.max(0, age);
}

async function readSharedCache(request) {
  if (typeof caches === 'undefined') return null;
  try {
    const cache = caches.open ? await caches.open('ctrl-pt-profile-snapshots') : caches.default;
    if (!cache) return null;
    const key = new Request(new URL('/__ctrl_pt_snapshot_v1', request.url));
    const response = await cache.match(key);
    if (!response) return null;
    const data = validateSnapshot(await response.json());
    return data.source === 'github-public' && data.fetchedAt ? data : null;
  } catch { return null; }
}

function saveSharedCache(snapshot, request, ctx) {
  if (typeof caches === 'undefined') return;
  const task = (async()=>{
    const cache = caches.open ? await caches.open('ctrl-pt-profile-snapshots') : caches.default;
    if (!cache) return;
    const key = new Request(new URL('/__ctrl_pt_snapshot_v1', request.url));
    const response = new Response(JSON.stringify(snapshot), { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=86400' } });
    await cache.put(key, response);
  })().catch(() => {});
  if (ctx?.waitUntil) ctx.waitUntil(task);
}

async function fetchFallbackSnapshot() {
  const response = await githubRequest(FALLBACK_URL);
  const snapshot = validateSnapshot(await response.json());
  // fetchedAt refers to when data were collected, never the fallback download time.
  return { ...snapshot, source: 'github-workflow-snapshot', freshness: 'fallback' };
}

function copySnapshot(snapshot, freshness = snapshot.freshness) {
  return { ...JSON.parse(JSON.stringify(snapshot)), freshness };
}

export async function getGithubSnapshot(request, ctx) {
  if (snapshotAge(liveSnapshot) >= SNAPSHOT_TTL_MS) {
    const shared = await readSharedCache(request);
    if (shared && snapshotAge(shared) < snapshotAge(liveSnapshot)) liveSnapshot = shared;
  }
  if (snapshotAge(liveSnapshot) >= 0 && snapshotAge(liveSnapshot) < SNAPSHOT_TTL_MS) return copySnapshot(liveSnapshot, 'cached');
  if (Date.now() < nextAttemptAt) {
    if (snapshotAge(liveSnapshot) >= 0 && snapshotAge(liveSnapshot) <= STALE_LIMIT_MS) return copySnapshot(liveSnapshot, 'stale');
    if (fallbackSnapshot) return copySnapshot(fallbackSnapshot, 'fallback');
    throw lastSourceError ?? new Error('Public GitHub statistics are temporarily unavailable');
  }
  if (!inflightSnapshot) {
    inflightSnapshot = (async () => {
      try {
        const snapshot = await fetchLiveSnapshot();
        liveSnapshot = snapshot;
        nextAttemptAt = 0;
        lastSourceError = null;
        saveSharedCache(snapshot, request, ctx);
        return snapshot;
      } catch (error) {
        console.warn('Public GitHub refresh failed: '+error.message);
        nextAttemptAt = error.retryAt ?? Date.now() + SNAPSHOT_TTL_MS;
        lastSourceError = error;
        if (snapshotAge(liveSnapshot) >= 0 && snapshotAge(liveSnapshot) <= STALE_LIMIT_MS) return copySnapshot(liveSnapshot, 'stale');
        fallbackSnapshot = await fetchFallbackSnapshot();
        return fallbackSnapshot;
      } finally {
        inflightSnapshot = null;
      }
    })();
  }
  return copySnapshot(await inflightSnapshot);
}
