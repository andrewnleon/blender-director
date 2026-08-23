# OpenClaw Yard — product roadmap

**North star:** Lightweight live 3D ops map. OpenClaw agent/task traffic drives building construction. Yard opens fast; heavy GLBs load on demand.

## Modes

| Mode | Route | Load profile |
|------|-------|--------------|
| **Live yard** | `/` | Grid + stream-bound hero buildings |
| **Sandbox palette** | `/` palette | Pack GLBs on hover / placement only |
| **Asset library** | `/library` | Grid preview; progressive GLB queue |

## Performance budget

| Metric | Target |
|--------|--------|
| Empty yard interactive | < 2 s (mid laptop) |
| First placed building after hover preload | < 1 s |
| Live stream on, zero placements | < 3 MB network |
| Ten pack buildings in session | < 15 MB total (post-compression) |

## Phase 1 — Fast first paint ✅ (in progress)

- [x] `.vercelignore` + `.gitignore` — exclude `packs/blender/**` and legacy GLBs from deploy
- [x] Remove eager `useGLTF.preload` for operations center
- [x] Progressive session restore (`useProgressiveCatalogPreload` + lot placeholders)
- [x] Stream-on preload priority for `operations-center`
- [x] Shared Draco export hook (`GLTF_DRACO=1` in Blender export scripts)
- [x] `pnpm typecheck` + `pnpm test`
- [x] `optimizePackageImports` for drei/fiber/three
- [ ] Re-export pack + hero with compression (needs Blender run)
- [ ] Split `stage-canvas.tsx` into smaller modules
- [ ] Load metrics (time-to-canvas, bytes per session)

## Phase 2 — OpenClaw core

- Export GLBs for `research-center`, `development-center`, QA tower, deploy pad
- Auto-layout agent stations when stream connects
- Finer task → construct scrub (sub-stage progress, agent status visuals)
- Stream UX: last event time, frozen state on disconnect

## Phase 3 — Scale sandbox

- GLB instancing for duplicate pack IDs
- Library virtualized grid; viewport-only preload
- LOD / impostors for pack assets
- Wire or remove unused `living-cityscape.tsx`

## Phase 4 — Production

- CI: typecheck + test on PR
- OWASP review on OpenClaw proxy routes
- CDN for `/models/*` with immutable cache headers
- Optional saved yards (server layout, not huge sessionStorage)

## Asset tiers

| Tier | Contents | When loaded |
|------|----------|-------------|
| T0 | Grid, chrome, empty sky | First paint |
| T1 | Agent station GLBs | Stream on or placed |
| T2 | Pack sandbox GLBs | Hover / placement / progressive restore |
| T3 | Dynamic backdrop (trees, mountains) | User toggles dynamic scene |

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
# Optional Draco when add-on enabled:
GLTF_DRACO=1 python scripts/python/export_pack_buildings.py
```
