# Blender projects

Stage catalog blends live under `projects/<building-id>/`.

| Path | Contents |
|------|----------|
| `operations-center/operations-center.blend` | Orchestrator HQ + crane construct clip |

Legacy cityscape blends (`command-center`, towers, factories) are deprecated. Hero skyscraper lives in `skyscraper/skyscraper.blend` and is in the stage catalog.

## Export to stage

```python
import export_stage_models
export_stage_models.export_stage_models()
```

Ships `public/models/operations-center.glb` — bind pose at frame **1**, full construction animation.

## Object naming (operations-center)

- `OC_*` — building meshes, crane rig, site props
- `OC_DirtGround` — studio ground (skipped on export)
