// !Fnlloyd Resource Loader
// Manages loading of sprite sheets and other assets based on quality settings
// Integrates with SpriteLoader for progressive asset loading

import { SpriteLoader } from './sprite-loader';
import { GameSettings, EffectQuality } from '../data/settings';
import { getConfigsByQuality, SPRITE_CONFIGS } from '../data/sprite-config';

export interface ResourceLoadProgress {
  resourceType: 'sprite' | 'audio' | 'model';
  resourceName: string;
  percent: number;
  loadedCount: number;
  totalCount: number;
}

export class ResourceLoader {
  private spriteLoader: SpriteLoader;
  private settings: GameSettings;
  
  // Loading state
  private isLoading = false;
  private loadedResources = new Set<string>();
  
  // Callbacks
  onProgress: ((progress: ResourceLoadProgress) => void) | null = null;
  onComplete: (() => void) | null = null;
  onError: ((error: Error) => void) | null = null;

  constructor(spriteLoader: SpriteLoader, settings: GameSettings) {
    this.spriteLoader = spriteLoader;
    this.settings = settings;
    
    // Wire up sprite loader callbacks
    this.spriteLoader.onProgress = (progress) => {
      this.onProgress?.({
        resourceType: 'sprite',
        resourceName: progress.spriteName,
        percent: progress.percent,
        loadedCount: progress.loadedFrames,
        totalCount: progress.totalFrames,
      });
    };
  }

  /**
   * Load all resources based on current quality setting
   */
  async loadAll(): Promise<void> {
    if (this.isLoading) {
      console.warn('Already loading resources');
      return;
    }

    this.isLoading = true;
    console.log(`🚀 Starting resource load (Quality: ${this.settings.effectQuality})`);

    try {
      // Get sprite configs for current quality
      const spritesToLoad = getConfigsByQuality(this.settings.effectQuality);
      
      console.log(`📦 Loading ${spritesToLoad.length} sprite sheets...`);

      // Load all sprite sheets
      const spriteNames = spritesToLoad.map(config => config.name);
      await this.spriteLoader.preloadAll(spriteNames);

      // Mark as loaded
      for (const name of spriteNames) {
        this.loadedResources.add(name);
      }

      console.log(`✅ All resources loaded successfully`);
      console.log(`   Memory usage: ${this.spriteLoader.getMemoryUsage().toFixed(2)} MB`);
      
      this.onComplete?.();
      
    } catch (error) {
      console.error('Resource loading failed:', error);
      this.onError?.(error as Error);
      throw error;
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Load a specific sprite sheet on demand
   */
  async loadSprite(spriteName: string): Promise<void> {
    if (this.loadedResources.has(spriteName)) {
      console.log(`✓ Sprite "${spriteName}" already loaded`);
      return;
    }

    console.log(`📥 On-demand load: ${spriteName}`);
    await this.spriteLoader.loadSpriteSheet(spriteName);
    this.loadedResources.add(spriteName);
  }

  /**
   * Check if a resource is loaded
   */
  isLoaded(resourceName: string): boolean {
    return this.loadedResources.has(resourceName);
  }

  /**
   * Update quality setting and reload if necessary
   */
  async updateQuality(newQuality: EffectQuality): Promise<void> {
    if (this.settings.effectQuality === newQuality) {
      return; // No change needed
    }

    console.log(`🔄 Quality change: ${this.settings.effectQuality} → ${newQuality}`);
    
    // Clear old resources
    this.spriteLoader.clearAll();
    this.loadedResources.clear();
    
    // Update setting
    this.settings.effectQuality = newQuality;
    
    // Reload with new quality
    await this.loadAll();
  }

  /**
   * Get list of currently loaded resources
   */
  getLoadedResources(): string[] {
    return Array.from(this.loadedResources);
  }

  /**
   * Unload a specific resource to free memory
   */
  unload(resourceName: string) {
    if (resourceName.startsWith('fx-')) {
      this.spriteLoader.clear(resourceName);
      this.loadedResources.delete(resourceName);
      console.log(`🗑️ Unloaded: ${resourceName}`);
    } else {
      console.warn(`Cannot unload core resource: ${resourceName}`);
    }
  }

  /**
   * Unload all optional resources (keep only essential ones)
   */
  unloadOptional() {
    const essential = [
      'fnlloyd-arkanoid-idle',
      'fnlloyd-brickliminator-focus',
    ];

    for (const resource of this.loadedResources) {
      if (!essential.includes(resource)) {
        this.unload(resource);
      }
    }
  }

  /**
   * Get loading status summary
   */
  getStatus(): {
    isLoading: boolean;
    loadedCount: number;
    totalResources: number;
    memoryMB: number;
  } {
    const totalResources = Object.keys(SPRITE_CONFIGS).length;
    
    return {
      isLoading: this.isLoading,
      loadedCount: this.loadedResources.size,
      totalResources,
      memoryMB: this.spriteLoader.getMemoryUsage(),
    };
  }
}
