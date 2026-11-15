/* Dex Budget 1.5 — Ambient Engine. Decorative graphics only; no finance data accessed. */
(() => {
  'use strict';
  const canvas = document.getElementById('dexMotion');
  const ctx = canvas && canvas.getContext('2d', { alpha: true, desynchronized: true });
  if (!ctx) return;

  const TAU = Math.PI * 2;
  const styles = new Set(['bubbles', 'tide', 'aurora', 'stars', 'neon', 'ink', 'fireflies', 'rain']);
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const hexToRgb = h => /^[0-9a-f]{6}$/i.test((h || '').trim().replace('#', ''))
    ? [0, 2, 4].map(i => parseInt(h.trim().replace('#', '').slice(i, i + 2), 16)) : [84, 215, 176];
  const color = (c, alpha) => `rgba(${c[0]},${c[1]},${c[2]},${Math.max(0, Math.min(1, alpha)).toFixed(3)})`;
  const rnd = (a, b) => a + (b - a) * Math.random();
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  let w = 0, h = 0, scale = 1, objects = [], effect = '', accent = [84, 215, 176];
  let secondary = [126, 219, 192], intensity = 2, pace = 1, pointer = { x: .5, y: .5 };
  let raf = 0, then = 0, sceneTime = 0, sprites = new Map();
  const state = { frames: 0, ticks: 0 };
  const lowPower = (navigator.deviceMemory && navigator.deviceMemory <= 2) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2);
  const maxFps = lowPower ? 22 : 30;

  function fit() {
    w = Math.max(1, innerWidth); h = Math.max(1, innerHeight);
    scale = Math.min(devicePixelRatio || 1, lowPower ? 1 : 1.5);
    canvas.width = Math.round(w * scale); canvas.height = Math.round(h * scale);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    sprites.clear();
  }

  function create(type, atStart = true) {
    const depth = rnd(.12, 1);
    const bubbles = type === 'bubbles' || type === 'tide';
    const radius = bubbles ? 3.3 + 34 * Math.pow(depth, 1.75) : type === 'aurora' ? 28 + depth * 68 : type === 'rain' ? 1 : type === 'fireflies' ? rnd(1.6, 4) : rnd(.7, 2.4);
    const velocity = type === 'rain' ? rnd(140, 310) : bubbles ? (8 + depth * 38) : type === 'aurora' ? (4 + depth * 10) : type === 'fireflies' ? rnd(4, 12) : rnd(3, 14);
    return {
      x: rnd(-35, w + 35), y: atStart ? rnd(-30, h + 30) : type === 'rain' ? rnd(-140, -10) : h + rnd(20, 100),
      depth, radius, velocity, phase: rnd(0, TAU), alpha: rnd(.45, .83) * (.4 + depth * .6),
      wave: rnd(8, 24) * (.25 + depth), spin: rnd(-.07, .07), aspect: rnd(.94, 1.08),
      variation: rnd(.6, 1.4), sprite: Math.floor(depth * 3), age: rnd(0, 100)
    };
  }

  function populate() {
    const area = Math.min(w * h, 1300000);
    const baseline = effect === 'bubbles' ? 26 : effect === 'tide' ? 20 : effect === 'aurora' ? 13 : effect === 'rain' ? 70 : effect === 'fireflies' ? 27 : effect === 'stars' ? 64 : 29;
    const n = Math.round(baseline * clamp(area / 360000, .72, 1.75) * [0, .48, 1, 1.54][intensity] * (lowPower ? .64 : 1));
    objects = Array.from({ length: Math.min(110, Math.max(4, n)) }, () => create(effect));
  }

  // Optical-style bubble sprite with a transparent center, rainbow edge dispersion,
  // asymmetrical reflections, a bright upper-left catchlight, and a lower rim caustic.
  // Cached as offscreen bitmaps so we don't create expensive gradients every frame.
  function bubbleSprite(band) {
    const key = `b-${band}`;
    if (sprites.has(key)) return sprites.get(key);
    const size = 192; const off = document.createElement('canvas');
    off.width = size; off.height = size;
    const g = off.getContext('2d'); const x = size / 2, y = size / 2, r = size * .425;
    const glow = g.createRadialGradient(x - 13, y - 18, 2, x, y, r);
    glow.addColorStop(0, 'rgba(234,253,255,.035)');
    glow.addColorStop(.64, 'rgba(148,224,255,.012)');
    glow.addColorStop(.82, 'rgba(135,205,245,.055)');
    glow.addColorStop(.945, 'rgba(206,248,255,.17)');
    glow.addColorStop(1, 'rgba(215,253,255,.13)');
    g.beginPath();g.arc(x,y,r,0,TAU);g.fillStyle=glow;g.fill();

    // Several overlapping edge arcs mimic thin-film interference on soap bubbles.
    const arcs = [
      [-2.4,-.30, 'rgba(218,254,255,.63)', 1.95],
      [-.42, 1.12,'rgba(188,154,255,.42)', 1.45],
      [1.07,2.42,'rgba(99,232,242,.55)', 1.80],
      [2.28,4.08,'rgba(255,166,219,.35)', 1.55],
      [3.91,5.6,'rgba(157,241,253,.53)', 1.65]
    ];
    for (const [a,b,c,thick] of arcs) {
      g.beginPath();g.arc(x,y,r-2.7,a,b);g.lineWidth=thick;g.strokeStyle=c;g.stroke();
    }
    g.beginPath();g.arc(x,y,r-1.2,0,TAU);
    g.strokeStyle='rgba(212,248,255,.20)';g.lineWidth=1.1;g.stroke();
    // Broad reflection ribbon at top left.
    g.save();g.translate(x,y);g.rotate(-.18);
    g.beginPath();g.ellipse(-r*.21,-r*.39,r*.57,r*.28,-.52,Math.PI*1.02,Math.PI*1.83);
    g.strokeStyle='rgba(255,255,255,.54)';g.lineWidth=4.4;g.lineCap='round';g.stroke();
    g.beginPath();g.ellipse(-r*.22,-r*.41,r*.52,r*.24,-.52,Math.PI*1.02,Math.PI*1.74);
    g.strokeStyle='rgba(255,255,255,.26)';g.lineWidth=1.7;g.stroke();
    // Specular lens and tiny reflected light.
    const lens=g.createRadialGradient(-r*.37,-r*.40,1,-r*.28,-r*.34,r*.24);
    lens.addColorStop(0,'rgba(255,255,255,.68)');lens.addColorStop(.32,'rgba(237,254,255,.33)');lens.addColorStop(1,'rgba(255,255,255,0)');
    g.fillStyle=lens;g.beginPath();g.ellipse(-r*.28,-r*.38,r*.25,r*.15,-.6,0,TAU);g.fill();
    g.beginPath();g.arc(-r*.42,-r*.45,r*.037,0,TAU);g.fillStyle='rgba(255,255,255,.72)';g.fill();
    // Bottom rim reflection, tapered and slightly warmer.
    g.beginPath();g.ellipse(r*.14,r*.36,r*.54,r*.25,-.46,.15,Math.PI*.93);
    g.strokeStyle='rgba(176,232,255,.38)';g.lineWidth=2.6;g.stroke();
    g.beginPath();g.ellipse(r*.34,r*.35,r*.24,r*.13,-.5,.24,2.3);
    g.strokeStyle='rgba(255,196,235,.24)';g.lineWidth=1.8;g.stroke();
    g.restore();
    // A small soft halo around the outside, but leave center transparent.
    const out={canvas:off,size};sprites.set(key,out);return out;
  }

  function renderBubble(p, secs, dt) {
    const swing = Math.sin(secs * (.55 + .22 * p.variation) + p.phase) * p.wave
      + Math.sin(secs * .19 + p.phase * 2) * p.wave * .26;
    const lateral = (pointer.x - .5) * (p.depth * 9);
    const px = p.x + swing + lateral, py = p.y + Math.sin(secs*.41+p.phase)*1.2;
    if(py < -p.radius*2.4 || py > h+p.radius*2.4) return;
    const fade = Math.min(1, Math.max(0,(py + p.radius * 1.8)/70)) * Math.min(1, Math.max(0,(h-py+p.radius*2)/90));
    const r = p.radius * (1 + Math.sin(secs*1.4+p.phase)*.018);
    ctx.save();ctx.translate(px,py);ctx.rotate(p.spin + .03*Math.sin(secs*.5+p.phase));
    ctx.scale(p.aspect,1/p.aspect);
    ctx.globalAlpha = p.alpha * fade * (.54 + intensity*.15);
    const sprite=bubbleSprite(p.sprite);
    // Emphasize parallax by drawing front bubbles slightly larger and brighter.
    ctx.drawImage(sprite.canvas,-r*1.17,-r*1.17,r*2.34,r*2.34);
    ctx.restore();
  }

  function glow(p, x, y, now, firefly=false) {
    const colorValue = firefly ? [202, 255, 175] : (p.depth>.65 ? accent : secondary);
    const r = firefly ? (7 + p.depth*15) : p.radius * 1.75;
    const grad=ctx.createRadialGradient(x,y,0,x,y,r);
    const flux = .76+.24*Math.sin(now*(firefly?1.8:.6)+p.phase);
    grad.addColorStop(0,color(colorValue,p.alpha*flux*(firefly?.68:.34)));
    grad.addColorStop(.32,color(colorValue,p.alpha*flux*(firefly?.18:.16)));
    grad.addColorStop(1,color(colorValue,0));
    ctx.fillStyle=grad;ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill();
    if(firefly){ctx.fillStyle=color([247,255,226],p.alpha*flux*.8);ctx.beginPath();ctx.arc(x,y,Math.max(.65,p.radius*.42),0,TAU);ctx.fill()}
  }

  function drawStar(p,x,y,now){
    const twinkle=.64+.36*Math.sin(now*p.variation + p.phase);
    ctx.fillStyle=color(effect==='ink'?[202,221,245]:effect==='neon'?accent:[219,234,255],p.alpha*twinkle);
    ctx.beginPath();ctx.arc(x,y,p.radius,0,TAU);ctx.fill();
    if(p.radius>1.6 && effect==='stars'){
      ctx.strokeStyle=color([191,229,255],p.alpha*twinkle*.36);ctx.lineWidth=.6;
      ctx.beginPath();ctx.moveTo(x-p.radius*4,y);ctx.lineTo(x+p.radius*4,y);
      ctx.moveTo(x,y-p.radius*4);ctx.lineTo(x,y+p.radius*4);ctx.stroke();
    }
  }
  function drawRain(p,x,y){
    const length=10+p.depth*21;
    ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-2.2,y+length);
    ctx.strokeStyle=color([178,216,245],p.alpha*(.15 + intensity*.07));
    ctx.lineWidth=.6+p.depth*.6;ctx.stroke();
    if(p.depth>.75 && p.sprite===2){ctx.beginPath();ctx.ellipse(x,y+length,1.6,2.7,0,0,TAU);ctx.fillStyle='rgba(209,241,255,.12)';ctx.fill()}
  }

  function draw(delta, ts){
    ctx.clearRect(0,0,w,h);
    for(let i=0;i<objects.length;i++){
      let p=objects[i];
      const upward = effect !== 'rain';
      const v=p.velocity * delta * [.0,.67,1,1.37][intensity] * [.6,1,1.45][pace];
      p.y += upward ? -v : v;
      if((upward && p.y < -Math.max(p.radius*3,60)) || (!upward && p.y > h+45)){p=create(effect,false);if(!upward)p.y=-rnd(15,160);objects[i]=p}
      const x = p.x + Math.sin(ts*(effect==='fireflies'?.85:.40)+p.phase)*p.wave + (pointer.x-.5)*(4+p.depth*9);
      if(effect==='bubbles'||effect==='tide')renderBubble(p,ts,delta);
      else if(effect==='aurora')glow(p,x,p.y,ts);
      else if(effect==='fireflies')glow(p,x,p.y+Math.sin(ts*.9+p.phase)*p.wave*.5,ts,true);
      else if(effect==='rain')drawRain(p,x,p.y);
      else drawStar(p,x,p.y,ts);
    }
    if(effect==='stars' && intensity>1 && Math.sin(ts*.32)>.996){
      const x=w*.75,y=h*.21;
      ctx.strokeStyle='rgba(193,231,255,.19)';ctx.lineWidth=1.4;
      ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-65,y+27);ctx.stroke();
    }
  }

  function tick(timestamp){
    raf = requestAnimationFrame(tick);
    if(timestamp-then<1000/maxFps-1) return;
    const dt=then?Math.min((timestamp-then)/1000,.055):0;
    then=timestamp;sceneTime+=dt;draw(dt,sceneTime);state.frames++;
  }

  function sync(){
    cancelAnimationFrame(raf);raf=0;then=0;sceneTime=0;
    const requested=document.body.dataset.wallpaper || 'classic';
    const motionAllowed = document.body.dataset.motion==='on' && styles.has(requested) && !reduceMotion.matches;
    canvas.style.display=motionAllowed?'block':'none';
    if(!motionAllowed || document.hidden) return;
    effect=requested;
    intensity=clamp(Number(document.body.dataset.intensity)||2,1,3);
    pace=clamp(['calm','natural','lively'].indexOf(document.body.dataset.pace)+0,0,2);
    const cssVars=getComputedStyle(document.documentElement);
    accent=hexToRgb(cssVars.getPropertyValue('--mint'));
    secondary=hexToRgb(cssVars.getPropertyValue('--mint-soft'));
    fit();populate();tick(performance.now());
  }
  let delay;
  addEventListener('resize',()=>{clearTimeout(delay);delay=setTimeout(sync,180)},{passive:true});
  addEventListener('pointermove',e=>{pointer.x=clamp(e.clientX / Math.max(1,w),0,1);pointer.y=clamp(e.clientY / Math.max(1,h),0,1)},{passive:true});
  // Keep numbers easy to read while someone is editing any financial input.
  document.addEventListener('focusin', e => {
    if (e.target && e.target.matches('input, select, textarea')) document.body.classList.add('is-editing');
  });
  document.addEventListener('focusout', () => {
    setTimeout(() => {
      if (!document.activeElement || !document.activeElement.matches('input, select, textarea')) document.body.classList.remove('is-editing');
    }, 0);
  });
  document.addEventListener('visibilitychange',sync);
  if(reduceMotion.addEventListener)reduceMotion.addEventListener('change',sync);
  else reduceMotion.addListener(sync);
  new MutationObserver(sync).observe(document.body,{attributes:true,attributeFilter:['data-wallpaper','data-motion','data-intensity','data-pace']});
  new MutationObserver(sync).observe(document.documentElement,{attributes:true,attributeFilter:['style']});
  // Exposed only to browser tests: frame count, effect, object count and visibility.
  window.__dexAmbientStatus = () => ({effect,objects:objects.length,frames:state.frames,active:!!raf,motionDisabled:reduceMotion.matches});
  sync();
})();
