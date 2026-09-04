/* ============================================================
   spongebody.js — the encrusting sponge's parts.

   facet.js kit, but only for the palette and the material — the body
   itself is hand-rolled, for the same reason sanddollarbody.js's test
   is: `Facet.colorize` reads a triangle's position along a sweep and
   up it, two axes, and this animal needs a THIRD — the angle about
   its own centre, for the concentric growth rings a real encrusting
   sponge actually carries. Body units with the CUSHION'S DIAMETER =
   1.0, and +X is "up off the rock" — the barnacle's convention
   (barnaclebody.js), because this is cemented the same way.

   ONE PART, NOT A HANDFUL. Nothing about a sponge moves — no trapdoor,
   no valve, no cirri — so there is nothing here to root at the origin
   and aim per frame. `cushion()` is the entire animal: a low dome
   built from concentric rings exactly like the sand dollar's test
   (sanddollarbody.js), tagged per triangle with (radius, angle) so
   `paint()` can lay real growth bands round the centre instead of a
   sweep gradient, plus a scatter of raised OSCULA — the exhalant
   pores every sponge pumps water back out through — as small hashed
   spikes in the height field itself, not just a colour dot, so they
   catch the light.

   ONE SURFACE ONLY. A sand dollar can be turned over by a wave and
   needs both faces; a sponge is cemented for life and nothing will
   ever see its underside, so the dome is wound outward and stops
   there — half sanddollarbody.js's triangle count for the same
   silhouette.

   Colour is warm terracotta orange, the commonest encrusting sponge
   colour on a real tropical flat, banded into rings a shade darker at
   the edges of each and speckled with dark maroon oscula.
   ============================================================ */
(function () {
  'use strict';

  var hash = Facet.hash, pk = Facet.pick, geom = Facet.geom;

  /* ---------- palette ---------- */
  var BASE  = [0xb5622e, 0xc16f38, 0xa85826, 0xbd6a34];   // terracotta orange
  var BAND  = [0x8f4a22, 0x9c521f, 0x854218];              // a growth ring, one shade down
  var OSC   = [0x5c2a1a, 0x4d2214];                         // the oscula, dark maroon

  var RAD = 0.5;
  var SEG = 22;
  var RINGS = [0, 0.10, 0.24, 0.40, 0.56, 0.72, 0.86, 1.0];
  var HEIGHT = 0.24;            // dome height at the centre, relative to a 1.0 diameter
  var RING_BANDS = 5;           // how many concentric colour bands cross the cushion
  var BUMP_H = 0.055;           // how far an osculum spike stands proud of the cushion

  function heightAt(u) { return HEIGHT * Math.pow(Math.max(0, 1 - u * u), 0.62); }

  /* The dome, plus a per-triangle `osc` flag for paint() to key off. */
  function cushion() {
    var pos = [], osc = [];
    function tri(a, b, c, o) {
      pos.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
      osc.push(o);
    }

    var ring = [], bumped = [];
    var r, q;
    for (r = 0; r < RINGS.length; r++) {
      var u = RINGS[r], rr = u * RAD;
      var row = [], brow = [];
      for (q = 0; q < SEG; q++) {
        var th = q / SEG * Math.PI * 2;
        var jr = 1 + (hash(r, q, 5501) - 0.5) * 0.10;
        var y = Math.cos(th) * rr * jr, z = Math.sin(th) * rr * jr;
        var isOsc = u > 0.14 && u < 0.80 && hash(r, q, 5507) > 0.86;
        var h = heightAt(u) + (isOsc ? BUMP_H * (0.7 + hash(r, q, 5511) * 0.6) : 0);
        row.push([h, y, z]);
        brow.push(isOsc);
      }
      ring.push(row);
      bumped.push(brow);
    }

    for (r = 0; r < RINGS.length - 1; r++) {
      for (q = 0; q < SEG; q++) {
        var q2 = (q + 1) % SEG;
        var i0 = ring[r][q], o0 = ring[r + 1][q];
        var i1 = ring[r][q2], o1 = ring[r + 1][q2];
        var isO = bumped[r][q] || bumped[r][q2] || bumped[r + 1][q] || bumped[r + 1][q2];
        // radial-outward then counter-clockwise: +X normal, the same
        // winding rule sanddollarbody.js's top face uses
        tri(i0, o0, o1, isO);
        tri(i0, o1, i1, isO);
      }
    }
    return { pos: pos, osc: osc };
  }

  /* Per-triangle colour in (radius, angle, osculum-flag). */
  function paint(d) {
    var pos = d.pos, oscf = d.osc;
    var col = new Float32Array(pos.length);
    var c = new THREE.Color();
    for (var i = 0; i < pos.length; i += 9) {
      var ti = i / 9;
      var cy = (pos[i + 1] + pos[i + 4] + pos[i + 7]) / 3;
      var cz = (pos[i + 2] + pos[i + 5] + pos[i + 8]) / 3;
      var u = Math.hypot(cy, cz) / RAD;
      if (oscf[ti]) {
        c.setHex(pk(OSC, ti));
      } else {
        var band = Math.floor(u * RING_BANDS);
        c.setHex(band % 2 === 0 ? pk(BASE, ti) : pk(BAND, ti));
      }
      for (var k = 0; k < 3; k++) {
        col[i + k * 3] = c.r;
        col[i + k * 3 + 1] = c.g;
        col[i + k * 3 + 2] = c.b;
      }
    }
    return col;
  }

  function body() {
    var d = cushion();
    return geom(d.pos, paint(d));
  }

  var cache = null;
  function parts() {
    if (cache) return cache;
    cache = { cushion: body() };
    return cache;
  }

  window.SpongeBody = { parts: parts, material: Facet.material };
})();
