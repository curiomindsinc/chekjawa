/* ============================================================
   gobybody.js — the sand goby's parts (BUILD_GUIDE §40).

   Same kit as everything else (facet.js), same two conventions: BODY
   UNITS with body length = 1.0, and fins root-at-origin along +X so
   the behaviour file places one by pointing +X where it should lie.
   +X is the HEAD, as it is on the mudskipper and the anemonefish.

   THIS IS THE FISH THE MUDSKIPPER REPLACED, AND EVERY PART HERE IS
   BENT AWAY FROM IT. §24 swapped a goby for a mudskipper and the two
   are near relatives, so if this is built from mudskipperbody.js with
   the numbers nudged it will simply read as a second mudskipper.
   Three things keep them apart, and all three are real:

     THE PELVIC DISC   A goby's two pelvic fins are FUSED into a single
                       oval sucker under the chest. It is the character
                       that defines the whole family — thousands of
                       species, one disc — and no other animal on this
                       shore has anything like it. A goby at rest is
                       sitting ON it. The mudskipper has the same
                       structure and never shows it, because a
                       mudskipper is always propped on its pectorals
                       instead.
     FAN PECTORALS     Thin, broad, rounded SHEETS, built with `blade`.
                       The mudskipper's are solid `sweep` limbs it puts
                       its weight on. Same fin, opposite job, and the
                       choice of primitive is what says so.
     SAND CAMOUFLAGE   Pale olive-grey with four dark saddles and a
                       black spot at the tail root, over a white belly.
                       The mudskipper is wet-mud brown all over. This
                       one is coloured to vanish against dry sand,
                       which is the point of an animal that gets caught
                       out on it.

   SADDLES ARE MEASURED FROM THE NOSE, AND `sweep` t IS NOT. `sweep`
   runs x from 0 to `len` along +X and `centred` only shifts that
   window, so t=0 is the TAIL end. `nose()` below is the conversion —
   §39's lesson, paid for once by the anemonefish and free ever since.
   ============================================================ */
