"# CONTINUE.md - Project Guide

This file provides documentation and guidance for working with the **3d-building** project.

## Project Overview

**Purpose:** Blender workshop + web viewer for 3D building work. This project combines Blender 3D creation tools with a web-based viewer/editor for building design and visualization.

**Key Technologies:**
- **Framework:** Next.js 16.3.2 (Turbopack) with React 19
- **3D Graphics:** @react-three/fiber ^9.7.0 + @react-three/drei ^10.7.8
- **Three.js:** ^0.185.1
- **Styling:** Tailwind CSS ^4
- **TypeScript:** ^5 strict typing

**Architecture:**
- Next.js 13+ app router structure (`app/` directory)
- Component-based UI with React components in `src/components/`
- Three.js/Fiber canvas for 3D rendering (`src/components/stage-canvas.tsx`)
- Construction/building logic in `src/lib/construction/`
- Asset catalog and library management in `src/lib/catalog.ts`
- Hooks for various functionality in `src/hooks/`

## Getting Started

### Prerequisites
- Node.js 20+ (verified with Next.js 16.3.2)
- pnpm package manager (based on pnpm-lock.yaml)
- TypeScript knowledge (project uses ^5)

### Installation
```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Or use Turbopack directly
next dev
```

### Available Scripts
| Script | Description |
|--------|-------------|
| `pnpm dev` | Start development server with Turbopack |
| `pnpm build` | Build for production |
| `pnpm start` | Run production build |
| `pnpm lint` | Run ESLint |
| `pnpm typecheck` | Type-check with tsc |
| `pnpm test` | Run test suite |

### Running Tests
```bash
pnpm test
# Or explicitly:
node --import tsx --test src/__tests__/__lib__/**/*.test.ts src/__tests__/__lib__/**/**/*.test.ts
```

## Project Structure

### Key Directories

| Directory | Purpose |
|-----------|---------|
| `src/app/` | Next.js app router pages and API routes |
| `src/components/` | React UI components (3D canvas, yard, library, etc.) |
| `src/lib/` | Core logic modules (catalog, construction, placement, animation) |
| `src/hooks/` | Custom React hooks |
| `src/types/` | TypeScript type definitions |
| `__tests__/` | Test files for lib modules |
| `.cursor/` | Agent skills and MCP configuration |

### Important Files

- **`src/components/stage-canvas.tsx`** - Main Three.js/Fiber Canvas component
- **`src/components/stage-boot-gate.tsx`** - Boot gate for texture/GLB preloading
- **`src/lib/catalog.ts`** - Catalog and asset management
- **`src/lib/construction/driver.ts`** - Construction state management
- **`src/lib/stage-preload.ts`** - Texture and GLB preloading logic
- **`src/app/page.tsx`** - Home page entry point
- **.cursor/mcp.json** - Blender MCP configuration (port 9876)

### 3D/Blender Integration
- `.cursor/mcp.json` configures Blender MCP bridge (port 9876)
- Skills in `.cursor/skills/` include Blender-specific capabilities
- `blender-director` skill handles Blender communication

## Development Workflow

### Coding Conventions
- **TypeScript** with strict typing enabled
- **React Components** use TypeScript interfaces for props
- **Three.js/Fiber** patterns: use hooks inside `<Canvas>`, avoid hooks outside
- **Module-level preloading**: Use `.preload()` static methods for texture/GLB loading outside Canvas
- **Tailwind CSS** v4 for styling (configured in package.json)

### Testing Approach
- Test suite in `__tests__/__lib__/` covers construction, catalog, and stage logic
- Tests use `tsx` runner with Jest-style syntax
- Key test areas: construction driver, complete visibility, progress map, roof pool, site kit

### Build & Deployment
```bash
pnpm build    # Next.js production build
pnpm start    # Start production server
```

### Contribution Guidelines
1. Follow existing TypeScript patterns
2. Keep Three.js hooks inside Canvas component
3. Use module-level `.preload()` for outside-Canvas loading
4. Add tests for new functionality in `__tests__/__lib__/`
5. Update `.cursor/skills/` if adding new agent capabilities

