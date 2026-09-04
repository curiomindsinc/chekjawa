/* ============================================================
   swimmingcrabbody.js — the swimming crab's own parts: carapace,
   paddle, and now the whole limb kit in its own colour.

   THE CARAPACE AND THE PADDLE ARE STILL THE ONLY NEW SHAPES. Every
   limb here — armSeg, clawPalm, both fingers, legSeg, legTip — is
   built by the SAME geometry-generating code as crabbody.js's own,
   because the shape of a swimming crab's walking leg is not
   meaningfully different from a fiddler's. What changed is the
   colour, and it changed because reusing crabbody.js's parts outright
   meant reusing crabbody.js's PALETTE too — bright fiddler orange —
   and a "totally blue" request cannot be answered by tinting an
   orange base. `instanceColor` only MULTIPLIES a part's baked vertex
   colour (ui.js's hover glow leans on exactly that fact to brighten
   an animal), and an orange with almost no blue channel to begin with
   has nothing there for a blue tint to bring out — the legs would
   only go muddy grey, never blue. So the colour has to be baked into
   the geometry itself, which means these parts need their own build
   functions after all, even though their SHAPE is a copy.

   Real *Portunus pelagicus* males run vivid blue over the whole body
   — carapace, walking legs and claws alike, with pale mottling and a
   white-fingered claw — which is also a better answer than
   crabbody.js's palette ever was to "does this read as ONE blue
   animal" rather than a blue shell bolted onto orange fiddler limbs.

   Eyestalks and eyes are still borrowed from crabbody.js outright —
   dark and small enough that no one will ever notice they did not get
   their own colour, and it keeps this file from having to reproduce
   parts that were never the problem.
   ============================================================ */
