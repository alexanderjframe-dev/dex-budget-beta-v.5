/* Dex Budget v1.4 - decorative canvas motion; never reads financial data. */
(() => {
  'use strict';
  const canvas = document.getElementById('dexMotion');
  const context = canvas && canvas.getContext('2d', { alpha: true });
  if (!context) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const styles = new Set(['bubbles', 'tide', 'aurora', 'stars', 'neon', 'ink']);
  const TAU = Math.PI * 2;
  let width = 0, height = 0, dpr = 1;
  let particles = [], effect = '', colors = null;
  let frameId = 0, lastFrame = 0, startTime = 0;
  let elapsed = 0;
  const between = (lo, hi) => lo + Math.random() * (hi - lo);
  const rgba = (color, alpha) => `rgba(${color[0]},${color[1]},${color[2]},${Math.max(0, Math.min(1, alpha))})`;
  const parseColor = text => {
    const hex = String(text).trim().replace('#', '');
    if (!/^[a-f\d]{6}$/i.test(hex)) return [84, 215, 176];
    return [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16));
  };
  function sizeCanvas() {
    width = Math.max(1, window.innerWidth);
    height = Math.max(1, window.innerHeight);
    // Cap resolution and particle count for a cooler, quieter iPhone experience.
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function makeParticle(initial = true) {
    const bubble = effect === 'bubbles' || effect === 'tide';
    const star = effect === 'stars';
    const glow = effect === 'aurora';
    return {
      x: between(-35, width + 35),
      y: initial ? between(-30, height + 30) : height + between(20, 95),
      r: bubble ? between(6, effect === 'bubbles' ? 31 : 24) : glow ? between(22, 66) : star ? between(.65, 2.2) : between(1, 4),
      speed: bubble ? between(11, 33) : glow ? between(4, 15) : star ? between(2, 10) : between(7, 21),
      drift: between(2, bubble ? 22 : glow ? 35 : 14),
      phase: between(0, TAU),
      alpha: bubble ? between(.22, .49) : glow ? between(.10, .23) : star ? between(.28, .78) : between(.18, .47),
      life: between(.6, 1.5)
    };
  }
  function makeScene() {
    const area = Math.min(width * height, 1200000);
    const count = effect === 'stars' ? Math.min(85, Math.max(33, Math.round(area / 7500)))
      : effect === 'aurora' ? Math.min(22, Math.max(12, Math.round(area / 34000)))
      : effect === 'neon' || effect === 'ink' ? Math.min(48, Math.max(20, Math.round(area / 16500)))
      : Math.min(32, Math.max(16, Math.round(area / 20500)));
    particles = Array.from({ length: count }, () => makeParticle());
  }
  function drawBubble(p, x, y) {
    const r = p.r;
    const gradient = context.createRadialGradient(x - r * .32, y - r * .35, r * .04, x, y, r);
    gradient.addColorStop(0, rgba([225, 255, 255], p.alpha * .28));
    gradient.addColorStop(.58, rgba(colors.glow, p.alpha * .025));
    gradient.addColorStop(.84, rgba(colors.accent, p.alpha * .10));
    gradient.addColorStop(1, rgba([186, 240, 255], p.alpha * .64));
    context.beginPath();
    context.arc(x, y, r, 0, TAU);
    context.fillStyle = gradient;
    context.fill();
    context.lineWidth = Math.max(.75, r * .04);
    context.strokeStyle = rgba([204, 249, 255], p.alpha * .85);
    context.stroke();
    context.beginPath();
    context.arc(x - r * .08, y + r * .08, r * .73, Math.PI * 1.04, Math.PI * 1.43);
    context.lineWidth = Math.max(1.1, r * .065);
    context.strokeStyle = rgba([255, 255, 255], p.alpha * 1.35);
    context.stroke();
    if (r > 13) {
      context.beginPath();
      context.ellipse(x - r * .37, y - r * .35, r * .11, r * .18, -.65, 0, TAU);
      context.fillStyle = rgba([255, 255, 255], p.alpha * .87);
      context.fill();
    }
  }
  function drawGlow(p, x, y, seconds) {
    const radius = p.r * 1.8;
    const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
    const chosen = Math.sin(p.phase) > 0 ? colors.accent : colors.glow;
    gradient.addColorStop(0, rgba(chosen, p.alpha * (1 + .15 * Math.sin(seconds + p.phase))));
    gradient.addColorStop(.37, rgba(chosen, p.alpha * .46));
    gradient.addColorStop(1, rgba(chosen, 0));
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(x, y, radius, 0, TAU);
    context.fill();
  }
  function drawSpark(p, x, y, seconds) {
    const twinkle = .75 + .25 * Math.sin(seconds * p.life + p.phase);
    const tint = effect === 'ink' ? [229, 235, 255] : effect === 'neon' ? colors.accent : [195, 228, 255];
    context.fillStyle = rgba(tint, p.alpha * twinkle);
    context.beginPath();
    context.arc(x, y, p.r, 0, TAU);
    context.fill();
    if (effect === 'stars' && p.r > 1.45) {
      context.strokeStyle = rgba(tint, p.alpha * twinkle * .42);
      context.lineWidth = .7;
      context.beginPath();
      context.moveTo(x - 4 * p.r, y); context.lineTo(x + 4 * p.r, y);
      context.moveTo(x, y - 4 * p.r); context.lineTo(x, y + 4 * p.r);
      context.stroke();
    }
  }
  function paint(delta, now) {
    context.clearRect(0, 0, width, height);
    const seconds = now * .001;
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.y -= p.speed * delta;
      if (p.y < -p.r * 3 - 10) particles[i] = makeParticle(false);
      const q = particles[i];
      const x = q.x + Math.sin(seconds * .43 + q.phase) * q.drift;
      if (effect === 'bubbles' || effect === 'tide') drawBubble(q, x, q.y);
      else if (effect === 'aurora') drawGlow(q, x, q.y, seconds);
      else drawSpark(q, x, q.y, seconds);
    }
  }
  function tick(time) {
    frameId = window.requestAnimationFrame(tick);
    if (time - lastFrame < 32) return; // about 30 FPS, even on 120 Hz phones
    const delta = lastFrame ? Math.min((time - lastFrame) / 1000, .07) : 0;
    lastFrame = time;
    elapsed += delta;
    paint(delta, time);
  }
  function update() {
    window.cancelAnimationFrame(frameId);
    frameId = 0;
    lastFrame = 0;
    const next = document.body.dataset.wallpaper || 'classic';
    const active = document.body.dataset.motion === 'on' && styles.has(next) && !reduce.matches;
    canvas.style.display = active ? 'block' : 'none';
    if (!active || document.hidden) return;
    effect = next;
    const css = getComputedStyle(document.documentElement);
    colors = { accent: parseColor(css.getPropertyValue('--mint')), glow: parseColor(css.getPropertyValue('--mint-soft')) };
    sizeCanvas();
    makeScene();
    elapsed = 0;
    startTime = performance.now();
    frameId = requestAnimationFrame(tick);
  }
  let resizeTimer;
  window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(update, 170); }, { passive: true });
  document.addEventListener('visibilitychange', update);
  if (reduce.addEventListener) reduce.addEventListener('change', update);
  else if (reduce.addListener) reduce.addListener(update);
  new MutationObserver(update).observe(document.body, { attributes: true, attributeFilter: ['data-wallpaper', 'data-motion'] });
  new MutationObserver(update).observe(document.documentElement, { attributes: true, attributeFilter: ['style'] });
  update();
})();
