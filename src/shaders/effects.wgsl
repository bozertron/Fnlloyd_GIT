// !Fnlloyd Special Effects Shader
// Black hole gravitational lensing, destruction FX particles,
// ball trail rendering, shield dome

// --- FX PARTICLE SYSTEM (explosions, trails, destruction) ---
// Uses same instanced quad approach as Fnlloyd particles but
// with different simulation: gravity, decay, random spread

struct FxParams {
    canvas_w: f32,
    canvas_h: f32,
    time: f32,
    gravity: f32,
    particle_count: u32,
    _pad0: f32,
    _pad1: f32,
    _pad2: f32,
}

struct FxParticle {
    pos_x: f32,
    pos_y: f32,
    vel_x: f32,
    vel_y: f32,
    color_r: f32,
    color_g: f32,
    color_b: f32,
    life: f32,
    decay: f32,
    size: f32,
    _pad0: f32,
    _pad1: f32,
}

@group(0) @binding(0) var<uniform> params: FxParams;
@group(0) @binding(1) var<storage, read_write> particles: array<FxParticle>;

// --- COMPUTE: Update FX particles ---
@compute @workgroup_size(256)
fn cs_update(@builtin(global_invocation_id) id: vec3<u32>) {
    let idx = id.x;
    if (idx >= params.particle_count) { return; }

    var p = particles[idx];
    if (p.life <= 0.0) { return; }

    // Gravity
    p.vel_y += params.gravity;

    // Integrate
    p.pos_x += p.vel_x;
    p.pos_y += p.vel_y;

    // Decay
    p.life -= p.decay;
    if (p.life < 0.0) { p.life = 0.0; }

    particles[idx] = p;
}

// --- RENDER: FX particle vertices ---
struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) color: vec4<f32>,
    @location(1) point_coord: vec2<f32>,
}

@vertex
fn vs_fx(
    @builtin(vertex_index) vertex_idx: u32,
    @builtin(instance_index) instance_idx: u32,
) -> VertexOutput {
    let p = particles[instance_idx];

    var quad = array<vec2<f32>, 6>(
        vec2(-1.0, -1.0), vec2(1.0, -1.0), vec2(-1.0, 1.0),
        vec2(1.0, -1.0), vec2(1.0, 1.0), vec2(-1.0, 1.0),
    );
    let vert = quad[vertex_idx];

    let px = (p.pos_x / params.canvas_w) * 2.0 - 1.0;
    let py = -((p.pos_y / params.canvas_h) * 2.0 - 1.0);
    let s = (p.size * p.life) / params.canvas_w;

    var out: VertexOutput;
    out.position = vec4(px + vert.x * s, py + vert.y * s, 0.0, 1.0);
    out.point_coord = vert * 0.5 + 0.5;
    out.color = vec4(p.color_r, p.color_g, p.color_b, p.life);
    return out;
}

@fragment
fn fs_fx(in: VertexOutput) -> @location(0) vec4<f32> {
    let dist = length(in.point_coord - vec2(0.5));
    if (dist > 0.5) { discard; }

    let alpha = (1.0 - dist * 2.0) * in.color.a;
    return vec4(in.color.rgb, alpha);
}

// --- BLACK HOLE LENSING ---
// This is a separate full-screen pass that warps the scene texture
// around active black hole ball positions

struct LensParams {
    canvas_w: f32,
    canvas_h: f32,
    hole_x: f32,
    hole_y: f32,
    hole_radius: f32,
    hole_strength: f32,
    time: f32,
    active: f32,
}

struct LensVertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) uv: vec2<f32>,
}

@group(1) @binding(0) var<uniform> lens_params: LensParams;
@group(1) @binding(1) var lens_texture: texture_2d<f32>;
@group(1) @binding(2) var lens_sampler: sampler;

@vertex
fn vs_lens(@builtin(vertex_index) idx: u32) -> LensVertexOutput {
    var positions = array<vec2<f32>, 3>(
        vec2(-1.0, -1.0), vec2(3.0, -1.0), vec2(-1.0, 3.0),
    );
    var uvs = array<vec2<f32>, 3>(
        vec2(0.0, 1.0), vec2(2.0, 1.0), vec2(0.0, -1.0),
    );

    var out: LensVertexOutput;
    out.position = vec4(positions[idx], 0.0, 1.0);
    out.uv = uvs[idx];
    return out;
}

@fragment
fn fs_lens(in: LensVertexOutput) -> @location(0) vec4<f32> {
    if (lens_params.active < 0.5) {
        return textureSample(lens_texture, lens_sampler, in.uv);
    }

    let uv = in.uv;
    let hole_uv = vec2(lens_params.hole_x / lens_params.canvas_w,
                       lens_params.hole_y / lens_params.canvas_h);

    let delta = uv - hole_uv;
    let dist = length(delta);
    let radius = lens_params.hole_radius / lens_params.canvas_w;

    if (dist < radius * 3.0 && dist > 0.001) {
        // Gravitational lensing: warp UVs toward the hole
        let strength = lens_params.hole_strength * (1.0 - smoothstep(0.0, radius * 3.0, dist));
        let angle = atan2(delta.y, delta.x);
        let warped_dist = dist + strength * (radius / dist) * 0.05;
        let spiral = angle + strength * 0.5 / (dist + 0.01);
        let warped_uv = hole_uv + vec2(cos(spiral), sin(spiral)) * warped_dist;

        // Accretion disk glow
        let ring_dist = abs(dist - radius * 1.5);
        let ring = smoothstep(radius * 0.4, 0.0, ring_dist);
        let ring_color = vec3(0.42, 0.36, 0.9) * ring * 0.5; // purple glow

        // Event horizon darkening
        let darkness = smoothstep(0.0, radius * 0.5, dist);

        var color = textureSample(lens_texture, lens_sampler, warped_uv).rgb;
        color = color * darkness + ring_color;
        return vec4(color, 1.0);
    }

    return textureSample(lens_texture, lens_sampler, uv);
}
