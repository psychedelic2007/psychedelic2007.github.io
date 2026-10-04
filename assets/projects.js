// Project cards: animated figures that only run while on screen, plus a gentle 3-D tilt.
(function () {
  const cards = [...document.querySelectorAll('.cards .card')];
  if (!cards.length) return;
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  // play/pause per card (CSS animations via .playing; SMIL via pause/unpauseAnimations)
  const io = new IntersectionObserver(entries => entries.forEach(e => {
    const on = e.isIntersecting && !reduce;
    e.target.classList.toggle('playing', on);
    e.target.querySelectorAll('svg').forEach(svg => svg.pauseAnimations && (on ? svg.unpauseAnimations() : svg.pauseAnimations()));
  }), { threshold: 0.2 });
  cards.forEach(c => {
    io.observe(c);
    c.querySelectorAll('svg').forEach(svg => svg.pauseAnimations && svg.pauseAnimations());
    c.addEventListener('transitionend', () => { if (c.classList.contains('in')) c.classList.add('settled'); }, { once: false });
  });

  // hover tilt
  if (!reduce && matchMedia('(hover: hover)').matches) {
    cards.forEach(card => {
      card.addEventListener('pointermove', e => {
        if (!card.classList.contains('settled')) return;
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform = `translate(-3px, -3px) rotateX(${(-py * 5).toFixed(2)}deg) rotateY(${(px * 6).toFixed(2)}deg)`;
      });
      card.addEventListener('pointerleave', () => { card.style.transform = ''; });
    });
  }

  // EVOLVE: per-site entropy bars that drift; sites crossing the threshold light up
  const evo = document.getElementById('evolveBars');
  if (evo) {
    const n = 23, NS = 'http://www.w3.org/2000/svg', base = 120, thr = 58;
    const hot = new Set([3, 8, 12, 17]);
    const bars = [], marks = [];
    const vals = Array.from({ length: n }, (_, i) => hot.has(i) ? 75 : 20 + Math.random() * 30);
    for (let i = 0; i < n; i++) {
      const r = document.createElementNS(NS, 'rect');
      r.setAttribute('x', 20 + i * 16); r.setAttribute('width', 10); r.setAttribute('fill', 'currentColor');
      evo.appendChild(r); bars.push(r);
      const m = document.createElementNS(NS, 'path');
      m.setAttribute('fill', 'var(--accent)');
      evo.appendChild(m); marks.push(m);
    }
    let t = 0, lastT = 0;
    const card = evo.closest('.card');
    function tick(now) {
      if (card.classList.contains('playing') && now - lastT > 60) {
        lastT = now; t += 0.06;
        for (let i = 0; i < n; i++) {
          const pull = hot.has(i) ? 70 + 22 * Math.sin(t * 0.7 + i) : 26 + 14 * Math.sin(t * 0.9 + i * 1.7);
          vals[i] += (pull - vals[i]) * 0.08 + (Math.random() - 0.5) * 3;
        }
        if (Math.random() < 0.01) {     // occasionally a new site comes under pressure
          const a = [...hot][Math.floor(Math.random() * hot.size)];
          hot.delete(a); hot.add(Math.floor(Math.random() * n));
        }
      }
      for (let i = 0; i < n; i++) {
        const h = Math.max(4, Math.min(100, vals[i])), over = h > thr;
        bars[i].setAttribute('y', base - h); bars[i].setAttribute('height', h);
        bars[i].setAttribute('opacity', over ? 1 : 0.3);
        const x = 25 + i * 16, y = base - h - 6;
        marks[i].setAttribute('d', over ? `M${x - 4} ${y - 6} L${x + 4} ${y - 6} L${x} ${y} Z` : '');
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }
})();
