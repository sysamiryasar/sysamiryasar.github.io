/* A self-contained cinematic teaser reel. It is an animated canvas rather than a heavy video file. */
const canvas = document.getElementById('teaserCanvas');
const film = document.querySelector('.teaser-film');
const button = document.getElementById('filmPlay');
const kind = document.body.dataset.teaser;
if (canvas && film) {
  film.prepend(canvas);
  const context = canvas.getContext('2d'); let running = true; let width = 0; let height = 0; const particles = Array.from({ length: 120 }, () => ({ x: Math.random(), y: Math.random(), z: Math.random(), speed: .08 + Math.random() * .28 }));
  const color = kind === 'sirat' ? [174,132,255] : [114,212,255];
  function resize() { const box = film.getBoundingClientRect(); width = canvas.width = Math.round(box.width * Math.min(devicePixelRatio, 1.5)); height = canvas.height = Math.round(box.height * Math.min(devicePixelRatio, 1.5)); canvas.style.width = `${box.width}px`; canvas.style.height = `${box.height}px`; }
  function draw(time) { requestAnimationFrame(draw); if (!running) return; const t = time * .00012; context.clearRect(0,0,width,height); const centerX = width / 2, centerY = height / 2; const radius = Math.min(width,height) * .29;
    const gradient = context.createRadialGradient(centerX,centerY,0,centerX,centerY,radius*1.7); gradient.addColorStop(0,`rgba(${color.join(',')},.22)`); gradient.addColorStop(.55,`rgba(${color.join(',')},.05)`); gradient.addColorStop(1,'rgba(0,0,0,0)'); context.fillStyle = gradient; context.fillRect(0,0,width,height);
    context.save(); context.translate(centerX,centerY); context.rotate(t * (kind === 'sirat' ? -.9 : .8)); context.strokeStyle = `rgba(${color.join(',')},.27)`; context.lineWidth = 1; [1, .69, .39].forEach((r,index) => { context.beginPath(); context.ellipse(0,0,radius*r,radius*r*(.43+index*.06),0,0,Math.PI*2); context.stroke(); }); context.restore();
    particles.forEach((p,index) => { p.x += Math.sin(t * 5 + index) * .00017; p.y -= p.speed * .001; if (p.y < 0) { p.y = 1; p.x = Math.random(); } const px = p.x*width, py = p.y*height, alpha = .15 + p.z*.75; context.fillStyle = `rgba(${color.join(',')},${alpha})`; context.beginPath(); context.arc(px,py,(.5+p.z*1.7)*devicePixelRatio,0,Math.PI*2); context.fill(); });
    const scan = (Math.sin(t*13)+1)/2; context.fillStyle = `rgba(${color.join(',')},.04)`; context.fillRect(0, centerY + Math.sin(t*3)*height*.15, width, 2 + scan*2);
  }
  new ResizeObserver(resize).observe(film); resize(); requestAnimationFrame(draw);
  button?.addEventListener('click', () => { running = !running; button.classList.toggle('is-paused', !running); button.setAttribute('aria-label', running ? 'Pause animated teaser' : 'Play animated teaser'); });
}
