/**
 * Blender Director - MCP Connection & Scene Management
 * 
 * Connects to Blender via BlenderMCP protocol (port 9876)
 * Handles building creation, animation, and sidebar palette export
 * 
 * Based on arjun988/blender-skills (94 skills)
 * Entry skill: blender-director
 * Project overlay: 3d-building-blender
 */

// MCP Configuration
const MCP_PORT = 9876;
const MCP_HOST = 'localhost';

export interface BuildingConfig {
  width: number;        // meters
  depth: number;        // meters
  floors: number;       // number of floors
  windowSize: number;   // window size in meters
  wallThickness: number; // wall thickness
  roofType: 'flat' | 'pitched'; // roof style
}

export interface AnimationConfig {
  animationType: 'entrance' | 'exit' | 'idle' | 'custom';
  duration: number;     // in frames
  focus: string;        // which part of building
  keyframes?: Array<{ frame: number; value: number[] }>;
}

export interface PaletteExportConfig {
  name: string;
  category: string;
  thumbnail: boolean;
  description: string;
  tags?: string[];
}

export interface Keyframe {
  frame: number;
  value: number[];
}

export class BlenderDirector {
  private connected: boolean = false;
  private ws: WebSocket | null = null;

  /**
   * Connect to Blender MCP server
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(`ws://${MCP_HOST}:${MCP_PORT}`);

      this.ws.onopen = () => {
        this.connected = true;
        console.log('✅ Connected to Blender MCP');
        resolve();
      };

      this.ws.onerror = (error) => {
        this.connected = false;
        console.error('❌ Blender MCP connection error:', error);
        reject(new Error('Blender MCP connection failed'));
      };

      this.ws.onclose = () => {
        this.connected = false;
        console.warn('⚠️ Blender MCP connection closed');
      };

      this.ws.onmessage = (message) => {
        this.handleMessage(message.data);
      };
    });
  }

  /**
   * Check if connected to Blender MCP
   */
  isConnected(): boolean {
    return this.connected && this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Handle incoming MCP messages
   */
  private handleMessage(data: string): void {
    const msg = JSON.parse(data);
    console.log('📥 MCP Message:', msg.type, msg.status);
  }

  /**
   * Create a building in Blender
   */
  async createBuilding(config: BuildingConfig): Promise<void> {
    if (!this.isConnected()) {
      throw new Error('Not connected to Blender MCP');
    }

    const message = {
      type: 'create_building',
      data: config,
      timestamp: Date.now()
    };

    this.ws?.send(JSON.stringify(message));
    console.log('🏗️ Sent building creation config:', config);
  }

  /**
   * Add animation to the current scene
   */
  async addAnimation(config: AnimationConfig): Promise<void> {
    if (!this.isConnected()) {
      throw new Error('Not connected to Blender MCP');
    }

    const message = {
      type: 'add_animation',
      data: config,
      timestamp: Date.now()
    };

    this.ws?.send(JSON.stringify(message));
    console.log('🎬 Sent animation config:', config);
  }

  /**
   * Animate a property with keyframes
   */
  async animateProperty({
    object,
    property,
    keyframes
  }: {
    object: string;
    property: string;
    keyframes: Keyframe[];
  }): Promise<void> {
    if (!this.isConnected()) {
      throw new Error('Not connected to Blender MCP');
    }

    const message = {
      type: 'animate_property',
      data: { object, property, keyframes },
      timestamp: Date.now()
    };

    this.ws?.send(JSON.stringify(message));
    console.log('🔧 Sent animation keyframes:', { object, property, keyframes });
  }

  /**
   * Export building to sidebar palette for drag-and-drop
   */
  async exportToPalette(config: PaletteExportConfig): Promise<void> {
    if (!this.isConnected()) {
      throw new Error('Not connected to Blender MCP');
    }

    const message = {
      type: 'export_to_palette',
      data: config,
      timestamp: Date.now()
    };

    this.ws?.send(JSON.stringify(message));
    console.log('📦 Sent palette export config:', config);
  }

  /**
   * Set scene lighting
   */
  async setLighting({
    keyLight,
    fillLight,
    ambient
  }: {
    keyLight: { intensity: number; direction: number[] };
    fillLight: { intensity: number; direction: number[] };
    ambient: { intensity: number };
  }): Promise<void> {
    if (!this.isConnected()) {
      throw new Error('Not connected to Blender MCP');
    }

    const message = {
      type: 'set_lighting',
      data: { keyLight, fillLight, ambient },
      timestamp: Date.now()
    };

    this.ws?.send(JSON.stringify(message));
    console.log('💡 Sent lighting config:', { keyLight, fillLight, ambient });
  }

  /**
   * Set materials for scene objects
   */
  async setMaterials({
    building,
    floor,
    window
  }: {
    building: { baseColor: number[]; roughness: number; metallic: number };
    floor?: { baseColor: number[]; roughness: number; metallic: number };
    window?: { baseColor: number[]; roughness: number; metallic: number };
  }): Promise<void> {
    if (!this.isConnected()) {
      throw new Error('Not connected to Blender MCP');
    }

    const message = {
      type: 'set_materials',
      data: { building, floor, window },
      timestamp: Date.now()
    };

    this.ws?.send(JSON.stringify(message));
    console.log('🎨 Sent materials config:', { building, floor, window });
  }

  /**
   * Get current scene information
   */
  async getSceneInfo(): Promise<any> {
    if (!this.isConnected()) {
      throw new Error('Not connected to Blender MCP');
    }

    const message = {
      type: 'get_scene_info',
      timestamp: Date.now()
    };

    return new Promise((resolve) => {
      // In a full implementation, we'd wait for a response
      // For now, send and log
      this.ws?.send(JSON.stringify(message));
      console.log('📡 Requested scene info');
      resolve({ status: 'requested' });
    });
  }

  /**
   * Disconnect from Blender MCP
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.connected = false;
      console.log('🔌 Disconnected from Blender MCP');
    }
  }
}

/**
 * Create a BlenderDirector instance
 */
export const blenderDirector = new BlenderDirector();

/**
 * Pre-configured 10x10 building creation
 */
export const create10x10Building = async (): Promise<void> => {
  await blenderDirector.createBuilding({
    width: 10,
    depth: 10,
    floors: 3,
    windowSize: 2.0,
    wallThickness: 0.75,
    roofType: 'flat'
  });
  console.log('✅ 10x10 building created in Blender');
};

/**
 * Pre-configured entrance animation
 */
export const addEntranceAnimation = async (duration: number = 50): Promise<void> => {
  await blenderDirector.addAnimation({
    animationType: 'entrance',
    duration,
    focus: 'main entrance'
  });
  console.log(`✅ Entrance animation added (${duration} frames)`);
};

/**
 * Export to sidebar palette
 */
export const exportToSidebar = async (): Promise<void> => {
  await blenderDirector.exportToPalette({
    name: '10x10 Building',
    category: 'structures',
    thumbnail: true,
    description: '10x10 meter building with 3 floors',
    tags: ['building', '10x10', 'architecture', '3d']
  });
  console.log('📦 Exported to sidebar palette');
};