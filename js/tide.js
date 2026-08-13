/* ============================================================
   tide.js — the master clock of this biome.

   Everything vertical in this sim is in METRES ABOVE CHART DATUM
   (real Singapore range ~0.0–3.2 m). The voxel heightmap uses the
   same unit, so `columnHeight < tide` means submerged with no
   conversion anywhere. Do not introduce a second vertical unit.

   The curve is a simple sine (one high→low→high every 90 s) times a
   slow spring/neap ENVELOPE. The envelope is what makes the low shore
   real habitat: at neap the water only drops to ~1.0 m and the
   seagrass lagoon stays flooded; at spring it drops to ~0.13 m and the
   lagoon surfaces. That reveal is the payoff moment of the whole biome.

   This file is pure clock. It knows nothing about terrain or pools —
   world.js owns `waterAt(x,z)`, which is what organisms must call.
   ============================================================ */
(function () {
  'use strict';

  var TIDE_CYCLE_SECS   = 90;    // one high→low→high
  var SPRING_CYCLE_SECS = 405;   // envelope repeats every 4.5 tide cycles (~6.75 min)
  var MEAN = 1.6, AMP = 1.5;     // metres above Chart Datum

  /* One OFFSET, shifted instead of rewriting simTime — same trick as
     savanna's setDayPhase. simTime also drives waves, gait and every other
     animation; moving it would make the whole sim jump. Only the tide reads
     this. Note the offset shifts the ENVELOPE too (they share one clock),
     which is exactly what jumpToSpringLow needs. */
  var offset = 0, lastT = 0;

  function envAt(tt) {
    return 0.7 + 0.3 * Math.cos(2 * Math.PI * tt / SPRING_CYCLE_SECS);   // 0.4 .. 1.0
  }
  function heightAt(tt) {
    return MEAN + AMP * envAt(tt) * Math.sin(2 * Math.PI * tt / TIDE_CYCLE_SECS);
  }

  /* ---- public: everything below takes raw simTime and applies the offset ---- */

  function tideAt(t)  { lastT = t; return heightAt(t + offset); }
  function envOf(t)   { return envAt(t + offset); }

  // +1 flooding (coming in), -1 ebbing (going out). Analytic derivative sign;
  // the envelope term is ~100x slower so the sine dominates and a numeric
  // difference would be noise-prone at the turn.
  function dirAt(t) {
    return Math.cos(2 * Math.PI * (t + offset) / TIDE_CYCLE_SECS) >= 0 ? 1 : -1;
  }

  // 0..1 within the current tide cycle. 0 = mean water rising, .25 = high,
  // .5 = mean falling, .75 = low.
  function phaseAt(t) {
    var p = ((t + offset) % TIDE_CYCLE_SECS) / TIDE_CYCLE_SECS;
    return p < 0 ? p + 1 : p;
  }

  // 0 = neap (weakest tides), 1 = spring (biggest). Derived from the envelope
  // so the UI never has to know the envelope formula.
  function springnessAt(t) {
    return (envAt(t + offset) - 0.4) / 0.6;
  }

  function setPhase(f) {
    var want = (((f % 1) + 1) % 1) * TIDE_CYCLE_SECS;
    offset += want - (((lastT + offset) % TIDE_CYCLE_SECS) + TIDE_CYCLE_SECS) % TIDE_CYCLE_SECS;
  }

  /* Jump so the NEXT low is the big one.

     The envelope peak and a tidal low never coincide exactly (405 s is 4.5
     tide cycles, so an envelope peak always lands on mid-water), so there is
     no closed form for "the deepest low". Scan instead: sample two full spring
     cycles, take the global minimum, and re-offset so that instant arrives
     LEAD seconds from now — leaving the water high and visibly falling, rather
     than teleporting to the punchline. */
  var LEAD = 26;   // seconds of ebb the viewer gets to watch before the low
  function jumpToSpringLow() {
    var best = Infinity, bestT = 0;
    for (var s = 0; s <= SPRING_CYCLE_SECS * 2; s += 0.25) {
      var h = heightAt(s);
      if (h < best) { best = h; bestT = s; }
    }
    offset = (bestT - LEAD) - lastT;
    return { height: best, inSecs: LEAD };
  }

  window.Tide = {
    TIDE_CYCLE_SECS: TIDE_CYCLE_SECS,
    SPRING_CYCLE_SECS: SPRING_CYCLE_SECS,
    MEAN: MEAN, AMP: AMP,
    MIN: MEAN - AMP,          // 0.10 — theoretical floor (never quite reached, see jumpToSpringLow)
    MAX: MEAN + AMP,          // 3.10
    at: tideAt,
    dir: dirAt,
    phase: phaseAt,
    envelope: envOf,
    springness: springnessAt,
    setPhase: setPhase,
    jumpToSpringLow: jumpToSpringLow
  };
})();
