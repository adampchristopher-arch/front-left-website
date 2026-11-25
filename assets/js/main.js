(() => {
 const toggle = document.querySelector('.mobile-menu-button');
 const menu = document.querySelector('.mobile-menu');
 if (!toggle || !menu) return;
 let previousOverflow = '';
 function setOpen(open) {
  if (open) previousOverflow = document.body.style.overflow;
  menu.hidden = !open;
  toggle.setAttribute('aria-expanded', String(open));
  toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  toggle.firstElementChild.textContent = open ? '×' : '☰';
  document.body.style.overflow = open ? 'hidden' : previousOverflow;
  if (open) menu.querySelector('a')?.focus();
  else toggle.focus();
 }
 toggle.addEventListener('click', () => setOpen(menu.hidden));
 menu.addEventListener('click', e => { if (e.target.closest('a')) setOpen(false); });
 document.addEventListener('keydown', e => {
  if(menu.hidden) return;
  if(e.key === 'Escape') {setOpen(false);return;}
  if(e.key === 'Tab') {
   const nodes = [toggle, ...menu.querySelectorAll('a[href]')];
   const index = nodes.indexOf(document.activeElement);
   if(e.shiftKey && index <= 0) {e.preventDefault();nodes[nodes.length-1]?.focus();}
   else if(!e.shiftKey && index === nodes.length-1) {e.preventDefault();toggle.focus();}
  }
 });
 window.addEventListener('resize', () => {if(window.innerWidth > 700 && !menu.hidden) setOpen(false);});
})();

/* v51: modules that must re-attach after a content swap register here. */
window.flPageReady = window.flPageReady || [];
window.flRunPageReady = function () {
 (window.flPageReady || []).forEach(function (fn) { try { fn(); } catch (error) { /* a broken module must not stop browsing */ } });
};

/* v51: internal links swap only the content area, so the layout — and the music frame inside it — never reloads. */
(function () {
 if (!(window.history && window.history.pushState && window.fetch && window.DOMParser)) return;
 if (!document.querySelector('.soundcloud-player[data-sitewide="true"]')) return;
 var main = document.getElementById('main');
 if (!main) return;
 var DOWNLOAD = /\.(?:pdf|zip|rar|7z|gz|tar|jpe?g|png|gif|webp|avif|svg|ico|mp3|wav|ogg|m4a|flac|mp4|mov|webm|txt|rtf|docx?|xlsx?|pptx?|csv|json|xml|rss|atom|webmanifest|apk|exe|dmg)$/i;
 var key = 0, scrolls = {}, busy = false;
 function remember() { scrolls[key] = window.scrollY || window.pageYOffset || 0; }
 function internalUrl(link) {
  if (link.target && link.target !== '_self') return null;
  if (link.hasAttribute('download')) return null;
  if (/\bexternal\b/i.test(link.getAttribute('rel') || '')) return null;
  var href = link.getAttribute('href');
  if (!href || href.charAt(0) === '#') return null;
  if (/^(?:mailto:|tel:|sms:|callto:|facetime:|javascript:|data:|blob:)/i.test(href)) return null;
  var url;
  try { url = new URL(href, document.baseURI); } catch (error) { return null; }
  if (url.origin !== window.location.origin) return null;
  if (DOWNLOAD.test(url.pathname)) return null;
  if (url.pathname === window.location.pathname && url.search === window.location.search) return null;
  return url;
 }
 function apply(html) {
  var parsed = new DOMParser().parseFromString(html, 'text/html');
  var fresh = parsed.getElementById('main');
  if (!fresh) return false;
  /* A parsed document is not a live one: noscript markup arrives as real elements and embedded scripts never run, so those pages keep their normal load. */
  Array.prototype.forEach.call(fresh.querySelectorAll('noscript'), function (node) { node.remove(); });
  if (fresh.querySelector('script')) return false;
  var viewer = document.querySelector('.photo-viewer');
  if (viewer && viewer.classList.contains('is-open')) {
   viewer.classList.remove('is-open');
   document.documentElement.classList.remove('photo-viewer-open');
  }
  main.replaceWith(fresh);
  main = fresh;
  document.title = parsed.title || document.title;
  return true;
 }
 function landed(url, restored) {
  var hash = '';
  try { hash = url.hash ? decodeURIComponent(url.hash.slice(1)) : ''; } catch (error) { hash = url.hash.slice(1); }
  var anchor = hash ? document.getElementById(hash) : null;
  if (anchor) anchor.scrollIntoView();
  else if (restored) window.scrollTo(0, restored);
  else window.scrollTo(0, 0);
  window.flRunPageReady();
  busy = false;
 }
 function navigate(url, push, restored) {
  if (busy) { window.location.href = url.href; return; }
  busy = true;
  remember();
  window.fetch(url.href, { credentials: 'same-origin', headers: { Accept: 'text/html' } })
   .then(function (response) {
    if (!response.ok) throw new Error('unavailable');
    if ((response.headers.get('content-type') || '').indexOf('text/html') === -1) throw new Error('not a page');
    return response.text();
   })
   .then(function (html) {
    if (!apply(html)) throw new Error('unexpected page');
    if (push) window.history.pushState({ fl: ++key }, '', url);
    landed(url, push ? 0 : restored);
   })
   .catch(function () { busy = false; window.location.href = url.href; });
 }
 document.addEventListener('click', function (event) {
  if (event.defaultPrevented || event.button !== 0) return;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  var link = event.target && event.target.closest ? event.target.closest('a[href]') : null;
  if (!link || link.closest('.gallery') || link.closest('.photo-viewer')) return;
  var url = internalUrl(link);
  if (!url) return;
  event.preventDefault();
  navigate(url, true, 0);
 });
 window.addEventListener('popstate', function (event) {
  var state = event.state;
  var next = state && typeof state.fl === 'number' ? state.fl : 0;
  remember();
  key = next;
  navigate(new URL(window.location.href), false, scrolls[next] || 0);
 });
 window.history.replaceState({ fl: 0 }, '', window.location.href);
})();

