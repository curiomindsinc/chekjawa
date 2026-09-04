/* ============================================================
   anemonefishbody.js — the false clown anemonefish's parts.

   Same kit as everything else (facet.js), same two conventions: BODY
   UNITS with body length = 1.0, and fins root-at-origin along +X so
   the behaviour file places one by pointing +X where it should lie.
   +X is the HEAD, as it is on the mudskipper.

   THIS IS THE FIRST ANIMAL ON THE SHORE WHOSE COLOUR IS THE SPECIES.
   Every organism here so far is coloured to disappear: wet mud, wet
   sand, weathered shell, the pale grey of a bird against a bright
   sky. An anemonefish is the opposite argument — it is bright orange
   with three white bars on a shore where nothing else is, and it can
   afford to be, because it never leaves a stinging carpet that
   nothing can follow it into. So the bars are not decoration to be
   approximated, they are the animal, and they are built the way the
   fiddler's claw was: as the thing you check first.

   THREE BARS, AND THE MIDDLE ONE IS NOT A STRIPE. A real Amphiprion
   ocellaris carries a head bar behind the eye, a caudal bar on the
   tail wrist, and a middle bar with a broad WEDGE pointing forward
   along the flank — the middle bar bulges headward at mid-height and
   narrows top and bottom. Drawn as three parallel stripes the fish
   reads as a generic reef fish; drawn with the wedge it reads as this
   one. `Facet.colorize` hands a triangle both its position ALONG the
   body and its height UP it, which is exactly the two numbers the
   wedge needs, so this needs no hand-rolled geometry at all — unlike
   its host next door (anemonebody.js).

   Every bar is edged in black on both sides, and so is every fin. The
   black is what makes the orange and the white sit apart at any
   distance; without it the fish is a smear.

   The body is DEEP and laterally flat: a damselfish is a hand-sized
   plate, nothing like the cylinder a goby or a mudskipper is built
   on. aspectZ does that work in one number.
   ============================================================ */
