"""Export hero skyscraper blend to public/models/skyscraper.glb."""

from __future__ import annotations



import os



ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))

PROJECTS = os.path.join(ROOT, "projects")

OUT_DIR = os.path.join(ROOT, "public", "models")



MAX_TRIS = 20_000

SKIP_NAMES = {"ST_Sun", "ST_Fill", "ST_Camera", "ST_DirtGround", "OC_DirtGround"}

CONSTRUCT_CLIP = "construct"



EXPORTS = [

    {

        "building_id": "skyscraper",

        "filename": "skyscraper.glb",

        "rest_frame": 1,

        "export_animations": True,

        "mesh_prefix": "ST_",

    },

    {

        "building_id": "operations-center",

        "filename": "operations-center.glb",

        "rest_frame": 1,

        "export_animations": True,

        "mesh_prefix": "OC_",

    },

]





def count_export_tris(mesh_names: list[str]) -> int:

    import bpy



    total = 0

    for name in mesh_names:

        obj = bpy.data.objects.get(name)

        if obj is None or obj.type != "MESH":

            continue

        total += sum(len(p.vertices) - 2 for p in obj.data.polygons)

    return total





def assert_poly_budget(mesh_names: list[str], building_id: str) -> None:

    total = count_export_tris(mesh_names)

    if total > MAX_TRIS:

        raise RuntimeError(

            f"{building_id} export has {total} tris (budget {MAX_TRIS}). "

            "Run lookdev_stage_assets.py before export.",

        )

    print("POLY_OK", building_id, total)





def select_export_objects(mesh_prefix: str | None = None) -> list[str]:

    import bpy



    names = []

    for obj in bpy.data.objects:

        if obj.name in SKIP_NAMES:

            continue

        if mesh_prefix and not obj.name.startswith(mesh_prefix):

            continue

        # Keep crane empties so mast grow / hook / park stay parented in glTF.

        if obj.type == "EMPTY" and obj.children:

            names.append(obj.name)

            continue

        if obj.type != "MESH":

            continue

        names.append(obj.name)

    return names





def build_export_collection(mesh_names: list[str]) -> str:

    import bpy



    coll_name = "_StageExport"

    if coll_name in bpy.data.collections:

        export_coll = bpy.data.collections[coll_name]

        for obj in list(export_coll.objects):

            export_coll.objects.unlink(obj)

    else:

        export_coll = bpy.data.collections.new(coll_name)

        bpy.context.scene.collection.children.link(export_coll)



    for name in mesh_names:

        obj = bpy.data.objects.get(name)

        if obj and obj.name not in export_coll.objects:

            export_coll.objects.link(obj)



    return coll_name





def get_view3d_override(scene):

    import bpy



    for window in bpy.context.window_manager.windows:

        screen = window.screen

        for area in screen.areas:

            if area.type != "VIEW_3D":

                continue

            for region in area.regions:

                if region.type != "WINDOW":

                    continue

                return {

                    "window": window,

                    "screen": screen,

                    "area": area,

                    "region": region,

                    "scene": scene,

                    "view_layer": bpy.context.view_layer,

                }

    return None





def export_building(

    building_id: str,

    filename: str,

    *,

    rest_frame: int | str | None = None,

    mesh_prefix: str | None = None,

    export_animations: bool = False,

) -> str:

    import bpy



    blend_path = os.path.join(PROJECTS, building_id, f"{building_id}.blend")

    if not os.path.exists(blend_path):

        raise FileNotFoundError(blend_path)



    bpy.ops.wm.open_mainfile(filepath=blend_path)

    scene = bpy.context.scene

    if rest_frame == "end" or (rest_frame is None and export_animations):

        scene.frame_set(scene.frame_end)

    elif rest_frame is not None:

        scene.frame_set(int(rest_frame))



    mesh_names = select_export_objects(mesh_prefix)

    if not mesh_names:

        raise RuntimeError(f"No export meshes in {building_id}")



    assert_poly_budget(mesh_names, building_id)



    coll_name = build_export_collection(mesh_names)



    os.makedirs(OUT_DIR, exist_ok=True)

    out_path = os.path.join(OUT_DIR, filename)

    export_kwargs = dict(

        filepath=out_path,

        export_format="GLB",

        collection=coll_name,

        use_active_collection_with_nested=True,

        export_apply=True,

        export_yup=True,

        export_animations=export_animations,

        export_lights=False,

        export_cameras=False,

        use_visible=False,

        use_renderable=False,

        export_image_format="AUTO",

    )



    first_mesh = bpy.data.objects.get(mesh_names[0])

    if first_mesh is not None:

        bpy.context.view_layer.objects.active = first_mesh



    override = get_view3d_override(scene)

    if override:

        with bpy.context.temp_override(**override):

            bpy.ops.export_scene.gltf(**export_kwargs)

    else:

        bpy.ops.export_scene.gltf(**export_kwargs)



    return out_path





def export_stage_models() -> dict[str, str]:

    saved: dict[str, str] = {}

    for spec in EXPORTS:

        path = export_building(

            spec["building_id"],

            spec["filename"],

            rest_frame=spec.get("rest_frame"),

            mesh_prefix=spec.get("mesh_prefix"),

            export_animations=bool(spec.get("export_animations")),

        )

        saved[spec["building_id"]] = path

        print("EXPORTED", spec["building_id"], "->", path)

    return saved





if __name__ == "__main__":

    export_stage_models()