(function () {
  'use strict';

  var hash = Facet.hash, ramp = Facet.ramp, pk = Facet.pick;
  var sweep = Facet.sweep, blade = Facet.blade;
  var colorize = Facet.colorize, geom = Facet.geom;

  /* ---------- palette ----------
     Wet sand, not wet mud. Everything here is a shade the flat itself
     wears, which is the whole defence of a fish that spends low water
     sitting in six inches of clear pool with a heron overhead. */
  var BACK   = [0x9a8d6e, 0x8f8264, 0xa4977a];    // pale olive-grey, the sand it sits on
  var SADDLE = [0x4e4433, 0x584d3a, 0x463d2d];    // the dark blotches down the flank
  var FLANK  = [0xb3a685, 0xbcb08f];
  var SPECK  = [0x7fa0ad, 0x93b0ba];              // faint blue flecks on the cheek
  var BELLY  = [0xece4d2, 0xe2d9c4];              // near-white underside
  var FIN    = [0x8e8265, 0x847858];
  var FIN_ED = [0xd6cbb0, 0xe0d7bf];
  var FIN_SP = [0x5a4f3b];                        // the dark blotch on the first dorsal
  var DISC   = [0xd9cfb6, 0xcdc2a6];              // the pelvic sucker, paler than the belly
  var EYE    = [0x14110d, 0x0d0b08];
  var EYELID = [0xa89a78];

  /* ---------- where the markings sit, as distance BACK FROM THE NOSE ----------
     Four saddles and a tail-root spot. Real sand gobies carry five or
     six blotches in a row and the last one, at the base of the caudal,
     is darker and rounder than the rest — it is the field mark, so it
     gets its own entry rather than being the fifth saddle. */
  var SADDLES = [0.32, 0.46, 0.60, 0.74];
  var SAD_HALF = 0.038;
  var TAIL_SPOT = 0.905, SPOT_HALF = 0.040;
  var CHEEK = 0.24;                               // forward of this is head, and gets the flecks

  function nose(t) { return 1 - t; }

  /* ---------- the body ----------
     A cylinder that is deepest at the shoulder and blunt at both ends:
     a goby is built to sit on sand, not to cut through water. Rounder
     in section than the anemonefish (which is a plate) and slimmer
     than the mudskipper (which is a tube with a head on it).

     RINGS ARE FOR THE SADDLES, NOT THE SILHOUETTE — §39, in colour.
     `colorize` is per-triangle so the narrowest band this can draw is
     one ring step. At 56 rings the step is 0.018, comfortably under a
     0.076-wide saddle. Geometry is built once and instanced, so the
     extra rings cost nothing per frame. Jitter is turned down for the
     same reason: it shuffles a ring along the sweep, which smears
     whatever marking that ring happens to carry. */
  function body() {
    var pos = sweep({
      len: 1.0, rad: 0.105, seg: 10, rings: 56, round: 2.2,
      aspectY: 1.0, aspectZ: 0.86, jitter: 0.04, seed: 71, centred: true,
      /* Read RIGHT TO LEFT: t=1 is the nose. A narrow caudal wrist, a
         long even flank, the deepest point over the pectorals, then a
         broad blunt head that barely tapers — a goby's snout is a
         shovel, not a point. */
      profile: ramp([[0, 0.24], [0.10, 0.36], [0.30, 0.64], [0.55, 0.90],
                     [0.74, 1.0], [0.90, 0.97], [1, 0.64]]),
      // a shallow arch over the shoulder; the tail end sits level
      curveY: function (t) { return 0.014 * Math.sin(Math.PI * Math.min(1, (1 - t) * 1.35)); }
    });
    return geom(pos, colorize(pos, function (t, u, i) {
      var n = nose(t);
      if (u < 0.26) return pk(BELLY, i);                        // white underside
      if (Math.abs(n - TAIL_SPOT) < SPOT_HALF) return pk(SADDLE, i);
      /* The saddles sit on the BACK and fade out down the flank —
         a bar drawn to the belly reads as a barred reef fish, and a
         blotch that stops two-thirds of the way down reads as a bottom
         fish lying in dappled light, which is what this is. */
      if (u > 0.44) {
        for (var s = 0; s < SADDLES.length; s++) {
          if (Math.abs(n - SADDLES[s]) < SAD_HALF * (0.6 + 0.4 * u)) return pk(SADDLE, i);
        }
      }
      if (n < CHEEK && hash(i, 19, 5) > 0.82) return pk(SPECK, i);   // blue cheek flecks
      if (u > 0.68) return pk(BACK, i);
      return pk(FLANK, i);
    }));
  }

  /* The eye. High on the head and set wide — a bottom fish watching
     the water above it — but NOT the mudskipper's periscope dome on
     the midline. Smaller, flatter, and the behaviour file puts it out
     on the side of the skull rather than on top of it. */
  function eye() {
    var pos = sweep({
      len: 0.070, rad: 0.040, seg: 7, rings: 4, round: 2.0,
      jitter: 0.05, seed: 83, centred: true,
      profile: ramp([[0, 0.60], [0.5, 1.0], [1, 0.66]])
    });
    return geom(pos, colorize(pos, function (t, u, i) {
      return (t < 0.22 || t > 0.84) ? pk([EYELID[0]], i) : pk(EYE, i);
    }));
  }

  /* THE PELVIC DISC — the goby, in one part.

     Two pelvic fins fused into a shallow oval cup under the chest. It
     is built as a heavily squashed `sweep` rather than a blade because
     it is a CUP, not a sheet, and because a solid can be dropped in
     with plain `putCentred` — `put()` cannot roll a flat part into a
     horizontal plane (§32) and there is no reason to make it try. */
  function pelvicDisc() {
    var pos = sweep({
      len: 0.215, rad: 0.088, seg: 10, rings: 5, round: 2.0,
      aspectY: 0.16, aspectZ: 1.0, jitter: 0.05, seed: 89, centred: true,
      profile: ramp([[0, 0.42], [0.35, 0.94], [0.65, 1.0], [1, 0.50]])
    });
    return geom(pos, colorize(pos, function (t, u, i) {
      return u > 0.55 ? pk(BELLY, i) : pk(DISC, i);
    }));
  }

  /* Caudal fin — a broad rounded paddle, the same shape the mudskipper
     carries because both animals scull with it. */
  function tailFin() {
    var pos = blade({
      len: 0.25, half: 0.135, thick: 0.012, steps: 6, jitter: 0.10, seed: 97,
      outline: ramp([[0, 0.30], [0.40, 0.86], [0.80, 1.0], [1, 0.92]])
    });
    return geom(pos, colorize(pos, function (t, u, i) {
      return t > 0.70 ? pk(FIN_ED, i) : pk(FIN, i);
    }));
  }

  /* First dorsal — six spines in a low triangle with a dark blotch at
     the back of it. Nothing like the mudskipper's square sail: this one
     is a little flag, and it is folded flat most of the time. */
  function dorsalOne() {
    var pos = blade({
      len: 1.0, half: 0.5, thick: 0.010, steps: 5, jitter: 0.09, seed: 101,
      outline: ramp([[0, 0.30], [0.35, 1.0], [0.70, 0.82], [1, 0.30]])
    });
    return geom(pos, colorize(pos, function (t, u, i) {
      if (t > 0.55 && u > 0.62) return pk([FIN_SP], i);        // the spot on the spiny dorsal
      return u > 0.72 ? pk(FIN_ED, i) : pk(FIN, i);
    }));
  }

  /* Second dorsal — long and low, running most of the way to the tail
     wrist. Its partner below is the anal fin, same shape, shorter. */
  function dorsalTwo() {
    var pos = blade({
      len: 1.0, half: 0.5, thick: 0.009, steps: 6, jitter: 0.08, seed: 103,
      outline: ramp([[0, 0.42], [0.35, 0.95], [0.80, 0.90], [1, 0.44]])
    });
    return geom(pos, colorize(pos, function (t, u, i) {
      return u > 0.70 ? pk(FIN_ED, i) : pk(FIN, i);
    }));
  }

  function analFin() {
    var pos = blade({
      len: 1.0, half: 0.5, thick: 0.009, steps: 6, jitter: 0.08, seed: 107,
      outline: ramp([[0, 0.38], [0.40, 0.92], [0.82, 0.84], [1, 0.40]])
    });
    return geom(pos, colorize(pos, function (t, u, i) {
      return u < 0.30 ? pk(FIN_ED, i) : pk(FIN, i);
    }));
  }

  /* Pectoral fin — a broad rounded FAN, and a `blade` rather than the
     mudskipper's solid `sweep`. This fin does not carry the animal; it
     rows it and it brakes it, and a goby holding station on the bottom
     is fanning them like a pair of hands. */
  function pectoralFin() {
    var pos = blade({
      len: 1.0, half: 0.5, thick: 0.010, steps: 6, jitter: 0.11, seed: 109,
      outline: ramp([[0, 0.38], [0.30, 0.88], [0.62, 1.0], [1, 0.72]])
    });
    return geom(pos, colorize(pos, function (t, u, i) {
      return t > 0.66 ? pk(FIN_ED, i) : pk(FIN, i);
    }));
  }

  var cache = null;
  function parts() {
    if (cache) return cache;
    cache = {
      body: body(),
      eye: eye(),
      pelvicDisc: pelvicDisc(),
      tailFin: tailFin(),
      dorsalOne: dorsalOne(),
      dorsalTwo: dorsalTwo(),
      analFin: analFin(),
      pectoralFin: pectoralFin()
    };
    return cache;
  }

  window.GobyBody = { parts: parts, material: Facet.material };
})();
