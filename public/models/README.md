# Drop-in models

Put `.glb` / `.gltf` files here. They are served from `/models/<filename>`.

## Active export

| GLB | Source blend |
|-----|----------------|
| `operations-center.glb` | `projects/operations-center/operations-center.blend` — orchestrator HQ; `construct` clip. |

Palette entries live in `src/lib/construction/asset-registry.ts`.

## Deprecated (removed from repo)

Legacy GLBs (`command-center`, towers, factories, `dozer`) may be absent from the stage catalog. Hero `skyscraper.glb` is catalogued and exported from `projects/skyscraper/skyscraper.blend`.

## Re-export

```powershell
& "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" --background --python export_stage_models.py
```
