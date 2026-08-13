/* ============================================================
   ui.js — everything HTML: species panel, follow bar, inspect /
   fact cards, click-to-inspect picking, toasts.

   Ported from savanna's ui.js, with one real difference.

   SAVANNA'S ORGANISMS ARE OBJECT3Ds. Each animal owns a THREE.Group,
   so the panel could hold organism references, the camera could read
   `organism.group.position`, and clicking was an ordinary raycast
   against the scene graph.

   THIS SHORE'S ORGANISMS ARE INSTANCE SLOTS. A crab is a plain object
   with x / y / z numbers, drawn as row i of nine InstancedMeshes
   (crabs.js), and a mudskipper the same across six (mudskippers.js). Eleven draw
   calls for the whole population is the entire point, and it costs us
   both of savanna's conveniences:

     following  the rig now accepts any {x, y, z} — a plain individual
                works as a follow target (see camera.js).
     picking    a raycast against an InstancedMesh whose matrices are
                rewritten every frame is not reliable — three caches a
                bounding sphere from the instance matrices as they were.
                So picking is done in SCREEN SPACE instead: project
                every living individual, take the nearest one inside a
                pixel radius. ~130 projections on a click is nothing,
                and it cannot go stale.

   Hover-glow is not ported for the same reason: an instanced body
   shares one material across the whole population, so there is no
   per-animal material to tint. Selection reads through the follow bar
   and the fact card instead.
   ============================================================ */
