/* Faint, drifting SILA teaser fragments — atmosphere only, never clickable. */
(function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (window.innerWidth < 780) return;

  var CLUES = ['still sealed', 'drawing closer', 'not yet.', 'under wraps', 'SI⁄LA', '003', 'soon.', 'converging', 'in silence', 'binding'];
  var POSITIONS = [
    { top: '18%', left: '4%' },
    { top: '74%', left: '6%' },
    { top: '22%', right: '5%' },
    { top: '70%', right: '4%' },
    { bottom: '9%', left: '11%' },
    { bottom: '13%', right: '9%' }
  ];

  function pick(count, from) {
    var pool = from.slice();
    var out = [];
    while (out.length < count && pool.length) {
      out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    }
    return out;
  }

  var count = 1 + Math.floor(Math.random() * 2);
  var words = pick(count, CLUES);
  var spots = pick(count, POSITIONS);

  words.forEach(function (word, i) {
    var el = document.createElement('span');
    el.className = 'sila-clue';
    el.setAttribute('aria-hidden', 'true');
    el.textContent = word;
    var pos = spots[i];
    for (var key in pos) el.style[key] = pos[key];
    el.style.animationDelay = (Math.random() * 6).toFixed(2) + 's';
    document.body.appendChild(el);
  });
}());
