/**
 * Hero Animation — ScholarSearch Indonesia
 * ──────────────────────────────────────────
 * Themed for an academic paper search engine:
 *   • Knowledge-network particle mesh (citation graph style)
 *   • Floating academic icons (documents, books, magnifying glass)
 *   • Mouse-interactive — nodes orbit & connect to cursor
 *   • Color palette matched to project's design system
 *   • Typing animation cycling project-relevant phrases
 *
 * Design tokens used:
 *   --accent: #2563eb  (primary blue)
 *   --text-link: #60a5fa  (light blue)
 *   --bg: #0a0a0a → #050510 (deep dark)
 */

(function () {
  'use strict';

  // ═══════════════════════════════════════════
  //  CONFIG — matches ScholarSearch ID palette
  // ═══════════════════════════════════════════

  // Project accent colors (from style.css :root)
  const ACCENT      = { r: 37,  g: 99,  b: 235 };  // #2563eb
  const ACCENT_LT   = { r: 96,  g: 165, b: 250 };  // #60a5fa
  const CYAN        = { r: 34,  g: 211, b: 238 };  // #22d3ee
  const INDIGO      = { r: 99,  g: 102, b: 241 };  // #6366f1
  const EMERALD     = { r: 52,  g: 211, b: 153 };  // #34d399

  const NODE_COLORS = [ACCENT, ACCENT_LT, CYAN, INDIGO, EMERALD];

  // Phrase themes — each phrase gets its own accent color
  const PHRASE_THEMES = [
    {
      text: 'ScholarSearch Indonesia',
      color: '#60a5fa',                        // sky blue
      glow: 'rgba(96,165,250,',
      hue: 215,
    },
    {
      text: 'Jurnal Teknik Informatika',
      color: '#34d399',                        // emerald green
      glow: 'rgba(52,211,153,',
      hue: 160,
    },
  ];

  const PARTICLE_COUNT = 70;
  const CONNECT_DIST   = 170;
  const MOUSE_ATTRACT  = 280;
  const MOUSE_REPEL    = 55;

  // ═══════════════════════════════════════════
  //  CANVAS SETUP
  // ═══════════════════════════════════════════

  const canvas = document.getElementById('hero-bg-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const glowEl = document.getElementById('hero-mouse-glow');
  const heroEl = document.getElementById('hero');

  let W, H;
  let mouse = { x: -9999, y: -9999, active: false };
  let currentHue = PHRASE_THEMES[0].hue;
  let targetHue  = PHRASE_THEMES[0].hue;

  function resize() {
    W = canvas.width  = heroEl.offsetWidth;
    H = canvas.height = heroEl.offsetHeight;
  }
  resize();

  // ── Mouse tracking ──
  heroEl.addEventListener('mousemove', (e) => {
    const r = heroEl.getBoundingClientRect();
    mouse.x = e.clientX - r.left;
    mouse.y = e.clientY - r.top;
    mouse.active = true;
    if (glowEl) {
      glowEl.style.left = (mouse.x - 250) + 'px';
      glowEl.style.top  = (mouse.y - 250) + 'px';
      glowEl.style.opacity = '0.18';
    }
  });
  heroEl.addEventListener('mouseleave', () => {
    mouse.active = false;
    if (glowEl) glowEl.style.opacity = '0';
  });

  // ═══════════════════════════════════════════
  //  KNOWLEDGE-NODE PARTICLE
  // ═══════════════════════════════════════════

  class KnowledgeNode {
    constructor() { this.spawn(); }

    spawn() {
      this.x  = Math.random() * W;
      this.y  = Math.random() * H;
      this.vx = (Math.random() - 0.5) * 0.5;
      this.vy = (Math.random() - 0.5) * 0.5;
      this.baseR = Math.random() * 2.5 + 1;
      this.r  = this.baseR;
      const c = NODE_COLORS[Math.floor(Math.random() * NODE_COLORS.length)];
      this.cr = c.r; this.cg = c.g; this.cb = c.b;
      this.alpha = Math.random() * 0.45 + 0.2;
      this.phase = Math.random() * Math.PI * 2;
    }

    update(t) {
      // Gentle pulse
      this.r = this.baseR + Math.sin(t * 0.012 + this.phase) * 0.5;

      if (mouse.active) {
        const dx = mouse.x - this.x;
        const dy = mouse.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < MOUSE_REPEL && dist > 0) {
          // Push away if too close
          const f = (MOUSE_REPEL - dist) / MOUSE_REPEL * 2;
          this.vx -= (dx / dist) * f * 0.15;
          this.vy -= (dy / dist) * f * 0.15;
        } else if (dist < MOUSE_ATTRACT) {
          // Softly attract — orbit-like
          const f = (MOUSE_ATTRACT - dist) / MOUSE_ATTRACT;
          this.vx += (dx / dist) * f * 0.035;
          this.vy += (dy / dist) * f * 0.035;
          // Slight tangential force for orbital motion
          this.vx += (-dy / dist) * f * 0.012;
          this.vy += (dx / dist) * f * 0.012;
        }

        // Brightness boost near mouse
        if (dist < MOUSE_ATTRACT) {
          this.alpha = Math.min(0.95, 0.2 + (1 - dist / MOUSE_ATTRACT) * 0.75);
        } else {
          this.alpha += (0.3 - this.alpha) * 0.02;
        }
      } else {
        this.alpha += (0.3 - this.alpha) * 0.02;
      }

      // Damping
      this.vx *= 0.988;
      this.vy *= 0.988;
      this.x += this.vx;
      this.y += this.vy;

      // Wrap
      if (this.x < -30) this.x = W + 30;
      if (this.x > W + 30) this.x = -30;
      if (this.y < -30) this.y = H + 30;
      if (this.y > H + 30) this.y = -30;
    }

    draw() {
      // Outer glow
      const g = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.r * 5);
      g.addColorStop(0, `rgba(${this.cr},${this.cg},${this.cb},${this.alpha * 0.3})`);
      g.addColorStop(1, 'transparent');
      ctx.beginPath();
      ctx.fillStyle = g;
      ctx.arc(this.x, this.y, this.r * 5, 0, Math.PI * 2);
      ctx.fill();

      // Core
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${this.cr},${this.cg},${this.cb},${this.alpha})`;
      ctx.fill();
    }
  }

  // ═══════════════════════════════════════════
  //  FLOATING ACADEMIC ICONS (SVG-path on canvas)
  // ═══════════════════════════════════════════

  const ICON_PATHS = [
    // Document / paper icon
    (ctx, s) => {
      ctx.beginPath();
      ctx.moveTo(-s * 0.4, -s * 0.5);
      ctx.lineTo(s * 0.15, -s * 0.5);
      ctx.lineTo(s * 0.4, -s * 0.25);
      ctx.lineTo(s * 0.4, s * 0.5);
      ctx.lineTo(-s * 0.4, s * 0.5);
      ctx.closePath();
      ctx.stroke();
      // fold corner
      ctx.beginPath();
      ctx.moveTo(s * 0.15, -s * 0.5);
      ctx.lineTo(s * 0.15, -s * 0.25);
      ctx.lineTo(s * 0.4, -s * 0.25);
      ctx.stroke();
      // text lines
      for (let i = 0; i < 3; i++) {
        const y = -s * 0.1 + i * s * 0.2;
        ctx.beginPath();
        ctx.moveTo(-s * 0.25, y);
        ctx.lineTo(s * 0.25, y);
        ctx.stroke();
      }
    },
    // Magnifying glass / search
    (ctx, s) => {
      ctx.beginPath();
      ctx.arc(-s * 0.08, -s * 0.08, s * 0.3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(s * 0.14, s * 0.14);
      ctx.lineTo(s * 0.45, s * 0.45);
      ctx.stroke();
    },
    // Book
    (ctx, s) => {
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.45);
      ctx.quadraticCurveTo(-s * 0.5, -s * 0.4, -s * 0.5, s * 0.35);
      ctx.lineTo(0, s * 0.45);
      ctx.lineTo(s * 0.5, s * 0.35);
      ctx.quadraticCurveTo(s * 0.5, -s * 0.4, 0, -s * 0.45);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.45);
      ctx.lineTo(0, s * 0.45);
      ctx.stroke();
    },
    // Graduation cap
    (ctx, s) => {
      ctx.beginPath();
      ctx.moveTo(-s * 0.5, 0);
      ctx.lineTo(0, -s * 0.3);
      ctx.lineTo(s * 0.5, 0);
      ctx.lineTo(0, s * 0.15);
      ctx.closePath();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-s * 0.25, s * 0.08);
      ctx.lineTo(-s * 0.25, s * 0.35);
      ctx.lineTo(0, s * 0.45);
      ctx.lineTo(s * 0.25, s * 0.35);
      ctx.lineTo(s * 0.25, s * 0.08);
      ctx.stroke();
    },
    // Citation / link chain
    (ctx, s) => {
      ctx.beginPath();
      ctx.arc(-s * 0.15, -s * 0.1, s * 0.2, -Math.PI * 0.7, Math.PI * 0.3);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(s * 0.15, s * 0.1, s * 0.2, Math.PI * 0.3, Math.PI * 1.3);
      ctx.stroke();
    },
  ];

  class FloatingIcon {
    constructor() {
      this.x = Math.random() * W;
      this.y = Math.random() * H;
      this.vx = (Math.random() - 0.5) * 0.25;
      this.vy = (Math.random() - 0.5) * 0.25;
      this.size = Math.random() * 16 + 14;
      this.rot = Math.random() * Math.PI * 2;
      this.rotSpeed = (Math.random() - 0.5) * 0.003;
      this.iconIdx = Math.floor(Math.random() * ICON_PATHS.length);
      const c = NODE_COLORS[Math.floor(Math.random() * NODE_COLORS.length)];
      this.cr = c.r; this.cg = c.g; this.cb = c.b;
      this.alpha = Math.random() * 0.12 + 0.05;
      this.baseAlpha = this.alpha;
    }

    update(t) {
      this.rot += this.rotSpeed;
      // Gentle float
      this.x += this.vx + Math.sin(t * 0.005 + this.rot) * 0.1;
      this.y += this.vy + Math.cos(t * 0.004 + this.rot) * 0.08;

      // Mouse proximity → brighten
      if (mouse.active) {
        const dx = mouse.x - this.x;
        const dy = mouse.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 200) {
          this.alpha = this.baseAlpha + (1 - dist / 200) * 0.2;
          // Gentle push
          this.vx -= (dx / dist) * 0.03;
          this.vy -= (dy / dist) * 0.03;
        } else {
          this.alpha += (this.baseAlpha - this.alpha) * 0.03;
        }
      } else {
        this.alpha += (this.baseAlpha - this.alpha) * 0.03;
      }

      this.vx *= 0.995;
      this.vy *= 0.995;

      // Wrap
      if (this.x < -50) this.x = W + 50;
      if (this.x > W + 50) this.x = -50;
      if (this.y < -50) this.y = H + 50;
      if (this.y > H + 50) this.y = -50;
    }

    draw() {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rot);
      ctx.strokeStyle = `rgba(${this.cr},${this.cg},${this.cb},${this.alpha})`;
      ctx.lineWidth = 1.2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ICON_PATHS[this.iconIdx](ctx, this.size);
      ctx.restore();
    }
  }

  // ═══════════════════════════════════════════
  //  CONNECTIONS (citation-graph style)
  // ═══════════════════════════════════════════

  function drawConnections(nodes) {
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < CONNECT_DIST) {
          const a = (1 - dist / CONNECT_DIST) * 0.12;
          const grad = ctx.createLinearGradient(
            nodes[i].x, nodes[i].y, nodes[j].x, nodes[j].y
          );
          grad.addColorStop(0, `rgba(${nodes[i].cr},${nodes[i].cg},${nodes[i].cb},${a})`);
          grad.addColorStop(1, `rgba(${nodes[j].cr},${nodes[j].cg},${nodes[j].cb},${a})`);
          ctx.beginPath();
          ctx.strokeStyle = grad;
          ctx.lineWidth = 0.7;
          ctx.moveTo(nodes[i].x, nodes[i].y);
          ctx.lineTo(nodes[j].x, nodes[j].y);
          ctx.stroke();
        }
      }
    }

    // Mouse → node connections
    if (mouse.active) {
      nodes.forEach(p => {
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < MOUSE_ATTRACT * 0.6) {
          const a = (1 - dist / (MOUSE_ATTRACT * 0.6)) * 0.22;
          ctx.beginPath();
          ctx.strokeStyle = `rgba(${ACCENT_LT.r},${ACCENT_LT.g},${ACCENT_LT.b},${a})`;
          ctx.lineWidth = 0.9;
          ctx.moveTo(mouse.x, mouse.y);
          ctx.lineTo(p.x, p.y);
          ctx.stroke();
        }
      });
    }
  }

  // ═══════════════════════════════════════════
  //  MOUSE CURSOR RINGS (search-ripple effect)
  // ═══════════════════════════════════════════

  function drawMouseRings(t) {
    if (!mouse.active) return;

    // Pulsing rings — like a search signal
    const baseR = 35;
    for (let i = 0; i < 3; i++) {
      const phase = t * 0.025 + i * (Math.PI * 2 / 3);
      const expand = (Math.sin(phase) + 1) * 0.5; // 0-1
      const r = baseR + i * 35 + expand * 15;
      const a = 0.12 - i * 0.035;
      ctx.beginPath();
      ctx.arc(mouse.x, mouse.y, r, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${ACCENT_LT.r},${ACCENT_LT.g},${ACCENT_LT.b},${Math.max(0.02, a)})`;
      ctx.lineWidth = 1.2 - i * 0.3;
      ctx.stroke();
    }

    // Center dot
    ctx.beginPath();
    ctx.arc(mouse.x, mouse.y, 3, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${ACCENT_LT.r},${ACCENT_LT.g},${ACCENT_LT.b},0.4)`;
    ctx.fill();
  }

  // ═══════════════════════════════════════════
  //  TWINKLING STARS (depth layer)
  // ═══════════════════════════════════════════

  const stars = [];
  function initStars() {
    stars.length = 0;
    for (let i = 0; i < 100; i++) {
      stars.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: Math.random() * 0.9 + 0.2,
        a: Math.random() * 0.35 + 0.08,
        speed: Math.random() * 0.018 + 0.004,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }
  initStars();

  function drawStars(t) {
    stars.forEach(s => {
      const a = s.a + Math.sin(t * s.speed + s.phase) * 0.12;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(180,200,240,${Math.max(0.03, a)})`;
      ctx.fill();
    });
  }

  // ═══════════════════════════════════════════
  //  AMBIENT GLOW ORBS (soft bokeh)
  // ═══════════════════════════════════════════

  class AmbientOrb {
    constructor() {
      this.x = Math.random() * W;
      this.y = Math.random() * H;
      this.radius = Math.random() * 140 + 80;
      const c = NODE_COLORS[Math.floor(Math.random() * NODE_COLORS.length)];
      this.cr = c.r; this.cg = c.g; this.cb = c.b;
      this.vx = (Math.random() - 0.5) * 0.2;
      this.vy = (Math.random() - 0.5) * 0.2;
      this.alpha = Math.random() * 0.04 + 0.02;
    }
    update() {
      this.x += this.vx;
      this.y += this.vy;
      if (this.x < -this.radius) this.x = W + this.radius;
      if (this.x > W + this.radius) this.x = -this.radius;
      if (this.y < -this.radius) this.y = H + this.radius;
      if (this.y > H + this.radius) this.y = -this.radius;
    }
    draw() {
      const g = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius);
      g.addColorStop(0, `rgba(${this.cr},${this.cg},${this.cb},${this.alpha})`);
      g.addColorStop(1, 'transparent');
      ctx.beginPath();
      ctx.fillStyle = g;
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ═══════════════════════════════════════════
  //  INITIALIZE ALL LAYERS
  // ═══════════════════════════════════════════

  const nodes = [];
  for (let i = 0; i < PARTICLE_COUNT; i++) nodes.push(new KnowledgeNode());

  const icons = [];
  for (let i = 0; i < 12; i++) icons.push(new FloatingIcon());

  const orbs = [];
  for (let i = 0; i < 4; i++) orbs.push(new AmbientOrb());

  // ═══════════════════════════════════════════
  //  RENDER LOOP
  // ═══════════════════════════════════════════

  let t = 0;

  function animate() {
    t++;
    // Smooth hue transition for glow element
    currentHue += (targetHue - currentHue) * 0.012;

    ctx.clearRect(0, 0, W, H);

    // L1 — Stars
    drawStars(t);

    // L2 — Ambient orbs
    orbs.forEach(o => { o.update(); o.draw(); });

    // L3 — Floating academic icons
    icons.forEach(ic => { ic.update(t); ic.draw(); });

    // L4 — Connections
    drawConnections(nodes);

    // L5 — Knowledge nodes
    nodes.forEach(n => { n.update(t); n.draw(); });

    // L6 — Mouse rings
    drawMouseRings(t);

    requestAnimationFrame(animate);
  }
  animate();

  // Resize
  let rTimer;
  window.addEventListener('resize', () => {
    clearTimeout(rTimer);
    rTimer = setTimeout(() => {
      resize();
      initStars();
      nodes.forEach(n => {
        if (n.x > W) n.x = Math.random() * W;
        if (n.y > H) n.y = Math.random() * H;
      });
    }, 200);
  });


  // ═══════════════════════════════════════════
  //  TYPING ANIMATION WITH DYNAMIC COLORS
  // ═══════════════════════════════════════════

  const typingEl = document.getElementById('typing-text');
  const cursorEl = document.getElementById('typing-cursor');
  if (!typingEl) return;

  const TYPE_SPEED       = 85;
  const DELETE_SPEED     = 45;
  const PAUSE_AFTER_TYPE = 2800;
  const PAUSE_AFTER_DEL  = 600;

  let phraseIdx = 0;
  let charIdx   = 0;
  let deleting  = false;

  function applyColor(idx) {
    const theme = PHRASE_THEMES[idx];
    typingEl.style.color = theme.color;
    typingEl.style.textShadow =
      `0 0 30px ${theme.glow}0.35), 0 0 60px ${theme.glow}0.15), 0 0 100px ${theme.glow}0.08)`;
    if (cursorEl) {
      cursorEl.style.color = theme.color;
      cursorEl.style.textShadow = `0 0 14px ${theme.glow}0.55)`;
    }
    // Shift ambient hue
    targetHue = theme.hue;
    // Shift mouse glow
    if (glowEl) {
      glowEl.style.background =
        `radial-gradient(circle, hsla(${theme.hue},70%,55%,0.45) 0%, hsla(${theme.hue},60%,40%,0.2) 40%, transparent 70%)`;
    }
  }

  applyColor(0);

  function typeStep() {
    const phrase = PHRASE_THEMES[phraseIdx].text;

    if (!deleting) {
      charIdx++;
      typingEl.textContent = phrase.substring(0, charIdx);

      if (charIdx === phrase.length) {
        deleting = true;
        setTimeout(typeStep, PAUSE_AFTER_TYPE);
        return;
      }
      setTimeout(typeStep, TYPE_SPEED);
    } else {
      charIdx--;
      typingEl.textContent = phrase.substring(0, charIdx);

      if (charIdx === 0) {
        deleting = false;
        phraseIdx = (phraseIdx + 1) % PHRASE_THEMES.length;
        applyColor(phraseIdx);
        setTimeout(typeStep, PAUSE_AFTER_DEL);
        return;
      }
      setTimeout(typeStep, DELETE_SPEED);
    }
  }

  setTimeout(typeStep, 600);

})();