/* Independent of navigation so the fallback also works without menus. */
(() => {
 const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
 let art = null, lines = [], letters = [], points = [], frame = 0, pointer = null, touchId = null, observer = null;
 function stop() {
  const id = touchId;
  touchId = null;
  pointer = null;
  if (frame) cancelAnimationFrame(frame);
  frame = 0;
  if (id !== null && art && art.hasPointerCapture?.(id)) art.releasePointerCapture(id);
  reset();
 }
 function reset() {
  letters.forEach(letter => {
   letter.style.setProperty('--mouse-x', '0px');
   letter.style.setProperty('--mouse-y', '0px');
  });
 }
 function measure() {
  if (!art) return;
  reset();
  const maximum = window.innerWidth <= 700 ? 28 : 96;
  lines.forEach(line => {
   line.style.fontSize = maximum + 'px';
   line.style.whiteSpace = 'nowrap';
   const width = line.getBoundingClientRect().width;
   const range = document.createRange();
   range.selectNodeContents(line);
   const textWidth = range.getBoundingClientRect().width;
   if (textWidth > width && textWidth > 0) line.style.fontSize = (maximum * width / textWidth * 0.98) + 'px';
  });
  points = letters.map(letter => {
   const rect = letter.getBoundingClientRect();
   const x = parseFloat(letter.style.getPropertyValue('--mouse-x')) || 0;
   const y = parseFloat(letter.style.getPropertyValue('--mouse-y')) || 0;
   return { x: rect.left + rect.width / 2 - x, y: rect.top + rect.height / 2 - y };
  });
 }
 function move() {
  frame = 0;
  if (!pointer || motion.matches) return;
  letters.forEach((letter, index) => {
   const point = points[index];
   if (!point) return;
   const dx = point.x - pointer.x;
   const dy = point.y - pointer.y;
   const distance = Math.hypot(dx, dy);
   const radius = pointer.touch ? 95 : 145;
   const strength = pointer.touch ? 28 : 65;
   const force = distance < radius ? (1 - distance / radius) * strength : 0;
   const angle = Math.atan2(dy, dx);
   letter.style.setProperty('--mouse-x', `${Math.cos(angle) * force}px`);
   letter.style.setProperty('--mouse-y', `${Math.sin(angle) * force}px`);
  });
 }
 function track(event) {
  if (motion.matches) return;
  if (event.pointerType === 'touch' && event.pointerId !== touchId) return;
  if (event.pointerType !== 'touch' && touchId !== null) return;
  pointer = { x: event.clientX, y: event.clientY, touch: event.pointerType === 'touch' };
  if (!frame) frame = requestAnimationFrame(move);
 }
 function release(event) { if (event.pointerId === touchId) stop(); }
 /* Listeners on the document belong to the module, not to one piece of artwork, so swapping pages cannot stack copies of them. */
 document.addEventListener('pointermove', track);
 document.addEventListener('pointerup', release);
 document.addEventListener('pointercancel', release);
 document.addEventListener('pointerleave', () => { if (touchId === null) stop(); });
 window.addEventListener('blur', stop);
 window.addEventListener('resize', measure);
 window.addEventListener('scroll', measure, { passive: true });
 motion.addEventListener('change', stop);
 function initializeType() {
  const node = document.querySelector('.type-art');
  if (!node) {
   if (art) { stop(); art = null; lines = []; letters = []; points = []; if (observer) { observer.disconnect(); observer = null; } }
   return;
  }
  if (node.dataset.typeReady) return;
  node.dataset.typeReady = '1';
  art = node;
  lines = [...art.querySelectorAll('.type-line')];
  for (const line of lines) {
   const words = line.textContent.trim().split(/\s+/);
   line.replaceChildren();
   words.forEach((word, index) => {
    if (index) line.append(document.createTextNode(' '));
    const span = document.createElement('span');
    span.className = 'type-word';
    for (const character of word) {
     const letter = document.createElement('span');
     letter.className = 'type-letter';
     letter.textContent = character;
     span.append(letter);
    }
    line.append(span);
   });
  }
  letters = [...art.querySelectorAll('.type-letter')];
  art.addEventListener('pointerdown', event => {
   if (motion.matches || event.pointerType !== 'touch' || touchId !== null) return;
   touchId = event.pointerId;
   art.setPointerCapture?.(touchId);
   track(event);
  });
  art.addEventListener('lostpointercapture', release);
  if (observer) observer.disconnect();
  if (typeof ResizeObserver !== 'undefined') { observer = new ResizeObserver(measure); observer.observe(art); }
  measure();
  document.fonts?.ready.then(measure);
 }
 (window.flPageReady = window.flPageReady || []).push(initializeType);
 if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initializeType, { once: true });
 else initializeType();
})();
/* v35: publish the footer height so the homepage player can sit clear of the footer links */
(function () {
  function set() {
    var f = document.querySelector('.site-footer');
    if (f) document.documentElement.style.setProperty('--footer-h', Math.round(f.getBoundingClientRect().height) + 'px');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', set, { once: true }); else set();
  (window.flPageReady = window.flPageReady || []).push(set);
  window.addEventListener('load', set);
  window.addEventListener('resize', set);
})();
/* SoundCloud: shared Widget API for visible desktop and off-screen mobile playback. */
(function () {
  var apiPromise;
  function loadApi() {
    if (window.SC && window.SC.Widget) return Promise.resolve(window.SC);
    if (!apiPromise) apiPromise = new Promise(function (resolve, reject) {
      var script = document.createElement('script');
      script.src = 'https://w.soundcloud.com/player/api.js';
      script.onload = function () { if (window.SC && window.SC.Widget) resolve(window.SC); else reject(new Error('Widget unavailable')); };
      script.onerror = function () { reject(new Error('Widget unavailable')); };
      document.head.appendChild(script);
    });
    return apiPromise;
  }
  function build(box) {
    if (box.dataset.scBuilt) return;
    box.dataset.scBuilt = '1';
    var button = document.querySelector('.soundcloud-toggle');
    var status = document.querySelector('.soundcloud-status');
    var track = document.querySelector('.soundcloud-track');
    var mobile = window.matchMedia('(max-width: 700px)');
    var ready = false, playing = false, pending = 0, widget;
    var titleRequest = 0;
    function updateTrack() {
      if (!track) return;
      track.hidden = !playing || !track.textContent;
      if (!playing || !widget) { titleRequest++; return; }
      var request = ++titleRequest;
      widget.getCurrentSound(function (sound) {
        if (request !== titleRequest || !playing) return;
        var title = sound && typeof sound.title === 'string' ? sound.title.trim() : '';
        track.textContent = title;
        track.title = title;
        track.hidden = !title;
      });
    }
    function label(text) {
      if (button) { button.setAttribute('aria-label', text); button.title = text; }
    }
    function clearPending() {
      clearTimeout(pending);
      if (button) button.removeAttribute('aria-busy');
    }
    function state(isPlaying) {
      clearPending(); playing = isPlaying;
      if (button) button.setAttribute('aria-pressed', String(isPlaying));
      label(isPlaying ? 'Pause music' : 'Play music');
      if (status) status.textContent = isPlaying ? 'Music playing' : 'Music paused';
      updateTrack();
    }
    function unavailable() {
      ready = false; playing = false; titleRequest++; clearPending();
      if (track) track.hidden = true;
      if (button) button.setAttribute('aria-pressed', 'false');
      if (button) button.disabled = true;
      label('Music unavailable');
      if (status) status.textContent = 'Music unavailable';
    }
    var raw = (box.getAttribute('data-soundcloud') || '').trim();
    var match = raw.match(/src=["']([^"']+)["']/i);
    if (match) raw = match[1].replace(/&amp;/g, '&');
    try {
      var url = new URL(raw);
      if (url.hostname === 'w.soundcloud.com') { raw = url.searchParams.get('url') || raw; url = new URL(raw); }
      if (url.protocol !== 'https:' || !/(^|\.)soundcloud\.com$/.test(url.hostname)) throw new Error('Invalid SoundCloud link');
      raw = url.origin + url.pathname;
    } catch (error) { unavailable(); return; }
    var frame = document.createElement('iframe');
    frame.title = 'SoundCloud player'; frame.allow = 'autoplay; encrypted-media';
    frame.setAttribute('scrolling', 'no'); frame.setAttribute('frameborder', 'no');
    box.setAttribute('aria-hidden', 'true'); frame.tabIndex = -1;
    var autoplay = Boolean(box.dataset.autoplay) && !mobile.matches;
    frame.src = 'https://w.soundcloud.com/player/?url=' + encodeURIComponent(raw) + '&color=%23c6ff00&auto_play=' + autoplay + '&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true&visual=true';
    box.appendChild(frame);
    var loadingTimer = setTimeout(unavailable, 30000);
    loadApi().then(function (SC) {
      widget = SC.Widget(frame);
      widget.bind(SC.Widget.Events.PLAY, function () { state(true); });
      widget.bind(SC.Widget.Events.PAUSE, function () { state(false); });
      widget.bind(SC.Widget.Events.FINISH, function () { state(false); });
      widget.bind(SC.Widget.Events.ERROR, function () { clearTimeout(loadingTimer); unavailable(); });
      widget.bind(SC.Widget.Events.READY, function () {
        clearTimeout(loadingTimer); ready = true;
        if (button) button.disabled = false;
        state(false);
        widget.isPaused(function (paused) { state(!paused); });
        if (autoplay && !mobile.matches) widget.play();
      });
      if (button) button.addEventListener('click', function () {
        if (!ready || !widget) return;
        clearPending();
        if (playing) widget.pause();
        else {
          button.setAttribute('aria-busy', 'true');
          widget.play();
          pending = setTimeout(function () {
            clearPending();
            if (!playing) { label('Retry playing music'); if (status) status.textContent = 'Playback did not start. Tap to retry.'; }
          }, 8000);
        }
      });
      if (autoplay) {
        function kick() {
          if (!ready || mobile.matches) return;
          if (!playing) widget.play();
          ['pointerdown', 'keydown', 'touchstart'].forEach(function (event) { document.removeEventListener(event, kick, true); });
        }
        ['pointerdown', 'keydown', 'touchstart'].forEach(function (event) { document.addEventListener(event, kick, true); });
      }
    }).catch(function () { clearTimeout(loadingTimer); unavailable(); });
  }
  function init() { document.querySelectorAll('.soundcloud-player[data-soundcloud]').forEach(build); }
  (window.flPageReady = window.flPageReady || []).push(init);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
