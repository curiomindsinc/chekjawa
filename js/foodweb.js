/* ============================================================
   foodweb.js — the "Food Web" panel (top-right 🕸 button).

   Reads each species' `trophic` (row) + `eats` (prey keys) from
   SPECIES + FLORA, lays every organism out on its trophic level and
   draws the links between them. Tap a node to trace what it eats
   (amber) and what eats it (red); a detail bar lists EATS / EATEN BY /
   SCAVENGED BY / SYMBIOSIS and links to its fact card.

   Savanna's engine, unchanged apart from two things BUILD_GUIDE §9
   asked for:

     LEVELS       intertidal rows. Filter and deposit feeders both sit
                  between grazers and producers but eat different things
                  (suspended plankton vs. surface detritus), so they get
                  separate rows — a real intertidal distinction, and the
                  v2 roster fills both.
     empty rows   a row with nobody in it is skipped at layout time, so
                  SCAVENGERS can stay in the array while the shore has
                  no scavenger yet (hermit crab, v2) without leaving a
                  label floating over blank space.

   To change who-eats-whom, edit each species' `eats` in species.js.
   ============================================================ */
(function () {
  'use strict';

  // trophic rows, top of the panel first. APEX PREDATORS was added in
  // §42 when the smooth-coated otter arrived, as the note below asked.
  // Empty rows are skipped at layout time, so it cost nothing to have
  // carried the plan here since §9.
  var LEVELS = [
    { label: 'APEX PREDATORS',  cls: 'lv-apex' },
    { label: 'PREDATORS',       cls: 'lv-pred' },
    { label: 'GRAZERS',         cls: 'lv-herb' },
    { label: 'FILTER FEEDERS',  cls: 'lv-filt' },
    { label: 'DEPOSIT FEEDERS', cls: 'lv-depo' },
    { label: 'SCAVENGERS',      cls: 'lv-scav' },
    { label: 'PRODUCERS',       cls: 'lv-prod' }
  ];

  var CATALOG = {};
  var rows = [];       // LEVELS entries that actually have members, with their y
  var pos = {};        // key -> {x, y} in 0-100 space
  var links = [];      // { prey, predator }  eats links (amber/red)
  var scavLinks = [];  // { prey, predator }  scavenge links (green)
  var symbLinks = [];  // { a, b }            symbiosis links (dashed purple, undirected)
  var selKey = null;
  var built = false;
  var overlay;

  var TOP = 15, BOT = 88;

  function $(id) { return document.getElementById(id); }

  function buildCatalog() {
    Object.keys(SPECIES).forEach(function (k) { CATALOG[k] = SPECIES[k]; });
    if (window.FLORA) Object.keys(FLORA).forEach(function (k) { CATALOG[k] = FLORA[k]; });
  }

  function keysByLevel(label) {
    return Object.keys(CATALOG).filter(function (k) { return CATALOG[k].trophic === label; });
  }

  /* ---- scavenging: a scavenger cleans up EVERY animal (auto-derived,
     so new animals need no edits here). Green links, both directions. ---- */
  function isScav(key) { return !!(CATALOG[key] && CATALOG[key].scavenger); }

  function scavengedList(scavKey) {
    return Object.keys(CATALOG).filter(function (k) {
      var c = CATALOG[k];
      return c.kind === 'animal' && !c.scavenger && k !== scavKey;
    });
  }

  function scavengersOf(animalKey) {
    var a = CATALOG[animalKey];
    if (!a || a.kind !== 'animal' || a.scavenger) return [];
    return Object.keys(CATALOG).filter(function (k) { return CATALOG[k].scavenger; });
  }

  /* ---- symbiosis: a mutual partnership. Listing it on ONE side is enough —
     the partner is reverse-derived, so both nodes show the relationship. ---- */
  function symbiontsOf(key) {
    var own = (CATALOG[key] && CATALOG[key].symbiosis) || [];
    var out = own.slice();
    Object.keys(CATALOG).forEach(function (k) {                 // who lists ME as a partner
      if ((CATALOG[k].symbiosis || []).indexOf(key) !== -1 && out.indexOf(k) === -1) out.push(k);
    });
    return out.filter(function (k) { return CATALOG[k]; });     // drop unknown keys
  }

  function computeLayout() {
    // only rows with members take up vertical space
    rows = LEVELS.filter(function (lv) { return keysByLevel(lv.label).length > 0; });

    var L = rows.length;
    rows.forEach(function (lv, li) {
      var y = L > 1 ? TOP + li * (BOT - TOP) / (L - 1) : 50;
      lv.y = y;
      var keys = keysByLevel(lv.label);
      keys.forEach(function (k, i) {
        pos[k] = { x: (i + 1) / (keys.length + 1) * 100, y: y };
      });
    });

    links = [];
    Object.keys(CATALOG).forEach(function (k) {
      (CATALOG[k].eats || []).forEach(function (prey) {
        if (pos[prey] && pos[k]) links.push({ prey: prey, predator: k });
      });
    });

    scavLinks = [];
    Object.keys(CATALOG).forEach(function (k) {
      if (!isScav(k)) return;
      scavengedList(k).forEach(function (a) {
        if (pos[a] && pos[k]) scavLinks.push({ prey: a, predator: k });
      });
    });

    symbLinks = [];
    var seen = {};
    Object.keys(CATALOG).forEach(function (k) {
      symbiontsOf(k).forEach(function (p) {
        if (!pos[k] || !pos[p]) return;
        var id = [k, p].sort().join('|');                 // undirected → one link per pair
        if (seen[id]) return;
        seen[id] = true;
        symbLinks.push({ a: k, b: p });
      });
    });

    warnOrphans();
  }

  // catch species that won't wire into the web (missing trophic /
  // unknown row / no links) so they get noticed while adding species.
  function warnOrphans() {
    var validRows = LEVELS.map(function (lv) { return lv.label; });
    Object.keys(CATALOG).forEach(function (k) {
      var s = CATALOG[k];
      if (s.landmark) return;   // a structure, not an organism
      if (!s.trophic) {
        console.warn('[foodweb] "' + k + '" (' + s.name + ') has no `trophic` — node NOT placed. Add trophic to species.js.');
        return;
      }
      if (validRows.indexOf(s.trophic) === -1) {
        console.warn('[foodweb] "' + k + '" (' + s.name + ') has trophic "' + s.trophic + '" not in LEVELS — node NOT placed. Add a row to LEVELS in foodweb.js.');
        return;
      }
      var eatsCount = (s.eats || []).length;
      var eatenCount = eatenBy(k).length;
      var scavCount = isScav(k) ? scavengedList(k).length : scavengersOf(k).length;
      var symbCount = symbiontsOf(k).length;
      if (eatsCount === 0 && eatenCount === 0 && scavCount === 0 && symbCount === 0) {
        console.warn('[foodweb] "' + k + '" (' + s.name + ') is an orphan node — nothing it `eats`, nothing eats it, no symbiosis. Add links via `eats` or `symbiosis` in species.js.');
      } else {
        (s.eats || []).forEach(function (prey) {
          if (!CATALOG[prey]) console.warn('[foodweb] "' + k + '" eats unknown key "' + prey + '" — check spelling in species.js.');
        });
        (s.symbiosis || []).forEach(function (p) {
          if (!CATALOG[p]) console.warn('[foodweb] "' + k + '" symbiosis unknown key "' + p + '" — check spelling in species.js.');
        });
      }
    });
  }

  function eatenBy(key) {
    return Object.keys(CATALOG).filter(function (k) {
      return (CATALOG[k].eats || []).indexOf(key) !== -1;
    });
  }

  /* ------------------------------ build DOM ------------------------------ */

  function build() {
    buildCatalog();
    computeLayout();

    overlay = document.createElement('div');
    overlay.id = 'fw-overlay';
    overlay.innerHTML =
      '<div id="fw-modal" class="glass">' +
      '  <div class="fw-head">' +
      '    <div>' +
      '      <div class="fw-title">🕸 Chek Jawa Food Web</div>' +
      '      <div class="fw-sub">Arrows show energy flow (prey → predator). Tap a node to trace its links.</div>' +
      '    </div>' +
      '    <button class="fw-close" id="fw-close">✕</button>' +
      '  </div>' +
      '  <div class="fw-legend">' +
      '    <span><i class="dot amber"></i> Eats (energy in)</span>' +
      '    <span><i class="dot red"></i> Eaten by (energy out)</span>' +
      '    <span><i class="dot green"></i> Scavenged by</span>' +
      '    <span><i class="dash"></i> Symbiosis</span>' +
      '    <span><i class="dot teal"></i> Selected</span>' +
      '  </div>' +
      '  <div class="fw-graph" id="fw-graph">' +
      '    <svg id="fw-svg" viewBox="0 0 100 100" preserveAspectRatio="none"></svg>' +
      '    <div class="fw-rows" id="fw-rows"></div>' +
      '    <div class="fw-nodes" id="fw-nodes"></div>' +
      '  </div>' +
      '  <div class="fw-detail hidden" id="fw-detail"></div>' +
      '</div>';
    document.body.appendChild(overlay);

    // row labels (left gutter) — one per populated level, at its y
    var rowsHtml = '';
    rows.forEach(function (lv) {
      rowsHtml += '<div class="fw-row-label ' + lv.cls + '" style="top:' + lv.y + '%">' + lv.label + '</div>';
    });
    $('fw-rows').innerHTML = rowsHtml;

    // nodes
    var nodesHtml = '';
    Object.keys(pos).forEach(function (k) {
      var s = CATALOG[k], p = pos[k];
      nodesHtml +=
        '<div class="fw-node" data-key="' + k + '" style="left:' + p.x + '%;top:' + p.y + '%">' +
        '  <div class="fw-node-ico">' + s.emoji + '</div>' +
        '  <div class="fw-node-label">' + s.name + '</div>' +
        '</div>';
    });
    $('fw-nodes').innerHTML = nodesHtml;

    // events
    $('fw-close').addEventListener('click', close);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });
    $('fw-graph').addEventListener('click', function (e) {
      var node = e.target.closest('.fw-node');
      if (node) { e.stopPropagation(); select(node.dataset.key); }
      else clearSelection();
    });
    window.addEventListener('keydown', function (e) {
      if (!overlay || overlay.classList.contains('hidden')) return;
      if (e.key === 'Escape') { if (selKey) clearSelection(); else close(); }
    });

    built = true;
    drawLinks();
  }

  /* ------------------------------ draw links ------------------------------ */

  function drawLinks() {
    var svg = $('fw-svg');
    var s = '';
    function line(a, b, cls) {
      return '<line x1="' + a.x + '" y1="' + a.y + '" x2="' + b.x + '" y2="' + b.y + '" class="' + cls + '"/>';
    }
    links.forEach(function (ln) {
      var a = pos[ln.prey], b = pos[ln.predator];
      var cls = 'fw-link base';
      if (selKey) {
        if (ln.predator === selKey) cls = 'fw-link eats';
        else if (ln.prey === selKey) cls = 'fw-link eatenby';
        else cls = 'fw-link dim';
      }
      s += line(a, b, cls);
    });
    scavLinks.forEach(function (ln) {
      var a = pos[ln.prey], b = pos[ln.predator];
      var cls = 'fw-link scav-base';
      if (selKey) {
        cls = (ln.predator === selKey || ln.prey === selKey) ? 'fw-link scavenge' : 'fw-link dim';
      }
      s += line(a, b, cls);
    });
    symbLinks.forEach(function (ln) {
      var a = pos[ln.a], b = pos[ln.b];
      var cls = 'fw-link symb-base';
      if (selKey) {
        cls = (ln.a === selKey || ln.b === selKey) ? 'fw-link symb' : 'fw-link dim';
      }
      s += line(a, b, cls);
    });
    svg.innerHTML = s;
  }

  /* ------------------------------ selection ------------------------------ */

  function select(key) {
    selKey = key;
    var eats = CATALOG[key].eats || [];
    var preds = eatenBy(key);
    var scavBy = scavengersOf(key);
    var scavenged = isScav(key) ? scavengedList(key) : [];
    var symbs = symbiontsOf(key);

    document.querySelectorAll('.fw-node').forEach(function (n) {
      var k = n.dataset.key;
      n.classList.remove('selected', 'hl-eats', 'hl-eatenby', 'hl-scavenge', 'hl-symb', 'dim');
      if (k === key) n.classList.add('selected');
      else if (eats.indexOf(k) !== -1) n.classList.add('hl-eats');
      else if (preds.indexOf(k) !== -1) n.classList.add('hl-eatenby');
      else if (scavBy.indexOf(k) !== -1 || scavenged.indexOf(k) !== -1) n.classList.add('hl-scavenge');
      else if (symbs.indexOf(k) !== -1) n.classList.add('hl-symb');
      else n.classList.add('dim');
    });

    drawLinks();
    renderDetail(key);
  }

  function clearSelection() {
    selKey = null;
    document.querySelectorAll('.fw-node').forEach(function (n) {
      n.classList.remove('selected', 'hl-eats', 'hl-eatenby', 'hl-scavenge', 'hl-symb', 'dim');
    });
    drawLinks();
    $('fw-detail').classList.add('hidden');
  }

  function chip(k) {
    var s = CATALOG[k];
    return '<button class="fw-chip" data-key="' + k + '">' + s.emoji + ' ' + s.name + '</button>';
  }

  function renderDetail(key) {
    var s = CATALOG[key];
    var scav = isScav(key);
    var preds = eatenBy(key);
    var scavBy = scavengersOf(key);
    var symb = symbiontsOf(key);

    // column 1 doubles as EATS (normal) or SCAVENGES (scavenger)
    var c1items = scav ? scavengedList(key) : (s.eats || []);
    var c1label = scav ? 'SCAVENGES' : 'EATS';
    var c1cls   = scav ? 'scav' : 'eats';
    var c1empty = scav ? 'No carcasses to clean.'
      : (s.kind === 'flora' || s.trophic === 'PRODUCERS') ? 'Nothing — it is a producer.'
      : 'Eats tiny prey not shown here.';

    var d = $('fw-detail');
    d.innerHTML =
      '<div class="fw-detail-head">' +
      '  <div class="fw-detail-name"><span class="fw-detail-ico">' + s.emoji + '</span>' +
      '    <div><div class="fw-dn">' + s.name + '</div><div class="fw-dr">' + (s.role || '') + '</div></div>' +
      '  </div>' +
      '  <button class="fw-factbtn" id="fw-factbtn">ⓘ Fact card</button>' +
      '</div>' +
      '<div class="fw-cols">' +
      '  <div class="fw-col ' + c1cls + '"><div class="fw-col-label">' + c1label + '</div>' +
           (c1items.length ? c1items.map(chip).join('') : '<span class="fw-none">' + c1empty + '</span>') + '</div>' +
      '  <div class="fw-col eatenby"><div class="fw-col-label">EATEN BY</div>' +
           (preds.length ? preds.map(chip).join('') : '<span class="fw-none">No predator here.</span>') + '</div>' +
      '  <div class="fw-col scav"><div class="fw-col-label">SCAVENGED BY</div>' +
           (scavBy.length ? scavBy.map(chip).join('') : '<span class="fw-none">No scavenger on this shore yet.</span>') + '</div>' +
      '  <div class="fw-col symb"><div class="fw-col-label">SYMBIOSIS</div>' +
           (symb.length ? symb.map(chip).join('') : '<span class="fw-none">No partner on this shore.</span>') + '</div>' +
      '</div>';
    d.classList.remove('hidden');

    $('fw-factbtn').addEventListener('click', function () {
      if (window.UI && UI.showFacts) UI.showFacts(s, null);
    });
    d.querySelectorAll('.fw-chip').forEach(function (c) {
      c.addEventListener('click', function () { select(c.dataset.key); });
    });
  }

  /* ------------------------------ open / close ------------------------------ */

  function open() {
    if (!built) build();
    overlay.classList.remove('hidden');
    clearSelection();
  }
  function close() { if (overlay) overlay.classList.add('hidden'); }

  window.FoodWeb = { open: open, close: close };
})();
