/* ============================================================
   voxmesh.js — voxel model → one indexed geometry.

   Rasterise a shape into a grid of coloured cells, then mesh it by
   emitting ONLY the faces that have empty space next to them. Interior
   cells cost nothing, so a solid blob is as cheap as a hollow one, and
   the result is a single geometry with baked vertex colours instead of
   one Mesh per box (which is what `Voxel.build` does, and what makes it
   unusable for anything with volume — a few thousand boxes per model
   becomes tens of thousands of draw calls once you scatter them).

   Used by mangrove.js and rocks.js.
   ============================================================ */
(function () {
  'use strict';

  /* Deterministic hash noise. Not seeded from the world's rand() stream on
     purpose: models must come out identical no matter how much else got
     built before them. */
  function noise3(x, y, z) {
    var s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
    return s - Math.floor(s);
  }
  function pick(arr, x, y, z) {
    return arr[Math.floor(noise3(x, y, z) * arr.length) % arr.length];
  }

  var FACES = [
    { n: [1, 0, 0],  v: [[1,0,0],[1,1,0],[1,1,1],[1,0,1]] },
    { n: [-1, 0, 0], v: [[0,0,1],[0,1,1],[0,1,0],[0,0,0]] },
    { n: [0, 1, 0],  v: [[0,1,0],[0,1,1],[1,1,1],[1,1,0]] },
    { n: [0, -1, 0], v: [[0,0,1],[0,0,0],[1,0,0],[1,0,1]] },
    { n: [0, 0, 1],  v: [[1,0,1],[1,1,1],[0,1,1],[0,0,1]] },
    { n: [0, 0, -1], v: [[0,0,0],[0,1,0],[1,1,0],[1,0,0]] }
  ];

  function Grid(voxelSize, opts) {
    this.V = voxelSize || 0.3;
    this.cells = {};
    this.clampGround = !(opts && opts.allowBelowZero);   // models sit on y=0 by default
  }

  Grid.prototype.set = function (x, y, z, c) {
    x = Math.round(x); y = Math.round(y); z = Math.round(z);
    if (this.clampGround && y < 0) return;
    this.cells[x + '|' + y + '|' + z] = c;
  };
  Grid.prototype.has = function (x, y, z) {
    return this.cells[x + '|' + y + '|' + z] !== undefined;
  };
  Grid.prototype.get = function (x, y, z) {
    return this.cells[x + '|' + y + '|' + z];
  };
  // walk every filled cell — used for surface passes (crust, moss, weathering)
  Grid.prototype.forEach = function (cb) {
    for (var key in this.cells) {
      var p = key.split('|');
      cb(+p[0], +p[1], +p[2], this.cells[key]);
    }
  };

  /* A solid disc of cells, the workhorse for thickening a centreline. */
  Grid.prototype.disc = function (cx, y, cz, r, colors) {
    var ri = Math.ceil(r);
    for (var dx = -ri; dx <= ri; dx++) {
      for (var dz = -ri; dz <= ri; dz++) {
        if (dx * dx + dz * dz > r * r) continue;
        var x = Math.round(cx + dx), z = Math.round(cz + dz);
        this.set(x, y, z, pick(colors, x, y, z));
      }
    }
  };

  Grid.prototype.build = function (opts) {
    opts = opts || {};
    var V = this.V;
    var ox = opts.originX || 0, oy = opts.originY || 0, oz = opts.originZ || 0;
    var pos = [], nor = [], col = [], idx = [], n = 0;
    var c = new THREE.Color();
    for (var key in this.cells) {
      var p = key.split('|');
      var x = +p[0], y = +p[1], z = +p[2];
      c.setHex(this.cells[key]);
      for (var f = 0; f < 6; f++) {
        var F = FACES[f];
        if (this.has(x + F.n[0], y + F.n[1], z + F.n[2])) continue;
        for (var k = 0; k < 4; k++) {
          pos.push((x + F.v[k][0]) * V - ox, (y + F.v[k][1]) * V - oy, (z + F.v[k][2]) * V - oz);
          nor.push(F.n[0], F.n[1], F.n[2]);
          col.push(c.r, c.g, c.b);
        }
        idx.push(n, n + 1, n + 2, n, n + 2, n + 3);
        n += 4;
      }
    }
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setIndex(idx);
    g.computeBoundingBox();
    g.computeBoundingSphere();
    return g;
  };

  window.VoxMesh = { Grid: Grid, noise3: noise3, pick: pick };
})();
