/* ============================================================
   hermitbody.js — the hermit crab's one original part: the shell.

   Everything else this animal is made of comes from crabbody.js.
   That is the point of it. A hermit crab IS a crab wearing a dead
   snail's house, so the cheapest honest way to build one is to take
   the fiddler's limb kit — legSeg, legTip, armSeg, clawPalm, the two
   fingers, eyestalk, eye — and give it something to carry. The
   fiddler's limbs are already the orange of a hermit crab's; the
   only thing that had to be drawn from scratch is the shell.

   THE SHELL IS THE SPECIES. Not decoration: it is what the behaviour
   file is about (hermitcrabs.js), it is what one crab fights another
   for, and it is the only part of this animal that changes over its
   life. So it gets the detail budget.

   A BORROWED SHELL IS NOT A LIVE ONE. Compare conchbody.js: that
   shell is polished cream with brown flames, because a dog conch is
   alive inside it and keeps it clean. This one has been lying on the
   flat since its owner died — chalky, worn at the spire, and patched
   with the same algal film everything else here grazes. Drawing it
   with the conch's palette made the hermit crab read as a conch with
   legs, which is very nearly the opposite of the animal.

   Body units: SHELL LENGTH = 1.0, and +X is the animal's forward
   axis, as on the conch. The shell is built `centred`, so the
   behaviour file hangs it off the crab's back at the aperture end.
   ============================================================ */
(function () {
  'use strict';

  var hash = Facet.hash, ramp = Facet.ramp, pk = Facet.pick;
  var sweep = Facet.sweep;
  var colorize = Facet.colorize, geom = Facet.geom;

  /* ---------- palette ---------- */
  var WORN  = [0xc0b49a, 0xb4a88e, 0xcabea4];    // chalky, sun-bleached shell
  var BAND  = [0x8a7454, 0x7b6749, 0x977f5d];    // what is left of the whorl banding
  var APEX  = [0x9d907c, 0x8e8271];              // the spire, rubbed down on the sand
  var ALGAE = [0x6f7a4e, 0x7d8756];              // film growing on a shell nobody cleans
  var MOUTH = [0x3d342a, 0x312921];              // the aperture, in its own shadow
  var LIP   = [0xd8cdb5];                        // the worn rim around it

  var SEG = 9;
  var WHORLS = 5;

  /* ---------- the shell ----------
     A coiled cone. sweep() runs one tube along +X and cannot make a
     real multi-turn spiral, so the coil is faked the only way that
     survives at this size: curveY and curveZ bend the tube while the
     profile steps it down to a point.

     THE FIRST PASS READ AS A BANANA, and it is worth saying why. The
     taper was even and the bend was strong, which is a horn, not a
     shell. Two things fix it: the body whorl has to be FAT and take up
     the first third on its own, and the taper has to happen in visible
     STEPS — the whorl staircase hornsnailbody.js uses, five turns
     instead of nine. Bend less, step more.

     The aperture (t = 0) is the fat end, and it is where the crab
     lives, so the first ring is dark — that hole is what makes the
     shell look occupied rather than solid. */
  function shellProfile(t) {
    /* The outline: a rounded aperture, a fat body whorl, then a cone.
       The aperture end has to ROUND IN rather than end square — a flat
       cap at full radius is a 20 cm black disc between the crab and its
       shell, which is what the second screenshot showed. */
    var base;
    if (t < 0.07) base = 0.52 + (t / 0.07) * 0.46;
    else if (t < 0.32) base = 0.98 + 0.02 * Math.sin((t - 0.07) / 0.25 * Math.PI);
    else base = Math.pow(1 - (t - 0.32) / 0.68, 0.85);
    var w = t * WHORLS, inW = w - Math.floor(w);
    var step = 0.90 + 0.10 * Math.sin(inW * Math.PI);       // the suture pinches
    return Math.max(0.04, base * step);
  }

  function shell() {
    var pos = sweep({
      len: 1.0, rad: 0.36, seg: SEG, rings: 20, round: 2.3,
      aspectY: 0.95, aspectZ: 0.90, jitter: 0.07, seed: 211, centred: true,
      profile: shellProfile,
      curveY: function (t) { return 0.11 * Math.sin(t * Math.PI * 0.85); },
      curveZ: function (t) { return 0.07 * (1 - Math.cos(t * Math.PI * 0.9)); }
    });
    return geom(pos, colorize(pos, function (t, u, i) {
      if (t < 0.035) return pk(MOUTH, i);                  // down the aperture
      if (t < 0.09) return LIP[0];                         // the worn rim of it
      if (t > 0.90) return pk(APEX, i);                    // spire, rubbed bare
      if (hash(i, 19, 6) > 0.88) return pk(ALGAE, i);      // patches of film
      // the suture line at each whorl, in its own shadow
      var w = t * WHORLS, inW = w - Math.floor(w);
      if (inW < 0.12 || inW > 0.92) return pk(BAND, i);
      /* And spiral banding off the sweep's own vertex ordering, the
         nerite's trick (neritebody.js): two triangles per angular
         segment, so floor(i/2) % SEG recovers which band a facet is in.
         Broken up rather than clean — this shell has been worn. */
      var band = Math.floor(i / 2) % SEG;
      var dark = (band % 4 === 0) && hash(i, 5, 2) > 0.25;
      return dark ? pk(BAND, i) : pk(WORN, i);
    }));
  }

  var cache = null;
  function parts() {
    if (cache) return cache;
    cache = { shell: shell() };
    return cache;
  }

  window.HermitBody = { parts: parts, material: Facet.material };
})();
