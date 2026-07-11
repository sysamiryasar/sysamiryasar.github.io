/* A lightweight cursor that never runs on touch devices. */
(function () {
  const cursor = document.getElementById('cursor');
  if (!cursor || !window.matchMedia('(pointer:fine)').matches) return;
  let x = -100, y = -100, cx = -100, cy = -100;
  window.addEventListener('pointermove', (event) => { x = event.clientX; y = event.clientY; }, { passive: true });
  document.querySelectorAll('a, button, .tilt-card').forEach((item) => {
    item.addEventListener('pointerenter', () => cursor.classList.add('is-active'));
    item.addEventListener('pointerleave', () => cursor.classList.remove('is-active'));
  });
  (function draw() { cx += (x - cx) * .22; cy += (y - cy) * .22; cursor.style.transform = `translate3d(${cx}px, ${cy}px, 0) translate(-50%, -50%)`; requestAnimationFrame(draw); }());
}());
