# OpenClaw Stage — product roadmap

**North star:** Lightweight live 3D ops map. OpenClaw agent/task traffic drives building construction on a **library grid stage**. Yard opens fast; heavy GLBs load on demand.

## Product shape (current)

| Surface | Route | Behavior |
|---------|-------|----------|
| **OpenClaw Stage** | `/` | Auto grid of all `inLibrary` assets; preview sim OR live stream |
| **Legacy library** | `/library` | Redirects to `/` |

**Input modes**

- **Preview** — mock OpenClaw tasks via `buildConstructionMap` (pack replay while active)
- **Live stream** — per-building `buildConstructionMap` by bind mode; replaces preview

**Building roles**

| Tier | Example | Bind | Idle |
|------|---------|------|------|
| `scheduled` | `skyscraper` | `all-tasks` | Complete — city macro |
| `staged` | `operations-center` | `agent-tasks` | Empty — agent station |
| pack | `pack-*` | — | Scrub at 0 |

## Performance budget

| Metric | Target |
|--------|--------|
| First interactive grid | < 2 s |
| Hero row visible | < 5 MB first wave |
| Full grid (55 assets) | Progressive stagger, not parallel |

## Phase 1 — Fast first paint ✅

- [x] Deploy diet — exclude `packs/blender/**`, legacy GLBs from deploy
- [x] Progressive GLB preload + placeholders
- [x] Always-scrub drive (no auto-play on load)
- [x] `pnpm typecheck` + `pnpm test`
- [x] Draco export hook (`GLTF_DRACO=1`)
- [ ] Compress pack + hero GLBs (Blender re-export)
- [ ] Load metrics instrumentation

## Phase 2A — Stage load + hero row ✅ (in progress)

- [x] Hero-first grid sort (`sortLibraryItemsHeroFirst`)
- [x] Preload priority wired on OpenClaw Stage (`getLibraryPreloadPriority`)
- [x] Remove eager skyscraper kit module preload
- [ ] Compress `skyscraper.glb` (~12 MB → < 2 MB target)
- [ ] Viewport-deferred pack mounts (optional)

## Phase 2B — Live traffic fidelity ✅ (partial)

- [x] Agent station registry stubs: `qa-center`, `deploy-pad` (+ mock agents)
- [x] Preview uses mock tasks + `buildConstructionMap` (live bind parity)
- [x] Stream chrome: last event time, agent/task counts, frozen state, active stations
- [x] Export GLBs for `research-center`, `development-center`, `qa-center`, `deploy-pad`
- [x] Agent status → emissive / crane activity on station buildings (Phase 2C)

## Phase 2C — Simulator polish ✅ (partial)

- [x] Finer task → progress via `progressFromTaskStatuses`
- [x] Agent status → accent pulse + crane sway on staged stations (`AgentStationTraffic`)
- [x] Preview / stream / frozen placement hints
- [x] Drop legacy yard `objects` session from `use-yard-chrome`
- [ ] Agent station GLB exports (see Phase 2B)

## Phase 3 — Scale sandbox

- [ ] Share skyscraper site-kit parse across pack lots (one kit load)
- [ ] GLB instancing for duplicate pack IDs
- [ ] Default pack exclusions for cold start (opt-in “expand city”)

## Phase 4 — Production

- [ ] CI: typecheck + test on PR
- [ ] OWASP review on OpenClaw proxy routes
- [ ] CDN for `/models/*` with immutable cache headers

## Asset tiers

| Tier | Contents | When loaded |
|------|----------|-------------|
| T0 | Grid shell, chrome | First paint |
| T1 | Heroes (`skyscraper`, `operations-center`, future stations) | Preload wave 1 |
| T2 | Pack exports | Staggered after heroes |
| T3 | Dynamic backdrop | User toggle |

## Commands

```bash
pnpm typecheck
pnpm test
pnpm dev
```

**Re-export (local Blender):**

```bash
python scripts/python/export_stage_models.py
python scripts/python/export_pack_buildings.py
GLTF_DRACO=1 python scripts/python/export_stage_models.py
```
