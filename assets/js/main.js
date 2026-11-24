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
    const force = distance < 145 ? (1 - distance / 145) * 65 : 0;
    const angle = Math.atan2(dy, dx);
    letter.style.setProperty('--mouse-x', `${Math.cos(angle) * force}px`);
    letter.style.setProperty('--mouse-y', `${Math.sin(angle) * force}px`);
   });
  }
  document.addEventListener('pointermove', event => {
   if (motion.matches || event.pointerType === 'touch') return;
   pointer = { x: event.clientX, y: event.clientY };
   if (!frame) frame = requestAnimationFrame(move);
  });
  document.addEventListener('pointerleave', () => { pointer = null; reset(); });
  window.addEventListener('blur', () => { pointer = null; reset(); });
  window.addEventListener('resize', measure);
  window.addEventListener('scroll', measure, { passive: true });
  motion.addEventListener('change', reset);
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
/* SoundCloud player: build a clean, encoded embed from the pasted link */
(function () {
  function init() {
    document.querySelectorAll('.soundcloud-player[data-soundcloud]').forEach(function (box) {
      var raw = (box.getAttribute('data-soundcloud') || '').trim();
      var m = raw.match(/src="([^"]+)"/); if (m) raw = m[1];
      try {
        var u = new URL(raw);
        if (u.hostname === 'w.soundcloud.com') { raw = u.searchParams.get('url') || raw; u = new URL(raw); }
        raw = u.origin + u.pathname;
      } catch (e) { return; }
      var f = document.createElement('iframe');
      f.title = 'SoundCloud player'; f.allow = 'autoplay; encrypted-media';
      f.setAttribute('scrolling', 'no'); f.setAttribute('frameborder', 'no');
      f.src = 'https://w.soundcloud.com/player/?url=' + encodeURIComponent(raw) + '&color=%23c6ff00&auto_play=' + (box.dataset.autoplay ? 'true' : 'false') + '&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true&visual=true';
      box.appendChild(f);
      if (box.dataset.autoplay) {
        var s = document.createElement('script'); s.src = 'https://w.soundcloud.com/player/api.js';
        s.onload = function () {
          var w = window.SC && SC.Widget(f), started = false;
          if (!w) return;
          w.bind(SC.Widget.Events.PLAY, function () { started = true; });
          w.bind(SC.Widget.Events.READY, function () { w.play(); });
          var kick = function () { if (!started) w.play(); ['pointerdown','keydown','touchstart'].forEach(function (e) { document.removeEventListener(e, kick, true); }); };
          ['pointerdown','keydown','touchstart'].forEach(function (e) { document.addEventListener(e, kick, true); });
        };
        document.head.appendChild(s);
      }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
