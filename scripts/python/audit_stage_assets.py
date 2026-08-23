"""Audit mesh triangle counts and material counts for stage export targets."""

from __future__ import annotations



import json

import os



ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))

PROJECTS = os.path.join(ROOT, "projects")

REPORT_PATH = os.path.join(ROOT, "public", "models", "audit-report.json")



MAX_TRIS = 20_000

SKIP_NAMES = {"ST_Sun", "ST_Fill", "ST_Camera", "ST_DirtGround"}



BUILDINGS = [

    ("operations-center", "operations-center.blend", "OC_", 1),

]





def count_export_tris(mesh_prefix: str | None = None) -> dict:

    import bpy



    mesh_names: list[str] = []

    total_tris = 0

    per_mesh: dict[str, int] = {}

    materials: set[str] = set()



    for obj in bpy.data.objects:

        if obj.type != "MESH":

            continue

        if obj.name in SKIP_NAMES:

            continue

        if mesh_prefix and not obj.name.startswith(mesh_prefix):

            continue

        mesh = obj.data

        tris = sum(len(p.vertices) - 2 for p in mesh.polygons)

        per_mesh[obj.name] = tris

        total_tris += tris

        mesh_names.append(obj.name)

        for slot in obj.material_slots:

            if slot.material:

                materials.add(slot.material.name)



    return {

        "mesh_count": len(mesh_names),

        "total_tris": total_tris,

        "per_mesh": per_mesh,

        "materials": sorted(materials),

    }





def audit_building(building_id: str, blend_file: str, mesh_prefix: str | None, rest_frame: int | None) -> dict:

    import bpy



    blend_path = os.path.join(PROJECTS, building_id, blend_file)

    if not os.path.exists(blend_path):

        return {"building_id": building_id, "ok": False, "error": "missing blend"}



    bpy.ops.wm.open_mainfile(filepath=blend_path)

    if rest_frame is not None:

        bpy.context.scene.frame_set(rest_frame)



    stats = count_export_tris(mesh_prefix)

    ok = stats["total_tris"] <= MAX_TRIS and stats["mesh_count"] > 0

    return {

        "building_id": building_id,

        "blend_path": blend_path,

        "ok": ok,

        "mesh_count": stats["mesh_count"],

        "total_tris": stats["total_tris"],

        "materials": stats["materials"],

    }





def main() -> None:

    results = [

        audit_building(building_id, blend_file, mesh_prefix, rest_frame)

        for building_id, blend_file, mesh_prefix, rest_frame in BUILDINGS

    ]

    report = {

        "ok": all(item.get("ok") for item in results),

        "buildings": results,

    }

    with open(REPORT_PATH, "w", encoding="utf-8") as handle:

        json.dump(report, handle, indent=2)

    print("AUDIT", REPORT_PATH)

    print(json.dumps(report, indent=2))





if __name__ == "__main__":

    main()
