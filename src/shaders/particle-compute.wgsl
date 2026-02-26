// !Fnlloyd GPU Particle Compute Shader
// Simulates fluid-like particle movement with spring forces,
// interference patterns, and breathe animation.
// Each particle has: position (xy), velocity (xy), home position (xy), color blend, size, life

struct Params {
    target_x: f32,
    target_y: f32,
    time: f32,
    delta_time: f32,
    breathe_speed: f32,
    breathe_amount: f32,
    spring_force: f32,
    damping: f32,
    combo_glow: f32,
    particle_count: u32,
    canvas_w: f32,
    canvas_h: f32,
}

struct Particle {
    pos_x: f32,
    pos_y: f32,
    vel_x: f32,
    vel_y: f32,
    home_x: f32,
    home_y: f32,
    color_blend: f32,  // 0 = gold, 1 = cyan
    size: f32,
    life: f32,
    phase: f32,        // interference pattern phase offset
}

@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var<storage, read_write> particles: array<Particle>;

@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
    let idx = id.x;
    if (idx >= params.particle_count) { return; }

    var p = particles[idx];

    // Breathe animation — sinusoidal displacement
    let breathe = sin(params.time * params.breathe_speed + p.phase) * params.breathe_amount;

    // Target = paddle/character position + particle's home offset + breathe
    let tx = params.target_x + p.home_x;
    let ty = params.target_y - 20.0 + p.home_y + breathe;

    // Spring force toward target
    let dx = tx - p.pos_x;
    let dy = ty - p.pos_y;
    p.vel_x += dx * params.spring_force;
    p.vel_y += dy * params.spring_force;

    // Damping
    p.vel_x *= params.damping;
    p.vel_y *= params.damping;

    // Interference pattern — subtle orbital perturbation
    let interference = sin(params.time * 3.0 + p.phase * 6.28318) * 0.3;
    p.vel_x += interference * cos(p.phase * 12.56636);
    p.vel_y += interference * sin(p.phase * 12.56636);

    // Integrate position
    p.pos_x += p.vel_x;
    p.pos_y += p.vel_y;

    // Color pulsing — shifts between gold and cyan based on combo
    let color_pulse = sin(params.time * 2.0 + p.phase * 3.14159) * 0.5 + 0.5;
    p.color_blend = mix(p.color_blend, color_pulse, params.combo_glow * 0.1);

    // Size pulsing
    let size_pulse = 1.0 + sin(params.time * 1.5 + p.phase * 4.0) * 0.15;
    p.size = max(0.5, p.size * size_pulse);

    particles[idx] = p;
}