## Key Concepts

### Canvas-Hook Boundary
- **Rule:** React Three Fiber hooks (`useTexture`, `useGLTF`, etc.) can **only** be used within a `<Canvas>` component
- **Workaround:** Use `.preload()` static methods for loading outside Canvas (seen in `stage-boot-gate.tsx`)

### Construction Pipeline
- Assets go through: placement → construct → hollow/complete states
- Managed by `construction/driver.ts` with clock/scrub progression
- States tracked via `ConstructionState` type

### Catalog System
- Library of GLB assets with metadata (clip names, floor counts, accents)
- Progressive preloading based on priority
- Placement collision detection via `lib/placement-collision.ts`

### Stage Environment
- Dynamic or static scene variants
- Fog, lighting, and ground materials
- Yard grid and placement snapping

## Common Tasks

### Adding a New 3D Asset
1. Add GLB file to catalog inventory
2. Define catalog item in `src/lib/catalog.ts` with:
   - `id`, `kind` ("glb"), `url`, `clip`, `floorCount`, `accent`, `footprint`
3. Ensure proper type definitions in `types/openclaw.ts`
4. Update preload logic if needed

### Preloading Textures/GLBs
```tsx
// Module-level preload (works outside Canvas)
useTexture.preload(urls);
useGLTF.preload(url);

// Inside Canvas component
useTexture([...urls]);  // hook form
useGLTF(url);          // hook form
```

### Debugging 3D Rendering Issues
1. Check Canvas component props (camera, gl settings)
2. Verify hooks are inside `<Canvas>`
3. Check Three.js console warnings
4. Review `stage-boot-gate.tsx` for preload issues

### Modifying Construction Logic
1. Update `ConstructionState` type if needed
2. Modify `construction/driver.ts` for clock/progression
3. Adjust `lib/construction/` modules for specific behavior
4. Add/update tests in `__tests__/__lib__/construction/`

## Troubleshooting

### Common Issues

**"Hooks can only be used within the Canvas component!"**
- **Cause:** Using `useTexture`, `useGLTF`, or other R3F hooks outside `<Canvas>`
- **Fix:** Use `.preload()` static methods instead, or move component inside Canvas

**"Boundary is undefined" or Three.js errors**
- **Cause:** Missing Canvas setup or incorrect props
- **Fix:** Check `src/components/stage-canvas.tsx` configuration

**Textures not loading**
- **Cause:** Preload order or module execution timing
- **Fix:** Check `stage-boot-gate.tsx` and ensure `Suspense` boundaries are correct

**Blender MCP connection issues**
- **Cause:** Port 9876 not available or Blender not running
- **Fix:** Verify `.cursor/mcp.json` configuration and Blender connection

### Debugging Tips
1. Use `pnpm typecheck` to catch TypeScript errors
2. Run `pnpm lint` for code style issues
3. Check test output with `pnpm test`
4. Review git history for recent changes to problematic areas

## References

### Documentation
- [Next.js Docs](https://nextjs.org/docs)
- [React Three Fiber](https://docs.pmnd.rs/react-three-fiber/getting-started)
- [React Drei](https://github.com/pmndrs/drei)
- [Three.js](https://threejs.org/docs/)
- [Tailwind CSS v4](https://tailwindcss.com/docs)

### Project Resources
- `.cursor/mcp.json` - Blender MCP configuration
- `.cursor/skills/blender-director/` - Blender director skill
- `src/lib/stage-preload.ts` - Preloading logic
- `src/components/stage-canvas.tsx` - Main canvas setup
- `src/lib/construction/` - Construction management

### Related Files
- `skills/blender-director/SKILL.md` - Blender director skill details
- `skills/references/mcp-integration.md` - MCP integration guide
- `skills/references/naming-conventions.md` - Component naming rules

---

*This CONTINUE.md file was generated to help developers understand and work with the 3d-building project. Review and edit as needed for your specific workflow.*

*To share with your team, commit this file to your repository. Continue will automatically load this file into context when working with the project.*

*Additional `rules.md` files can be created in subdirectories for more specific documentation related to those components.*
"