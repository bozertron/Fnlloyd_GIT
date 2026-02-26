// !Fnlloyd Background Shader
// Synthwave grid, parallax starfield, Earth visualization
// Rendered as a full-screen pass

struct BgParams {
    canvas_w: f32,
    canvas_h: f32,
    time: f32,
    earth_health: f32,    // 0-100
    camera_scale: f32,
    camera_y: f32,
}

struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) uv: vec2<f32>,
}

@group(0) @binding(0) var<uniform> params: BgParams;

@vertex
fn vs_main(@builtin(vertex_index) idx: u32) -> VertexOutput {
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

// Pseudo-random hash
fn hash(p: vec2<f32>) -> f32 {
    let h = dot(p, vec2(127.1, 311.7));
    return fract(sin(h) * 43758.5453);
}

// Smooth noise
fn noise(p: vec2<f32>) -> f32 {
    let i = floor(p);
    let f = fract(p);
    let u = f * f * (3.0 - 2.0 * f);
    return mix(
        mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
        mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
        u.y
    );
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
    let uv = in.uv;
    let px = uv * vec2(params.canvas_w, params.canvas_h);

    // Base: void navy gradient
    let bg_top = vec3(0.02, 0.03, 0.08);
    let bg_bot = vec3(0.06, 0.04, 0.16);
    var color = mix(bg_top, bg_bot, uv.y);

    // Nebula clouds (purple/blue shifting)
    let nebula_uv = uv * 3.0 + vec2(params.time * 0.01, params.time * 0.005);
    let nebula = noise(nebula_uv) * noise(nebula_uv * 2.0 + 1.3);
    let nebula_color = mix(vec3(0.15, 0.05, 0.25), vec3(0.05, 0.1, 0.3), nebula);
    color += nebula_color * nebula * 0.15;

    // Parallax starfield (3 layers)
    for (var layer = 0; layer < 3; layer++) {
        let speed = f32(layer + 1) * 0.3;
        let density = 0.4 + f32(layer) * 0.2;
        let star_uv = uv * vec2(50.0 + f32(layer) * 30.0, 30.0 + f32(layer) * 20.0);
        star_uv.x += params.time * speed * 0.01;

        let star_cell = floor(star_uv);
        let star_hash = hash(star_cell + f32(layer) * 100.0);

        if (star_hash > density) {
            let star_pos = fract(star_uv);
            let star_center = vec2(hash(star_cell * 1.1 + f32(layer) * 50.0),
                                   hash(star_cell * 1.3 + f32(layer) * 70.0));
            let dist = length(star_pos - star_center);
            let star_size = 0.02 + star_hash * 0.03;
            let brightness = smoothstep(star_size, 0.0, dist);
            let twinkle = sin(params.time * (2.0 + star_hash * 5.0) + star_hash * 6.28) * 0.3 + 0.7;
            color += vec3(brightness * twinkle * (0.3 + f32(layer) * 0.2));
        }
    }

    // Synthwave grid (bottom half, perspective)
    if (uv.y > 0.6) {
        let grid_y = (uv.y - 0.6) / 0.4; // 0..1 from horizon to bottom
        let perspective = 1.0 / (grid_y + 0.01);
        let grid_x = (uv.x - 0.5) * perspective * 10.0;
        let grid_z = perspective * 5.0 + params.time * 0.5;

        let line_x = smoothstep(0.95, 1.0, abs(fract(grid_x) - 0.5) * 2.0);
        let line_z = smoothstep(0.95, 1.0, abs(fract(grid_z) - 0.5) * 2.0);
        let grid_line = max(line_x, line_z);

        let grid_fade = (1.0 - grid_y) * 0.5; // fade toward bottom
        let grid_color = vec3(0.0, 0.83, 1.0) * grid_line * grid_fade * 0.3;
        color += grid_color;
    }

    // Earth visualization (bottom center)
    let earth_center = vec2(0.5, 1.08); // slightly below screen
    let earth_radius = 0.17;
    let earth_dist = length(uv - earth_center);

    if (earth_dist < earth_radius + 0.06) {
        let health_norm = params.earth_health / 100.0;

        // Atmosphere glow
        if (earth_dist > earth_radius) {
            let glow_t = (earth_dist - earth_radius) / 0.06;
            let glow_color = mix(vec3(0.0, 0.83, 1.0), vec3(1.0, 0.2, 0.4), 1.0 - health_norm);
            let pulse = sin(params.time * 1.5) * 0.15 + 0.35;
            color += glow_color * (1.0 - glow_t) * pulse;
        }

        // Earth body
        if (earth_dist < earth_radius) {
            let earth_uv = (uv - earth_center) / earth_radius;
            let healthy_color = vec3(0.1, 0.35, 0.15);
            let damaged_color = vec3(0.35, 0.15, 0.05);
            let paved_color = vec3(0.2, 0.2, 0.2);

            var earth_col = mix(damaged_color, healthy_color, health_norm);
            if (health_norm < 0.1) { earth_col = mix(paved_color, earth_col, health_norm * 10.0); }

            // Cracks (procedural)
            if (health_norm < 0.8) {
                let crack_noise = noise(earth_uv * 8.0 + vec2(1.5, 2.7));
                let crack_thresh = 0.85 - (1.0 - health_norm) * 0.3;
                if (crack_noise > crack_thresh) {
                    let crack_color = mix(vec3(1.0, 0.4, 0.1), vec3(1.0, 0.2, 0.4), 1.0 - health_norm);
                    earth_col = mix(earth_col, crack_color, (crack_noise - crack_thresh) * 5.0);
                }
            }

            color = earth_col;
        }
    }

    return vec4(color, 1.0);
}
