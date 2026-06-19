import sys
from pathlib import Path

import bpy


def reset_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()


def recompute_normals(input_path: Path, output_path: Path) -> None:
    reset_scene()
    bpy.ops.import_scene.gltf(filepath=str(input_path))

    mesh_count = 0
    for obj in bpy.context.scene.objects:
        if obj.type != "MESH":
            continue
        mesh_count += 1
        bpy.ops.object.mode_set(mode="OBJECT")
        bpy.ops.object.select_all(action="DESELECT")
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.mode_set(mode="EDIT")
        bpy.ops.mesh.select_all(action="SELECT")
        bpy.ops.mesh.normals_make_consistent(inside=False)
        bpy.ops.object.mode_set(mode="OBJECT")
        for polygon in obj.data.polygons:
            polygon.use_smooth = True

    if mesh_count == 0:
        raise RuntimeError(f"Keine Meshes importiert: {input_path}")

    output_path.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=str(output_path),
        export_format="GLB",
        export_apply=False,
        export_normals=True,
        export_materials="EXPORT",
    )
    print(f"recomputed normals: {input_path} -> {output_path} ({mesh_count} meshes)")


def main() -> None:
    args = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    if len(args) != 2:
        raise SystemExit("Usage: blender --background --python recompute_mni_normals.blender.py -- <input.glb> <output.glb>")
    recompute_normals(Path(args[0]).resolve(), Path(args[1]).resolve())


if __name__ == "__main__":
    main()
