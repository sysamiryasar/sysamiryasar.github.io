/* Scroll-driven motion, counters, magnetic controls, and card lighting. */
(function () {
  if (!window.gsap) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);
  const splitTargets = document.querySelectorAll('.split-reveal');
  splitTargets.forEach((element) => {
    if (!window.SplitType || reduced) { element.style.visibility = 'visible'; return; }
    const split = new SplitType(element, { types: 'lines,chars', tagName: 'span' });
    element.style.visibility = 'visible';
    gsap.to(split.chars, { y: 0, duration: .95, stagger: .012, ease: 'power4.out', scrollTrigger: { trigger: element, start: 'top 88%', once: true } });
  });
  gsap.utils.toArray('.reveal-up').forEach((element) => gsap.to(element, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.1, ease: 'power3.out', scrollTrigger: { trigger: element, start: 'top 90%', once: true } }));
  gsap.utils.toArray('.system-card').forEach((card, index) => gsap.from(card, { y: 55, opacity: 0, duration: .9, delay: index * .08, ease: 'power3.out', scrollTrigger: { trigger: '.system-rail', start: 'top 85%', once: true } }));
  gsap.utils.toArray('.pricing-card').forEach((card, index) => gsap.from(card, { y: 55, opacity: 0, duration: .9, delay: index * .08, ease: 'power3.out', scrollTrigger: { trigger: '.pricing-grid', start: 'top 85%', once: true } }));
  gsap.utils.toArray('.metric strong').forEach((counter) => {
    const end = Number(counter.dataset.count || 0), suffix = counter.dataset.suffix || '';
    const value = { n: 0 };
    gsap.to(value, { n: end, duration: 1.8, ease: 'power2.out', snap: { n: 1 }, scrollTrigger: { trigger: counter, start: 'top 88%', once: true }, onUpdate: () => { counter.textContent = `${value.n}${suffix}`; } });
  });
  if (!reduced) {
    document.querySelectorAll('.magnetic').forEach((item) => {
      item.addEventListener('pointermove', (event) => { const box = item.getBoundingClientRect(); gsap.to(item, { x: (event.clientX - box.left - box.width / 2) * .12, y: (event.clientY - box.top - box.height / 2) * .12, duration: .35, ease: 'power2.out' }); });
      item.addEventListener('pointerleave', () => gsap.to(item, { x: 0, y: 0, duration: .7, ease: 'elastic.out(1, .35)' }));
    });
    document.querySelectorAll('.tilt-card').forEach((card) => {
      card.addEventListener('pointermove', (event) => { const box = card.getBoundingClientRect(); const rx = (event.clientY - box.top) / box.height - .5; const ry = (event.clientX - box.left) / box.width - .5; gsap.to(card, { rotateX: -rx * 4, rotateY: ry * 4, transformPerspective: 900, duration: .45, ease: 'power2.out' }); });
      card.addEventListener('pointerleave', () => gsap.to(card, { rotateX: 0, rotateY: 0, duration: .8, ease: 'elastic.out(1,.45)' }));
    });
    gsap.to('.hero-orbit', { rotate: 13, xPercent: -3, scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 1.4 } });
  }
}());
