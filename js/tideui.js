/* ============================================================
   tideui.js — the tide gauge.

   In a biome whose master clock is the tide, the viewer needs to know
   two things at a glance: where the water is NOW, and how low the next
   low will go. The second one is the whole point of the spring/neap
   envelope — without it a spring low just looks like a long ebb.

   Also carries the build-time scrub controls (freeze + drag the
   waterline to any height), which is how the shore transect gets
   checked at every height. See BUILD_GUIDE §11 step 1.
   ============================================================ */
(function () {
  'use strict';

  var GAUGE_LO = -0.7, GAUGE_HI = 3.3;      // metres CD spanned by the gauge

  // Shore bands, drawn as coloured stripes down the gauge so the waterline
  // marker can be read directly against "which habitat is exposed right now".
  var BANDS = [
    { lo: 2.80, hi: 3.10, label: 'Mangrove fringe', c: '#4a6b3c' },
    { lo: 2.20, hi: 2.80, label: 'Barnacle boulders', c: '#8b8578' },
    { lo: 1.80, hi: 2.20, label: 'Fiddler mudflat', c: '#7d6c50' },
    { lo: 1.00, hi: 1.80, label: 'Sand flat + pools', c: '#c3b48c' },
    { lo: 0.30, hi: 0.70, label: 'Seagrass lagoon', c: '#8b9663' },
    { lo: 0.05, hi: 0.30, label: 'Sandbar', c: '#d9cca6' },
    { lo: -0.70, hi: 0.05, label: 'Subtidal channel', c: '#4d5c58' }
  ];

  function pct(m) {
    return Math.max(0, Math.min(100, (m - GAUGE_LO) / (GAUGE_HI - GAUGE_LO) * 100));
  }

  function init(opts) {
    var world = opts.world;
    var col = document.getElementById('gauge-col');
    var wrap = col.parentNode;          // ref lines go HERE, not in col — col clips (overflow:hidden, 30px wide)
    var i, b, el;

    for (i = 0; i < BANDS.length; i++) {
      b = BANDS[i];
      el = document.createElement('div');
      el.className = 'gauge-band';
      el.style.bottom = pct(b.lo) + '%';
      el.style.height = (pct(b.hi) - pct(b.lo)) + '%';
      el.style.background = b.c;
      el.title = b.label + '  ' + b.lo.toFixed(2) + '–' + b.hi.toFixed(2) + ' m';
      col.appendChild(el);
    }

    /* Reference lines. The two LOW lines are the ones that matter: the gap
       between them is exactly the habitat the spring/neap envelope buys. */
    function refLine(m, cls, text) {
      var l = document.createElement('div');
      l.className = 'gauge-ref ' + cls;
      l.style.bottom = pct(m) + '%';
      l.innerHTML = '<span>' + text + '</span>';
      wrap.appendChild(l);
    }
    var neapLo  = Tide.MEAN - Tide.AMP * 0.4;
    var neapHi  = Tide.MEAN + Tide.AMP * 0.4;
    refLine(neapHi, 'faint', 'neap high');
    refLine(neapLo, 'faint', 'neap low');
    refLine(Tide.MIN, 'strong', 'spring low');

    var marker = document.getElementById('gauge-marker');
    var readout = document.getElementById('tide-readout');
    var stateEl = document.getElementById('tide-state');
    var springBar = document.getElementById('spring-fill');
    var springLbl = document.getElementById('spring-label');
    var nextLowEl = document.getElementById('next-low');
    var scrub = document.getElementById('tide-scrub');
    var btnFreeze = document.getElementById('btn-freeze');
    var btnSpring = document.getElementById('btn-springlow');
    var poolsEl = document.getElementById('pool-count');
    poolsEl.textContent = world.pools.length + ' tide pool' + (world.pools.length === 1 ? '' : 's');
    /* Biofilm cover (§7). The film is the one thing on this shore you are
       told about but cannot count — so it gets a number here: mean standing
       crop as a percentage of what the flat could carry. It drifts down while
       the grazers work and back up behind them. */
    var filmEl = document.getElementById('film-cover');
    /* The meadow reports what it is DOING, not just how much of it there is
       (§26): the moment the lagoon drains and 6 000 blades go flat is the
       best thing the low tide does, and it deserves to be called out. */
    var grassEl = document.getElementById('grass-state');
    /* The spoon mat gets its own row rather than being folded into the
       one above (§29). The two plants are in different bands and do
       different things on the same tide — the lagoon meadow is still
       standing in water while the mat up on the flat has already gone
       over — and a single "seagrass" line would hide exactly that. */
    var spoonEl = document.getElementById('spoon-state');
    /* Sea lettuce (§37) gets a third row for the same reason: it sits a
       band higher again, into the barnacle boulders, and its tide beat
       is the opposite direction to the two plants above it — it goes
       PALE, not olive, so the readout says so rather than reusing
       "wilted"/"lifted" language that would read as the same thing. */
    var ulvaEl = document.getElementById('ulva-state');
    /* Sargassum (§37) gets a fourth row. Its beat is the tape meadow's
       stand/collapse (§26), not a colour change, so the readout says
       "standing" / "collapsed" rather than reusing ulva's bleach
       language or spoon grass's wilt language — three different tide
       beats on this shore, three different vocabularies. */
    var sargEl = document.getElementById('sarg-state');

    btnSpring.addEventListener('click', function () {
      var r = world.jumpToSpringLow();
      scrub.value = String(r.height);
      btnFreeze.textContent = '⏸';
      btnFreeze.classList.remove('on');
      toast('Spring low ' + r.height.toFixed(2) + ' m in ' + r.inSecs + 's — watch the lagoon surface');
    });

    btnFreeze.addEventListener('click', function () {
      if (world.tideFrozen) {
        world.tideFrozen = false;
        btnFreeze.textContent = '⏸';
        btnFreeze.classList.remove('on');
      } else {
        world.setTideHeight(world.tide);
        scrub.value = String(world.tide);
        btnFreeze.textContent = '▶';
        btnFreeze.classList.add('on');
      }
    });

    // Dragging the scrub always implies freeze — you cannot hand-park a
    // waterline that is still moving under you.
    scrub.addEventListener('input', function () {
      world.setTideHeight(parseFloat(scrub.value));
      btnFreeze.textContent = '▶';
      btnFreeze.classList.add('on');
    });

    var toastEl = document.getElementById('toast'), toastT = 0;
    function toast(msg) {
      toastEl.textContent = msg;
      toastEl.classList.remove('hidden');
      toastT = 3.5;
    }

    /* Predict the next low by walking the curve forward — cheap (a few hundred
       samples once a second) and it stays correct if the tide constants ever
       change, unlike a formula copied out of tide.js. */
    var nextLowVal = 0, nextLowIn = 0, predictAccum = 99, filmAccum = 99;
    function predict(t) {
      var best = Infinity, bestAt = 0;
      for (var s = 1; s < Tide.TIDE_CYCLE_SECS * 1.2; s += 0.5) {
        var h = Tide.at(t + s);
        if (h < best) { best = h; bestAt = s; }
      }
      Tide.at(t);            // restore tide.js's internal "last t" after probing ahead
      nextLowVal = best; nextLowIn = bestAt;
    }

    function update(dt, t) {
      var m = world.tide;
      marker.style.bottom = pct(m) + '%';
      readout.textContent = m.toFixed(2) + ' m';

      if (world.tideFrozen) {
        stateEl.textContent = '⏸ held';
        stateEl.className = 'tide-state held';
      } else if (world.tideDir > 0) {
        stateEl.textContent = '▲ flooding';
        stateEl.className = 'tide-state flood';
      } else {
        stateEl.textContent = '▼ ebbing';
        stateEl.className = 'tide-state ebb';
      }

      var sp = world.springness;
      springBar.style.width = (sp * 100).toFixed(0) + '%';
      springLbl.textContent = sp > 0.75 ? 'SPRING TIDE' : (sp < 0.3 ? 'NEAP TIDE' : 'mid');

      /* cover() walks the whole node grid, so it runs on the same slow clock
         as the next-low prediction rather than every frame */
      filmAccum += dt;
      if (filmAccum > 1) {
        filmAccum = 0;
        filmEl.textContent = Math.round(world.biofilm.cover() * 100) + '% cover';
        var up = world.seagrass.standing();
        grassEl.textContent = up > 0.9 ? 'standing'
          : up < 0.1 ? 'flat on the mud'
          : Math.round(up * 100) + '% still up';
        var lift = world.spoongrass.lifted();
        spoonEl.textContent = lift > 0.9 ? 'lifted, green'
          : lift < 0.1 ? 'wilted on the sand'
          : Math.round(lift * 100) + '% still wet';
        var billow = world.ulva.lifted();
        ulvaEl.textContent = billow > 0.9 ? 'billowing, green'
          : billow < 0.1 ? 'bleached, shrivelled'
          : Math.round(billow * 100) + '% still green';
        var standS = world.sargassum.standing();
        sargEl.textContent = standS > 0.9 ? 'standing, swaying'
          : standS < 0.1 ? 'collapsed on the rock'
          : Math.round(standS * 100) + '% still up';
      }

      predictAccum += dt;
      if (predictAccum > 1 && !world.tideFrozen) { predictAccum = 0; predict(t); }
      nextLowEl.textContent = world.tideFrozen
        ? '—'
        : nextLowVal.toFixed(2) + ' m in ' + Math.round(nextLowIn) + 's';

      if (toastT > 0) {
        toastT -= dt;
        if (toastT <= 0) toastEl.classList.add('hidden');
      }
    }

    return { update: update, toast: toast };
  }

  window.TideUI = { init: init };
})();
