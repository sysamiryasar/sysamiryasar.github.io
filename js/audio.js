/* A very quiet, procedurally generated ambient drone. No audio file — built entirely
   from oscillators + filtered noise, since autoplay policy requires a gesture anyway. */
(function () {
  const button = document.getElementById('audioToggle');
  if (!button) return;

  let ctx = null, master = null, playing = false;

  function whiteNoiseBuffer(context) {
    const buffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  function start() {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.setValueAtTime(0, ctx.currentTime);
    master.gain.linearRampToValueAtTime(0.07, ctx.currentTime + 2.2);
    master.connect(ctx.destination);

    [55, 82.4].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = i === 0 ? 'triangle' : 'sine';
      osc.frequency.value = freq;
      const gain = ctx.createGain();
      gain.gain.value = i === 0 ? 0.55 : 0.32;
      osc.connect(gain).connect(master);
      osc.start();
    });

    const shimmer = ctx.createOscillator();
    shimmer.type = 'sine'; shimmer.frequency.value = 220;
    const shimmerGain = ctx.createGain(); shimmerGain.gain.value = 0;
    const shimmerLfo = ctx.createOscillator(); shimmerLfo.frequency.value = 0.07;
    const shimmerLfoGain = ctx.createGain(); shimmerLfoGain.gain.value = 0.05;
    shimmerLfo.connect(shimmerLfoGain).connect(shimmerGain.gain);
    shimmer.connect(shimmerGain).connect(master);
    shimmer.start(); shimmerLfo.start();

    const noise = ctx.createBufferSource();
    noise.buffer = whiteNoiseBuffer(ctx); noise.loop = true;
    const bandpass = ctx.createBiquadFilter();
    bandpass.type = 'bandpass'; bandpass.frequency.value = 700; bandpass.Q.value = 0.6;
    const filterLfo = ctx.createOscillator(); filterLfo.frequency.value = 0.045;
    const filterLfoGain = ctx.createGain(); filterLfoGain.gain.value = 380;
    filterLfo.connect(filterLfoGain).connect(bandpass.frequency);
    const noiseGain = ctx.createGain(); noiseGain.gain.value = 0.05;
    noise.connect(bandpass).connect(noiseGain).connect(master);
    noise.start(); filterLfo.start();

    playing = true;
  }

  function stop() {
    if (!ctx) return;
    const now = ctx.currentTime;
    master.gain.linearRampToValueAtTime(0, now + 0.8);
    const dyingCtx = ctx;
    setTimeout(() => dyingCtx.close(), 900);
    ctx = null; master = null; playing = false;
  }

  button.addEventListener('click', () => {
    if (playing) stop(); else start();
    button.classList.toggle('is-muted', !playing);
    button.setAttribute('aria-label', playing ? 'Mute ambient sound' : 'Play ambient sound');
  });
}());
