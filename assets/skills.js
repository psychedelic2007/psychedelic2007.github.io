// FIG-05 Skill graph: skills grouped around their area, linked when they were
// used together in the same project or paper. Force layout, draggable nodes,
// hover/tap to see where each skill was used.
(function () {
  const svg = document.getElementById('sgSvg');
  if (!svg) return;
  const NS = 'http://www.w3.org/2000/svg';
  const detail = document.getElementById('sgDetail');
  const filters = document.getElementById('sgFilters');
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- data ------------------------------------------------------------------
  const AREAS = {
    bio:    { name: 'Comp. biology',    blurb: 'Simulating and scoring how biomolecules move and bind.' },
    ml:     { name: 'Machine learning', blurb: 'Models that learn from biological data and predict what comes next.' },
    bioinf: { name: 'Bioinformatics',   blurb: 'Making sense of sequences and genomes at scale.' },
    prog:   { name: 'Programming',      blurb: 'The languages the models and tools are written in.' },
    web:    { name: 'Web',              blurb: 'Turning research code into tools other people can use.' },
  };
  const WORK = {
    evolve:  { label: 'EVOLVE', kind: 'Project', href: '#projects' },
    simana:  { label: 'SIMANA', kind: 'Project', href: '#projects' },
    arias:   { label: 'ARIAS', kind: 'Project', href: '#projects' },
    pipe:    { label: 'Bioinformatics pipeline', kind: 'Project', href: '#projects' },
    bace1:   { label: 'Bacopa phytochemicals as BACE1 inhibitors', kind: 'Sci. Rep. 2025', href: 'https://doi.org/10.1038/s41598-025-92644-y' },
    gr:      { label: 'Houttuynia cordata vs glutathione reductase', kind: 'J. Biomol. Struct. Dyn. 2025', href: 'https://doi.org/10.1080/07391102.2023.2294181' },
    pex:     { label: 'Pexidartinib–serum albumin interaction', kind: 'J. Mol. Liq. 2024', href: 'https://doi.org/10.1016/j.molliq.2024.125869' },
    rna:     { label: 'RNA conformational selection & allostery', kind: 'J. Phys. Chem. Lett. 2024', href: 'https://doi.org/10.1021/acs.jpclett.4c00740' },
    mrf:     { label: 'Mutational response of spike variants', kind: 'J. Phys. Chem. B 2022', href: 'https://doi.org/10.1021/acs.jpcb.2c04574' },
    spike:   { label: 'Evolution of the SARS-CoV-2 spike', kind: 'ACS Omega 2023', href: 'https://doi.org/10.1021/acsomega.3c00944' },
    eda:     { label: 'Exploratory analysis of SARS-CoV-2 genomes', kind: 'Bioinf. Biol. Insights 2022', href: 'https://doi.org/10.1177/11779322221126294' },
  };
  const SKILLS = [
    ['Molecular docking', 'bio', ['bace1', 'gr', 'pex']],
    ['Structure prediction', 'bio', []],
    ['Molecular dynamics', 'bio', ['rna', 'pex', 'simana']],
    ['Viral evolution', 'bio', ['mrf', 'spike', 'evolve']],
    ['Data analysis', 'ml', ['eda', 'simana']],
    ['Deep learning', 'ml', ['arias']],
    ['Neural networks', 'ml', []],
    ['Mutation prediction', 'ml', ['evolve', 'mrf']],
    ['Sequence alignment', 'bioinf', []],
    ['Genomic analysis', 'bioinf', ['eda', 'pipe']],
    ['Phylogenetics', 'bioinf', []],
    ['Database mining', 'bioinf', []],
    ['Python', 'prog', ['evolve', 'simana', 'pipe']],
    ['MATLAB', 'prog', []],
    ['JavaScript / TS', 'prog', ['evolve']],
    ['HTML / CSS', 'prog', []],
    ['React / Next.js', 'web', ['evolve', 'simana']],
    ['Node.js', 'web', []],
    ['API development', 'web', []],
    ['Database design', 'web', []],
  ];

  // ---- graph -----------------------------------------------------------------
  const nodes = [], links = [];
  const areaIds = Object.keys(AREAS);
  areaIds.forEach(a => nodes.push({ id: a, hub: true, area: a, label: AREAS[a].name }));
  SKILLS.forEach(([label, area, used]) => nodes.push({ id: label, hub: false, area, label, used }));
  const byId = Object.fromEntries(nodes.map(n => [n.id, n]));
  nodes.forEach(n => { if (!n.hub) links.push({ s: n, t: byId[n.area], len: 58, k: 0.07 }); });
  const skills = nodes.filter(n => !n.hub);
  for (let i = 0; i < skills.length; i++) for (let j = i + 1; j < skills.length; j++) {
    const shared = skills[i].used.filter(u => skills[j].used.includes(u));
    if (shared.length) links.push({ s: skills[i], t: skills[j], len: 140, k: 0.0015, shared });
  }
  const neighbours = n => new Set(links.filter(l => l.s === n || l.t === n).map(l => (l.s === n ? l.t : l.s)));

  // ---- DOM -------------------------------------------------------------------
  const gLinks = document.createElementNS(NS, 'g'), gNodes = document.createElementNS(NS, 'g');
  svg.append(gLinks, gNodes);
  links.forEach(l => {
    l.el = document.createElementNS(NS, 'line');
    l.el.setAttribute('class', 'sg-link' + (l.shared ? ' shared' : '') + (l.hubLink ? ' hub' : ''));
    gLinks.appendChild(l.el);
  });
  nodes.forEach(n => {
    const g = document.createElementNS(NS, 'g');
    g.setAttribute('class', 'sg-node ' + (n.hub ? 'hub' : 'skill') + (n.used && n.used.length ? ' evidenced' : ''));
    g.setAttribute('tabindex', '0');
    g.setAttribute('role', 'button');
    g.setAttribute('aria-label', n.hub ? `${n.label} area` : `${n.label}, ${AREAS[n.area].name}`);
    const c = document.createElementNS(NS, 'circle');
    n.r = n.hub ? 15 : 5 + 2 * n.used.length;
    const hit = document.createElementNS(NS, 'rect');      // pointer target covering dot + label
    hit.setAttribute('class', 'hit');
    g.appendChild(hit);
    n.hit = hit;
    c.setAttribute('r', n.r);
    const t = document.createElementNS(NS, 'text');
    t.textContent = n.hub ? n.label.toUpperCase() : n.label;
    if (n.hub) { t.setAttribute('text-anchor', 'middle'); t.setAttribute('y', -n.r - 8); }
    else { t.setAttribute('x', n.r + 6); t.setAttribute('y', 4); }
    g.append(c, t);
    gNodes.appendChild(g);
    n.el = g;
    n.text = t;
  });
  // node footprint = dot + label, measured from the rendered text
  function measure() {
    nodes.forEach(n => {
      let tw = 0;
      try { tw = n.text.getComputedTextLength(); } catch (e) { tw = n.label.length * 7; }
      if (!tw) tw = n.label.length * 7;
      n.box = n.hub
        ? { l: -Math.max(tw / 2, n.r) - 4, r: Math.max(tw / 2, n.r) + 4, t: -n.r - 22, b: n.r + 4 }
        : { l: -n.r - 4, r: n.r + 6 + tw + 4, t: -Math.max(n.r, 8) - 3, b: Math.max(n.r, 8) + 3 };
      n.hit.setAttribute('x', n.box.l); n.hit.setAttribute('y', n.box.t);
      n.hit.setAttribute('width', n.box.r - n.box.l); n.hit.setAttribute('height', n.box.b - n.box.t);
    });
  }
  measure();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);

  // ---- layout ----------------------------------------------------------------
  let W = 600, H = 440, alpha = 1, started = false;
  function size() {
    const r = svg.getBoundingClientRect();
    W = r.width || 600; H = r.height || 440;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  }
  // each area hub is held near a corner of a pentagon so clusters stay readable
  function anchor(n) {
    const i = areaIds.indexOf(n.id), a = -Math.PI / 2 + i * Math.PI * 2 / areaIds.length;
    if (W < 560) return { x: W * (i % 2 ? 0.66 : 0.3), y: H * (0.1 + i * 0.2) };   // phones: zig-zag column
    return { x: W * 0.44 + Math.cos(a) * W * 0.29, y: H * 0.52 + Math.sin(a) * H * 0.32 };
  }
  function seed() {
    nodes.forEach((n, i) => {
      const a = n.hub ? areaIds.indexOf(n.id) / areaIds.length * Math.PI * 2 : Math.random() * Math.PI * 2;
      const r = n.hub ? Math.min(W, H) * 0.3 : 4;
      n.x = W / 2 + Math.cos(a) * (n.hub ? r : 1); n.y = H / 2 + Math.sin(a) * (n.hub ? r : 1);
      n.vx = n.vy = 0;
    });
    // skills start on top of their hub, then burst outward
    nodes.forEach(n => { if (!n.hub) { const h = byId[n.area]; n.x = h.x + (Math.random() - .5) * 4; n.y = h.y + (Math.random() - .5) * 4; } });
  }
  function tick() {
        for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j];
        let dx = b.x - a.x, dy = b.y - a.y, d2 = dx * dx + dy * dy || 0.01;
        const d = Math.sqrt(d2), f = (a.area === b.area ? 900 : 1800) / d2;
        dx /= d; dy /= d;
        a.vx -= dx * f * alpha; a.vy -= dy * f * alpha; b.vx += dx * f * alpha; b.vy += dy * f * alpha;
      }
    }
    // label-aware collision: push overlapping footprints apart along the shallower axis
    for (let it = 0; it < 2; it++) for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i], b = nodes[j], gap = 4;
      const ox = Math.min(a.x + a.box.r, b.x + b.box.r) - Math.max(a.x + a.box.l, b.x + b.box.l) + gap;
      const oy = Math.min(a.y + a.box.b, b.y + b.box.b) - Math.max(a.y + a.box.t, b.y + b.box.t) + gap;
      if (ox <= 0 || oy <= 0) continue;
      const wa = a.hub || a.fixed ? 0.1 : 1, wb = b.hub || b.fixed ? 0.1 : 1, sum = wa + wb;
      if (oy < ox) { const sgn = (a.y + (a.box.t + a.box.b) / 2) < (b.y + (b.box.t + b.box.b) / 2) ? -1 : 1; a.y += sgn * oy * wa / sum; b.y -= sgn * oy * wb / sum; }
      else { const sgn = (a.x + (a.box.l + a.box.r) / 2) < (b.x + (b.box.l + b.box.r) / 2) ? -1 : 1; a.x += sgn * ox * wa / sum; b.x -= sgn * ox * wb / sum; }
    }
    for (const l of links) {
      const dx = l.t.x - l.s.x, dy = l.t.y - l.s.y, d = Math.hypot(dx, dy) || 0.01;
      const f = (d - l.len) * l.k * alpha;
      if (!l.shared) { const g = 2.2; l.s.vx += dx / d * f * g; l.s.vy += dy / d * f * g; continue; }
      l.s.vx += dx / d * f; l.s.vy += dy / d * f; l.t.vx -= dx / d * f; l.t.vy -= dy / d * f;
    }
    for (const n of nodes) {
      if (n.hub) { const p = anchor(n); n.vx += (p.x - n.x) * 0.08; n.vy += (p.y - n.y) * 0.08; }
      if (n.fixed) { n.vx = n.vy = 0; continue; }
      if (!reduce) { n.vx += (Math.random() - 0.5) * 0.06; n.vy += (Math.random() - 0.5) * 0.06; }  // keep it breathing
      n.vx *= 0.82; n.vy *= 0.82;
      n.x += n.vx; n.y += n.vy;
      n.x = Math.max(6 - n.box.l, Math.min(W - 6 - n.box.r, n.x));
      n.y = Math.max(6 - n.box.t, Math.min(H - 6 - n.box.b, n.y));
    }
    alpha = Math.max(0.12, alpha * 0.985);
  }
  function render() {
    for (const l of links) {
      l.el.setAttribute('x1', l.s.x.toFixed(1)); l.el.setAttribute('y1', l.s.y.toFixed(1));
      l.el.setAttribute('x2', l.t.x.toFixed(1)); l.el.setAttribute('y2', l.t.y.toFixed(1));
    }
    for (const n of nodes) n.el.setAttribute('transform', `translate(${n.x.toFixed(1)},${n.y.toFixed(1)})`);
  }

  // ---- interaction -----------------------------------------------------------
  let selected = null, hovered = null, areaFilter = null;
  function highlight() {
    const focus = hovered || selected;
    const nb = focus ? neighbours(focus) : null;
    svg.classList.toggle('dim', !!focus || !!areaFilter);
    nodes.forEach(n => {
      const on = focus ? (n === focus || nb.has(n)) : areaFilter ? n.area === areaFilter : false;
      n.el.classList.toggle('on', on);
      n.el.classList.toggle('focus', n === focus);
    });
    links.forEach(l => {
      const on = focus ? (l.s === focus || l.t === focus) : areaFilter ? (l.s.area === areaFilter && l.t.area === areaFilter && !l.hubLink) : false;
      l.el.classList.toggle('on', on);
    });
    showDetail(focus);
  }
  function showDetail(n) {
    if (!n) {
      const evidenced = skills.filter(s => s.used.length).length;
      detail.innerHTML = `<div class="label blue">[ ${skills.length} skills · ${areaIds.length} areas ]</div>
        <h3>Pick a node</h3>
        <p>Filled nodes link to a project or paper that used them (${evidenced} of ${skills.length}); bigger means more. Dashed lines join skills used together in the same piece of work.</p>`;
      return;
    }
    if (n.hub) {
      const list = skills.filter(s => s.area === n.id);
      detail.innerHTML = `<div class="label blue">[ Area ]</div><h3>${AREAS[n.id].name}</h3><p>${AREAS[n.id].blurb}</p>
        <ul class="sg-tags">${list.map(s => `<li>${s.label}</li>`).join('')}</ul>`;
      return;
    }
    const used = n.used.map(u => WORK[u]);
    detail.innerHTML = `<div class="label blue">[ ${AREAS[n.area].name} ]</div><h3>${n.label}</h3>` +
      (used.length
        ? `<div class="sg-sub">Used in</div><ul class="sg-work">${used.map(w =>
            `<li><a href="${w.href}"${w.href.startsWith('http') ? ' target="_blank" rel="noopener"' : ''}>${w.label}</a><span>${w.kind}</span></li>`).join('')}</ul>`
        : `<p>${AREAS[n.area].blurb}</p>`) +
      `<div class="sg-sub">Linked skills</div><ul class="sg-tags">${[...neighbours(n)].filter(m => !m.hub).map(m => `<li>${m.label}</li>`).join('') || '<li>—</li>'}</ul>`;
  }

  nodes.forEach(n => {
    n.el.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') { hovered = n; highlight(); } });
    n.el.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') { hovered = null; highlight(); } });
    n.el.addEventListener('focus', () => { hovered = n; highlight(); });
    n.el.addEventListener('blur', () => { hovered = null; highlight(); });
    n.el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selected = selected === n ? null : n; highlight(); } });
    // drag (click without moving = select)
    n.el.addEventListener('pointerdown', e => {
      e.preventDefault();
      n.el.setPointerCapture(e.pointerId);
      const start = { x: e.clientX, y: e.clientY }; let moved = false;
      const rect = svg.getBoundingClientRect();
      const move = ev => {
        if (Math.hypot(ev.clientX - start.x, ev.clientY - start.y) > 4) moved = true;
        if (!moved) return;
        n.fixed = true; n.x = ev.clientX - rect.left; n.y = ev.clientY - rect.top; alpha = Math.max(alpha, 0.5);
      };
      const up = () => {
        n.el.removeEventListener('pointermove', move); n.el.removeEventListener('pointerup', up);
        n.fixed = false;
        if (!moved) { selected = selected === n ? null : n; hovered = e.pointerType === 'mouse' ? n : null; highlight(); }
      };
      n.el.addEventListener('pointermove', move); n.el.addEventListener('pointerup', up);
    });
  });
  svg.addEventListener('pointerdown', e => { if (e.target === svg) { selected = null; highlight(); } });

  filters.innerHTML = `<button class="chip" type="button" data-a="" aria-pressed="true">All</button>` +
    areaIds.map(a => `<button class="chip" type="button" data-a="${a}" aria-pressed="false">${AREAS[a].name}</button>`).join('');
  filters.addEventListener('click', e => {
    const b = e.target.closest('.chip'); if (!b) return;
    areaFilter = b.dataset.a || null; selected = null;
    filters.querySelectorAll('.chip').forEach(c => c.setAttribute('aria-pressed', c === b));
    highlight();
  });

  // ---- run: burst open the first time it scrolls into view ---------------------
  let visible = false;
  size(); seed(); render(); showDetail(null);
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible && !started) { started = true; alpha = 1; }
  }, { threshold: 0.25 }).observe(svg);
  new ResizeObserver(() => { const oW = W, oH = H; size(); nodes.forEach(n => { n.x *= W / oW; n.y *= H / oH; }); alpha = Math.max(alpha, 0.4); }).observe(svg);
  if (reduce) { for (let i = 0; i < 400; i++) tick(); render(); }
  (function loop() {
    if (visible && started && !reduce) { tick(); render(); }
    requestAnimationFrame(loop);
  })();
})();
