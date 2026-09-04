/* ============================================================
   octopusbody.js — the day octopus's parts (BUILD_GUIDE §41).

   THE HARDEST BODY IN THE ROSTER, and it is hard for one reason: it
   has no skeleton, so nothing about it is a fixed shape. Every other
   animal built here is a set of solids that keep their proportions
   and get MOVED — a claw hinges, a valve opens, a leg swings, and the
   parts themselves never change. An octopus changes what it IS. It
   pours through a gap narrower than its own eye, balls up in a hole a
   third of its span, spreads a web twice its own width, and does all
   of it in under a second.

   Nothing here tries to model that honestly, and pretending otherwise
   would be the mistake. What is modelled is the part that shows, the
   same call every predator on this shore has made since §30: FOUR
   POSTURES built out of parts that are scaled per-instance rather than
   deformed, plus the one thing an octopus does that no other animal
   here can do at all — change colour, in seconds, over its whole body.

   THE BODY UNIT IS THE MANTLE LENGTH, and +X is FORWARD, toward the
   ARM CROWN. Read that twice: the mantle is BEHIND the head, so the
   mantle part sweeps from its apex at t=0 toward the neck at t=1 and
   is placed pointing BACKWARD down the body's own -X. §39's rule —
   `sweep`'s t=0 is the −X end, the TAIL — bit the anemonefish because
   a blunt cylinder hides the reversal. A mantle IS a blunt cylinder.
   It is written down here instead of being discovered later.

   PARTS

     mantle   the bag. Apex at t=0, neck at t=1. Papillae as sweep
              jitter plus a darker mottle
     head     the short barrel between the mantle and the arms, which
              is where the eyes sit — an octopus's head is small and
              the bag behind it is not the head, which is the single
              most commonly got-wrong thing about the animal
     eye      a dome with a GOLD IRIS and a HORIZONTAL SLIT PUPIL. The
              slit is horizontal in life and stays horizontal however
              the animal rolls, and it is the one feature that makes a
              lump of grey read as something looking back at you
     armSeg   one segment of one arm. Eight arms x five segments =
              forty instances an animal, all the same geometry at
              different lengths and thicknesses (crabs.js's leg
              pattern). Sucker rows are BAKED into the underside as
              colour — 160 sucker parts an animal is not a thing worth
              drawing at the distance anyone sees one from (§35's
              sand-collar call)
     web      the interbrachial membrane. Eight-lobed shallow cone,
              hand-rolled for the reason sanddollarbody.js (§31),
              spongebody.js (§35) and anemonebody.js (§39) hand-rolled
              theirs: `Facet.colorize` reads two axes and a radial
              pattern needs a third. Two-sided, because a pouncing
              octopus is seen from underneath as often as over
     siphon   the funnel. Small, and it is the whole of the jet
     lair     the den mouth — a dark plug sunk under the sand so its
              top reads as a hole rather than an object
     shell    one midden fragment. A blade, not a solid: what piles up
              outside a real den is broken valves

   COLOUR IS BAKED NEUTRAL ON PURPOSE, and this is §36's lesson used
   forward instead of learned the hard way. `instanceColor` MULTIPLIES
   the baked vertex colour, so a base with a dead channel can never be
   tinted into that channel — the swimming crab could not be made blue
   over fiddler orange and needed its own palette. This animal has to
   go from sand-pale to dark red-brown to blanched white and back
   within a second, which means the base must carry ALL THREE channels
   at a middling level and octopus.js does the rest with one colour per
   instance per frame. A "correct" sand-brown octopus baked in would
   have been the same trap one species later.
   ============================================================ */
