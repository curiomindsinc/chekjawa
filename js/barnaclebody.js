/* ============================================================
   barnaclebody.js — the barnacle's parts.

   Same kit as the crab and the mudskipper (facet.js), same two conventions:
   BODY UNITS with the shell's basal diameter = 1.0, and every part is
   root-at-origin along +X.

   THE +X CONVENTION EARNS ITSELF HERE. A barnacle is the first
   organism on this shore that does not stand on flat ground — it is
   cemented to the side of a boulder at whatever angle the boulder
   offers. Because the shell is built along +X from its own base,
   placing one is "point +X along the rock's surface normal", and a
   barnacle on a vertical face works out of the same code as one on
   the top.

   A barnacle is a cone of overlapping limestone plates with a
   trapdoor across the top. Two moving parts:

     opercular plates  the trapdoor. Shut when the tide is out, parted
                       while submerged.
     cirri             the feathery leg-fan that combs plankton out of
                       the water — the thing that makes a barnacle read
                       as an animal instead of a bump on a rock.

   Colour is the same bleached shell-crust the boulders already carry
   on their upper faces (rocks.js CRUST), because that crust is drawn
   from barnacle bands in the first place. The plate sutures are darker
   so the cone reads as built from pieces.
   ============================================================ */
(function () {
  'use strict';

  var hash = Facet.hash, ramp = Facet.ramp, pk = Facet.pick;
  var sweep = Facet.sweep, blade = Facet.blade;
  var colorize = Facet.colorize, geom = Facet.geom;

  /* ---------- palette ---------- */
  var SHELL  = [0xd8d1c0, 0xcdc6b4, 0xe1dac9];   // bleached limestone
  var SUTURE = [0x9a9384, 0x8d8677];             // the seams between plates
  var BASE   = [0xa9a291, 0x9c9585];             // damp, where it meets the rock
  var PLATE  = [0xbfb8a6, 0xb3ac9a];             // the trapdoor
  var CIRRI  = [0x6f5a48, 0x7d6753, 0x64513f];   // the feeding fan, dark and soft

  /* ---------- the shell ----------
     A cone that flares hard at the base and stops well short of a
     point: a barnacle is a volcano, not a spike. `round` above 2 gives
     it the slightly boxy cross-section of overlapping wall plates.

     The vertical ribbing is done in COLOUR, not geometry — every rib
     modelled would multiply the triangle count of the most numerous
     organism on the shore by six for a detail that is two pixels wide
     at the range you actually see one. */
  function shell() {
    var pos = sweep({
      len: 0.62, rad: 0.50, seg: 9, rings: 5, round: 2.7,
      jitter: 0.10, seed: 41,
      profile: ramp([[0, 1.0], [0.25, 0.86], [0.7, 0.62], [1, 0.52]])
    });
    return geom(pos, colorize(pos, function (t, u, i) {
      if (t < 0.12) return pk(BASE, i);
      // vertical sutures: a hashed sixth of the facets go dark
      if (hash(i, 5, 9) > 0.74) return pk(SUTURE, i);
      return pk(SHELL, i);
    }));
  }

  /* One half of the trapdoor. Built as a blade so the two halves meet
     edge-on down the middle; the behaviour file swings them apart
     around that seam. */
  function operculum() {
    var pos = blade({
      len: 1.0, half: 0.5, thick: 0.05, steps: 4, jitter: 0.08, seed: 47,
      outline: ramp([[0, 0.95], [0.6, 0.8], [1, 0.30]])
    });
    return geom(pos, colorize(pos, function (t, u, i) {
      return t > 0.75 ? pk(SUTURE, i) : pk(PLATE, i);
    }));
  }

  /* The cirral fan. One blade, curled: `sweepY` is what makes it a
     scoop rather than a flag, and it is the curl that reads as
     "kicking food into its own mouth" when the behaviour file rolls it
     out and back. */
  function cirri() {
    var pos = blade({
      len: 1.0, half: 0.46, thick: 0.012, steps: 6, jitter: 0.22, seed: 53,
      outline: ramp([[0, 0.30], [0.45, 1.0], [0.8, 0.85], [1, 0.25]]),
      sweepY: function (t) { return -0.34 * t * t; }
    });
    return geom(pos, colorize(pos, function (t, u, i) { return pk(CIRRI, i); }));
  }

  var cache = null;
  function parts() {
    if (cache) return cache;
    cache = { shell: shell(), operculum: operculum(), cirri: cirri() };
    return cache;
  }

  window.BarnacleBody = { parts: parts, material: Facet.material };
})();