(function () {
  'use strict';

  var rig, camera, world, pops = {};
  var followed = null;        // the individual object, or null
  var followedKey = null;     // its species key
  var CATALOG = {};           // key -> spec, animals + flora merged

  /* UI-only presentation table, keyed by a species' `sim` key. Follow
     distance is per species because a 2 cm crab and a hand-length mudskipper
     do not frame at the same range. `states` turns an internal state
     string into something a visitor can read in the follow bar. */
  var POP_META = {
    fiddler: {
      dist: 7,
      lift: 0.35,                              // metres above the stored point, for picking
      states: {
        down:   'down the burrow',
        rising: 'coming up',
        out:    'out on the mud',
        diving: 'running for the burrow'
      }
    },
    barnacle: {
      dist: 4,
      lift: 0.20,
      states: {
        open: 'open, cirri sweeping',
        shut: 'shut against the air'
      }
    },
    nerite: {
      dist: 4,
      lift: 0.18,
      states: {
        graze:  'grazing the wet rock',
        homing: 'heading back to its scar',
        clamp:  'clamped down, waiting for water'
      }
    },
    conch: {
      dist: 6,
      lift: 0.22,
      states: {
        follow: 'following the waterline',
        hop:    'vaulting down-shore',
        bury:   'digging into the sand',
        buried: 'buried, waiting out the low'
      }
    },
    seastar: {
      dist: 7,
      lift: 0.15,
      states: {
        creep:   'creeping the lagoon floor',
        retreat: 'following the water down',
        exposed: 'lying out on the drained flat',
        bury:    'settling into the sand',
        buried:  'buried, waiting for the flood'
      }
    },
    seahare: {
      dist: 6,
      lift: 0.20,
      states: {
        graze:  'grazing the seagrass',
        roam:   'crossing to fresher weed',
        flee:   'inking and backing off',
        huddle: 'hunkered down in the drained lagoon'
      }
    },
    mudskipper: {
      dist: 9,
      lift: 0.25,
      states: {
        water:   'in the shallows',
        pooled:  'working a pool',
        perch:   'propped up on the mud',
        skip:    'skipping across the mud',
        towater: 'heading back to wet itself'
      }
    }
  };

  var PICK_RADIUS = 46;       // pixels — how close a click has to land
  var _v = new THREE.Vector3();

  function $(id) { return document.getElementById(id); }

  /* ------------------------ catalog + panel ------------------------ */

  function buildCatalog() {
    Object.keys(SPECIES).forEach(function (k) { CATALOG[k] = SPECIES[k]; });
    if (window.FLORA) Object.keys(FLORA).forEach(function (k) { CATALOG[k] = FLORA[k]; });
  }

  // the live population behind a species key, or null if it has no body yet
  function popOf(key) {
    var s = CATALOG[key];
    return (s && s.sim && pops[s.sim]) ? pops[s.sim] : null;
  }

  function metaOf(key) {
    var s = CATALOG[key];
    return (s && s.sim && POP_META[s.sim]) || {};
  }

  function buildSpeciesPanel() {
    // group order is the order groups first appear in the catalog
    var order = [];
    Object.keys(CATALOG).forEach(function (key) {
      var g = CATALOG[key].group || 'SPECIES';
      if (order.indexOf(g) === -1) order.push(g);
    });

    var html = '';
    order.forEach(function (groupName) {
      html += '<div class="species-group">' + groupName + '</div>';
      Object.keys(CATALOG).forEach(function (key) {
        var s = CATALOG[key];
        if ((s.group || 'SPECIES') !== groupName) return;
        /* Three states a row can be in:
             live      spawned — click follows an individual
             not-yet   an animal in the roster with no body yet (§11)
             flora     a producer; there is nothing to follow by design */
        var live = !!popOf(key);
        var cls = live ? '' : (s.kind === 'animal' ? ' not-yet' : ' flora-row');
        var tip = live ? 'Follow one'
          : s.kind === 'animal' ? 'Not on the shore yet — tap for facts'
          : 'Tap for facts';
        html += '' +
          '<div class="species-row' + cls + '" data-key="' + key + '" title="' + tip + '">' +
          '  <span class="species-emoji">' + s.emoji + '</span>' +
          '  <span class="species-name">' + s.name +
          '    <span class="species-zone">' + (s.zone || '') + '</span>' +
          '  </span>' +
          '  <button class="info-btn" data-info="' + key + '" title="Facts">i</button>' +
          '</div>';
      });
    });

    var list = $('species-list');
    list.innerHTML = html;

    list.addEventListener('click', function (e) {
      var infoBtn = e.target.closest('.info-btn');
      if (infoBtn) { showFacts(CATALOG[infoBtn.dataset.info], null); e.stopPropagation(); return; }
      var row = e.target.closest('.species-row');
      if (!row) return;
      var key = row.dataset.key;
      if (popOf(key)) followSpecies(key);
      else showFacts(CATALOG[key], null);
    });
  }

  /* -------------------------- follow mode -------------------------- */

  // Who can be followed right now: on screen if possible, otherwise
  // anything still on the shore. A burrowed crab stays followable —
  // the camera sits on its hole, which is where it will come back up.
  function followable(key) {
    var pop = popOf(key);
    if (!pop) return [];
    var vis = pop.filter(function (o) { return o.vis; });
    if (vis.length) return vis;
    return pop.filter(function (o) { return o.state !== 'gone'; });
  }

  function followSpecies(key) {
    var members = followable(key);
    if (!members.length) { toast(CATALOG[key].emoji + ' none on the shore right now'); return; }
    var next = 0;
    if (followed && followedKey === key) {
      next = (members.indexOf(followed) + 1) % members.length;
      if (next < 0) next = 0;
    }
    setFollow(members[next], key);
  }

  function nextIndividual() { if (followedKey) followSpecies(followedKey); }

  function setFollow(individual, key) {
    followed = individual;
    followedKey = individual ? key : null;
    rig.follow(individual, individual ? metaOf(key).dist : 0);

    document.querySelectorAll('.species-row').forEach(function (r) {
      r.classList.toggle('active', !!individual && r.dataset.key === followedKey);
    });

    var bar = $('follow-bar');
    if (individual) {
      bar.classList.remove('hidden');
      updateFollowLabel();
      openPanel(true);
    } else {
      bar.classList.add('hidden');
    }
  }

  function stopFollow() { setFollow(null, null); }

  function updateFollowLabel() {
    if (!followed) return;
    var spec = CATALOG[followedKey];
    var pop = popOf(followedKey) || [];
    var meta = metaOf(followedKey);
    var n = pop.indexOf(followed) + 1;
    var st = (meta.states && meta.states[followed.state]) || followed.state || '';
    $('follow-label').textContent = spec.name + ' #' + n;
    $('follow-state').textContent = st;
  }

  /* ------------------------- inspect / facts ------------------------- */

  var curPage = 1;

  function renderAdapt(list) {
    return (list || []).map(function (a) {
      return '<div class="adapt-item">' +
        '<div class="adapt-title">' + a.title + '</div>' +
        '<div class="adapt-text">' + a.text + '</div>' +
        '</div>';
    }).join('');
  }

  function setPage(p) {
    curPage = p;
    $('card-page-1').classList.toggle('hidden', p !== 1);
    $('card-page-2').classList.toggle('hidden', p !== 2);
    $('card-page-ind').textContent = p + ' / 2';
    $('card-back').classList.toggle('nav-disabled', p === 1);
    $('card-next').textContent = p === 1 ? 'Next ›' : 'Done';
    document.querySelectorAll('.card-dots span').forEach(function (d) {
      d.classList.toggle('on', +d.dataset.d === p);
    });
    if ($('card-body-scroll')) $('card-body-scroll').scrollTop = 0;
  }

  // `hit` is {individual, key} when the card was opened by clicking an
  // animal, and null when it came from the panel or the food web.
  function showFacts(spec, hit) {
    $('card-emoji').textContent = spec.emoji;
    $('card-name').textContent = spec.name;
    $('card-badge').textContent = spec.category || spec.group || '';
    $('card-role').textContent = (spec.role || '') + (spec.zone ? ' · ' + spec.zone : '');
    $('card-about').textContent = spec.about || '';
    $('card-why').textContent = spec.why || '';
    $('card-funfact').textContent = spec.funFact || '';
    $('card-structural').innerHTML = renderAdapt(spec.structural);
    $('card-behavioural').innerHTML = renderAdapt(spec.behavioural);

    var btn = $('card-follow');
    if (hit) {
      btn.classList.remove('hidden');
      btn.onclick = function () { setFollow(hit.individual, hit.key); hideCard(); };
    } else {
      btn.classList.add('hidden');
    }

    setPage(1);
    $('inspect-card').classList.remove('hidden');
  }

  function hideCard() { $('inspect-card').classList.add('hidden'); }

  /* --------------------------- click picking ---------------------------
     Screen-space, not a raycast — see the file header. Every visible
     individual is projected to pixels; the nearest one inside
     PICK_RADIUS wins, and ties break toward the camera so a crab in
     front of another crab is the one you get. ------------------------ */

  function pick(cx, cy) {
    var best = null, bestScore = Infinity;
    Object.keys(CATALOG).forEach(function (key) {
      var pop = popOf(key);
      if (!pop) return;
      var lift = metaOf(key).lift || 0;
      for (var i = 0; i < pop.length; i++) {
        var o = pop[i];
        if (!o.vis || o.state === 'gone') continue;
        _v.set(o.x, o.y + lift, o.z);
        var depth = _v.distanceTo(camera.position);
        _v.project(camera);
        if (_v.z > 1) continue;                       // behind the camera
        var px = (_v.x * 0.5 + 0.5) * window.innerWidth;
        var py = (-_v.y * 0.5 + 0.5) * window.innerHeight;
        var d = Math.hypot(px - cx, py - cy);
        if (d > PICK_RADIUS) continue;
        var score = d + depth * 0.02;                 // near ties go to the closer animal
        if (score < bestScore) { bestScore = score; best = { individual: o, key: key }; }
      }
    });
    return best;
  }

  function handleClick(cx, cy) {
    if (cy > window.innerHeight - 90 || cy < 70) return;   // chrome bands, not the shore
    var hit = pick(cx, cy);
    if (hit) showFacts(CATALOG[hit.key], hit);
    else hideCard();
  }

  /* ----------------------------- panel ----------------------------- */

  var LIST_ICON = null;
  function openPanel(open) {
    $('species-panel').classList.toggle('hidden', !open);
    var btn = $('btn-species');
    if (LIST_ICON === null) LIST_ICON = btn.innerHTML;
    btn.innerHTML = open ? '✕' : LIST_ICON;
  }
  function togglePanel() { openPanel($('species-panel').classList.contains('hidden')); }

  /* ----------------------------- toast -----------------------------
     tideui.js owns #toast and runs its timer off the sim clock. Use it
     when it is there so the two never fight over the element. */
  function toast(msg) {
    if (window.__tideUI && window.__tideUI.toast) { window.__tideUI.toast(msg); return; }
    var t = $('toast');
    t.textContent = msg;
    t.classList.remove('hidden');
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { t.classList.add('hidden'); }, 2600);
  }

  /* ------------------------------ frame ------------------------------ */

  // Called from main.js's loop. Keeps the follow bar honest (state text
  // changes as the tide moves) and drops the follow when the animal
  // leaves the shore for good — no species does that today (the mudskipper
  // that replaced the goby is amphibious and never dies of exposure), but the
  // guard stays: the camera must not keep staring at where an animal used to be.
  var labelT = 0;
  function update(dt) {
    if (!followed) return;
    if (followed.state === 'gone') {
      toast(CATALOG[followedKey].emoji + ' that one is gone — released the camera');
      stopFollow();
      return;
    }
    labelT += dt;
    if (labelT > 0.25) { labelT = 0; updateFollowLabel(); }
  }

  /* ------------------------------ init ------------------------------ */

  function init(opts) {
    rig = opts.rig; camera = opts.camera; world = opts.world;
    pops = opts.pops || {};

    buildCatalog();
    buildSpeciesPanel();
    var liveCount = Object.keys(CATALOG).filter(function (k) { return !!popOf(k); }).length;
    $('species-count').textContent = Object.keys(CATALOG).length + ' Species';
    $('species-live').textContent = liveCount + ' live on the shore';

    rig.onClick = handleClick;

    $('btn-species').addEventListener('click', togglePanel);
    $('btn-foodweb').addEventListener('click', function () {
      if (window.FoodWeb) FoodWeb.open();
      else toast('🕸 Food web view unavailable');
    });
    $('follow-stop').addEventListener('click', stopFollow);
    $('card-close').addEventListener('click', hideCard);
    $('card-back').addEventListener('click', function () { if (curPage === 2) setPage(1); });
    $('card-next').addEventListener('click', function () { if (curPage === 1) setPage(2); else hideCard(); });

    window.addEventListener('keydown', function (e) {
      if (e.target.tagName === 'INPUT') return;
      var k = e.key.toLowerCase();
      if (k === 'u') nextIndividual();
      if (k === 'escape') { hideCard(); stopFollow(); }
    });
  }

  window.UI = { init: init, update: update, showFacts: showFacts, follow: setFollow };
})();
