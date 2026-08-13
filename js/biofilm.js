/* ============================================================
   biofilm.js — the diatom biofilm resource grid (BUILD_GUIDE §7).

   The first thing on this shore that is NOT an animal. It is the
   savanna grass grid reskinned: a standing crop 0..1 that grazers
   drain and that regrows on its own — except that the input driving
   regrowth is submersion, not season.

   IT RIDES THE TERRAIN NODE GRID. It does not build a patch grid of
   its own, because world.js already keeps exactly the two arrays a
   biofilm needs, per node, every frame:

     hArr[ci]   the node's height in metres CD
     wet[ci]    0..1, how recently that node was under water (§3)

   §7 says to key regrowth off recent submersion and to reuse the
   field the wet-sand renderer already tracks rather than computing it
   twice. Sharing the grid is how that is honoured — and it means the
   film can be drawn for free by the colour pass that is already
   writing every node's colour, so the whole resource layer costs zero
   draw calls.

   THE ZONATION IS BAKED, THE DEPLETION IS EMERGENT. `capacity[ci]` is
   the most film a node can ever hold and is a fixed hump against
   height: near-zero up in the mangrove fringe (dries too long), full
   across the mid and low flat, tapering again in the channel that
   never drains (light, not damp, is what runs short down there).
   Standing crop inside that ceiling is the live part — grazed down by
   whoever is standing on it, regrown at a rate set by how wet the node
   has been.

   WHO READS IT. Nerite snails (`grazeAt`) and dog conches
   (`pickTarget`) — the two v1 grazers, through `world.filmAt` and
   `world.grazeFilm`. Nothing reads this array directly.
   ============================================================ */
(function () {
  'use strict';

  /* ---------- the knobs ---------- */
  /* Seconds for a bare node that stays wet to come back to full. Real
     biofilm regrows in hours; a tide cycle here is 90 s, so ~1.4 cycles
     from bare to full keeps the real relationship — a patch grazed flat
     is back by tomorrow's tide, not by this one. */
  var GROW_SECS = 125;
  /* What a fully dried-out node keeps of that rate. Not zero: the high
     shore does regrow, just slowly enough that grazing pressure up there
     always outruns it. This one number is where the shore's food
     zonation comes from. */
  var DRY_RATE = 0.12;
  var DARK_RATE = 0.30;         // regrowth in the dark, as a fraction of full daylight

  /* Capacity against height, metres CD. Cross-checked against tide.js:
     spring low 0.13, spring high 3.10, neap low 1.00, neap high 2.20. */
  var CAP_TOP = 3.00;           // above this nothing holds — floods a few minutes a fortnight
  var CAP_LUSH = [0.30, 1.70];  // the pasture: drains most tides, never dries for long
  var CAP_HIGH_MIN = 0.20;      // what is left at CAP_TOP
  var CAP_DEEP = -0.55;         // bottom of the channel
  var CAP_DEEP_MIN = 0.45;      // never drains, so never gets full-strength light

  /* Attach to world.js's node grid. `g` is the grid descriptor world
     hands over at build: { N, heights, wet, indexAt }. */
  function attach(g) {
    var N = g.N, hArr = g.heights, wet = g.wet, indexAt = g.indexAt;

    var film = new Float32Array(N);
    var capacity = new Float32Array(N);

    for (var i = 0; i < N; i++) {
      var h = hArr[i], c;
      if (h >= CAP_TOP) c = CAP_HIGH_MIN;
      else if (h > CAP_LUSH[1]) {
        var tu = (h - CAP_LUSH[1]) / (CAP_TOP - CAP_LUSH[1]);
        c = 1 - (1 - CAP_HIGH_MIN) * tu * tu;      // eased: the drop bites near the top of the shore
      } else if (h < CAP_DEEP) c = CAP_DEEP_MIN;
      else if (h < CAP_LUSH[0]) {
        var td = (CAP_LUSH[0] - h) / (CAP_LUSH[0] - CAP_DEEP);
        c = 1 - (1 - CAP_DEEP_MIN) * td;
      } else c = 1;
      capacity[i] = c;
      /* Start the shore already grown in. A sim that opens on bare mud and
         spends two tides greening up shows the grazers nothing. */
      film[i] = c * 0.85;
    }

    /* ---- regrowth ----
       One pass over the grid. rate is (wetness) x (light) x capacity
       headroom — a node cannot exceed its ceiling, and the closer it
       gets the slower it closes, so a heavily grazed patch recovers
       fast at first and then crawls. */
    var BASE = 1 / GROW_SECS;
    function update(dt, daylight) {
      var light = DARK_RATE + (1 - DARK_RATE) * daylight;
      var k = BASE * light * dt;
      for (var ci = 0; ci < N; ci++) {
        var cap = capacity[ci];
        var f = film[ci];
        if (f >= cap) continue;
        f += k * (DRY_RATE + (1 - DRY_RATE) * wet[ci]) * (1 - f / cap + 0.25);
        film[ci] = f > cap ? cap : f;
      }
    }

    /* ---- the grazer seam ---- */
    function at(x, z) {
      var ci = indexAt(x, z);
      return ci < 0 ? 0 : film[ci];
    }
    /* Eat up to `want` (in film units) off the node under (x,z) and
       return what was actually there to eat. A grazer standing on a
       bare patch gets 0 back, which is its cue to move on. */
    function graze(x, z, want) {
      var ci = indexAt(x, z);
      if (ci < 0) return 0;
      var got = film[ci];
      if (got > want) got = want;
      film[ci] -= got;
      if (film[ci] < 0) film[ci] = 0;
      return got;
    }

    /* Mean standing crop as a fraction of what the shore could hold —
       one number for "how grazed down is this flat right now". Skips
       nodes that were never pasture so the mangrove fringe and the
       channel do not drag the figure around. */
    function cover() {
      var sum = 0, n = 0;
      for (var ci = 0; ci < N; ci++) {
        if (capacity[ci] < 0.5) continue;
        sum += film[ci] / capacity[ci]; n++;
      }
      return n ? sum / n : 0;
    }

    return {
      film: film,               // read by world.js's colour pass, and by nothing else
      capacity: capacity,
      update: update,
      at: at,
      graze: graze,
      cover: cover
    };
  }

  window.Biofilm = { attach: attach };
})();
