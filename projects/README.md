# Blender projects

Stage catalog blends live under `projects/<building-id>/`.

| Path | Contents |
|------|----------|
| `operations-center/operations-center.blend` | Orchestrator HQ + crane construct clip |
| `research-center/research-center.blend` | Planning station (greenhouse) |
| `development-center/development-center.blend` | Build station (factory bay) |
| `qa-center/qa-center.blend` | QA tower |
| `deploy-pad/deploy-pad.blend` | Deploy pad + rocket |

Legacy cityscape blends (`command-center`, towers, factories) are deprecated. Hero skyscraper lives in `skyscraper/skyscraper.blend` and is in the stage catalog.

## Export to stage

```python
import export_stage_models
export_stage_models.export_stage_models()
```

Ships hero GLBs under `public/models/` — bind pose at frame **1**, `construct` animation clip.

**Agent stations (batch):**

```bash
blender --background --python scripts/python/pipeline_agent_stations.py -- all
```

## Object naming (operations-center)

- `OC_*` — building meshes, crane rig, site props
- `OC_DirtGround` — studio ground (skipped on export)
