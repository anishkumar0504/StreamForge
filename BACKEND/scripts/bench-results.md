# Search benchmark

Setup: local Docker (Postgres 15, Redis 7), 10,000 seeded videos, 50 distinct queries,
sequential client, `node scripts/bench-search.js`. Cold = cache cleared, warm = repeat within 60 s TTL.

## Before (commit: <git rev-parse --short HEAD>)
Date: 2026-10-25
- cold: avg 223.7 ms, p50 220.7 ms, p95 263.4 ms
- warm: avg 99.9 ms, p50 89.7 ms, p95 137.2 ms

## Slow stage found
(fill in after the timers)

## Change made
(fill in)

## After (commit: <hash>)
(run 3 times, record each p95, then the median)

