/* ============================================================
   seaharebody.js — the sea hare's parts.

   *Dolabella auricularia*, Chek Jawa's "extraordinary sea hare": a
   heavy, warty, olive-brown sea slug the size of two fists, grazing
   the seagrass lagoon. facet.js kit, body units with BODY LENGTH =
   1.0.

   IT IS A BAG, NOT A SHELL. Every mollusc built here so far has been
   armour with an animal inside — barnacle plates, a nerite's dome, a
   conch spindle. This one has given the shell up entirely: it is a
   soft, sagging sack that changes shape as it moves, and the body
   profile has to say that. Widest and tallest well BEHIND centre
   (Dolabella's truncated rear is its most recognisable feature),
   tapering forward to a small head.

   FOUR THINGS MAKE IT READ AS A SEA HARE, in order of how much they
   matter at distance:

     parapodia   the two mantle flaps standing along the back. They
                 are the silhouette — a ruffled wall down each side —
                 and the behaviour file ripples them.
     rhinophores the pair of rolled, ear-like sensory horns that give
                 the animal its name. Small, but nothing else on this
                 shore has them.
     warts       Dolabella's skin is covered in soft tubercles. Baked
                 into the body they would vanish into the facets, so
                 they are separate instances like the sea star's knobs
                 (§23) — placeable, scalable, and they break the
                 silhouette at the rim.
     tentacles   the shorter oral pair, out front, low.

   Colour is the mottled camouflage of an animal that lives in weed:
   olive-brown ground, paler blotches, dark warts, a pale sole.
   ============================================================ */
(function () {
  'use strict';

  var hash = Facet.hash, ramp = Facet.ramp, pk = Facet.pick;
  var sweep = Facet.sweep, blade = Facet.blade;
  var colorize = Facet.colorize, geom = Facet.geom;

  /* ---------- palette ---------- */
  var BODY   = [0x5b5936, 0x676445, 0x4d4b2b, 0x726d4a];   // olive-brown
  var BLOTCH = [0x8d8a5f, 0x9a9469];                        // paler mottling
  var WART   = [0x3c3a21, 0x474428];                        // dark tubercles
  var SOLE   = [0xa39d78, 0x968f6c];                        // the pale creeping foot
  var FLAP   = [0x565334, 0x615e3c, 0x4a4829];              // parapodia, a shade darker

  /* ---------- the body ----------
     Centred, so the behaviour file positions the animal's middle and
     everything else hangs off that. Fat and tall toward the rear,
     pinched to a small head at the +X end. */
  function body() {
    var pos = sweep({
      len: 1.0, rad: 0.30, seg: 10, rings: 7, round: 2.7,
      aspectY: 0.66, aspectZ: 0.94, jitter: 0.11, seed: 211, centred: true,
      // 0 is the tail, 1 is the head
      profile: ramp([[0, 0.72], [0.18, 1.0], [0.45, 0.92], [0.75, 0.62], [1, 0.28]]),
      // the back humps up over the rear third and the head dips
      curveY: function (t) { return 0.055 * Math.sin(Math.min(1, t * 1.35) * Math.PI) - 0.03 * t * t; }
    });
    return geom(pos, colorize(pos, function (t, u, i) {
      if (u < 0.20) return pk(SOLE, i);                       // underside — the sole
      return hash(i, 11, 4) > 0.66 ? pk(BLOTCH, i) : pk(BODY, i);
    }));
  }

  /* One parapodium: a standing flap, tallest over the middle of the
     back and dying away at both ends. Built along +X so the behaviour
     file lays it down the body's own axis. */
  function parapodium() {
    var pos = blade({
      len: 0.66, half: 0.20, thick: 0.045, steps: 7, jitter: 0.22, seed: 223,
      outline: ramp([[0, 0.25], [0.3, 1.0], [0.62, 0.92], [1, 0.18]]),
      // the flap's free edge waves; the rooted edge does not
      sweepY: function (t) { return 0.055 * Math.sin(t * 7.5); }
    });
    return geom(pos, colorize(pos, function (t, u, i) {
      // the inner face of the flap is paler, as it is on the animal
      return u > 0.72 ? pk(BLOTCH, i) : pk(FLAP, i);
    }));
  }

  /* A rhinophore: rolled into a tube and hooked back, which is what
     makes the pair read as ears rather than as antennae. */
  function rhinophore() {
    var pos = sweep({
      len: 0.22, rad: 0.052, seg: 6, rings: 4, round: 2.2,
      jitter: 0.10, seed: 227,
      profile: ramp([[0, 1.0], [0.55, 0.86], [1, 0.34]]),
      curveY: function (t) { return -0.05 * t * t; }
    });
    return geom(pos, colorize(pos, function (t, u, i) {
      return t > 0.6 ? pk(WART, i) : pk(BODY, i);
    }));
  }

  /* The oral tentacles — shorter, blunter, and they sit low and wide
     where the rhinophores sit high and close. */
  function tentacle() {
    var pos = sweep({
      len: 0.15, rad: 0.045, seg: 6, rings: 3, round: 2.2,
      jitter: 0.10, seed: 229,
      profile: ramp([[0, 1.0], [1, 0.38]])
    });
    return geom(pos, colorize(pos, function (t, u, i) { return pk(BODY, i); }));
  }

  function wart() {
    var pos = sweep({
      len: 0.075, rad: 0.048, seg: 5, rings: 2, round: 2.1,
      jitter: 0.18, seed: 233,
      profile: ramp([[0, 1.0], [0.6, 0.85], [1, 0.40]])
    });
    return geom(pos, colorize(pos, function (t, u, i) { return pk(WART, i); }));
  }

  /* A puff of ink. Deliberately lumpy and NOT a sphere — a smooth ball
     reads as a bubble, and this is supposed to be a cloud coming
     apart. It is the one part here that does not use the shared
     material (see seahares.js): ink has to be see-through. */
  function puff() {
    var pos = sweep({
      len: 1.0, rad: 0.62, seg: 8, rings: 5, round: 2.0,
      aspectY: 0.78, jitter: 0.42, seed: 239, centred: true,
      profile: ramp([[0, 0.25], [0.35, 1.0], [0.7, 0.92], [1, 0.30]])
    });
    return geom(pos, colorize(pos, function () { return 0xffffff; }));
  }

  var cache = null;
  function parts() {
    if (cache) return cache;
    cache = {
      body: body(), parapodium: parapodium(), rhinophore: rhinophore(),
      tentacle: tentacle(), wart: wart(), puff: puff()
    };
    return cache;
  }

  /* Ink gets its own material: transparent, unlit and not depth-writing,
     so puffs blend into each other and into the water instead of
     stacking up as hard-edged solids. */
  var inkMat = null;
  function inkMaterial() {
    if (!inkMat) {
      inkMat = new THREE.MeshBasicMaterial({
        color: 0x59315e, transparent: true, opacity: 0.5,
        depthWrite: false, vertexColors: true
      });
    }
    return inkMat;
  }

  window.SeaHareBody = { parts: parts, material: Facet.material, inkMaterial: inkMaterial };
})();
