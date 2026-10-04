// Shared behaviour: theme, scroll reveal, active nav link, publication rendering.

// Theme: light/dark. Pages set data-theme early from localStorage (see <head>);
// without a stored choice we follow the OS. Canvas figures read colours from here.
window.Theme = (function () {
  const root = document.documentElement;
  const mq = window.matchMedia ? matchMedia('(prefers-color-scheme: dark)') : null;
  const listeners = [];
  let cache = null;
  const keys = ['ink', 'fg', 'muted', 'bg', 'surface', 'line', 'accent', 'teal'];

  function current() {
    return root.dataset.theme || (mq && mq.matches ? 'dark' : 'light');
  }
  function colors() {
    if (cache) return cache;
    const cs = getComputedStyle(root);
    cache = {};
    keys.forEach(k => { cache[k] = cs.getPropertyValue('--rgb-' + k).trim() || '0 0 0'; });
    return cache;
  }
  function changed() { cache = null; listeners.forEach(fn => fn(current())); }
  function set(t) {
    root.dataset.theme = t;
    try { localStorage.setItem('theme', t); } catch (e) { /* storage blocked */ }
    changed();
  }
  if (mq && mq.addEventListener) mq.addEventListener('change', () => { if (!root.dataset.theme) changed(); });

  document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('themeToggle');
    if (btn) btn.addEventListener('click', () => set(current() === 'dark' ? 'light' : 'dark'));
  });

  return {
    current, colors, set,
    on(fn) { listeners.push(fn); },
    // rgb(... / a) string for canvas
    c(name, a = 1) { return `rgb(${colors()[name]} / ${a})`; }
  };
})();

(function () {
  // Reveal on scroll
  const items = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0.12 });
    items.forEach(el => io.observe(el));
  } else {
    items.forEach(el => el.classList.add('in'));
  }

  // Highlight the nav link for the section in view
  const links = [...document.querySelectorAll('.nav-links a[href^="#"]')];
  const sections = links.map(a => document.querySelector(a.getAttribute('href'))).filter(Boolean);
  if (sections.length && 'IntersectionObserver' in window) {
    const so = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        links.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + e.target.id));
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach(s => so.observe(s));
  }

  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
})();

// Publication helpers, used by index.html and publications.html
window.Pubs = {
  esc(s) {
    return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  },
  isDoi(d) { return /^10\.\d{4,}\//.test(d); },
  render(p, index, total, opts = {}) {
    const e = this.esc;
    const authors = e(p.authors).replace(/Sangeet S/g, '<b>Sangeet S</b>');
    const m = p.journal.match(/^(.*?)\s*\((under review|in press|preprint)\)\s*$/i);
    const journal = m ? `${e(m[1])}<span class="tag-status">${e(m[2])}</span>` : e(p.journal);
    const href = this.isDoi(p.doi) ? `https://doi.org/${p.doi}` : null;
    const title = href ? `<a href="${href}" target="_blank" rel="noopener">${e(p.title)}</a>` : e(p.title);
    const num = String(total - index).padStart(2, '0');
    const abstract = opts.abstract && p.abstract
      ? `<details><summary>Abstract</summary><p>${e(p.abstract)}</p></details>` : '';
    const doi = href
      ? `<a class="doi" href="${href}" target="_blank" rel="noopener">DOI ↗</a>`
      : `<span class="doi">${e(p.doi)}</span>`;
    return `<li class="pub">
      <div class="ref">[${num}]<small>${p.year}</small></div>
      <div>
        <h3>${title}</h3>
        <div class="authors">${authors}</div>
        <div class="journal">${journal}</div>
        ${abstract}
      </div>
      ${doi}
    </li>`;
  }
};
