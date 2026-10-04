// Specimen rail: a 3-D particle "specimen" pinned to the right edge.
// Each section has its own specimen. Scrolling past a section blows the current
// one apart and reassembles the particles as the next; scrolling up runs it back.
// Position is a pure function of scroll, so the effect is fully reversible.
(function () {
  const rail = document.getElementById('rail');
  if (!rail) return;
  const canvas = rail.querySelector('canvas'), ctx = canvas.getContext('2d');
  const Th = window.Theme;
  const N = 240, TAU = Math.PI * 2;
  const wide = matchMedia('(min-width: 1200px)');
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  // deterministic RNG so shapes are identical on every load
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

  // ---- shape generators: each returns {pts:[[x,y,z]...N], edges:[[i,j]...]} ----
  function helix() {
    const pts = [], edges = [], per = 80, turns = 2.6;
    for (let s = 0; s < 2; s++) for (let i = 0; i < per; i++) {
      const t = i / (per - 1), a = t * turns * TAU + s * Math.PI;
      pts.push([Math.cos(a) * 0.42, t * 2.3 - 1.15, Math.sin(a) * 0.42]);
      if (i) edges.push([s * per + i - 1, s * per + i]);
    }
    for (let r = 0; r < 40; r++) {           // base-pair rungs, 2 interior points each
      const i = Math.round(r / 39 * (per - 1)), A = pts[i], B = pts[per + i];
      const k = pts.length;
      pts.push([A[0] + (B[0] - A[0]) / 3, A[1], A[2] + (B[2] - A[2]) / 3]);
      pts.push([A[0] + (B[0] - A[0]) * 2 / 3, A[1], A[2] + (B[2] - A[2]) * 2 / 3]);
      edges.push([i, k], [k, k + 1], [k + 1, per + i]);
    }
    return { pts, edges };
  }
  function fib(n, r) {
    const out = [], g = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < n; i++) {
      const y = 1 - (i / (n - 1)) * 2, rr = Math.sqrt(1 - y * y), th = g * i;
      out.push([Math.cos(th) * rr * r, y * r, Math.sin(th) * rr * r]);
    }
    return out;
  }
  function capsid() {
    const shell = fib(180, 0.72), edges = [];
    for (let i = 0; i < shell.length; i++) {           // 3 nearest neighbours
      const d = shell.map((p, j) => [j, (p[0] - shell[i][0]) ** 2 + (p[1] - shell[i][1]) ** 2 + (p[2] - shell[i][2]) ** 2])
        .filter(([j]) => j > i).sort((a, b) => a[1] - b[1]).slice(0, 2);
      d.forEach(([j]) => edges.push([i, j]));
    }
    const pts = shell.slice();
    fib(20, 1).forEach(u => {                            // spike proteins
      let base = 0, best = 9;
      shell.forEach((p, j) => { const dd = (p[0] - u[0] * .72) ** 2 + (p[1] - u[1] * .72) ** 2 + (p[2] - u[2] * .72) ** 2; if (dd < best) { best = dd; base = j; } });
      let prev = base;
      [0.86, 0.98].forEach(r => { pts.push(u.map(v => v * r)); edges.push([prev, pts.length - 1]); prev = pts.length - 1; });
      const k = pts.length;
      pts.push(u.map(v => v * 1.06)); edges.push([prev, k]);
    });
    return { pts, edges };
  }
  function network() {
    const layers = [[3, 3], [7, 7], [8, 8], [7, 7], [4, 4]];   // 9+49+64+49+16 = 187
    const pts = [], idx = [], edges = [];
    layers.forEach(([a, b], l) => {
      const ids = [], x = -0.9 + l * 0.45;
      for (let i = 0; i < a; i++) for (let j = 0; j < b; j++) {
        ids.push(pts.length);
        pts.push([x, (i - (a - 1) / 2) * 0.17, (j - (b - 1) / 2) * 0.17]);
      }
      idx.push(ids);
    });
    for (let l = 0; l < idx.length - 1; l++)
      idx[l + 1].forEach(j => { for (let k = 0; k < 2; k++) edges.push([idx[l][Math.floor(rnd() * idx[l].length)], j]); });
    return { pts, edges };
  }
  function limitCycle() {
    const pts = [], edges = [], n = 240;
    for (let i = 0; i < n; i++) {                       // a coil wound round a ring: 24 oscillations per cycle
      const t = i / n * TAU, R = 0.7, r = 0.16;
      const w = t * 24;
      pts.push([(R + r * Math.cos(w)) * Math.cos(t), r * Math.sin(w) * 1.3, (R + r * Math.cos(w)) * Math.sin(t)]);
      edges.push([i, (i + 1) % n]);
    }
    return { pts, edges };
  }
  function globule() {
    const pts = [[0, 0, 0]], edges = [];
    while (pts.length < N) {
      const p = pts[pts.length - 1];
      let q, tries = 0;
      do {
        const u = rnd() * 2 - 1, th = rnd() * TAU, s = Math.sqrt(1 - u * u);
        q = [p[0] + s * Math.cos(th) * 0.13, p[1] + u * 0.13, p[2] + s * Math.sin(th) * 0.13];
        tries++;
      } while ((Math.hypot(...q) > 0.75 || pts.some(o => (o[0] - q[0]) ** 2 + (o[1] - q[1]) ** 2 + (o[2] - q[2]) ** 2 < 0.0049)) && tries < 60);
      edges.push([pts.length - 1, pts.length]);
      pts.push(q);
    }
    return { pts, edges };
  }

  // pad/trim every shape to exactly N points; spare points sit on existing ones
  function normalise(sh) {
    const pts = sh.pts.slice(0, N);
    let k = 0;
    while (pts.length < N) pts.push(sh.pts[(k++ * 7) % sh.pts.length].slice());
    return { pts, edges: sh.edges.filter(([a, b]) => a < N && b < N) };
  }

  const SPECIMENS = [
    { id: 'top',          name: 'DNA double helix', sub: 'sequence → structure → function', make: helix },
    { id: 'publications', name: 'Viral capsid',     sub: 'spike proteins on an envelope',   make: capsid },
    { id: 'projects',     name: 'Neural network',   sub: 'layers of learned weights',       make: network },
    { id: 'path',         name: 'Limit cycle',      sub: 'an oscillator, period ≈ 24 h',    make: limitCycle },
    { id: 'toolkit',      name: 'Folded chain',     sub: 'a protein finds its shape',       make: globule },
  ].filter(s => document.getElementById(s.id));
  SPECIMENS.forEach(s => { s.shape = normalise(s.make()); });

  // each particle gets a fixed explosion direction and strength
  const dir = Array.from({ length: N }, () => {
    const u = rnd() * 2 - 1, th = rnd() * TAU, s = Math.sqrt(1 - u * u);
    return [s * Math.cos(th), u, s * Math.sin(th), 0.6 + rnd() * 1.1];
  });

  const nameEl = document.getElementById('railName'), subEl = document.getElementById('railSub');
  const idxEl = document.getElementById('railIdx'), stateEl = document.getElementById('railState'), expEl = document.getElementById('railExp');
  const ticks = document.getElementById('railTicks');
  ticks.innerHTML = SPECIMENS.map(() => '<i></i>').join('');

  let W = 0, H = 0, anchors = [], shown = 0, target = 0, rot = 0, last = 0, labelIdx = -1;

  function fit() {
    const r = canvas.parentElement.getBoundingClientRect();
    if (!r.width) return;
    const dpr = window.devicePixelRatio || 1;
    W = r.width; H = r.height;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    measure();
  }
  function measure() {
    anchors = SPECIMENS.map(s => {
      const el = document.getElementById(s.id);
      return s.id === 'top' ? 0 : el.getBoundingClientRect().top + scrollY;
    });
  }
  // scroll → continuous index. Hold each specimen for 55% of its section, then morph.
  function progress() {
    const y = scrollY + innerHeight * 0.45;
    for (let k = 0; k < anchors.length - 1; k++) {
      if (y < anchors[k + 1]) {
        const f = (y - anchors[k]) / (anchors[k + 1] - anchors[k]);
        return k + Math.max(0, Math.min(1, (f - 0.55) / 0.45));
      }
    }
    return anchors.length - 1;
  }
  const ease = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

  function draw() {
    ctx.clearRect(0, 0, W, H);
    const k = Math.min(SPECIMENS.length - 1, Math.floor(shown));
    const t = shown - k, A = SPECIMENS[k].shape, B = SPECIMENS[Math.min(SPECIMENS.length - 1, k + 1)].shape;
    const e = ease(t), boom = Math.sin(Math.PI * t);         // 0 → 1 → 0 across the transition
    const scale = Math.min(W, H) * 0.36, cx = W / 2, cy = H / 2;
    const cosr = Math.cos(rot), sinr = Math.sin(rot), tilt = 0.32, ct = Math.cos(tilt), st = Math.sin(tilt);

    const proj = new Array(N);
    for (let i = 0; i < N; i++) {
      const a = A.pts[i], b = B.pts[i], d = dir[i];
      const m = boom * 0.95 * d[3];
      let x = a[0] + (b[0] - a[0]) * e + d[0] * m;
      let y = a[1] + (b[1] - a[1]) * e + d[1] * m;
      let z = a[2] + (b[2] - a[2]) * e + d[2] * m;
      // spin each particle a little while it's in flight
      const sw = boom * d[3] * 1.2, cs = Math.cos(sw), sn = Math.sin(sw);
      [x, z] = [x * cs - z * sn, x * sn + z * cs];
      // view rotation
      [x, z] = [x * cosr - z * sinr, x * sinr + z * cosr];
      [y, z] = [y * ct - z * st, y * st + z * ct];
      const f = 3 / (3 + z);
      proj[i] = { x: cx + x * scale * f, y: cy + y * scale * f, z, f };
    }

    // bonds fade out as the specimen comes apart
    const bondAlpha = Math.pow(1 - boom, 3);
    if (bondAlpha > 0.02) {
      const sh = t < 0.5 ? A : B;
      ctx.strokeStyle = Th.c('ink', 0.28 * bondAlpha); ctx.lineWidth = 1;
      ctx.beginPath();
      for (const [i, j] of sh.edges) { ctx.moveTo(proj[i].x, proj[i].y); ctx.lineTo(proj[j].x, proj[j].y); }
      ctx.stroke();
    }
    const order = proj.map((p, i) => i).sort((i, j) => proj[j].z - proj[i].z);
    for (const i of order) {
      const p = proj[i];
      const depth = Math.max(0, Math.min(1, (p.z + 1.2) / 2.4));
      ctx.beginPath(); ctx.arc(p.x, p.y, (1.3 + 1.9 * (1 - depth)) * p.f, 0, TAU);
      ctx.fillStyle = boom > 0.15 && dir[i][3] > 1.45 ? Th.c('accent', 0.9 - depth * 0.5) : Th.c('ink', 0.95 - depth * 0.6);
      ctx.fill();
    }

    const near = Math.round(shown);
    if (near !== labelIdx) {
      labelIdx = near;
      const s = SPECIMENS[near];
      nameEl.textContent = s.name; subEl.textContent = s.sub;
      idxEl.textContent = String(near + 1).padStart(2, '0') + ' / ' + String(SPECIMENS.length).padStart(2, '0');
      [...ticks.children].forEach((el, i) => el.classList.toggle('on', i <= near));
    }
    stateEl.textContent = boom < 0.03 ? 'ASSEMBLED' : (t < 0.5 ? 'DISASSEMBLING' : 'REASSEMBLING');
    expEl.textContent = Math.round(boom * 100) + '%';
  }

  function loop(now) {
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0; last = now;
    target = progress();
    shown += (target - shown) * (reduce ? 1 : 0.12);
    if (Math.abs(target - shown) < 0.0005) shown = target;
    if (!reduce) rot += dt * 0.28;
    if (W && wide.matches) draw();
    requestAnimationFrame(loop);
  }

  new ResizeObserver(fit).observe(canvas.parentElement);
  new ResizeObserver(measure).observe(document.body);
  addEventListener('load', measure);
  fit();
  requestAnimationFrame(loop);
})();
