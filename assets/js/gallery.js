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
    galleries.forEach(function (gallery) {
      fitBatch(gallery, Array.from(gallery.querySelectorAll('.gallery__item')));
    });
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
      galleries.forEach(function (gallery) {
        fitBatch(gallery, batch.filter(function (entry) { return entry.gallery === gallery; }).map(function (entry) { return entry.item; }));
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

  /* Seal each revealed batch into its own rows: later batches cannot rebalance it. */
  function fitBatch(gallery, items) {
    if (!items.length) return;
    var batch = document.createElement('div');
    batch.className = 'gallery-fit-batch';
    gallery.appendChild(batch);
    items.forEach(function (item) { batch.appendChild(item); });
    var images = items.map(function (item) { return item.querySelector('img'); });
    var ready = images.map(function (image) {
      if (!image || image.complete) return Promise.resolve();
      image.loading = 'eager';
      return new Promise(function (resolve) {
        image.addEventListener('load', resolve, { once: true });
        image.addEventListener('error', resolve, { once: true });
      });
    });
    Promise.all(ready).then(function () {
      if (!batch.isConnected) return;
      function layout() {
        var width = gallery.clientWidth;
        if (!width) return;
        /* On desktop, scale a typical phone's row composition to the full
           gallery width instead of squeezing extra thumbnails into each row. */
        var target = width <= 700 ? 120 : width * (120 / 340);
        var ratios = images.map(function (image) {
          return image && image.naturalWidth && image.naturalHeight ? image.naturalWidth / image.naturalHeight : 1;
        });
        /* Balance the whole batch, including the last row, rather than leaving
           an oversized orphan after greedily filling earlier rows. */
        var costs = new Array(items.length + 1).fill(Infinity);
        var breaks = new Array(items.length);
        costs[items.length] = 0;
        for (var start = items.length - 1; start >= 0; start--) {
          var total = 0;
          for (var stop = start + 1; stop <= items.length; stop++) {
            total += ratios[stop - 1];
            var height = width / total;
            var deviation = Math.log(height / target);
            var score = deviation * deviation + costs[stop];
            if (height > target * 1.5) score += Math.pow(height / target - 1.5, 2) * 10;
            if (score < costs[start]) {
              costs[start] = score;
              breaks[start] = stop;
            }
          }
        }
        var index = 0;
        while (batch.firstChild) batch.removeChild(batch.firstChild);
        while (index < items.length) {
          var end = breaks[index] || items.length;
          var sum = 0;
          for (var r = index; r < end; r++) sum += ratios[r];
          var row = document.createElement('div');
          row.className = 'gallery-fit-row';
          for (var i = index; i < end; i++) {
            items[i].style.width = (ratios[i] / sum * 100) + '%';
            row.appendChild(items[i]);
          }
          batch.appendChild(row);
          index = end;
        }
        batch.dataset.fitted = 'true';
      }
      layout();
      if (window.ResizeObserver) {
        var observer = new ResizeObserver(function () {
          if (!batch.isConnected) { observer.disconnect(); return; }
          layout();
        });
        observer.observe(gallery);
      }
    });
  }

  function runAll() {
    document.querySelectorAll('.gallery-batched').forEach(init);
    document.querySelectorAll('.gallery-featured').forEach(lockImages);
  }
  /* A page swap replaces the content area, so the setup is re-registered rather than run once at load. */
  (window.flPageReady = window.flPageReady || []).push(runAll);
  runAll();
})();
