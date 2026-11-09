// Essence — prévia conceitual (Bruno Luque). Ideia: "Destilar o essencial".
// Motion 11.11.17 (UMD local, global `Motion`) para coreografia, scroll e inView; Lenis 1.1.13 só na roda do mouse.
// O conteúdo funciona sem este arquivo: estados escondidos só existem depois de `motion-ready`.
//
// Camadas de motion
//  Assinatura: hero (palavras decantam numa gota sobre o 516) + cena presa "O caminho até o seu plano" (frasco com 4 filtros).
//  Narrativa: palavras restantes decantam ao sair do hero; retrato revelado por recorte; "516" se comprime ao chegar ao endereço.
//  Interface: CTA magnético (ponteiro fino), acordeão das áreas, cabeçalho, botão fixo no celular, foco.

const root = document.documentElement;
const reduceMQ = matchMedia('(prefers-reduced-motion: reduce)');
const fineMQ = matchMedia('(hover: hover) and (pointer: fine)');
const wideMQ = matchMedia('(min-width: 861px)');
const reduce = reduceMQ.matches;
if (reduce) root.classList.add('reduce');

/* tokens de motion (espelham o CSS) */
const EASE_OUT = [0.23, 1, 0.32, 1];
const EASE_IN_OUT = [0.77, 0, 0.175, 1];
const DUR = { press: 0.14, ctl: 0.2, panel: 0.36, line: 0.9 };
const SPRING = { soft: { stiffness: 120, damping: 16 }, firm: { stiffness: 220, damping: 22 } };

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (t, a, b) => { const x = clamp((t - a) / (b - a)); return x * x * (3 - 2 * x); };
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeIn = (t) => t * t;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const NS = 'http://www.w3.org/2000/svg';

/* ------------------------------------------------------------------ */
/* Rolagem contínua (Lenis) — só roda do mouse; toque nativo           */
/* ------------------------------------------------------------------ */
let lenis = null;
function startLenis() {
  if (reduce || !window.Lenis || lenis || !fineMQ.matches) return;
  lenis = new window.Lenis({ lerp: 0.09, smoothWheel: true, wheelMultiplier: 0.95 });
  const raf = (t) => { if (!lenis) return; lenis.raf(t); requestAnimationFrame(raf); };
  requestAnimationFrame(raf);
}
if (window.Lenis) startLenis(); else addEventListener('load', startLenis, { once: true });
reduceMQ.addEventListener('change', () => { if (reduceMQ.matches && lenis) { lenis.destroy(); lenis = null; } });

$$('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
  const id = a.getAttribute('href');
  const t = id.length > 1 && $(id);
  if (!t || !lenis) return;
  e.preventDefault();
  lenis.scrollTo(id === '#inicio' ? 0 : t, { offset: id === '#caminho' ? 0 : -70, duration: 1.3, easing: (x) => 1 - Math.pow(1 - x, 4) });
  history.replaceState(null, '', id);
}));

/* ------------------------------------------------------------------ */
/* Cabeçalho e botão fixo (celular)                                    */
/* ------------------------------------------------------------------ */
const top = $('[data-top]');
const dock = $('[data-dock]');
const hero = $('[data-hero]');
const addr = $('[data-addr]');
let heroVisible = true, addrVisible = false;
const updDock = () => dock && dock.classList.toggle('is-on', !heroVisible && !addrVisible);
const onScrollHead = () => top.classList.toggle('is-solid', scrollY > 30);
addEventListener('scroll', onScrollHead, { passive: true }); onScrollHead();
new IntersectionObserver(([e]) => { heroVisible = e.isIntersecting; updDock(); }, { rootMargin: '0px 0px -55% 0px' }).observe(hero);
new IntersectionObserver(([e]) => { addrVisible = e.isIntersecting; updDock(); }).observe(addr);

/* ------------------------------------------------------------------ */
/* Acordeão das áreas (funciona sem Motion)                            */
/* ------------------------------------------------------------------ */
const accBtns = $$('.acc__btn');
function setOpen(btn, open) {
  btn.setAttribute('aria-expanded', String(open));
  btn.closest('.acc__item').classList.toggle('is-open', open);
}
accBtns.forEach((b) => setOpen(b, b.getAttribute('aria-expanded') === 'true'));
accBtns.forEach((b, i) => {
  b.addEventListener('click', () => {
    const open = b.getAttribute('aria-expanded') !== 'true';
    accBtns.forEach((o) => o !== b && setOpen(o, false));
    setOpen(b, open);
  });
  b.addEventListener('keydown', (e) => {
    const k = { ArrowDown: i + 1, ArrowUp: i - 1, Home: 0, End: accBtns.length - 1 }[e.key];
    if (k === undefined) return;
    e.preventDefault();
    accBtns[(k + accBtns.length) % accBtns.length].focus();
  });
});

