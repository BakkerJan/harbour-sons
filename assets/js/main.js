/* =========================================================================
   Harbour Sons — site behaviour
   No dependencies, no build step. Everything is driven by data/site.json
   and data/videos.json so the band can edit content without touching code.
   ========================================================================= */

const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const prefersReducedMotion =
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Respect the browser's data-saver setting where it is exposed. */
const savesData = navigator.connection?.saveData === true;

/* ---------------------------------------------------------------- helpers */

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[c]));

/** Read "about.heading" style paths out of the config object. */
const dig = (obj, path) =>
  path.split('.').reduce((acc, key) => (acc == null ? acc : acc[key]), obj);

async function loadJSON(path, fallback) {
  try {
    const res = await fetch(path, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return await res.json();
  } catch (err) {
    console.warn(`[harbour-sons] could not load ${path}:`, err.message);
    return fallback;
  }
}

/* ==========================================================================
   1. Hero background video
   Three modes, set in data/site.json -> hero.mode
     "video"   self-hosted mp4/webm. Best quality and no third party.
     "youtube" ambient muted loop of a channel video.
     "image"   poster only.
   Any mode degrades to the poster image when motion is unwanted, the
   connection is metered, or the viewport is a phone.
   ========================================================================== */

function initHero(cfg) {
  const hero    = $('#hero');
  const media   = $('#heroMedia');
  const scrim   = $('#heroScrim');
  const soundBtn = $('#heroSound');
  if (!media || !cfg) return;

  scrim.style.setProperty('--scrim', cfg.overlayOpacity ?? 0.62);

  // The poster is both the placeholder and the permanent fallback.
  if (cfg.poster) media.style.backgroundImage = `url("${cfg.poster}")`;

  const isPhone   = window.matchMedia('(max-width: 700px)').matches;
  const skipMotion = prefersReducedMotion || savesData ||
                     (cfg.disableOnMobile && isPhone);

  let mode = cfg.mode || 'image';
  if (skipMotion) mode = 'image';

  if (mode === 'video') initSelfHostedVideo(cfg, media, soundBtn);
  else if (mode === 'youtube') initYouTubeBackdrop(cfg, media);

  // Pause background motion while the hero is off screen — saves battery.
  if (mode !== 'image' && 'IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      const vid = media.querySelector('video');
      if (vid) entry.isIntersecting ? vid.play().catch(() => {}) : vid.pause();
      if (media.ytPlayer?.playVideo) {
        entry.isIntersecting ? media.ytPlayer.playVideo() : media.ytPlayer.pauseVideo();
      }
    }, { threshold: 0.01 }).observe(hero);
  }
}

function initSelfHostedVideo(cfg, media, soundBtn) {
  const video = document.createElement('video');
  video.muted = true;          // required for autoplay everywhere
  video.loop = true;
  video.playsInline = true;
  video.autoplay = true;
  video.preload = 'auto';
  if (cfg.poster) video.poster = cfg.poster;

  const add = (src, type) => {
    if (!src) return;
    const s = document.createElement('source');
    s.src = src; s.type = type;
    video.append(s);
  };
  add(cfg.videoWebm, 'video/webm');
  add(cfg.videoMp4, 'video/mp4');

  // If the file is missing (nobody dropped hero.mp4 in yet) keep the poster.
  video.addEventListener('error', () => video.remove(), true);
  video.addEventListener('playing', () => media.classList.add('is-playing'), { once: true });

  media.append(video);
  video.play().catch(() => { /* autoplay refused — poster stands in */ });

  // A self-hosted file can carry audio, so offer an unmute control.
  //
  // Whether it *has* audio is declared in site.json rather than sniffed. The
  // browser APIs for this (webkitAudioDecodedByteCount, mozHasAudio,
  // audioTracks) are either non-standard, unimplemented, or — for a video that
  // starts muted — report zero because nothing has been decoded yet. A flag is
  // boring and always right.
  if (!cfg.hasAudio) return;

  soundBtn.hidden = false;
  soundBtn.classList.add('is-available');
  soundBtn.addEventListener('click', () => {
    video.muted = !video.muted;
    if (!video.muted) video.volume = 0.55;
    setSoundState(soundBtn, !video.muted);
  });
}

function setSoundState(btn, on) {
  btn.setAttribute('aria-pressed', String(on));
  $('#heroSoundLabel', btn).textContent = on ? 'Sound on' : 'Sound off';
  $('#heroSoundIcon', btn).innerHTML = on
    ? '<path d="M4 9v6h4l5 5V4L8 9H4zm12.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4z"/>'
    : '<path d="M4 9v6h4l5 5V4L8 9H4z"/>';
}

/**
 * Ambient YouTube backdrop.
 * Uses youtube-nocookie so no tracking cookie is set before a visitor
 * chooses to play something.
 */
