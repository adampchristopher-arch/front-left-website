/* Inert editor markup prevents later gallery images downloading before Load more.
   Photos open in the theme's own viewer, so no browser image page with a download control. */
(function () {
  var BATCH = 12;
  var PROTECTED = '.gallery__item, .gallery-featured';

  function isProtected(node) {
    return !!(node && node.closest && node.closest(PROTECTED));
  }

  function block(event) {
    if (isProtected(event.target)) event.preventDefault();
  }

  document.addEventListener('contextmenu', block);
  document.addEventListener('dragstart', block);

  function lock(image) {
    image.setAttribute('draggable', 'false');
    image.draggable = false;
  }

  function lockImages(root) {
    root.querySelectorAll('img').forEach(lock);
  }

  function openViewer(src, alt, caption, trigger) {
    var viewer = document.querySelector('.photo-viewer');
    if (!viewer) {
      viewer = document.createElement('div');
      viewer.className = 'photo-viewer';
      viewer.setAttribute('role', 'dialog');
      viewer.setAttribute('aria-modal', 'true');
      viewer.setAttribute('aria-label', 'Photo');
      viewer.innerHTML = '<button class="photo-viewer-close" type="button" aria-label="Close photo">&#215;</button>' +
        '<img class="photo-viewer-image" alt="">' +
        '<p class="photo-viewer-caption"></p>';
      document.body.appendChild(viewer);
      viewer.addEventListener('click', function (event) {
        var target = event.target;
        if (target === viewer || target.classList.contains('photo-viewer-close') || target.classList.contains('photo-viewer-image')) closeViewer();
      });
      document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') closeViewer();
      });
    }
    var image = viewer.querySelector('.photo-viewer-image');
    image.src = src;
    image.alt = alt || '';
    lock(image);
    viewer.querySelector('.photo-viewer-caption').textContent = caption || '';
    viewer.querySelector('.photo-viewer-caption').hidden = !caption;
    viewer.classList.add('is-open');
    document.documentElement.classList.add('photo-viewer-open');
    viewer._trigger = trigger || null;
    viewer.querySelector('.photo-viewer-close').focus();
  }

  function closeViewer() {
    var viewer = document.querySelector('.photo-viewer');
    if (!viewer || !viewer.classList.contains('is-open')) return;
    viewer.classList.remove('is-open');
    document.documentElement.classList.remove('photo-viewer-open');
    var trigger = viewer._trigger;
    viewer._trigger = null;
    if (trigger && trigger.focus) trigger.focus();
  }

  function galleryLink(node) {
    var link = node && node.closest && node.closest('a[href]');
    if (!link || !link.closest('.gallery')) return null;
    return link;
  }

  document.addEventListener('click', function (event) {
    var link = galleryLink(event.target);
    if (!link) return;
    event.preventDefault();
    var item = link.closest('.gallery__item') || link.querySelector('.gallery__item');
    var image = item && item.querySelector('img');
    var caption = item && item.querySelector('figcaption');
    openViewer(link.href, image && image.alt, caption && caption.textContent, link);
  });

  function init(root) {
    var source = root.querySelector('template.gallery-source');
    if (!source || root.dataset.galleryReady) return;
    root.dataset.galleryReady = 'true';
    var content = source.content;
    var items = Array.from(content.querySelectorAll('.gallery .gallery__item'));
    var pending = [];
    items.forEach(function (item, index) {
      item.querySelectorAll('img').forEach(function (image) {
        image.loading = 'lazy';
        image.decoding = 'async';
        lock(image);
      });
      if (index >= BATCH) {
        pending.push({ item: item, gallery: item.parentElement });
        item.remove();
      }
    });
    var galleries = Array.from(content.querySelectorAll('.gallery'));
    galleries.forEach(function (gallery) {
      gallery.hidden = !gallery.querySelector('.gallery__item');
    });
    root.insertBefore(content, source);
    source.remove();
    var shown = Math.min(BATCH, items.length);
    if (!pending.length) return;
    var controls = document.createElement('div');
    controls.className = 'gallery-controls';
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'gallery-more';
    button.textContent = 'Load more';
    var status = document.createElement('span');
    status.className = 'gallery-count';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    function update() {
      status.textContent = shown + ' of ' + items.length + ' photos';
      button.hidden = !pending.length;
    }
    button.addEventListener('click', function () {
      var batch = pending.splice(0, BATCH);
      batch.forEach(function (entry) {
        entry.gallery.hidden = false;
        entry.gallery.appendChild(entry.item);
      });
      shown += batch.length;
      update();
      var first = batch[0];
      if (first) {
        var target = first.item.querySelector('a[href], button') || first.item;
        if (target === first.item) target.tabIndex = -1;
        target.focus({ preventScroll: true });
      }
      root.dispatchEvent(new CustomEvent('gallery:loaded', { bubbles: true, detail: { shown: shown, total: items.length } }));
    });
    update();
    controls.appendChild(button);
    controls.appendChild(status);
    root.appendChild(controls);
  }

  function runAll() {
    document.querySelectorAll('.gallery-batched').forEach(init);
    document.querySelectorAll('.gallery-featured').forEach(lockImages);
  }
  /* A page swap replaces the content area, so the setup is re-registered rather than run once at load. */
  (window.flPageReady = window.flPageReady || []).push(runAll);
  runAll();
})();
