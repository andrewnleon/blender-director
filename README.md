# blender-director

Blender MCP workshop + web stage for 3D building production.

## Stack

- **Blender** — per-building `.blend` files under `projects/`, driven via Blender MCP
- **Skills** — `blender-director` orchestrator + 94-skill production pack under `.cursor/skills/`
- **Stage** — Next.js viewer in `stage/` for exported glTF/GLB assets

## Quick start

1. Open Blender with **BlenderMCP → Connect** (port `9876`)
2. Work in `projects/workshop/workshop.blend` or a per-building file
3. Export models to `stage/public/models/`
4. Run the viewer: `cd stage && pnpm dev`

See `AGENTS.md` and `.cursor/skills/3d-building-blender/SKILL.md` for agent workflow.
