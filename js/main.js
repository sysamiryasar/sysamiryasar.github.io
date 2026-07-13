/* Entry effects kept separate from feature-specific modules. */
(function () {
  document.body.classList.add('is-loading');
  window.addEventListener('load', () => {
    window.setTimeout(() => { document.getElementById('siteLoader')?.classList.add('is-done'); document.body.classList.remove('is-loading'); }, 1250);
  });
}());
