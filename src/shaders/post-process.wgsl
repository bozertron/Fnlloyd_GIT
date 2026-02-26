// !Fnlloyd Post-Processing Shader
// Bloom, neon glow, chromatic aberration, vignette
// Applied as a full-screen pass over the composited scene

struct PostParams {
    canvas_w: f32,
    canvas_h: f32,
    time: f32,
    bloom_intensity: f32,
    chromatic_strength: f32,
    vignette_strength: f32,
    shake_x: f32,
    shake_y: f32,
}

@group(0) @binding(0) var<uniform> params: PostParams;
@group(0) @binding(1) var scene_texture: texture_2d<f32>;
@group(0) @binding(2) var scene_sampler: sampler;

struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) uv: vec2<f32>,
}

@vertex
fn vs_main(@builtin(vertex_index) idx: u32) -> VertexOutput {
    // Full-screen triangle
    var positions = array<vec2<f32>, 3>(
        vec2(-1.0, -1.0), vec2(3.0, -1.0), vec2(-1.0, 3.0),
    );
    var uvs = array<vec2<f32>, 3>(
        vec2(0.0, 1.0), vec2(2.0, 1.0), vec2(0.0, -1.0),
    );

    var out: VertexOutput;
    out.position = vec4(positions[idx], 0.0, 1.0);
    out.uv = uvs[idx];
    return out;
}

// Simple box blur for bloom
fn blur_sample(uv: vec2<f32>, offset: vec2<f32>) -> vec3<f32> {
    let pixel = vec2(1.0 / params.canvas_w, 1.0 / params.canvas_h);
    var color = vec3(0.0);
    for (var y = -2; y <= 2; y++) {
        for (var x = -2; x <= 2; x++) {
            let sample_uv = uv + offset + vec2(f32(x), f32(y)) * pixel * 2.0;
            color += textureSample(scene_texture, scene_sampler, sample_uv).rgb;
        }
    }
    return color / 25.0;
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
    let uv = in.uv + vec2(params.shake_x, params.shake_y) / vec2(params.canvas_w, params.canvas_h);

    // Chromatic aberration
    let ca = params.chromatic_strength * 0.003;
    let r = textureSample(scene_texture, scene_sampler, uv + vec2(ca, 0.0)).r;
    let g = textureSample(scene_texture, scene_sampler, uv).g;
    let b = textureSample(scene_texture, scene_sampler, uv - vec2(ca, 0.0)).b;
    var color = vec3(r, g, b);

    // Bloom (additive glow from bright areas)
    let bloom = blur_sample(uv, vec2(0.0));
    let brightness = dot(bloom, vec3(0.299, 0.587, 0.114));
    let bloom_mask = max(vec3(0.0), bloom - vec3(0.4)); // only bright areas
    color += bloom_mask * params.bloom_intensity;

    // Vignette
    let vignette_dist = length(uv - vec2(0.5)) * 1.4;
    let vignette = 1.0 - vignette_dist * vignette_dist * params.vignette_strength;
    color *= max(vignette, 0.0);

    // Subtle scanlines
    let scanline = sin(in.uv.y * params.canvas_h * 1.5) * 0.03 + 0.97;
    color *= scanline;

    return vec4(color, 1.0);
}
