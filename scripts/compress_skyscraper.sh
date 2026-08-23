#!/usr/bin/env bash
# Re-export skyscraper GLB outside one long Blender session (avoids hung exports).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "== animate =="
blender --background --python scripts/python/animate_skyscraper.py

echo "== export =="
blender --background --python-expr "
import sys
sys.path.insert(0, 'scripts/python')
from export_stage_models import export_building
export_building('skyscraper', 'skyscraper.glb', rest_frame=1, mesh_prefix='ST_', export_animations=True)
"

echo "== restack =="
python3 scripts/python/restack_construct_glb.py

if [[ "${SKYSCRAPER_GLTF_OPTIMIZE:-0}" == "1" ]]; then
  echo "== gltf-transform (optional) =="
  python3 scripts/python/optimize_glb_export.py public/models/skyscraper.glb
fi

ls -lh public/models/skyscraper.glb
