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

   HOVER-GLOW WAS SUPPOSED TO BE IMPOSSIBLE FOR THE SAME REASON, and
   this file said so for ten sections: an instanced body shares one
   material across its whole population, so there is no per-animal
   material to tint. Both halves of that are true and the conclusion
   was still wrong — the tint does not have to come from the material.
   Every population already writes a per-individual `instanceColor`,
   three.js multiplies it into the vertex colour, and nothing clamps
   it. Driving one animal's entry above 1.0 lights it up. See the hover
   glow further down.
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
      /* Keyed off `act`, not `state` — a fiddler is 'out' for most of a
         low tide and that says nothing. What it is DOING out there is
         the interesting part (§28). */
      states: {
        down:    'down the burrow',
        rising:  'coming up',
        out:     'out on the mud',
        forage:  'working out from the hole',
        sift:    'sifting mud for film',
        wave:    'waving the big claw',
        flee:    'running for the burrow',
        diving:  'running for the burrow'
      }
    },
    egret: {
      dist: 9,
      lift: 0.9,                               // it is a metre tall — aim at the bird, not its feet
      states: {
        away:     'away from the shore',
        inbound:  'flying in',
        wade:     'working across the flat',
        freeze:   'stopped, watching the mud',
        peck:     'pecking the mud',
        stab:     'striking',
        stir:     'stirring the mud with one foot',
        outbound: 'leaving on the flood'
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
    hermit: {
      dist: 5,
      lift: 0.22,
      states: {
        forage:   'working the sand for scraps',
        seek:     'crossing to an empty shell',
        inspect:  'turning an empty shell over',
        fight:    'contesting a shell',
        swap:     'changing shells',
        withdraw: 'pulled in, claw across the door'
      }
    },
    hornsnail: {
      dist: 4,
      lift: 0.16,
      states: {
        graze: 'rasping the fringe mud',
        seek:  'moving with the clump to fresher mud',
        climb: 'climbing up-shore ahead of the flood',
        seal:  'sealed shut under the water'
      }
    },
    sanddollar: {
      dist: 5,
      lift: 0.12,
      states: {
        plough: 'ploughing under the sand',
        feed:   'stopped, working the sediment',
        strand: 'lying out on the drained flat'
      }
    },
    seacucumber: {
      dist: 5,
      lift: 0.18,
      states: {
        feed:   'working the sediment over',
        crawl:  'crawling to fresher sand',
        hunker: 'contracted, waiting out the low'
      }
    },
    sandstar: {
      dist: 6,
      lift: 0.12,
      states: {
        quarter: 'quartering the sand flat',
        probe:   'digging for something buried',
        sink:    'working itself under',
        buried:  'buried, out of sight'
      }
    },
    penshell: {
      dist: 5,
      lift: 0.35,                              // aim at the gape, not the buried point
      states: {
        open: 'gaping, filtering the water',
        clap: 'clapped shut — something passed',
        shut: 'shut against the air'
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
    },
    /* Follows the mudskipper's entry deliberately: the two are near
       relatives on the same flat, and reading their state lists next to
       each other is the quickest way to see that they are opposites.
       No `dead` label — a dead fish is hidden and unfollowable, and
       `updateFollowLabel` already tolerates a state with no entry. */
    goby: {
      dist: 7,
      lift: 0.18,
      states: {
        forage:  'working the bottom for food',
        rest:    'sat on the sand on its pelvic disc',
        retreat: 'following the water out',
        pooled:  'cut off in a tide pool',
        jump:    'leaping for the next pool',
        strand:  'stranded — on its side, out of water'
      }
    },
    oyster: {
      dist: 4,
      lift: 0.10,
      states: {
        open: 'gaping, filtering the water',
        shut: 'shut against the air'
      }
    },
    mussel: {
      dist: 4,
      lift: 0.08,
      states: {
        open: 'parted, filtering the water',
        shut: 'shut against the air'
      }
    },
    sponge: {
      dist: 4,
      lift: 0.10,
      states: {
        wet: 'submerged, pumping water',
        dry: 'dulled, waiting out the air'
      }
    },
    moonsnail: {
      dist: 6,
      lift: 0.15,
      states: {
        hunt:   'ploughing the sand, hunting',
        drill:  'foot spread over a shell, drilling',
        buried: 'buried, waiting for the flood'
      }
    },
    swimmingcrab: {
      dist: 7,
      lift: 0.30,
      states: {
        buried:   'buried, waiting for the flood',
        emerging: 'digging out of the sand',
        swim:     'paddling through the water',
        walk:     'crawling the bottom',
        strike:   'lunging at something',
        burying:  'digging in as the water leaves'
      }
    },
    horseshoe: {
      dist: 8,
      lift: 0.34,
      states: {
        plough: 'ploughing the mud, moving with the water',
        work:   'stopped, turning over the mud',
        strand: 'caught by the ebb — buried, waiting'
      }
    },
    anemone: {
      dist: 5,
      lift: 0.12,
      states: {
        spread:  'carpet out, waiting',
        embrace: 'closed around a sheltering fish',
        fold:    'pursed shut on something',
        shrunk:  'pulled down into the sand'
      }
    },
    /* Small even for this shore — 8 cm of fish. It also never leaves a
       metre of its host, so a close follow cannot lose it the way a
       close follow on a swimming crab would. */
    anemonefish: {
      dist: 2.2,
      lift: 0.04,
      states: {
        away:   'gone to the channel',
        arrive: 'swimming back in',
        hover:  'holding station over its anemone',
        sortie: 'darting out for something',
        dive:   'running for the tentacles',
        nestle: 'down in the tentacles'
      }
    },
    /* The biggest animal on the shore — nearly two metres of arm span
       — so the follow sits further out than anything except the egret
       and the mangrove, and lifts to the MANTLE rather than to the
       seabed the arms are spread across. */
    octopus: {
      dist: 11,
      lift: 0.45,
      states: {
        den:    'in its den',
        emerge: 'coming out of the den',
        hunt:   'crawling the bottom, arms first',
        pounce: 'web thrown over something',
        jet:    'jetting home, mantle first',
        ink:    'inking — an otter came too close',
        home:   'settling back into the den'
      }
    },
    /* A visitor, like the egret — and like the egret it is genuinely
       absent much of the time, so `away` is a real state rather than a
       hiding place. Followed from further out than anything else
       alive on this shore, because the thing worth watching is the
       ROMP and not one animal in it: at 9 m the whole family is in
       frame, and at 4 m you are looking at one otter's shoulder while
       five more do something interesting off-screen. */
    otter: {
      dist: 9,
      lift: 0.30,
      states: {
        away:  'out at sea, off the plot',
        swim:  'swimming with the romp',
        dive:  'chasing a fish',
        catch: 'surfaced, eating a fish',
        walk:  'crawling up the sand',
        haul:  'hauled out on the bar',
        leave: 'heading back out to the channel'
      }
    },
    /* The three producers below never move and publish no state — a
       plain {x,y,z} record, not a behaviour object — so there is no
       `states` map for them. `updateFollowLabel` already tolerates a
       missing one and just leaves the status line blank. */
    mangrove: {
      dist: 16,
      lift: 3.0                                // aim into the canopy, not the mud at its foot
    },
    seagrass: {
      dist: 7,
      lift: 0.35
    },
    spoongrass: {
      dist: 4,
      lift: 0.08
    },
    ulva: {
      dist: 4,
      lift: 0.06
    },
    // A plant up to 1.1 m tall — aim the follow camera at the MIDDLE
    // of the thallus, not the holdfast, or every shot is of bare rock
    // with the plant looming out of frame overhead.
    sargassum: {
      dist: 6,
      lift: 0.45
    }
  };

  var PICK_RADIUS = 46;       // pixels — how close a click has to land, up close
  var PICK_FULL_AT = 14;      // metres out to which it gets the full radius
  var PICK_MIN = 9;           // and the floor it never shrinks below
  var _v = new THREE.Vector3();

  function $(id) { return document.getElementById(id); }

  /* ------------------------ catalog + panel ------------------------ */

  function buildCatalog() {
    Object.keys(SPECIES).forEach(function (k) { CATALOG[k] = SPECIES[k]; });
    if (window.FLORA) Object.keys(FLORA).forEach(function (k) { CATALOG[k] = FLORA[k]; });
  }

  /* main.js hands each live species a record: { list, group }, and
     optionally a `glowSlots` for the one population whose meshes are
     not indexed by individual (see the hover glow below). A bare array
     is still accepted — it just cannot glow. */
  function popRecOf(key) {
    var s = CATALOG[key];
    return (s && s.sim && pops[s.sim]) ? pops[s.sim] : null;
  }
  // the live population behind a species key, or null if it has no body yet
  function popOf(key) {
    var rec = popRecOf(key);
    if (!rec) return null;
    return Array.isArray(rec) ? rec : rec.list;
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
    /* `act` is the finer-grained label where a species publishes one
       (the fiddler crab does, §28); everything else falls back to the
       state machine's own name. */
    var key = followed.act || followed.state;
    var st = (meta.states && meta.states[key]) || key || '';
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
        /* `vis === false` means the species has a visibility flag AND
           this individual is currently not drawn. NO FLAG AT ALL means
           the species always draws, which is most of them — the test
           used to be `!o.vis` and it silently made five species
           unclickable, because they simply never had the field. */
        if (o.vis === false || o.state === 'gone') continue;
        _v.set(o.x, o.y + lift, o.z);
        var depth = _v.distanceTo(camera.position);
        _v.project(camera);
        if (_v.z > 1) continue;                       // behind the camera
        var px = (_v.x * 0.5 + 0.5) * window.innerWidth;
        var py = (-_v.y * 0.5 + 0.5) * window.innerHeight;
        var d = Math.hypot(px - cx, py - cy);
        /* THE RADIUS SHRINKS WITH DISTANCE. A flat 46 px is right for
           an animal a few metres away and absurd for one two hundred
           metres down the shore, which is two pixels of crab pulling a
           46-pixel catchment around itself. It never showed while this
           was click-only — you do not click at empty sky — but the
           hover cursor made it obvious immediately: the pointer turned
           into a hand over blank horizon. Scaled to roughly the
           animal's own on-screen size, with a floor so a distant one
           stays catchable if you really aim at it. */
        var r = PICK_RADIUS * (PICK_FULL_AT / Math.max(PICK_FULL_AT, depth));
        if (r < PICK_MIN) r = PICK_MIN;
        if (d > r) continue;
        var score = d + depth * 0.02;                 // near ties go to the closer animal
        if (score < bestScore) { bestScore = score; best = { individual: o, key: key }; }
      }
    });
    return best;
  }

  function handleClick(cx, cy) {
    if (cy > window.innerHeight - 90 || cy < 70) return;   // chrome bands, not the shore
    var hit = pick(cx, cy);
    if (hit) {
      showFacts(CATALOG[hit.key], hit);
      setFollow(hit.individual, hit.key);                  // clicking a body also follows it
    } else hideCard();
  }

  /* --------------------------- the hover glow ---------------------------
     The file header used to say this could not be done: an instanced
     body shares ONE material across its whole population, so there is
     no per-animal material to tint. That is true and it is also not the
     only way to tint something.

     Every population already writes a per-individual `instanceColor` at
     spawn — the slight tone variation that stops eighty crabs looking
     like eighty copies. three.js multiplies that into the vertex colour
     in the shader, and nothing clamps it, so writing a value ABOVE one
     drives the animal brighter than the material can otherwise go. A
     glow is therefore three writes to a buffer nobody else touches
     after spawn, and it costs nothing per frame.

     FINDING THE SLOTS. For almost every species, mesh slot i belongs to
     individual i — or to a fixed run of them, `per = count / N`, which
     is how the multi-part meshes (eight legs, five arms) are laid out.
     So the rule is generic and no species has to declare anything. The
     one exception is the hermit crab, whose shell mesh is indexed by
     SHELL rather than by crab (§31, and the whole reason a swap is
     free), and that population publishes a `glowSlots` to say so.
     ------------------------------------------------------------------ */

  var GLOW = 1.55;              // how far above its own colour a hovered animal is driven
  var hovered = null;           // { individual, key } or null
  var glowSaved = [];           // [{ mesh, slot, r, g, b }] to put back
  var glowHook = null;          // a population that tints itself — see applyGlow
  var _c = null;                // scratch THREE.Color, made on first use

  // every (mesh, slot) that belongs to this individual
  function glowTargets(key, ind, out) {
    var rec = popRecOf(key);
    if (!rec || Array.isArray(rec) || !rec.group) return out;
    var list = rec.list, idx = list.indexOf(ind);
    if (idx < 0) return out;
    var kids = rec.group.children;
    for (var m = 0; m < kids.length; m++) {
      var mesh = kids[m];
      if (!mesh.isInstancedMesh || !mesh.instanceColor) continue;
      var slots = rec.glowSlots ? rec.glowSlots(ind, mesh) : null;
      if (slots) {
        for (var s = 0; s < slots.length; s++) {
          if (slots[s] >= 0 && slots[s] < mesh.count) out.push({ mesh: mesh, slot: slots[s] });
        }
        continue;
      }
      // generic: a fixed run of `per` slots per individual
      if (mesh.count % list.length !== 0) continue;
      var per = mesh.count / list.length;
      for (var p = 0; p < per; p++) out.push({ mesh: mesh, slot: idx * per + p });
    }
    return out;
  }

  function clearGlow() {
    /* A population that does its own tinting is put back first, and it
       is put back even when nothing instanced was saved — the otter has
       no instanced body at all, so `glowSaved` can be empty while a
       glow is very much still on. */
    if (glowHook) { glowHook.pop.glowApply(glowHook.ind, 1); glowHook = null; }
    if (!glowSaved.length) return;
    var touched = [];
    for (var i = 0; i < glowSaved.length; i++) {
      var g = glowSaved[i];
      _c.setRGB(g.r, g.g, g.b);
      g.mesh.setColorAt(g.slot, _c);
      if (touched.indexOf(g.mesh) < 0) touched.push(g.mesh);
    }
    for (i = 0; i < touched.length; i++) touched[i].instanceColor.needsUpdate = true;
    glowSaved.length = 0;
  }

  function applyGlow(key, ind) {
    if (!_c) _c = new THREE.Color();
    /* THE OTTER CANNOT BE GLOWED THE USUAL WAY. Every other body here
       is an InstancedMesh, so a highlight is three numbers written into
       a colour buffer nobody else touches. The otter's body is a Mesh
       per animal — it is a skinned reference mesh and six animals in
       six poses cannot share one geometry — so it publishes
       `glowApply` and tints its own material instead. Same multiply,
       one level up. */
    var rec0 = popRecOf(key);
    if (rec0 && !Array.isArray(rec0) && typeof rec0.glowApply === 'function') {
      rec0.glowApply(ind, GLOW);
      glowHook = { pop: rec0, ind: ind };
    }
    var targets = glowTargets(key, ind, []);
    var touched = [];
    for (var i = 0; i < targets.length; i++) {
      var t = targets[i];
      t.mesh.getColorAt(t.slot, _c);
      glowSaved.push({ mesh: t.mesh, slot: t.slot, r: _c.r, g: _c.g, b: _c.b });
      _c.setRGB(_c.r * GLOW, _c.g * GLOW, _c.b * GLOW);
      t.mesh.setColorAt(t.slot, _c);
      if (touched.indexOf(t.mesh) < 0) touched.push(t.mesh);
    }
    for (i = 0; i < touched.length; i++) touched[i].instanceColor.needsUpdate = true;
  }

  /* The pointer's last known position. The pick itself runs once a
     frame in update(), not on the mousemove — so the glow keeps up with
     an animal that walks under a stationary cursor, and with the camera
     when it is the camera that moved. */
  var mx = -1, my = -1, mouseIn = false;
  function onMove(e) {
    mx = e.clientX; my = e.clientY;
    mouseIn = true;
  }

  var hoverT = 0;
  function updateHover(dt) {
    hoverT += dt;
    if (hoverT < 0.05) return;                 // twenty times a second is plenty
    hoverT = 0;
    var hit = null;
    if (mouseIn && my <= window.innerHeight - 90 && my >= 70) hit = pick(mx, my);

    var same = hit && hovered && hit.individual === hovered.individual;
    if (same) return;

    clearGlow();
    hovered = hit;
    if (hit) applyGlow(hit.key, hit.individual);

    var holder = $('scene-holder');
    if (holder) holder.style.cursor = hit ? 'pointer' : '';
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
    updateHover(dt);                      // runs whether or not anything is followed
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
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseout', function (e) { if (!e.relatedTarget) { mouseIn = false; } });

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
