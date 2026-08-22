# Blender MCP Setup & 10x10 Building Animation Guide

## Prerequisites

1. **Blender 3.x** installed and open
2. **BlenderMCP plugin** installed in Blender
3. **Cursor Agent Starter** project with skills

## Step 1: Install BlenderMCP in Blender

### Option A: Download & Install
1. Go to [arjun988/blender-skills](https://github.com/arjun988/blender-skills)
2. Download the BlenderMCP addon
3. In Blender: **Edit → Preferences → Add-ons → Install → Add-on File**
4. Enable: **BlenderMCP**

### Option B: If Already Installed
- Ensure BlenderMCP is enabled in **Edit → Preferences → Add-ons**

## Step 2: Connect BlenderMCP

1. Open Blender
2. Press `N` to open **Sidebar**
3. Find **BlenderMCP** panel
4. Set **Port**: `9876`
5. Click **Connect**
6. Confirm: "Connected to MCP Server" appears

## Step 2: Verify Connection

Run the Cursor agent framework connection:

```typescript
// In your Cursor agent or script
import { blenderDirector } from '@/src/lib/blender-director';

// Connect to Blender MCP
await blenderDirector.connect();

// Check status
const isConnected = blenderDirector.isConnected();
console.log('Blender MCP connected:', isConnected);
// Expected: true
```

## Step 3: Create 10x10 Building + Animation

### Option A: Using Cursor Agent Framework

```typescript
import {
  create10x10Building,
  addEntranceAnimation,
  exportToSidebar
} from '@/src/lib/blender-director';

// Step 1: Connect (ensure BlenderMCP is connected first)
await blenderDirector.connect();

// Step 2: Create 10x10 building
await create10x10Building();

// Step 3: Add entrance animation (50 frames)
await addEntranceAnimation(50);

// Step 4: Export to sidebar palette
await exportToSidebar();

// Verification
const connected = blenderDirector.isConnected();
console.log('✅ Workflow complete - connected:', connected);
```

### Option B: Manual MCP Commands (if not using Cursor agents)

In Blender Console or Python:

```python
import blender_mcp

# Create 10x10 building
blender_mcp.create_building({
    "width": 10,
    "depth": 10,
    "floors": 3,
    "window_size": 2.0,
    "wall_thickness": 0.75,
    "roof_type": "flat"
})

# Add entrance animation
blender_mcp.add_animation({
    "animation_type": "entrance",
    "duration": 50,
    "focus": "main entrance"
})

# Export to sidebar palette
blender_mcp.export_to_palette({
    "name": "10x10 Building",
    "category": "structures",
    "thumbnail": True,
    "description": "10x10 meter building with 3 floors"
})
```

## Step 4: Verify in Blender Sidebar

1. Press `N` to open **Sidebar** in Blender
2. Look for new category: **Structures** (or custom category name)
3. Find: **10x10 Building**
4. **Drag and drop** into any scene

The building should appear with:
- 10m × 10m footprint
- 3 floors
- Windows sized at 2m
- Entrance animation baked in
- Ready to drop into scenes

## Step 5: Use the Building in Scenes

1. Drag **10x10 Building** from sidebar into your scene
2. Position, rotate, or scale as needed
3. The entrance animation is ready to play
4. Render or use in visualizations

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Connection refused" | - Ensure Blender is open<br>- Verify BlenderMCP → Connect (port 9876)<br>- Check Blender console for errors |
| Building not in sidebar | - Verify `exportToPalette` completed<br>- Check Sidebar categories<br>- Restart Blender if needed |
| Animation not playing | - Check frame range (Ctrl+A → Frame Range)<br>- Verify keyframes match animation duration<br>- Ensure animation data is baked |
| Export fails | - Check write permissions<br>- Verify MCP connection is active<br>- Ensure BlenderMCP panel is visible |
| "Not connected" error | - Run `await blenderDirector.connect()`<br>- Ensure Blender is open with MCP enabled<br>- Check port 9876 is not blocked |

## MCP Commands Reference

### Connect
```typescript
await blenderDirector.connect();
```

### Create 10x10 Building
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

### Add Entrance Animation
```typescript
await blenderDirector.addAnimation({
  animationType: 'entrance',
  duration: 50,    // frames
  focus: 'main entrance'
});
```

### Custom Animation (Keyframes)
```typescript
await blenderDirector.animateProperty({
  object: 'building',
  property: 'rotation_euler',
  keyframes: [
    { frame: 1, value: [0, 0, 0] },
    { frame: 100, value: [360, 0, 0] }  // 360 degree rotation
  ]
});
```

### Export to Sidebar Palette
```typescript
await blenderDirector.exportToPalette({
  name: '10x10 Building',
  category: 'structures',
  thumbnail: true,
  description: '10x10 meter building with 3 floors',
  tags: ['building', '10x10', 'architecture', '3d']
});
```

### Set Lighting
```typescript
await blenderDirector.setLighting({
  keyLight: { intensity: 5, direction: [1, 1, 1] },
  fillLight: { intensity: 2, direction: [-1, -1, -1] },
  ambient: { intensity: 0.5 }
});
```

### Set Materials
```typescript
await blenderDirector.setMaterials({
  building: {
    baseColor: [0.8, 0.8, 0.8],
    roughness: 0.3,
    metallic: 0.1
  }
});
```

### Get Scene Info
```typescript
const info = await blenderDirector.getSceneInfo();
console.log(info);
```

### Disconnect
```typescript
blenderDirector.disconnect();
```

## Integration with Cursor Agent Starter

The Blender MCP integrates with the Cursor framework through:

1. **Skills**: `blender-director` and `3d-building-blender` from arjun988/blender-skills (94 skills)
2. **MCP JSON**: Configuration in `.cursor/mcp.json` (default port 9876)
3. **Agent prompts**: Use `maestro` skill for Blender task prompts
4. **Verification**: `verification-before-completion` for animation/export checks
5. **Caveman style**: All user replies in ultra mode

### Full Workflow Example

```typescript
// Full 10x10 building + animation workflow
import {
  blenderDirector,
  create10x10Building,
  addEntranceAnimation,
  exportToSidebar
} from '@/src/lib/blender-director';

// 1. Connect to Blender MCP
await blenderDirector.connect();

// 2. Create the building
await create10x10Building();

// 3. Add animation
await addEntranceAnimation(50);

// 4. Export to sidebar
await exportToSidebar();

// 5. Verify
if (blenderDirector.isConnected()) {
  console.log('✅ 10x10 Building ready in sidebar palette');
}
```

## Quick Checklist

- [ ] Blender is open
- [ ] BlenderMCP → Connect (port 9876)
- [ ] `await blenderDirector.connect()` runs successfully
- [ ] `create10x10Building()` completes
- [ ] `addEntranceAnimation(50)` completes
- [ ] `exportToSidebar()` completes
- [ ] Press `N` in Blender, find "10x10 Building" in sidebar
- [ ] Drag building into scene
- [ ] Test animation plays

## Next Steps

1. **Start Blender** and enable BlenderMCP
2. **Run the workflow** using Cursor agent framework
3. **Drag the 10x10 building** from sidebar into scenes
4. **Animate** using the provided animation tools
5. **Integrate** with your Next.js project if needed (export to `public/models/`)

Would you like me to help with:
- Specific building dimensions or roof styles?
- Animation keyframe patterns beyond entrance?
- Sidebar palette organization and categories?
- Export settings for `public/models/` directory?
- Integration with your existing project structure?