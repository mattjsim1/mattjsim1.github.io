// Animated starfield background ported from Homepage custom.js.
// Supports NOAA solar-elevation nebula glow with interactive Auto / Day / Night modes.
(() => {
  "use strict";

  const LAT = 43.0;
  const LON = -85.7;
  const STARS = 400;
  const SPEED = 3;
  const SHOOTING_STARS = true;
  const TWINKLE = true;
  const FADE_MINUTES = 45;
  const SHOW_FPS = true;
  const COMET_EVERY = 45;
  const CLICK_COMETS = false;

  if (document.getElementById("starfield-bg")) return;

  const canvas = document.createElement("canvas");
  canvas.id = "starfield-bg";
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.cssText =
    "position:fixed;inset:0;width:100vw;height:100vh;z-index:-1;pointer-events:none;display:block;";
  document.body.prepend(canvas);
  const ctx = canvas.getContext("2d");

  let W = 0;
  let H = 0;
  const DPR = Math.min(window.devicePixelRatio || 1, 2);

  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  resize();
  window.addEventListener("resize", () => {
    resize();
    seed();
  });

  // NOAA sunrise/sunset approximation
  function sunTimes(date) {
    const rad = Math.PI / 180;
    const start = Date.UTC(date.getUTCFullYear(), 0, 0);
    const day = Math.floor((date - start) / 864e5);
    const g = ((2 * Math.PI) / 365) * (day - 1);
    const eqt =
      229.18 *
      (0.000075 +
        0.001868 * Math.cos(g) -
        0.032077 * Math.sin(g) -
        0.014615 * Math.cos(2 * g) -
        0.040849 * Math.sin(2 * g));
    const decl =
      0.006918 -
      0.399912 * Math.cos(g) +
      0.070257 * Math.sin(g) -
      0.006758 * Math.cos(2 * g) +
      0.000907 * Math.sin(2 * g) -
      0.002697 * Math.cos(3 * g) +
      0.00148 * Math.sin(3 * g);
    const cosHa =
      Math.cos(90.833 * rad) / (Math.cos(LAT * rad) * Math.cos(decl)) -
      Math.tan(LAT * rad) * Math.tan(decl);
    if (cosHa > 1) return null;
    if (cosHa < -1) return { always: true };
    const ha = Math.acos(cosHa) / rad;
    const midnight = Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate()
    );
    const rise = midnight + (720 - 4 * (LON + ha) - eqt) * 6e4;
    const set = midnight + (720 - 4 * (LON - ha) - eqt) * 6e4;
    return { rise, set };
  }

  function dayLevel(now) {
    const local = new Date(now);
    const noonUtc = new Date(
      Date.UTC(local.getFullYear(), local.getMonth(), local.getDate(), 12)
    );
    const t = sunTimes(noonUtc);
    if (!t) return 0;
    if (t.always) return 1;
    const f = FADE_MINUTES * 6e4;
    if (now < t.rise - f / 2 || now > t.set + f / 2) return 0;
    if (now < t.rise + f / 2) return (now - (t.rise - f / 2)) / f;
    if (now > t.set - f / 2) return 1 - (now - (t.set - f / 2)) / f;
    return 1;
  }

  let skyMode = "auto";
  let autoNebula = dayLevel(Date.now());
  let targetNebula = autoNebula;
  let nebula = autoNebula;

  function syncTargetNebula() {
    autoNebula = dayLevel(Date.now());
    if (skyMode === "day") targetNebula = 1;
    else if (skyMode === "night") targetNebula = 0;
    else targetNebula = autoNebula;
  }
  setInterval(syncTargetNebula, 60 * 1000);

  const tints = ["#ffffff", "#daefff", "#c8e8ff", "#72b4f5", "#ffe9c4"];
  let stars = [];
  let shots = [];

  function seed() {
    stars = [];
    for (let i = 0; i < STARS; i++) {
      stars.push({
        x: Math.random() * W,
        y: Math.random() * H,
        z: Math.random(),
        c: tints[Math.random() < 0.75 ? 0 : Math.floor(Math.random() * tints.length)],
        p: Math.random() * 6.28,
        ps: 0.5 + Math.random() * 2,
      });
    }
  }
  seed();

  function drawNebula(a) {
    if (a <= 0.005) return;
    let g = ctx.createRadialGradient(W * 0.72, H * 0.3, 0, W * 0.72, H * 0.3, W * 0.45);
    g.addColorStop(0, `rgba(53,110,191,${0.24 * a})`);
    g.addColorStop(1, "rgba(53,110,191,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    g = ctx.createRadialGradient(W * 0.2, H * 0.85, 0, W * 0.2, H * 0.85, W * 0.35);
    g.addColorStop(0, `rgba(114,80,200,${0.16 * a})`);
    g.addColorStop(1, "rgba(114,80,200,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  let comets = [];
  let sparks = [];

  function launchComet(px, py) {
    const startX = typeof px === "number" ? px : W * (0.45 + Math.random() * 0.45);
    const startY = typeof py === "number" ? py : H * (0.08 + Math.random() * 0.35);
    const ang = Math.atan2(3, -8) + (Math.random() - 0.5) * 0.25;
    const sp = 2.2 + Math.random() * 0.8;
    comets.push({
      x: startX,
      y: startY,
      vx: Math.cos(ang) * sp,
      vy: Math.sin(ang) * sp,
      dx: Math.cos(ang),
      dy: Math.sin(ang),
      life: 1,
      age: 0,
      span: (0.8 + Math.random() * 3.5) * 60,
    });
  }

  function maybeRandomComet(k) {
    if (!COMET_EVERY) return;
    if (Math.random() < k / (60 * COMET_EVERY)) {
      launchComet();
    }
  }

  if (CLICK_COMETS) {
    document.addEventListener("click", (e) => {
      if (e.button !== 0) return;
      if (
        e.target.closest(
          "article, .card, .arch-node, .modal-dialog, .topbar, a, button, input, select, textarea, label, [role=button]"
        )
      ) {
        return;
      }
      if (window.getSelection && String(window.getSelection())) return;
      launchComet(e.clientX, e.clientY);
    });
  }

  function tailStroke(m, len, width, stops) {
    const tx = m.x - m.dx * len;
    const ty = m.y - m.dy * len;
    const g = ctx.createLinearGradient(m.x, m.y, tx, ty);
    for (const [o, col] of stops) g.addColorStop(o, col);
    ctx.strokeStyle = g;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(m.x, m.y);
    ctx.lineTo(tx, ty);
    ctx.stroke();
  }

  function drawComets(k) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.lineCap = "round";
    for (const m of comets) {
      m.age += k;
      m.x += m.vx * k;
      m.y += m.vy * k;
      if (m.age > m.span) m.life -= k / 45;
      if (m.x < -300 || m.x > W + 300 || m.y < -300 || m.y > H + 300) m.life -= 0.03 * k;
      const a = Math.max(0, m.life);
      const L = 260 * Math.min(1, m.age / 40);

      tailStroke(m, L, 16, [
        [0, `rgba(150,120,255,${0.28 * a})`],
        [0.5, `rgba(110,70,210,${0.12 * a})`],
        [1, "rgba(80,40,180,0)"],
      ]);
      tailStroke(m, L * 0.85, 6, [
        [0, `rgba(114,180,245,${0.75 * a})`],
        [0.45, `rgba(140,110,255,${0.4 * a})`],
        [1, "rgba(120,70,220,0)"],
      ]);
      tailStroke(m, L * 0.4, 2, [
        [0, `rgba(255,255,255,${0.95 * a})`],
        [0.5, `rgba(200,232,255,${0.5 * a})`],
        [1, "rgba(160,200,255,0)"],
      ]);

      const h = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, 26);
      h.addColorStop(0, `rgba(255,255,255,${a})`);
      h.addColorStop(0.15, `rgba(218,239,255,${0.85 * a})`);
      h.addColorStop(0.4, `rgba(114,180,245,${0.35 * a})`);
      h.addColorStop(0.7, `rgba(140,100,240,${0.15 * a})`);
      h.addColorStop(1, "rgba(120,70,220,0)");
      ctx.fillStyle = h;
      ctx.beginPath();
      ctx.arc(m.x, m.y, 26, 0, 6.28);
      ctx.fill();

      if (a > 0 && Math.random() < 0.5 * k) {
        sparks.push({
          x: m.x - m.dx * 6,
          y: m.y - m.dy * 6,
          vx: (Math.random() - 0.5) * 0.6 - m.vx * 0.15,
          vy: (Math.random() - 0.5) * 0.6 - m.vy * 0.15,
          l: 1,
          r: 0.6 + Math.random() * 1.1,
          c: Math.random() < 0.5 ? "200,232,255" : "170,140,255",
        });
      }
    }
    comets = comets.filter((m) => m.life > 0);
    for (const s of sparks) {
      s.x += s.vx * k;
      s.y += s.vy * k;
      s.l -= 0.012 * k;
      ctx.fillStyle = `rgba(${s.c},${Math.max(0, s.l) * 0.8})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, 6.28);
      ctx.fill();
    }
    sparks = sparks.filter((s) => s.l > 0);
    ctx.restore();
  }

  let fpsEl = null;
  let fpsFrames = 0;
  let fpsSince = 0;
  if (SHOW_FPS) {
    fpsEl = document.createElement("div");
    fpsEl.id = "starfield-fps";
    fpsEl.setAttribute("aria-hidden", "true");
    fpsEl.style.cssText =
      "position:fixed;left:10px;bottom:8px;z-index:50;pointer-events:none;" +
      "font:11px/1.4 ui-monospace,Consolas,monospace;color:rgba(200,232,255,0.22);";
    document.body.appendChild(fpsEl);
  }

  let last = 0;
  let t = 0;
  function frame(ts) {
    requestAnimationFrame(frame);
    const dt = last ? Math.min((ts - last) / 1000, 0.1) : 1 / 60;
    last = ts;
    t += dt;

    if (fpsEl) {
      fpsFrames++;
      if (!fpsSince) fpsSince = ts;
      if (ts - fpsSince >= 500) {
        fpsEl.textContent = Math.round((fpsFrames * 1000) / (ts - fpsSince)) + " fps";
        fpsFrames = 0;
        fpsSince = ts;
      }
    }

    const k = dt * 60;
    nebula += (targetNebula - nebula) * Math.min(1, dt * 4);

    ctx.globalAlpha = 1;
    ctx.fillStyle = "#05070d";
    ctx.fillRect(0, 0, W, H);
    drawNebula(nebula);

    for (const s of stars) {
      const a = TWINKLE ? 0.55 + 0.45 * Math.sin(t * s.ps + s.p) : 1;
      s.x -= (0.04 + s.z * 0.25) * SPEED * 0.25 * k;
      if (s.x < 0) {
        s.x = W;
        s.y = Math.random() * H;
      }
      ctx.globalAlpha = a * (0.35 + s.z * 0.65);
      ctx.fillStyle = s.c;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 0.3 + s.z * 1.3, 0, 6.28);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    if (SHOOTING_STARS) {
      if (Math.random() < 0.006 * k) {
        shots.push({
          x: Math.random() * W * 0.8 + W * 0.2,
          y: Math.random() * H * 0.4,
          vx: -(6 + Math.random() * 4),
          vy: 2 + Math.random() * 2,
          l: 1,
        });
      }
      for (const s of shots) {
        const g = ctx.createLinearGradient(s.x, s.y, s.x - s.vx * 10, s.y - s.vy * 10);
        g.addColorStop(0, `rgba(255,255,255,${s.l})`);
        g.addColorStop(1, "rgba(114,180,245,0)");
        ctx.strokeStyle = g;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(s.x - s.vx * 10, s.y - s.vy * 10);
        ctx.stroke();
        s.x += s.vx * k;
        s.y += s.vy * k;
        s.l -= 0.015 * k;
      }
      shots = shots.filter((s) => s.l > 0);
    }

    maybeRandomComet(k);
    if (comets.length || sparks.length) drawComets(k);
  }
  requestAnimationFrame(frame);

  window.HomelabStarfield = {
    setSkyMode(mode) {
      if (mode === "auto" || mode === "day" || mode === "night") {
        skyMode = mode;
        syncTargetNebula();
      }
    },
    getSkyMode() {
      return skyMode;
    },
    launchComet,
  };
})();
