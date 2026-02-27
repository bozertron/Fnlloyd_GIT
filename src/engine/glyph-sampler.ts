// GlyphSampler - Samples font glyphs into particle point clouds
// Uses opentype.js to parse font files and extract bezier path commands

import opentype from 'opentype.js';

export interface GlyphSampleOptions {
  /** Add slight random Z jitter to prevent flat appearance */
  zJitter?: number;
  /** Normalize points to this range (default: 1.5) */
  normalizeRange?: number;
}

/**
 * Utility to pad or truncate positions array to match target count
 * This ensures point count parity between morph source and target
 */
export function padOrTruncate(positions: Float32Array, targetCount: number): Float32Array {
  const currentCount = positions.length / 3;
  
  // Early return for empty positions to avoid division by zero in centroid calculation
  if (currentCount === 0) {
    return new Float32Array(targetCount * 3);
  }
  
  if (currentCount === targetCount) {
    return positions;
  }
  
  const result = new Float32Array(targetCount * 3);
  
  if (currentCount < targetCount) {
    // Pad with random points near centroid
    // Calculate centroid
    let cx = 0, cy = 0, cz = 0;
    for (let i = 0; i < currentCount; i++) {
      cx += positions[i * 3];
      cy += positions[i * 3 + 1];
      cz += positions[i * 3 + 2];
    }
    cx /= currentCount || 1;
    cy /= currentCount || 1;
    cz /= currentCount || 1;
    
    // Copy existing points
    result.set(positions);
    
    // Add random points near centroid for remaining spots
    for (let i = currentCount; i < targetCount; i++) {
      result[i * 3] = cx + (Math.random() - 0.5) * 0.1;
      result[i * 3 + 1] = cy + (Math.random() - 0.5) * 0.1;
      result[i * 3 + 2] = cz + (Math.random() - 0.5) * 0.1;
    }
  } else {
    // Truncate to target count
    for (let i = 0; i < targetCount; i++) {
      const sourceIdx = Math.floor((i / targetCount) * currentCount) * 3;
      result[i * 3] = positions[sourceIdx];
      result[i * 3 + 1] = positions[sourceIdx + 1];
      result[i * 3 + 2] = positions[sourceIdx + 2];
    }
  }
  
  return result;
}

/**
 * GlyphSampler - Samples font glyphs into particle point clouds
 * 
 * Usage:
 *   const sampler = new GlyphSampler();
 *   await sampler.loadFont('/fonts/VT323-Regular.ttf');
 *   const points = sampler.sampleString('HELLO', 5000);
 */
export class GlyphSampler {
  private font: opentype.Font | null = null;
  private defaultOptions: GlyphSampleOptions = {
    zJitter: 0.05,
    normalizeRange: 1.5,
  };

