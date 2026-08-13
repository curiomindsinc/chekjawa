/* ============================================================
   neritebody.js — the nerite snail's parts.

   facet.js kit, body units with the shell's width = 1.0, parts
   root-at-origin along +X. Like the barnacle, +X is "up off the rock",
   because a nerite lives on the same boulders at the same angles.

   A nerite is a low, thick dome — no spire worth speaking of. That is
   not stylisation: a tall spire snaps off against rock in surf, so the
   high-shore snails that survive are the ones built like a helmet.

   THE STRIPES ARE THE SPECIES. Nerites are the zebra-shelled snails of
   the splash zone, and a plain dome does not read as one. The banding
   is done in COLOUR, off the sweep's own vertex ordering: sweep()
   emits triangles ring by ring, two per segment, so `floor(i / 2) %
   seg` recovers which angular segment a triangle belongs to and the
   stripes fall where the whorl bands would. No extra geometry, and the
   bands survive at the two-pixel size you usually see one at.

   The foot and tentacles are pale and soft against the hard shell —
   the only part of the animal that ever comes out.
   ============================================================ */
(function () {
  'use strict';

  var hash = Facet.hash, ramp = Facet.ramp, pk = Facet.pick;
  var sweep = Facet.sweep, blade = Facet.blade;
  var colorize = Facet.colorize, geom = Facet.geom;

  /* ---------- palette ---------- */
  var DARK  = [0x2f2a26, 0x39322c, 0x241f1c];    // the dark bands
  var PALE  = [0xd9cfb8, 0xe3dac4, 0xcabfa6];    // the cream bands
  var APEX  = [0x6b6055, 0x5c5249];              // worn top, where the shell is rubbed bare
  var LIP   = [0xf0e8d6];                        // the polished aperture rim
  var FOOT  = [0xb9a58c, 0xc4b096, 0xae9a82];    // soft body
  var TENT  = [0x8f7d67];

  var SEG = 9;                                   // must match the shell sweep's `seg`

  /* ---------- the shell ----------
     A helmet: widest at the base, doming over, cut off before it can
     become a point. */
  function shell() {
    var pos = sweep({
      len: 0.60, rad: 0.50, seg: SEG, rings: 5, round: 2.2,
      jitter: 0.06, seed: 61,
      profile: ramp([[0, 0.98], [0.3, 1.0], [0.62, 0.84], [0.86, 0.55], [1, 0.22]])
    });
    return geom(pos, colorize(pos, function (t, u, i) {
      if (t > 0.88) return pk(APEX, i);                    // rubbed-bare top
      if (t < 0.06) return LIP[0];                         // aperture rim
      var band = Math.floor(i / 2) % SEG;                  // which whorl band this facet is in
      var dark = (band % 3 === 0) || (band === 4 && hash(i, 3, 8) > 0.5);
      return dark ? pk(DARK, i) : pk(PALE, i);
    }));
  }

  /* The foot: a soft slab that spreads out under the shell and carries
     the animal. Built centred so the behaviour file drops it under the
     shell and lets the shell hide most of it. */
  function foot() {
    var pos = sweep({
      len: 1.05, rad: 0.30, seg: 7, rings: 4, round: 2.6,
      aspectY: 0.34, jitter: 0.05, seed: 67, centred: true,
      profile: ramp([[0, 0.55], [0.3, 1.0], [0.72, 0.95], [1, 0.5]])
    });
    return geom(pos, colorize(pos, function (t, u, i) { return pk(FOOT, i); }));
  }

  /* One tentacle. Out while grazing, pulled in the moment the animal
     clamps — the cheapest possible tell for which state it is in. */
  function tentacle() {
    var pos = sweep({
      len: 1.0, rad: 0.048, seg: 5, rings: 3, round: 2,
      jitter: 0.10, seed: 71,
      profile: ramp([[0, 1.0], [1, 0.35]])
    });
    return geom(pos, colorize(pos, function (t, u, i) { return pk(TENT, i); }));
  }

  var cache = null;
  function parts() {
    if (cache) return cache;
    cache = { shell: shell(), foot: foot(), tentacle: tentacle() };
    return cache;
  }

  window.NeriteBody = { parts: parts, material: Facet.material };
})();
