/* A self-contained animated galaxy standing in for the future teaser video. */
const canvas = document.getElementById('teaserCanvas');
const film = document.querySelector('.teaser-film');
const button = document.getElementById('filmPlay');
const kind = document.body.dataset.teaser;
if (canvas && film) {
  film.prepend(canvas);
  const context = canvas.getContext('2d'); let running = true; let width = 0; let height = 0;
  const color = kind === 'sirat' ? [174,132,255] : [114,212,255];
  const stars = Array.from({ length: 220 }, () => ({ x: Math.random(), y: Math.random(), z: Math.random(), speed: .015 + Math.random() * .09, twinkle: Math.random() * Math.PI * 2 }));
  const dust = Array.from({ length: 110 }, (_, i) => { const arm = i % 3; return { angle: arm * ((Math.PI * 2) / 3) + (i / 110) * Math.PI * 2.6, r: .1 + (i / 110) * .82, size: .35 + Math.random() * 1.1, wobble: (Math.random() - .5) * .05 }; });
  function resize() { const box = film.getBoundingClientRect(); width = canvas.width = Math.round(box.width * Math.min(devicePixelRatio, 1.5)); height = canvas.height = Math.round(box.height * Math.min(devicePixelRatio, 1.5)); canvas.style.width = `${box.width}px`; canvas.style.height = `${box.height}px`; }
  function draw(time) { requestAnimationFrame(draw); if (!running) return; const t = time * .00012; context.clearRect(0,0,width,height); const centerX = width / 2, centerY = height / 2; const radius = Math.min(width,height) * .34;
    const core = context.createRadialGradient(centerX,centerY,0,centerX,centerY,radius*1.9); core.addColorStop(0,`rgba(${color.join(',')},.32)`); core.addColorStop(.45,`rgba(${color.join(',')},.1)`); core.addColorStop(1,'rgba(0,0,0,0)'); context.fillStyle = core; context.fillRect(0,0,width,height);
    context.save(); context.translate(centerX,centerY); context.rotate(t * (kind === 'sirat' ? -.5 : .42)); context.globalCompositeOperation = 'lighter';
    dust.forEach((d) => { const rr = radius * d.r; const px = Math.cos(d.angle) * rr; const py = Math.sin(d.angle) * rr * .4 + d.wobble * radius; const size = radius * .05 * d.size; const g = context.createRadialGradient(px,py,0,px,py,size); g.addColorStop(0,`rgba(${color.join(',')},.24)`); g.addColorStop(1,'rgba(0,0,0,0)'); context.fillStyle = g; context.beginPath(); context.arc(px,py,size,0,Math.PI*2); context.fill(); });
    context.globalCompositeOperation = 'source-over'; context.strokeStyle = `rgba(${color.join(',')},.2)`; context.lineWidth = 1; context.beginPath(); context.ellipse(0,0,radius*1.1,radius*1.1*.4,0,0,Math.PI*2); context.stroke(); context.restore();
    stars.forEach((s,index) => { s.x += Math.sin(t * 4 + index) * .00008; s.y -= s.speed * .0015; if (s.y < 0) { s.y = 1; s.x = Math.random(); } const px = s.x*width, py = s.y*height; const twinkle = .5 + .5 * Math.sin(time * .002 + s.twinkle); const alpha = (.2 + s.z*.7) * twinkle; context.fillStyle = s.z > .82 ? `rgba(${color.join(',')},${alpha})` : `rgba(255,255,255,${alpha})`; context.beginPath(); context.arc(px,py,(.4+s.z*1.6)*devicePixelRatio,0,Math.PI*2); context.fill(); });
    const scan = (Math.sin(t*13)+1)/2; context.fillStyle = `rgba(${color.join(',')},.04)`; context.fillRect(0, centerY + Math.sin(t*3)*height*.15, width, 2 + scan*2);
  }
  new ResizeObserver(resize).observe(film); resize(); requestAnimationFrame(draw);
  button?.addEventListener('click', () => { running = !running; button.classList.toggle('is-paused', !running); button.setAttribute('aria-label', running ? 'Pause animated teaser' : 'Play animated teaser'); });
}
