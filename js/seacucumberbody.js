/* ============================================================
   seacucumberbody.js — the sea cucumber's parts.

   facet.js kit. Body units with the BODY LENGTH = 1.0, parts
   root-at-origin along +X, and +X is the animal's forward axis — the
   mouth end. A sea cucumber has a front and a back and nothing else;
   it is the simplest silhouette on this shore.

   WHICH MEANS THE SILHOUETTE CANNOT CARRY IT. A brown sausage on
   brown sand is a brown sausage. Two things make this read as an
   animal, and both of them are at the mouth end:

     the tentacle crown   a ring of short branched fronds that sweep
                          sediment inward. It is the ONLY part that
                          moves quickly, and at this size it is the
                          difference between an animal and a dropped
                          object.
     the casts            not a body part — see seacucumbers.js. The
                          coil of worked sediment it leaves behind is
                          what tells you it has been somewhere.

   The dorsal papillae are instanced rather than baked, for the same
   reason the knobbly sea star's tubercles are (seastarbody.js): a
   bump the behaviour file can place is a bump it can also squash when
   the animal contracts, and a contracting sea cucumber is mostly a
   change in how its bumps sit.

   Colour is Chek Jawa mud: dark olive-brown body, paler underside
   where it meets the sand, rust-coloured papillae, and a tentacle
   crown a shade lighter than the body so the working end reads at a
   distance.
   ============================================================ */
(function () {
  'use strict';

  var hash = Facet.hash, ramp = Facet.ramp, pk = Facet.pick;
  var sweep = Facet.sweep, blade = Facet.blade;
  var colorize = Facet.colorize, geom = Facet.geom;

  /* ---------- palette ---------- */
  var BODY  = [0x4d4331, 0x574c38, 0x453c2c];    // dark olive-brown
  var FLANK = [0x6b5e46, 0x776850];              // the sides, catching light
  var SOLE  = [0x8b7d63, 0x94856b];              // pale underside, on the sand
  var WART  = [0x3a3126, 0x322a20];              // the darker warty mottle
  var PAP   = [0x8a5f3a, 0x7a5433];              // rust papillae
  var TENT  = [0x9d8a63, 0xa9956d];              // the feeding crown
  var CAST  = [0x8f8365, 0x847859, 0x9a8e70];    // worked sediment, coiled

  /* ---------- the body ----------
     Fat in the middle, tapering to a blunt mouth and a blunter anus.
     `round` above 2 flattens the cross-section a little, because a sea
     cucumber lying on sand is not a cylinder — it spreads on its sole. */
  function body() {
    var pos = sweep({
      len: 1.0, rad: 0.185, seg: 9, rings: 8, round: 2.5,
      aspectY: 0.82, jitter: 0.11, seed: 503, centred: true,
      profile: ramp([[0, 0.42], [0.16, 0.86], [0.42, 1.0], [0.72, 0.94], [0.9, 0.66], [1, 0.34]])
    });
    return geom(pos, colorize(pos, function (t, u, i) {
      if (u < 0.24) return pk(SOLE, i);                    // the sole, flat on the sand
      if (hash(i, 7, 11) > 0.80) return pk(WART, i);       // warty mottle
      if (u < 0.52) return pk(FLANK, i);
      return pk(BODY, i);
    }));
  }

  /* A dorsal papilla — a soft conical bump, not a spine. These are
     sensory and respiratory; nothing about a sea cucumber is armed. */
  function papilla() {
    var pos = sweep({
      len: 0.10, rad: 0.042, seg: 5, rings: 3, round: 2.2,
      jitter: 0.20, seed: 509,
      profile: ramp([[0, 1.0], [0.5, 0.78], [1, 0.30]])
    });
    return geom(pos, colorize(pos, function (t, u, i) { return pk(PAP, i); }));
  }

  /* One feeding tentacle. A branched frond rather than a rod, so it is
     a blade with a broad, ragged head — that is the mop it wipes over
     the sediment and then stuffs into its own mouth. */
  function tentacle() {
    var pos = blade({
      len: 1.0, half: 0.30, thick: 0.02, steps: 5, jitter: 0.30, seed: 521,
      outline: ramp([[0, 0.18], [0.5, 0.55], [0.8, 1.0], [1, 0.62]]),
      sweepY: function (t) { return -0.10 * t * t; }
    });
    return geom(pos, colorize(pos, function (t, u, i) { return pk(TENT, i); }));
  }

  /* A CAST: one coil of sediment that has been through the animal.
     Deliberately not a sphere — the fiddler's pellet is a ball because
     a claw rolls it (crabbody.js), and this is an extruded rope, so it
     is a short fat sweep with the jitter turned right up and a kink in
     it. Same trick, different machine at the other end. */
  function cast() {
    var pos = sweep({
      len: 0.26, rad: 0.055, seg: 6, rings: 4, round: 2.3,
      jitter: 0.42, seed: 523, centred: true,
      profile: ramp([[0, 0.55], [0.4, 1.0], [0.75, 0.92], [1, 0.5]]),
      curveZ: function (t) { return 0.09 * Math.sin(t * Math.PI * 1.6); }
    });
    return geom(pos, colorize(pos, function (t, u, i) { return pk(CAST, i); }));
  }

  var cache = null;
  function parts() {
    if (cache) return cache;
    cache = { body: body(), papilla: papilla(), tentacle: tentacle(), cast: cast() };
    return cache;
  }

  window.SeaCucumberBody = { parts: parts, material: Facet.material };
})();
