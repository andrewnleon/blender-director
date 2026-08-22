# Blender MCP Integration for OpenClaw Project

## Overview
Connect Blender MCP (Multi-Channel Protocol) to the Cursor Agent Starter framework for driving Blender scenes, creating building animations, and managing a director project with a sidebar palette for drag-and-drop asset placement.

## Prerequisites

1. **Blender Open** with **BlenderMCP** enabled (port 9876)
2. **BlenderMCP plugin** installed in Blender (Connect → Port 9876)
3. **Cursor Agent Starter** project with skills installed

## MCP Configuration

The Blender MCP is configured in `.cursor/mcp.json` (default port `9876`). Ensure Blender is open with **BlenderMCP → Connect**.

### MCP JSON Configuration
```json
{
  "blender_mcp": {
    "port": 9876,
    "host": "localhost"
  }
}
```

## Skills Reference

Based on the Cursor Agent Starter framework, these Blender skills are available from the **arjun988/blender-skills** package (94 skills):

| Skill | Purpose |
|-------|---------|
| `blender-director` | Primary skill - orchestrates Blender scenes via MCP |
| `3d-building-blender` | Project overlay - this repo's building/animation setup |
| `hard-surface` | Building geometry and structure |
| `prop-artist` | Props and scene dressing |
| `archviz` | Architectural visualization workflow |
| `animation` | Animation creation and mixing |
| `export-pipeline` | Export to `public/models/` or Blender directories |

**Entry skill**: `blender-director`

## Quick Start: Blender Director

### 1. Initialize the Blender Director
```typescript
import { blenderDirector } from '@/cursor/skills/blender-director';

// Connect to Blender MCP
await blenderDirector.connect();

// Check connection status
const status = blenderDirector.isConnected();
```

### 2. Create a 10x10 Building
```typescript
// Create a 10x10 building structure
await blenderDirector.createBuilding({
  width: 10,
  depth: 10,
  floors: 3,
  windowSize: 1.5,
  wallThickness: 0.5,
  roofType: 'flat' // or 'pitched'
});
```

### 3. Add Animation
```typescript
// Add building entrance animation
await blenderDirector.addAnimation({
  animationType: 'entrance',
  duration: 50,  // frames
  focus: 'main entrance'
});

// Or create custom keyframe animation
await blenderDirector.animateProperty({
  object: 'building',
  property: 'location',
  keyframes: [
    { frame: 1, value: [0, 0, 0] },
    { frame: 50, value: [10, 0, 0] }
  ]
);
```

### 4. Export to Sidebar Palette
```typescript
// Export building to sidebar palette for drag-and-drop
await blenderDirector.exportToPalette({
  name: '10x10 Building',
  category: 'structures',
  thumbnail: true,
  description: '10x10 building with 3 floors'
});
```

The building will appear in Blender's sidebar palette under a custom category, ready to be dragged into any scene.

## Project: 3d-building-blender

This repository's specific building and animation configuration:

### Project Overlay: `3d-building-blender`

### Entry Skill: `blender-director`

### Configuration

```typescript
// 3d-building-blender project settings
const projectConfig = {
  name: '3d-building-blender',
  entrySkill: 'blender-director',
  settings: {
    defaultBuildingSize: [10, 10],  // width, depth in meters
    defaultFloors: 3,
    animationLibrary: 'building-animations',
    sidebarCategory: 'structures',
    exportPath: 'public/models/buildings/'
  }
};
```

### Available Functions

| Function | Description |
|----------|-------------|
| `blenderDirector.createBuilding(config)` | Create building with specified dimensions |
| `blenderDirector.addAnimation(config)` | Add predefined animation |
| `blenderDirector.animateProperty({object, property, keyframes})` | Custom keyframe animation |
| `blenderDirector.exportToPalette({name, category, ...})` | Export to sidebar palette |
| `blenderDirector.getSceneInfo()` | Get current scene information |
| `blenderDirector.setLighting({...})` | Configure scene lighting |
| `blenderDirector.setMaterials({...})` | Apply building materials |

## Workflow: Create Building + Animation

### Step 1: Connect to Blender
```typescript
await blenderDirector.connect();
// Verify: await blenderDirector.isConnected()
```

### Step 2: Create the Building
```typescript
await blenderDirector.createBuilding({
  width: 10,
  depth: 10, 
  floors: 3,
  windowSize: 2.0,
  wallThickness: 0.75,
  roofType: 'flat'
});
```

### Step 2: Add Animation
```typescript
// Option A: Predefined animation
await blenderDirector.addAnimation({
  animationType: 'entrance',
  duration: 60,
  focus: 'main entrance'
});

// Option B: Custom animation
await blenderDirector.animateProperty({
  object: 'building',
  property: 'rotation_euler',
  keyframes: [
    { frame: 1, value: [0, 0, 0] },
    { frame: 100, value: [360, 0, 0] }  // 360 degree rotation
  ]
});
```

