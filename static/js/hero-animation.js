/**
 * Hero Animation — ScholarSearch Indonesia
 * ──────────────────────────────────────────
 * Themed for an academic paper search engine:
 * • Knowledge-network particle mesh (citation graph style)
 * • Floating academic icons (documents, books, magnifying glass)
 * • Mouse-interactive — nodes orbit & connect to cursor
 * • Color palette matched to project's design system
 * • Typing animation cycling project-relevant phrases
 * • Splash Cursor — WebGL fluid simulation on mouse move
 */

(function () {
  'use strict';

  // ═══════════════════════════════════════════
  //  CONFIG — matches ScholarSearch ID palette
  // ═══════════════════════════════════════════

  // Inisialisasi variabel palet warna utama
  const ACCENT      = { r: 37,  g: 99,  b: 235 };
  const ACCENT_LT   = { r: 96,  g: 165, b: 250 };
  const CYAN        = { r: 34,  g: 211, b: 238 };
  const INDIGO      = { r: 99,  g: 102, b: 241 };
  const EMERALD     = { r: 52,  g: 211, b: 153 };

  const NODE_COLORS = [ACCENT, ACCENT_LT, CYAN, INDIGO, EMERALD];

  // Konfigurasi frase dan tema warna animasi teks
  const PHRASE_THEMES = [
    {
      text: 'Scholar Search Indonesia',
      color: '#60a5fa',
      glow: 'rgba(96,165,250,',
    },
    {
      text: 'Jurnal Teknik Informatika',
      color: '#34d3b3',
      glow: 'rgba(52,211,153,',
    },
  ];
  const TITLE_HOLD_MS = 3500;

  // ═══════════════════════════════════════════
  //  DECRYPTED TEXT + SHINY TEXT
  // ═══════════════════════════════════════════

  // Class Decryptor untuk mengatur efek teks acak (scramble)
  class Decryptor {
    constructor(element) {
      this.element = element;
      this.chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$*&%";
      this.queue = [];
      this.frame = 0;
      this.frameRequest = null;
    }

    setText(newText) {
      const oldText = this.element.innerText || '';
      const length = Math.max(oldText.length, newText.length);
      const promise = new Promise((resolve) => this.resolve = resolve);
      this.queue = [];
      for (let i = 0; i < length; i++) {
        const from = oldText[i] || '';
        const to = newText[i] || '';
        const start = Math.floor(Math.random() * 40);
        const end = start + Math.floor(Math.random() * 40);
        this.queue.push({ from, to, start, end, char: '' });
      }
      clearTimeout(this.frameRequest);
      this.frame = 0;
      this.update();
      return promise;
    }

    update() {
      let output = '';
      let complete = 0;
      for (let i = 0, n = this.queue.length; i < n; i++) {
        let { from, to, start, end, char } = this.queue[i];
        if (this.frame >= end) {
          complete++;
          output += to;
        } else if (this.frame >= start) {
          if (!char || Math.random() < 0.28) {
            char = this.randomChar();
            this.queue[i].char = char;
          }
          output += `<span class="scrambled-char">${char}</span>`;
        } else {
          output += from;
        }
      }
      this.element.innerHTML = output;
      if (complete === this.queue.length) {
        this.resolve();
      } else {
        this.frameRequest = setTimeout(this.update.bind(this), 16);
        this.frame++;
      }
    }

    randomChar() {
      return this.chars[Math.floor(Math.random() * this.chars.length)];
    }
  }

  function applyTitleTheme(element, theme) {
    element.style.setProperty('--theme-color', theme.color);
    element.style.setProperty('--glow-color', theme.glow + '0.6)');
  }

  // Event listener untuk menjalankan siklus animasi teks setelah halaman termuat
  document.addEventListener('DOMContentLoaded', () => {
    const targetEl = document.getElementById('decrypted-text');
    if (!targetEl) return;

    const decryptor = new Decryptor(targetEl);
    let currentIndex = 0;

    async function cycleText() {
      const theme = PHRASE_THEMES[currentIndex];
      applyTitleTheme(targetEl, theme);
      await decryptor.setText(theme.text);
      setTimeout(() => {
        currentIndex = (currentIndex + 1) % PHRASE_THEMES.length;
        cycleText();
      }, TITLE_HOLD_MS);
    }

    cycleText();
  });

  // ═══════════════════════════════════════════
  //  PARTICLE CONFIG
  // ═══════════════════════════════════════════

  // Parameter konfigurasi untuk partikel dan interaksi kursor
  const PARTICLE_COUNT = 70;
  const CONNECT_DIST   = 170;
  const MOUSE_ATTRACT  = 280;
  const MOUSE_REPEL    = 55;

  // ═══════════════════════════════════════════
  //  CANVAS SETUP (particle layer)
  // ═══════════════════════════════════════════

  // Inisialisasi elemen canvas untuk partikel latar belakang
  const canvas = document.getElementById('hero-bg-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const glowEl = document.getElementById('hero-mouse-glow');
  const heroEl = document.getElementById('hero');

  let W, H;
  let mouse = { x: -9999, y: -9999, active: false };
  let currentHue = 0;
  let targetHue  = 0;

  // Fungsi untuk menyesuaikan ukuran canvas
  function resize() {
    W = canvas.width  = heroEl.offsetWidth;
    H = canvas.height = heroEl.offsetHeight;
  }
  resize();

  // Event listener untuk mendeteksi posisi mouse di dalam hero section
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

  // Class untuk membuat node/partikel menyerupai jaringan pengetahuan
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
      this.r = this.baseR + Math.sin(t * 0.012 + this.phase) * 0.5;
      if (mouse.active) {
        const dx = mouse.x - this.x;
        const dy = mouse.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < MOUSE_REPEL && dist > 0) {
          const f = (MOUSE_REPEL - dist) / MOUSE_REPEL * 2;
          this.vx -= (dx / dist) * f * 0.15;
          this.vy -= (dy / dist) * f * 0.15;
        } else if (dist < MOUSE_ATTRACT) {
          const f = (MOUSE_ATTRACT - dist) / MOUSE_ATTRACT;
          this.vx += (dx / dist) * f * 0.035;
          this.vy += (dy / dist) * f * 0.035;
          this.vx += (-dy / dist) * f * 0.012;
          this.vy += (dx / dist) * f * 0.012;
        }
        if (dist < MOUSE_ATTRACT) {
          this.alpha = Math.min(0.95, 0.2 + (1 - dist / MOUSE_ATTRACT) * 0.75);
        } else {
          this.alpha += (0.3 - this.alpha) * 0.02;
        }
      } else {
        this.alpha += (0.3 - this.alpha) * 0.02;
      }
      this.vx *= 0.988; this.vy *= 0.988;
      this.x += this.vx; this.y += this.vy;
      if (this.x < -30) this.x = W + 30;
      if (this.x > W + 30) this.x = -30;
      if (this.y < -30) this.y = H + 30;
      if (this.y > H + 30) this.y = -30;
    }
    draw() {
      const g = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.r * 5);
      g.addColorStop(0, `rgba(${this.cr},${this.cg},${this.cb},${this.alpha * 0.3})`);
      g.addColorStop(1, 'transparent');
      ctx.beginPath(); ctx.fillStyle = g;
      ctx.arc(this.x, this.y, this.r * 5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${this.cr},${this.cg},${this.cb},${this.alpha})`;
      ctx.fill();
    }
  }

  // ═══════════════════════════════════════════
  //  FLOATING ACADEMIC ICONS
  // ═══════════════════════════════════════════

  // Definisi path untuk ikon-ikon akademik melayang
  const ICON_PATHS = [
    (ctx, s) => { // Ikon Dokumen
      ctx.beginPath();
      ctx.moveTo(-s*.4,-s*.5); ctx.lineTo(s*.15,-s*.5);
      ctx.lineTo(s*.4,-s*.25); ctx.lineTo(s*.4,s*.5);
      ctx.lineTo(-s*.4,s*.5); ctx.closePath(); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(s*.15,-s*.5); ctx.lineTo(s*.15,-s*.25);
      ctx.lineTo(s*.4,-s*.25); ctx.stroke();
      for (let i = 0; i < 3; i++) {
        const y = -s*.1 + i*s*.2;
        ctx.beginPath(); ctx.moveTo(-s*.25,y); ctx.lineTo(s*.25,y); ctx.stroke();
      }
    },
    (ctx, s) => { // Ikon Kaca Pembesar
      ctx.beginPath(); ctx.arc(-s*.08,-s*.08,s*.3,0,Math.PI*2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(s*.14,s*.14); ctx.lineTo(s*.45,s*.45); ctx.stroke();
    },
    (ctx, s) => { // Ikon Buku
      ctx.beginPath();
      ctx.moveTo(0,-s*.45); ctx.quadraticCurveTo(-s*.5,-s*.4,-s*.5,s*.35);
      ctx.lineTo(0,s*.45); ctx.lineTo(s*.5,s*.35);
      ctx.quadraticCurveTo(s*.5,-s*.4,0,-s*.45); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0,-s*.45); ctx.lineTo(0,s*.45); ctx.stroke();
    },
    (ctx, s) => { // Ikon Topi Akademik
      ctx.beginPath();
      ctx.moveTo(-s*.5,0); ctx.lineTo(0,-s*.3);
      ctx.lineTo(s*.5,0); ctx.lineTo(0,s*.15); ctx.closePath(); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-s*.25,s*.08); ctx.lineTo(-s*.25,s*.35);
      ctx.lineTo(0,s*.45); ctx.lineTo(s*.25,s*.35); ctx.lineTo(s*.25,s*.08); ctx.stroke();
    },
    (ctx, s) => { // Ikon Jaringan / Globe
      ctx.beginPath(); ctx.arc(-s*.15,-s*.1,s*.2,-Math.PI*.7,Math.PI*.3); ctx.stroke();
      ctx.beginPath(); ctx.arc(s*.15,s*.1,s*.2,Math.PI*.3,Math.PI*1.3); ctx.stroke();
    },
  ];

  // Class untuk Ikon Melayang
  class FloatingIcon {
    constructor() {
      this.x = Math.random() * W; this.y = Math.random() * H;
      this.vx = (Math.random()-.5)*.25; this.vy = (Math.random()-.5)*.25;
      this.size = Math.random()*16+14;
      this.rot = Math.random()*Math.PI*2;
      this.rotSpeed = (Math.random()-.5)*.003;
      this.iconIdx = Math.floor(Math.random()*ICON_PATHS.length);
      const c = NODE_COLORS[Math.floor(Math.random()*NODE_COLORS.length)];
      this.cr=c.r; this.cg=c.g; this.cb=c.b;
      this.alpha = Math.random()*.12+.05;
      this.baseAlpha = this.alpha;
    }
    update(t) {
      this.rot += this.rotSpeed;
      this.x += this.vx + Math.sin(t*.005+this.rot)*.1;
      this.y += this.vy + Math.cos(t*.004+this.rot)*.08;
      if (mouse.active) {
        const dx=mouse.x-this.x, dy=mouse.y-this.y;
        const dist=Math.sqrt(dx*dx+dy*dy);
        if (dist<200) {
          this.alpha=this.baseAlpha+(1-dist/200)*.2;
          this.vx-=(dx/dist)*.03; this.vy-=(dy/dist)*.03;
        } else { this.alpha+=(this.baseAlpha-this.alpha)*.03; }
      } else { this.alpha+=(this.baseAlpha-this.alpha)*.03; }
      this.vx*=.995; this.vy*=.995;
      if (this.x<-50) this.x=W+50; if (this.x>W+50) this.x=-50;
      if (this.y<-50) this.y=H+50; if (this.y>H+50) this.y=-50;
    }
    draw() {
      ctx.save();
      ctx.translate(this.x,this.y); ctx.rotate(this.rot);
      ctx.strokeStyle=`rgba(${this.cr},${this.cg},${this.cb},${this.alpha})`;
      ctx.lineWidth=1.2; ctx.lineCap='round'; ctx.lineJoin='round';
      ICON_PATHS[this.iconIdx](ctx,this.size);
      ctx.restore();
    }
  }

  // ═══════════════════════════════════════════
  //  CONNECTIONS
  // ═══════════════════════════════════════════

  // Fungsi untuk menggambar garis koneksi antar node yang berdekatan
  function drawConnections(nodes) {
    for (let i=0;i<nodes.length;i++) {
      for (let j=i+1;j<nodes.length;j++) {
        const dx=nodes[i].x-nodes[j].x, dy=nodes[i].y-nodes[j].y;
        const dist=Math.sqrt(dx*dx+dy*dy);
        if (dist<CONNECT_DIST) {
          const a=(1-dist/CONNECT_DIST)*.12;
          const grad=ctx.createLinearGradient(nodes[i].x,nodes[i].y,nodes[j].x,nodes[j].y);
          grad.addColorStop(0,`rgba(${nodes[i].cr},${nodes[i].cg},${nodes[i].cb},${a})`);
          grad.addColorStop(1,`rgba(${nodes[j].cr},${nodes[j].cg},${nodes[j].cb},${a})`);
          ctx.beginPath(); ctx.strokeStyle=grad; ctx.lineWidth=0.7;
          ctx.moveTo(nodes[i].x,nodes[i].y); ctx.lineTo(nodes[j].x,nodes[j].y); ctx.stroke();
        }
      }
    }
    if (mouse.active) {
      nodes.forEach(p=>{
        const dx=p.x-mouse.x, dy=p.y-mouse.y;
        const dist=Math.sqrt(dx*dx+dy*dy);
        if (dist<MOUSE_ATTRACT*.6) {
          const a=(1-dist/(MOUSE_ATTRACT*.6))*.22;
          ctx.beginPath();
          ctx.strokeStyle=`rgba(${ACCENT_LT.r},${ACCENT_LT.g},${ACCENT_LT.b},${a})`;
          ctx.lineWidth=0.9;
          ctx.moveTo(mouse.x,mouse.y); ctx.lineTo(p.x,p.y); ctx.stroke();
        }
      });
    }
  }

  // ═══════════════════════════════════════════
  //  MOUSE CURSOR RINGS
  // ═══════════════════════════════════════════

  // Fungsi animasi cincin pada posisi cursor mouse
  function drawMouseRings(t) {
    if (!mouse.active) return;
    const baseR=35;
    for (let i=0;i<3;i++) {
      const phase=t*.025+i*(Math.PI*2/3);
      const expand=(Math.sin(phase)+1)*.5;
      const r=baseR+i*35+expand*15;
      const a=0.12-i*.035;
      ctx.beginPath();
      ctx.arc(mouse.x,mouse.y,r,0,Math.PI*2);
      ctx.strokeStyle=`rgba(${ACCENT_LT.r},${ACCENT_LT.g},${ACCENT_LT.b},${Math.max(.02,a)})`;
      ctx.lineWidth=1.2-i*.3; ctx.stroke();
    }
    ctx.beginPath(); ctx.arc(mouse.x,mouse.y,3,0,Math.PI*2);
    ctx.fillStyle=`rgba(${ACCENT_LT.r},${ACCENT_LT.g},${ACCENT_LT.b},0.4)`; ctx.fill();
  }

  // ═══════════════════════════════════════════
  //  STARS
  // ═══════════════════════════════════════════

  // Inisialisasi latar belakang bintang-bintang
  const stars = [];
  function initStars() {
    stars.length = 0;
    for (let i=0;i<100;i++) {
      stars.push({
        x:Math.random()*W, y:Math.random()*H,
        r:Math.random()*.9+.2, a:Math.random()*.35+.08,
        speed:Math.random()*.018+.004, phase:Math.random()*Math.PI*2,
      });
    }
  }
  initStars();
  function drawStars(t) {
    stars.forEach(s=>{
      const a=s.a+Math.sin(t*s.speed+s.phase)*.12;
      ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,Math.PI*2);
      ctx.fillStyle=`rgba(180,200,240,${Math.max(.03,a)})`; ctx.fill();
    });
  }

  // ═══════════════════════════════════════════
  //  AMBIENT ORBS
  // ═══════════════════════════════════════════

  // Class untuk membuat latar cahaya orb yang bergerak
  class AmbientOrb {
    constructor() {
      this.x=Math.random()*W; this.y=Math.random()*H;
      this.radius=Math.random()*140+80;
      const c=NODE_COLORS[Math.floor(Math.random()*NODE_COLORS.length)];
      this.cr=c.r; this.cg=c.g; this.cb=c.b;
      this.vx=(Math.random()-.5)*.2; this.vy=(Math.random()-.5)*.2;
      this.alpha=Math.random()*.04+.02;
    }
    update() {
      this.x+=this.vx; this.y+=this.vy;
      if (this.x<-this.radius) this.x=W+this.radius;
      if (this.x>W+this.radius) this.x=-this.radius;
      if (this.y<-this.radius) this.y=H+this.radius;
      if (this.y>H+this.radius) this.y=-this.radius;
    }
    draw() {
      const g=ctx.createRadialGradient(this.x,this.y,0,this.x,this.y,this.radius);
      g.addColorStop(0,`rgba(${this.cr},${this.cg},${this.cb},${this.alpha})`);
      g.addColorStop(1,'transparent');
      ctx.beginPath(); ctx.fillStyle=g;
      ctx.arc(this.x,this.y,this.radius,0,Math.PI*2); ctx.fill();
    }
  }

  // ═══════════════════════════════════════════
  //  INIT LAYERS
  // ═══════════════════════════════════════════

  // Inisialisasi awal layer objek array
  const nodes = [];
  for (let i=0;i<PARTICLE_COUNT;i++) nodes.push(new KnowledgeNode());
  const icons = [];
  for (let i=0;i<12;i++) icons.push(new FloatingIcon());
  const orbs  = [];
  for (let i=0;i<4;i++) orbs.push(new AmbientOrb());

  // ═══════════════════════════════════════════
  //  PARTICLE RENDER LOOP
  // ═══════════════════════════════════════════

  // Fungsi Loop utama animasi canvas 2D
  let t = 0;
  function animateParticles() {
    t++;
    currentHue += (targetHue - currentHue) * 0.012;
    ctx.clearRect(0, 0, W, H);
    drawStars(t);
    orbs.forEach(o=>{ o.update(); o.draw(); });
    icons.forEach(ic=>{ ic.update(t); ic.draw(); });
    drawConnections(nodes);
    nodes.forEach(n=>{ n.update(t); n.draw(); });
    drawMouseRings(t);
    requestAnimationFrame(animateParticles);
  }
  animateParticles();

  // Event listener untuk reset posisi canvas ketika layar di-resize
  let rTimer;
  window.addEventListener('resize', ()=>{
    clearTimeout(rTimer);
    rTimer=setTimeout(()=>{
      resize(); initStars();
      nodes.forEach(n=>{
        if (n.x>W) n.x=Math.random()*W;
        if (n.y>H) n.y=Math.random()*H;
      });
    }, 200);
  });

  // ═══════════════════════════════════════════
  //  SPLASH CURSOR — WebGL Fluid Simulation
  // ═══════════════════════════════════════════

  // Inisialisasi sistem WebGL untuk efek cair pada kursor
  (function initSplashCursor() {

    // Buat elemen canvas baru untuk WebGL di dalam #hero
    const splashCanvas = document.createElement('canvas');
    splashCanvas.style.cssText = [
      'position:absolute',
      'top:0', 'left:0',
      'width:100%', 'height:100%',
      'pointer-events:none',
      'z-index:1',
      'mix-blend-mode:screen',
      'opacity:0.85',
    ].join(';');
    
    const bgCanvas = document.getElementById('hero-bg-canvas');
    if (bgCanvas && bgCanvas.parentNode) {
      bgCanvas.parentNode.insertBefore(splashCanvas, bgCanvas.nextSibling);
    } else {
      heroEl.insertBefore(splashCanvas, heroEl.firstChild);
    }

    // Konfigurasi WebGL Fluid
    const CFG = {
      SIM_RESOLUTION:       128, // Resolusi grid simulasi (lebih tinggi = lebih detail, tapi lebih berat)
      DYE_RESOLUTION:       1024, // Resolusi tekstur warna (lebih tinggi = warna lebih halus, tapi lebih berat)
      DENSITY_DISSIPATION:  3.0, // Kecepatan hilangnya warna (lebih tinggi = warna cepat memudar)
      VELOCITY_DISSIPATION: 1.8, // Kecepatan hilangnya kecepatan (lebih tinggi = gerakan cepat memudar)
      PRESSURE:             0.1, // Skala tekanan (lebih tinggi = efek cair lebih kuat)
      PRESSURE_ITERATIONS:  20, // Jumlah iterasi untuk menghitung tekanan (lebih tinggi = simulasi lebih akurat, tapi lebih berat)
      CURL:                 4, // Skala curl (lebih tinggi = efek pusaran lebih kuat)
      SPLAT_RADIUS:         0.35, // Radius efek splat (lebih tinggi = area efek lebih besar)
      SPLAT_FORCE:          6500, // Skala gaya splat (lebih tinggi = efek cair lebih kuat)
      SHADING:              true, // Aktifkan shading untuk efek lebih realistis (lebih berat)
    };

    // Inisialisasi konteks WebGL
    const params = { alpha:true, depth:false, stencil:false, antialias:false, preserveDrawingBuffer:false };
    let gl = splashCanvas.getContext('webgl2', params);
    const isWebGL2 = !!gl;
    if (!isWebGL2) gl = splashCanvas.getContext('webgl', params) || splashCanvas.getContext('experimental-webgl', params);
    if (!gl) return;

    let halfFloat, supportLinear;
    if (isWebGL2) {
      gl.getExtension('EXT_color_buffer_float');
      supportLinear = gl.getExtension('OES_texture_float_linear');
    } else {
      halfFloat     = gl.getExtension('OES_texture_half_float');
      supportLinear = gl.getExtension('OES_texture_half_float_linear');
    }
    gl.clearColor(0,0,0,1);
    const hfType = isWebGL2 ? gl.HALF_FLOAT : (halfFloat && halfFloat.HALF_FLOAT_OES);
    if (!supportLinear) { CFG.DYE_RESOLUTION=256; CFG.SHADING=false; }

    // Fungsi helper untuk memeriksa format tekstur WebGL
    function fmtOk(iF,f,type) {
      const tex=gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D,tex);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D,0,iF,4,4,0,f,type,null);
      const fbo=gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER,fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,tex,0);
      return gl.checkFramebufferStatus(gl.FRAMEBUFFER)===gl.FRAMEBUFFER_COMPLETE;
    }
    function getFormat(iF,f,type) {
      if (!fmtOk(iF,f,type)) {
        if (iF===gl.R16F)  return getFormat(gl.RG16F,  gl.RG,  type);
        if (iF===gl.RG16F) return getFormat(gl.RGBA16F,gl.RGBA,type);
        return null;
      }
      return { internalFormat:iF, format:f };
    }
    let fmtRGBA,fmtRG,fmtR;
    if (isWebGL2) {
      fmtRGBA=getFormat(gl.RGBA16F,gl.RGBA,hfType);
      fmtRG  =getFormat(gl.RG16F,  gl.RG,  hfType);
      fmtR   =getFormat(gl.R16F,   gl.RED, hfType);
    } else {
      fmtRGBA=getFormat(gl.RGBA,gl.RGBA,hfType);
      fmtRG  =getFormat(gl.RGBA,gl.RGBA,hfType);
      fmtR   =getFormat(gl.RGBA,gl.RGBA,hfType);
    }

    // Utilitas untuk kompilasi dan linking Shader Program
    function compile(type,src,kw) {
      if (kw) src=kw.map(k=>'#define '+k+'\n').join('')+src;
      const s=gl.createShader(type); gl.shaderSource(s,src); gl.compileShader(s); return s;
    }
    function linkProg(vs,fs) {
      const p=gl.createProgram(); gl.attachShader(p,vs); gl.attachShader(p,fs);
      gl.linkProgram(p); return p;
    }
    function getUniforms(p) {
      const m={}, n=gl.getProgramParameter(p,gl.ACTIVE_UNIFORMS);
      for (let i=0;i<n;i++) { const name=gl.getActiveUniform(p,i).name; m[name]=gl.getUniformLocation(p,name); }
      return m;
    }
    function makeProg(vs,fs) { const p=linkProg(vs,fs); return { p, u:getUniforms(p), bind(){ gl.useProgram(this.p); } }; }

    // Kode GLSL untuk vertex dan fragment shader
    const baseVS=compile(gl.VERTEX_SHADER,`
      precision highp float;
      attribute vec2 aPosition;
      varying vec2 vUv,vL,vR,vT,vB;
      uniform vec2 texelSize;
      void main(){
        vUv=aPosition*.5+.5;
        vL=vUv-vec2(texelSize.x,0.);vR=vUv+vec2(texelSize.x,0.);
        vT=vUv+vec2(0.,texelSize.y);vB=vUv-vec2(0.,texelSize.y);
        gl_Position=vec4(aPosition,0.,1.);
      }`);

    const copyP =makeProg(baseVS,compile(gl.FRAGMENT_SHADER,`precision mediump float;precision mediump sampler2D;varying highp vec2 vUv;uniform sampler2D uTexture;void main(){gl_FragColor=texture2D(uTexture,vUv);}`));
    const clearP=makeProg(baseVS,compile(gl.FRAGMENT_SHADER,`precision mediump float;precision mediump sampler2D;varying highp vec2 vUv;uniform sampler2D uTexture;uniform float value;void main(){gl_FragColor=value*texture2D(uTexture,vUv);}`));
    const splatP=makeProg(baseVS,compile(gl.FRAGMENT_SHADER,`precision highp float;precision highp sampler2D;varying vec2 vUv;uniform sampler2D uTarget;uniform float aspectRatio;uniform vec3 color;uniform vec2 point;uniform float radius;void main(){vec2 p=vUv-point.xy;p.x*=aspectRatio;vec3 splat=exp(-dot(p,p)/radius)*color;vec3 base=texture2D(uTarget,vUv).xyz;gl_FragColor=vec4(base+splat,1.);}`));
    const advP =makeProg(baseVS,compile(gl.FRAGMENT_SHADER,`
      precision highp float;precision highp sampler2D;
      varying vec2 vUv;uniform sampler2D uVelocity,uSource;
      uniform vec2 texelSize,dyeTexelSize;uniform float dt,dissipation;
      vec4 bilerp(sampler2D s,vec2 uv,vec2 ts){
        vec2 st=uv/ts-.5;vec2 iuv=floor(st);vec2 fuv=fract(st);
        vec4 a=texture2D(s,(iuv+vec2(.5,.5))*ts),b=texture2D(s,(iuv+vec2(1.5,.5))*ts),
             c=texture2D(s,(iuv+vec2(.5,1.5))*ts),d=texture2D(s,(iuv+vec2(1.5,1.5))*ts);
        return mix(mix(a,b,fuv.x),mix(c,d,fuv.x),fuv.y);
      }
      void main(){
        #ifdef MANUAL_FILTERING
          vec2 coord=vUv-dt*bilerp(uVelocity,vUv,texelSize).xy*texelSize;
          vec4 result=bilerp(uSource,coord,dyeTexelSize);
        #else
          vec2 coord=vUv-dt*texture2D(uVelocity,vUv).xy*texelSize;
          vec4 result=texture2D(uSource,coord);
        #endif
        gl_FragColor=result/(1.+dissipation*dt);
      }`,supportLinear?null:['MANUAL_FILTERING']));
    const divP  =makeProg(baseVS,compile(gl.FRAGMENT_SHADER,`precision mediump float;precision mediump sampler2D;varying highp vec2 vUv,vL,vR,vT,vB;uniform sampler2D uVelocity;void main(){float L=texture2D(uVelocity,vL).x,R=texture2D(uVelocity,vR).x,T=texture2D(uVelocity,vT).y,B=texture2D(uVelocity,vB).y;vec2 C=texture2D(uVelocity,vUv).xy;if(vL.x<0.)L=-C.x;if(vR.x>1.)R=-C.x;if(vT.y>1.)T=-C.y;if(vB.y<0.)B=-C.y;gl_FragColor=vec4(.5*(R-L+T-B),0.,0.,1.);}`));
    const curlP =makeProg(baseVS,compile(gl.FRAGMENT_SHADER,`precision mediump float;precision mediump sampler2D;varying highp vec2 vUv,vL,vR,vT,vB;uniform sampler2D uVelocity;void main(){float L=texture2D(uVelocity,vL).y,R=texture2D(uVelocity,vR).y,T=texture2D(uVelocity,vT).x,B=texture2D(uVelocity,vB).x;gl_FragColor=vec4(.5*(R-L-T+B),0.,0.,1.);}`));
    const vortP =makeProg(baseVS,compile(gl.FRAGMENT_SHADER,`precision highp float;precision highp sampler2D;varying vec2 vUv,vL,vR,vT,vB;uniform sampler2D uVelocity,uCurl;uniform float curl,dt;void main(){float L=texture2D(uCurl,vL).x,R=texture2D(uCurl,vR).x,T=texture2D(uCurl,vT).x,B=texture2D(uCurl,vB).x,C=texture2D(uCurl,vUv).x;vec2 f=.5*vec2(abs(T)-abs(B),abs(R)-abs(L));f/=length(f)+.0001;f*=curl*C;f.y*=-1.;vec2 v=texture2D(uVelocity,vUv).xy+f*dt;v=min(max(v,-1000.),1000.);gl_FragColor=vec4(v,0.,1.);}`));
    const pressP=makeProg(baseVS,compile(gl.FRAGMENT_SHADER,`precision mediump float;precision mediump sampler2D;varying highp vec2 vUv,vL,vR,vT,vB;uniform sampler2D uPressure,uDivergence;void main(){float L=texture2D(uPressure,vL).x,R=texture2D(uPressure,vR).x,T=texture2D(uPressure,vT).x,B=texture2D(uPressure,vB).x,div=texture2D(uDivergence,vUv).x;gl_FragColor=vec4((L+R+B+T-div)*.25,0.,0.,1.);}`));
    const gradP =makeProg(baseVS,compile(gl.FRAGMENT_SHADER,`precision mediump float;precision mediump sampler2D;varying highp vec2 vUv,vL,vR,vT,vB;uniform sampler2D uPressure,uVelocity;void main(){float L=texture2D(uPressure,vL).x,R=texture2D(uPressure,vR).x,T=texture2D(uPressure,vT).x,B=texture2D(uPressure,vB).x;vec2 v=texture2D(uVelocity,vUv).xy;v.xy-=vec2(R-L,T-B);gl_FragColor=vec4(v,0.,1.);}`));

    // Shader untuk Display
    const displayCache={};
    const displaySrc=`
      precision highp float;precision highp sampler2D;
      varying vec2 vUv,vL,vR,vT,vB;
      uniform sampler2D uTexture;uniform vec2 texelSize;
      void main(){
        vec3 c=texture2D(uTexture,vUv).rgb;
        #ifdef SHADING
          vec3 lc=texture2D(uTexture,vL).rgb,rc=texture2D(uTexture,vR).rgb,
               tc=texture2D(uTexture,vT).rgb,bc=texture2D(uTexture,vB).rgb;
          float dx=length(rc)-length(lc),dy=length(tc)-length(bc);
          vec3 n=normalize(vec3(dx,dy,length(texelSize)));
          float d=clamp(dot(n,vec3(0.,0.,1.))+.7,.7,1.);c*=d;
        #endif
        float a=max(c.r,max(c.g,c.b));gl_FragColor=vec4(c,a);
      }`;
    function getDisplayProg() {
      const key=CFG.SHADING?'S':'';
      if (!displayCache[key]) {
        const fs=compile(gl.FRAGMENT_SHADER,displaySrc,CFG.SHADING?['SHADING']:null);
        const p=linkProg(baseVS,fs); displayCache[key]={p,u:getUniforms(p)};
      }
      return displayCache[key];
    }

    // Setup buffer WebGL
    gl.bindBuffer(gl.ARRAY_BUFFER,gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,-1,1,1,1,1,-1]),gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,gl.createBuffer());
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array([0,1,2,0,2,3]),gl.STATIC_DRAW);
    gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);
    gl.enableVertexAttribArray(0);

    function blit(target) {
      if (!target) {
        gl.viewport(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight);
        gl.bindFramebuffer(gl.FRAMEBUFFER,null);
      } else {
        gl.viewport(0,0,target.width,target.height);
        gl.bindFramebuffer(gl.FRAMEBUFFER,target.fbo);
      }
      gl.drawElements(gl.TRIANGLES,6,gl.UNSIGNED_SHORT,0);
    }

    // Setup FBO dan helper resize FBO
    function makeFBO(w,h,iF,f,type,filter) {
      gl.activeTexture(gl.TEXTURE0);
      const tex=gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D,tex);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,filter);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,filter);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D,0,iF,w,h,0,f,type,null);
      const fbo=gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER,fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,tex,0);
      gl.viewport(0,0,w,h); gl.clear(gl.COLOR_BUFFER_BIT);
      return { tex,fbo,width:w,height:h,texelSizeX:1/w,texelSizeY:1/h,
               attach(id){ gl.activeTexture(gl.TEXTURE0+id); gl.bindTexture(gl.TEXTURE_2D,tex); return id; } };
    }
    function makeDoubleFBO(w,h,iF,f,type,filter) {
      let a=makeFBO(w,h,iF,f,type,filter), b=makeFBO(w,h,iF,f,type,filter);
      return { width:w,height:h,texelSizeX:a.texelSizeX,texelSizeY:a.texelSizeY,
               get read(){ return a; }, set read(v){ a=v; },
               get write(){ return b; }, set write(v){ b=v; },
               swap(){ const t=a; a=b; b=t; } };
    }
    function resizeFBO(target,w,h,iF,f,type,filter) {
      const n=makeFBO(w,h,iF,f,type,filter);
      copyP.bind(); gl.uniform1i(copyP.u.uTexture,target.attach(0)); blit(n); return n;
    }
    function resizeDoubleFBO(target,w,h,iF,f,type,filter) {
      if (target.width===w&&target.height===h) return target;
      target.read=resizeFBO(target.read,w,h,iF,f,type,filter);
      target.write=makeFBO(w,h,iF,f,type,filter);
      target.width=w; target.height=h; target.texelSizeX=1/w; target.texelSizeY=1/h;
      return target;
    }

    let sdye,svel,sdiv,scurl,spres;
    function getRes(r) {
      let ar=gl.drawingBufferWidth/gl.drawingBufferHeight; if (ar<1) ar=1/ar;
      const min=Math.round(r),max=Math.round(r*ar);
      return gl.drawingBufferWidth>gl.drawingBufferHeight?{width:max,height:min}:{width:min,height:max};
    }
    function initFBOs() {
      const sim=getRes(CFG.SIM_RESOLUTION), dyeR=getRes(CFG.DYE_RESOLUTION);
      const tt=hfType, fil=supportLinear?gl.LINEAR:gl.NEAREST;
      gl.disable(gl.BLEND);
      sdye  = sdye  ? resizeDoubleFBO(sdye, dyeR.width,dyeR.height,fmtRGBA.internalFormat,fmtRGBA.format,tt,fil) : makeDoubleFBO(dyeR.width,dyeR.height,fmtRGBA.internalFormat,fmtRGBA.format,tt,fil);
      svel  = svel  ? resizeDoubleFBO(svel, sim.width, sim.height, fmtRG.internalFormat,  fmtRG.format,  tt,fil) : makeDoubleFBO(sim.width, sim.height, fmtRG.internalFormat,  fmtRG.format,  tt,fil);
      sdiv  = makeFBO(sim.width,sim.height,fmtR.internalFormat,fmtR.format,tt,gl.NEAREST);
      scurl = makeFBO(sim.width,sim.height,fmtR.internalFormat,fmtR.format,tt,gl.NEAREST);
      spres = makeDoubleFBO(sim.width,sim.height,fmtR.internalFormat,fmtR.format,tt,gl.NEAREST);
    }
    initFBOs();

    // Setup input data
    const SPLAT_PALETTE = [ACCENT, ACCENT_LT, CYAN, INDIGO, EMERALD];
    const ptr={
      tx:0.5,ty:0.5,ptx:0.5,pty:0.5,
      dx:0,dy:0,moved:false,
      color:{r:.05,g:.1,b:.3},
    };
    function randColor() {
      const c=SPLAT_PALETTE[Math.floor(Math.random()*SPLAT_PALETTE.length)];
      return {r:c.r/255*.15, g:c.g/255*.15, b:c.b/255*.15};
    }
    function dpr(v){ return Math.floor(v*(window.devicePixelRatio||1)); }
    function cDX(d){ const ar=splashCanvas.width/splashCanvas.height; return ar<1?d*ar:d; }
    function cDY(d){ const ar=splashCanvas.width/splashCanvas.height; return ar>1?d/ar:d; }
    function cR(r) { const ar=splashCanvas.width/splashCanvas.height; return ar>1?r*ar:r; }

    function splat(x,y,dx,dy,color) {
      splatP.bind();
      gl.uniform1i(splatP.u.uTarget,svel.read.attach(0));
      gl.uniform1f(splatP.u.aspectRatio,splashCanvas.width/splashCanvas.height);
      gl.uniform2f(splatP.u.point,x,y);
      gl.uniform3f(splatP.u.color,dx,dy,0);
      gl.uniform1f(splatP.u.radius,cR(CFG.SPLAT_RADIUS/100));
      blit(svel.write); svel.swap();
      gl.uniform1i(splatP.u.uTarget,sdye.read.attach(0));
      gl.uniform3f(splatP.u.color,color.r,color.g,color.b);
      blit(sdye.write); sdye.swap();
    }
    function splatPtr() {
      splat(ptr.tx,ptr.ty,ptr.dx*CFG.SPLAT_FORCE,ptr.dy*CFG.SPLAT_FORCE,ptr.color);
    }
    function clickSplat(tx,ty) {
      const c=randColor(); c.r*=10; c.g*=10; c.b*=10;
      splat(tx,ty,10*(Math.random()-.5),30*(Math.random()-.5),c);
    }

    function heroCoords(cx,cy) {
      const rect=heroEl.getBoundingClientRect();
      return { x:dpr(cx-rect.left), y:dpr(cy-rect.top) };
    }
    
    // Event pendeteksi interaksi kursor
    heroEl.addEventListener('mousemove', e=>{
      const {x,y}=heroCoords(e.clientX,e.clientY);
      ptr.ptx=ptr.tx; ptr.pty=ptr.ty;
      ptr.tx=x/splashCanvas.width; ptr.ty=1-(y/splashCanvas.height);
      ptr.dx=cDX(ptr.tx-ptr.ptx); ptr.dy=cDY(ptr.ty-ptr.pty);
      ptr.moved=Math.abs(ptr.dx)>0||Math.abs(ptr.dy)>0;
      ptr.color=randColor();
    });
    heroEl.addEventListener('mousedown', e=>{
      const {x,y}=heroCoords(e.clientX,e.clientY);
      clickSplat(x/splashCanvas.width, 1-(y/splashCanvas.height));
    });
    heroEl.addEventListener('touchmove', e=>{
      const {x,y}=heroCoords(e.targetTouches[0].clientX,e.targetTouches[0].clientY);
      ptr.ptx=ptr.tx; ptr.pty=ptr.ty;
      ptr.tx=x/splashCanvas.width; ptr.ty=1-(y/splashCanvas.height);
      ptr.dx=cDX(ptr.tx-ptr.ptx); ptr.dy=cDY(ptr.ty-ptr.pty);
      ptr.moved=Math.abs(ptr.dx)>0||Math.abs(ptr.dy)>0;
      ptr.color=randColor();
    },{passive:true});
    heroEl.addEventListener('touchstart', e=>{
      const {x,y}=heroCoords(e.targetTouches[0].clientX,e.targetTouches[0].clientY);
      clickSplat(x/splashCanvas.width, 1-(y/splashCanvas.height));
    });

    // Langkah simulasi fluida
    function step(dt) {
      gl.disable(gl.BLEND);
      curlP.bind();
      gl.uniform2f(curlP.u.texelSize,svel.texelSizeX,svel.texelSizeY);
      gl.uniform1i(curlP.u.uVelocity,svel.read.attach(0)); blit(scurl);
      vortP.bind();
      gl.uniform2f(vortP.u.texelSize,svel.texelSizeX,svel.texelSizeY);
      gl.uniform1i(vortP.u.uVelocity,svel.read.attach(0));
      gl.uniform1i(vortP.u.uCurl,scurl.attach(1));
      gl.uniform1f(vortP.u.curl,CFG.CURL); gl.uniform1f(vortP.u.dt,dt);
      blit(svel.write); svel.swap();
      divP.bind();
      gl.uniform2f(divP.u.texelSize,svel.texelSizeX,svel.texelSizeY);
      gl.uniform1i(divP.u.uVelocity,svel.read.attach(0)); blit(sdiv);
      clearP.bind();
      gl.uniform1i(clearP.u.uTexture,spres.read.attach(0));
      gl.uniform1f(clearP.u.value,CFG.PRESSURE); blit(spres.write); spres.swap();
      pressP.bind();
      gl.uniform2f(pressP.u.texelSize,svel.texelSizeX,svel.texelSizeY);
      gl.uniform1i(pressP.u.uDivergence,sdiv.attach(0));
      for (let i=0;i<CFG.PRESSURE_ITERATIONS;i++) {
        gl.uniform1i(pressP.u.uPressure,spres.read.attach(1));
        blit(spres.write); spres.swap();
      }
      gradP.bind();
      gl.uniform2f(gradP.u.texelSize,svel.texelSizeX,svel.texelSizeY);
      gl.uniform1i(gradP.u.uPressure,spres.read.attach(0));
      gl.uniform1i(gradP.u.uVelocity,svel.read.attach(1));
      blit(svel.write); svel.swap();
      advP.bind();
      gl.uniform2f(advP.u.texelSize,svel.texelSizeX,svel.texelSizeY);
      if (!supportLinear) gl.uniform2f(advP.u.dyeTexelSize,svel.texelSizeX,svel.texelSizeY);
      const vId=svel.read.attach(0);
      gl.uniform1i(advP.u.uVelocity,vId); gl.uniform1i(advP.u.uSource,vId);
      gl.uniform1f(advP.u.dt,dt); gl.uniform1f(advP.u.dissipation,CFG.VELOCITY_DISSIPATION);
      blit(svel.write); svel.swap();
      if (!supportLinear) gl.uniform2f(advP.u.dyeTexelSize,sdye.texelSizeX,sdye.texelSizeY);
      gl.uniform1i(advP.u.uVelocity,svel.read.attach(0));
      gl.uniform1i(advP.u.uSource,sdye.read.attach(1));
      gl.uniform1f(advP.u.dissipation,CFG.DENSITY_DISSIPATION);
      blit(sdye.write); sdye.swap();
    }

    function drawDisplay() {
      const dp=getDisplayProg(); gl.useProgram(dp.p);
      if (CFG.SHADING) gl.uniform2f(dp.u.texelSize,1/gl.drawingBufferWidth,1/gl.drawingBufferHeight);
      gl.uniform1i(dp.u.uTexture,sdye.read.attach(0));
      gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA); gl.enable(gl.BLEND);
      blit(null);
    }

    function resizeSplashCanvas() {
      const w=dpr(heroEl.clientWidth), h=dpr(heroEl.clientHeight);
      if (splashCanvas.width!==w||splashCanvas.height!==h) {
        splashCanvas.width=w; splashCanvas.height=h; return true;
      }
      return false;
    }

    // Loop utama Splash Screen
    let lastTime=Date.now();
    function splashLoop() {
      const now=Date.now(), dt=Math.min((now-lastTime)/1000,0.016666);
      lastTime=now;
      if (resizeSplashCanvas()) initFBOs();
      if (ptr.moved) { ptr.moved=false; splatPtr(); }
      step(dt);
      drawDisplay();
      requestAnimationFrame(splashLoop);
    }
    splashLoop();

    window.addEventListener('resize',()=>{
      clearTimeout(splashCanvas._rt);
      splashCanvas._rt=setTimeout(()=>{ if(resizeSplashCanvas()) initFBOs(); },200);
    });

  })();

  // ═══════════════════════════════════════════
  //  TYPING ANIMATION
  // ═══════════════════════════════════════════

  // Pengaturan animasi mengetik pada bagian teks
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
    if (glowEl) {
      glowEl.style.background =
        `radial-gradient(circle, ${theme.glow}0.45) 0%, ${theme.glow}0.2) 40%, transparent 70%)`;
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
