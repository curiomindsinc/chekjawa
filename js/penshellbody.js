/* ============================================================
   penshellbody.js — the pen shell's parts.

   facet.js kit. Body units with the SHELL'S HEIGHT = 1.0, parts
   root-at-origin along +X, and +X is UP OUT OF THE SAND — the same
   convention the barnacle uses (barnaclebody.js), for the same
   reason: this animal is anchored at one end and everything about it
   is measured from that anchor.

   A PEN SHELL IS A WEDGE STANDING ON ITS POINT. Two long triangular
   valves, hinged down one edge, buried two thirds deep with the point
   down and the wide gaping end at the top. That upside-down posture is
   the entire silhouette, and it is why this is the one bivalve on this
   shore worth building before the encrusting ones: an oyster is a lump
   on a rock, this is a shape standing up out of open sand.

   THE VALVES ARE BLADES, NOT SOLIDS. `blade()` is two-sided by
   construction (facet.js), which is what a shell valve is — a thin
   sheet with an inside and an outside. Building it as a swept solid
   would have given the gape a wall of end-caps down the middle where
   there should be an opening.

   THREE COLOUR ZONES DOWN ONE VALVE, and they are all real:

     the buried third   pale and clean. Sand does not grow anything
     the middle         translucent amber horn, the shell's own colour
     the exposed edge   ENCRUSTED — algae, barnacle spat, silt. The top
                        of a pen shell is a wall in the current and
                        everything on this shore is trying to settle on
                        it. Leaving that off made it read as a dropped
                        plastic wedge.

   The mantle fringe inside the gape is the only soft part that shows,
   and it is the tell for open versus shut at any distance where the
   valve gap itself is one pixel.
   ============================================================ */
(function () {
  'use strict';

  var hash = Facet.hash, ramp = Facet.ramp, pk = Facet.pick;
  var sweep = Facet.sweep, blade = Facet.blade;
  var colorize = Facet.colorize, geom = Facet.geom;

  /* ---------- palette ---------- */
  var HORN  = [0x8a6f45, 0x7d6440, 0x96794d];    // translucent amber-brown shell
  var RIB   = [0x6a5334, 0x5d492e];              // the radial ribs, in shadow
  var BURIED= [0xb6a888, 0xac9e7f];              // the clean buried third
  var CRUST = [0x6b7350, 0x5c6446, 0x767d59];    // algal encrustation on the exposed edge
  var SPAT  = [0xc9c3b0];                        // barnacle spat settled on it
  var MANTLE= [0x8c4a3a, 0x9c5644, 0x7c3f31];    // the fleshy fringe in the gape

  /* ---------- one valve ----------
     A long triangle: narrow at the buried point (t = 0), widest at the
     gaping top. `sweepZ` bows it outward slightly along its length so
     the pair make a lens in cross-section rather than two flat plates
     leaning together. */
  function valve() {
    var pos = blade({
      len: 1.0, half: 0.5, thick: 0.05, steps: 8, jitter: 0.09, seed: 701,
      outline: ramp([[0, 0.10], [0.25, 0.40], [0.6, 0.74], [0.88, 0.97], [1, 1.0]]),
      sweepZ: function (t) { return 0.055 * Math.sin(t * Math.PI * 0.85); }
    });
    return geom(pos, colorize(pos, function (t, u, i) {
      if (t < 0.34) return pk(BURIED, i);                  // under the sand: clean
      if (t > 0.80) {
        // the exposed lip, where everything settles
        if (hash(i, 3, 9) > 0.80) return SPAT[0];
        return pk(CRUST, i);
      }
      // radial ribs, in colour: modelling them would multiply the mesh for a 2 px detail
      if (hash(i, 13, 5) > 0.70) return pk(RIB, i);
      return pk(HORN, i);
    }));
  }

  /* The mantle fringe. A ragged soft blade that sits in the gape and
     shows only while the valves are parted. High jitter on purpose —
     this is the one part of the animal that is not a hard edge. */
  function mantle() {
    var pos = blade({
      len: 1.0, half: 0.5, thick: 0.02, steps: 6, jitter: 0.40, seed: 709,
      outline: ramp([[0, 0.55], [0.4, 0.9], [0.75, 1.0], [1, 0.72]])
    });
    return geom(pos, colorize(pos, function (t, u, i) { return pk(MANTLE, i); }));
  }

  /* A low collar of sand heaped at the base, where the byssal threads
     hold and the current has piled sediment against the standing
     shell. Small, but without it the valves look pushed into the
     ground rather than grown out of it. */
  function collar() {
    var pos = sweep({
      len: 0.13, rad: 0.34, seg: 9, rings: 3, round: 2,
      jitter: 0.38, seed: 719,
      profile: ramp([[0, 1.0], [0.5, 0.72], [1, 0.20]])
    });
    return geom(pos, colorize(pos, function (t, u, i) { return pk(BURIED, i); }));
  }

  var cache = null;
  function parts() {
    if (cache) return cache;
    cache = { valve: valve(), mantle: mantle(), collar: collar() };
    return cache;
  }

  window.PenShellBody = { parts: parts, material: Facet.material };
})();
