/* v67: native Front Left crossword. Initialises whenever a .fl-crossword appears in #main, so in-site navigation keeps the music playing. */
(function () {
 var PUZZLE = {"title": "Front Left", "rows": ["###########S##D###V", "###########Y##R#M#I", "###F##D##B#N##O#I#N", "###U##E##AFTERPARTY", "#T#N##T##S#H####R#L", "DECKS#R##S##DISCO##", "#M##C#O##L##E#T#R##", "#P##R#I##I##E#U#B##", "#O#DAFTPUNK#P#D#A##", "####T####E##H#I#L##", "####C#######O#O#L##", "###CHICAGO##U#5####", "########R###S#4####", "#######BOOGIE######", "########O#A########", "########V#REMIX####", "###STROBE#A##B#####", "####E##P##G##I#####", "####C##MIXER#Z#####", "####H########ACID##", "####N##############", "##BOOTH############"], "clues": {"across": [{"n": 8, "clue": "The party that starts when the main one ends", "len": 10}, {"n": 10, "clue": "What a DJ plays records on", "len": 5}, {"n": 12, "clue": "The genre that made the dancefloor famous", "len": 5}, {"n": 14, "clue": "French electronic duo behind One More Time", "len": 8}, {"n": 15, "clue": "The birthplace of house music", "len": 7}, {"n": 17, "clue": "To dance enthusiastically", "len": 6}, {"n": 19, "clue": "A new version of an existing track", "len": 5}, {"n": 21, "clue": "Flashing light used in nightclubs", "len": 6}, {"n": 24, "clue": "Where a DJ blends two tracks together", "len": 5}, {"n": 25, "clue": "Subgenre famous for its squelching basslines", "len": 4}, {"n": 26, "clue": "Where the DJ works", "len": 5}], "down": [{"n": 1, "clue": "Electronic instrument used to create sounds", "len": 5}, {"n": 2, "clue": "The moment the bass kicks in", "len": 4}, {"n": 3, "clue": "The old-school format DJs love to spin", "len": 5}, {"n": 4, "clue": "Spinning decoration that scatters light", "len": 10}, {"n": 5, "clue": "A groovy genre built around rhythm and bass", "len": 4}, {"n": 6, "clue": "The birthplace of techno", "len": 7}, {"n": 7, "clue": "The low-frequency musical foundation", "len": 8}, {"n": 9, "clue": "The speed of a track", "len": 5}, {"n": 11, "clue": "A classic DJ technique using a record", "len": 7}, {"n": 12, "clue": "Smooth, soulful style of house music", "len": 9}, {"n": 13, "clue": "Legendary New York nightclub", "len": 8}, {"n": 16, "clue": "The irresistible rhythmic feel of a track", "len": 6}, {"n": 18, "clue": "Genre with roots in New York club culture", "len": 6}, {"n": 20, "clue": "Spanish island famous for its club scene", "len": 5}, {"n": 22, "clue": "Electronic dance music with repetitive beats", "len": 6}, {"n": 23, "clue": "Beats per minute", "len": 3}]}};
 var KEY = 'fl-crossword-v1';
 function init(root) {
  if (root.dataset.ready) return; root.dataset.ready = '1';
  var rows = PUZZLE.rows, H = rows.length, W = rows[0].length;
  var cells = [], nums = {}, words = { across: {}, down: {} }, n = 0;
  function open(r, c) { return r >= 0 && c >= 0 && r < H && c < W && rows[r][c] !== '#'; }
  for (var r = 0; r < H; r++) for (var c = 0; c < W; c++) if (open(r, c)) {
   var a = !open(r, c - 1) && open(r, c + 1), d = !open(r - 1, c) && open(r + 1, c);
   if (a || d) { n++; nums[r + ',' + c] = n; }
   if (a) { var w = []; for (var k = c; open(r, k); k++) w.push(r + ',' + k); words.across[n] = w; }
   if (d) { var w2 = []; for (var k2 = r; open(k2, c); k2++) w2.push(k2 + ',' + c); words.down[n] = w2; }
  }
  var saved = {}; try { saved = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) {}
  var grid = root.querySelector('.xw-board'), inputs = {};
  grid.style.setProperty('--cols', W);
  grid.style.setProperty('--rows', H);
  for (r = 0; r < H; r++) for (c = 0; c < W; c++) {
   var cell = document.createElement('div'), id = r + ',' + c;
   cell.className = 'xw-sq';
   if (!open(r, c)) { cell.className += ' is-block'; grid.appendChild(cell); continue; }
   if (nums[id]) { var s = document.createElement('span'); s.className = 'xw-n'; s.textContent = nums[id]; cell.appendChild(s); }
   var inp = document.createElement('input');
   inp.maxLength = 1; inp.autocomplete = 'off'; inp.setAttribute('autocapitalize', 'characters'); inp.spellcheck = false;
   inp.dataset.id = id; inp.value = saved[id] || ''; inp.setAttribute('aria-label', 'Row ' + (r + 1) + ' column ' + (c + 1));
   cell.appendChild(inp); grid.appendChild(cell); inputs[id] = inp;
  }
  var dir = 'across', cur = null;
  function wordOf(id, d) { for (var k in words[d]) if (words[d][k].indexOf(id) > -1) return k; return null; }
  function highlight() {
   Object.keys(inputs).forEach(function (k) { inputs[k].parentNode.classList.remove('in-word', 'is-cur'); });
   root.querySelectorAll('.xw-clue').forEach(function (li) { li.classList.remove('is-active'); });
   if (!cur) return;
   var k = wordOf(cur, dir); if (!k) { dir = dir === 'across' ? 'down' : 'across'; k = wordOf(cur, dir); }
   words[dir][k].forEach(function (id) { inputs[id].parentNode.classList.add('in-word'); });
   inputs[cur].parentNode.classList.add('is-cur');
   var li = root.querySelector('.xw-clue[data-key="' + dir + k + '"]');
   if (li) { li.classList.add('is-active'); root.querySelector('.xw-current').textContent = k + ' ' + dir + ': ' + li.dataset.clue; }
  }
  function save() { var o = {}; Object.keys(inputs).forEach(function (k) { if (inputs[k].value) o[k] = inputs[k].value; }); try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {} progress(); }
  function progress() { var f = 0, t = 0; Object.keys(inputs).forEach(function (k) { t++; if (inputs[k].value) f++; }); root.querySelector('.xw-progress').textContent = f + ' / ' + t; }
  function step(delta) {
   var w = words[dir][wordOf(cur, dir)], i = w.indexOf(cur) + delta;
   if (i >= 0 && i < w.length) inputs[w[i]].focus();
  }
  function move(dr, dc) { var p = cur.split(',').map(Number), r2 = p[0] + dr, c2 = p[1] + dc; while (r2 >= 0 && c2 >= 0 && r2 < H && c2 < W) { if (open(r2, c2)) { inputs[r2 + ',' + c2].focus(); return; } r2 += dr; c2 += dc; } }
  Object.keys(inputs).forEach(function (id) {
   var inp = inputs[id];
   inp.addEventListener('focus', function () { cur = id; highlight(); inp.select(); });
   inp.addEventListener('mousedown', function () { if (cur === id && wordOf(id, dir === 'across' ? 'down' : 'across')) { dir = dir === 'across' ? 'down' : 'across'; highlight(); } });
   inp.addEventListener('input', function () {
    inp.value = inp.value.slice(-1).toUpperCase().replace(/[^A-Z0-9]/, ''); inp.parentNode.classList.remove('is-wrong', 'is-right'); save();
    if (inp.value) step(1);
   });
   inp.addEventListener('keydown', function (e) {
    var map = { ArrowRight: [0, 1, 'across'], ArrowLeft: [0, -1, 'across'], ArrowDown: [1, 0, 'down'], ArrowUp: [-1, 0, 'down'] };
    if (map[e.key]) { e.preventDefault(); var m = map[e.key]; if (dir !== m[2] && wordOf(id, m[2])) { dir = m[2]; highlight(); } else move(m[0], m[1]); }
    else if (e.key === 'Backspace' && !inp.value) { e.preventDefault(); step(-1); if (cur !== id) { inputs[cur].value = ''; save(); } }
    else if (e.key === ' ' || e.key === 'Tab') { if (e.key === ' ') { e.preventDefault(); dir = dir === 'across' ? 'down' : 'across'; highlight(); } }
   });
  });
  ['across', 'down'].forEach(function (d) {
   var ol = root.querySelector('.xw-list-' + d);
   PUZZLE.clues[d].forEach(function (cl) {
    var li = document.createElement('li'); li.className = 'xw-clue'; li.dataset.key = d + cl.n; li.dataset.clue = cl.clue + ' (' + cl.len + ')';
    li.innerHTML = '<b></b> <span></span>'; li.firstChild.textContent = cl.n; li.lastChild.textContent = cl.clue + ' (' + cl.len + ')';
    li.tabIndex = 0;
    function go() { dir = d; inputs[words[d][cl.n][0]].focus(); }
    li.addEventListener('click', go); li.addEventListener('keydown', function (e) { if (e.key === 'Enter') go(); });
    ol.appendChild(li);
   });
  });
  function answer(id) { var p = id.split(','); return rows[+p[0]][+p[1]]; }
  function mark(ids) { ids.forEach(function (id) { var v = inputs[id].value; inputs[id].parentNode.classList.toggle('is-wrong', !!v && v !== answer(id)); inputs[id].parentNode.classList.toggle('is-right', v === answer(id)); }); }
  function curWord() { return cur ? words[dir][wordOf(cur, dir)] : []; }
  var actions = {
   'check-word': function () { mark(curWord()); },
   'check-all': function () { mark(Object.keys(inputs)); var done = Object.keys(inputs).every(function (k) { return inputs[k].value === answer(k); }); if (done) root.querySelector('.xw-current').textContent = 'Solved — nice one!'; },
   'clear': function () { Object.keys(inputs).forEach(function (k) { inputs[k].value = ''; inputs[k].parentNode.classList.remove('is-wrong', 'is-right'); }); save(); }
  };
  root.querySelectorAll('[data-xw]').forEach(function (b) { b.addEventListener('click', function () { actions[b.dataset.xw](); if (cur) inputs[cur].focus(); }); });
  progress();
 }
 function scan() { document.querySelectorAll('.fl-crossword').forEach(init); }
 if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scan); else scan();
 new MutationObserver(scan).observe(document.documentElement, { childList: true, subtree: true });
})();
