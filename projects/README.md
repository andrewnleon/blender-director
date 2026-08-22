# Blender projects

Hero asset — one skyscraper with SimCity-style crane construction animation.

| Path | Contents |
|------|----------|
| `skyscraper/skyscraper.blend` | Hero tower + crane-drop build (frames **1–800**) |

Legacy cityscape blends (`command-center`, towers, factories) are deprecated and not in the stage catalog.

## Reference → timeline (4-panel construction beat)

Matches the isometric construction reference (site → shell → systems → complete):

| Reference panel | Blender frame | Timeline marker | What you see |
|-----------------|---------------|-----------------|--------------|
| 1 — Foundation | **30** | `01_Site` | Dirt pad, crane, dozer/mixer, foundation blocks |
| 2 — Shell rising | **241** | `03_FloorsMid` | Steel floors dropping in, crane swinging |
| 3 — Envelope | **431** | `04_Envelope` | Full skeleton + slabs, crane still on site |
| 4 — Complete | **800** | `05_Complete` | Glass tower, roof gear, crane gone, lights on |

Phases in `animate_skyscraper.py`: **site** (1–35) → **crane_build** (36–730) → **complete** (752–800). Each dropped piece uses **`grow()`** (C&C scale-up from ground, ported from `animate_construction.py`) synced to crane swing. Crane drives off frames 731–749.

## Build / regenerate

Blender MCP connected (GUI + **BlenderMCP → Connect**):

```python
import sys
sys.path.insert(0, r"C:\Users\Andrew\Desktop\3DBuilding")
import animate_skyscraper
animate_skyscraper.setup(r"C:\Users\Andrew\Desktop\3DBuilding\projects\skyscraper\skyscraper.blend")
```

Headless:

```powershell
& "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" --background --python animate_skyscraper.py
```

## Export to stage

```python
import export_stage_models
export_stage_models.export_stage_models()
```

Ships `stage/public/models/skyscraper.glb` — bind pose at frame **1** (nothing built yet), full construction animation through frame **800**.

## Object naming

- `ST_*` — skyscraper meshes (Body, Shell, FrameFloor, Footings, …)
- `ST_Crane*`, `ST_Dozer*`, `ST_Mixer*` — site equipment (hidden/leaves during build)
- `ST_DirtGround`, `ST_Sun`, `ST_Fill`, `ST_Camera` — studio (skipped on export)
