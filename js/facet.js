/* ============================================================
   facet.js — the shared faceted-body kit. EVERY organism on this
   shore is built from this file.

   The look is one decision made once: irregular low-poly solids,
   flat shaded, in the same language as the terrain, the boulders and
   the mangroves. It started life inside crabbody.js for the fiddler
   crab and was lifted out the moment a second species needed it,
   because "all the organisms match" is a promise that survives about
   two species if it lives in a style guide and forever if it lives
   in a function they all call.

   HOW A PART IS BUILT. A ring of points is swept along +X. `profile`
   says how fat the ring is that far along, `round` sets the
   cross-section (2 = circle, 3+ = rounded box — a carapace; below 2
   pinches toward a blade — a fin), aspectY/aspectZ squash it, and
   curveY/curveZ bend the whole sweep: the hook in a claw finger, the
   arch in a fish's back. A deterministic per-vertex wobble stops the
   facets reading as an even stack of slices; it is hashed, not
   random, so every animal of a species wears the same lumps. They
   are one species, not eighty hand-carved models.

   TWO CONVENTIONS EVERY SPECIES FOLLOWS:

   1. BODY UNITS. A part is built at its final size in body units,
      where 1.0 is the species' defining span (carapace width for the
      crab, body length for a fish). The per-animal matrix carries the
      metres-per-unit scale, so each species has exactly one size knob.

   2. LIMBS ARE ROOT-AT-ORIGIN ALONG +X. A limb part starts at the
      origin and extends down +X, so placing one is "point +X at the
      joint direction, scale X to the segment length" and the
      behaviour file never needs to know what shape the part turned
      out to be. Parts that are not limbs pass `centred: true`.

   Colour is baked per-vertex, not per-material: a carapace grades
   blue over pale, a fish grades dark over a white belly, and no
   arrangement of one flat colour per part will do that. One shared
   material for every organism in the scene.

   WINDING IS NOT COSMETIC. The material is FrontSide, so a ring wound
   the wrong way is not shaded dark — it is not drawn at all. The
   first burrow built here lost most of its mesh that way and read as
   a scratch in the mud. sweep() gets this right; anything hand-rolling
   its own rings (see CrabBody.burrow) must check it.
   ============================================================ */
