# Search benchmark
 
Setup: local Docker (Postgres 15, Redis 7) on an HP Pavilion Gaming 15-ec2xxx laptop (AMD Ryzen 5 5600H, 6 cores / 12 threads, 7.5 GB RAM, Windows 11), 10,000 seeded videos (random views 0-500k, createdAt over the last 365 days), 50 distinct queries, sequential client (`node scripts/bench-search.js`). Cold = cache cleared with `scripts/clear-cache.js`; warm = repeat within the 60 s TTL. Search called without auth. Result equality was checked by snapshotting 12 queries and comparing result order and content (scores excluded, they drift with time).
 
Run-to-run variance is noticeable on this machine (the first run after an API restart is slower), so each figure below is the median of 3 runs.
 
## Before (commit 1f240cb)
- cold: p50 208.6 ms, p95 238.1 ms (p95 per run: 259.8 / 238.1 / 236.3)
- warm: p50 84.2 ms, p95 117.2 ms (p95 per run: 101.3 / 117.2 / 126.3)
## Where the time went (single-run stage timings, ~2,009 candidates per request, measured on the earlier seed where all videos had identical views/createdAt)
- cold: candidates 125.8 ms, fetch 79.0 ms, rank + personalize + post ~2 ms
- warm: candidates 1.7 ms, fetch 73.5 ms, rank + personalize + post ~1 ms
- the fuzzy query alone took 89 ms (Seq Scan computing similarity() over 10k rows)
## Changes
1. Rank on 4 fields (id, views, createdAt, userId) and fetch full rows (description, user) only for the top 100: warm fetch 73.5 -> 38.6 ms, +7 ms hydration
2. Run the four video candidate queries in parallel: little effect alone (127 -> 116 ms, within noise), the fuzzy query dominated
3. Fuzzy match with the pg_trgm `%` operator (uses the GIN index) instead of `similarity() > 0.3`: cold candidates 116 -> 72 ms
4. Carry the ranking fields in the candidate queries and cache them (key v4), removing the first fetch: fetch 0 ms
## After (commit 3d05093)
- cold: p50 52.5 ms, p95 100.7 ms (p95 per run: 161.9 / 97.0 / 100.7)
- warm: p50 20.8 ms, p95 29.7 ms (p95 per run: 33.2 / 29.7 / 27.7)
Change vs before: cold p50 -75%, cold p95 -58%, warm p50 -75%, warm p95 -75%.
 
Trade-off: cached entries grew from a list of IDs to ~2,000 small rows (~200 KB per query for 60 s).
Data is synthetic, so absolute numbers will differ on real content.
 
## Reproduce
1. `docker compose up -d`, apply migrations, register one user in the app
2. `node scripts/seed-bench.js`
3. In psql: `UPDATE "Video" SET views = floor(random()*500000)::int, "createdAt" = now() - (random() * interval '365 days') WHERE "originalName" = 'seed-bench';`
4. Start the API, then run `node scripts/clear-cache.js` followed by `node scripts/bench-search.js` (3 times)
 