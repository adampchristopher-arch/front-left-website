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

/* Independent of navigation so the fallback also works without menus. */
(() => {
 function initializeType() {
  const art = document.querySelector('.type-art');
  if (!art) return;
  const lines = [...art.querySelectorAll('.type-line')];
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
  const letters = [...art.querySelectorAll('.type-letter')];
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let points = [];
  let frame = 0;
  let pointer = null;
  let touchId = null;
  function stop() {
   const id = touchId;
   touchId = null;
   pointer = null;
   if (frame) cancelAnimationFrame(frame);
   frame = 0;
   if (id !== null && art.hasPointerCapture?.(id)) art.releasePointerCapture(id);
   reset();
  }
  function reset() {
   letters.forEach(letter => {
    letter.style.setProperty('--mouse-x', '0px');
    letter.style.setProperty('--mouse-y', '0px');
   });
  }
  function measure() {
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
  art.addEventListener('pointerdown', event => {
   if (motion.matches || event.pointerType !== 'touch' || touchId !== null) return;
   touchId = event.pointerId;
   art.setPointerCapture?.(touchId);
   track(event);
  });
  document.addEventListener('pointermove', track);
  function release(event) { if (event.pointerId === touchId) stop(); }
  document.addEventListener('pointerup', release);
  document.addEventListener('pointercancel', release);
  art.addEventListener('lostpointercapture', release);
  document.addEventListener('pointerleave', () => { if (touchId === null) stop(); });
  window.addEventListener('blur', stop);
  window.addEventListener('resize', measure);
  window.addEventListener('scroll', measure, { passive: true });
  motion.addEventListener('change', stop);
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(measure).observe(art);
  measure();
  document.fonts?.ready.then(measure);
 }
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
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