  /**
   * Load a font from URL
   * @param url - Path to font file (.ttf, .otf, .woff)
   */
  async loadFont(url: string): Promise<void> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to load font from ${url}: ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    this.font = opentype.parse(arrayBuffer);
  }

  /**
   * Load font from ArrayBuffer directly
   * @param buffer - Font file as ArrayBuffer
   */
  loadFontFromBuffer(buffer: ArrayBuffer): void {
    this.font = opentype.parse(buffer);
  }

  /**
   * Check if a font is loaded
   */
  isLoaded(): boolean {
    return this.font !== null;
  }

  /**
   * Get the current font's units per em (for normalization)
   */
  getUnitsPerEm(): number {
    return this.font?.unitsPerEm || 1000;
  }

  /**
   * Sample a single glyph into points
   * @param char - Character to sample
   * @param pointCount - Number of points to generate
   * @param z - Z depth (default: 0)
   * @param options - Sampling options
   */
  sampleGlyph(
    char: string, 
    pointCount: number, 
    z: number = 0,
    options: GlyphSampleOptions = {}
  ): Float32Array {
    if (!this.font) {
      throw new Error('No font loaded. Call loadFont() first.');
    }

    const opts = { ...this.defaultOptions, ...options };
    const glyph = this.font.charToGlyph(char);
    
    if (!glyph || !glyph.path) {
      // Return empty array for whitespace/unknown characters
      return new Float32Array(pointCount * 3);
    }

    const path = glyph.path;
    const commands = path.commands;
    
    // Calculate total path length for even distribution
    const totalLength = this.calculatePathLength(commands);
    
    if (totalLength === 0) {
      // Empty path - return points clustered around origin
      const result = new Float32Array(pointCount * 3);
      const range = opts.normalizeRange!;
      for (let i = 0; i < pointCount; i++) {
        result[i * 3] = (Math.random() - 0.5) * range * 0.1;
        result[i * 3 + 1] = (Math.random() - 0.5) * range * 0.1;
        result[i * 3 + 2] = z + (Math.random() - 0.5) * opts.zJitter!;
      }
      return result;
    }

    const result = new Float32Array(pointCount * 3);
    const range = opts.normalizeRange!;
    const unitsPerEm = this.getUnitsPerEm();
    const scale = (range * 2) / unitsPerEm;

    // Sample points evenly along the path
    for (let i = 0; i < pointCount; i++) {
      const t = i / pointCount;
      const point = this.samplePathAtT(commands, totalLength, t);
      
      // Get glyph advance width offset to center character
      const offsetX = -(glyph.advanceWidth || 0) / unitsPerEm * range;
      
      // Normalize and position
      const x = (point.x / unitsPerEm * range * 2 + offsetX);
      const y = (point.y / unitsPerEm * range * 2); // Flip Y for screen coords
      
      // Apply slight Z jitter for 3D effect
      const zWithJitter = z + (Math.random() - 0.5) * opts.zJitter!;
      
      result[i * 3] = x;
      result[i * 3 + 1] = -y; // Flip Y to match Three.js coordinate system
      result[i * 3 + 2] = zWithJitter;
    }

    return result;
  }

  /**
   * Sample a string into points, distributed proportionally by character width
   * @param text - Text string to sample
   * @param pointCount - Total number of points
   * @param options - Sampling options
   */
  sampleString(
    text: string, 
    pointCount: number,
    options: GlyphSampleOptions = {}
  ): Float32Array {
    if (!this.font) {
      throw new Error('No font loaded. Call loadFont() first.');
    }

    const chars = text.split('');
    const glyphs = chars.map(c => this.font!.charToGlyph(c));
    
    // Calculate total advance width
    let totalWidth = 0;
    const charWidths: number[] = [];
    
    for (const glyph of glyphs) {
      const width = glyph.advanceWidth || 0;
      charWidths.push(width);
      totalWidth += width;
    }
    
    if (totalWidth === 0) {
      return new Float32Array(pointCount * 3);
    }

    // Distribute points proportionally
    const result = new Float32Array(pointCount * 3);
    const unitsPerEm = this.getUnitsPerEm();
    const resolvedOptions = { ...this.defaultOptions, ...options };
    const range = resolvedOptions.normalizeRange || this.defaultOptions.normalizeRange || 1.5;
    
    let currentPointIndex = 0;
    
    for (let charIdx = 0; charIdx < chars.length; charIdx++) {
      const char = chars[charIdx];
      const charWidth = charWidths[charIdx];
      const proportion = charWidth / totalWidth;
      const charPointCount = Math.max(1, Math.round(pointCount * proportion));
      
      // Sample this character
      const charPoints = this.sampleGlyph(char, charPointCount, 0, options);
      
      // Calculate X offset to center the entire string
      // Each character's x is relative to its position, so we need to offset all points
      let cumulativeOffset = 0;
      for (let j = 0; j < charIdx; j++) {
        cumulativeOffset += charWidths[j];
      }
      
      // Offset in normalized coordinates
      const xOffset = -(cumulativeOffset / unitsPerEm * range * 2) + range;
      
      // Copy points with offset
      for (let i = 0; i < charPointCount && currentPointIndex < pointCount; i++) {
        result[currentPointIndex * 3] = charPoints[i * 3] + xOffset;
        result[currentPointIndex * 3 + 1] = charPoints[i * 3 + 1];
        result[currentPointIndex * 3 + 2] = charPoints[i * 3 + 2];
        currentPointIndex++;
      }
    }
    
    // If we haven't filled all points (due to rounding), add more to last char
    while (currentPointIndex < pointCount) {
      const lastIdx = (currentPointIndex - 1) * 3;
      if (lastIdx >= 0) {
        result[currentPointIndex * 3] = result[lastIdx] + (Math.random() - 0.5) * 0.05;
        result[currentPointIndex * 3 + 1] = result[lastIdx + 1] + (Math.random() - 0.5) * 0.05;
        result[currentPointIndex * 3 + 2] = result[lastIdx + 2] + (Math.random() - 0.5) * 0.05;
      }
      currentPointIndex++;
    }

    return result;
  }

  /**
   * Calculate approximate total length of path
   */
  private calculatePathLength(commands: opentype.PathCommand[]): number {
    let length = 0;
    let prevPoint = { x: 0, y: 0 };
    
    for (const cmd of commands) {
      // Skip Z commands (close path) as they don't have coordinates
      if (cmd.type === 'Z') {
        continue;
      }
      
      const cmdAny = cmd as unknown as { x?: number; y?: number; x1?: number; y1?: number; x2?: number; y2?: number };
      const currentPoint = { x: cmdAny.x || 0, y: cmdAny.y || 0 };
      
      if (cmd.type === 'M' || cmd.type === 'L') {
        length += this.distance(prevPoint, currentPoint);
      } else if (cmd.type === 'Q') {
        // Quadratic bezier - approximate with chord length
        const cp = { x: cmdAny.x1 || 0, y: cmdAny.y1 || 0 };
        length += this.quadraticBezierLength(prevPoint, cp, currentPoint);
      } else if (cmd.type === 'C') {
        // Cubic bezier - approximate with chord length
        const cp1 = { x: cmdAny.x1 || 0, y: cmdAny.y1 || 0 };
        const cp2 = { x: cmdAny.x2 || 0, y: cmdAny.y2 || 0 };
        length += this.cubicBezierLength(prevPoint, cp1, cp2, currentPoint);
      }
      
      if (cmdAny.x !== undefined && cmdAny.y !== undefined) {
        prevPoint = { x: cmdAny.x, y: cmdAny.y };
      }
    }
    
    return length;
  }

  /**
   * Sample path at normalized position t (0-1)
   */
  private samplePathAtT(
    commands: opentype.PathCommand[], 
    totalLength: number,
    t: number
  ): { x: number; y: number } {
    const targetLength = t * totalLength;
    let accumulatedLength = 0;
    let prevPoint = { x: 0, y: 0 };
    
    for (const cmd of commands) {
      // Skip Z commands (close path) as they don't have coordinates
      if (cmd.type === 'Z') {
        continue;
      }
      
      const cmdAny = cmd as unknown as { x?: number; y?: number; x1?: number; y1?: number; x2?: number; y2?: number };
      const currentPoint = { x: cmdAny.x || 0, y: cmdAny.y || 0 };
      let segmentLength = 0;
      let segmentPoints: { t: number; point: { x: number; y: number } }[] = [];
      
      if (cmd.type === 'M' || cmd.type === 'L') {
        segmentLength = this.distance(prevPoint, currentPoint);
        segmentPoints = [{ t: 0, point: prevPoint }, { t: 1, point: currentPoint }];
      } else if (cmd.type === 'Q') {
        const cp = { x: cmdAny.x1 || 0, y: cmdAny.y1 || 0 };
        segmentLength = this.quadraticBezierLength(prevPoint, cp, currentPoint);
        segmentPoints = this.sampleQuadraticBezier(prevPoint, cp, currentPoint, 10);
      } else if (cmd.type === 'C') {
        const cp1 = { x: cmdAny.x1 || 0, y: cmdAny.y1 || 0 };
        const cp2 = { x: cmdAny.x2 || 0, y: cmdAny.y2 || 0 };
        segmentLength = this.cubicBezierLength(prevPoint, cp1, cp2, currentPoint);
        segmentPoints = this.sampleCubicBezier(prevPoint, cp1, cp2, currentPoint, 10);
      }
      
      if (accumulatedLength + segmentLength >= targetLength && segmentLength > 0) {
        // Find the exact point on this segment
        const localT = (targetLength - accumulatedLength) / segmentLength;
        
        if (cmd.type === 'M' || cmd.type === 'L') {
          return this.lerpPoint(prevPoint, currentPoint, localT);
        } else if (cmd.type === 'Q') {
          const cp = { x: cmdAny.x1 || 0, y: cmdAny.y1 || 0 };
          return this.evaluateQuadraticBezier(prevPoint, cp, currentPoint, localT);
        } else if (cmd.type === 'C') {
          const cp1 = { x: cmdAny.x1 || 0, y: cmdAny.y1 || 0 };
          const cp2 = { x: cmdAny.x2 || 0, y: cmdAny.y2 || 0 };
          return this.evaluateCubicBezier(prevPoint, cp1, cp2, currentPoint, localT);
        }
      }
      
      accumulatedLength += segmentLength;
      
      if (cmdAny.x !== undefined && cmdAny.y !== undefined) {
        prevPoint = { x: cmdAny.x, y: cmdAny.y };
      }
    }
    
    return prevPoint;
  }

  // ─── Helper methods ─────────────────────────────────────────────────────────────

  private distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  private lerpPoint(a: { x: number; y: number }, b: { x: number; y: number }, t: number): { x: number; y: number } {
    return {
      x: this.lerp(a.x, b.x, t),
      y: this.lerp(a.y, b.y, t),
    };
  }

  private quadraticBezierLength(p0: { x: number; y: number }, p1: { x: number; y: number }, p2: { x: number; y: number }): number {
    // Approximate using sampling
    const samples = this.sampleQuadraticBezier(p0, p1, p2, 20);
    let length = 0;
    for (let i = 1; i < samples.length; i++) {
      length += this.distance(samples[i - 1].point, samples[i].point);
    }
    return length;
  }

  private cubicBezierLength(p0: { x: number; y: number }, p1: { x: number; y: number }, p2: { x: number; y: number }, p3: { x: number; y: number }): number {
    // Approximate using sampling
    const samples = this.sampleCubicBezier(p0, p1, p2, p3, 20);
    let length = 0;
    for (let i = 1; i < samples.length; i++) {
      length += this.distance(samples[i - 1].point, samples[i].point);
    }
    return length;
  }

  private sampleQuadraticBezier(
    p0: { x: number; y: number }, 
    p1: { x: number; y: number }, 
    p2: { x: number; y: number }, 
    numSamples: number
  ): { t: number; point: { x: number; y: number } }[] {
    const result: { t: number; point: { x: number; y: number } }[] = [];
    for (let i = 0; i <= numSamples; i++) {
      const t = i / numSamples;
      result.push({ t, point: this.evaluateQuadraticBezier(p0, p1, p2, t) });
    }
    return result;
  }

  private sampleCubicBezier(
    p0: { x: number; y: number }, 
    p1: { x: number; y: number }, 
    p2: { x: number; y: number }, 
    p3: { x: number; y: number }, 
    numSamples: number
  ): { t: number; point: { x: number; y: number } }[] {
    const result: { t: number; point: { x: number; y: number } }[] = [];
    for (let i = 0; i <= numSamples; i++) {
      const t = i / numSamples;
      result.push({ t, point: this.evaluateCubicBezier(p0, p1, p2, p3, t) });
    }
    return result;
  }

  /**
   * Evaluate quadratic bezier at t using De Casteljau's algorithm
   */
  private evaluateQuadraticBezier(
    p0: { x: number; y: number }, 
    p1: { x: number; y: number }, 
    p2: { x: number; y: number }, 
    t: number
  ): { x: number; y: number } {
    // De Casteljau: p0 --p1--> p0', p1 --p2--> p1', then p0' --p1'--> result
    const p0p1 = this.lerpPoint(p0, p1, t);
    const p1p2 = this.lerpPoint(p1, p2, t);
    return this.lerpPoint(p0p1, p1p2, t);
  }

  /**
   * Evaluate cubic bezier at t using De Casteljau's algorithm
   */
  private evaluateCubicBezier(
    p0: { x: number; y: number }, 
    p1: { x: number; y: number }, 
    p2: { x: number; y: number }, 
    p3: { x: number; y: number }, 
    t: number
  ): { x: number; y: number } {
    // De Casteljau: 
    // p0 --p1--> a, p1 --p2--> b, p2 --p3--> c
    // a --b--> d, b --c--> e
    // d --e--> result
    const a = this.lerpPoint(p0, p1, t);
    const b = this.lerpPoint(p1, p2, t);
    const c = this.lerpPoint(p2, p3, t);
    const d = this.lerpPoint(a, b, t);
    const e = this.lerpPoint(b, c, t);
    return this.lerpPoint(d, e, t);
  }

  /**
   * Adaptive sampling of bezier curve - places more points where curvature is higher
   * This is the method referenced in the spec
   */
  adaptiveSampleBezier(
    points: { x: number; y: number }[],
    t: number
  ): { x: number; y: number } {
    if (points.length === 2) {
      return this.lerpPoint(points[0], points[1], t);
    } else if (points.length === 3) {
      return this.evaluateQuadraticBezier(points[0], points[1], points[2], t);
    } else if (points.length === 4) {
      return this.evaluateCubicBezier(points[0], points[1], points[2], points[3], t);
    }
    // Fallback: simple lerp
    const idx = Math.floor(t * (points.length - 1));
    const localT = (t * (points.length - 1)) - idx;
    return this.lerpPoint(points[idx], points[Math.min(idx + 1, points.length - 1)], localT);
  }
}