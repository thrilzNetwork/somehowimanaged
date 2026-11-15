/* Somehow I Managed — interactions. No dependencies. */
(() => {
  'use strict';
  const D = JSON.parse(document.getElementById('site-data').textContent);
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const esc = (v) => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Split headline words ---------- */
  $$('.split').forEach((el) => {
    const words = el.textContent.trim().split(/\s+/);
    el.innerHTML = `<span class="sr">${esc(words.join(' '))}</span>` + words.map((w, i) => `<span class="w" aria-hidden="true"><span style="--wi:${i}">${esc(w)}</span></span>`).join(' ');
  });
  // Offset the accent line so it follows the main line.
  const accent = $('.line--accent');
  if (accent) $$('.w > span', accent).forEach((s, i) => s.style.setProperty('--wi', i + 6));

  /* ---------- Reveal on scroll ---------- */
  const io = new IntersectionObserver(
    (entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } }),
    { rootMargin: '0px 0px -8% 0px', threshold: 0.12 }
  );
  $$('.reveal, .split').forEach((el) => io.observe(el));
  // Never leave content hidden if something goes wrong.
  setTimeout(() => $$('.hero .reveal, .hero .split').forEach((el) => el.classList.add('is-in')), 1200);

  /* ---------- Count-up stats ---------- */
  const countIO = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (!e.isIntersecting) return;
    countIO.unobserve(e.target);
    const to = parseInt(e.target.dataset.to, 10);
    if (!to || reduce) return;
    const t0 = performance.now(), dur = 1400;
    const tick = (t) => { const k = Math.min(1, (t - t0) / dur); e.target.textContent = Math.round(to * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(tick); };
    e.target.textContent = '0'; requestAnimationFrame(tick);
  }), { threshold: 0.6 });
  $$('.count').forEach((el) => countIO.observe(el));

  /* ---------- Top bar + progress ---------- */
  const bar = $('.topbar'), prog = $('.progress span'), hero = $('.hero');
  let lastY = scrollY, ticking = false;
  const onScroll = () => {
    const y = scrollY, h = document.documentElement.scrollHeight - innerHeight;
    prog.style.setProperty('--p', h > 0 ? (y / h).toFixed(4) : 0);
    bar.classList.toggle('is-solid', y > 30);
    const pastHero = y > (hero ? hero.offsetHeight * 0.8 : 400);
    bar.classList.toggle('is-hidden', pastHero && y > lastY + 4 && !document.body.classList.contains('sheet-open'));
    if (y < lastY - 4 || !pastHero) bar.classList.remove('is-hidden');
    lastY = y; ticking = false;
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  /* ---------- Lesson card glow ---------- */
  $$('.lesson').forEach((card) => card.addEventListener('pointermove', (e) => {
    const r = card.getBoundingClientRect();
    card.style.setProperty('--mx', `${e.clientX - r.left}px`);
    card.style.setProperty('--my', `${e.clientY - r.top}px`);
  }));

  /* ---------- Hero canvas: a hotel at night ---------- */
  const cv = $('.hero__canvas');
  const ctx = cv && cv.getContext ? cv.getContext('2d') : null;
  if (ctx) {
    let W = 0, H = 0, dpr = 1, layers = [], stars = [], running = true, mx = 0, my = 0, sy = 0;
    const rnd = (a, b) => a + Math.random() * (b - a);
    const build = () => {
      dpr = Math.min(2, devicePixelRatio || 1);
      W = cv.clientWidth; H = cv.clientHeight;
      cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      stars = Array.from({ length: Math.round(W / 9) }, () => ({ x: rnd(0, W), y: rnd(0, H * 0.55), r: rnd(0.3, 1.1), a: rnd(0.15, 0.6), t: rnd(0, 6) }));
      layers = [];
      const mobile = W < 760;
      const specs = [
        { depth: 0.2, base: H * 0.78, hMin: 0.22, hMax: 0.42, wMin: 50, wMax: 110, shade: '#121620', win: 0.18, lit: 0.12 },
        { depth: 0.45, base: H * 0.86, hMin: 0.28, hMax: 0.5, wMin: 70, wMax: 140, shade: '#0f1219', win: 0.32, lit: 0.18 },
      ];
      specs.forEach((s) => {
        const blds = []; let x = -40;
        while (x < W + 60) { const w = rnd(s.wMin, s.wMax), h = H * rnd(s.hMin, s.hMax); blds.push(makeBuilding(x, s.base - h, w, h, s)); x += w + rnd(4, 26); }
        layers.push({ ...s, blds });
      });
      // The hotel: one tall, wide building on the right (centered on phones).
      const hw = mobile ? Math.min(W * 0.62, 260) : Math.min(W * 0.3, 420);
      const hh = H * (mobile ? 0.58 : 0.72);
      const hx = mobile ? W * 0.5 - hw / 2 + W * 0.18 : W * 0.66;
      const hotel = makeBuilding(hx, H - hh, hw, hh, { win: 0.55, lit: 0.22 }, true);
      layers.push({ depth: 0.8, shade: '#0d1017', blds: [hotel], hotel: true });
    };
    const makeBuilding = (x, y, w, h, s, isHotel = false) => {
      const cols = Math.max(2, Math.floor(w / (isHotel ? 26 : 18))), rows = Math.max(3, Math.floor(h / (isHotel ? 30 : 22)));
      const padX = w * 0.1, padY = isHotel ? 46 : 14;
      const cw = (w - padX * 2) / cols, ch = (h - padY - 20) / rows;
      const wins = [];
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        wins.push({ x: x + padX + c * cw + cw * 0.22, y: y + padY + r * ch + ch * 0.25, w: cw * 0.56, h: ch * 0.5, on: Math.random() < s.lit, target: Math.random() < s.lit, a: 0, warm: rnd(0, 1) });
      }
      return { x, y, w, h, wins, cols, rows, padX, padY, cw, ch, s, isHotel, elev: { r: rows - 1, t: 0 } };
    };
    const draw = (t) => {
      ctx.clearRect(0, 0, W, H);
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#07080c'); g.addColorStop(0.6, '#0e1220'); g.addColorStop(1, '#151a28');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      // moon glow
      const mg = ctx.createRadialGradient(W * 0.82, H * 0.18, 0, W * 0.82, H * 0.18, Math.max(W, H) * 0.45);
      mg.addColorStop(0, 'rgba(230,201,147,0.10)'); mg.addColorStop(1, 'rgba(230,201,147,0)');
      ctx.fillStyle = mg; ctx.fillRect(0, 0, W, H);
      stars.forEach((s) => { ctx.globalAlpha = s.a * (0.6 + 0.4 * Math.sin(t / 1400 + s.t)); ctx.fillStyle = '#efe7da'; ctx.beginPath(); ctx.arc(s.x, s.y - sy * 0.05, s.r, 0, 6.283); ctx.fill(); });
      ctx.globalAlpha = 1;
      layers.forEach((L) => {
        const ox = mx * 18 * L.depth, oy = my * 10 * L.depth - sy * L.depth * 0.25;
        ctx.save(); ctx.translate(ox, oy);
        L.blds.forEach((b) => {
          ctx.fillStyle = L.shade || '#0d1017';
          ctx.fillRect(b.x, b.y, b.w, b.h + 400);
          if (b.isHotel) {
            ctx.strokeStyle = 'rgba(201,164,106,0.35)'; ctx.lineWidth = 1;
            ctx.strokeRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h + 400);
            ctx.fillStyle = 'rgba(201,164,106,0.9)';
            ctx.font = `500 ${Math.max(10, b.w * 0.045)}px Inter, sans-serif`;
            ctx.textAlign = 'center';
            ctx.globalAlpha = 0.75; ctx.fillText('H O T E L', b.x + b.w / 2, b.y + 28); ctx.globalAlpha = 1;
          }
          b.wins.forEach((w) => {
            if (Math.random() < (b.isHotel ? 0.0016 : 0.0007)) w.target = !w.target;
            w.a += ((w.target ? 1 : 0) - w.a) * 0.05;
            if (w.a > 0.02) {
              const c = w.warm > 0.8 ? '190,210,235' : '255,205,140';
              ctx.fillStyle = `rgba(${c},${(b.isHotel ? 0.85 : 0.55) * w.a})`;
              if (b.isHotel) { ctx.shadowColor = `rgba(${c},0.6)`; ctx.shadowBlur = 10 * w.a; }
              ctx.fillRect(w.x, w.y, w.w, w.h);
              ctx.shadowBlur = 0;
            } else {
              ctx.fillStyle = 'rgba(239,231,218,0.035)'; ctx.fillRect(w.x, w.y, w.w, w.h);
            }
          });
          if (b.isHotel) {
            // the elevator, still going up
            const e = b.elev; e.t += 0.004;
            const ex = b.x + b.w - b.padX * 0.55, ey0 = b.y + b.padY, ey1 = b.y + b.h - 30;
            const k = (Math.sin(e.t) + 1) / 2, ey = ey1 - (ey1 - ey0) * k;
            ctx.fillStyle = 'rgba(239,231,218,0.06)'; ctx.fillRect(ex - 3, ey0, 6, ey1 - ey0);
            ctx.fillStyle = 'rgba(230,201,147,0.95)'; ctx.shadowColor = 'rgba(230,201,147,0.9)'; ctx.shadowBlur = 14;
            ctx.fillRect(ex - 3, ey - 7, 6, 14); ctx.shadowBlur = 0;
            // the night shift: one window always on
            const fw = b.wins[b.wins.length - b.cols + 1]; if (fw) { fw.target = true; }
          }
        });
        ctx.restore();
      });
    };
    let raf = 0;
    const loop = (t) => { if (!running) return; draw(t); raf = requestAnimationFrame(loop); };
    build();
    if (reduce) { layers.forEach((L) => L.blds.forEach((b) => b.wins.forEach((w) => (w.a = w.target ? 1 : 0)))); draw(0); }
    else raf = requestAnimationFrame(loop);
    new IntersectionObserver(([e]) => {
      if (reduce) return;
      running = e.isIntersecting; cancelAnimationFrame(raf); if (running) raf = requestAnimationFrame(loop);
    }).observe(cv);
    let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { build(); if (reduce) draw(0); }, 150); });
    addEventListener('pointermove', (e) => { mx = e.clientX / innerWidth - 0.5; my = e.clientY / innerHeight - 0.5; }, { passive: true });
    addEventListener('scroll', () => { sy = Math.min(scrollY, H); }, { passive: true });
  }

  /* ---------- Audio player ---------- */
  const P = $('.player'), audio = $('audio', P), A = D.audio;
  let current = null, triedFallback = false;
  const fmt = (s) => { s = Math.max(0, Math.floor(s || 0)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
  const setButtons = () => $$('[data-play]').forEach((b) => b.classList.toggle('is-playing', b.dataset.play === current && !audio.paused));
  const play = (id) => {
    const tr = A.tracks[id]; if (!tr) return;
    if (current === id) { audio.paused ? audio.play().catch(() => {}) : audio.pause(); return; }
    current = id; triedFallback = false;
    audio.src = A.base + tr.file;
    $('.player__title', P).textContent = tr.title;
    $('.player__time', P).textContent = fmt(tr.seconds);
    P.hidden = false; document.body.classList.add('has-player');
    audio.play().catch(() => {});
  };
  audio.addEventListener('error', () => {
    if (!current || triedFallback || !A.fallbackBase) return;
    triedFallback = true; audio.src = A.fallbackBase + A.tracks[current].file; audio.play().catch(() => {});
  });
  audio.addEventListener('play', () => { P.classList.add('is-playing'); $('.player__toggle', P).setAttribute('aria-label', D.reader.pause); setButtons(); });
  audio.addEventListener('pause', () => { P.classList.remove('is-playing'); $('.player__toggle', P).setAttribute('aria-label', D.reader.listen); setButtons(); });
  audio.addEventListener('timeupdate', () => {
    const d = audio.duration || A.tracks[current]?.seconds || 1;
    $('.player__bar span', P).style.width = `${(audio.currentTime / d) * 100}%`;
    $('.player__bar input', P).value = Math.round((audio.currentTime / d) * 1000);
    $('.player__time', P).textContent = fmt(d - audio.currentTime);
  });
  $('.player__bar input', P).addEventListener('input', (e) => { const d = audio.duration; if (d) audio.currentTime = (e.target.value / 1000) * d; });
  $('.player__toggle', P).addEventListener('click', () => (audio.paused ? audio.play().catch(() => {}) : audio.pause()));
  $('.player__close', P).addEventListener('click', () => { audio.pause(); P.hidden = true; current = null; document.body.classList.remove('has-player'); setButtons(); });
  document.addEventListener('click', (e) => { const b = e.target.closest('[data-play]'); if (b) { e.preventDefault(); play(b.dataset.play); } });

  /* ---------- Reader: active chapter + mobile sheet ---------- */
  const tocLinks = $$('[data-toc]');
  const chIO = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (e.isIntersecting) tocLinks.forEach((a) => a.classList.toggle('is-active', a.dataset.toc === e.target.id));
  }), { rootMargin: '-35% 0px -60% 0px' });
  $$('[data-chapter]').forEach((c) => chIO.observe(c));
  const fab = $('.toc-fab'), sheet = $('#toc-sheet'), book = $('.book');
  new IntersectionObserver(([e]) => fab.classList.toggle('is-on', e.isIntersecting), { rootMargin: '0px 0px -40% 0px' }).observe(book);
  const closeSheet = () => { sheet.hidden = true; fab.setAttribute('aria-expanded', 'false'); document.body.classList.remove('sheet-open'); };
  fab.addEventListener('click', () => { sheet.hidden = false; fab.setAttribute('aria-expanded', 'true'); document.body.classList.add('sheet-open'); $('a.is-active, a', sheet).focus({ preventScroll: true }); });
  sheet.addEventListener('click', (e) => { if (e.target === sheet || e.target.closest('a')) closeSheet(); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && !sheet.hidden) { closeSheet(); fab.focus(); } });

  /* ---------- Forms (Netlify Forms) ---------- */
  const submit = async (form, okText) => {
    const msg = $('.form-msg', form), btn = $('button[type=submit]', form);
    const data = new FormData(form);
    if (data.get('bot-field')) return;
    const email = String(data.get('email') || '').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { msg.className = 'form-msg err'; msg.textContent = 'Please enter a valid email address.'; return; }
    btn.disabled = true; msg.className = 'form-msg'; msg.textContent = '…';
    try {
      const res = await fetch('/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(data).toString() });
      if (!res.ok) throw new Error(res.status);
      form.classList.add('is-done'); msg.className = 'form-msg ok'; msg.textContent = okText;
      try { localStorage.setItem('sim-joined', '1'); } catch (_) {}
    } catch (_) {
      msg.className = 'form-msg err'; msg.textContent = D.forms.error;
    } finally { btn.disabled = false; }
  };
  $$('form[name="readers-list"]').forEach((f) => f.addEventListener('submit', (e) => { e.preventDefault(); submit(f, D.forms.success); }));
  const qForm = $('form[name="quiz-results"]');
  qForm.addEventListener('submit', (e) => { e.preventDefault(); submit(qForm, D.forms.quizSuccess); });

  /* ---------- Quiz ---------- */
  const Q = D.quiz, quiz = $('[data-quiz]'), stage = $('.quiz__stage', quiz), result = $('.quiz__result', quiz), intro = $('.quiz__intro', quiz);
  let step = 0, picks = [];
  const renderStep = () => {
    const q = Q.questions[step];
    stage.innerHTML = `<div class="quiz__step"><p class="quiz__count">${step + 1} / ${Q.questions.length}</p>
      <div class="quiz__bar"><span style="width:${(step / Q.questions.length) * 100}%"></span></div>
      <h3 class="quiz__q" tabindex="-1">${esc(q.q)}</h3>
      <div class="quiz__opts">${q.options.map((o, i) => `<button type="button" class="quiz__opt" data-i="${i}"><b>${'ABCD'[i]}</b><span>${esc(o.text)}</span></button>`).join('')}</div></div>`;
    $('.quiz__q', stage).focus({ preventScroll: true });
  };
  const finish = () => {
    const score = {}; Object.keys(Q.chapters).forEach((k, i) => (score[k] = -i * 0.01));
    picks.forEach((o) => (score[o.ch] += 1));
    const ranked = Object.keys(score).sort((a, b) => score[b] - score[a]);
    const main = ranked[0], stretch = ranked[ranked.length - 1];
    const r = Q.results[main], role = (picks.find((o) => o.role) || {}).role || '';
    $('[data-r=name]', result).textContent = r.name;
    $('[data-r=line]', result).textContent = r.line;
    const m = $('[data-r=main]', result), s = $('[data-r=stretch]', result);
    m.href = `#${main}`; m.innerHTML = `<small>${esc(Q.readCta)}</small><strong>${esc(Q.chapters[main].num)} · ${esc(Q.chapters[main].title)}</strong>`;
    s.href = `#${stretch}`; s.innerHTML = `<small>${esc(Q.stretchIntro)}</small><strong>${esc(Q.chapters[stretch].num)} · ${esc(Q.chapters[stretch].title)}</strong>`;
    qForm.elements.result.value = `${r.name} (chapter ${Q.chapters[main].num})`;
    qForm.elements.stretch.value = `chapter ${Q.chapters[stretch].num}`;
    qForm.elements.role.value = role;
    stage.hidden = true; result.hidden = false;
    quiz.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  };
  stage.addEventListener('click', (e) => {
    const b = e.target.closest('.quiz__opt'); if (!b) return;
    b.classList.add('is-picked');
    picks[step] = Q.questions[step].options[+b.dataset.i];
    setTimeout(() => { step += 1; step < Q.questions.length ? renderStep() : finish(); }, reduce ? 0 : 260);
  });
  $('[data-quiz-start]', quiz).addEventListener('click', () => { intro.hidden = true; stage.hidden = false; step = 0; picks = []; renderStep(); });
  $('[data-quiz-retake]', quiz).addEventListener('click', () => {
    result.hidden = true; stage.hidden = false; step = 0; picks = [];
    qForm.classList.remove('is-done'); $('.form-msg', qForm).textContent = ''; renderStep();
  });

  /* ---------- Copy link ---------- */
  const copied = $('.share__copied');
  $$('[data-copy]').forEach((b) => b.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(b.dataset.copy); } catch (_) {
      const t = document.createElement('textarea'); t.value = b.dataset.copy; document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove();
    }
    copied.textContent = D.share.copied; setTimeout(() => (copied.textContent = ''), 2400);
  }));
})();
