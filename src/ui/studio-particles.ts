// !Fnlloyd STUDIO — Particles.js layer manager
// Encapsulates the particles.js library lifecycle: load → spawn → respawn → destroy

export interface PjsConfig {
  count: number;
  color: string;
  lines: boolean;
  attract: boolean;
  particleSize: number;
  particleOpacity: number;
}

export class StudioParticles {
  private pjsLoaded = false;
  readonly config: PjsConfig;

  constructor(
    private container: HTMLDivElement,
    initialConfig?: Partial<PjsConfig>,
  ) {
    this.config = {
      count: 120,
      color: '#C5A028',
      lines: true,
      attract: true,
      particleSize: 3,
      particleOpacity: 0.7,
      ...initialConfig,
    };
  }

  /** Load particles.min.js from /libs, then auto-spawn */
  boot() {
    const script = document.createElement('script');
    script.src = '/libs/particles.min.js';
    script.onload = () => {
      this.pjsLoaded = true;
      this.spawn();
      console.log('✅ particles.js loaded and running');
    };
    document.head.appendChild(script);
  }

  /** Spawn (or re-spawn) particles into the container */
  spawn() {
    if (!this.pjsLoaded) return;
    const pjs = (window as any).particlesJS;
    if (!pjs) return;
    const cfg = this.config;
    pjs(this.container.id, {
      particles: {
        number: { value: cfg.count, density: { enable: true, value_area: 800 } },
        color: { value: cfg.color },
        shape: { type: 'circle' },
        opacity: { value: cfg.particleOpacity, random: true, anim: { enable: true, speed: 1, opacity_min: Math.max(0.05, cfg.particleOpacity * 0.15), sync: false } },
        size: { value: cfg.particleSize, random: true, anim: { enable: false } },
        line_linked: {
          enable: cfg.lines, distance: 150,
          color: cfg.color, opacity: 0.4, width: 1,
        },
        move: {
          enable: true, speed: 2, direction: 'none', random: true,
          straight: false, out_mode: 'out', bounce: false,
          attract: { enable: cfg.attract, rotateX: 600, rotateY: 1200 },
        },
      },
      interactivity: {
        detect_on: 'canvas',
        events: {
          onhover: { enable: true, mode: 'grab' },
          onclick: { enable: true, mode: 'push' },
          resize: true,
        },
        modes: {
          grab: { distance: 200, line_linked: { opacity: 1 } },
          push: { particles_nb: 4 },
          remove: { particles_nb: 2 },
        },
      },
      retina_detect: true,
    });
  }

  /** Destroy current instance and respawn with patched config */
  respawn(patch: Partial<PjsConfig>) {
    Object.assign(this.config, patch);
    // particles.js has no live-update API; destroy and respawn
    if (Array.isArray((window as any).pJSDom)) {
      const pjsWindow = (window as any).pJSDom;
      if (pjsWindow && pjsWindow.length > 0) {
        try { pjsWindow[pjsWindow.length - 1]?.pJS?.fn?.vendors?.destroypJS?.(); } catch (_) {}
        (window as any).pJSDom = [];
      }
    }
    // Remove ghost canvases left behind by the old instance
    this.container.querySelectorAll('canvas.particles-js-canvas-el').forEach(c => c.remove());
    this.spawn();
  }
}
