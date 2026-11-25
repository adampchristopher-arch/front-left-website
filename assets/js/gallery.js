/* Inert editor markup prevents later gallery images downloading before Load more. */
(function () {
  function init(root) {
    var source = root.querySelector('template.gallery-source');
    if (!source || root.dataset.galleryReady) return;
    root.dataset.galleryReady = 'true';
    var content = source.content;
    var items = Array.from(content.querySelectorAll('.gallery > .gallery__item'));
    var pending = [];
    items.forEach(function (item, index) {
      item.querySelectorAll('img').forEach(function (image) {
        image.loading = 'lazy'; image.decoding = 'async';
      });
      if (index >= 12) {
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
    var shown = Math.min(12, items.length);
    if (!pending.length) return;
    var controls = document.createElement('div');
    controls.className = 'gallery-controls';
    var button = document.createElement('button');
    button.type = 'button'; button.className = 'gallery-more';
    button.textContent = 'Load more';
    var status = document.createElement('span');
    status.className = 'gallery-count';
    status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
    function update() {
      status.textContent = shown + ' of ' + items.length + ' photos';
      button.hidden = !pending.length;
    }
    button.addEventListener('click', function () {
      var batch = pending.splice(0, 12);
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
    update(); controls.appendChild(button); controls.appendChild(status);
    root.appendChild(controls);
  }
  document.querySelectorAll('.gallery-batched').forEach(init);
})();