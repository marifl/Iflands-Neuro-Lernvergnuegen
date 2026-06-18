import argparse
import json
import os
import sys

import bpy
from mathutils import Vector


ARCHIVE_OBJECTS = {
    "phineas-gage-skull-calvaria": {
        "sourceName": "Phineas Gage Skull (intact, calvaria)",
        "exportName": "phineas-gage-skull-calvaria",
    },
    "phineas-gage-skull-base": {
        "sourceName": "Phineas Gage Skull (intact, base)",
        "exportName": "phineas-gage-skull-base",
    },
    "archive-tamping-iron": {
        "sourceName": "Tamping Iron (1090mm)",
        "exportName": "archive-tamping-iron",
    },
}


def args_after_blender_separator() -> list[str]:
    argv = sys.argv
    return argv[argv.index("--") + 1:] if "--" in argv else []


def clear_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()


def world_bounds(obj: bpy.types.Object) -> dict[str, list[float]]:
    points = [obj.matrix_world @ Vector(corner) for corner in obj.bound_box]
    min_v = Vector((min(point.x for point in points), min(point.y for point in points), min(point.z for point in points)))
    max_v = Vector((max(point.x for point in points), max(point.y for point in points), max(point.z for point in points)))
    center = (min_v + max_v) * 0.5
    size = max_v - min_v
    return {
        "min": list(min_v),
        "max": list(max_v),
        "center": list(center),
        "size": list(size),
    }


def find_object(name: str) -> bpy.types.Object:
    obj = bpy.data.objects.get(name)
    if obj is None:
        matches = [candidate for candidate in bpy.data.objects if candidate.name.startswith(name)]
        if len(matches) == 1:
            obj = matches[0]
    if obj is None:
        available = sorted(candidate.name for candidate in bpy.data.objects if "gage" in candidate.name.lower() or "iron" in candidate.name.lower())
        raise RuntimeError(f"object not found: {name}; matching available={available}")
    return obj


def export_object(obj: bpy.types.Object, export_name: str, output_path: str) -> None:
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    obj.name = export_name
    if obj.type == "MESH":
        obj.data.name = export_name
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.export_scene.gltf(
        filepath=output_path,
        export_format="GLB",
        use_selection=True,
        export_materials="EXPORT",
        export_yup=True,
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--export-dir")
    parser.add_argument("--report-json")
    parsed = parser.parse_args(args_after_blender_separator())

    clear_scene()
    bpy.ops.import_scene.gltf(filepath=parsed.input)

    report = {
        "input": parsed.input,
        "objects": {},
    }
    for asset_id, config in ARCHIVE_OBJECTS.items():
        obj = find_object(config["sourceName"])
        mesh = obj.data if obj.type == "MESH" else None
        report["objects"][asset_id] = {
            "sourceName": config["sourceName"],
            "exportName": config["exportName"],
            "objectName": obj.name,
            "meshName": mesh.name if mesh else None,
            "vertexCount": len(mesh.vertices) if mesh else 0,
            "polygonCount": len(mesh.polygons) if mesh else 0,
            "matrixWorld": [list(row) for row in obj.matrix_world],
            "bounds": world_bounds(obj),
        }
        if parsed.export_dir:
            export_object(obj, config["exportName"], os.path.join(parsed.export_dir, f"{asset_id}.glb"))

    text = json.dumps(report, indent=2, sort_keys=True)
    print(text)
    if parsed.report_json:
        with open(parsed.report_json, "w", encoding="utf-8") as handle:
            handle.write(text + "\n")


if __name__ == "__main__":
    main()
