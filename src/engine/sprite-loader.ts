// !Fnlloyd Sprite Sheet Loader
// Loads PNG sequences for sprite sheet animations
// Supports quality-based selection and async loading with progress

import { SpriteSheetConfig, getSpriteConfig } from '../data/sprite-config';

export interface LoadProgress {
  spriteName: string;
  loadedFrames: number;
  totalFrames: number;
  percent: number;
}

export class SpriteLoader {
  // Cache of loaded frames: spriteName -> frameIndex -> ImageBitmap
  private frameCache: Map<string, Map<number, ImageBitmap>> = new Map();
  
  // Loading state
  private loadingQueue: Map<string, Promise<void>> = new Map();
  
  // Callbacks
  onProgress: ((progress: LoadProgress) => void) | null = null;
  onComplete: ((spriteName: string) => void) | null = null;
  onError: ((error: Error) => void) | null = null;

  constructor() {}

  /**
   * Load a complete sprite sheet sequence
   */
  async loadSpriteSheet(spriteName: string): Promise<void> {
    // Check if already loading
    if (this.loadingQueue.has(spriteName)) {
      return this.loadingQueue.get(spriteName)!;
    }

    // Check if already loaded
    if (this.frameCache.has(spriteName)) {
      console.log(`✅ Sprite sheet "${spriteName}" already loaded`);
      return Promise.resolve();
    }

    const config = getSpriteConfig(spriteName);
    if (!config) {
      const error = new Error(`Sprite sheet "${spriteName}" not found in config`);
      this.onError?.(error);
      return Promise.reject(error);
    }

    console.log(`📥 Loading sprite sheet: ${spriteName}`);
    console.log(`   Path: ${config.basePath}`);
    console.log(`   Frames: ${config.totalFrames}`);

    const loadPromise = this.loadFramesSequentially(config);
    this.loadingQueue.set(spriteName, loadPromise);

    try {
      await loadPromise;
      this.onComplete?.(spriteName);
      console.log(`✅ Sprite sheet "${spriteName}" loaded successfully`);
    } catch (error) {
      this.onError?.(error as Error);
      throw error;
    } finally {
      this.loadingQueue.delete(spriteName);
    }
  }

  /**
   * Load frames sequentially with progress tracking
   */
  private async loadFramesSequentially(config: SpriteSheetConfig): Promise<void> {
    const frameMap = new Map<number, ImageBitmap>();
    this.frameCache.set(config.name, frameMap);

    for (let i = 0; i < config.totalFrames; i++) {
      try {
        const frameNumber = String(i + 1).padStart(4, '0');
        const url = `${config.basePath}${frameNumber}.png`;
        
        const imageBitmap = await this.loadImage(url);
        frameMap.set(i, imageBitmap);

        // Report progress
        const progress: LoadProgress = {
          spriteName: config.name,
          loadedFrames: i + 1,
          totalFrames: config.totalFrames,
          percent: ((i + 1) / config.totalFrames) * 100,
        };
        this.onProgress?.(progress);

      } catch (error) {
        console.error(`Failed to load frame ${i + 1}:`, error);
        throw error;
      }
    }
  }

  /**
   * Load a single image as ImageBitmap
   */
  private async loadImage(url: string): Promise<ImageBitmap> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const blob = await response.blob();
      return await createImageBitmap(blob);
    } catch (error) {
      throw new Error(`Failed to load image from ${url}: ${error}`);
    }
  }

  /**
   * Get a specific frame from cache
   */
  getFrame(spriteName: string, frameIndex: number): ImageBitmap | null {
    const frameMap = this.frameCache.get(spriteName);
    if (!frameMap) return null;
    return frameMap.get(frameIndex) || null;
  }

  /**
   * Get all frames for a sprite sheet
   */
  getAllFrames(spriteName: string): ImageBitmap[] {
    const frameMap = this.frameCache.get(spriteName);
    if (!frameMap) return [];
    
    const frames: ImageBitmap[] = [];
    for (let i = 0; i < frameMap.size; i++) {
      const frame = frameMap.get(i);
      if (frame) frames.push(frame);
    }
    return frames;
  }

  /**
   * Check if sprite sheet is fully loaded
   */
  isLoaded(spriteName: string): boolean {
    const frameMap = this.frameCache.get(spriteName);
    if (!frameMap) return false;
    
    const config = getSpriteConfig(spriteName);
    if (!config) return false;
    
    return frameMap.size >= config.totalFrames;
  }

  /**
   * Preload multiple sprite sheets
   */
  async preloadAll(configNames: string[]): Promise<void> {
    console.log(`📦 Preloading ${configNames.length} sprite sheets...`);
    
    const promises = configNames.map(name => this.loadSpriteSheet(name));
    await Promise.all(promises);
    
    console.log('✅ All sprite sheets preloaded');
  }

  /**
   * Clear cache for a specific sprite sheet
   */
  clear(spriteName: string) {
    const frameMap = this.frameCache.get(spriteName);
    if (frameMap) {
      // Close all ImageBitmaps to free memory
      for (const bitmap of frameMap.values()) {
        bitmap.close();
      }
      this.frameCache.delete(spriteName);
      console.log(`🗑️ Cleared cache for "${spriteName}"`);
    }
  }

  /**
   * Clear all cached sprite sheets
   */
  clearAll() {
    for (const [name, frameMap] of this.frameCache.entries()) {
      for (const bitmap of frameMap.values()) {
        bitmap.close();
      }
    }
    this.frameCache.clear();
    console.log('🗑️ Cleared all sprite sheet caches');
  }

  /**
   * Get memory usage estimate (in MB)
   */
  getMemoryUsage(): number {
    let totalBytes = 0;
    
    for (const frameMap of this.frameCache.values()) {
      for (const bitmap of frameMap.values()) {
        // Estimate: width * height * 4 bytes (RGBA)
        const bytes = bitmap.width * bitmap.height * 4;
        totalBytes += bytes;
      }
    }
    
    return totalBytes / (1024 * 1024); // Convert to MB
  }
}
