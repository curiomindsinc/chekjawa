/* ============================================================
   otterbody.js — what the smooth-coated otter is made of that the
   REFERENCE MESH does not already provide (BUILD_GUIDE §42, §43, §44).

   THIS FILE USED TO BUILD THE WHOLE ANIMAL. It does not any more. The
   body, the head, the tail, the four limbs, the feet, the ears and the
   eyes all now come from `reference/otter/Otter.obj`, baked to
   `js/ottermesh.js` by `tools/bake-otter.js` and skinned per frame by
   otters.js. Two parts survive here, for one reason each:

     whisker  THE MESH HAS NONE. A fan of stiff pale hairs off each
              side of the muzzle — three a side off one root, because
              real whiskers spring from a tight pad and not a spread.
              It was the one thing on the §43 animal that was not in
              the reference either; the reference changed and it is
              still the one thing.

     fish     NOT PART OF THE OTTER AT ALL. What comes up in its jaws
              or is held on its chest — the receipt for a kill, and the
              only part of one that is ever drawn. It keeps its own
              silver colour: tinting it with the animal holding it
              would turn the one part that has to read as SOMETHING
              ELSE into part of the otter.

   Everything else here is the palette and the landmarks, both of which
   outlived the geometry.

   THE PALETTE, sampled rather than guessed — but not off this mesh.
   `Otter.obj` ships no `.mtl` and no texture; its single material is
   called "skin" and carries nothing. So the colours are still §43's,
   decoded from the OTHER reference's base-colour texture through its
   own UVs, per region: back, flank and tail all 0x321d16, throat and
   muzzle underside 0xb9aa9e, paws 0x281814, eye flat black.

   Two things fell out of that and both still hold. THE REFERENCE HAS
   NO PALE BELLY — its belly samples the same 0x311c15 as its back, so
   only the throat bib survives. And the baked coat sits LIGHTER than
   the sampled 0x321d16 on purpose: that number is an albedo read flat
   off a texture, while otters.js multiplies each animal between WET
   0.62 and DRY 1.16, and baking the raw value would put a wet otter at
   near-black. The base sits between the two so the range exists in
   both directions.

   `tools/bake-otter.js` carries its own copy of these swatches, because
   it runs at build time and cannot read this file. If one changes the
   other has to, and the bake has to be re-run.

   BODY UNIT IS THE TORSO — rump to shoulder joint — and +X is FORWARD.
   ============================================================ */
(function () {
  'use strict';

  var hash = Facet.hash, pk = Facet.pick, ramp = Facet.ramp;
  var sweep = Facet.sweep;
  var colorize = Facet.colorize, geom = Facet.geom;

  /* ---------- palette ---------- */
  var COAT  = [0x5e3d2a, 0x66452f, 0x563628, 0x6b4a33];
  var GUARD = [0x462c1e, 0x3d2619];
  var BELLY = [0x6a4832, 0x714f38];
  var THROAT = [0xb0a196, 0xbcada1, 0xa89a8f];
  var NOSE  = [0x241a14, 0x1d1510];
  var EYEC  = [0x0d0a08, 0x000000];
  var WEB   = [0x33221a, 0x2b1c15];
  var FISHC = [0xa9b0b4, 0xb6bdc0, 0x9aa2a6];              // a wet fish is a grey mirror
  var FISHB = [0x5d6468];
  var WHISKER = [0xe4dac6, 0xd7cbb2];                      // pale, near-white against the coat

  /* A single whisker, thin and tapering almost to nothing at the tip.
     otters.js instances it six times (three a side) fanned out from the
     muzzle — one shape, not six. Its root is put ON THE SKIN by
     `onSkin`, off the profile this file exports below, so all 0.11 of
     this length is length that sticks out. */
  function whisker() {
    var pos = sweep({
      len: 0.11, rad: 0.006, seg: 5, rings: 4, round: 1.6,
      jitter: 0.02, seed: 909,
      profile: ramp([[0, 1.0], [1, 0.10]])
    });
    return geom(pos, colorize(pos, function (t, u, i) { return pk(WHISKER, i); }));
  }

  function fish() {
    var pos = sweep({
      len: 0.26, rad: 0.052, seg: 9, rings: 9, round: 2.0,
      jitter: 0.10, seed: 5087, centred: true,
      profile: ramp([[0, 0.18], [0.14, 0.62], [0.42, 1.0], [0.74, 0.58], [0.90, 0.22], [1, 0.60]]),
      aspectY: 1.25
    });
    return geom(pos, colorize(pos, function (t, u, i) {
      if (t > 0.90) return pk([FISHB[0]], i);      // the tail fan
      if (u < 0.34) return pk([FISHC[1]], i);      // a pale belly, turned up in the jaws
      return pk(FISHC, i);
    }));
  }

  var cache = null;
  function parts() {
    if (cache) return cache;
    cache = { whisker: whisker(), fish: fish() };
    return cache;
  }

  /* ------------------------------------------------------------
     THE SURFACE, ASKED OF THE SURFACE.

     `ottermesh.js` ships a measured [s, halfW, halfH] table taken by
     plane-sectioning the real mesh, and these two read it. otters.js's
     `onSkin` hangs the whisker pad off them.

     This is §43's rule surviving a complete change of body. There, the
     face was hung off a TYPED skull radius, the one-surface rebuild
     moved the skin, and every fitting ended up inside the head — 100%
     of the ear and eye, 93% of the whiskers. The mesh has now replaced
     the body a second time and the whisker pad still lands on the skin,
     because it never asked a number, it asked the profile.
     ------------------------------------------------------------ */
  var P = window.OtterMesh.prof;
  function lookup(col) {
    return function (s) {
      if (s <= P[0][0]) return P[0][col];
      if (s >= P[P.length - 1][0]) return P[P.length - 1][col];
      for (var i = 1; i < P.length; i++) {
        if (P[i][0] >= s) {
          var a = P[i - 1], b = P[i], u = (s - a[0]) / (b[0] - a[0] || 1);
          return a[col] + (b[col] - a[col]) * u;
        }
      }
      return P[P.length - 1][col];
    };
  }

  var M = window.OtterMesh;
  window.OtterBody = {
    parts: parts, material: Facet.material,
    /* the landmarks come from the mesh now, not from part lengths —
       measured off it by the bake, so the profile and the centreline
       still cannot disagree about where the shoulder is */
    S_RUMP: M.S_RUMP, S_SHOULDER: M.S_SHOULDER, S_NECK_END: M.S_NECK_END,
    X_TIP: M.X_TIP, X_NOSE: M.X_NOSE, BODY_R: M.BODY_R, S: M.S,
    halfW: lookup(1), halfH: lookup(2),
    /* exposed so the bake and the runtime cannot drift apart on colour */
    COAT: COAT, GUARD: GUARD, BELLY: BELLY, THROAT: THROAT,
    NOSE: NOSE, EYEC: EYEC, WEB: WEB
  };
})();
