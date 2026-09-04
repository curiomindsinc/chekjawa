/* ============================================================
   sanddollarbody.js — the sand dollar's parts.

   facet.js kit. Body units with the TEST'S DIAMETER = 1.0, and +X is
   the disc's axis, i.e. UP — this animal does not point anywhere. It
   is the flattest thing on the shore and it lies face to the sky.

   TWO PARTS, AND ONE OF THEM IS NOT THE ANIMAL. A sand dollar
   ploughs along just under the surface, so for most of the tide what
   you can actually see of it is a low travelling MOUND of sand with
   nothing visible inside. That is a different rendering problem from
   anything else here — every other species is a body you follow —
   and the answer is to model the mound as a part in its own right,
   sized off the same body units and faded in and out by one number
   in sanddollars.js.

   THE PETALS ARE THE PAYOFF. When a spring low drains the flat the
   animal stops, the sand comes off it, and the five-petalled
   petalodium on its upper surface is finally visible. That pattern
   is the reason anybody recognises a sand dollar at all, so it is
   worth the one thing in this file that is hand-rolled.

   WHY THE DISC IS HAND-ROLLED. Two reasons, and the second one is
   the one that actually forced it.

   1. Facet.colorize hands a triangle its position ALONG the sweep and
      UP it — two axes, which is everything a limb or a shell needs
      and not enough for a radial pattern. Five petals want the angle
      about the axis.

   2. sweep() CAPS ITS ENDS WITH A SINGLE FAN. Every triangle on that
      cap runs from the centre to the rim, so there is nowhere on it
      for a pattern to stop — the first attempt painted the petals as
      a pinwheel of five full-radius wedges, which is a beach ball,
      not a sand dollar. A petalodium needs concentric subdivision,
      and sweep() has no way to make it.

   So `disc()` below builds the test out of concentric rings by hand
   (the same licence crabbody.js's burrow takes) and tags every
   triangle with which face it belongs to, and `paint()` colours it in
   (face, radius, angle). WINDING IS NOT COSMETIC here either: the
   material is FrontSide, so the top rings, the bottom rings and the
   rim each have to be wound to face their own way out.
   ============================================================ */
