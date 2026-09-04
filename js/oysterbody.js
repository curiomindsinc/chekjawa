/* ============================================================
   oysterbody.js — the oyster's parts.

   Same kit as the barnacle (facet.js), same two conventions: BODY
   UNITS with the shell's LENGTH = 1.0, and +X is "up off the rock" —
   an oyster is cemented to stone at whatever angle the boulder
   offers, exactly like the barnacle, and for the same reason.

   TWO VALVES, ONE OF WHICH NEVER MOVES. A barnacle's whole shell is
   one cone with a trapdoor on top; an oyster is the opposite split —
   the LOWER valve is cemented flat and does not move again once the
   larva settles, and the UPPER valve is the only living hinge on the
   animal, lifting clear of it to feed and clamping down over it to
   wait out the air. So `lower()` is drawn once at spawn like the
   barnacle's shell, and only `upper()` and the soft mantle fringe are
   redrawn while the tide moves.

   THE SHAPES ARE DIFFERENT ON PURPOSE. `lower()` is deeply cupped —
   real oysters grow a bowl to hold water and the animal in it — and
   `upper()` is nearly flat, a lid rather than a dish. Sharing one
   geometry between them would have made every clump read as two
   identical plates stacked with a gap, which is a mussel's silhouette,
   not an oyster's.

   THE RUFFLED EDGE is the other tell. A real oyster shell margin is
   not a smooth oval, it is a scalloped, fluted growth edge — the
   outline ramp below oscillates in and out along the length instead
   of rising smoothly to one peak, which is the same trick a bay
   scallop's fan gets from a straight radial rib pattern, done here in
   silhouette instead of in colour.

   Colour is weathered stone-grey and lilac-brown, close kin to the
   boulder's own CRUST palette (rocks.js) because a shell settling on
   rock ends up wearing the same minerals. No attempt at the pale
   nacre interior — `blade()` colours both faces from the same (t, u)
   position, so an inside/outside split is not cheaply available, and
   the barnacle and the pen shell both made the same call.
   ============================================================ */
(function () {
  'use strict';

  var hash = Facet.hash, ramp = Facet.ramp, pk = Facet.pick;
  var blade = Facet.blade;
  var colorize = Facet.colorize, geom = Facet.geom;

  /* ---------- palette ---------- */
  var SHELL = [0x8f867a, 0x9c9186, 0x7d746a, 0x948b7f];   // weathered stone-grey, lilac cast
  var RIB   = [0x6b6156, 0x5e564c];                        // growth-line shadow
  var PALE  = [0xb3a99a, 0xbcb1a1];                         // bleached patches on the exposed lid
  var CRUST = [0x6b7350, 0x5c6446, 0x767d59];              // algae settled on the upper valve
  var MANTLE= [0xcfc6c2, 0xb8a8ad, 0xc4b6ba];              // pale soft fringe in the gape

  /* A ruffled, scalloped margin: the outline oscillates in and out
     along the length instead of climbing smoothly to one peak. */
  var EDGE = ramp([[0, 0.50], [0.13, 0.90], [0.27, 0.56], [0.42, 0.96],
                   [0.58, 0.60], [0.72, 0.88], [0.87, 0.58], [1, 0.32]]);

  /* ---------- the lower valve ----------
     Cemented and never touched again. Deeply cupped: `sweepZ` bows the
     whole blade toward the rock so it reads as a bowl in cross-
     section, not a flat plate lying on the stone. */
  function lower() {
    var pos = blade({
      len: 1.0, half: 0.5, thick: 0.045, steps: 9, jitter: 0.14, seed: 811,
      outline: EDGE,
      sweepZ: function (t) { return -0.14 * Math.sin(t * Math.PI * 0.92); }
    });
    return geom(pos, colorize(pos, function (t, u, i) {
      if (hash(i, 11, 6) > 0.72) return pk(RIB, i);
      return pk(SHELL, i);
    }));
  }

  /* ---------- the upper valve ----------
     A lid, not a dish: barely cupped, and the exposed face carries
     bleach and algal settlement the buried lower valve never sees. */
  function upper() {
    var pos = blade({
      len: 1.0, half: 0.47, thick: 0.035, steps: 9, jitter: 0.13, seed: 823,
      outline: EDGE,
      sweepZ: function (t) { return -0.03 * Math.sin(t * Math.PI * 0.92); }
    });
    return geom(pos, colorize(pos, function (t, u, i) {
      if (hash(i, 9, 4) > 0.80) return pk(CRUST, i);
      if (hash(i, 11, 6) > 0.68) return pk(PALE, i);
      return pk(SHELL, i);
    }));
  }

  /* The mantle fringe, shown only through the gap while feeding — same
     cheap tell the pen shell uses for the same reason. */
  function mantle() {
    var pos = blade({
      len: 0.72, half: 0.4, thick: 0.02, steps: 5, jitter: 0.30, seed: 829,
      outline: ramp([[0, 0.4], [0.4, 0.95], [0.75, 1.0], [1, 0.5]])
    });
    return geom(pos, colorize(pos, function (t, u, i) { return pk(MANTLE, i); }));
  }

  var cache = null;
  function parts() {
    if (cache) return cache;
    cache = { lower: lower(), upper: upper(), mantle: mantle() };
    return cache;
  }

  window.OysterBody = { parts: parts, material: Facet.material };
})();
