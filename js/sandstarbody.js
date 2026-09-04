/* ============================================================
   sandstarbody.js — the sand star's parts.

   Same construction as seastarbody.js — arm span = 1.0, arms
   root-at-origin along +X, radial not bilateral — and deliberately
   the opposite animal at every point where a choice was available.

   PUT THE TWO SIDE BY SIDE. That is the whole reason this species is
   worth a slot rather than a recolour:

                    knobbly (§23)          sand star (§32)
     outline        thick, domed arms      flat, straight-sided arms
     edge           blunt tubercles ON     a comb of marginal spines
                    the upper surface      along BOTH arm edges
     colour         orange-red, cream      sand-grey with a darker
                    reticulation           midline down each arm
     read           a postcard             almost invisible until it
                                           moves

   THE SPINE COMB IS THE NAME. Astropecten's marginal plates carry a
   fringe of flattened spines down each side of every arm, and that
   fringe is the entire silhouette: it is what makes the arm read as a
   flat blade rather than a cone, and it is what you actually see when
   the animal is half-sunk with only its arm edges proud of the sand.
   So the spines are instanced along the arm EDGES, where the knobbly
   puts its knobs down the arm's SPINE. Same slot budget, different
   animal.

   Colour is camouflage, which is the point: this star hunts buried and
   hides buried, and a bright one would be a lie about a species whose
   whole strategy is not being seen on sand.
   ============================================================ */
(function () {
  'use strict';

  var hash = Facet.hash, ramp = Facet.ramp, pk = Facet.pick;
  var sweep = Facet.sweep;
  var colorize = Facet.colorize, geom = Facet.geom;

  /* ---------- palette ---------- */
  var BODY  = [0xa89a7c, 0xb3a586, 0x9c8f72];    // sand-grey buff
  var MID   = [0x7d7059, 0x8a7d64];              // the darker line down each arm
  var SPINE = [0xd8d0bc, 0xe2dac6];              // pale marginal spines
  var UNDER = [0xe0d6c0, 0xd5cab3];              // cream oral surface
  var MADR  = [0x8f6f4a];                        // the madreporite, one off-centre spot

  /* ---------- central disc ----------
     Small and flat. The knobbly's disc is a third of its span and
     stands proud; this one is a plate the arms run straight out of. */
  function disc() {
    var pos = sweep({
      len: 0.16, rad: 0.17, seg: 10, rings: 3, round: 3.2,
      jitter: 0.07, seed: 601, centred: true,
      profile: ramp([[0, 0.55], [0.45, 1.0], [1, 0.58]])
    });
    return geom(pos, colorize(pos, function (t, u, i) {
      if (t < 0.28) return pk(UNDER, i);
      if (hash(i, 5, 3) > 0.93) return MADR[0];            // the one asymmetric mark on a radial animal
      return pk(BODY, i);
    }));
  }

  /* One arm. FLAT: aspectY well under half, so the cross-section is a
     blade lying on the sand. Straight-sided rather than tapering in a
     curve — an Astropecten arm is a triangle, and it does NOT lift at
     the tip the way a live knobbly's does, because this animal spends
     its life pressed into the sediment. */
  function arm() {
    var pos = sweep({
      len: 1.0, rad: 0.145, seg: 7, rings: 6, round: 2.4,
      aspectY: 0.34, jitter: 0.07, seed: 607,
      profile: ramp([[0, 1.0], [0.5, 0.66], [0.82, 0.34], [1, 0.10]])
    });
    return geom(pos, colorize(pos, function (t, u, i) {
      if (u < 0.30) return pk(UNDER, i);
      // a darker line down the middle of the upper surface
      if (u > 0.72 && hash(i, 11, 7) > 0.35) return pk(MID, i);
      return pk(BODY, i);
    }));
  }

  /* One marginal spine. Flattened and blunt — these are paddles for
     shovelling sand, not needles. Short, because a long one would read
     as a sea urchin. */
  function spine() {
    var pos = sweep({
      len: 0.12, rad: 0.030, seg: 5, rings: 3, round: 2.0,
      aspectZ: 0.55, jitter: 0.16, seed: 613,
      profile: ramp([[0, 1.0], [0.6, 0.82], [1, 0.34]])
    });
    return geom(pos, colorize(pos, function (t, u, i) { return pk(SPINE, i); }));
  }

  var cache = null;
  function parts() {
    if (cache) return cache;
    cache = { disc: disc(), arm: arm(), spine: spine() };
    return cache;
  }

  window.SandStarBody = { parts: parts, material: Facet.material };
})();
