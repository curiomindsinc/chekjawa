/* ============================================================
   egretbody.js — the little egret's parts.

   *Egretta garzetta*: a small white heron, and the first BIRD on this
   shore. facet.js kit, body units with BODY (torso) LENGTH = 1.0.

   THE HARD PART IS THAT IT IS MOSTLY NOT BODY. Every organism built
   here so far is a solid with things attached — a carapace, a shell,
   a bag. An egret is a small torso suspended between a long neck and
   long legs, and both of those are POSED, not fixed: the neck folds
   into an S at rest, cocks back to strike, and runs straight out in
   flight. So the neck is three limb segments the behaviour file aims
   one at a time, exactly like the crab's cheliped, rather than one
   baked curve. Same for the legs.

   FOUR THINGS MAKE IT READ AS A LITTLE EGRET rather than as a generic
   white bird, in order of how much they matter at distance:

     silhouette   the S-neck over long legs. Nothing else here has a
                  vertical axis at all — this animal is a standing
                  shape on a shore of flat ones.
     black bill   a dagger, and against white plumage it is the one
                  high-contrast mark on the animal.
     YELLOW FEET  on black legs. This is the field mark that separates
                  a little egret from every other white heron, and it
                  is worth the extra part for exactly that reason.
     nape plumes  the two long thin head plumes. Small, but they trail
                  when the bird turns and nothing else on this shore
                  has anything like them.

   Colour is nearly flat white and that is a problem the palette has
   to solve rather than the geometry: a white faceted solid under a
   noon sun blows out to a silhouette. So the plumage palette is a
   set of warm and cool off-whites, and the underside grades notably
   greyer — it reads as a rounded body instead of a paper cut-out.
   ============================================================ */