(function () {
  'use strict';

  var hash = Facet.hash, ramp = Facet.ramp, pk = Facet.pick;
  var sweep = Facet.sweep, blade = Facet.blade;
  var colorize = Facet.colorize, geom = Facet.geom;

  /* ---------- palette ----------
     One family of blues for the whole animal, so the carapace and the
     legs read as the same crab: a bright mid-blue base, a darker
     shaded variant, and pale near-white for mottling, the claw
     stipple and the fingers — the field mark that keeps a claw from
     looking like a smaller copy of the shell it is attached to. */
  var BLUE_MAIN  = [0x2f5c9c, 0x3667a8, 0x27507f, 0x3f75b3];    // the crab's one colour
  var BLUE_DARK  = [0x1f3f6b, 0x274a78, 0x1a3660];               // shaded / underside
  var BLUE_SPOT  = [0x9bc3e6, 0x87b6de];                          // pale mottling on the shell
  var BLUE_HOT   = [0x5c96d4, 0x6aa0da];                          // the flush where palm meets fingers
  var BLUE_DOT   = [0x18304f, 0x142842];                          // stippled papillae on the palm
  var SPINE      = [0x162c4a, 0x11233c];                          // the lateral spine tip, in shadow
  var UNDERSIDE  = [0xdfe9f4, 0xd2e0ee, 0xe8f0f8];                // pale belly and inner limb faces
  var FINGER_PALE= [0xeaf2fa, 0xdde8f4];                          // the white-fingered claw
  var FINGER_TIP = [0x0f2038];
  var TOOTH      = [0xf5efe0];                                     // pale cusps along the gape
  var PADDLE_MAIN= [0x2f5c9c, 0x27507f, 0x3f75b3];                 // the paddle, the same blue
  var PADDLE_RIM = [0xe8f0f8, 0xdae6f2];                           // its pale fringing rim

  /* ---------- the carapace ----------
     Unchanged shape from the first pass — see the header for why the
     spine is a spike in `profile(t)` rather than extra geometry — just
     repainted into the one family of blues above. */
  function carapace() {
    var pos = sweep({
      len: 1.0, rad: 0.30, seg: 10, rings: 7, round: 3.0,
      aspectY: 0.40, aspectZ: 0.90, jitter: 0.09, seed: 1301, centred: true,
      profile: ramp([
        [0,    0.26], [0.08, 0.55], [0.14, 1.00], [0.20, 0.68],
        [0.5,  0.80],
        [0.80, 0.68], [0.86, 1.00], [0.92, 0.55], [1, 0.26]
      ]),
      curveY: function (t) { return 0; }
    });
    return geom(pos, colorize(pos, function (t, u, i) {
      if ((t > 0.115 && t < 0.165) || (t > 0.835 && t < 0.885)) {
        if (u > 0.4) return pk(SPINE, i);
      }
      if (u < 0.30) return pk(UNDERSIDE, i);
      if (u < 0.48) return pk(BLUE_DARK, i);
      if (hash(i, 17, 6) > 0.82) return pk(BLUE_SPOT, i);
      return pk(BLUE_MAIN, i);
    }));
  }

  /* ---------- the paddle ----------
     Same oval blade as before, repainted. */
  function paddle() {
    var pos = blade({
      len: 1.0, half: 0.46, thick: 0.05, steps: 7, jitter: 0.06, seed: 1307,
      outline: ramp([[0, 0.20], [0.22, 0.86], [0.5, 1.0], [0.78, 0.84], [1, 0.18]])
    });
    return geom(pos, colorize(pos, function (t, u, i) {
      if (Math.abs(u - 0.5) > 0.40) return pk(PADDLE_RIM, i);
      return pk(PADDLE_MAIN, i);
    }));
  }

  /* ---------- the rest of the limb kit ----------
     Shape copied from crabbody.js's own armSeg / clawPalm / finger /
     legSeg / legTip — see that file for why each is built the way it
     is — with only the palette swapped out. `finger()` keeps the same
     `dir` / `slim` / `HOOK` contract crabbody.js documents at length:
     the hook is a fraction of the finger's DRAWN LENGTH, not its
     thickness, and this species' own SLIM ratio (`SWIM_SLIM` in
     swimmingcrabs.js, matching its ARM.finger) has to track it the
     same way crabbody.js's FIDDLER_SLIM and HERMIT_SLIM do. */
  function armSeg() {
    var pos = sweep({
      len: 1.0, rad: 0.115, seg: 7, rings: 4, round: 2.7, jitter: 0.14, seed: 1321,
      profile: ramp([[0, 1.0], [0.5, 0.88], [1, 0.78]])
    });
    return geom(pos, colorize(pos, function (t, u, i) {
      return u < 0.34 ? pk(BLUE_DARK, i) : pk(BLUE_MAIN, i);
    }));
  }

  function clawPalm() {
    var pos = sweep({
      len: 1.0, rad: 0.33, seg: 9, rings: 7, round: 2.8,
      aspectY: 1.0, aspectZ: 0.44, jitter: 0.11, seed: 1327,
      profile: ramp([[0, 0.46], [0.16, 0.94], [0.34, 1.0], [0.60, 0.90], [0.82, 0.72], [1, 0.54]]),
      curveY: function (t) { return 0.085 * t * t; }
    });
    return geom(pos, colorize(pos, function (t, u, i) {
      if (u < 0.28) return pk(BLUE_DARK, i);
      if (t > 0.84) return pk(BLUE_HOT, i);
      if (hash(i, 23, 7) > 0.84) return pk(BLUE_DOT, i);
      if (t > 0.72 && u > 0.62) return pk(FINGER_PALE, i);
      return pk(BLUE_MAIN, i);
    }));
  }

  var HOOK_DACTYL = 0.15, HOOK_POLLEX = 0.05;
  function finger(dir, seed, slim, HOOK) {
    var taper = ramp([[0, 1.0], [0.32, 0.88], [0.62, 0.64], [0.86, 0.34], [1, 0.08]]);
    function profile(t) {
      var amp = 0.22 * (1 - t) * (1 - t);
      return taper(t) * (1 + amp * Math.abs(Math.sin(t * Math.PI * 3.1)) - amp * 0.45);
    }
    var pos = sweep({
      len: 1.0, rad: 0.145, seg: 7, rings: 10, round: 2.5, aspectZ: 0.72,
      jitter: 0.08, seed: seed,
      profile: profile,
      curveY: function (t) { return dir * HOOK * slim * Math.pow(t, 1.35); }
    });
    return geom(pos, colorize(pos, function (t, u, i) {
      var onGape = dir < 0 ? (u < 0.34) : (u > 0.66);
      if (t < 0.14) return pk(BLUE_HOT, i);                      // the flush carried over from the palm
      if (t > 0.90) return FINGER_TIP[0];                        // the dark worn point
      if (onGape && t < 0.74 && hash(i, 31, 4) > 0.45) return pk(TOOTH, i);   // pale cusps, catching the light
      return pk(FINGER_PALE, i);
    }));
  }

  function legSeg() {
    var pos = sweep({
      len: 1.0, rad: 0.072, seg: 6, rings: 4, round: 2.6, jitter: 0.13, seed: 1341,
      profile: ramp([[0, 1.0], [0.5, 0.84], [1, 0.66]]),
      curveY: function (t) { return -0.035 * t * t; }
    });
    return geom(pos, colorize(pos, function (t, u, i) {
      return u < 0.32 ? pk(BLUE_DARK, i) : pk(BLUE_MAIN, i);
    }));
  }

  function legTip() {
    var pos = sweep({
      len: 1.0, rad: 0.058, seg: 6, rings: 4, round: 2.3, jitter: 0.12, seed: 1347,
      profile: ramp([[0, 1.0], [0.45, 0.70], [1, 0.14]])
    });
    return geom(pos, colorize(pos, function (t, u, i) {
      return t > 0.7 ? pk(BLUE_DARK, i) : pk(BLUE_MAIN, i);
    }));
  }

  var cache = null;
  function parts() {
    if (cache) return cache;
    cache = {
      carapace: carapace(),
      paddle: paddle(),
      armSeg: armSeg(),
      clawPalm: clawPalm(),
      dactyl: finger(-1, 1331, 0.38, HOOK_DACTYL),
      pollex: finger(1, 1337, 0.38, HOOK_POLLEX),
      legSeg: legSeg(),
      legTip: legTip()
    };
    return cache;
  }

  window.SwimmingCrabBody = { parts: parts, material: Facet.material };
})();
