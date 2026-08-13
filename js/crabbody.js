/* ============================================================
   crabbody.js — the fiddler crab's body parts.

   Shape only. The faceted style, the sweep/blade builders and the
   shared material all live in facet.js, which every organism on this
   shore is built from; this file just says what a fiddler crab is
   shaped like and what colour it is.

   The reference renders in reference/ are blocky voxel models. The
   anatomy and the palette are taken from them; the style deliberately
   is not — a Minecraft crab standing on this faceted shore would read
   as a different game.

   Parts are in BODY UNITS with carapace width = 1.0, and limb parts
   are root-at-origin along +X. See facet.js for what those two
   conventions buy.
   ============================================================ */
(function () {
  'use strict';

  /* The faceted kit every organism on this shore shares. Lifted out of
     this file when the second species arrived — see facet.js. */
  var TAU = Facet.TAU;
  var hash = Facet.hash, ramp = Facet.ramp, pk = Facet.pick;
  var sweep = Facet.sweep, colorize = Facet.colorize, geom = Facet.geom;

  /* ------------------------------------------------------------
     Palette, read off the reference renders.
     ------------------------------------------------------------ */
  var SHELL_TOP  = [0x3f5cab, 0x364f9c, 0x4868b6, 0x2f4790];   // blue carapace
  var SHELL_SIDE = [0x5a7ec4, 0x4d6cb4];                       // catching the sky
  var SHELL_LOW  = [0xdfe4ec, 0xc9d1de];                       // pale underside
  var CLAW_MAIN  = [0xf08b31, 0xe57e26, 0xf59a45];             // orange cheliped
  var CLAW_DARK  = [0xc96a1c, 0xb75e17];                       // shaded palm
  var CLAW_TIP   = [0xffcf94, 0xffdfae];                       // bleached fingertips
  var LEG_MAIN   = [0xe0873f, 0xd07a34, 0xea9550];
  var LEG_DARK   = [0xa85f27];
  var STALK      = [0x2a3350, 0x333d5e];
  var EYE_BLACK  = [0x14161c, 0x0e1015];
  var MUD_SKIRT  = [0x7b6647, 0x87714f, 0x715c3f];   // spoil spread on the flat
  var MUD_LIP    = [0x8b7a5c, 0x958468, 0x7f6f52];   // rim, dried pale in the sun
  var MUD_DARK   = [0x1d160e, 0x140f09];             // down the throat
  var PELLET     = [0x8a7350, 0x967e59];


  /* ------------------------------------------------------------
     The parts.
     ------------------------------------------------------------ */
  function carapace() {
    var pos = sweep({
      len: 1.0, rad: 0.37, seg: 9, rings: 6, round: 3.3,
      aspectY: 0.54, aspectZ: 1.0, jitter: 0.13, seed: 3, centred: true,
      profile: ramp([[0, 0.50], [0.15, 0.94], [0.5, 1.0], [0.85, 0.92], [1, 0.48]])
    });
    /* Blue over pale, with the join between them a little ragged so it
       reads as an animal rather than as two painted halves. */
    return geom(pos, colorize(pos, function (t, u, i) {
      var edge = 0.42 + (hash(i, 5, 9) - 0.5) * 0.12;
      if (u < edge) return pk(SHELL_LOW, i);
      if (u < edge + 0.16) return pk(SHELL_SIDE, i);
      return pk(SHELL_TOP, i);
    }));
  }

  function eyestalk() {
    var pos = sweep({
      len: 1.0, rad: 0.062, seg: 6, rings: 3, round: 2.4, jitter: 0.10, seed: 11,
      profile: ramp([[0, 1.0], [0.7, 0.82], [1, 0.72]])
    });
    return geom(pos, colorize(pos, function (t, u, i) { return pk(STALK, i); }));
  }

  function eye() {
    var pos = sweep({
      len: 0.20, rad: 0.10, seg: 7, rings: 3, round: 2.5,
      jitter: 0.08, seed: 17, centred: true
    });
    return geom(pos, colorize(pos, function (t, u, i) { return pk(EYE_BLACK, i); }));
  }

  /* Merus / carpus — the short segments between shoulder and palm. Unit
     length: crabs.js scales X to whichever segment it is being used as. */
  function armSeg() {
    var pos = sweep({
      len: 1.0, rad: 0.115, seg: 7, rings: 4, round: 2.7, jitter: 0.14, seed: 23,
      profile: ramp([[0, 1.0], [0.5, 0.88], [1, 0.78]])
    });
    return geom(pos, colorize(pos, function (t, u, i) {
      return u < 0.34 ? pk(CLAW_DARK, i) : pk(CLAW_MAIN, i);
    }));
  }

  /* The palm of the major cheliped — the whole reason this animal is
     worth drawing. Flattened side to side (aspectZ), deep top to
     bottom, and nearly as long as the carapace is wide. */
  function clawPalm() {
    var pos = sweep({
      len: 1.0, rad: 0.31, seg: 8, rings: 6, round: 2.7,
      aspectY: 1.0, aspectZ: 0.46, jitter: 0.12, seed: 29,
      profile: ramp([[0, 0.52], [0.22, 0.96], [0.55, 1.0], [0.82, 0.82], [1, 0.60]])
    });
    return geom(pos, colorize(pos, function (t, u, i) {
      if (u < 0.30) return pk(CLAW_DARK, i);
      if (t > 0.80 && u > 0.55) return pk(CLAW_TIP, i);
      return pk(CLAW_MAIN, i);
    }));
  }

  /* The two fingers. They curve TOWARD each other so a closed claw
     leaves the pinched gap the reference shows, instead of meeting
     flush like a pair of chopsticks. */
  function finger(dir, seed) {
    var pos = sweep({
      len: 1.0, rad: 0.115, seg: 7, rings: 5, round: 2.5, aspectZ: 0.62,
      jitter: 0.10, seed: seed,
      profile: ramp([[0, 1.0], [0.35, 0.86], [0.7, 0.58], [1, 0.16]]),
      curveY: function (t) { return dir * 0.11 * t * t; }
    });
    return geom(pos, colorize(pos, function (t, u, i) {
      return t > 0.62 ? pk(CLAW_TIP, i) : pk(CLAW_MAIN, i);
    }));
  }

  function legSeg() {
    var pos = sweep({
      len: 1.0, rad: 0.072, seg: 6, rings: 4, round: 2.6, jitter: 0.13, seed: 41,
      profile: ramp([[0, 1.0], [0.5, 0.84], [1, 0.66]]),
      curveY: function (t) { return -0.035 * t * t; }
    });
    return geom(pos, colorize(pos, function (t, u, i) {
      return u < 0.32 ? pk(LEG_DARK, i) : pk(LEG_MAIN, i);
    }));
  }

  /* The dactyl the crab actually stands on: tapers to a point, and is
     the only part of the animal that touches the sand. */
  function legTip() {
    var pos = sweep({
      len: 1.0, rad: 0.058, seg: 6, rings: 4, round: 2.3, jitter: 0.12, seed: 47,
      profile: ramp([[0, 1.0], [0.45, 0.70], [1, 0.14]])
    });
    return geom(pos, colorize(pos, function (t, u, i) {
      return t > 0.7 ? pk(LEG_DARK, i) : pk(LEG_MAIN, i);
    }));
  }

  /* ------------------------------------------------------------
     The burrow: a mud turret with a dark mouth in the top. Built as
     explicit rings rather than through sweep(), because it is the one
     part that is a hole rather than a solid.

     IT ALL SITS ABOVE THE SAND, and that is not a stylistic choice.
     The terrain is one closed surface with no hole cut in it, so a
     shaft sunk below y=0 is simply hidden by the ground drawn across
     its mouth — the first version of this did exactly that and read as
     a dark crescent scratched on the mud. A real fiddler stacks the
     excavated sediment into a chimney around the entrance anyway, so
     the fix and the biology agree: raise the whole thing, keep the
     throat above ground, and let the dark interior do the work.

     Sized in body units like everything else, so it scales with S.
     ------------------------------------------------------------ */
  function burrow() {
    var SEG = 9;
    /* Each band carries its own colour. Height cannot decide it here the
       way it does on a limb: the throat and the outer skirt are at
       almost the SAME height on a turret, so a height ramp paints the
       skirt with the throat's shadow and the hole disappears into the
       mud it is dug in. Radius is what separates them, so the rings say
       outright which tone they are. */
    var spec = [
      { r: 0.88, y: 0.000, c: MUD_SKIRT },   // spoil spread out on the sand
      { r: 0.66, y: 0.225, c: MUD_LIP },     // heaped rim, dried pale in the sun
      { r: 0.48, y: 0.190, c: MUD_LIP },     // inner lip, turning down
      { r: 0.34, y: 0.090, c: MUD_DARK },
      { r: 0.19, y: 0.020, c: MUD_DARK }     // throat, in its own shadow
    ];
    var pos = [], col = [], i, k;
    var cc = new THREE.Color();
    function ring(rec, wob) {
      var out = [];
      for (var q = 0; q < SEG; q++) {
        var th = q / SEG * TAU;
        var j = 1 + (hash(q, wob, 5) - 0.5) * 0.22;
        out.push([
          Math.cos(th) * rec.r * j,
          rec.y + (hash(q, wob, 8) - 0.5) * 0.03,
          Math.sin(th) * rec.r * j
        ]);
      }
      return out;
    }
    var built = [];
    for (k = 0; k < spec.length; k++) built.push(ring(spec[k], k));

    var band = 0;
    function tri(a, b, c) {
      pos.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
      cc.setHex(pk(spec[band].c, pos.length + band));
      for (var q = 0; q < 3; q++) col.push(cc.r, cc.g, cc.b);
    }
    for (k = 0; k < built.length - 1; k++) {
      band = k + 1;                       // the tone of the ring being walked toward
      for (i = 0; i < SEG; i++) {
        var i2 = (i + 1) % SEG;
        /* Wound so these faces point UP and OUT. Get this backwards and
           the whole turret is quietly deleted by back-face culling —
           the material is FrontSide, so a ring wound the wrong way does
           not render dark, it does not render at all, and all that is
           left on the mud is the one sliver that happened to face the
           right way. Which reads as a scratch, not as a hole. */
        tri(built[k][i], built[k + 1][i2], built[k][i2]);
        tri(built[k][i], built[k + 1][i], built[k + 1][i2]);
      }
    }
    band = spec.length - 1;
    var floor = built[built.length - 1];
    for (i = 0; i < SEG; i++) {
      tri([0, 0.0, 0], floor[(i + 1) % SEG], floor[i]);
    }
    return geom(pos, new Float32Array(col));
  }

  /* Feeding pellets — the little balls of sifted sediment a deposit
     feeder leaves scattered around its hole. Set dressing, but it is
     the detail that says "something lives here" while the crab itself
     is down the burrow, which is most of the tide. */
  function pellet() {
    var pos = sweep({
      len: 0.10, rad: 0.048, seg: 6, rings: 3, round: 2.8,
      jitter: 0.45, seed: 53, centred: true
    });
    return geom(pos, colorize(pos, function (t, u, i) { return pk(PELLET, i); }));
  }

  /* ------------------------------------------------------------
     Cache. Built once, shared by every crab on the shore.
     ------------------------------------------------------------ */
  var cache = null;
  function parts() {
    if (cache) return cache;
    cache = {
      carapace: carapace(),
      eyestalk: eyestalk(),
      eye: eye(),
      armSeg: armSeg(),
      clawPalm: clawPalm(),
      clawUpper: finger(-1, 31),   // dactyl, hooks down
      clawLower: finger(1, 37),    // pollex, hooks up to meet it
      legSeg: legSeg(),
      legTip: legTip(),
      burrow: burrow(),
      pellet: pellet()
    };
    return cache;
  }

  window.CrabBody = { parts: parts, material: Facet.material };
})();
