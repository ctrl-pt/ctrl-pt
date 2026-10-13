# Profile statistics

The README statistics, weekly and weekday charts, contribution field, animated
snake, and interactive companion use one current `ctrl-pt` snapshot from the
public GitHub contribution calendar and public account API.

The public image and JSON endpoints are hosted at:
`https://ctrl-pt-interactive-profile.silkypeach6.chatgpt.site/api/`

- `github.json`: shared data, collection timestamp, source, and freshness.
- `stats.svg`, `stats-mobile.svg`: full returned contribution year and account counters.
- `calendar.svg`, `calendar-mobile.svg`: exact UTC dates/counts and GitHub intensity levels.
- `snake.svg`, `snake-static.svg`: the same contribution field, with motion or a still.

Data are fetched on demand and shared for up to 180 seconds. Responses use
`Cache-Control: no-cache, no-store, must-revalidate, max-age=0`. The companion
refreshes when opened, every three minutes while visible, and when revisited.
An already-open GitHub README cannot stream new images; refresh the profile to
request current graphics. GitHub processing and its image proxy can add delay.

Collection timestamps and freshness remain available in JSON, response headers,
and SVG accessible descriptions. The graphics have no visible sync footer.
Source failures retain verified data marked `stale` or `fallback`;
unavailable data are never silently replaced by zeros.
No account credential is stored on the public statistics service.

The `Refresh profile visuals` workflow maintains repository fallback assets and
`data/github.json` every 15 minutes, on relevant source pushes, or on manual
dispatch. GitHub may delay scheduled runs. Both live and fallback calendars use
the same exact-count parser in `scripts/github-live.mjs`; they validate total,
date uniqueness/continuity, daily counts, and intensity levels before publishing.
Each backup run also advances only the live image query revisions in the README
to retire lingering GitHub proxy copies without changing visible text or order.
Original repository counts use the API total instead of the first page length.

GitHub contributions include commits, pull requests, issues, and other eligible
activity, rather than only raw commits. Dates follow the public profile's UTC
calendar. See [contribution definitions](https://docs.github.com/en/account-and-profile/concepts/contributions-on-your-profile)
and [image-cache guidance](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/about-anonymized-urls).