(function () {
  'use strict';

  var TAU = Math.PI * 2;

  function sgn(n) { return n < 0 ? -1 : (n > 0 ? 1 : 0); }

  function hash(a, b, seed) {
    var n = Math.sin(a * 127.1 + b * 311.7 + seed * 74.7) * 43758.5453;
    return n - Math.floor(n);
  }

  /* "How fat is the part, this far along it" — control points, smoothed
     between. The form you can actually read a body shape out of. */
  function ramp(keys) {
    return function (t) {
      for (var i = 1; i < keys.length; i++) {
        if (t <= keys[i][0]) {
          var span = keys[i][0] - keys[i - 1][0];
          var k = span > 0 ? (t - keys[i - 1][0]) / span : 0;
          k = k * k * (3 - 2 * k);
          return keys[i - 1][1] + (keys[i][1] - keys[i - 1][1]) * k;
        }
      }
      return keys[keys.length - 1][1];
    };
  }

  function flat() { return 0; }

  /* Pick from a palette array by a hashed index — the mottling that
     keeps a flat-shaded solid from looking painted. */
  function pk(arr, i) { return arr[Math.floor(hash(i, 7, 3) * arr.length) % arr.length]; }

  /* ------------------------------------------------------------
     One faceted solid, in absolute body units.

     No fit-to-box pass afterwards, deliberately. That matters for the
     curved parts: a finger's hook is a fraction of its LENGTH, and a
     normalise-then-squash step would rescale that hook by the part's
     THICKNESS instead and flatten it to nothing.
     ------------------------------------------------------------ */
  function sweep(o) {
    var seg = o.seg || 8, rings = o.rings || 6;
    var len = o.len, rad = o.rad;
    var profile = o.profile || function () { return 1; };
    var round = o.round || 2;
    var ay = o.aspectY === undefined ? 1 : o.aspectY;
    var az = o.aspectZ === undefined ? 1 : o.aspectZ;
    var cY = o.curveY || flat, cZ = o.curveZ || flat;
    var jitter = o.jitter || 0, seed = o.seed || 0;
    var centred = !!o.centred;
    var p = 2 / round;

    var grid = [], r, c;
    for (r = 0; r <= rings; r++) {
      var t = r / rings;
      var pr = profile(t) * rad;
      var oy = cY(t), oz = cZ(t);
      /* Ends stay put; interior rings shuffle along the sweep a little. */
      var edge = (r === 0 || r === rings);
      var x = t * len + (edge ? 0 : (hash(r, 91, seed) - 0.5) * jitter * len * 0.4);
      if (centred) x -= len * 0.5;
      var row = [];
      for (c = 0; c < seg; c++) {
        var th = c / seg * TAU;
        var cs = Math.cos(th), sn = Math.sin(th);
        var j = 1 + (hash(r, c, seed) - 0.5) * jitter;
        row.push([
          x,
          sgn(cs) * Math.pow(Math.abs(cs), p) * pr * j * ay + oy,
          sgn(sn) * Math.pow(Math.abs(sn), p) * pr * j * az + oz
        ]);
      }
      grid.push(row);
    }

    var pos = [];
    function tri(a, b, cc) {
      pos.push(a[0], a[1], a[2], b[0], b[1], b[2], cc[0], cc[1], cc[2]);
    }
    for (r = 0; r < rings; r++) {
      for (c = 0; c < seg; c++) {
        var c2 = (c + 1) % seg;
        tri(grid[r][c], grid[r + 1][c2], grid[r + 1][c]);
        tri(grid[r][c], grid[r][c2], grid[r + 1][c2]);
      }
    }
    /* Flat fan caps. The cap winding is the OPPOSITE of the side quads'
       — a cap faces along the sweep axis, the sides face away from it.
       Get it wrong and back-face culling eats both ends, which looks
       like a hollow shell you can see straight into. */
    cap(grid[0], -1);
    cap(grid[rings], 1);
    function cap(row, dir) {
      var mx = 0, my = 0, mz = 0, i;
      for (i = 0; i < seg; i++) { mx += row[i][0]; my += row[i][1]; mz += row[i][2]; }
      var mid = [mx / seg, my / seg, mz / seg];
      for (i = 0; i < seg; i++) {
        var a = row[i], b = row[(i + 1) % seg];
        if (dir < 0) tri(mid, b, a); else tri(mid, a, b);
      }
    }
    return pos;
  }

  /* A flat blade — fins, and anything else that is a sheet rather than
     a solid. Two-sided by construction (front and back wound
     opposite) so it survives FrontSide culling from either view, with
     a slight thickness so it does not z-fight with itself.

     `outline(t)` is the half-height of the blade that far along, and
     `sweepY(t)` offsets it — a caudal fin is a blade whose outline
     opens toward the tail, a pectoral is one that sweeps back. */
  function blade(o) {
    var steps = o.steps || 6;
    var len = o.len, half = o.half, thick = (o.thick || 0.02) * 0.5;
    var outline = o.outline || function () { return 1; };
    var sY = o.sweepY || flat, sZ = o.sweepZ || flat;
    var jitter = o.jitter || 0, seed = o.seed || 0;
    var centred = !!o.centred;

    var top = [], bot = [], i;
    for (i = 0; i <= steps; i++) {
      var t = i / steps;
      var x = t * len - (centred ? len * 0.5 : 0);
      var h = outline(t) * half * (1 + (hash(i, 3, seed) - 0.5) * jitter);
      top.push([x, sY(t) + h, sZ(t)]);
      bot.push([x, sY(t) - h, sZ(t)]);
    }
    var pos = [];
    function tri(a, b, c) { pos.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]); }
    function face(sign) {
      var z = sign * thick;
      for (i = 0; i < steps; i++) {
        var a = [top[i][0], top[i][1], top[i][2] + z];
        var b = [top[i + 1][0], top[i + 1][1], top[i + 1][2] + z];
        var c = [bot[i + 1][0], bot[i + 1][1], bot[i + 1][2] + z];
        var d = [bot[i][0], bot[i][1], bot[i][2] + z];
        if (sign > 0) { tri(a, d, c); tri(a, c, b); }
        else { tri(a, b, c); tri(a, c, d); }
      }
    }
    face(1);
    face(-1);
    return pos;
  }

  /* Per-TRIANGLE colour (all three vertices get the same value), chosen
     from where that triangle sits in the part: `t` along the sweep, `u`
     up it, 0..1 both. Flat triangles with one colour each is what makes
     the shading read as facets rather than as a gradient. */
  function colorize(pos, fn) {
    var lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
    var i, k;
    for (i = 0; i < pos.length; i += 3) {
      for (k = 0; k < 3; k++) {
        if (pos[i + k] < lo[k]) lo[k] = pos[i + k];
        if (pos[i + k] > hi[k]) hi[k] = pos[i + k];
      }
    }
    var sx = hi[0] - lo[0] || 1, sy = hi[1] - lo[1] || 1;
    var col = new Float32Array(pos.length);
    var c = new THREE.Color();
    for (i = 0; i < pos.length; i += 9) {
      var cx = (pos[i] + pos[i + 3] + pos[i + 6]) / 3;
      var cy = (pos[i + 1] + pos[i + 4] + pos[i + 7]) / 3;
      var t = (cx - lo[0]) / sx, u = (cy - lo[1]) / sy;
      c.setHex(fn(t, u, i / 9));
      for (k = 0; k < 3; k++) {
        col[i + k * 3] = c.r;
        col[i + k * 3 + 1] = c.g;
        col[i + k * 3 + 2] = c.b;
      }
    }
    return col;
  }

  function geom(pos, col) {
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    /* Non-indexed, so this gives one normal per triangle — the flat
       faceted shading is the whole look. */
    g.computeVertexNormals();
    g.computeBoundingBox();
    g.computeBoundingSphere();
    return g;
  }

  /* THE material. One instance for every organism in the scene, so a
     lighting or shading change lands on all of them at once. */
  var mat = null;
  function material() {
    if (!mat) mat = new THREE.MeshLambertMaterial({ vertexColors: true });
    return mat;
  }

  window.Facet = {
    TAU: TAU,
    hash: hash,
    ramp: ramp,
    pick: pk,
    sweep: sweep,
    blade: blade,
    colorize: colorize,
    geom: geom,
    material: material
  };
})();
