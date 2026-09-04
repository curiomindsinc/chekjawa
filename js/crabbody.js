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
  /* From reference/crabclaw.jpg — see the note above clawPalm(). */
  var CLAW_HOT   = [0xff8c22, 0xf87a14];                       // the flush where palm meets fingers
  var CLAW_DOT   = [0xa84d16, 0xbb5a1d];                       // the stipple of dark papillae
  var FING_DARK  = [0x2c2522, 0x362d29, 0x231d1a];             // horn-black fingers
  var FING_DTIP  = [0x14100e];                                 // and their worn points
  var TOOTH      = [0xf3e6cf];                                 // pale cusps along the gape
  var TOOTH_DARK = [0x6f6058];

  /* How slim each species draws a finger: its LENGTH over its THICKNESS
     at the size that species uses. finger() needs it to size the hook —
     see the note there. THESE MUST TRACK THE TWO CALL SITES:
       crabs.js        MAJOR.finger 0.40, thick sc      -> 0.40
       hermitcrabs.js  ARM.finger   0.21, thick sc      -> 0.21
     If either changes and this does not, the hook quietly rescales and
     the claw stops closing. */
  var FIDDLER_SLIM = 0.40;
  var HERMIT_SLIM  = 0.21;

  /* How much each finger hooks, as a fraction of its own drawn length.
     They are NOT the same. The dactyl is the working finger and curves
     hard; the pollex is an outgrowth of the palm and is very nearly
     straight, with only a slight upward set at the tip. Drawing them
     with the same bend was most of why the pair read as a pair of
     tongs rather than as a claw. */
  var HOOK_DACTYL = 0.15;
  var HOOK_POLLEX = 0.05;

  /* ------------------------------------------------------------
     CLAW — the numbers a behaviour file needs to HANG the fingers.

     They live here rather than in crabs.js because they are properties
     of the geometry above: change a hook and the shut angle that makes
     the claw close changes with it. Both crab species read these, so
     there is one set of them and no chance of the two drifting apart.

     Every one is a fraction of the finger's DRAWN LENGTH, which is
     what makes them species-independent — see the `slim` note on
     finger(). The arithmetic, with lf = the drawn finger length:

       dactyl tip, unrotated   (ROOT - HOOK_DACTYL) * lf     = +0.040 lf
       pollex tip              (-ROOT + HOOK_POLLEX*0.84) lf = -0.148 lf
       gap between them                                        0.188 lf

     and the dactyl is lf long, so closing it needs sin(t) = 0.188,
     t = 0.19 rad. That is SHUT. Anything that changes ROOT or either
     hook has to move SHUT with it or the claw stops meeting.
     ------------------------------------------------------------ */
  var CLAW = {
    ROOT: 0.19,        // how far off the palm's axis each finger is hung
    POLLEX: 0.84,      // the fixed finger's length, against the dactyl's 1.0
    SHUT: 0.19,        // radians the dactyl is held DOWN when the claw is closed
    OPEN: 0.62         // radians it lifts per unit of `gape`
  };
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

  /* ------------------------------------------------------------
     THE CHELIPED, rebuilt against reference/crabclaw.jpg.

     The first version was a rectangular slab with two straight rods
     on the end of it, and a broadside made that unmistakable. The
     photograph shows four things the slab had none of, and all four
     are cheap:

       a teardrop palm   deepest a third of the way from the wrist,
                         tapering toward the finger hinge — not a
                         block of even depth
       hooked fingers    they curve hard toward each other and CROSS
                         near the tips. Straight fingers read as
                         chopsticks; the hook is what makes a claw
                         look like it could hold something
       a toothed gape    cusps along the inner edges, dying out toward
                         the points
       a stippled palm   dark papillae scattered over the orange

     The teeth are done by MODULATING THE PROFILE rather than by
     instancing little cusps the way the sea star's knobs are
     (seastarbody.js). Three cusps on a part carried twice per
     cheliped, twice per crab, across a hundred and fourteen crabs is
     over a thousand extra instances for a detail two pixels wide; a
     wobble in the profile costs four extra rings on one shared
     geometry. Same argument the barnacle's ribs are painted under.

     COLOUR IS PER SPECIES, ANATOMY IS SHARED. The photograph's
     fingers are horn-black, and that is right for the hermit crab,
     which gets `dactylDark` / `pollexDark`. It is NOT right for
     a fiddler: its major claw is a display organ, and reference/
     fiddler crab.png shows it orange with pale tips. So the fiddler
     keeps its own fingers and both species share the shape.
     ------------------------------------------------------------ */

  /* The palm of the major cheliped — the whole reason this animal is
     worth drawing. Flattened side to side (aspectZ), deep top to
     bottom, and nearly as long as the carapace is wide. */
  function clawPalm() {
    var pos = sweep({
      len: 1.0, rad: 0.33, seg: 9, rings: 7, round: 2.8,
      aspectY: 1.0, aspectZ: 0.44, jitter: 0.11, seed: 29,
      // teardrop: heavy at the heel, tapering to the finger hinge
      profile: ramp([[0, 0.46], [0.16, 0.94], [0.34, 1.0], [0.60, 0.90], [0.82, 0.72], [1, 0.54]]),
      // and the whole palm arcs, so the fingers set off at an angle to the wrist
      curveY: function (t) { return 0.085 * t * t; }
    });
    return geom(pos, colorize(pos, function (t, u, i) {
      if (u < 0.28) return pk(CLAW_DARK, i);
      // the hot flush just behind the fingers, the clearest mark on the reference
      if (t > 0.84) return pk(CLAW_HOT, i);
      if (hash(i, 23, 7) > 0.84) return pk(CLAW_DOT, i);     // stippled papillae
      if (t > 0.72 && u > 0.62) return pk(CLAW_TIP, i);
      return pk(CLAW_MAIN, i);
    }));
  }

  /* One finger. `dir` is which way it hooks: -1 is the DACTYL, which
     hangs high on the palm and curves DOWN onto the finger below it;
     +1 is the POLLEX, low on the palm and set slightly up. Either way
     the pair close on the pinched gap the reference shows instead of
     meeting flush.

     `HOOK` is that bend as a fraction of the finger's drawn length.

     `dark` swaps the palette to horn-black for the hermit crab.

     `slim` is the ratio the species draws this part at — its LENGTH
     divided by its THICKNESS — and it is not optional. facet.js's
     header warns that a curve is a fraction of the part's LENGTH while
     a fit-to-box pass would rescale it by THICKNESS; `curveY` has the
     same trap the other way round, because it is added straight to the
     ring's y and `put()` scales y by `thick`. So a hook written as a
     bare number is a fraction of the finger's WIDTH, not its length —
     which meant shortening the fingers made the hook silently half
     again as strong, and at rest the two sprang apart instead of
     closing. Pass the ratio, convert here, and HOOK below is what it
     says it is: a fraction of the drawn length. */
  function finger(dir, seed, dark, slim, HOOK) {
    /* Taper with cusps riding on it. The cusps fade out toward the
       point, because the business teeth of a claw are near the hinge
       where the leverage is — which is exactly what the photograph
       shows. */
    var taper = ramp([[0, 1.0], [0.32, 0.88], [0.62, 0.64], [0.86, 0.34], [1, 0.08]]);
    function profile(t) {
      var amp = 0.22 * (1 - t) * (1 - t);
      return taper(t) * (1 + amp * Math.abs(Math.sin(t * Math.PI * 3.1)) - amp * 0.45);
    }
    var pos = sweep({
      len: 1.0, rad: 0.145, seg: 7, rings: 10, round: 2.5, aspectZ: 0.72,
      jitter: 0.08, seed: seed,
      profile: profile,
      // enough hook to close the gap the rest split opens, and no more
      curveY: function (t) { return dir * HOOK * slim * Math.pow(t, 1.35); }
    });
    return geom(pos, colorize(pos, function (t, u, i) {
      /* Which side of the finger faces the gape depends on which way
         it hooks: the dactyl's biting edge is underneath it, the
         pollex's is on top. */
      var onGape = dir < 0 ? (u < 0.34) : (u > 0.66);
      if (t < 0.14) return pk(CLAW_HOT, i);                  // the flush carried over from the palm
      if (onGape && t < 0.74 && hash(i, 31, 4) > 0.45) {
        return dark ? pk(TOOTH_DARK, i) : pk(TOOTH, i);      // cusps, catching the light
      }
      if (dark) return t > 0.78 ? FING_DTIP[0] : pk(FING_DARK, i);
      return t > 0.66 ? pk(CLAW_TIP, i) : pk(CLAW_MAIN, i);
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
     feeder leaves scattered around its hole. No longer set dressing:
     since §28 each one is dropped where a crab finished a sift, so the
     scatter is the record of where the biofilm went.

     Sized off the real ratio. A fiddler's pellet is 2–4 mm against a
     25 mm carapace, about 1:8; these were built at 1:16 and read as
     grit specks at follow-cam range even with eight of them out. */
  function pellet() {
    var pos = sweep({
      len: 0.16, rad: 0.085, seg: 6, rings: 3, round: 2.8,
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
      /* NAMED BY ANATOMY, NOT BY WHERE THEY SIT. They were `clawUpper`
         and `clawLower` until the two swapped over, at which point the
         names were actively lying about the parts. The dactyl is the
         long movable finger and it now sweeps along UNDERNEATH; the
         pollex is the short fixed one riding on top. Each hooks toward
         the other, which is what `dir` is: +1 hooks up, -1 hooks down. */
      // the movable finger: long, hung high, hooking down onto the pollex
      dactyl: finger(-1, 31, false, FIDDLER_SLIM, HOOK_DACTYL),
      // the fixed one: shorter, hung low, near-straight, part of the palm
      pollex: finger(1, 37, false, FIDDLER_SLIM, HOOK_POLLEX),
      /* The same two shapes in horn-black, for the hermit crab. Two
         extra cached geometries and no per-instance cost — a different
         species just points its InstancedMesh at a different one, and
         it is also where the second `slim` ratio gets to live. */
      dactylDark: finger(-1, 31, true, HERMIT_SLIM, HOOK_DACTYL),
      pollexDark: finger(1, 37, true, HERMIT_SLIM, HOOK_POLLEX),
      legSeg: legSeg(),
      legTip: legTip(),
      burrow: burrow(),
      pellet: pellet()
    };
    return cache;
  }

  window.CrabBody = { parts: parts, material: Facet.material, CLAW: CLAW };
})();
