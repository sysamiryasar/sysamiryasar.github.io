/* Entry effects kept separate from feature-specific modules. */
(function () {
  document.body.classList.add('is-loading');
  window.addEventListener('load', () => {
    window.setTimeout(() => { document.getElementById('siteLoader')?.classList.add('is-done'); document.body.classList.remove('is-loading'); }, 1250);
  });

  // Theme toggle
  const toggle = document.getElementById('themeToggle');
  const stored = localStorage.getItem('theme');
  if (stored) document.documentElement.setAttribute('data-theme', stored);
  else if (window.matchMedia('(prefers-color-scheme: light)').matches) document.documentElement.setAttribute('data-theme', 'light');

  toggle?.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
  });
}());
