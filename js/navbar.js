/* Glass navigation, command navigation, and mobile menu. */
(function () {
  const navbar = document.getElementById('navbar');
  const panel = document.getElementById('commandPanel');
  const trigger = document.getElementById('searchButton');
  const menu = document.getElementById('menuButton');
  if (navbar) window.addEventListener('scroll', () => navbar.classList.toggle('is-scrolled', window.scrollY > 28), { passive: true });
  const close = () => { panel?.classList.remove('is-open'); panel?.setAttribute('aria-hidden', 'true'); trigger?.focus(); menu?.setAttribute('aria-expanded', 'false'); };
  const open = () => { panel?.classList.add('is-open'); panel?.setAttribute('aria-hidden', 'false'); menu?.setAttribute('aria-expanded', 'true'); };
  trigger?.addEventListener('click', open); menu?.addEventListener('click', () => panel?.classList.contains('is-open') ? close() : open());
  document.querySelectorAll('[data-close-command], [data-command-link]').forEach((node) => node.addEventListener('click', close));
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') close(); if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); open(); } });

  const sectionNav = document.getElementById('sectionNav');
  if (sectionNav && window.IntersectionObserver) {
    const map = new Map();
    sectionNav.querySelectorAll('[data-section-link]').forEach((link) => {
      const target = document.querySelector(link.getAttribute('href'));
      if (target) map.set(target, link);
    });
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => map.get(entry.target)?.classList.toggle('is-active', entry.isIntersecting));
    }, { rootMargin: '-40% 0px -55% 0px' });
    map.forEach((_, target) => observer.observe(target));
  }
}());
