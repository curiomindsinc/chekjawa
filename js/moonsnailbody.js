/* ============================================================
   moonsnailbody.js — the moon snail's parts.

   facet.js kit. Body units with the shell's LENGTH = 1.0, parts
   root-at-origin along +X — a moon snail lives on open sand and
   points somewhere, so it is built like the dog conch (conchbody.js),
   not like the nerite or the barnacle.

   SMOOTH IS THE WHOLE SHELL. Every other gastropod on this shore
   carries some kind of surface event — the conch's flame markings,
   the horn snail's whorl steps, the nerite's zebra bands — because
   each of those animals lives somewhere that rewards or demands one.
   A moon snail ploughs through clean sand its entire life and nothing
   ever catches on its shell, so this is the one shell built to be
   almost featureless on purpose: low jitter, a high `round`, one
   quiet suture line and nothing else. A predator this shore has never
   had needed a silhouette none of the others use.

   THE FOOT IS THE ANIMAL. A real naticid's foot can swell to engulf
   the ENTIRE shell — the reason it can smother a bivalve twice its
   own size and drill it at leisure — and that is too large a change
   to fake with a second part switched in and out. So `foot()` is one
   part and moonsnails.js drives the whole performance off one number,
   its scale: small and tucked in while ploughing, ballooned out to
   several times the shell's own footprint while drilling. Same trick
   the sand dollar's `bury` plays on a single test (sanddollarbody.js),
   turned into flesh instead of sand.

   THE SIPHON is the cheapest tell in the kit, borrowed wholesale from
   every other snail here: a single thin tentacle-like tube, out while
   hunting and withdrawn the instant the animal pulls in.

   `collarSeg` IS NOT PART OF THE ANIMAL. It is one short straight tube,
   placed several times end to end by moonsnails.js to approximate the
   ring a moon snail leaves after it drills — a real sand collar, laid
   down as an egg case cemented with mucus and sand. Modelling a true
   torus for a receipt nobody stands next to was not worth a second
   geometry function; the barnacle's ribs and this shore's whole
   "colour over geometry" economy made the same call at a smaller
   scale (barnaclebody.js).
   ============================================================ */
(function () {
  'use strict';

  var hash = Facet.hash, ramp = Facet.ramp, pk = Facet.pick;
  var sweep = Facet.sweep;
  var colorize = Facet.colorize, geom = Facet.geom;

  /* ---------- palette ---------- */
  var SHELL = [0xd3c7ac, 0xc9bc9d, 0xdccfb2, 0xcec1a4];   // smooth pale tan, glossy
  var BAND  = [0x9c8d6c, 0x8f8060];                        // the one quiet suture line
  var LIP   = [0xece2c8];                                   // the polished aperture
  var FOOT  = [0xa89476, 0xb3a081, 0x9c8969, 0xae9a7b];    // the huge fleshy foot, sand-toned
  var SIPHON= [0x8f7c5e];
  var COLLAR= [0xc7ba9c, 0xbcae90, 0xd0c3a4];              // the sand collar — packed, cemented sand

  /* ---------- the shell ----------
     A globe, not a spindle: the widest point sits near the middle and
     both ends round off rather than coming to points — the exact
     opposite instruction to the conch's shell, which is a spindle for
     the opposite reason. */
  function shell() {
    var pos = sweep({
      len: 1.0, rad: 0.30, seg: 10, rings: 8, round: 2.5,
      aspectY: 1.04, aspectZ: 0.96, jitter: 0.035, seed: 1201, centred: true,
      profile: ramp([[0, 0.16], [0.16, 0.64], [0.46, 1.0], [0.74, 0.90], [1, 0.34]])
    });
    return geom(pos, colorize(pos, function (t, u, i) {
      if (t < 0.06) return LIP[0];
      // one quiet suture, low on the spire — the only surface event this shell gets
      if (t > 0.70 && t < 0.76 && hash(i, 9, 6) > 0.4) return pk(BAND, i);
      return pk(SHELL, i);
    }));
  }

  /* ---------- the foot ----------
     Broad, low and soft — built wide relative to its length so that
     scaling it up in moonsnails.js reads as flesh spreading sideways
     over the sand, not as a ball inflating. */
  function foot() {
    var pos = sweep({
      len: 0.62, rad: 0.34, seg: 9, rings: 5, round: 2.6,
      aspectY: 0.46, jitter: 0.09, seed: 1213,
      profile: ramp([[0, 0.60], [0.30, 1.0], [0.74, 0.92], [1, 0.40]])
    });
    return geom(pos, colorize(pos, function (t, u, i) { return pk(FOOT, i); }));
  }

  /* The siphon: a single thin tube, exactly the nerite's tentacle
     trick, moved to the front of a hunting animal instead of the head
     of a grazing one. */
  function siphon() {
    var pos = sweep({
      len: 1.0, rad: 0.045, seg: 6, rings: 3, round: 2,
      jitter: 0.08, seed: 1217,
      profile: ramp([[0, 1.0], [0.7, 0.7], [1, 0.35]])
    });
    return geom(pos, colorize(pos, function (t, u, i) { return pk(SIPHON, i); }));
  }

  /* One short straight length of sand collar, root-at-origin along
     +X like any other limb part — moonsnails.js chains several end to
     end around a circle. */
  function collarSeg() {
    var pos = sweep({
      len: 1.0, rad: 0.072, seg: 6, rings: 3, round: 2.3,
      jitter: 0.12, seed: 1223,
      profile: ramp([[0, 0.85], [0.5, 1.0], [1, 0.85]])
    });
    return geom(pos, colorize(pos, function (t, u, i) { return pk(COLLAR, i); }));
  }

  var cache = null;
  function parts() {
    if (cache) return cache;
    cache = { shell: shell(), foot: foot(), siphon: siphon(), collarSeg: collarSeg() };
    return cache;
  }

  window.MoonSnailBody = { parts: parts, material: Facet.material };
})();