/* ------------------------------------------------------------------ */
/* Mola simples interrompível (preserva velocidade)                    */
/* ------------------------------------------------------------------ */
function spring2(apply, { stiffness = 170, damping = 20 } = {}) {
  const s = { x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0, raf: 0, last: 0 };
  const tick = (t) => {
    const dt = Math.min(0.032, (t - (s.last || t)) / 1000 || 0.016); s.last = t;
    for (const k of ['x', 'y']) {
      const v = 'v' + k, tk = 't' + k;
      s[v] += (-stiffness * (s[k] - s[tk]) - damping * s[v]) * dt; s[k] += s[v] * dt;
    }
    apply(s.x, s.y);
    if (Math.abs(s.x - s.tx) + Math.abs(s.y - s.ty) + Math.abs(s.vx) + Math.abs(s.vy) > 0.02) s.raf = requestAnimationFrame(tick);
    else { s.raf = 0; s.last = 0; apply(s.tx, s.ty); }
  };
  return (x, y) => { s.tx = x; s.ty = y; if (!s.raf) s.raf = requestAnimationFrame(tick); };
}

/* ------------------------------------------------------------------ */
/* Frasco: estado por progresso (0 = muitas opções, 1 = seu plano)     */
/* ------------------------------------------------------------------ */
const flask = $('[data-flask]');
const fWords = $$('[data-fwords] text');
const filters = $$('[data-filters] line');
const tags = $$('[data-tags] text');
const fall = $('[data-fall]');
const liq = $('[data-liq]');
const ripple = $('[data-ripple]');
const LIQ = [[242, 198, 168], [232, 150, 104], [220, 119, 63], [196, 92, 40]];
function liqColor(p) {
  const s = p * (LIQ.length - 1), i = Math.min(LIQ.length - 2, Math.floor(s)), f = s - i;
  const c = LIQ[i].map((v, j) => Math.round(lerp(v, LIQ[i + 1][j], f)));
  return `rgb(${c.join(',')})`;
}
const groupIdx = {};
fWords.forEach((t) => { const g = t.dataset.g; groupIdx[g] = (groupIdx[g] || 0); t._i = groupIdx[g]++; });
function renderFlask(p) {
  const seg = clamp(p) * 4, k = Math.min(3, Math.floor(seg)), lp = p >= 1 ? 1 : seg - k;
  // palavras: o grupo g sai durante a etapa g (Conversa, Avaliação, Plano)
  fWords.forEach((t) => {
    const g = +t.dataset.g, a = (g + 0.1 + t._i * 0.08) / 4, b = a + 0.16;
    const o = 1 - smooth(p, a, b);
    t.style.opacity = (0.78 * o).toFixed(3);
    t.style.transform = `translateY(${((1 - o) * 26).toFixed(1)}px)`;
  });
  // filtros acendem quando a gota passa
  filters.forEach((l, j) => { const on = p * 4 >= j + 0.32; l.classList.toggle('is-on', on); if (tags[j]) tags[j].classList.toggle('is-on', on); });
  // gota caindo pelo gargalo e encontrando a superfície
  const level = lerp(352, 386, smooth(p, 0, 1));
  const fallT = p >= 1 ? 1 : smooth(lp, 0.1, 0.42);
  const dropY = lerp(-60, level - 292, easeIn(fallT));
  fall.style.transform = `translateY(${dropY.toFixed(1)}px)`;
  fall.style.opacity = fallT > 0 && fallT < 1 ? '1' : '0';
  const rp = p >= 1 ? 1 : smooth(lp, 0.42, 0.8);
  ripple.setAttribute('cy', level.toFixed(1));
  ripple.setAttribute('rx', (10 + rp * 70).toFixed(1));
  ripple.setAttribute('ry', (3 + rp * 6).toFixed(1));
  ripple.style.opacity = rp > 0 && rp < 1 ? (0.8 * (1 - rp)).toFixed(3) : '0';
  liq.setAttribute('y', level.toFixed(1));
  flask.style.setProperty('--liq', liqColor(p));
  flask.style.setProperty('--glow', (smooth(p, 0.55, 1) * 0.75).toFixed(3));
  flask.style.setProperty('--label', smooth(p, 0.78, 0.96).toFixed(3));
  return k;
}

