/* ============================================================
   conchbody.js — the dog conch's parts.

   facet.js kit. Body units with the shell's LENGTH = 1.0, parts
   root-at-origin along +X. Unlike the barnacle and the nerite, +X here
   is the animal's forward axis, not "up off the rock" — a conch lives
   on sand and points somewhere.

   Three things make a shell read as a dog conch rather than as a
   generic sea snail, and all three are in here:

     the spire       a short cone at the back. Not a spike; this is a
                     heavy, blunt shell.
     the shoulder    the widest point sits well forward of centre, which
                     is what gives it the lopsided fusiform outline.
     the flared lip  the thickened wing along one side of the aperture.
                     It is the animal's armour and the single most
                     recognisable thing about it — an adult conch is too
                     wide and too thick for most crab claws.

   The stalked eyes are a real detail worth drawing: they are proper
   lens eyes on long stalks, closer to a fish's than a garden snail's,
   and they sit high enough to clear the sand.

   Colour is polished cream and tan with brown flame markings, and a
   glossy near-white aperture lip — the shell people pick up off this
   shore and take home.
   ============================================================ */
(function () {
  'use strict';

  var hash = Facet.hash, ramp = Facet.ramp, pk = Facet.pick;
  var sweep = Facet.sweep, blade = Facet.blade;
  var colorize = Facet.colorize, geom = Facet.geom;

  /* ---------- palette ---------- */
  var SHELL = [0xd9c9a4, 0xcdbc95, 0xe3d4b1];    // polished cream
  var FLAME = [0x9c7645, 0x8a6739, 0xa88350];    // the brown markings
  var SPIRE = [0xb6a487, 0xa8977a];              // worn spire, rubbed dull
  var LIP   = [0xf3ebd9, 0xece2cc];              // glossy aperture
  var FOOT  = [0xb0a089, 0xbcac93];
  var STALK = [0xa8977e];
  var EYE   = [0x191512, 0x0f0d0b];

  /* ---------- the shell ----------
     Widest a third of the way forward, tapering to the anterior canal
     at the front and to the spire at the back. */
  function shell() {
    var pos = sweep({
      len: 1.0, rad: 0.235, seg: 9, rings: 8, round: 2.2,
      aspectY: 0.90, aspectZ: 0.82, jitter: 0.07, seed: 83, centred: true,
      /* A spindle, not a ball. The widest point is well forward of centre
         and BOTH ends come to a point — the anterior canal at the front,
         the spire at the back. An earlier profile peaked at 1.0 over a
         third of the length and the animal read as a faceted pebble. */
      profile: ramp([[0, 0.06], [0.12, 0.46], [0.38, 1.0], [0.62, 0.80], [0.84, 0.40], [1, 0.08]])
    });
    return geom(pos, colorize(pos, function (t, u, i) {
      if (t > 0.86) return pk(SPIRE, i);
      // flame markings: hashed diagonal bands down the whorl
      if (hash(i, 13, 4) > 0.66) return pk(FLAME, i);
      return pk(SHELL, i);
    }));
  }

  /* The flared lip: a thick wing that runs along the aperture side.
     Built as a blade so it hugs the shell instead of sticking out of
     it like a fin. */
  function lip() {
    var pos = blade({
      len: 1.0, half: 0.5, thick: 0.10, steps: 6, jitter: 0.10, seed: 89,
      outline: ramp([[0, 0.25], [0.35, 0.95], [0.7, 1.0], [1, 0.35]]),
      sweepY: function (t) { return -0.08 * Math.sin(t * Math.PI); }
    });
    return geom(pos, colorize(pos, function (t, u, i) {
      return u > 0.55 ? pk(SHELL, i) : pk(LIP, i);
    }));
  }

  /* The foot. In a conch this is a muscular pole, not a creeping sole —
     it plants and vaults. Short, thick and blunt. */
  function foot() {
    var pos = sweep({
      len: 0.52, rad: 0.16, seg: 7, rings: 4, round: 2.4,
      aspectY: 0.75, jitter: 0.08, seed: 97,
      profile: ramp([[0, 0.9], [0.5, 1.0], [1, 0.55]])
    });
    return geom(pos, colorize(pos, function (t, u, i) { return pk(FOOT, i); }));
  }

  function eyestalk() {
    var pos = sweep({
      len: 1.0, rad: 0.045, seg: 5, rings: 3, round: 2,
      jitter: 0.08, seed: 101,
      profile: ramp([[0, 1.0], [0.7, 0.85], [1, 0.7]])
    });
    return geom(pos, colorize(pos, function (t, u, i) { return pk(STALK, i); }));
  }

  function eye() {
    var pos = sweep({
      len: 0.075, rad: 0.055, seg: 7, rings: 3, round: 2.1,
      jitter: 0.05, seed: 103, centred: true
    });
    return geom(pos, colorize(pos, function (t, u, i) { return pk(EYE, i); }));
  }

  var cache = null;
  function parts() {
    if (cache) return cache;
    cache = { shell: shell(), lip: lip(), foot: foot(), eyestalk: eyestalk(), eye: eye() };
    return cache;
  }

  window.ConchBody = { parts: parts, material: Facet.material };
})();
