// !Fnlloyd glTF Vertex Loader
// Parses glTF models to extract vertex positions for particle sampling
// Used to map 12K particles to actual 3D model mesh data

export interface VertexData {
  positions: Float32Array;  // [x, y, z, x, y, z, ...] interleaved
  vertexCount: number;
  bounds: { minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number };
}

export interface BoneWeightData {
  joints: Uint16Array;   // 4 joints per vertex
  weights: Float32Array; // 4 weights per vertex
}

interface GltfJson {
  accessors: Array<{
    bufferView: number;
    componentType: number;
    count: number;
    type: string;
    min?: number[];
    max?: number[];
    byteOffset?: number;
  }>;
  bufferViews: Array<{
    buffer: number;
    byteLength: number;
    byteOffset?: number;
    byteStride?: number;
  }>;
  buffers: Array<{
    uri: string;
    byteLength: number;
  }>;
  meshes: Array<{
    primitives: Array<{
      attributes: Record<string, number>;
      indices?: number;
    }>;
  }>;
}

export async function loadGltfVertices(gltfUrl: string): Promise<VertexData | null> {
  try {
    const response = await fetch(gltfUrl);
    if (!response.ok) return null;
    const gltf: GltfJson = await response.json();

    if (!gltf.meshes || gltf.meshes.length === 0) return null;

    // Get the first mesh's first primitive POSITION accessor
    const primitive = gltf.meshes[0].primitives[0];
    const posAccessorIdx = primitive.attributes['POSITION'];
    if (posAccessorIdx === undefined) return null;

    const accessor = gltf.accessors[posAccessorIdx];
    const bufferView = gltf.bufferViews[accessor.bufferView];

    // Load the binary buffer
    const bufferUri = gltf.buffers[bufferView.buffer].uri;
    // Resolve relative path from gltf location
    const basePath = gltfUrl.substring(0, gltfUrl.lastIndexOf('/') + 1);
    const binUrl = basePath + bufferUri;

    const binResponse = await fetch(binUrl);
    if (!binResponse.ok) return null;
    const arrayBuffer = await binResponse.arrayBuffer();

    // Extract position data
    const byteOffset = (bufferView.byteOffset || 0) + (accessor.byteOffset || 0);
    const positions = new Float32Array(arrayBuffer, byteOffset, accessor.count * 3);

    // Calculate bounds
    const bounds = {
      minX: accessor.min ? accessor.min[0] : Infinity,
      maxX: accessor.max ? accessor.max[0] : -Infinity,
      minY: accessor.min ? accessor.min[1] : Infinity,
      maxY: accessor.max ? accessor.max[1] : -Infinity,
      minZ: accessor.min ? accessor.min[2] : Infinity,
      maxZ: accessor.max ? accessor.max[2] : -Infinity,
    };

    // If bounds weren't in accessor, compute them
    if (!accessor.min || !accessor.max) {
      bounds.minX = Infinity; bounds.maxX = -Infinity;
      bounds.minY = Infinity; bounds.maxY = -Infinity;
      bounds.minZ = Infinity; bounds.maxZ = -Infinity;
      for (let i = 0; i < accessor.count; i++) {
        const x = positions[i * 3];
        const y = positions[i * 3 + 1];
        const z = positions[i * 3 + 2];
        bounds.minX = Math.min(bounds.minX, x);
        bounds.maxX = Math.max(bounds.maxX, x);
        bounds.minY = Math.min(bounds.minY, y);
        bounds.maxY = Math.max(bounds.maxY, y);
        bounds.minZ = Math.min(bounds.minZ, z);
        bounds.maxZ = Math.max(bounds.maxZ, z);
      }
    }

    return { positions, vertexCount: accessor.count, bounds };
  } catch (err) {
    console.warn('Failed to load glTF:', err);
    return null;
  }
}

/**
 * Sample N particle positions from a vertex set.
 * If targetCount > vertexCount, particles are distributed with jitter.
 * If targetCount <= vertexCount, uniform subsample.
 * Returns 2D positions (X, Y) mapped from 3D (X, Y) with configurable scale.
 */
export function sampleVerticesForParticles(
  data: VertexData,
  targetCount: number,
  scaleX: number,
  scaleY: number,
): { homeX: Float32Array; homeY: Float32Array } {
  const homeX = new Float32Array(targetCount);
  const homeY = new Float32Array(targetCount);

  const { positions, vertexCount, bounds } = data;
  const centerX = (bounds.maxX + bounds.minX) / 2;
  const centerY = (bounds.maxY + bounds.minY) / 2;
  const height = bounds.maxY - bounds.minY;
  const normScale = height > 0 ? 1 / height : 1;

  for (let i = 0; i < targetCount; i++) {
    // Pick a vertex (with wrapping + jitter for oversampling)
    const baseIdx = i % vertexCount;
    const x3d = positions[baseIdx * 3];
    const y3d = positions[baseIdx * 3 + 1];

    // Normalize to [-0.5, 0.5] centered, then scale
    const nx = (x3d - centerX) * normScale;
    const ny = -(y3d - centerY) * normScale; // flip Y (3D Y-up -> 2D Y-down)

    // Add small jitter for particles that share vertices
    const jitter = i >= vertexCount ? (Math.random() - 0.5) * 0.02 : 0;

    homeX[i] = nx * scaleX + jitter * scaleX;
    homeY[i] = ny * scaleY + jitter * scaleY;
  }

  return { homeX, homeY };
}