(function () {
  'use strict';

  var hash = Facet.hash, ramp = Facet.ramp, pk = Facet.pick;
  var sweep = Facet.sweep, blade = Facet.blade;
  var colorize = Facet.colorize, geom = Facet.geom;

  /* ---------- palette ---------- */
  var ORANGE = [0xef7a22, 0xf2882f, 0xe36f19, 0xf7913c];
  var BELLY  = [0xf7a054, 0xf9ac66];            // paler underneath, as on every fish here
  var WHITE  = [0xf2eee1, 0xe9e3d2, 0xf7f4ea];
  var BLACK  = [0x1b1512, 0x241c17];
  var FIN    = [0xe8761f, 0xdf6d18];
  var EYE    = [0x14100d, 0x0c0908];
  var IRIS   = [0xc9631a];

  /* ---------- where the bars sit ----------
     MEASURED FROM THE NOSE, WHICH IS NOT WHERE `t` STARTS. `sweep`
     runs x from 0 to `len` along +X and `centred` only shifts that
     window, so t=0 is the −X end — and every species on this shore
     places its HEAD at +X (the eye and the tail fin in the behaviour
     file are what actually decide which end is which). So sweep t
     counts up from the TAIL, and `nose()` below is the conversion.

     It cost a render to find. The first pass wrote these three numbers
     as nose-distances, fed them straight to `colorize`, and got a fish
     with its head bar on its tail wrist — invisible in code, obvious
     the moment a broadside came back. A blunt cylinder like the
     mudskipper's hides the same mistake completely; a barred fish
     cannot hide it at all, which is the only reason it showed up here
     and not eighteen species ago.

     B1 clears the eye, which anemonefish.js puts 0.175 back from the
     nose — the bar plus its black edging starts at 0.216, so the eye
     sits in clean orange ahead of it. Move the eye and this moves. */
  var B1 = 0.280, B2 = 0.545, B3 = 0.830;       // bar centres, distance BACK FROM THE NOSE
  var HALF1 = 0.042, HALF2 = 0.050, HALF3 = 0.033;
  var EDGE = 0.022;                             // the black margin either side of a bar
  var WEDGE = 0.090;                            // how far the middle bar reaches forward at mid-height

  function nose(t) { return 1 - t; }

  /* 0 = plain flank, 1 = white bar, 2 = black edging. `n` is distance
     back from the nose; `u` is height up the body, 0 belly .. 1 back. */
  function barAt(n, u) {
    /* The middle bar's centre slides HEADWARD at mid-height and back
       toward vertical at the top and bottom edges — that slide is the
       wedge, and it is one line. */
    var mid = B2 - WEDGE * (1 - Math.abs(u - 0.5) * 2);
    var d1 = Math.abs(n - B1), d2 = Math.abs(n - mid), d3 = Math.abs(n - B3);
    if (d1 < HALF1 || d2 < HALF2 || d3 < HALF3) return 1;
    if (d1 < HALF1 + EDGE || d2 < HALF2 + EDGE || d3 < HALF3 + EDGE) return 2;
    return 0;
  }

  /* ---------- the body ----------
     Deep and thin: a plate on edge, half as deep as it is long, which
     is what a damselfish actually is. The first pass used the
     mudskipper's numbers (rad 0.125, 9 rings) and came back a torpedo.

     RINGS ARE NOT ABOUT THE SHAPE HERE, THEY ARE ABOUT THE BARS. The
     silhouette is smooth enough at nine rings; the bars are not.
     `colorize` is per-TRIANGLE, so the finest band this body can draw
     is one ring step wide — at 9 rings that is 0.11 of the body and
     the 0.03 black edging fell between neighbouring triangles and came
     back as a CHECKERBOARD. 72 rings puts the step at 0.014, comfortably
     under the 0.022 edging and a sixth of a white bar. Geometry is
     built once and instanced, so the extra rings cost nothing per
     frame — §38's lesson, in colour instead of in outline.

     Jitter is turned down for the same reason: it shuffles a ring
     along the sweep, which smears the bar it happens to carry. */
  function body() {
    var pos = sweep({
      len: 1.0, rad: 0.270, seg: 12, rings: 72, round: 2.3,
      aspectY: 1.0, aspectZ: 0.40, jitter: 0.03, seed: 61, centred: true,
      /* Read this RIGHT TO LEFT: t=1 is the nose. Narrow wrist at t=0,
         swelling through the belly, deepest at the shoulder, then a
         short blunt taper into the snout. */
      profile: ramp([[0, 0.16], [0.10, 0.24], [0.22, 0.42], [0.40, 0.80],
                     [0.58, 0.98], [0.78, 1.0], [0.91, 0.86], [0.97, 0.66], [1, 0.34]]),
      // the back arches over the shoulder; the head end sits a shade low
      curveY: function (t) { return 0.020 * Math.sin(Math.PI * Math.min(1, (1 - t) * 1.25)); }
    });
    return geom(pos, colorize(pos, function (t, u, i) {
      var n = nose(t);
      if (n < 0.055) return pk(ORANGE, i);      // the snout stays orange
      var b = barAt(n, u);
      if (b === 2) return pk(BLACK, i);
      if (b === 1) return pk(WHITE, i);
      if (u < 0.22) return pk(BELLY, i);
      return pk(ORANGE, i);
    }));
  }

  /* The eye — big, the way every damselfish's is, and set well
     forward. Built centred so the behaviour file drops it on the head. */
  function eye() {
    var pos = sweep({
      len: 0.055, rad: 0.048, seg: 8, rings: 4, round: 2.0,
      jitter: 0.04, seed: 67, centred: true,
      profile: ramp([[0, 0.60], [0.5, 1.0], [1, 0.62]])
    });
    return geom(pos, colorize(pos, function (t, u, i) {
      return (t < 0.22 || t > 0.82) ? pk([IRIS[0]], i) : pk(EYE, i);
    }));
  }

  /* Caudal fin — rounded, not forked. An anemonefish is a hoverer, not
     a runner, and a forked tail on one reads as a completely different
     animal. Pale, with a black trailing margin. */
  function tailFin() {
    var pos = blade({
      len: 0.26, half: 0.17, thick: 0.012, steps: 6, jitter: 0.10, seed: 71,
      outline: ramp([[0, 0.34], [0.45, 0.86], [0.8, 1.0], [1, 0.94]])
    });
    return geom(pos, colorize(pos, function (t, u, i) {
      if (t > 0.86 || u > 0.92 || u < 0.08) return pk(BLACK, i);
      return t > 0.45 ? pk(WHITE, i) : pk(FIN, i);
    }));
  }

  /* Dorsal — one continuous fin with a NOTCH in it, where the spiny
     front half meets the soft rear half. The notch is the difference
     between a damselfish's dorsal and a smooth sail. */
  function dorsalFin() {
    var pos = blade({
      /* Written TAIL-FIRST, because a blade's t=0 is its root and
         anemonefish.js roots this one at the back of the fish and
         points it forward. The tall spiny half belongs at t≈0.8, over
         the shoulder — the same +X-is-the-head bookkeeping the body's
         profile needs, one part along. */
      len: 1.0, half: 0.5, thick: 0.011, steps: 9, jitter: 0.07, seed: 73,
      outline: ramp([[0, 0.34], [0.14, 0.88], [0.38, 0.98], [0.50, 0.62],
                     [0.60, 0.86], [0.84, 0.98], [1, 0.40]]),
      /* AND THE ROOT IS NOT A STRAIGHT LINE. A fin sits ON a back, and
         this back drops from the shoulder to the tail wrist by more
         than half the fin's own height — placed on a level root the
         first pass left the tail end of the dorsal floating clear of
         the fish, which read as a lump of orange hovering over it.
         `sweepY` bends the whole blade down to follow the body, which
         is what it is for, and it costs one line instead of splitting
         the fin into two parts. */
      sweepY: function (t) { return -0.53 * Math.pow(1 - t, 1.4); }
    });
    return geom(pos, colorize(pos, function (t, u, i) {
      return u > 0.78 ? pk(BLACK, i) : pk(FIN, i);
    }));
  }

  /* Anal fin — the dorsal's shorter mirror under the back half. */
  function analFin() {
    var pos = blade({
      len: 1.0, half: 0.5, thick: 0.010, steps: 6, jitter: 0.08, seed: 79,
      outline: ramp([[0, 0.34], [0.30, 0.96], [0.72, 0.88], [1, 0.36]]),
      // the belly deepens headward, so the root falls the other way
      sweepY: function (t) { return -0.40 * t * t; }
    });
    return geom(pos, colorize(pos, function (t, u, i) {
      return u > 0.78 ? pk(BLACK, i) : pk(FIN, i);
    }));
  }

  /* Pectoral — a broad rounded paddle, and on this fish it is the
     ENGINE. An anemonefish swims on its pectorals almost all the time,
     rowing them alternately and holding station; the tail is for
     bolting. So it is built big enough to see rowing. */
  function pectoralFin() {
    var pos = blade({
      len: 1.0, half: 0.42, thick: 0.009, steps: 6, jitter: 0.10, seed: 83,
      outline: ramp([[0, 0.42], [0.4, 0.94], [0.78, 1.0], [1, 0.72]])
    });
    return geom(pos, colorize(pos, function (t, u, i) {
      return t > 0.88 ? pk(BLACK, i) : (hash(i, 5, 3) > 0.93 ? pk(WHITE, i) : pk(FIN, i));
    }));
  }

  /* Pelvic — small, hanging under the chest, and almost solid black on
     a real ocellaris. It is a tiny part that does a lot: the black
     pelvics are what break up the orange underside. */
  function pelvicFin() {
    var pos = blade({
      len: 1.0, half: 0.34, thick: 0.008, steps: 5, jitter: 0.10, seed: 89,
      outline: ramp([[0, 0.44], [0.45, 0.96], [1, 0.60]])
    });
    return geom(pos, colorize(pos, function (t, u, i) {
      return t < 0.20 ? pk(FIN, i) : pk(BLACK, i);
    }));
  }

  var cache = null;
  function parts() {
    if (cache) return cache;
    cache = {
      body: body(),
      eye: eye(),
      tailFin: tailFin(),
      dorsalFin: dorsalFin(),
      analFin: analFin(),
      pectoralFin: pectoralFin(),
      pelvicFin: pelvicFin()
    };
    return cache;
  }

  window.AnemoneFishBody = { parts: parts, material: Facet.material };
})();
