// !Fnlloyd Sprite Exporter
// Utilities for packaging and exporting sprite sheets
// Works with AnimationRecorder to finalize sprite sheet packages

import JSZip from 'jszip';
import { CANVAS_W, CANVAS_H } from '../data/constants';

export interface ExportOptions {
  format: 'png' | 'jpeg';
  quality?: number;      // 0-1 for jpeg
  compression?: number;  // 0-9 for png (zip compression level)
  scale?: number;        // downscale factor (e.g., 0.5 for half resolution)
  fps?: number;
}

export interface SpriteSheetMetadata {
  name: string;
  width: number;
  height: number;
  frameWidth: number;
  frameHeight: number;
  totalFrames: number;
  fps: number;  // Not hardcoded - use opts.fps ?? 24
  duration: number;
  format: string;
  createdAt: string;
  tags?: string[];
}

export class SpriteExporter {
  private defaultOptions: ExportOptions = {
    format: 'png',
    quality: 0.92,
    compression: 6,
    scale: 1.0,
  };

  /**
   * Export frames as individual PNG files in a ZIP
   */
  async exportFrameSequence(
    frames: ImageData[],
    animationName: string,
    options: Partial<ExportOptions> = {},
    onProgress?: (frame: number, total: number) => void
  ): Promise<Blob | null> {
    const opts = { ...this.defaultOptions, ...options };
    const zip = new JSZip();
    const folder = zip.folder(animationName);

    if (!folder) return null;

    console.log(`📦 Exporting ${frames.length} frames as "${animationName}"`);

    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i];
      const frameNumber = String(i + 1).padStart(4, '0');
      const fileName = `${frameNumber}.${opts.format}`;

      let blob: Blob;
      
      if (opts.scale !== 1.0) {
        // Scale the frame
        blob = await this.scaleAndConvert(frame, opts);
      } else {
        blob = await this.imageDataToBlob(frame, opts);
      }

      folder.file(fileName, blob);

      if ((i + 1) % 50 === 0) { onProgress?.(i + 1, frames.length); }
    }

    // Add metadata
    const metadata: SpriteSheetMetadata = {
      name: animationName,
      width: CANVAS_W,
      height: CANVAS_H,
      frameWidth: Math.floor(CANVAS_W * (opts.scale || 1)),
      frameHeight: Math.floor(CANVAS_H * (opts.scale || 1)),
      totalFrames: frames.length,
      fps: opts.fps ?? 24,
      duration: frames.length / (opts.fps ?? 24),
      format: opts.format,
      createdAt: new Date().toISOString(),
    };

    folder.file('metadata.json', JSON.stringify(metadata, null, 2));

    // Generate ZIP
    const zipBlob = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: opts.compression ?? 6 },
    });

    console.log(`✅ Export complete: ${(zipBlob.size / 1024 / 1024).toFixed(2)} MB`);
    return zipBlob;
  }

  /**
   * Create a sprite sheet atlas (all frames in a single image grid)
   */
  async exportSpriteAtlas(
    frames: ImageData[],
    animationName: string,
    columns: number,
    options: Partial<ExportOptions> = {}
  ): Promise<Blob | null> {
    const opts = { ...this.defaultOptions, ...options };
    const rows = Math.ceil(frames.length / columns);

    const frameWidth = CANVAS_W;
    const frameHeight = CANVAS_H;
    const atlasWidth = frameWidth * columns;
    const atlasHeight = frameHeight * rows;

    console.log(`🎨 Creating sprite atlas: ${columns}x${rows} = ${frames.length} frames`);

    // Create atlas canvas
    const atlasCanvas = document.createElement('canvas');
    atlasCanvas.width = atlasWidth;
    atlasCanvas.height = atlasHeight;
    const atlasCtx = atlasCanvas.getContext('2d');

    if (!atlasCtx) return null;

    // Draw each frame into the atlas grid
    for (let i = 0; i < frames.length; i++) {
      const col = i % columns;
      const row = Math.floor(i / columns);
      const x = col * frameWidth;
      const y = row * frameHeight;

      // Convert ImageData to temporary canvas
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = frameWidth;
      tempCanvas.height = frameHeight;
      const tempCtx = tempCanvas.getContext('2d');

      if (tempCtx) {
        tempCtx.putImageData(frames[i], 0, 0);
        atlasCtx.drawImage(tempCanvas, x, y);
      }
    }

    // Convert atlas to blob
    return new Promise((resolve) => {
      atlasCanvas.toBlob(
        (blob) => resolve(blob),
        opts.format === 'png' ? 'image/png' : 'image/jpeg',
        opts.quality
      );
    });
  }

  /**
   * Download a blob as a file
   */
  downloadFile(blob: Blob, filename: string) {
    if (!document.body) { console.error('[SpriteExporter] No document.body'); return; }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    console.log(`⬇️ Downloaded: ${filename}`);
  }

  /**
   * Helper: Convert ImageData to Blob
   */
  private imageDataToBlob(imageData: ImageData, options: ExportOptions): Promise<Blob> {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      canvas.width = imageData.width;
      canvas.height = imageData.height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        resolve(new Blob());
        return;
      }

      ctx.putImageData(imageData, 0, 0);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            console.warn('[SpriteExporter] toBlob failed for frame');
            resolve(new Blob()); // Return empty blob for consistency
            return;
          }
          resolve(blob);
        },
        options.format === 'png' ? 'image/png' : 'image/jpeg',
        options.quality
      );
    });
  }

  /**
   * Helper: Scale and convert ImageData
   */
  private async scaleAndConvert(imageData: ImageData, options: ExportOptions): Promise<Blob> {
    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(imageData.width * options.scale!);
    canvas.height = Math.floor(imageData.height * options.scale!);
    const ctx = canvas.getContext('2d');

    if (!ctx) return new Blob();

    // Draw original
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = imageData.width;
    tempCanvas.height = imageData.height;
    const tempCtx = tempCanvas.getContext('2d');

    if (tempCtx) {
      tempCtx.putImageData(imageData, 0, 0);
      
      // Scale draw
      ctx.drawImage(
        tempCanvas,
        0, 0, imageData.width, imageData.height,
        0, 0, canvas.width, canvas.height
      );
    }

    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) { 
            console.warn('[SpriteExporter] toBlob failed for scaled frame'); 
            resolve(null as unknown as Blob);  // Return null, let caller handle
            return;
          }
          resolve(blob);
        },
        options.format === 'png' ? 'image/png' : 'image/jpeg',
        options.quality
      );
    });
  }
}
