# Profile statistics and interactive companion

The interactive terminal and playable contribution snake are published at
[ctrl-pt.github.io/ctrl-pt](https://ctrl-pt.github.io/ctrl-pt/).
The profile hero opens `#terminal`; the contribution snake opens `#snake`.
The site and all six README activity graphics are hosted on GitHub Pages.

The public image and JSON files are published under
`https://ctrl-pt.github.io/ctrl-pt/api/`:

- `github.json`: the shared, validated snapshot with its collection timestamp.
- `stats.svg`, `stats-mobile.svg`: contribution year and account counters.
- `calendar.svg`, `calendar-mobile.svg`: exact UTC dates/counts and GitHub intensity levels.
- `snake.svg`, `snake-static.svg`: the same contribution field, animated or still.

The `Refresh profile visuals` GitHub Actions workflow collects public activity,
updates repository assets, builds the static site, and deploys GitHub Pages.
It is scheduled every 15 minutes, runs on site and script changes, and supports
manual dispatch. GitHub can delay scheduled runs. A failed collection or build
preserves the last successful deployment rather than publishing zeroed data.

GitHub Pages serves static snapshots. Activity is collected during workflow runs,
not on individual visits. The terminal rechecks the published snapshot when
opened, every three minutes while visible, and when revisited. It displays the
actual collection time and identifies the data as a scheduled GitHub snapshot.
An embedded copy of that same snapshot keeps the terminal and game usable if
its JSON request fails. No token or account credential is included in the site.

All graphics and the interactive contribution field use one validated snapshot
from `data/github.json`. The public calendar's exact-count parser in
`scripts/github-live.mjs` checks totals, date uniqueness/continuity, daily counts,
and intensity levels. Original repository counts use the API total rather than
the first page length. The Pages build reuses the original site's SVG renderers,
including the snake that eats active contribution cells and its reduced-motion
still. Collection timestamps remain in JSON and SVG accessible descriptions.

Each refresh advances the six Pages image query revisions in the README so
GitHub can retire older image-proxy copies. An already-open profile does not
stream new images; reload it to request updated graphics. GitHub Pages caches
and the image proxy may add delay.

The site source is in `web/`. Build it with `node scripts/build-pages.mjs`;
the dependency-free build writes only the public site and graphics to `_site/`.
The workflow publishes that directory with GitHub's official Pages actions.

GitHub contributions include commits, pull requests, issues, and other eligible
activity. Dates follow the public profile's UTC calendar. See
[contribution definitions](https://docs.github.com/en/account-and-profile/concepts/contributions-on-your-profile)
and [image-cache guidance](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/about-anonymized-urls).
