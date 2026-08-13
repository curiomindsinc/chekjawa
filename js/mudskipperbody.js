/* ============================================================
   mudskipperbody.js — the mudskipper's body parts.

   Same kit as everything else (facet.js), same two conventions: BODY
   UNITS with body length = 1.0, and fins root-at-origin along +X so
   the behaviour file places one by pointing +X where it should lie.

   A mudskipper is a goby that got out of the water, and every part
   here is bent toward that. Three things carry the read, and if any
   one of them is missing the animal is just a fish lying on mud:

     PERISCOPE EYES   Two bulging domes mounted on TOP of the head,
                      close together, standing proud of the skull —
                      not the flush eyes of a bottom fish. They are the
                      single most recognisable thing about the animal
                      and they are why it can lie on mud and still see
                      everything above it.
     ARM-LIKE PECTORALS  Thick, muscular fins on stubby bases. On land
                      these are crutches, not paddles; the behaviour
                      file props the animal on them and walks it.
     A RAISED FIRST DORSAL  A tall sail that goes up in display. A
                      mudskipper flying its dorsal on a mudbank is
                      doing the thing mudskippers are filmed doing.

   Colour is wet mud: dark olive-brown back, dark saddles, pale belly,
   with a scatter of bright speckles along the flank — real ones are
   flecked blue and gold, and the speckle is what stops the animal
   reading as a lump of the substrate it is sitting on.
   ============================================================ */
(function () {
  'use strict';

  var hash = Facet.hash, ramp = Facet.ramp, pk = Facet.pick;
  var sweep = Facet.sweep, blade = Facet.blade;
  var colorize = Facet.colorize, geom = Facet.geom;

  /* ---------- palette ---------- */
  var BACK   = [0x574a34, 0x4c412d, 0x60533b];    // dark olive-brown, wet mud
  var SADDLE = [0x342c1f, 0x3d3425];              // dark bars down the back
  var FLANK  = [0x7d6c4c, 0x887658];
  var SPECK  = [0x9fb6c4, 0xb9c6cf];              // the pale blue-grey flecks
  var BELLY  = [0xded4bb, 0xd0c5a9];
  var FIN    = [0x6b5c40, 0x5f5238];
  var FIN_ED = [0xc2b391, 0xcfc2a3];
  var SAIL   = [0x4a3f2b, 0x564a34];              // the display dorsal, darker
  var EYE    = [0x121010, 0x0b0a09];
  var EYELID = [0x8a7a5c];                        // the pale rim around a bulging eye

  /* ---------- the body ----------
     Blunter and more cylindrical than a swimming goby: a mudskipper is
     built to be propped up, not to be fast. The taper to the tail stays
     long, because the tail is what flicks it into a skip. */
  function body() {
    var pos = sweep({
      len: 1.0, rad: 0.125, seg: 9, rings: 8, round: 2.3,
      aspectY: 1.0, aspectZ: 0.86, jitter: 0.07, seed: 5, centred: true,
      profile: ramp([[0, 0.70], [0.12, 1.0], [0.36, 1.0], [0.62, 0.74], [0.86, 0.36], [1, 0.20]]),
      // the head rides HIGHER than the tail — an animal holding itself up
      curveY: function (t) { return 0.016 * (1 - t) * (1 - t); }
    });
    return geom(pos, colorize(pos, function (t, u, i) {
      if (u < 0.30) return pk(BELLY, i);
      if (u > 0.70 && hash(i, 11, 2) > 0.55) return pk(SADDLE, i);
      if (hash(i, 23, 7) > 0.90) return pk(SPECK, i);      // the flecks
      if (u > 0.60) return pk(BACK, i);
      return pk(FLANK, i);
    }));
  }

  /* The eye: a bulging dome, not a flush dot. Built centred so the
     behaviour file drops it on top of the head. */
  function eye() {
    var pos = sweep({
      len: 0.085, rad: 0.050, seg: 7, rings: 4, round: 2.0,
      jitter: 0.05, seed: 13, centred: true,
      profile: ramp([[0, 0.55], [0.5, 1.0], [1, 0.60]])
    });
    return geom(pos, colorize(pos, function (t, u, i) {
      return (t < 0.2 || t > 0.85) ? pk([EYELID[0]], i) : pk(EYE, i);
    }));
  }

  /* Caudal fin — a broad rounded paddle. It does two jobs here: sculls
     in water, and flicks against the mud to launch a skip. */
  function tailFin() {
    var pos = blade({
      len: 0.27, half: 0.14, thick: 0.014, steps: 5, jitter: 0.12, seed: 17,
      outline: ramp([[0, 0.32], [0.45, 0.88], [1, 1.0]])
    });
    return geom(pos, colorize(pos, function (t, u, i) {
      return t > 0.72 ? pk(FIN_ED, i) : pk(FIN, i);
    }));
  }

  /* First dorsal — the sail. Taller and squarer than a swimming goby's,
     because this one gets flown as a flag. */
  function dorsalSail() {
    var pos = blade({
      len: 1.0, half: 0.5, thick: 0.012, steps: 5, jitter: 0.10, seed: 23,
      outline: ramp([[0, 0.55], [0.3, 1.0], [0.75, 0.95], [1, 0.5]])
    });
    return geom(pos, colorize(pos, function (t, u, i) {
      return u > 0.70 ? pk(FIN_ED, i) : pk(SAIL, i);
    }));
  }

  /* Second dorsal — the long low one behind it. */
  function dorsalFin() {
    var pos = blade({
      len: 1.0, half: 0.5, thick: 0.010, steps: 5, jitter: 0.10, seed: 29,
      outline: ramp([[0, 0.35], [0.4, 0.95], [0.8, 0.85], [1, 0.40]])
    });
    return geom(pos, colorize(pos, function (t, u, i) {
      return u > 0.66 ? pk(FIN_ED, i) : pk(FIN, i);
    }));
  }

  /* Pectoral fin — the arm. Thicker at the base than a swimming goby's
     and blunter at the tip: this is a limb the animal puts its weight
     on, and it reads wrong if it looks like a membrane. */
  function pectoralFin() {
    var pos = sweep({
      len: 1.0, rad: 0.115, seg: 7, rings: 5, round: 2.5,
      aspectY: 0.55, jitter: 0.10, seed: 31,
      profile: ramp([[0, 1.0], [0.45, 0.86], [0.8, 0.66], [1, 0.42]])
    });
    return geom(pos, colorize(pos, function (t, u, i) {
      return t > 0.72 ? pk(FIN_ED, i) : (u < 0.35 ? pk(BELLY, i) : pk(FIN, i));
    }));
  }

  var cache = null;
  function parts() {
    if (cache) return cache;
    cache = {
      body: body(),
      eye: eye(),
      tailFin: tailFin(),
      dorsalSail: dorsalSail(),
      dorsalFin: dorsalFin(),
      pectoralFin: pectoralFin()
    };
    return cache;
  }

  window.MudskipperBody = { parts: parts, material: Facet.material };
})();