(function () {
  'use strict';

  var hash = Facet.hash, ramp = Facet.ramp, pk = Facet.pick;
  var sweep = Facet.sweep, geom = Facet.geom;

  /* ---------- palette ---------- */
  var TOP    = [0x9c8e6e, 0xa89a78, 0x918466];   // the living test, sand-coloured with a purple cast
  var PETAL  = [0x565341, 0x4c4939];             // the petalodium, sunk and darker
  var PORE   = [0x676350, 0x726d58];             // the pore pairs down each petal
  var RIM    = [0xb0a488, 0xa89c80];             // the edge, where the spines catch light
  var UNDER  = [0x776c55, 0x6d6350];             // the underside, and the mouth at its centre
  var MOUTH  = [0x4b4436];
  var SANDA  = [0xa89a74, 0x9c8f6b, 0xb2a37c];   // the mound: lagoon-edge sand, damp and one shade down
  var SANDB  = [0x8d8163];                       //   ...and the shadow side of it

  /* Per-triangle colour in (face, radius, angle) about the +X axis.
     face: -1 underside, +1 top, 0 the rim — carried on the triangle,
     not guessed from its position. */
  function paint(d, rad, fn) {
    var pos = d.pos, face = d.face;
    var col = new Float32Array(pos.length);
    var c = new THREE.Color();
    for (var i = 0; i < pos.length; i += 9) {
      var ti = i / 9;
      var cy = (pos[i + 1] + pos[i + 4] + pos[i + 7]) / 3;
      var cz = (pos[i + 2] + pos[i + 5] + pos[i + 8]) / 3;
      c.setHex(fn(face[ti], Math.hypot(cy, cz) / rad, Math.atan2(cz, cy), ti));
      for (var k = 0; k < 3; k++) {
        col[i + k * 3] = c.r;
        col[i + k * 3 + 1] = c.g;
        col[i + k * 3 + 2] = c.b;
      }
    }
    return col;
  }

  /* ---------- the test ----------
     A disc built from concentric rings, and a genuinely flat one: 0.13
     thick against 1.0 across. It has to look like something a wave
     would not turn over.

     Rings crowd toward the rim because that is where the outline is,
     and the half-thickness falls off with radius so the edge is a thin
     lip rather than a cliff. */
  var RAD = 0.5;
  var SEG = 28;
  var RINGS = [0, 0.14, 0.28, 0.42, 0.56, 0.70, 0.84, 1.0];
  var HALF_T = 0.065;

  function halfAt(u) { return HALF_T * Math.pow(1 - u * u * 0.86, 0.55); }

  function disc() {
    var pos = [], face = [];
    var r, q;
    function tri(a, b, c, f) {
      pos.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
      face.push(f);
    }
    // ring[r][q] = [top, bottom] point pairs
    var ring = [];
    for (r = 0; r < RINGS.length; r++) {
      var u = RINGS[r], rr = u * RAD, h = halfAt(u);
      var row = [];
      for (q = 0; q < SEG; q++) {
        var th = q / SEG * Math.PI * 2;
        // the same deterministic wobble the rest of the kit uses
        var j = 1 + (hash(r, q, 401) - 0.5) * 0.07;
        var y = Math.cos(th) * rr * j, z = Math.sin(th) * rr * j;
        row.push([[h, y, z], [-h, y, z]]);
      }
      ring.push(row);
    }

    for (r = 0; r < RINGS.length - 1; r++) {
      for (q = 0; q < SEG; q++) {
        var q2 = (q + 1) % SEG;
        var i0 = ring[r][q][0], o0 = ring[r + 1][q][0];
        var i1 = ring[r][q2][0], o1 = ring[r + 1][q2][0];
        /* TOP: radial-outward then counter-clockwise gives a +X normal,
           which is up once sanddollars.js stands the part on end. */
        tri(i0, o0, o1, 1);
        tri(i0, o1, i1, 1);
        // BOTTOM: the same quads wound the other way, so they face -X
        var j0 = ring[r][q][1], p0 = ring[r + 1][q][1];
        var j1 = ring[r][q2][1], p1 = ring[r + 1][q2][1];
        tri(j0, p1, p0, -1);
        tri(j0, j1, p1, -1);
      }
    }
    // the rim, facing radially out
    var last = RINGS.length - 1;
    for (q = 0; q < SEG; q++) {
      var qq = (q + 1) % SEG;
      var t0 = ring[last][q][0], b0 = ring[last][q][1];
      var t1 = ring[last][qq][0], b1 = ring[last][qq][1];
      tri(t0, b0, b1, 0);
      tri(t0, b1, t1, 0);
    }
    return { pos: pos, face: face };
  }

  function test() {
    var d = disc();
    return geom(d.pos, paint(d, RAD, function (f, r, a, i) {
      if (f < 0) return r < 0.14 ? MOUTH[0] : pk(UNDER, i);
      if (f === 0) return pk(RIM, i);
      /* Five petals. |sin(2.5 a)| has exactly five lobes around the
         circle, and holding them away from both the centre and the rim
         is what makes them read as petals rather than as a star. */
      var lobe = Math.abs(Math.sin(a * 2.5));
      if (r > 0.17 && r < 0.76 && lobe > 0.68) {
        /* The pore pairs run down the MIDDLE of each petal, not at
           random over it — scattering them made the whole petalodium
           read as noise instead of as five shapes. */
        return lobe > 0.965 ? pk(PORE, i) : pk(PETAL, i);
      }
      return pk(TOP, i);
    }));
  }

  /* ---------- the mound ----------
     Sand heaped over a buried animal. Deliberately lumpier than
     anything else in the build (jitter 0.42): a smooth dome reads as
     a dropped object, an irregular one reads as sediment. */
  function mound() {
    var pos = sweep({
      len: 0.26, rad: 0.78, seg: 11, rings: 4, round: 2,
      jitter: 0.42, seed: 409,
      profile: ramp([[0, 1.0], [0.35, 0.86], [0.72, 0.56], [1, 0.06]])
    });
    return geom(pos, Facet.colorize(pos, function (t, u, i) {
      return (hash(i, 3, 7) > 0.62) ? pk(SANDB, i) : pk(SANDA, i);
    }));
  }

  var cache = null;
  function parts() {
    if (cache) return cache;
    cache = { test: test(), mound: mound() };
    return cache;
  }

  window.SandDollarBody = { parts: parts, material: Facet.material };
})();
