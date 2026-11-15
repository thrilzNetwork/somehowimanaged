// Build: node build.mjs  ->  dist/
// Reads content.json (site words and links) and book.json (the book), writes a static,
// fully pre-rendered page so search engines and Netlify Forms can see everything.
import { readFileSync, writeFileSync, mkdirSync, cpSync, existsSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { art } from './src/art.mjs';

const root = dirname(fileURLToPath(import.meta.url));
const C = JSON.parse(readFileSync(join(root, 'content.json'), 'utf8'));
const B = JSON.parse(readFileSync(join(root, 'book.json'), 'utf8'));
const dist = join(root, 'dist');

const esc = (s = '') =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const attr = esc;
const words = (arr) => arr.join(' ').split(/\s+/).filter(Boolean).length;
const mins = (n) => Math.max(1, Math.round(n / 230));
const chapters = B.chapters;
const lessons = chapters.filter((c) => /^s0\d$/.test(c.id));
const site = C.site.url.replace(/\/$/, '');

const icon = {
  play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" fill="currentColor"/></svg>',
  arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  linkedin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9.75h4v11H3zm7 0h3.8v1.6h.06c.53-1 1.83-2.05 3.77-2.05 4.03 0 4.77 2.65 4.77 6.1v5.35h-4v-4.75c0-1.13-.02-2.6-1.58-2.6-1.6 0-1.84 1.24-1.84 2.52v4.83h-4z"/></svg>',
  whatsapp: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.15l-.3-.18-3 .78.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.25-.12-1.46-.72-1.69-.8-.23-.08-.39-.12-.56.12-.16.25-.64.8-.78.96-.14.17-.29.19-.53.07a6.7 6.7 0 0 1-3.34-2.92c-.25-.43.25-.4.72-1.34.08-.16.04-.3-.02-.42l-.76-1.83c-.2-.48-.4-.41-.56-.42h-.47a.9.9 0 0 0-.65.3 2.7 2.7 0 0 0-.85 2.02 4.7 4.7 0 0 0 1 2.5 10.8 10.8 0 0 0 4.13 3.65c1.54.66 2.14.72 2.9.6.47-.07 1.46-.6 1.66-1.17.2-.58.2-1.07.15-1.17-.06-.1-.22-.16-.47-.28z"/></svg>',
  x: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M17.75 3h3.07l-6.7 7.66L22 21h-6.17l-4.83-6.32L5.47 21H2.4l7.17-8.2L2 3h6.33l4.37 5.77zm-1.08 16.2h1.7L7.4 4.73H5.58z"/></svg>',
  mail: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18v12H3zM3 7l9 6 9-6" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>',
  link: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
  rss: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5a14 14 0 0 1 14 14M5 11a8 8 0 0 1 8 8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="6" cy="18" r="1.6" fill="currentColor"/></svg>',
  menu: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
};

// ---------- Forms (static, so Netlify detects them at deploy) ----------
const honeypot = '<p class="hp" aria-hidden="true"><label>Leave this empty <input name="bot-field" tabindex="-1" autocomplete="off"></label></p>';
const readersForm = (source, { compact = false } = {}) => `
<form class="signup ${compact ? 'signup--compact' : ''}" name="readers-list" method="POST" data-netlify="true" netlify-honeypot="bot-field" data-source="${attr(source)}">
  <input type="hidden" name="form-name" value="readers-list">
  <input type="hidden" name="source" value="${attr(source)}">
  ${honeypot}
  ${compact
    ? `<input type="hidden" name="name" value="">
  <label class="sr" for="em-${source}">${esc(C.readersList.emailPlaceholder)}</label>
  <input id="em-${source}" type="email" name="email" required autocomplete="email" placeholder="${attr(C.readersList.emailPlaceholder)}">
  <button type="submit" class="btn btn--gold">${esc(C.hero.signupCta)}</button>`
    : `<label class="sr" for="nm-${source}">${esc(C.readersList.namePlaceholder)}</label>
  <input id="nm-${source}" type="text" name="name" autocomplete="given-name" placeholder="${attr(C.readersList.namePlaceholder)}">
  <label class="sr" for="em-${source}">${esc(C.readersList.emailPlaceholder)}</label>
  <input id="em-${source}" type="email" name="email" required autocomplete="email" placeholder="${attr(C.readersList.emailPlaceholder)}">
  <button type="submit" class="btn btn--gold">${esc(C.readersList.cta)}</button>`}
  <p class="form-msg" role="status" aria-live="polite"></p>
</form>`;

// ---------- Sections ----------
const nav = `
<header class="topbar" id="top">
  <a class="brand" href="#top" aria-label="${attr(C.nav.brand)}"><span class="brand__mark">S</span><span class="brand__name">${esc(C.nav.brand)}</span></a>
  <nav class="topnav" aria-label="Sections">${C.nav.links.map((l) => `<a href="${attr(l.href)}">${esc(l.label)}</a>`).join('')}</nav>
  <a class="btn btn--small btn--gold" href="#read">${esc(C.nav.cta)}</a>
</header>
<div class="progress" aria-hidden="true"><span></span></div>`;

const hero = `
<section class="hero" aria-labelledby="hero-title">
  <canvas class="hero__canvas" aria-hidden="true"></canvas>
  <div class="hero__veil" aria-hidden="true"></div>
  <div class="hero__inner">
    <p class="eyebrow reveal">${esc(C.hero.eyebrow)}</p>
    <h1 id="hero-title" class="hero__title">
      <span class="line split">${esc(C.hero.headline)}</span>
      <span class="line line--accent split">${esc(C.hero.headlineAccent)}</span>
    </h1>
    <p class="hero__sub reveal">${esc(C.hero.sub)}</p>
    <div class="hero__ctas reveal">
      <a class="btn btn--gold btn--lg" href="#s01">${esc(C.hero.readCta)} ${icon.arrow}</a>
      <button class="btn btn--ghost btn--lg" type="button" data-play="before">${icon.play} ${esc(C.hero.listenCta)}</button>
    </div>
    <div class="hero__signup reveal">
      <p class="hero__signup-label">${esc(C.hero.signupLabel)}</p>
      ${readersForm('hero', { compact: true })}
    </div>
    <p class="hero__byline reveal">${esc(C.hero.byline)}</p>
  </div>
  <a class="hero__scroll" href="#audience" aria-label="${attr(C.hero.scrollHint)}"><span></span>${esc(C.hero.scrollHint)}</a>
</section>`;

const audience = `
<section class="band" id="audience" aria-labelledby="aud-title">
  <div class="wrap">
    <h2 id="aud-title" class="section-title reveal">${esc(C.audiences.title)}</h2>
    <p class="section-sub reveal">${esc(C.audiences.sub)}</p>
    <ol class="audience">
      ${C.audiences.items.map((a, i) => `<li class="audience__item reveal" style="--i:${i}"><span class="audience__n">0${i + 1}</span><h3>${esc(a.label)}</h3><p>${esc(a.line)}</p></li>`).join('')}
    </ol>
  </div>
</section>`;

const lessonCards = `
<section class="band band--deep" id="lessons" aria-labelledby="les-title">
  <div class="wrap">
    <h2 id="les-title" class="section-title reveal">${esc(C.lessons.title)}</h2>
    <p class="section-sub reveal">${esc(C.lessons.sub)}</p>
    <div class="lessons">
      ${lessons.map((c, i) => `
      <article class="lesson reveal" style="--i:${i}">
        <div class="lesson__art">${art[c.id] || ''}</div>
        <span class="lesson__num">${esc(c.num)}</span>
        <h3 class="lesson__title">${esc(c.title)}</h3>
        <p class="lesson__tag">${esc(c.tagline)}</p>
        <div class="lesson__foot">
          <a class="lesson__read" href="#${attr(c.id)}">${esc(C.lessons.cta)} ${icon.arrow}</a>
          ${c.audio ? `<button class="chip" type="button" data-play="${attr(c.audio)}" aria-label="${attr(C.reader.listen)}: ${attr(c.title)}">${icon.play}<span>${Math.round(C.audio.tracks[c.audio].seconds / 60)} min</span></button>` : ''}
        </div>
      </article>`).join('')}
    </div>
  </div>
</section>`;

const A = C.author;
const author = `
<section class="band" id="author" aria-labelledby="au-title">
  <div class="wrap author">
    <div class="author__photo reveal">
      ${A.photo ? `<img src="${attr(A.photo)}" alt="${attr(A.photoAlt)}" loading="lazy" width="480" height="600">` : `<div class="author__mono" aria-hidden="true"><span>AS</span></div>`}
    </div>
    <div class="author__body">
      <p class="eyebrow reveal">${esc(A.eyebrow)}</p>
      <h2 id="au-title" class="section-title reveal">${esc(A.name)}</h2>
      <p class="author__role reveal">${esc(A.role)}</p>
      ${A.bio.map((p) => `<p class="reveal">${esc(p)}</p>`).join('')}
      <dl class="stats">
        ${A.stats.map((s, i) => `<div class="stat reveal" style="--i:${i}"><dt><span class="count" data-to="${attr(s.value)}">${esc(s.value)}</span></dt><dd>${esc(s.label)}</dd></div>`).join('')}
      </dl>
      ${A.linkedin ? `<a class="btn btn--ghost reveal" href="${attr(A.linkedin)}" target="_blank" rel="noopener">${icon.linkedin} ${esc(A.linkedinLabel)}</a>` : ''}
    </div>
  </div>
</section>`;

const Q = C.quiz;
const quiz = `
<section class="band band--deep" id="quiz" aria-labelledby="qz-title">
  <div class="wrap wrap--narrow">
    <div class="quiz" data-quiz>
      <div class="quiz__intro">
        <p class="eyebrow reveal">${esc(Q.eyebrow)}</p>
        <h2 id="qz-title" class="section-title reveal">${esc(Q.title)}</h2>
        <p class="section-sub reveal">${esc(Q.sub)}</p>
        <button class="btn btn--gold btn--lg reveal" type="button" data-quiz-start>${esc(Q.start)} ${icon.arrow}</button>
      </div>
      <div class="quiz__stage" hidden></div>
      <div class="quiz__result" hidden>
        <p class="eyebrow">${esc(Q.resultIntro)}</p>
        <h3 class="quiz__name" data-r="name"></h3>
        <p class="quiz__line" data-r="line"></p>
        <div class="quiz__picks">
          <a class="quiz__pick" data-r="main" href="#"></a>
          <a class="quiz__pick quiz__pick--stretch" data-r="stretch" href="#"></a>
        </div>
        <form class="signup quiz__form" name="quiz-results" method="POST" data-netlify="true" netlify-honeypot="bot-field">
          <input type="hidden" name="form-name" value="quiz-results">
          <input type="hidden" name="result" value="">
          <input type="hidden" name="stretch" value="">
          <input type="hidden" name="role" value="">
          ${honeypot}
          <p class="quiz__form-title">${esc(Q.emailTitle)}</p>
          <p class="quiz__form-sub">${esc(Q.emailSub)}</p>
          <label class="sr" for="qz-name">${esc(C.readersList.namePlaceholder)}</label>
          <input id="qz-name" type="text" name="name" autocomplete="given-name" placeholder="${attr(C.readersList.namePlaceholder)}">
          <label class="sr" for="qz-email">${esc(C.readersList.emailPlaceholder)}</label>
          <input id="qz-email" type="email" name="email" required autocomplete="email" placeholder="${attr(C.readersList.emailPlaceholder)}">
          <button type="submit" class="btn btn--gold">${esc(Q.emailCta)}</button>
          <p class="form-msg" role="status" aria-live="polite"></p>
        </form>
        <button class="linkbtn" type="button" data-quiz-retake>${esc(Q.retake)}</button>
      </div>
    </div>
  </div>
</section>`;

const R = C.readersList;
const join_ = `
<section class="band join" id="join" aria-labelledby="jn-title">
  <div class="wrap wrap--narrow join__inner">
    <p class="eyebrow reveal">${esc(R.eyebrow)}</p>
    <h2 id="jn-title" class="section-title reveal">${esc(R.title)}</h2>
    <p class="section-sub reveal">${esc(R.sub)}</p>
    <div class="reveal">${readersForm('readers-list-section')}</div>
  </div>
</section>`;

const attenda = `
<section class="attenda" aria-label="Attenda">
  <p class="wrap reveal">${esc(C.attenda.line)} <a href="${attr(C.attenda.url)}" target="_blank" rel="noopener">${esc(C.attenda.linkText)}</a></p>
</section>`;

// ---------- The book ----------
const renderPara = (p, c, idx) => {
  if (c.pullQuotes?.includes(p)) return `<blockquote class="pull reveal"><p>${esc(p)}</p></blockquote>`;
  if (/^—\s/.test(p)) return `<p class="sig">${esc(p)}</p>`;
  return `<p${idx === 0 ? ' class="lead"' : ''}>${esc(p)}</p>`;
};
const chapterHtml = (c) => {
  const n = words(c.paragraphs) + c.fieldNotes.reduce((a, f) => a + words(f.paragraphs), 0);
  const track = c.audio && C.audio.tracks[c.audio];
  return `
<section class="chapter" id="${attr(c.id)}" data-chapter aria-labelledby="h-${attr(c.id)}">
  <header class="chapter__head">
    <div class="chapter__art reveal">${art[c.id] || ''}</div>
    <p class="chapter__kicker reveal">${c.num ? `Chapter ${esc(c.num)}` : '&nbsp;'}</p>
    <h2 class="chapter__title reveal" id="h-${attr(c.id)}">${esc(c.title)}</h2>
    ${c.tagline ? `<p class="chapter__tag reveal">${esc(c.tagline)}</p>` : ''}
    <div class="chapter__meta reveal">
      <span>${mins(n)} ${esc(C.reader.minRead)}</span>
      ${track ? `<button class="chip" type="button" data-play="${attr(c.audio)}">${icon.play}<span>${esc(C.reader.listen)} · ${Math.round(track.seconds / 60)} min</span></button>` : ''}
    </div>
  </header>
  <div class="prose">
    ${c.paragraphs.map((p, i) => renderPara(p, c, i)).join('\n    ')}
  </div>
  ${c.fieldNotes.map((f) => `
  <aside class="fieldnote reveal" aria-label="${attr(C.reader.fieldNoteLabel)}: ${attr(f.title)}">
    <p class="fieldnote__label">${esc(C.reader.fieldNoteLabel)}</p>
    <h3 class="fieldnote__title">${esc(f.title)}</h3>
    ${f.paragraphs.map((p) => `<p>${esc(p)}</p>`).join('')}
  </aside>`).join('')}
</section>
${c.id === C.midSignup.afterChapter ? `
<aside class="midjoin reveal" aria-label="${attr(R.eyebrow)}">
  <p class="midjoin__title">${esc(C.midSignup.title)}</p>
  <p class="midjoin__sub">${esc(C.midSignup.sub)}</p>
  ${readersForm('mid-book')}
</aside>` : ''}`;
};

const reader = `
<section class="reader" id="read" aria-labelledby="rd-title">
  <div class="reader__intro wrap">
    <p class="eyebrow reveal">${esc(C.reader.eyebrow)}</p>
    <h2 id="rd-title" class="section-title reveal">${esc(C.reader.title)}</h2>
    <p class="section-sub reveal">${esc(C.reader.sub)}</p>
  </div>
  <div class="reader__grid">
    <aside class="toc" aria-label="${attr(C.reader.toc)}">
      <p class="toc__label">${esc(C.reader.toc)}</p>
      <ol>${chapters.map((c) => `<li><a href="#${attr(c.id)}" data-toc="${attr(c.id)}"><span>${esc(c.num || '·')}</span>${esc(c.title)}</a></li>`).join('')}</ol>
    </aside>
    <div class="book">${chapters.map(chapterHtml).join('')}</div>
  </div>
  <button class="toc-fab" type="button" aria-expanded="false" aria-controls="toc-sheet">${icon.menu}<span>${esc(C.reader.toc)}</span></button>
  <div class="toc-sheet" id="toc-sheet" hidden>
    <div class="toc-sheet__panel" role="dialog" aria-modal="true" aria-label="${attr(C.reader.toc)}">
      <ol>${chapters.map((c) => `<li><a href="#${attr(c.id)}" data-toc="${attr(c.id)}"><span>${esc(c.num || '·')}</span>${esc(c.title)}</a></li>`).join('')}</ol>
    </div>
  </div>
</section>`;

const S = C.share;
const shareUrl = encodeURIComponent(site + '/');
const shareText = encodeURIComponent(S.text);
const share = `
<section class="band band--deep share" id="share" aria-labelledby="sh-title">
  <div class="wrap wrap--narrow">
    <h2 id="sh-title" class="section-title reveal">${esc(S.title)}</h2>
    <p class="section-sub reveal">${esc(S.sub)}</p>
    <div class="share__row reveal">
      <a class="share__btn" href="https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}" target="_blank" rel="noopener" aria-label="Share on LinkedIn">${icon.linkedin}</a>
      <a class="share__btn" href="https://wa.me/?text=${shareText}%20${shareUrl}" target="_blank" rel="noopener" aria-label="Share on WhatsApp">${icon.whatsapp}</a>
      <a class="share__btn" href="https://x.com/intent/post?text=${shareText}&amp;url=${shareUrl}" target="_blank" rel="noopener" aria-label="Share on X">${icon.x}</a>
      <a class="share__btn" href="mailto:?subject=${encodeURIComponent(C.nav.brand)}&amp;body=${shareText}%20${shareUrl}" aria-label="Share by email">${icon.mail}</a>
      <button class="share__btn" type="button" data-copy="${attr(site + '/')}" aria-label="Copy link">${icon.link}</button>
      <a class="share__btn" href="${attr(C.podcast.feed)}" aria-label="${attr(C.podcast.label)}">${icon.rss}</a>
    </div>
    <p class="share__copied" role="status" aria-live="polite"></p>
  </div>
</section>`;

const footer = `
<footer class="foot">
  <p class="foot__line">${esc(C.footer.line)}</p>
  <p class="foot__meta">${esc(C.footer.copyright)} · <a href="${attr(C.podcast.feed)}">${esc(C.podcast.label)}</a> · <a href="#top">Back to top</a></p>
</footer>`;

const player = `
<div class="player" role="region" aria-label="Audio player" hidden>
  <button class="player__toggle" type="button" aria-label="${attr(C.reader.pause)}"><span class="i-play">${icon.play}</span><span class="i-pause" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" fill="currentColor"/></svg></span></button>
  <div class="player__info"><p class="player__title"></p><div class="player__bar"><span></span><input type="range" min="0" max="1000" value="0" aria-label="Seek"></div></div>
  <p class="player__time">0:00</p>
  <button class="player__close" type="button" aria-label="Close player">×</button>
  <audio preload="none"></audio>
</div>`;

const clientData = {
  audio: C.audio,
  quiz: { questions: Q.questions, results: Q.results, chapters: Object.fromEntries(lessons.map((c) => [c.id, { num: c.num, title: c.title }])), stretchIntro: Q.stretchIntro, readCta: Q.readCta, emailSuccess: Q.emailSuccess },
  forms: { success: R.success, error: R.error, quizSuccess: Q.emailSuccess },
  share: { copied: S.copied },
  reader: { listen: C.reader.listen, pause: C.reader.pause },
};

const jsonld = {
  '@context': 'https://schema.org',
  '@type': 'Book',
  name: 'Somehow I Managed',
  author: { '@type': 'Person', name: A.name, jobTitle: A.role, ...(A.linkedin ? { sameAs: [A.linkedin] } : {}) },
  description: C.site.description,
  url: site + '/',
  inLanguage: C.site.lang,
  isAccessibleForFree: true,
  genre: 'Business',
  hasPart: lessons.map((c) => ({ '@type': 'Chapter', name: c.title, position: Number(c.num), url: `${site}/#${c.id}` })),
};

const html = `<!doctype html>
<html lang="${attr(C.site.lang)}">
<head>
<meta charset="utf-8">
<script>document.documentElement.classList.add('js')</script>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(C.site.title)}</title>
<meta name="description" content="${attr(C.site.description)}">
<link rel="canonical" href="${attr(site)}/">
<meta name="theme-color" content="${attr(C.site.themeColor)}">
<meta property="og:type" content="book">
<meta property="og:title" content="${attr(C.site.title)}">
<meta property="og:description" content="${attr(C.site.description)}">
<meta property="og:url" content="${attr(site)}/">
<meta property="og:image" content="${attr(site + C.site.ogImage)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${attr(C.site.title)}">
<meta name="twitter:description" content="${attr(C.site.description)}">
<meta name="twitter:image" content="${attr(site + C.site.ogImage)}">
<link rel="alternate" type="application/rss+xml" title="Somehow I Managed — Field Notes" href="${attr(C.podcast.feed)}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..700;1,9..144,300..600&family=Inter:wght@400;500;600&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;1,6..72,400&display=swap">
<link rel="stylesheet" href="/assets/styles.css">
<script type="application/ld+json">${JSON.stringify(jsonld).replace(/</g, '\\u003c')}</script>
</head>
<body>
<a class="skip" href="#read">Skip to the book</a>
${nav}
<main>
${hero}
${audience}
${lessonCards}
${author}
${quiz}
${join_}
${attenda}
${reader}
${share}
</main>
${footer}
${player}
<script type="application/json" id="site-data">${JSON.stringify(clientData).replace(/</g, '\\u003c')}</script>
<script src="/assets/app.js" defer></script>
</body>
</html>`;

// ---------- Write ----------
if (existsSync(join(dist, 'assets'))) rmSync(join(dist, 'assets'), { recursive: true });
mkdirSync(join(dist, 'assets'), { recursive: true });
writeFileSync(join(dist, 'index.html'), html);
cpSync(join(root, 'src', 'styles.css'), join(dist, 'assets', 'styles.css'));
cpSync(join(root, 'src', 'app.js'), join(dist, 'assets', 'app.js'));
cpSync(join(root, 'public'), dist, { recursive: true });
writeFileSync(join(dist, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${site}/sitemap.xml\n`);
writeFileSync(
  join(dist, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${site}/</loc><changefreq>monthly</changefreq></url></urlset>\n`
);
console.log(`Built dist/index.html (${(html.length / 1024).toFixed(0)} KB), ${chapters.length} sections, ${chapters.reduce((a, c) => a + c.fieldNotes.length, 0)} field notes.`);
