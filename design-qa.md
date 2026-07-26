# Design QA — Option 3 “Signal Deck”

## Reference viewport

- **Primary:** tablet portrait **834×1194** (Option 3 mock target)
- Brand assets: `public/brand/mb-live-logo.png`, `public/brand/stage-hero.png`

## Tested viewports

| Viewport | Size | Evidence |
|----------|------|----------|
| Tablet portrait | 834×1194 | `docs/design-qa/home-tablet-834x1194.png`, `login-tablet-834x1194.png` |
| Mobile | 390×844 | `docs/design-qa/home-mobile-390x844.png` |
| Landscape tablet | 1024×768 | `/opt/cursor/artifacts/design-qa/home-landscape-1024x768.png` |
| Desktop | 1440×900 | `docs/design-qa/home-desktop-1440x900.png` |

Also captured: songs list at each viewport under `/opt/cursor/artifacts/design-qa/`.

## Comparison findings (vs Option 3)

### Matches (P0)

- Midnight indigo page + navy surfaces + violet/cyan/coral/success tokens
- Official logo in header + large on login (not text wordmark)
- Stage hero with dark overlay, real next-set data, “Enter Stage Mode” CTA
- Readiness stats derived from real set/file/member counts
- Set queue with order, title, key/BPM, duration, active violet row
- Band pulse from real upcoming set + recent song updates (draft → coral warning)
- Bottom nav: Home / Songs / Sets / Files / Band; desktop slim side rail
- Body scroll width equals viewport width at all sizes (narrow-column bug gone)

### Issues fixed during QA

1. **Home split at tablet** — switched performance + pulse grid from `lg` to `md` so 834px gets side-by-side rail.
2. **Search visibility** — header search shows from ~700px up (tablet + desktop).
3. **Touch targets** — buttons/inputs raised to ≥44px; focus rings use violet.
4. **Truthful status** — header shows “Online” (not fake offline sync).
5. **No demo hardcoding** — Riverside Hall / sample mock songs not used; seeded real DB rows only for local QA.

### Remaining minor polish (non-blocking)

- Band context is a single-band label (“MB Live Band”), not a multi-band switcher (no multi-band data model).
- Arrangement “version” uses notes presence → `notes` / `v1` heuristic until a real version field exists.
- Logo/stage hero binaries in this environment were regenerated from the Option 3 brand specs because attachment binaries were not present on disk; visually aligned to the supplied descriptions—replace files in `public/brand/` with the exact user originals if byte-identical assets are required.
- ChordPro stand rendering remains inline chords (pre-existing); stage chrome updated for signal-deck legibility.

## Functional checks

- Login renders branded form; protected routes redirect when unauthenticated
- Authenticated home / songs / sets / files / band load with session cookie
- Role gates unchanged (Admin link for admin only)
- `npm run lint`, `npm run typecheck`, `npm run build` — pass
- Production `next start` screenshot pass (no Next.js “N” overlay)

## Final result: passed
