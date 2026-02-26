// !Fnlloyd GPU Particle Render Shader
// Renders particles as point sprites with color blending and glow

struct Uniforms {
    canvas_w: f32,
    canvas_h: f32,
    time: f32,
    combo_glow: f32,
}

struct Particle {
    pos_x: f32,
    pos_y: f32,
    vel_x: f32,
    vel_y: f32,
    home_x: f32,
    home_y: f32,
    color_blend: f32,
    size: f32,
    life: f32,
    phase: f32,
}

struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) color: vec4<f32>,
    @location(1) point_coord: vec2<f32>,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<storage, read> particles: array<Particle>;

// Gold: (1.0, 0.75, 0.07)  Cyan: (0.0, 0.83, 1.0)
const GOLD = vec3<f32>(1.0, 0.75, 0.07);
const CYAN = vec3<f32>(0.0, 0.83, 1.0);

@vertex
fn vs_main(
    @builtin(vertex_index) vertex_idx: u32,
    @builtin(instance_index) instance_idx: u32,
) -> VertexOutput {
    let p = particles[instance_idx];

    // Quad vertices (2 triangles = 6 vertices per particle)
    var quad = array<vec2<f32>, 6>(
        vec2(-1.0, -1.0), vec2(1.0, -1.0), vec2(-1.0, 1.0),
        vec2(1.0, -1.0), vec2(1.0, 1.0), vec2(-1.0, 1.0),
    );
    let vert = quad[vertex_idx];

    // Particle screen position (pixel coords to NDC)
    let px = (p.pos_x / uniforms.canvas_w) * 2.0 - 1.0;
    let py = -((p.pos_y / uniforms.canvas_h) * 2.0 - 1.0); // flip Y

    // Size in NDC
    let sx = (p.size * 3.0) / uniforms.canvas_w;
    let sy = (p.size * 3.0) / uniforms.canvas_h;

    var out: VertexOutput;
    out.position = vec4(px + vert.x * sx, py + vert.y * sy, 0.0, 1.0);
    out.point_coord = vert * 0.5 + 0.5;

    // Blend between gold and cyan
    let base_color = mix(GOLD, CYAN, p.color_blend);
    let glow_boost = 1.0 + uniforms.combo_glow * 0.3;
    out.color = vec4(base_color * glow_boost, p.life);

    return out;
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
    // Soft circle falloff
    let dist = length(in.point_coord - vec2(0.5));
    if (dist > 0.5) { discard; }

    let alpha = (1.0 - dist * 2.0) * in.color.a;
    let glow = exp(-dist * 4.0) * 0.5;

    return vec4(in.color.rgb * (alpha + glow), alpha);
}