/* ------------------------------------------------------------------ */
/* Motion: coreografia                                                  */
/* ------------------------------------------------------------------ */
const M = window.Motion || null;
if (!M) console.warn('Motion indisponível; página segue estática.');

if (M && reduce) {
  root.classList.add('motion-ready');
  renderFlask(1);
} else if (M) {
  const { animate, scroll, inView, stagger } = M;
  root.classList.add('motion-ready');

  /* ---------------- HERO: entrada do texto (não espera a cena) ---------------- */
  animate('.hero .eyebrow', { opacity: [0, 1] }, { duration: 0.6, ease: EASE_OUT });
  animate('.hero__title .line > span', { transform: ['translateY(108%)', 'translateY(0%)'] }, { duration: 1, delay: stagger(0.09, { startDelay: 0.05 }), ease: EASE_OUT });
  animate('.hero__lead, .hero__actions, .hero__place', { opacity: [0, 1], transform: ['translateY(12px)', 'translateY(0)'] }, { duration: 0.7, delay: stagger(0.08, { startDelay: 0.32 }), ease: EASE_OUT });

  /* ---------------- HERO: decantação (assinatura) ---------------- */
  const stage = $('[data-stage]');
  const goo = $('[data-goo]');
  const gooSvg = $('[data-liquid]');
  const drop = $('[data-drop]');
  const surface = $('[data-surface]');
  const words = $$('.w', stage);
  const auto = words.filter((w) => !w.hasAttribute('data-keep'));
  const keep = words.filter((w) => w.hasAttribute('data-keep'));
  const proxy = document.createElementNS(NS, 'circle'); goo.appendChild(proxy);
  const W = words.map((el, i) => {
    const c = document.createElementNS(NS, 'circle'); c.setAttribute('r', '0'); goo.appendChild(c);
    return { el, c, i, keep: el.hasAttribute('data-keep'), s: parseFloat(el.style.getPropertyValue('--s')) || 1, hx: 0, hy: 0, t: 0, ox: 0, oy: 0, vx: 0, vy: 0, tx: 0, ty: 0, delay: 0 };
  });
  const G = { cx: 0, cy: 0, br: 0, w: 0, h: 0 };
  function measure() {
    const sr = stage.getBoundingClientRect();
    G.w = sr.width; G.h = sr.height;
    gooSvg.setAttribute('viewBox', `0 0 ${G.w.toFixed(0)} ${G.h.toFixed(0)}`);
    const prev = drop.style.transform; drop.style.transform = 'none';
    const dr = drop.getBoundingClientRect(); drop.style.transform = prev;
    G.cx = dr.left - sr.left + dr.width / 2; G.cy = dr.top - sr.top + dr.height * (92 / 140); G.br = dr.width * 0.41;
    W.forEach((w) => { const prevT = w.el.style.transform; w.el.style.transform = 'none'; const r = w.el.getBoundingClientRect(); w.el.style.transform = prevT; w.hx = r.left - sr.left + r.width / 2; w.hy = r.top - sr.top + r.height / 2; });
    // ordem de chegada: mais próximas primeiro (a gota se forma e cresce)
    const order = W.filter((w) => !w.keep).sort((a, b) => Math.hypot(a.hx - G.cx, a.hy - G.cy) - Math.hypot(b.hx - G.cx, b.hy - G.cy));
    order.forEach((w, k) => { w.delay = 0.85 + k * 0.085; });
    W.filter((w) => w.keep).forEach((w, k) => { w.kOrder = k; });
  }
  measure();

  const t0 = performance.now();
  const APPEAR = 0.5, DUR_FALL = 1.45;
  let heroScroll = 0, ptr = null, lean = { a: 0, v: 0, t: 0 }, running = false, visible = true;
  const endTime = 0.85 + auto.length * 0.085 + DUR_FALL + 0.1;

  function frame(now) {
    const el = (now - t0) / 1000;
    let busy = el < endTime + 1;
    let arrived = 0;
    for (const w of W) {
      const appear = clamp((el - w.i * 0.035) / APPEAR);
      if (w.keep) w.t = clamp((heroScroll * 1.7 - w.kOrder * 0.1) / 0.55);
      else w.t = clamp((el - w.delay) / DUR_FALL);
      if (!w.keep) arrived += smooth(w.t, 0.8, 1);
      // mola do ponteiro (só palavras ainda soltas)
      let tx = 0, ty = 0;
      if (ptr && w.t < 0.3) {
        const dx = ptr.x - w.hx, dy = ptr.y - w.hy, d = Math.hypot(dx, dy);
        const f = Math.exp(-d / 260) * 0.16;
        tx = clamp(dx * f, -30, 30); ty = clamp(dy * f, -30, 30);
      }
      const dt = 1 / 60;
      w.vx += (-140 * (w.ox - tx) - 15 * w.vx) * dt; w.ox += w.vx * dt;
      w.vy += (-140 * (w.oy - ty) - 15 * w.vy) * dt; w.oy += w.vy * dt;
      if (Math.abs(w.ox - tx) + Math.abs(w.oy - ty) + Math.abs(w.vx) + Math.abs(w.vy) > 0.05) busy = true;
      const e = easeInOut(w.t), ey = easeIn(w.t) * 0.55 + e * 0.45;
      const x = lerp(w.hx, G.cx, e) + w.ox * (1 - w.t);
      const y = lerp(w.hy, G.cy, ey) + w.oy * (1 - w.t);
      const sc = 1 - 0.65 * smooth(w.t, 0.35, 0.8);
      const base = w.keep ? 0.5 : 0.62;
      const blur = (1 - appear) * 6;
      w.el.style.transform = `translate(${(x - w.hx).toFixed(1)}px, ${(y - w.hy + (1 - appear) * 10).toFixed(1)}px) scale(${sc.toFixed(3)})`;
      w.el.style.opacity = (base * appear * (1 - smooth(w.t, 0.42, 0.7))).toFixed(3);
      w.el.style.filter = blur > 0.1 ? `blur(${blur.toFixed(1)}px)` : '';
      const r = (4 + 3.5 * w.s) * smooth(w.t, 0.45, 0.68) * (1 - smooth(w.t, 0.9, 1));
      w.c.setAttribute('cx', x.toFixed(1)); w.c.setAttribute('cy', y.toFixed(1)); w.c.setAttribute('r', r.toFixed(2));
    }
    // a gota cresce com o que chega; as palavras restantes completam ao rolar
    const kf = W.filter((w) => w.keep).reduce((s, w) => s + smooth(w.t, 0.8, 1), 0) / keep.length;
    const f = arrived / auto.length;
    const pop = 1 + 0.07 * Math.sin(Math.PI * clamp((el - endTime) / 0.6));
    const sc = f <= 0.001 ? 0.001 : (0.22 + 0.7 * Math.sqrt(f) + 0.08 * kf) * pop;
    // inclinação da gota em direção ao ponteiro
    lean.t = ptr ? clamp((ptr.x - G.cx) / G.w * 16, -7, 7) : 0;
    lean.v += (-120 * (lean.a - lean.t) - 14 * lean.v) / 60; lean.a += lean.v / 60;
    if (Math.abs(lean.a - lean.t) + Math.abs(lean.v) > 0.02) busy = true;
    const sp = clamp((el - endTime + 0.05) / 0.9);
    surface.style.opacity = sp > 0 && sp < 1 ? (0.7 * (1 - sp)).toFixed(3) : '0';
    surface.style.transform = `scale(${(0.35 + sp * 1.1).toFixed(3)})`;
    drop.style.transform = `rotate(${lean.a.toFixed(2)}deg) scale(${sc.toFixed(3)})`;
    proxy.setAttribute('cx', G.cx.toFixed(1)); proxy.setAttribute('cy', G.cy.toFixed(1)); proxy.setAttribute('r', (G.br * sc * 0.92).toFixed(1));
    if (busy && visible) requestAnimationFrame(frame); else running = false;
  }
  function kick() { if (!running && visible) { running = true; requestAnimationFrame(frame); } }
  kick();
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) kick(); }).observe(stage);
  scroll((p) => { heroScroll = typeof p === 'number' ? p : 0; kick(); }, { target: hero, offset: ['start start', 'end start'] });
  let rT; addEventListener('resize', () => { clearTimeout(rT); rT = setTimeout(() => { measure(); kick(); }, 150); });
  if (fineMQ.matches) {
    stage.parentElement.addEventListener('pointermove', (e) => { const r = stage.getBoundingClientRect(); ptr = { x: e.clientX - r.left, y: e.clientY - r.top }; kick(); }, { passive: true });
    stage.parentElement.addEventListener('pointerleave', () => { ptr = null; kick(); });
  }

  /* ---------------- CENA PRESA: o caminho até o seu plano ---------------- */
  const scene = $('[data-scene]');
  const steps = $$('.step', scene);
  let cur = -1;
  function showStep(k) {
    if (k === cur) return;
    const prev = steps[cur];
    if (prev) { animate(prev, { opacity: 0 }, { duration: DUR.ctl, ease: EASE_OUT }).then(() => { if (steps[cur] !== prev) prev.classList.remove('is-active'); }); }
    const s = steps[k]; cur = k;
    s.classList.add('is-active');
    animate(s, { opacity: [0, 1] }, { duration: DUR.panel, ease: EASE_OUT });
    animate($('h3', s), { transform: ['translateY(28px)', 'translateY(0px)'] }, { duration: 0.7, ease: EASE_OUT });
    animate($('p', s), { transform: ['translateY(16px)', 'translateY(0px)'], opacity: [0, 1] }, { duration: 0.7, delay: 0.06, ease: EASE_OUT });
    animate($('figure', s), { clipPath: ['inset(30% 20% 30% 20% round 22px)', 'inset(0% 0% 0% 0% round 22px)'] }, { duration: 0.8, ease: EASE_OUT });
    animate($('img', s), { scale: [1.12, 1] }, { duration: 1.1, ease: EASE_OUT });
  }
  let sceneMode = null, cancelScene = null, mobilePlayed = false;
  function setupScene() {
    const mode = wideMQ.matches ? 'pin' : 'flow';
    if (mode === sceneMode) return;
    if (cancelScene) { cancelScene(); cancelScene = null; }
    sceneMode = mode;
    if (mode === 'pin') {
      steps.forEach((s) => { s.style.opacity = ''; s.classList.remove('is-active'); }); cur = -1;
      cancelScene = scroll((p) => { const v = typeof p === 'number' ? p : 0; showStep(renderFlask(v)); }, { target: scene, offset: ['start start', 'end end'] });
    } else {
      steps.forEach((s) => { s.style.opacity = '1'; s.classList.add('is-active'); });
      renderFlask(mobilePlayed ? 1 : 0);
      // celular: sem pin; o frasco percorre os 4 filtros uma vez ao entrar na tela
      const stop = inView(flask, () => {
        if (mobilePlayed) return;
        mobilePlayed = true;
        animate(0, 1, { duration: 4.2, ease: [0.45, 0, 0.25, 1], onUpdate: (v) => renderFlask(v) });
      }, { amount: 0.6 });
      cancelScene = () => stop && stop();
    }
  }
  setupScene();
  wideMQ.addEventListener('change', setupScene);

  /* ---------------- títulos em máscara de linha ---------------- */
  $$('[data-lm]').forEach((h) => inView(h, () => {
    animate($$('.line > span', h), { transform: ['translateY(108%)', 'translateY(0%)'] }, { duration: DUR.line, delay: stagger(0.08), ease: EASE_OUT });
  }, { amount: 0.4 }));

  /* ---------------- retrato: revelação por recorte ---------------- */
  const whoPh = $('[data-who-ph]');
  inView(whoPh.parentElement, () => {
    animate(whoPh, { clipPath: ['inset(100% -14px -14px -14px)', 'inset(-14px -14px -14px -14px)'] }, { duration: 1.1, ease: EASE_IN_OUT });
    animate($('img', whoPh), { scale: [1.15, 1] }, { duration: 1.5, ease: EASE_OUT });
  }, { amount: 0.25 });

  /* ---------------- 516: compressão tipográfica ao chegar ---------------- */
  const digits = $$('[data-compress] span');
  scroll((p) => {
    const v = typeof p === 'number' ? p : 0;
    const c = 1 - easeInOut(clamp(v / 0.85));
    digits.forEach((d, i) => { d.style.transform = `translateX(${((i - 1) * c * 0.42).toFixed(3)}em)`; });
  }, { target: addr, offset: ['start end', 'center center'] });

  /* ---------------- CTA magnético (só ponteiro fino) ---------------- */
  if (fineMQ.matches) {
    $$('[data-magnetic]').forEach((b) => {
      const set = spring2((x, y) => { b.style.translate = `${x.toFixed(2)}px ${y.toFixed(2)}px`; }, SPRING.firm);
      b.addEventListener('pointermove', (e) => { const r = b.getBoundingClientRect(); set((e.clientX - r.left - r.width / 2) * 0.22, (e.clientY - r.top - r.height / 2) * 0.32); });
      b.addEventListener('pointerleave', () => set(0, 0));
    });
  }
}

/* sem Motion: frasco no estado final para leitura */
if (!M) renderFlask(1);