### Step 3: Export to Palette
```typescript
await blenderDirector.exportToPalette({
  name: '10x10 3-Floor Building',
  category: 'structures',
  thumbnail: true,
  description: '10x10 meter building with 3 floors and entrance animation'
});
```

The building will now appear in Blender's sidebar palette under 'structures', ready to be dragged into any scene.

## Step-by-Step: Sidebar Palette Setup

### 1. Ensure BlenderMCP is Connected
- Open Blender
- Go to **Sidebar** (press `N`)
- Find **BlenderMCP** panel
- Click **Connect** (port 9876)

### 2. Create and Export Building
Using the Cursor agent framework:
```typescript
// Agent creates the building in Blender via MCP
await blenderDirector.createBuilding({ /* 10x10 config */ });

// Export to sidebar palette
await blenderDirector.exportToPalette({
  name: '10x10 Building',
  category: 'structures',
  thumbnail: true
});
```

### 3. Verify in Blender Sidebar
- Press `N` to open Sidebar
- Look for new category: **Structures** (or custom category)
- Find: **10x10 Building**
- Drag and drop into any scene

### 4. Animate and Use
- The building has entrance animation baked in
- Drag into scene, animate via the sidebar controls
- Render or use in visualizations

## MCP Commands Reference

### Connect to Blender
```typescript
await blenderDirector.connect();
```

### Create Building
```typescript
await blenderDirector.createBuilding({
  width: number,    // meters
  depth: number,    // meters  
  floors: number,   // number of floors
  windowSize: number, // window size in meters
  wallThickness: number, // wall thickness
  roofType: 'flat' | 'pitched' // roof style
});
```

### Add Animation
```typescript
await blenderDirector.addAnimation({
  animationType: 'entrance' | 'exit' | 'idle' | 'custom',
  duration: number,     // in frames
  focus: string,        // which part of building
  keyframes: Array    // custom keyframe data
});
```

### Animate Property
```typescript
await blenderDirector.animateProperty({
  object: string,     // object name in scene
  property: string,   // e.g., 'location', 'rotation_euler', 'scale'
  keyframes: Array    // [{frame: number, value: Array<number>}]
});
```

### Export to Sidebar Palette
```typescript
await blenderDirector.exportToPalette({
  name: string,           // name in palette
  category: string,       // category for organization
  thumbnail: boolean,     // generate preview thumbnail
  description: string,    // description/description
  tags: string[]          // searchable tags
});
```

## Scene Management

### Get Current Scene
```typescript
const sceneInfo = await blenderDirector.getSceneInfo();
console.log(sceneInfo);
// Output: { objects, lights, cameras, active_object }
```

### Set Lighting
```typescript
await blenderDirector.setLighting({
  keyLight: { intensity: 5, direction: [1, 1, 1] },
  fillLight: { intensity: 2, direction: [-1, -1, -1] },
  ambient: { intensity: 0.5 }
);
```

### Set Materials
```typescript
await blenderDirector.setMaterials({
  building: {
    baseColor: [0.8, 0.8, 0.8],
    roughness: 0.3,
    metallic: 0.1
  }
);
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Connection refused" | Ensure Blender is open with BlenderMCP → Connect, port 9876 |
| "No response from Blender" | Check Blender console for MCP errors, restart Blender |
| Building not in sidebar | Verify `exportToPalette` completed, check Blender Sidebar categories |
| Animation not playing | Verify keyframe frames match scene frame range (Ctrl+A → Frame Range) |
| Export fails | Check write permissions to export path, verify MCP connection |

## Integration with Cursor Agent Starter

The Blender MCP integrates with the Cursor framework through:

1. **Skills**: `blender-director` and `3d-building-blender` from arjun988/blender-skills
2. **MCP JSON**: Configuration in `.cursor/mcp.json`
3. **Agent prompts**: Use `maestro` skill for Blender task prompts
4. **Verification**: `verification-before-completion` for animation/export checks
5. **Caveman style**: All user replies in ultra mode

### Example: Full Building Creation Workflow
```typescript
// Agent orchestrates full building + animation workflow
await blenderDirector.connect();

// Step 1: Create 10x10 building
await blenderDirector.createBuilding({
  width: 10,
  depth: 10,
  floors: 3,
  roofType: 'flat'
});

// Step 2: Add entrance animation
await blenderDirector.addAnimation({
  animationType: 'entrance',
  duration: 50
});

// Step 3: Export to sidebar palette
await blenderDirector.exportToPalette({
  name: '10x10 Building',
  category: 'structures',
  thumbnail: true
});

// Step 4: Verify completion
const status = await blenderDirector.isConnected();
if (status) {
  console.log('✅ 10x10 Building ready in sidebar palette');
}
```

## Next Steps

1. **Start Blender** with BlenderMCP enabled
2. **Connect** via port 9876
3. **Run the workflow** using the Cursor agent framework
4. **Drag the building** from sidebar into scenes
5. **Animate** using the provided animation tools

Would you like me to help with:
- Specific building configuration values?
- Animation keyframe patterns?
- Sidebar palette organization?
- Integration with your existing Next.js project?
- Export settings for `public/models/`?