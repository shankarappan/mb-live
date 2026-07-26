# Performance & reliability verification

## 1. Confirm Sydney function region

After deploy with `vercel.json` `"regions": ["syd1"]`:

```bash
curl -sI https://mb-live.vercel.app/api/health | tr -d '\r' | grep -i x-vercel
```

Expect `x-vercel-id` to contain **`syd1`** (function execution). A CDN POP may still be local to the client; the regression to avoid is **`iad1`** function execution against Sydney Supabase.

Root layout also exports `preferredRegion = "syd1"`; **`vercel.json` `regions`** is the authoritative pin for Node.js serverless on Vercel.

## 2. Health vs readiness

| Endpoint | Auth | Cost | Use |
|----------|------|------|-----|
| `GET /api/health` | public | env flags only | uptime / deploy smoke |
| `GET /api/ready` | `Authorization: Bearer $READY_CHECK_TOKEN` | timed DB select (≤2.5s) | dependency readiness |

```bash
curl -sS https://mb-live.vercel.app/api/health
curl -sS -H "Authorization: Bearer $READY_CHECK_TOKEN" https://mb-live.vercel.app/api/ready
```

## 3. Authenticated concurrency (~20 users)

```bash
# .env.local must include Supabase keys + invited user email
PERF_TEST_EMAIL=you@example.com BASE_URL=https://mb-live.vercel.app npm run perf:concurrency
```

Covers Home, Songs, a Set, Stand, and set `updated-at` with mixed parallel workers. Reports cold vs warm p50/p95 and fails on warm errors.

## 4. Direct upload sizes

```bash
# 1 MB, 5 MB, 50 MB (ok) + 52 MB (must reject)
npm run verify:uploads

# Faster: 1 MB + 5 MB only
SKIP_LARGE=1 npm run verify:uploads
```

In-memory test payloads only — Storage objects + `song_files` rows are deleted. Nothing is committed to git.

**Proven limit:** Supabase Free **global** file size is 50 MB (bucket was advertised at 200 MB but the platform rejects larger). The app now advertises **50 MB**. Restoring 200 MB requires a Pro+ project, raising Storage → Global file size limit, then updating `MAX_FILE_BYTES` + the bucket limit.

## 5. Role enforcement spot-check (manual)

1. Member session: can upload to own instrument targets / everyone; cannot open Admin.
2. Leader: can edit songs/sets; cannot open Admin users unless also admin.
3. Admin: invite + storage list still work.
4. Signed download still required for private objects (bucket not public).

## 6. Standard quality gates

```bash
npm run lint
npm run typecheck
npm run smoke
npm run build
```
