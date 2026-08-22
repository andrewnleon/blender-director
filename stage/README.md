# OpenClaw Yard

Next.js (App Router) sandbox for setting a 3D stage and placing Blender models. Theme is developer/agent traffic (OpenClaw) — assets and testing only, not a full RTS.

## Run

```bash
cd stage
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Use

1. Pick any project asset in the palette (**Command Center**, towers, factories, **Site Dozer**, **Relay Node**). Only one Command Center.
2. Click the grid to place. Placement snaps to 1-unit cells and stays in React state.
3. Orbit / pan / zoom the camera. Click a placed object (or the list) to select it; **Remove selected** or **Reset yard**.

## Add models

Drop `.glb` files into `public/models/` and register them in `src/lib/catalog.ts`. See `public/models/README.md`.
