"""Split deprecated — hero skyscraper is built directly via animate_skyscraper.setup()."""
from __future__ import annotations

import os


def split_projects() -> dict[str, str]:
    """Legacy entry point. Builds projects/skyscraper/skyscraper.blend only."""
    import bpy

    root = os.path.dirname(os.path.abspath(__file__))
    if root not in __import__("sys").path:
        __import__("sys").path.insert(0, root)

    import animate_skyscraper as anim

    blend_path = os.path.join(root, "projects", "skyscraper", "skyscraper.blend")
    anim.setup(blend_path)
    print("DEPRECATED split_projects -> skyscraper only", blend_path)
    return {"skyscraper": blend_path}


if __name__ == "__main__":
    split_projects()
