"""Verify exported GLB files for the stage catalog."""

from __future__ import annotations



import json

import os

import struct



ROOT = os.path.dirname(os.path.abspath(__file__))

MODELS = os.path.join(ROOT, "stage", "public", "models")

REPORT = os.path.join(MODELS, "verification-report.json")



EXPECTED = {

    "skyscraper.glb": {

        "max_bytes": 2_000_000,

        "needs_construct": True,

        "min_animations": 10,

    },

}





def read_glb_json(path: str) -> dict:

    with open(path, "rb") as handle:

        magic, _version, _length = struct.unpack("<4sII", handle.read(12))

        if magic != b"glTF":

            raise ValueError(f"{path} is not a GLB")

        chunk_len, chunk_type = struct.unpack("<II", handle.read(8))

        if chunk_type != 0x4E4F534A:

            raise ValueError(f"{path} missing JSON chunk")

        payload = handle.read(chunk_len)

        return json.loads(payload.decode("utf-8"))





def verify_glb(filename: str, spec: dict) -> dict:

    path = os.path.join(MODELS, filename)

    if not os.path.exists(path):

        return {"file": filename, "ok": False, "error": "missing"}



    size = os.path.getsize(path)

    gltf = read_glb_json(path)

    animations = [item.get("name", "") for item in gltf.get("animations", [])]

    has_construct = "construct" in animations or any(

        name.endswith("construct") for name in animations

    )

    ok = size > 512 and size <= spec["max_bytes"]

    if spec.get("needs_construct"):

        min_animations = int(spec.get("min_animations", 1))

        ok = ok and len(animations) >= min_animations



    return {

        "file": filename,

        "ok": ok,

        "bytes": size,

        "animations": len(animations),

        "has_construct": has_construct,

    }





def main() -> None:

    results = [verify_glb(name, spec) for name, spec in EXPECTED.items()]

    report = {

        "ok": all(item["ok"] for item in results),

        "files": results,

    }

    with open(REPORT, "w", encoding="utf-8") as handle:

        json.dump(report, handle, indent=2)

    print("VERIFICATION", REPORT)

    print(json.dumps(report, indent=2))

    if not report["ok"]:

        raise SystemExit(1)





if __name__ == "__main__":

    main()

