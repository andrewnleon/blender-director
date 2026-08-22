---
name: 3d-building-blender
description: Project Blender workflow for 3DBuilding — Command Center construction scene, projects/workshop/workshop.blend, construction animation, and glTF export to the stage viewer. Use when modeling, animating, lighting, or exporting 3D work in this repo, or when the user mentions Blender, the workshop file, construction stages, or Command Center.
---

# 3DBuilding Blender

Local project skill. Pair with `blender-director` for production pipelines.

## Live execution

Use **Blender MCP** (`user-blender`) — do not narrate Blender UI clicks.

Required loop:

1. `get_scene_info` — confirm the open file and object list
2. Plan (director / specialist skill)
3. `execute_blender_code` for edits
4. `get_viewport_screenshot` after visible changes
5. Save the `.blend` when the user wants persistence

Pass `user_prompt` as the user's own words on every MCP call.

## This repo

| Path | Role |
|------|------|
| `projects/skyscraper/skyscraper.blend` | Hero tower + construction animation (frames 1–360) |
| `build_skyscraper.py` | Mesh builder (`ST_*` prefix) |
| `animate_skyscraper.py` | 9-stage construction animation (`FPS=24`, `END=360`) |
| `stage/` | Next.js viewer — import glTF into `stage/public/models/` |

Construction stages: site, foundation, footings, frame, structure, walls, roof, systems, complete.

Object prefixes: `ST_*` (skyscraper). Legacy `CC_*` / `CX_*` cityscape scripts are deprecated.

## Routing

| Task | Skill |
|------|--------|
| Any new 3D request | `blender-director` first |
| Building / hard props | `hard-surface`, `prop-artist`, `archviz` |
| Site / yard | `environment-artist`, `set-dressing`, `scene-assembly` |
| Animation | `animation` + keep stage windows in `animate_construction.py` |
| Look | `lighting`, `materials`, `lookdev`, `rendering` |
| Ship to web | `export-pipeline` → glTF 2.0 → `stage/public/models/` |

## Constraints

- Execute in the already-open Blender session; do not assume a new empty file
- Prefer non-destructive edits (collections, modifiers) over wiping the scene
- Keep naming: `CC_*` command-center, `CX_*` construction extras
- After export, update `stage/src/lib/catalog.ts` if a new model is added
- Starter agents (`/orcha`) still apply for `stage/` Next.js work
