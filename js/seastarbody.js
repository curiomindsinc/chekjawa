/* ============================================================
   seastarbody.js — the knobbly sea star's parts.

   facet.js kit. Body units with the ARM SPAN = 1.0, so an arm runs
   0.5 from the centre out. Arms are root-at-origin along +X, like
   every other limb on this shore: the behaviour file points +X where
   the arm should lie and never has to know its shape.

   RADIAL, NOT BILATERAL. Everything before this had a front. A sea
   star does not — it has five arms at 72°, and no facing at all. So
   there is no `yaw` in the usual sense here; the whole animal simply
   sits at some rotation and creeps in whatever direction its tube feet
   are pulling.

   THE KNOBS ARE THE NAME. Protoreaster nodosus is "knobbly" because of
   the blunt dark tubercles ridged along its arms. They are separate
   instances rather than geometry baked into the arm, because a knob
   the behaviour file can place is a knob it can also scale, and a row
   of them along a bending arm is what stops the arm reading as a
   smooth cone.

   Colour is the Chek Jawa postcard: orange-red body, cream reticulated
   webbing between the knobs, dark red-brown tubercles.
   ============================================================ */
(function () {
  'use strict';

  var hash = Facet.hash, ramp = Facet.ramp, pk = Facet.pick;
  var sweep = Facet.sweep;
  var colorize = Facet.colorize, geom = Facet.geom;

  /* ---------- palette ---------- */
  var BODY  = [0xc85a33, 0xd06a3c, 0xb94f2c];    // orange-red
  var NET   = [0xe6d3ae, 0xdcc79f];              // the pale reticulated webbing
  var KNOB  = [0x6d2f22, 0x7d3a2a, 0x5e271c];    // dark tubercles
  var UNDER = [0xe9d9bc, 0xdfcdad];              // pale oral surface

  /* ---------- central disc ----------
     Flat and pentagon-ish: `round` well above 2 gives the cross-section
     corners, which is what an arm base grows out of. */
  function disc() {
    var pos = sweep({
      len: 0.30, rad: 0.20, seg: 10, rings: 4, round: 3.0,
      aspectY: 1.0, aspectZ: 1.0, jitter: 0.08, seed: 131, centred: true,
      profile: ramp([[0, 0.35], [0.4, 1.0], [0.7, 0.95], [1, 0.40]])
    });
    /* Built along +X and laid down by the behaviour file, so "up" here
       is +X: the underside is the low-t end. */
    return geom(pos, colorize(pos, function (t, u, i) {
      if (t < 0.22) return pk(UNDER, i);
      return hash(i, 9, 5) > 0.62 ? pk(NET, i) : pk(BODY, i);
    }));
  }

  /* One arm: thick at the base, tapering to a blunt tip, with a slight
     upward curve so the tips lift off the sand the way a live star's
     do. A dead one lies flat — this is the difference. */
  function arm() {
    var pos = sweep({
      len: 1.0, rad: 0.155, seg: 8, rings: 6, round: 2.8,
      aspectY: 0.62, jitter: 0.09, seed: 137,
      profile: ramp([[0, 1.0], [0.35, 0.82], [0.7, 0.5], [1, 0.16]]),
      curveY: function (t) { return 0.06 * t * t; }
    });
    return geom(pos, colorize(pos, function (t, u, i) {
      if (u < 0.28) return pk(UNDER, i);
      return hash(i, 17, 6) > 0.58 ? pk(NET, i) : pk(BODY, i);
    }));
  }

  /* A tubercle. Blunt and rounded — these are knobs, not spines; the
     animal is armoured against being eaten, not defended by stabbing. */
  function knob() {
    var pos = sweep({
      len: 0.14, rad: 0.075, seg: 6, rings: 3, round: 2.2,
      jitter: 0.12, seed: 139,
      profile: ramp([[0, 1.0], [0.55, 0.9], [1, 0.45]])
    });
    return geom(pos, colorize(pos, function (t, u, i) { return pk(KNOB, i); }));
  }

  var cache = null;
  function parts() {
    if (cache) return cache;
    cache = { disc: disc(), arm: arm(), knob: knob() };
    return cache;
  }

  window.SeaStarBody = { parts: parts, material: Facet.material };
})();