(function () {
  'use strict';

  var hash = Facet.hash, ramp = Facet.ramp, pk = Facet.pick;
  var sweep = Facet.sweep, blade = Facet.blade;
  var colorize = Facet.colorize, geom = Facet.geom;

  /* ---------- palette ----------
     Never pure white. The brightest facet is 0xf2f1ec so there is
     headroom left before the sun clips it. */
  var PLUME = [0xf2f1ec, 0xe8e7e0, 0xedeae2, 0xe2e1db];   // sunlit plumage
  var SHADE = [0xb9bcc0, 0xc4c6c8, 0xafb3b8];             // underside, cool grey
  var BILL  = [0x1d1f22, 0x26282b];                        // black dagger
  var LEG   = [0x212326, 0x2a2c30];                        // black legs
  var FOOT  = [0xe0b426, 0xd0a41d];                        // and the yellow feet
  var EYE   = [0xd9c33a];

  /* Down the body: lit on top, grey underneath. `u` is height through
     the part, so this is one rule that gives every white part the same
     rounding. */
  function plumage(t, u, i) {
    if (u < 0.34) return pk(SHADE, i);
    return pk(PLUME, i);
  }

  /* ---------- the torso ----------
     Centred, +X forward. Deepest at the chest and tapering back to the
     tail — a heron carries its weight forward of centre because the
     neck is out there. */
  function body() {
    var pos = sweep({
      len: 1.0, rad: 0.27, seg: 9, rings: 7, round: 2.6,
      aspectY: 0.92, aspectZ: 0.86, jitter: 0.08, seed: 617, centred: true,
      // 0 tail, 1 breast
      profile: ramp([[0, 0.34], [0.22, 0.72], [0.55, 1.0], [0.82, 0.95], [1, 0.60]]),
      // the back line lifts a little over the shoulders
      curveY: function (t) { return Math.sin(t * Math.PI) * 0.05; }
    });
    return geom(pos, colorize(pos, plumage));
  }

  /* ---------- neck ----------
     ONE segment, placed three times. Slightly tapered so a stack of
     three reads as a neck narrowing toward the head rather than as a
     pipe. Root at origin along +X, like every limb part here. */
  function neckSeg() {
    var pos = sweep({
      len: 1.0, rad: 0.088, seg: 7, rings: 4, round: 2.2,
      jitter: 0.05, seed: 331,
      profile: ramp([[0, 1.0], [1, 0.84]])
    });
    return geom(pos, colorize(pos, plumage));
  }

  function head() {
    var pos = sweep({
      len: 0.30, rad: 0.105, seg: 8, rings: 5, round: 2.3,
      aspectY: 0.94, jitter: 0.05, seed: 443, centred: true,
      profile: ramp([[0, 0.62], [0.35, 1.0], [0.75, 0.88], [1, 0.42]])
    });
    return geom(pos, colorize(pos, plumage));
  }

  /* The dagger. Long, straight and pinched to a point — a heron's bill
     is a spear, not a beak, and the taper has to run all the way out or
     it reads as a duck. */
  function bill() {
    var pos = sweep({
      len: 1.0, rad: 0.062, seg: 6, rings: 5, round: 2.0,
      aspectY: 0.80, jitter: 0.03, seed: 907,
      profile: ramp([[0, 1.0], [0.45, 0.60], [1, 0.06]])
    });
    return geom(pos, colorize(pos, function (t, u, i) { return pk(BILL, i); }));
  }

  function eye() {
    var pos = sweep({
      len: 0.07, rad: 0.035, seg: 6, rings: 3, round: 2, centred: true, seed: 51
    });
    return geom(pos, colorize(pos, function (t, u, i) { return pk(EYE, i); }));
  }

  /* ---------- legs ----------
     One segment reused for thigh and shank, scaled by the behaviour
     file. Thin: a heron's leg is a stick, and fattening it to help it
     read at distance immediately turns the bird into a stork. */
  function legSeg() {
    var pos = sweep({
      len: 1.0, rad: 0.040, seg: 6, rings: 3, round: 2.1,
      jitter: 0.04, seed: 733,
      profile: ramp([[0, 1.0], [1, 0.82]])
    });
    return geom(pos, colorize(pos, function (t, u, i) { return pk(LEG, i); }));
  }

  /* THE FIELD MARK. Splayed, forward-pointing, and yellow — kept as its
     own part purely so it can be that colour. */
  function foot() {
    var pos = blade({
      len: 0.26, half: 0.085, thick: 0.035, steps: 5, seed: 89, jitter: 0.10,
      outline: ramp([[0, 0.45], [0.35, 1.0], [1, 0.30]])
    });
    return geom(pos, colorize(pos, function (t, u, i) { return pk(FOOT, i); }));
  }

  /* ---------- wing ----------
     A blade, root at the shoulder, running +X out to the tip. Broad at
     the wrist and tapering to the primaries. It is used folded against
     the body most of the time and spread only in flight, so the
     outline has to survive being seen edge-on. */
  function wing() {
    var pos = blade({
      len: 1.0, half: 0.30, thick: 0.055, steps: 8, seed: 271, jitter: 0.09,
      outline: ramp([[0, 0.52], [0.20, 1.0], [0.62, 0.86], [1, 0.22]]),
      // a little dihedral droop so a spread wing is not a flat plank
      sweepY: function (t) { return -t * t * 0.10; }
    });
    return geom(pos, colorize(pos, plumage));
  }

  function tail() {
    var pos = blade({
      len: 0.42, half: 0.19, thick: 0.05, steps: 5, seed: 613, jitter: 0.08,
      outline: ramp([[0, 0.70], [0.5, 1.0], [1, 0.55]])
    });
    return geom(pos, colorize(pos, plumage));
  }

  /* The two nape plumes. Thin enough to be nearly a line, which is
     what they look like on a real bird. */
  function plume() {
    var pos = blade({
      len: 1.0, half: 0.035, thick: 0.016, steps: 5, seed: 155, jitter: 0.16,
      outline: ramp([[0, 0.5], [0.35, 1.0], [1, 0.5]])
    });
    return geom(pos, colorize(pos, function (t, u, i) { return pk(PLUME, i); }));
  }

  var cache = null;
  function parts() {
    if (cache) return cache;
    cache = {
      body: body(),
      neckSeg: neckSeg(),
      head: head(),
      bill: bill(),
      eye: eye(),
      legSeg: legSeg(),
      foot: foot(),
      wing: wing(),
      tail: tail(),
      plume: plume()
    };
    return cache;
  }

  window.EgretBody = { parts: parts, material: Facet.material };
})();
