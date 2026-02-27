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
    try {
      console.log('🎨 StudioParticles.boot() — loading particles.js library');

      const script = document.createElement('script');
      script.src = '/libs/particles.min.js';

      script.onload = () => {
        try {
          this.pjsLoaded = true;
          console.log('📥 particles.js script loaded, spawning...');
          this.spawn();
          console.log('✅ particles.js loaded and running');
        } catch (error) {
          console.error('❌ StudioParticles.boot() — onload handler failed:', error);
        }
      };

      script.onerror = (error) => {
        console.error('❌ CRITICAL: StudioParticles.boot() — Failed to load particles.js script:', error);
      };

      document.head.appendChild(script);
      console.log('📤 particles.js script tag injected');
    } catch (error) {
      console.error('❌ CRITICAL: StudioParticles.boot() failed:', error);
    }
  }

  /** Spawn (or re-spawn) particles into the container */
  spawn() {
    try {
      if (!this.pjsLoaded) {
        console.warn('⚠️ StudioParticles.spawn() — particles.js not loaded yet');
        return;
      }

      const pjs = (window as any).particlesJS;
      if (!pjs) {
        console.error('❌ StudioParticles.spawn() — particlesJS function not found on window');
        return;
      }

      const container = this.container;
      if (!container) {
        console.error('❌ StudioParticles.spawn() — Container element not found');
        return;
      }

      // Force a layout recalculation to ensure styles are applied
      void container.offsetHeight;

      const cfg = this.config;
      console.log(`🎨 StudioParticles.spawn() — spawning ${cfg.count} particles`);

      pjs(container.id, {
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
            resize: false,
          },
          modes: {
            grab: { distance: 200, line_linked: { opacity: 1 } },
            push: { particles_nb: 4 },
            remove: { particles_nb: 2 },
          },
        },
        retina_detect: false,
      });

      // Fix canvas styles once particles.js creates it
      const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          if (mutation.type === 'childList') {
            for (const node of mutation.addedNodes) {
              if (node instanceof HTMLCanvasElement && node.classList.contains('particles-js-canvas-el')) {
                console.log('🔍 MutationObserver detected particles.js canvas creation');
                this.fixCanvasStyles(node);
                observer.disconnect();
                return;
              }
            }
          }
        }
      });

      observer.observe(container, { childList: true, subtree: true });

      // Fallback timeout
      setTimeout(() => {
        observer.disconnect();
        const canvas = container.querySelector('canvas.particles-js-canvas-el') as HTMLCanvasElement | null;
        if (canvas) {
          this.fixCanvasStyles(canvas);
          console.log('✅ Particles.js canvas finalized (fallback)');
        }
      }, 500);

      console.log('✅ StudioParticles.spawn() completed successfully');
    } catch (error) {
      console.error('❌ StudioParticles.spawn() failed:', error);
    }
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
    this.spawn();
  }

  private fixCanvasStyles(canvas: HTMLCanvasElement) {
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.position = 'absolute';
    canvas.style.left = '0';
    canvas.style.top = '0';
    Object.assign(canvas.style, {
      transform: 'translate3d(0,0,0)',
      willChange: 'auto',
      backfaceVisibility: 'hidden',
      touchAction: 'none',
    });
  }
}
