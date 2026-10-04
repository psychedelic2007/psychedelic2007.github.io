// Hero figure carousel: four small interactive models, one per research domain.
// Only the visible slide animates, and nothing runs while the hero is off-screen.
(function () {
  const root = document.getElementById('heroFig');
  if (!root) return;
  const Th = window.Theme;
  const c = (n, a) => Th.c(n, a);
  const $ = id => document.getElementById(id);
  const set = (id, v) => { const e = $(id); if (e) e.textContent = v; };
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  function gauss() {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v);
  }
  const MONO = '"DM Mono", "Courier New", monospace';

  // ---- canvas plumbing -------------------------------------------------------
  function surface(id) {
    const canvas = $(id), ctx = canvas.getContext('2d'), box = canvas.parentElement;
    const s = { canvas, ctx, box, W: 0, H: 0, ptr: null };
    s.fit = () => {
      const r = box.getBoundingClientRect();
      if (!r.width) return;
      const dpr = window.devicePixelRatio || 1;
      s.W = r.width; s.H = r.height;
      canvas.width = Math.round(r.width * dpr); canvas.height = Math.round(r.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const pos = e => { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    canvas.addEventListener('pointermove', e => { s.ptr = pos(e); });
    canvas.addEventListener('pointerdown', e => { s.ptr = pos(e); s.onClick && s.onClick(s.ptr); });
    canvas.addEventListener('pointerleave', () => { s.ptr = null; });
    canvas.addEventListener('pointerup', e => { if (e.pointerType !== 'mouse') s.ptr = null; });
    s.fit();
    return s;
  }
  function grid(s, step = 16) {
    const { ctx, W, H } = s;
    ctx.fillStyle = c('bg'); ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = c('ink', 0.06); ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x < W; x += step) { ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, H); }
    for (let y = 0; y < H; y += step) { ctx.moveTo(0, y + 0.5); ctx.lineTo(W, y + 0.5); }
    ctx.stroke();
  }
  function text(ctx, str, x, y, color, size = 10, align = 'left') {
    ctx.font = `${size}px ${MONO}`; ctx.fillStyle = color; ctx.textAlign = align; ctx.fillText(str, x, y);
    ctx.textAlign = 'left';
  }
  function slider(id, outId, fmt, onChange) {
    const el = $(id);
    const upd = () => { const v = parseFloat(el.value); set(outId, fmt(v)); onChange(v); };
    el.addEventListener('input', upd); upd();
  }

  // ===========================================================================
  // FIG-01  Machine learning: a 2-5-5-1 MLP learning a 2-D classification task.
  // Real full-batch gradient descent; pulses show the forward pass, then backprop.
  // ===========================================================================
  function MLP() {
    const s = surface('mlpCanvas');
    const sizes = [2, 5, 5, 1];
    let W, b, vW, vb, data, dataset = 'circle', lr = 0.4, epoch = 0, loss = 0, acc = 0, training = true;
    let grid2 = null, gridTick = 0, sample = 0, cycleStart = 0;

    function init() {
      W = []; b = []; vW = []; vb = [];
      for (let l = 0; l < sizes.length - 1; l++) {
        const n = sizes[l + 1], m = sizes[l], sc = Math.sqrt(2 / (n + m));
        W.push(Array.from({ length: n }, () => Array.from({ length: m }, () => gauss() * sc * 1.6)));
        b.push(Array.from({ length: n }, () => 0));
        vW.push(Array.from({ length: n }, () => new Array(m).fill(0)));
        vb.push(new Array(n).fill(0));
      }
      epoch = 0;
    }
    function makeData() {
      data = [];
      for (let i = 0; i < 90; i++) {
        const x = Math.random() * 2 - 1, y = Math.random() * 2 - 1;
        const label = dataset === 'circle' ? (x * x + y * y < 0.36 ? 1 : 0) : (x * y > 0 ? 1 : 0);
        if (dataset === 'xor' && Math.abs(x * y) < 0.02) { i--; continue; }
        data.push({ x, y, label });
      }
    }
    function forward(x0, x1) {
      const acts = [[x0, x1]];
      for (let l = 0; l < W.length; l++) {
        const prev = acts[l], out = [];
        for (let j = 0; j < W[l].length; j++) {
          let z = b[l][j];
          for (let i = 0; i < prev.length; i++) z += W[l][j][i] * prev[i];
          out.push(l === W.length - 1 ? 1 / (1 + Math.exp(-z)) : Math.tanh(z));
        }
        acts.push(out);
      }
      return acts;
    }
    function trainEpoch() {
      const gW = W.map(m => m.map(r => r.map(() => 0))), gb = b.map(v => v.map(() => 0));
      let L = 0, correct = 0;
      for (const d of data) {
        const a = forward(d.x, d.y);
        const p = a[a.length - 1][0];
        L += -(d.label * Math.log(p + 1e-9) + (1 - d.label) * Math.log(1 - p + 1e-9));
        if ((p > 0.5 ? 1 : 0) === d.label) correct++;
        let delta = [p - d.label];
        for (let l = W.length - 1; l >= 0; l--) {
          for (let j = 0; j < W[l].length; j++) {
            gb[l][j] += delta[j];
            for (let i = 0; i < a[l].length; i++) gW[l][j][i] += delta[j] * a[l][i];
          }
          if (l > 0) {
            const nd = [];
            for (let i = 0; i < a[l].length; i++) {
              let sum = 0;
              for (let j = 0; j < W[l].length; j++) sum += W[l][j][i] * delta[j];
              nd.push(sum * (1 - a[l][i] * a[l][i]));
            }
            delta = nd;
          }
        }
      }
      const n = data.length;
      for (let l = 0; l < W.length; l++) {
        for (let j = 0; j < W[l].length; j++) {
          vb[l][j] = 0.85 * vb[l][j] - lr * gb[l][j] / n; b[l][j] += vb[l][j];
          for (let i = 0; i < W[l][j].length; i++) {
            vW[l][j][i] = 0.85 * vW[l][j][i] - lr * gW[l][j][i] / n; W[l][j][i] += vW[l][j][i];
          }
        }
      }
      loss = L / n; acc = correct / n; epoch++;
    }

    function layout() {
      const S = Math.round(clamp(s.W * 0.3, 96, 150));
      const inset = { x: s.W - S - 14, y: 14, S };
      const left = 34, right = inset.x - 34, top = 56, bottom = s.H - 40;
      const nodes = sizes.map((n, l) => {
        const x = lerp(left, right, l / (sizes.length - 1));
        const gap = Math.min(52, (bottom - top) / Math.max(n, 2));
        return Array.from({ length: n }, (_, k) => ({ x, y: (top + bottom) / 2 + (k - (n - 1) / 2) * gap }));
      });
      return { inset, nodes };
    }

    s.onClick = p => {
      const { inset } = layout();
      if (p.x < inset.x || p.x > inset.x + inset.S || p.y < inset.y || p.y > inset.y + inset.S) return;
      const x = (p.x - inset.x) / inset.S * 2 - 1, y = (p.y - inset.y) / inset.S * 2 - 1;
      const pred = forward(x, y)[3][0];
      data.push({ x, y, label: pred > 0.5 ? 0 : 1, added: true });   // label it against the model's belief
      grid2 = null;
    };

    function draw(now) {
      const { ctx, W: w, H: h } = s;
      grid(s);
      const { inset, nodes } = layout();
      const P = 2600, t = ((now - cycleStart) % P) / P;          // one forward+backward cycle
      if (t < 0.02 && now - cycleStart > P) { sample = Math.floor(Math.random() * data.length); }
      const d = data[sample % data.length];
      const acts = forward(d.x, d.y);
      const fwd = t < 0.5, phase = fwd ? t / 0.5 : (t - 0.5) / 0.5;   // 0..1 within phase
      const nT = sizes.length - 1;

      // edges
      for (let l = 0; l < nT; l++) {
        for (let j = 0; j < sizes[l + 1]; j++) {
          for (let i = 0; i < sizes[l]; i++) {
            const wv = W[l][j][i], a = nodes[l][i], bb = nodes[l + 1][j];
            ctx.strokeStyle = wv >= 0 ? c('ink', 0.18 + 0.5 * Math.min(1, Math.abs(wv) / 2.5)) : c('accent', 0.18 + 0.5 * Math.min(1, Math.abs(wv) / 2.5));
            ctx.lineWidth = 0.5 + Math.min(3, Math.abs(wv) * 1.1);
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(bb.x, bb.y); ctx.stroke();
          }
        }
      }
      // pulses
      const seg = fwd ? Math.min(nT - 1, Math.floor(phase * nT)) : nT - 1 - Math.min(nT - 1, Math.floor(phase * nT));
      const u = (phase * nT) % 1;
      for (let j = 0; j < sizes[seg + 1]; j++) {
        for (let i = 0; i < sizes[seg]; i++) {
          const a = nodes[seg][i], bb = nodes[seg + 1][j];
          const k = fwd ? u : 1 - u;
          const px = lerp(a.x, bb.x, k), py = lerp(a.y, bb.y, k);
          ctx.beginPath(); ctx.arc(px, py, 2.2 + Math.min(2, Math.abs(W[seg][j][i])), 0, TAU);
          ctx.fillStyle = fwd ? c('ink') : c('accent'); ctx.fill();
        }
      }
      // nodes
      const lit = fwd ? Math.floor(phase * nT) : nT - Math.floor(phase * nT);
      for (let l = 0; l < sizes.length; l++) {
        nodes[l].forEach((n, k) => {
          const a = acts[l][k];
          const on = fwd ? l <= lit : l >= lit;
          ctx.beginPath(); ctx.arc(n.x, n.y, 11, 0, TAU);
          ctx.fillStyle = c('surface'); ctx.fill();
          if (on) {
            const v = l === sizes.length - 1 ? (a - 0.5) * 2 : a;
            ctx.fillStyle = v >= 0 ? c('ink', Math.abs(v) * 0.85) : c('accent', Math.abs(v) * 0.85);
            ctx.fill();
          }
          ctx.lineWidth = !fwd && on ? 2.2 : 1.5;
          ctx.strokeStyle = !fwd && on ? c('accent') : c('ink'); ctx.stroke();
        });
      }
      text(ctx, 'x₁', nodes[0][0].x - 26, nodes[0][0].y + 4, c('muted'), 11);
      text(ctx, 'x₂', nodes[0][1].x - 26, nodes[0][1].y + 4, c('muted'), 11);
      text(ctx, 'ŷ', nodes[3][0].x + 16, nodes[3][0].y + 4, c('muted'), 12);
      ['IN', 'H1', 'H2', 'OUT'].forEach((lab, l) => text(ctx, lab, nodes[l][0].x, 30, c('muted'), 9, 'center'));
      text(ctx, fwd ? 'FORWARD PASS →' : '← BACKPROPAGATION', (nodes[0][0].x + nodes[3][0].x) / 2, h - 14,
        fwd ? c('ink') : c('accent'), 10, 'center');

      // decision-boundary inset
      const G = 24, cs = inset.S / G;
      if (!grid2 || ++gridTick % 6 === 0) {
        grid2 = [];
        for (let gy = 0; gy < G; gy++) for (let gx = 0; gx < G; gx++)
          grid2.push(forward((gx + 0.5) / G * 2 - 1, (gy + 0.5) / G * 2 - 1)[3][0]);
      }
      ctx.fillStyle = c('surface'); ctx.fillRect(inset.x, inset.y, inset.S, inset.S);
      for (let gy = 0; gy < G; gy++) for (let gx = 0; gx < G; gx++) {
        const p = grid2[gy * G + gx];
        ctx.fillStyle = p > 0.5 ? c('ink', (p - 0.5) * 0.6) : c('accent', (0.5 - p) * 0.5);
        ctx.fillRect(inset.x + gx * cs, inset.y + gy * cs, cs + 0.5, cs + 0.5);
      }
      for (const q of data) {
        const px = inset.x + (q.x + 1) / 2 * inset.S, py = inset.y + (q.y + 1) / 2 * inset.S;
        ctx.beginPath(); ctx.arc(px, py, q.added ? 3.4 : 2.4, 0, TAU);
        if (q.label) { ctx.fillStyle = c('ink'); ctx.fill(); }
        else { ctx.strokeStyle = c('accent'); ctx.lineWidth = 1.4; ctx.stroke(); }
      }
      const sx = inset.x + (d.x + 1) / 2 * inset.S, sy = inset.y + (d.y + 1) / 2 * inset.S;
      ctx.beginPath(); ctx.arc(sx, sy, 6, 0, TAU); ctx.strokeStyle = c('fg'); ctx.lineWidth = 1.2; ctx.stroke();
      ctx.strokeStyle = c('ink'); ctx.lineWidth = 1; ctx.strokeRect(inset.x + 0.5, inset.y + 0.5, inset.S, inset.S);
      text(ctx, 'DATA · CLICK TO ADD', inset.x, inset.y + inset.S + 14, c('muted'), 9);

      set('mlpEpoch', epoch.toLocaleString());
      set('mlpLoss', loss.toFixed(3));
      set('mlpAcc', (acc * 100).toFixed(0) + '%');
    }

    slider('mlpLr', 'mlpLrVal', v => v.toFixed(2), v => { lr = v; });
    $('mlpData').addEventListener('click', e => {
      dataset = dataset === 'circle' ? 'xor' : 'circle';
      e.currentTarget.textContent = 'Data: ' + dataset;
      makeData(); init(); grid2 = null;
    });
    $('mlpReset').addEventListener('click', () => { init(); makeData(); grid2 = null; });
    $('mlpPause').addEventListener('click', e => {
      training = !training; e.currentTarget.textContent = training ? 'Pause' : 'Train';
    });

    init(); makeData();
    return {
      s,
      frame(now) { if (training) for (let k = 0; k < 2; k++) trainEpoch(); draw(now); },
      start(now) { cycleStart = now; }
    };
  }

  // ===========================================================================
  // FIG-02  Virology: small molecules diffuse, bind a pocket on a viral surface
  // protein, stay for an affinity-dependent residence time, then leave.
  // ===========================================================================
  function Virus() {
    const s = surface('virCanvas');
    let dG = 7, nLig = 5, mutant = false, ligs = [], bound = null, events = 0, resTimes = [];
    const trace = [];   // 1/0 samples of occupancy for the strip chart
    const TRACE_LEN = 360;

    function geom() {
      return { cx: s.W * 0.38, cy: s.H * 0.5, R: Math.min(s.W, s.H) * 0.26, pa: -0.15 };
    }
    const depth = () => (mutant ? 0.16 : 0.32);
    const width = () => (mutant ? 0.13 : 0.2);
    function radius(g, th) {
      let d = th - g.pa; d = Math.atan2(Math.sin(d), Math.cos(d));
      return g.R * (1 + 0.06 * Math.sin(3 * th + 1) + 0.04 * Math.sin(5 * th + 2) + 0.025 * Math.sin(8 * th)
        - depth() * Math.exp(-(d * d) / (2 * width() * width())));
    }
    function site(g) {
      const r = radius(g, g.pa) + 7;
      return { x: g.cx + Math.cos(g.pa) * r, y: g.cy + Math.sin(g.pa) * r };
    }
    function spawn() {
      return { x: s.W * (0.68 + Math.random() * 0.28), y: s.H * (0.4 + Math.random() * 0.3), vx: 0, vy: 0, a: Math.random() * TAU, w: gauss() * 0.02, state: 'free', t0: 0, stay: 0 };
    }
    function sync() {
      while (ligs.length < nLig) ligs.push(spawn());
      while (ligs.length > nLig) { const l = ligs.pop(); if (l === bound) bound = null; }
    }
    function release(l, now) {
      resTimes.push((now - l.t0) / 1000); if (resTimes.length > 30) resTimes.shift();
      const g = geom();
      l.state = 'free'; l.vx = Math.cos(g.pa) * 3; l.vy = Math.sin(g.pa) * 3; bound = null;
    }

    function step(now) {
      const g = geom(), st = site(g);
      const tau = 0.012 * Math.exp(0.62 * dG) * (mutant ? 0.25 : 1);   // mean residence (s)
      const pOn = mutant ? 0.12 : 0.5, pull = mutant ? 0.02 : 0.06;
      const floor = s.H - 20;
      for (const l of ligs) {
        if (l.state === 'bound') {
          l.x = lerp(l.x, st.x, 0.25); l.y = lerp(l.y, st.y, 0.25);
          l.a = lerp(l.a, g.pa + Math.PI, 0.1);
          if (now - l.t0 > l.stay) release(l, now);
          if (s.ptr && Math.hypot(s.ptr.x - l.x, s.ptr.y - l.y) < 22) release(l, now);
          continue;
        }
        l.vx = l.vx * 0.9 + gauss() * 0.75; l.vy = l.vy * 0.9 + gauss() * 0.75;
        if (s.ptr) {
          const dx = l.x - s.ptr.x, dy = l.y - s.ptr.y, r = Math.hypot(dx, dy);
          if (r < 46 && r > 0.1) { l.vx += dx / r * (46 - r) * 0.08; l.vy += dy / r * (46 - r) * 0.08; }
        }
        // short-range electrostatic steering toward the pocket
        const sx = st.x - l.x, sy = st.y - l.y, sr = Math.hypot(sx, sy);
        if (!bound && sr < 90 && sr > 1) { l.vx += sx / sr * pull * (90 - sr) / 30; l.vy += sy / sr * pull * (90 - sr) / 30; }
        l.x += l.vx; l.y += l.vy; l.a += l.w + l.vx * 0.01;
        // protein surface
        const dx = l.x - g.cx, dy = l.y - g.cy, r = Math.hypot(dx, dy), th = Math.atan2(dy, dx);
        const rs = radius(g, th) + 7;
        if (r < rs) { l.x = g.cx + dx / r * rs; l.y = g.cy + dy / r * rs; const vn = (l.vx * dx + l.vy * dy) / r; if (vn < 0) { l.vx -= 1.6 * vn * dx / r; l.vy -= 1.6 * vn * dy / r; } }
        // stalk + membrane + walls
        if (Math.abs(l.x - g.cx) < 16 && l.y > g.cy) l.x = g.cx + Math.sign(l.x - g.cx || 1) * 16;
        if (l.x < 8) { l.x = 8; l.vx = Math.abs(l.vx); }
        if (l.x > s.W - 8) { l.x = s.W - 8; l.vx = -Math.abs(l.vx); }
        if (l.y < 8) { l.y = 8; l.vy = Math.abs(l.vy); }
        if (l.y > floor - 8) { l.y = floor - 8; l.vy = -Math.abs(l.vy); }
        // binding
        if (!bound && Math.hypot(l.x - st.x, l.y - st.y) < 20 && Math.random() < pOn) {
          l.state = 'bound'; l.t0 = now; l.stay = -Math.log(Math.random()) * tau * 1000; bound = l; events++;
        }
      }
      trace.push(bound ? 1 : 0); if (trace.length > TRACE_LEN) trace.shift();
    }

    function drawLigand(ctx, l) {
      const r = 6.5;
      ctx.save(); ctx.translate(l.x, l.y); ctx.rotate(l.a);
      ctx.beginPath();
      for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; ctx[k ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r); }
      ctx.closePath();
      ctx.fillStyle = l.state === 'bound' ? c('accent', 0.25) : c('surface'); ctx.fill();
      ctx.strokeStyle = l.state === 'bound' ? c('accent') : c('fg', 0.85); ctx.lineWidth = 1.4; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(r, 0); ctx.lineTo(r + 7, 0); ctx.stroke();
      ctx.beginPath(); ctx.arc(r + 9.5, 0, 2.8, 0, TAU); ctx.fillStyle = c('accent'); ctx.fill();
      ctx.restore();
    }

    function draw(now) {
      const { ctx, W: w, H: h } = s;
      grid(s);
      const g = geom(), st = site(g);
      // membrane
      const my = h - 20;
      ctx.fillStyle = c('ink', 0.06); ctx.fillRect(0, my, w, 20);
      for (let x = 4; x < w; x += 9) {
        ctx.beginPath(); ctx.arc(x, my + 3, 2.4, 0, TAU); ctx.fillStyle = c('ink', 0.45); ctx.fill();
        ctx.beginPath(); ctx.arc(x, my + 17, 2.4, 0, TAU); ctx.fill();
      }
      text(ctx, 'VIRAL ENVELOPE', 8, my - 6, c('muted'), 9);
      // stalk
      ctx.fillStyle = c('ink', 0.1); ctx.strokeStyle = c('ink'); ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.rect(g.cx - 9, g.cy + g.R * 0.8, 18, my - g.cy - g.R * 0.8); ctx.fill(); ctx.stroke();
      // protein body
      ctx.beginPath();
      for (let k = 0; k <= 180; k++) {
        const th = k / 180 * TAU, r = radius(g, th);
        ctx[k ? 'lineTo' : 'moveTo'](g.cx + Math.cos(th) * r, g.cy + Math.sin(th) * r);
      }
      ctx.closePath(); ctx.fillStyle = c('ink', 0.1); ctx.fill(); ctx.strokeStyle = c('ink'); ctx.lineWidth = 2; ctx.stroke();
      // secondary-structure squiggles inside
      ctx.save(); ctx.clip();
      ctx.strokeStyle = c('ink', 0.28); ctx.lineWidth = 1.4;
      for (let k = -1; k <= 1; k++) {
        ctx.beginPath();
        for (let x = -g.R; x <= g.R * 0.6; x += 2) {
          const y = k * g.R * 0.42 + Math.sin(x / 5) * 4;
          ctx[x === -g.R ? 'moveTo' : 'lineTo'](g.cx + x, g.cy + y);
        }
        ctx.stroke();
      }
      ctx.restore();
      // pocket-lining residues
      for (let k = -2; k <= 2; k++) {
        const th = g.pa + k * width() * 0.9, r = radius(g, th) - 6;
        const x = g.cx + Math.cos(th) * r, y = g.cy + Math.sin(th) * r;
        ctx.beginPath(); ctx.arc(x, y, 3.6, 0, TAU);
        const mutRes = mutant && k === 1;
        ctx.fillStyle = mutRes ? c('fg') : c('accent'); ctx.fill();
        if (mutRes) text(ctx, 'MUT', x + 6, y + 14, c('fg'), 9);
      }
      text(ctx, 'VIRAL PROTEIN', g.cx - g.R * 0.62, g.cy - g.R - 10, c('muted'), 9);
      // site marker when empty
      if (!bound) {
        ctx.setLineDash([3, 3]); ctx.strokeStyle = c('accent', 0.7); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(st.x, st.y, 10, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
      }
      for (const l of ligs) drawLigand(ctx, l);
      if (s.ptr) {
        ctx.setLineDash([4, 4]); ctx.strokeStyle = c('ink', 0.35);
        ctx.beginPath(); ctx.arc(s.ptr.x, s.ptr.y, 46, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
      }
      // occupancy strip chart
      const tw = Math.min(170, w * 0.36), tx = w - tw - 14, ty = my - 46, th = 22;
      ctx.fillStyle = c('surface', 0.9); ctx.fillRect(tx - 6, ty - 16, tw + 12, th + 24);
      text(ctx, 'OCCUPANCY · 6 s', tx, ty - 5, c('muted'), 9);
      ctx.strokeStyle = c('line'); ctx.strokeRect(tx + 0.5, ty + 0.5, tw, th);
      ctx.beginPath();
      trace.forEach((v, i) => {
        const x = tx + (i + TRACE_LEN - trace.length) / TRACE_LEN * tw, y = ty + (v ? 4 : th - 4);
        ctx[i ? 'lineTo' : 'moveTo'](x, y);
      });
      ctx.strokeStyle = c('accent'); ctx.lineWidth = 1.5; ctx.stroke();

      const occ = trace.length ? trace.reduce((a, b) => a + b, 0) / trace.length : 0;
      set('virSite', mutant ? 'MUTANT' : 'WILD-TYPE');
      set('virState', bound ? 'BOUND' : 'FREE');
      set('virOcc', (occ * 100).toFixed(0) + '%');
      set('virEvents', events);
      set('virTau', resTimes.length ? (resTimes.reduce((a, b) => a + b, 0) / resTimes.length).toFixed(2) + ' s' : '—');
    }

    slider('virDG', 'virDGVal', v => '−' + v.toFixed(1), v => { dG = v; });
    slider('virN', 'virNVal', v => String(v), v => { nLig = v; sync(); });
    $('virMut').addEventListener('click', e => {
      mutant = !mutant; e.currentTarget.textContent = mutant ? 'Revert site' : 'Mutate site';
      if (bound) release(bound, performance.now());
      resTimes = [];
    });
    sync();
    return { s, frame(now) { step(now); draw(now); }, start() {} };
  }

  // ===========================================================================
  // FIG-03  Circadian modelling: a Kronauer-type van der Pol oscillator driven
  // by a 16:8 light/dark cycle. Light pulses shift phase; "jet lag" moves the
  // light schedule and the clock re-entrains over several days.
  // ===========================================================================
  function Circadian() {
    const s = surface('cirCanvas');
    const mu = 0.13, q = 1 / 3, k = 0.55, BMAX = 0.35;
    let tau = 24.2, I = 0.6, x = -0.9, xc = 0.6, t = 6, shift = 0, pulseUntil = -1;
    let hist = [], mins = [], prev = [null, null], last = 0, status = 'ENTRAINED';
    const HOURS_PER_SEC = 4, WINDOW = 72;

    const lightAt = tt => {
      const hh = ((tt + shift) % 24 + 24) % 24;
      return (hh >= 7 && hh < 23) || tt < pulseUntil;
    };
    function integrate(hours) {
      const dt = 0.02;
      for (let n = 0; n < hours / dt; n++) {
        const lit = lightAt(t);
        const B = lit ? BMAX * (t < pulseUntil ? 1.6 : I) * (1 - 0.4 * x) * (1 - 0.4 * xc) : 0;
        const dx = Math.PI / 12 * (xc + mu * (x / 3 + 4 * x ** 3 / 3 - 256 * x ** 7 / 105) + B);
        const dxc = Math.PI / 12 * (q * B * xc - (24 / (0.99729 * tau)) ** 2 * x - k * B * x);
        x += dx * dt; xc += dxc * dt; t += dt;
        if (prev[0] !== null && prev[1] < prev[0] && prev[1] < x) {
          mins.push(t - dt);
          if (mins.length > 6) mins.shift();
        }
        prev = [prev[1], x];
        if (n % 5 === 0) { hist.push({ t, x, xc, lit }); }
      }
      while (hist.length && hist[0].t < t - WINDOW) hist.shift();
      if (mins.length >= 3) {
        const local = mins.map(m => ((m + shift) % 24 + 24) % 24);
        const dd = Math.abs(((local[local.length - 1] - local[local.length - 2] + 36) % 24) - 12);
        status = dd < 0.35 ? 'ENTRAINED' : 'SHIFTING';
        if (I === 0) status = 'FREE-RUNNING';
      }
    }

    function draw() {
      const { ctx, W: w, H: h } = s;
      grid(s);
      const split = w > 460 ? 0.62 : 1;
      const ts = { x: 14, y: 134, w: w * split - 28, h: h - 170 };
      // light/dark background
      const t0 = t - WINDOW;
      for (let hh = Math.floor(t0); hh < t; hh += 0.5) {
        if (!lightAt(hh)) {
          const x0 = ts.x + (hh - t0) / WINDOW * ts.w;
          ctx.fillStyle = c('fg', 0.07); ctx.fillRect(x0, ts.y, ts.w / WINDOW * 0.5 + 0.5, ts.h);
        }
      }
      ctx.strokeStyle = c('line'); ctx.strokeRect(ts.x + 0.5, ts.y + 0.5, ts.w, ts.h);
      // trace
      ctx.beginPath();
      hist.forEach((p, i) => {
        const px = ts.x + (p.t - t0) / WINDOW * ts.w, py = ts.y + ts.h / 2 - p.x / 1.4 * ts.h / 2;
        ctx[i ? 'lineTo' : 'moveTo'](px, py);
      });
      ctx.strokeStyle = c('ink'); ctx.lineWidth = 2; ctx.stroke();
      // minima markers (core body temperature minimum)
      for (const m of mins) {
        if (m < t0) continue;
        const px = ts.x + (m - t0) / WINDOW * ts.w;
        ctx.beginPath(); ctx.moveTo(px, ts.y + ts.h + 3); ctx.lineTo(px - 4, ts.y + ts.h + 10); ctx.lineTo(px + 4, ts.y + ts.h + 10); ctx.closePath();
        ctx.fillStyle = c('accent'); ctx.fill();
      }
      text(ctx, 'x(t) · LAST 72 h', ts.x, ts.y - 8, c('muted'), 9);
      text(ctx, 'NIGHT SHADED · ▲ CBT MIN', ts.x + ts.w, ts.y - 8, c('muted'), 9, 'right');
      // phase portrait
      if (split < 1) {
        const pp = { x: w * split + 4, y: ts.y, S: Math.min(w * (1 - split) - 22, ts.h) };
        const cx = pp.x + pp.S / 2, cy = pp.y + pp.S / 2, sc = pp.S / 2 / 1.5;
        ctx.strokeStyle = c('line'); ctx.strokeRect(pp.x + 0.5, pp.y + 0.5, pp.S, pp.S);
        ctx.beginPath(); ctx.moveTo(pp.x, cy); ctx.lineTo(pp.x + pp.S, cy); ctx.moveTo(cx, pp.y); ctx.lineTo(cx, pp.y + pp.S);
        ctx.strokeStyle = c('line', 0.6); ctx.stroke();
        const recent = hist.slice(-Math.floor(hist.length * 0.5));
        recent.forEach((p, i) => {
          if (!i) return;
          const a = recent[i - 1];
          ctx.beginPath(); ctx.moveTo(cx + a.x * sc, cy - a.xc * sc); ctx.lineTo(cx + p.x * sc, cy - p.xc * sc);
          ctx.strokeStyle = p.lit ? c('ink', 0.25 + 0.6 * i / recent.length) : c('fg', 0.2 + 0.5 * i / recent.length);
          ctx.lineWidth = 1.5; ctx.stroke();
        });
        ctx.beginPath(); ctx.arc(cx + x * sc, cy - xc * sc, 5, 0, TAU);
        ctx.fillStyle = lightAt(t) ? c('ink') : c('fg'); ctx.fill();
        text(ctx, 'PHASE PLANE (x, x꜀)', pp.x, pp.y - 8, c('muted'), 9);
      }
      // sun / moon indicator
      const lit = lightAt(t);
      const ix = w - 26, iy = 30;
      ctx.beginPath(); ctx.arc(ix, iy, 9, 0, TAU);
      if (lit) {
        ctx.fillStyle = t < pulseUntil ? c('accent') : c('ink'); ctx.fill();
        for (let r = 0; r < 8; r++) { const a = r * Math.PI / 4; ctx.moveTo(ix + Math.cos(a) * 12, iy + Math.sin(a) * 12); ctx.lineTo(ix + Math.cos(a) * 16, iy + Math.sin(a) * 16); }
        ctx.strokeStyle = t < pulseUntil ? c('accent') : c('ink'); ctx.lineWidth = 1.5; ctx.stroke();
      } else {
        ctx.fillStyle = c('fg', 0.8); ctx.fill();
        ctx.beginPath(); ctx.arc(ix + 4, iy - 3, 8, 0, TAU); ctx.fillStyle = c('bg'); ctx.fill();
      }

      const local = ((t + shift) % 24 + 24) % 24;
      const hhmm = h2 => String(Math.floor(h2)).padStart(2, '0') + ':' + String(Math.floor((h2 % 1) * 60)).padStart(2, '0');
      set('cirDay', Math.floor((t + shift) / 24) + 1);
      set('cirClock', hhmm(local));
      set('cirMin', mins.length ? hhmm(((mins[mins.length - 1] + shift) % 24 + 24) % 24) : '—');
      set('cirStatus', status);
    }

    slider('cirTau', 'cirTauVal', v => v.toFixed(1) + ' h', v => { tau = v; });
    slider('cirI', 'cirIVal', v => v.toFixed(2), v => { I = v; });
    $('cirPulse').addEventListener('click', () => { pulseUntil = t + 1.5; });
    $('cirJet').addEventListener('click', () => { shift = (shift + 6) % 24; status = 'SHIFTING'; });
    integrate(24 * 4); // settle onto the cycle before first paint
    return {
      s,
      frame(now) {
        const dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016; last = now;
        integrate(dt * HOURS_PER_SEC); draw();
      },
      start(now) { last = now; }
    };
  }

  // ===========================================================================
  // FIG-04  Sequence evolution: a Wright–Fisher population of protein sequences.
  // Columns under selective pressure mutate faster; per-site Shannon entropy
  // across the population picks them out as hotspots.
  // ===========================================================================
  function Evolution() {
    const s = surface('evoCanvas');
    const AA = 'ACDEFGHIKLMNPQRSTVWY';
    const REF = 'MKTAYIAKQRQISFVKSHFSRQLEERLGLIEV';
    const L = REF.length, M = 48, ROWS = 8, THRESH = 0.3;
    let mu = 0.004, pop, rows, gen, pressure, acc = 0;

    function reset() {
      pop = Array.from({ length: M }, () => REF.split(''));
      rows = []; gen = 0;
      pressure = new Set([5, 14, 15, 24]);
    }
    function generation() {
      const next = [];
      for (let i = 0; i < M; i++) {
        const parent = pop[Math.floor(Math.random() * M)].slice();
        for (let j = 0; j < L; j++) {
          const rate = mu * (pressure.has(j) ? 14 : 0.6);
          if (Math.random() < rate) parent[j] = AA[Math.floor(Math.random() * 20)];
        }
        next.push(parent);
      }
      // weak purifying selection elsewhere: revert some neutral-site changes
      for (const sq of next) for (let j = 0; j < L; j++)
        if (!pressure.has(j) && sq[j] !== REF[j] && Math.random() < 0.02) sq[j] = REF[j];
      pop = next; gen++;
      rows.push(pop[Math.floor(Math.random() * M)].slice());
      if (rows.length > ROWS) rows.shift();
    }
    function entropy() {
      const H = [];
      for (let j = 0; j < L; j++) {
        const cnt = {};
        for (const sq of pop) cnt[sq[j]] = (cnt[sq[j]] || 0) + 1;
        let h = 0;
        for (const k in cnt) { const p = cnt[k] / M; h -= p * Math.log2(p); }
        H.push(h / Math.log2(20));
      }
      return H;
    }
    function layout() {
      const left = 44, right = s.W - 14, colW = (right - left) / L;
      return { left, colW, top: 138, rowH: Math.min(16, (s.H - 238) / (ROWS + 1)) };
    }
    s.onClick = p => {
      const { left, colW } = layout();
      const j = Math.floor((p.x - left) / colW);
      if (j < 0 || j >= L || p.y < 100) return;
      pressure.has(j) ? pressure.delete(j) : pressure.add(j);
    };

    function draw() {
      const { ctx, W: w, H: h } = s;
      grid(s);
      const { left, colW, top, rowH } = layout();
      const H = entropy();
      const fs = Math.max(8, Math.min(12, colW * 0.95));
      // hover column
      if (s.ptr && s.ptr.y > 100) {
        const j = Math.floor((s.ptr.x - left) / colW);
        if (j >= 0 && j < L) { ctx.fillStyle = c('ink', 0.07); ctx.fillRect(left + j * colW, top - 26, colW, h - top - 8); }
      }
      // pressure markers
      for (const j of pressure) {
        const x = left + j * colW + colW / 2;
        ctx.beginPath(); ctx.moveTo(x - 4, top - 24); ctx.lineTo(x + 4, top - 24); ctx.lineTo(x, top - 17); ctx.closePath();
        ctx.fillStyle = c('accent'); ctx.fill();
      }
      text(ctx, 'SEL', 8, top - 17, c('accent'), 9);
      // reference row
      ctx.font = `500 ${fs}px ${MONO}`; ctx.textAlign = 'center';
      text(ctx, 'REF', 8, top + rowH * 0.7, c('muted'), 9);
      for (let j = 0; j < L; j++) { ctx.fillStyle = c('fg'); ctx.fillText(REF[j], left + j * colW + colW / 2, top + rowH * 0.72); }
      ctx.strokeStyle = c('line'); ctx.beginPath(); ctx.moveTo(left, top + rowH + 3.5); ctx.lineTo(left + L * colW, top + rowH + 3.5); ctx.stroke();
      // alignment rows (oldest at top)
      rows.forEach((sq, r) => {
        const y = top + (r + 1) * rowH + 6;
        const age = (rows.length - 1 - r) / ROWS;
        ctx.font = `${fs}px ${MONO}`;
        for (let j = 0; j < L; j++) {
          const mutd = sq[j] !== REF[j];
          if (mutd) { ctx.fillStyle = c('ink', 0.14); ctx.fillRect(left + j * colW + 0.5, y + 1, colW - 1, rowH - 2); }
          ctx.fillStyle = mutd ? c('ink', 1 - age * 0.5) : c('muted', 0.55 - age * 0.3);
          ctx.textAlign = 'center';
          ctx.fillText(mutd ? sq[j] : '·', left + j * colW + colW / 2, y + rowH * 0.72);
        }
      });
      ctx.textAlign = 'left';
      // entropy bars
      const by = h - 22, bh = Math.min(60, by - (top + (ROWS + 1) * rowH + 6) - 14);
      ctx.strokeStyle = c('line'); ctx.beginPath(); ctx.moveTo(left, by + 0.5); ctx.lineTo(left + L * colW, by + 0.5); ctx.stroke();
      let hot = 0;
      H.forEach((v, j) => {
        const hgt = Math.min(1, v / 0.6) * bh;
        const flagged = v > THRESH; if (flagged) hot++;
        ctx.fillStyle = flagged ? c('ink') : c('ink', 0.3);
        ctx.fillRect(left + j * colW + 1.5, by - hgt, colW - 3, hgt);
      });
      const thy = by - THRESH / 0.6 * bh;
      ctx.setLineDash([4, 4]); ctx.strokeStyle = c('accent'); ctx.beginPath(); ctx.moveTo(left, thy); ctx.lineTo(left + L * colW, thy); ctx.stroke(); ctx.setLineDash([]);
      text(ctx, 'H(i)', 8, by - 4, c('muted'), 9);
      text(ctx, 'HOTSPOT THRESHOLD', left + L * colW, thy - 4, c('accent'), 9, 'right');

      let id = 0;
      for (const sq of pop) for (let j = 0; j < L; j++) if (sq[j] === REF[j]) id++;
      set('evoGen', gen.toLocaleString());
      set('evoH', (H.reduce((a, b) => a + b, 0) / L).toFixed(3));
      set('evoId', (id / (M * L) * 100).toFixed(1) + '%');
      set('evoHot', hot);
    }

    slider('evoMu', 'evoMuVal', v => (v * 1000).toFixed(1) + '‰', v => { mu = v; });
    $('evoClear').addEventListener('click', () => { pressure.clear(); });
    $('evoReset').addEventListener('click', reset);
    reset();
    let lastT = 0;
    return {
      s,
      frame(now) {
        if (now - lastT > 140) { generation(); lastT = now; }
        draw();
      },
      start(now) { lastT = now; }
    };
  }

  // ---- carousel controller ---------------------------------------------------
  const sims = [MLP(), Virus(), Circadian(), Evolution()];
  const slides = [...root.querySelectorAll('.slide')];
  const radios = [...root.querySelectorAll('input[name="domain"]')];
  const meta = slides.map(sl => ({ label: sl.dataset.label, fig: sl.dataset.fig, cap: sl.querySelector('template').innerHTML }));
  let active = 0, visible = true;

  function show(i) {
    active = i;
    slides.forEach((sl, k) => { sl.classList.toggle('active', k === i); sl.classList.toggle('before', k < i); sl.setAttribute('aria-hidden', k !== i); sl.inert = k !== i; });
    radios[i].checked = true;
    set('heroFigLabel', `[ ${meta[i].label} ]`);
    set('heroFigNum', meta[i].fig);
    $('heroCaption').innerHTML = meta[i].cap;
    sims[i].s.fit();
    sims[i].start(performance.now());
  }
  radios.forEach((r, i) => r.addEventListener('change', () => { if (r.checked) show(i); }));

  if ('IntersectionObserver' in window) new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(root);
  new ResizeObserver(() => sims[active].s.fit()).observe(root);
  Th.on(() => {});   // colours are read live via Theme.c each frame

  show(0);
  function loop(now) {
    if (visible && !document.hidden) sims[active].frame(now);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
