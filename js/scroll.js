/* Smooth scrolling with a native fallback. */
(function () {
  if (!window.Lenis || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const lenis = new Lenis({ duration: 1.15, smoothWheel: true, syncTouch: false, easing: (t) => 1 - Math.pow(1 - t, 4) });
  window.lenis = lenis;
  function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
  requestAnimationFrame(raf);
  document.querySelectorAll('a[href^="#"]').forEach((link) => link.addEventListener('click', (event) => {
    const target = document.querySelector(link.getAttribute('href'));
    if (!target) return;
    event.preventDefault(); lenis.scrollTo(target, { offset: -86, duration: 1.2 });
  }));
}());
