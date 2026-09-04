/* ============================================================
   musselbody.js — the green mussel's parts.

   Same kit as the oyster (facet.js), body units with shell LENGTH =
   1.0, +X "up off the rock" — but where an oyster's lower valve is
   cemented flat and never moves, a mussel is anchored by a beard of
   threads at its narrow point and BOTH valves gape, symmetrically,
   about a hinge running along that point — the pen shell's own
   opening (penshellbody.js), on a shell shaped nothing like it.

   THE SHAPE IS A WEDGE, NOT A FAN. Pointed and narrow at the byssal
   end, swelling to a broad rounded margin at the free end — the
   outline ramp climbs almost the whole length of the shell instead of
   peaking early the way the oyster's scalloped fan does, which is
   what keeps a mussel bed reading as elongated teardrops packed edge
   to edge rather than as small oysters.

   TWO COLOURS, AND THE SECOND ONE IS THE SPECIES. *Perna viridis* is
   named for it: the shell is glossy blue-black over most of its
   length and breaks into a band of vivid green right at the growing
   edge. Nothing else on this shore carries that green, so it is worth
   keeping as a hard-edged band rather than blending it in — a mussel
   bed should read green-rimmed from across the flat.

   THE BYSSUS IS DRAWN, not implied. A few thin threads run from the
   point down toward the rock, the same blade-as-a-line trick the
   egret's nape plumes use (egretbody.js) — thin enough to read as
   fibre rather than as a fourth shell part.
   ============================================================ */
(function () {
  'use strict';

  var hash = Facet.hash, ramp = Facet.ramp, pk = Facet.pick;
  var blade = Facet.blade;
  var colorize = Facet.colorize, geom = Facet.geom;

  /* ---------- palette ---------- */
  var SHELL = [0x161c24, 0x1d232c, 0x121820, 0x1a2029];   // glossy blue-black
  var SHEEN = [0x2a3540, 0x323f4a];                        // the gloss highlight, cooler and lighter
  var GREEN = [0x4a8f4f, 0x5aa457, 0x3f7d46, 0x529550];    // the growing edge — the field mark
  var BYSSUS= [0x8a7a5c, 0x77694f];

  /* Narrow at the point (t = 0), broad and rounded at the free margin
     (t = 1) — a wedge, not a fan. The slight fall at the very tip
     rounds the posterior margin instead of leaving it a hard corner. */
  var OUTLINE = ramp([[0, 0.04], [0.20, 0.22], [0.5, 0.58], [0.8, 0.94], [1, 0.80]]);

  function valve() {
    var pos = blade({
      len: 1.0, half: 0.5, thick: 0.045, steps: 9, jitter: 0.08, seed: 941,
      outline: OUTLINE,
      // a gentle lens curve, the pen shell's own trick, so the pair
      // together read as a shell and not two flat chips
      sweepZ: function (t) { return 0.05 * Math.sin(t * Math.PI * 0.9); }
    });
    return geom(pos, colorize(pos, function (t, u, i) {
      if (t > 0.86) return pk(GREEN, i);                  // the growing edge, hard-banded
      if (hash(i, 13, 5) > 0.78) return pk(SHEEN, i);      // gloss highlight, scattered
      return pk(SHELL, i);
    }));
  }

  /* One byssal thread. Root at the anchor point, run to the rock. */
  function byssus() {
    var pos = blade({
      len: 1.0, half: 0.028, thick: 0.012, steps: 4, jitter: 0.14, seed: 947,
      outline: ramp([[0, 0.6], [0.5, 1.0], [1, 0.2]])
    });
    return geom(pos, colorize(pos, function (t, u, i) { return pk(BYSSUS, i); }));
  }

  var cache = null;
  function parts() {
    if (cache) return cache;
    cache = { valve: valve(), byssus: byssus() };
    return cache;
  }

  window.MusselBody = { parts: parts, material: Facet.material };
})();
