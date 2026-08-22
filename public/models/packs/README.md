# Model packs

Source `.blend` / `.fbx` files under `blender/` stay **local** (gitignored). Commit catalog assets as `exported/*.glb` only.

Regenerate GLBs from pack sources:

```bash
python scripts/python/export_pack_buildings.py
```

Then refresh the stage export pipeline as needed (`export_stage_models.py`, operations-center pipeline).
