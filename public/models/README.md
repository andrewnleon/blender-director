# Drop-in models

Put `.glb` / `.gltf` files here. They are served from `/models/<filename>`.

## Active export

| GLB | Source blend |
|-----|----------------|
| `skyscraper.glb` | `projects/skyscraper/skyscraper.blend` — hero tower; `construct` clip (~15s). |

Palette entry lives in `src/lib/catalog.ts`.

## Deprecated (removed from catalog)

`command-center.glb`, `sky-tower-a/b/c.glb`, `ind-factory-a/b.glb`, `ind-plant.glb`, `dozer.glb` — legacy cityscape assets; no longer exported or placeable.

## Re-export

```powershell
& "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" --background --python export_stage_models.py
```