(function () {
  'use strict';

  var hash = Facet.hash, pk = Facet.pick, ramp = Facet.ramp;
  var sweep = Facet.sweep, blade = Facet.blade;
  var colorize = Facet.colorize, geom = Facet.geom;

  var TAU = Math.PI * 2;

  /* ---------- palette ----------
     Deliberately desaturated and mid-toned. See the header: this is a
     canvas for instanceColor, not a finished skin. */
  var SKIN  = [0x9c8d7a, 0xa39481, 0x94856f, 0xa89984];   // the neutral base
  var MOTTLE = [0x83745f, 0x7a6c58];                      // papillae / dorsal blotching
  var PALE  = [0xbdb09a, 0xc4b7a1];                       // underside, arm bellies
  var SUCK  = [0xded2ba, 0xd6c9b0, 0xe4d9c3];             // sucker discs
  var IRIS  = [0xc2a86a, 0xcbb173, 0xb89f62];             // gold ring
  var PUPIL = [0x120f0a, 0x0d0b07];                       // the slit
  var WEBC  = [0x8c7d69, 0x93846f];                       // membrane, a shade under the skin
  var DARK  = [0x241f18, 0x1c1813];                       // the hole
  var SHELL = [0xcdc2ad, 0xd6cbb6, 0xc2b7a2];             // midden fragments
  var SHRIM = [0xa89b85];                                 // and their broken edges

  /* ------------------------------------------------------------
     mantle — apex at t=0, neck at t=1
     ------------------------------------------------------------ */
  function mantle() {
    var pos = sweep({
      len: 1.0, rad: 0.34, seg: 16, rings: 18, round: 2.15,
      jitter: 0.15, seed: 613,
      /* A real mantle is an egg with the fat end forward. The neck end
         does NOT close: it runs into the head, and a rounded cap there
         would read as a bead on a string. */
      profile: ramp([[0, 0.14], [0.09, 0.50], [0.26, 0.88], [0.48, 1.0],
                     [0.72, 0.92], [0.90, 0.78], [1, 0.66]]),
      aspectY: 0.94
    });
    return geom(pos, colorize(pos, function (t, u, i) {
      if (u < 0.30) return pk(PALE, i);                    // the bag's underside is pale
      if (hash(i, 17, 5) > 0.72) return pk(MOTTLE, i);     // papillae, scattered
      return pk(SKIN, i);
    }));
  }

  /* ------------------------------------------------------------
     head — root at the neck, running forward to the arm crown
     ------------------------------------------------------------ */
  function head() {
    var pos = sweep({
      len: 0.42, rad: 0.30, seg: 16, rings: 8, round: 2.1,
      jitter: 0.12, seed: 907,
      /* Widest where the eyes are, then in again to the crown — the
         waist in front of the eyes is what separates a head from the
         bag behind it. */
      profile: ramp([[0, 0.82], [0.30, 1.0], [0.62, 0.90], [1, 0.72]])
    });
    return geom(pos, colorize(pos, function (t, u, i) {
      if (u < 0.32) return pk(PALE, i);
      if (hash(i, 23, 9) > 0.78) return pk(MOTTLE, i);
      return pk(SKIN, i);
    }));
  }

  /* ------------------------------------------------------------
     eye — a dome, built root-at-origin along +X so octopus.js points
     it OUT of the side of the head.

     The pupil is a HORIZONTAL band of `u`, not a dot. `colorize` gives
     (t along the dome, u up it), and a slit across the dome is exactly
     a narrow window in u — the one radial-ish pattern a sweep CAN
     draw, because it happens to lie along one of the two axes it has.
     Getting a slit out of colorize is luck, not a general method; the
     web below is what happens when the pattern does not line up.

     The band is 0.16 of u wide across 12 rings — §39's resolution
     rule says a feature narrower than a ring step comes back as a
     checkerboard, and 0.16 is nearly two full steps.
     ------------------------------------------------------------ */
  function eye() {
    var pos = sweep({
      len: 0.15, rad: 0.125, seg: 20, rings: 12, round: 2.0,
      jitter: 0.05, seed: 41,
      profile: ramp([[0, 0.62], [0.30, 1.0], [0.70, 0.94], [1, 0.34]])
    });
    return geom(pos, colorize(pos, function (t, u, i) {
      if (t < 0.34) return pk(SKIN, i);                    // the lid, skin-coloured
      if (Math.abs(u - 0.5) < 0.08) return pk(PUPIL, i);   // the slit
      return pk(IRIS, i);
    }));
  }

  /* ------------------------------------------------------------
     armSeg — root-at-origin along +X, the ordinary limb convention.

     Only a MILD taper in the part itself: the real taper down an arm
     is carried by the per-segment thickness octopus.js passes, the
     same division of labour crabs.js uses for a walking leg. A part
     that tapered hard would taper five times over.

     SUCKERS ARE ROWS IN COLOUR, and the rings count is set by them
     rather than by the silhouette. Nine rows over the segment is a
     period of 0.111 in t; at 24 rings a step is 0.042, so a row is
     between two and three triangles wide. Drop to 8 rings and the rows
     alias into a stripe (§38/§39, twice now).

     WHICH WAY IS DOWN. `put()` derives the part's side axes from its
     direction and world up, so a segment's -Y is "the underside" for
     any arm that is not pointing straight up — which, for an animal
     whose arms fan out around a roughly horizontal axis, is all of
     them most of the time. Real arms twist to keep the suckers facing
     the substrate; this gets the same read for free and is the reason
     the suckers are not modelled as parts that would need aiming.
     ------------------------------------------------------------ */
  function armSeg() {
    var pos = sweep({
      len: 1.0, rad: 0.115, seg: 10, rings: 24, round: 2.0,
      jitter: 0.09, seed: 1277,
      profile: ramp([[0, 1.0], [0.55, 0.90], [1, 0.76]])
    });
    return geom(pos, colorize(pos, function (t, u, i) {
      if (u < 0.42) {
        var row = Math.abs(Math.sin(t * Math.PI * 9));
        return row > 0.55 ? pk(SUCK, i) : pk(PALE, i);
      }
      if (hash(i, 29, 13) > 0.80) return pk(MOTTLE, i);
      return pk(SKIN, i);
    }));
  }

  /* ------------------------------------------------------------
     web — the interbrachial membrane, hand-rolled.

     An eight-lobed shallow cone opening along +X, apex at the crown.
     The lobes reach FURTHEST along the arm lines and sag between them,
     which is what a membrane slung between eight supports does.

     SEG against the feature, once more: eight lobes is 0.785 rad each
     and 64 steps is 0.098 rad, so eight steps cross a lobe — §38's
     count, and this time it was done before rendering rather than
     after.

     BOTH SIDES. `Facet.blade` gets two-sidedness by construction and
     this cannot use blade (it is radial, not a strip), so it does the
     same thing by hand: one surface wound out, one wound in, offset
     along the cone axis so they do not z-fight. A pouncing octopus is
     seen from below by anything it is pouncing on and from above by
     the camera, and a one-sided membrane would vanish from one of
     those two views entirely — which, with a FrontSide material, is
     not a shading bug but a missing object (facet.js's warning).
     ------------------------------------------------------------ */
  var WEB_SEG = 64;
  var WEB_RINGS = [0, 0.18, 0.34, 0.49, 0.63, 0.75, 0.86, 0.94, 1.0];
  var WEB_LOBES = 8;
  var WEB_R = 0.62;             // body units at full spread, before octopus.js scales it
  var WEB_X = 0.46;             // how far forward the rim stands from the apex
  var WEB_SKIN = 0.012;         // half-thickness between the two surfaces

  function web() {
    var pos = [];
    function tri(a, b, c) {
      pos.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
    }

    function surface(side) {
      var grid = [], r, q;
      for (r = 0; r < WEB_RINGS.length; r++) {
        var u = WEB_RINGS[r], row = [];
        for (q = 0; q < WEB_SEG; q++) {
          var th = q / WEB_SEG * TAU;
          /* +0.15*cos(8th): the rim bulges ON the arm lines. The sag
             between them is the same term with the sign it already
             has, so one cosine does both halves of the shape. */
          var rr = u * WEB_R * (1 + 0.15 * Math.cos(WEB_LOBES * th));
          rr *= 1 + (hash(r, q, 3301) - 0.5) * 0.04;
          /* u^1.25 rather than u: a membrane leaves the crown steeply
             and flattens out toward the rim, and a straight cone reads
             as a paper party hat. */
          var x = WEB_X * Math.pow(u, 1.25) + side * WEB_SKIN;
          row.push([x, Math.cos(th) * rr, Math.sin(th) * rr]);
        }
        grid.push(row);
      }
      for (r = 0; r < WEB_RINGS.length - 1; r++) {
        for (q = 0; q < WEB_SEG; q++) {
          var q2 = (q + 1) % WEB_SEG;
          var i0 = grid[r][q], o0 = grid[r + 1][q];
          var i1 = grid[r][q2], o1 = grid[r + 1][q2];
          if (side > 0) { tri(i0, o0, o1); tri(i0, o1, i1); }
          else { tri(i0, o1, o0); tri(i0, i1, o1); }
        }
      }
    }
    surface(1);
    surface(-1);

    return geom(pos, colorize(pos, function (t, u, i) {
      return hash(i, 37, 21) > 0.85 ? pk(MOTTLE, i) : pk(WEBC, i);
    }));
  }

  /* ------------------------------------------------------------
     siphon — the funnel. Root-at-origin along +X, and the whole of
     the jet is this one tube pointed the other way from where the
     animal is going.
     ------------------------------------------------------------ */
  function siphon() {
    var pos = sweep({
      len: 0.24, rad: 0.082, seg: 10, rings: 6, round: 2.0,
      jitter: 0.10, seed: 733,
      profile: ramp([[0, 1.0], [0.55, 0.80], [1, 0.58]])
    });
    return geom(pos, colorize(pos, function (t, u, i) {
      return t > 0.82 ? pk(DARK, i) : pk(PALE, i);
    }));
  }

  /* ------------------------------------------------------------
     lair — the den mouth.

     A squat dark plug, not a bowl. A bowl is the obvious model and it
     is wrong here: `sweep`'s sides face OUTWARD, so looking down into
     a bowl shows its back faces, the FrontSide material culls them,
     and the den renders as a ragged tear with the seabed visible
     through it. A plug sunk until its top cap is a whisker under the
     sand reads as a hole from every angle and cannot be seen through
     from any of them.
     ------------------------------------------------------------ */
  function lair() {
    var pos = sweep({
      len: 0.30, rad: 0.52, seg: 20, rings: 4, round: 2.4,
      jitter: 0.16, seed: 8819,
      profile: ramp([[0, 0.55], [0.5, 0.86], [1, 1.0]])
    });
    return geom(pos, colorize(pos, function (t, u, i) {
      return pk(DARK, i);
    }));
  }

  /* ------------------------------------------------------------
     shell — one midden fragment. Centred, so octopus.js can drop it
     at an angle without thinking about where its root is.
     ------------------------------------------------------------ */
  function shell() {
    var pos = blade({
      len: 0.30, half: 0.13, thick: 0.035, steps: 7,
      jitter: 0.22, seed: 5501, centred: true,
      outline: ramp([[0, 0.22], [0.35, 1.0], [0.72, 0.86], [1, 0.40]]),
      sweepY: function (t) { return -0.05 * Math.sin(t * Math.PI); }
    });
    return geom(pos, colorize(pos, function (t, u, i) {
      return (t < 0.08 || t > 0.92) ? pk([SHRIM[0]], i) : pk(SHELL, i);
    }));
  }

  /* ------------------------------------------------------------
     ink — one lump of a cloud (§42).

     §41 wrote this animal without ink on purpose: nothing on the
     shore ate an octopus, so a startle response would have been a
     behaviour that never fired, which is §31's standing warning. The
     smooth-coated otter is what changed that, and this is the part
     that was waiting for it.

     A CLOUD IS SEVERAL OF THESE, not one. A single blob reads as a
     ball; three or four at different sizes drifting apart read as
     something dispersing, which is the same "place the same part
     several times" call the moon snail's sand collar (§35) and the
     octopus's own midden (§41) already make.

     AND IT CANNOT FADE. There is exactly one material on this shore
     (facet.js) and it is opaque — no per-instance alpha exists, so a
     cloud cannot dissolve the obvious way. It disperses by GROWING
     and then SHRINKING away instead, which at this distance reads as
     the same thing and costs nothing. Do not add a second material to
     get alpha; one material for every organism is the promise facet.js
     is built on.
     ------------------------------------------------------------ */
  function ink() {
    var pos = sweep({
      len: 1.0, rad: 0.52, seg: 12, rings: 8, round: 2.0,
      jitter: 0.45, seed: 6607, centred: true,
      profile: ramp([[0, 0.30], [0.22, 0.82], [0.5, 1.0], [0.78, 0.86], [1, 0.34]])
    });
    return geom(pos, colorize(pos, function (t, u, i) {
      return hash(i, 41, 17) > 0.72 ? pk([DARK[1]], i) : pk(DARK, i);
    }));
  }

  var cache = null;
  function parts() {
    if (cache) return cache;
    cache = {
      mantle: mantle(), head: head(), eye: eye(), armSeg: armSeg(),
      web: web(), siphon: siphon(), lair: lair(), shell: shell(), ink: ink()
    };
    return cache;
  }

  window.OctopusBody = { parts: parts, material: Facet.material, WEB_R: WEB_R };
})();