function initYouTubeBackdrop(cfg, media) {
  const id = cfg.youtubeId;
  if (!id) return;

  const params = new URLSearchParams({
    autoplay: '1',
    mute: '1',
    controls: '0',
    loop: '1',
    playlist: id,          // required for loop on a single video
    playsinline: '1',
    modestbranding: '1',
    rel: '0',
    fs: '0',
    disablekb: '1',
    iv_load_policy: '3',
  });
  if (cfg.startAt) params.set('start', cfg.startAt);
  if (cfg.endAt) params.set('end', cfg.endAt);

  const frame = document.createElement('iframe');
  frame.className = 'hero-yt';
  frame.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?${params}`;
  frame.title = 'Background footage';
  frame.allow = 'autoplay; encrypted-media';
  frame.setAttribute('tabindex', '-1');
  frame.setAttribute('aria-hidden', 'true');
  frame.loading = 'eager';

  // Hold the poster over the player for a beat. YouTube flashes its own
  // controls while the player boots, and this hides that behind the poster
  // rather than showing chrome we do not control.
  frame.addEventListener('load', () => {
    setTimeout(() => media.classList.add('is-playing'), 1800);
  });

  media.append(frame);
}

/* ==========================================================================
   2. YouTube video grid + lightbox
   ========================================================================== */

function renderVideos(data, site) {
  const grid = $('#videoGrid');
  const channelUrl = site?.youtube?.channelUrl || data?.channelUrl;

  if (!data?.videos?.length) {
    grid.innerHTML = `<p class="grid-note">Videos could not be loaded right now —
      <a href="${esc(channelUrl)}" target="_blank" rel="noopener">watch them on YouTube</a>.</p>`;
    return;
  }

  grid.innerHTML = data.videos.map((v, i) => `
    <button class="video-card reveal" style="--d:${(i % 3) * 0.1}s"
            data-id="${esc(v.id)}" data-title="${esc(v.title)}">
      <span class="video-thumb">
        <img src="${esc(v.thumb)}" alt="" loading="lazy" width="1280" height="720"
             onerror="this.onerror=null;this.src='${esc(v.thumbFallback)}'">
        <span class="play"><i><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></i></span>
      </span>
      <span class="video-body">
        <span class="video-title">${esc(v.title)}</span>
        <span class="video-meta">
          <span>${formatDate(v.published)}</span>
          ${v.views ? `<span>${Number(v.views).toLocaleString()} views</span>` : ''}
        </span>
      </span>
    </button>
  `).join('');

  const n = data.videos.length;
  $('#videoCount').textContent =
    `${n} video${n === 1 ? '' : 's'} on the channel` +
    (data.updated ? ` · synced ${formatDate(data.updated)}` : '');

  if (channelUrl) $('#channelLink').href = channelUrl;

  $$('.video-card', grid).forEach((card) =>
    card.addEventListener('click', () => openLightbox(card.dataset.id, card.dataset.title)));

  observeReveals(grid);
}

const lightbox = $('#lightbox');
let lastFocused = null;

function openLightbox(id, title) {
  lastFocused = document.activeElement;
  const params = new URLSearchParams({
    autoplay: '1', rel: '0', modestbranding: '1', playsinline: '1',
  });
  $('#lightboxFrame').innerHTML =
    `<iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?${params}"
             title="${esc(title)}"
             allow="autoplay; encrypted-media; fullscreen; picture-in-picture"></iframe>`;
  $('#lightboxCaption').textContent = title;
  lightbox.hidden = false;
  // Force a reflow so the opacity transition has a "from" frame. A rAF would
  // read better but is throttled in background tabs, which would leave the
  // dialog permanently invisible — and then unfocusable.
  void lightbox.offsetHeight;
  lightbox.classList.add('is-open');
  document.body.style.overflow = 'hidden';
  $('#lightboxClose').focus();
}

function closeLightbox() {
  if (lightbox.hidden) return;
  lightbox.classList.remove('is-open');
  document.body.style.overflow = '';
  setTimeout(() => {
    lightbox.hidden = true;
    $('#lightboxFrame').innerHTML = '';   // stops playback
  }, 400);
  lastFocused?.focus();
}

$('#lightboxClose').addEventListener('click', closeLightbox);
lightbox.addEventListener('click', (e) => { if (e.target === lightbox) closeLightbox(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeLightbox(); });

/* ==========================================================================
   3. Content binding — about, shows, booking, ticker
   ========================================================================== */

function bindText(site) {
  $$('[data-bind]').forEach((el) => {
    const value = dig(site, el.dataset.bind);
    if (value) el.textContent = value;
  });

  const body = $('#aboutBody');
  if (body && site.about?.body) {
    body.innerHTML = site.about.body.map((p) => `<p>${esc(p)}</p>`).join('');
  }

  const members = $('#members');
  if (members) {
    members.innerHTML = (site.about?.members || [])
      .map((m) => `<li><b>${esc(m.name)}</b><span>${esc(m.role)}</span></li>`).join('');
  }

  const mail = site.contact?.bookingEmail || site.contact?.generalEmail;
  const mailEl = $('#bookingMail');
  if (mail && mailEl) {
    mailEl.href = `mailto:${mail}`;
    mailEl.textContent = mail;
  } else if (mailEl) {
    mailEl.hidden = true;
  }

  $('#year').textContent = new Date().getFullYear();
}

const ICONS = {
  youtube:   'M23 12s0-3.9-.5-5.8a3 3 0 0 0-2.1-2.1C18.5 3.6 12 3.6 12 3.6s-6.5 0-8.4.5A3 3 0 0 0 1.5 6.2C1 8.1 1 12 1 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.5 8.4.5 8.4.5s6.5 0 8.4-.5a3 3 0 0 0 2.1-2.1c.5-1.9.5-5.8.5-5.8zM9.8 15.6V8.4l6.3 3.6-6.3 3.6z',
  instagram: 'M12 2.2c3.2 0 3.6 0 4.9.1 1.2.1 1.8.3 2.2.4.6.2 1 .5 1.4.9.4.4.7.8.9 1.4.2.4.4 1 .4 2.2.1 1.3.1 1.7.1 4.9s0 3.6-.1 4.9c-.1 1.2-.3 1.8-.4 2.2-.2.6-.5 1-.9 1.4-.4.4-.8.7-1.4.9-.4.2-1 .4-2.2.4-1.3.1-1.7.1-4.9.1s-3.6 0-4.9-.1c-1.2-.1-1.8-.3-2.2-.4-.6-.2-1-.5-1.4-.9-.4-.4-.7-.8-.9-1.4-.2-.4-.4-1-.4-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.9c.1-1.2.3-1.8.4-2.2.2-.6.5-1 .9-1.4.4-.4.8-.7 1.4-.9.4-.2 1-.4 2.2-.4C8.4 2.2 8.8 2.2 12 2.2zm0 3.2A6.6 6.6 0 1 0 18.6 12 6.6 6.6 0 0 0 12 5.4zm0 10.9A4.3 4.3 0 1 1 16.3 12 4.3 4.3 0 0 1 12 16.3zm6.9-11.1a1.5 1.5 0 1 1-1.5-1.5 1.5 1.5 0 0 1 1.5 1.5z',
  spotify:   'M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm4.6 14.4a.8.8 0 0 1-1.1.3 12.4 12.4 0 0 0-6-1.4 12 12 0 0 0-2.4.3.8.8 0 0 1-.3-1.5 13.6 13.6 0 0 1 2.7-.3 14 14 0 0 1 6.8 1.6.8.8 0 0 1 .3 1zm1.2-2.9a.9.9 0 0 1-1.3.3 15.3 15.3 0 0 0-7.3-1.7 15.2 15.2 0 0 0-3 .3.9.9 0 1 1-.4-1.8 17 17 0 0 1 3.4-.3 17 17 0 0 1 8.2 1.9.9.9 0 0 1 .4 1.3zm1.3-3.2a1.1 1.1 0 0 1-1.5.4A18.6 18.6 0 0 0 9.7 8.6a18.4 18.4 0 0 0-3.6.4 1.1 1.1 0 1 1-.5-2.1 20.7 20.7 0 0 1 4.1-.4 20.8 20.8 0 0 1 9.1 2 1.1 1.1 0 0 1 .3 1.5z',
  facebook:  'M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9a15 15 0 0 1 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.5 2.9h-2.3v7A10 10 0 0 0 22 12z',
  bandcamp:  'M2 18l6-12h14L16 18H2z',
  apple:     'M17 12.5c0-2.2 1.8-3.3 1.9-3.4a4.2 4.2 0 0 0-3.3-1.8c-1.4-.1-2.7.8-3.4.8s-1.8-.8-3-.8a4.4 4.4 0 0 0-3.7 2.3c-1.6 2.7-.4 6.8 1.1 9 .8 1.1 1.7 2.3 2.9 2.3s1.6-.7 3-.7 1.8.7 3 .7 2-1.1 2.8-2.2a9 9 0 0 0 1.2-2.6 4 4 0 0 1-2.5-3.6zM14.8 5.3A4 4 0 0 0 15.8 2a4.2 4.2 0 0 0-2.8 1.4 3.9 3.9 0 0 0-1 3.2 3.5 3.5 0 0 0 2.8-1.3z',
};

function renderSocials(site) {
  const wrap = $('#socials');
  if (!wrap) return;
  const links = (site.links || []).filter((l) => l.url);
  wrap.innerHTML = links.map((l) => `
    <a class="social" href="${esc(l.url)}" target="_blank" rel="noopener"
       aria-label="${esc(l.label)}" title="${esc(l.label)}">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="${ICONS[l.icon] || ICONS.youtube}"/></svg>
    </a>`).join('');
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(+d)) return '';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function renderShows(site) {
  const list = $('#showList');
  if (!list) return;

  const shows = [...(site.shows || [])].sort((a, b) => a.date.localeCompare(b.date));
  if (!shows.length) {
    list.innerHTML = `<li class="shows-empty">No dates announced yet — check back soon,
      or <a href="#booking">get in touch</a> about booking us.</li>`;
    return;
  }

  // "Today" at midnight, so a gig still counts as upcoming on the day itself.
  const today = new Date(); today.setHours(0, 0, 0, 0);

  list.innerHTML = shows.map((s) => {
    const d = new Date(s.date);
    const past = d < today;
    return `
      <li class="show${past ? ' show--past' : ''}">
        <span class="show-date">
          <b>${d.toLocaleDateString('en-GB', { day: '2-digit' })}</b>
          <span>${d.toLocaleDateString('en-GB', { month: 'short' })} ${d.getFullYear()}</span>
        </span>
        <span class="show-what">
          <b>${esc(s.venue)}</b>
          <span>${esc(s.city)}${s.note ? ` · ${esc(s.note)}` : ''}</span>
        </span>
        <span class="show-cta">
          ${s.url ? `<a class="btn" href="${esc(s.url)}" target="_blank" rel="noopener">Tickets</a>`
                  : '<span class="tag">Free entry</span>'}
        </span>
      </li>`;
  }).join('');
}

function renderTicker(site) {
  const items = site.marquee?.length ? site.marquee : [site.band?.name || 'Harbour Sons'];
  // Duplicated track: the second copy slides in as the first slides out.
  const html = items.map((t) => `<span>${esc(t)}</span>`).join('');
  $('#ticker').innerHTML = html;
  $('#tickerClone').innerHTML = html;
}

/* ==========================================================================
   4. Chrome — sticky masthead, mobile nav, scroll spy, reveals
   ========================================================================== */

function initChrome() {
  const masthead = $('#masthead');
  const nav = $('#nav');
  const toggle = $('#navToggle');

  const onScroll = () => masthead.classList.toggle('is-stuck', window.scrollY > 40);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!open));
    nav.classList.toggle('is-open', !open);
  });
  $$('a', nav).forEach((a) => a.addEventListener('click', () => {
    toggle.setAttribute('aria-expanded', 'false');
    nav.classList.remove('is-open');
  }));

  // Highlight the section currently in view.
  const sections = $$('main section[id]');
  const links = new Map($$('a[href^="#"]', nav).map((a) => [a.getAttribute('href').slice(1), a]));
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const link = links.get(e.target.id);
        if (!link) return;
        links.forEach((l) => l.removeAttribute('aria-current'));
        link.setAttribute('aria-current', 'true');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach((s) => io.observe(s));
  }
}

let revealObserver;
let revealFailsafe;

function revealAll() {
  $$('.reveal').forEach((el) => el.classList.add('is-in'));
}

function observeReveals(root = document) {
  // A zero-sized viewport (a tab that has never been painted) makes every
  // IntersectionObserver rect empty, so nothing would ever intersect and the
  // page would stay blank. Don't hide anything in that case.
  const measurable = window.innerWidth > 0 && window.innerHeight > 0;
  const canAnimate = !prefersReducedMotion && 'IntersectionObserver' in window && measurable;
  if (!canAnimate) { revealAll(); return; }

  // Opt in to the hidden starting state only now that we know we can undo it.
  document.documentElement.classList.add('js-reveal');

  revealObserver ||= new IntersectionObserver((entries, obs) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-in');
      obs.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.05 });

  $$('.reveal', root).forEach((el) => revealObserver.observe(el));

  // Belt and braces: if the observer never fires — a zero-sized viewport, a
  // restored background tab — show everything rather than leave a blank page.
  clearTimeout(revealFailsafe);
  revealFailsafe = setTimeout(() => {
    if (!$('.reveal.is-in')) revealAll();
  }, 2500);
}

/* ==========================================================================
   Boot
   ========================================================================== */

(async function init() {
  initChrome();

  const [site, videos] = await Promise.all([
    loadJSON('data/site.json', {}),
    loadJSON('data/videos.json', null),
  ]);

  document.title = `${site.band?.name || 'Harbour Sons'} — ${site.band?.tagline || ''}`.trim();

  bindText(site);
  renderTicker(site);
  renderShows(site);
  renderSocials(site);
  renderVideos(videos, site);
  initHero(site.hero);

  observeReveals();
})();
