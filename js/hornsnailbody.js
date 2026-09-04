/* ============================================================
   hornsnailbody.js — the horn snail's parts.

   facet.js kit. Body units with the shell's HEIGHT = 1.0, parts
   root-at-origin along +X, and +X is the animal's forward axis — a
   horn snail lives on mud and points somewhere, so it is built like
   the conch, not like the nerite.

   THE SPIRE IS THE SPECIES, and it is the exact opposite of the
   nerite's. neritebody.js explains why a high-shore ROCK snail is a
   low dome: a spire snaps off against stone in surf. This animal
   lives on soft mud in the mangrove fringe where nothing ever slams
   it against anything, so it can afford to be a long, sharp,
   many-whorled turret — and it is. Put the two shells side by side
   and the habitat is legible from the silhouette alone. That is the
   whole reason this species is worth building after two other
   biofilm grazers.

   THE WHORLS ARE MODELLED, NOT PAINTED. The nerite's bands come out
   of colour alone because a dome has no steps in it to catch light.
   A cerith does: each whorl is a visible shoulder down the cone. The
   profile ramp below is a staircase — nine short flats separated by
   pinches — so the taper has actual notches in it, and the flat
   shading picks them out as rings without a single extra triangle.

   Colour is mud. These snails live half-buried in the fringe and
   their shells carry it: dark olive-brown, chalky where the apex has
   worn through, and dulled further by the film they graze.
   ============================================================ */
(function () {
  'use strict';

  var hash = Facet.hash, pk = Facet.pick;
  var sweep = Facet.sweep;
  var colorize = Facet.colorize, geom = Facet.geom;

  /* ---------- palette ---------- */
  var SHELL = [0x5c4a30, 0x51402a, 0x664f34];    // mud-brown shell
  var RIB   = [0x3e3120, 0x362a1c];              // the shadow line at each whorl suture
  var BEAD  = [0x7d6845, 0x8a7550];              // the beaded ridge that catches the light
  var APEX  = [0x9a8b74, 0x8b7d68];              // worn tip, rubbed through to chalk
  var LIP   = [0xcabfa4];                        // the aperture rim
  var FOOT  = [0x6a5b48, 0x74644f, 0x5f5142];   // dark: a pale foot reads as a plate under the shell
  var TENT  = [0x6d5f4c];

  var WHORLS = 9;

  /* ---------- the shell ----------
     A long cone. `profile` is built rather than written out: nine
     whorls, each one a short flat with a pinch at its suture, laid
     over a straight taper from the aperture to the point. */
  function whorlProfile(t) {
    var taper = 1 - t;                                  // the cone itself
    var w = t * WHORLS;
    var inW = w - Math.floor(w);                        // 0..1 within this whorl
    /* Each whorl bulges in its middle and pinches at the suture. The
       pinch is what the eye reads as a separate turn of the spiral. */
    var step = 0.86 + 0.14 * Math.sin(inW * Math.PI);
    var base = t < 0.06 ? 0.55 + t / 0.06 * 0.45 : 1;   // the aperture rounds off
    return Math.max(0.03, taper * step * base);
  }

  function shell() {
    var pos = sweep({
      len: 1.0, rad: 0.235, seg: 8, rings: 30, round: 2.15,
      aspectZ: 0.94, jitter: 0.055, seed: 307, centred: true,
      profile: whorlProfile
    });
    return geom(pos, colorize(pos, function (t, u, i) {
      if (t < 0.05) return LIP[0];                      // aperture rim
      if (t > 0.90) return pk(APEX, i);                 // worn point
      var w = t * WHORLS, inW = w - Math.floor(w);
      if (inW < 0.14 || inW > 0.90) return pk(RIB, i);  // the suture, in its own shadow
      if (inW > 0.40 && inW < 0.62 && hash(i, 11, 5) > 0.42) return pk(BEAD, i);
      return pk(SHELL, i);
    }));
  }

  /* The foot: a creeping sole, longer and narrower than the nerite's
     because this animal ploughs soft mud instead of gripping rock. */
  function foot() {
    var pos = sweep({
      len: 0.55, rad: 0.12, seg: 7, rings: 4, round: 2.8,
      aspectY: 0.36, jitter: 0.06, seed: 311, centred: true,
      profile: Facet.ramp([[0, 0.5], [0.28, 1.0], [0.76, 0.94], [1, 0.42]])
    });
    return geom(pos, colorize(pos, function (t, u, i) { return pk(FOOT, i); }));
  }

  /* One tentacle. Out while grazing, in the moment it seals — the same
     cheapest-possible state tell the nerite uses. */
  function tentacle() {
    var pos = sweep({
      len: 1.0, rad: 0.030, seg: 5, rings: 3, round: 2,
      jitter: 0.10, seed: 313,
      profile: Facet.ramp([[0, 1.0], [1, 0.32]])
    });
    return geom(pos, colorize(pos, function (t, u, i) { return pk(TENT, i); }));
  }

  var cache = null;
  function parts() {
    if (cache) return cache;
    cache = { shell: shell(), foot: foot(), tentacle: tentacle() };
    return cache;
  }

  window.HornSnailBody = { parts: parts, material: Facet.material };
})();
