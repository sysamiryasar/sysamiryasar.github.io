/* Wires the film-play control to the trailer video. */
const video = document.querySelector('.teaser-video');
const button = document.getElementById('filmPlay');
if (video && button) {
  video.play().catch(() => {});
  button.addEventListener('click', () => {
    if (video.paused) { video.play(); button.classList.remove('is-paused'); button.setAttribute('aria-label', 'Pause trailer'); }
    else { video.pause(); button.classList.add('is-paused'); button.setAttribute('aria-label', 'Play trailer'); }
  });
}
