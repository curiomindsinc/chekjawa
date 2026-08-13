/* ============================================================
   mangrove.js — the three mangrove trees, built from
   reference/mangrove tree.jpg.

   Note on species: the reference shows arching STILT/PROP roots, which
   are Rhizophora, not the pencil-like pneumatophores of Avicennia that
   the build guide's §4 mentions. Chek Jawa has both; these are built to
   the reference. If Avicennia is wanted later it is a different root
   builder against the same trunk/canopy code.

   WHY THIS ISN'T Voxel.build(): that helper makes one Mesh per box, and
   these trees are a few thousand boxes each — tens of thousands of draw
   calls once they're scattered. Instead each tree is rasterised into a
   voxel occupancy grid and then meshed by emitting ONLY the faces that
   have empty space next to them (see voxmesh.js). A solid canopy of
   ~2 600 cells becomes ~1 100 quads instead of 2 600 boxes, and the whole
   tree is one geometry. Three geometries total, shared by every tree.

   Each tree is its own Mesh rather than an InstancedMesh, deliberately:
   there are only ~46 of them, and individual Meshes stay raycastable for
   when the mangrove becomes a clickable v2 species. Rocks make the
   opposite trade — see rocks.js.
   ============================================================ */
(function () {
  'use strict';

  var V = 0.30;                     // metres per voxel

  /* Palette read off the reference: warm tan roots/bark with darker
     shading, and a bright yellow-green top grading to deep shadow green
     underneath. */
  var BARK = [0xd9b579, 0xc9a05c, 0xb08a4a, 0x8f6e39];
  var LEAF_TOP = [0x9ada2f, 0x8fd429, 0x7cc224];       // sunlit crown
  var LEAF_MID = [0x5fa82a, 0x54992a, 0x69b32c];
  var LEAF_LOW = [0x3b7a20, 0x2f6b1e, 0x2a5c18];       // shaded underside
  var MOSS = [0x4f8a2a, 0x3f7522];                     // algae on the roots

  var h3 = VoxMesh.noise3, pickC = VoxMesh.pick;
  function disc(grid, cx, y, cz, r, colors) { grid.disc(cx, y, cz, r, colors); }

  /* ---------- parts ---------- */

  /* Trunk along a centreline. `lean` bends it as it rises (variants 2 and 3
     are visibly curved in the reference, not poles), and the radius tapers. */
  function trunk(grid, y0, y1, r0, r1, leanX, leanZ, curve) {
    for (var y = y0; y <= y1; y++) {
      var t = (y - y0) / Math.max(1, y1 - y0);
      var bend = curve ? Math.sin(t * Math.PI * 0.9) : t;
      var cx = leanX * bend, cz = leanZ * bend;
      disc(grid, cx, y, cz, r0 + (r1 - r0) * t, BARK);
    }
    return { x: leanX * (curve ? Math.sin(0.9 * Math.PI) : 1), z: leanZ * (curve ? Math.sin(0.9 * Math.PI) : 1) };
  }

  /* An arching prop root: leaves the trunk moving OUTWARD and lands moving
     DOWNWARD, which is the shape that reads as a mangrove. Parametrised so
     the horizontal offset grows fast early (sin) while the drop accelerates
     late (cos) — a straight diagonal strut looks like a tent pole instead. */
  function propRoot(grid, ang, y0, reach, thick, ox, oz) {
    var steps = Math.ceil(y0 * 3);
    /* Roots start OUT on the trunk's flank, not at its centre. Springing them
       all from the axis made every root overlap every other one near the top
       and the cage fused into a solid cone — the reference has clear daylight
       between separate legs, which is most of what makes it read as a
       mangrove rather than a lump. */
    var start = 0.9;
    for (var s = 0; s <= steps; s++) {
      var t = s / steps;
      var rad = start + (reach - start) * Math.sin(t * Math.PI / 2);
      var y = y0 * Math.cos(t * Math.PI / 2);
      var cx = (ox || 0) + Math.cos(ang) * rad;
      var cz = (oz || 0) + Math.sin(ang) * rad;
      // thin for most of the run, flaring only where it takes the weight
      var r = thick * (t < 0.72 ? 1 : 1 + (t - 0.72) * 2.2);
      disc(grid, cx, Math.round(y), cz, r, BARK);
      if (t > 0.55 && h3(cx, y, cz) > 0.9) {          // algae near the waterline
        grid.set(Math.round(cx + 1), Math.round(y), Math.round(cz), pickC(MOSS, cx, y, cz));
      }
    }
  }

  /* A ring of roots with jittered angle and reach. Evenly spaced identical
     legs read as a machined tripod; the variation is what sells it. */
  function rootCage(grid, count, y0, reach, thick, seed) {
    for (var i = 0; i < count; i++) {
      var a = (i / count) * Math.PI * 2 + seed + (h3(i, seed, 0) - 0.5) * 0.5;
      var rr = reach * (0.82 + h3(i, seed, 7) * 0.36);
      var yy = y0 * (0.82 + h3(i, seed, 3) * 0.3);
      propRoot(grid, a, yy, rr, thick);
    }
  }

  /* Canopy: stacked ellipse layers with a domed top and a flat-ish ragged
     underside, filled solid (interior cells are free — see build). Colour is
     driven by height within the mass, so the crown is sunlit and the
     underside is deep shadow green, as in the reference. */
  function canopy(grid, cx, cy, cz, rx, rz, layers, opts) {
    opts = opts || {};
    var sag = opts.sag || 0;              // how far the mass hangs on one side
    var sagDir = opts.sagDir || 0;
    for (var L = 0; L < layers; L++) {
      var t = L / (layers - 1);
      // ellipse profile centred low in the mass: widest just under halfway up
      var prof = Math.sqrt(Math.max(0, 1 - Math.pow((t - 0.42) / 0.72, 2)));
      var lrx = rx * prof, lrz = rz * prof;
      if (lrx < 0.6) continue;
      var y = Math.round(cy + L);
      var ri = Math.ceil(Math.max(lrx, lrz)) + 1;
      for (var dx = -ri; dx <= ri; dx++) {
        for (var dz = -ri; dz <= ri; dz++) {
          // ragged voxel silhouette — a clean ellipse reads as plastic
          var wob = (h3(dx * 0.7, L, dz * 0.7) - 0.5) * 2.1;
          var q = (dx * dx) / (lrx * lrx + 0.001) + (dz * dz) / (lrz * lrz + 0.001);
          if (q > 1 + wob * 0.16) continue;
          var x = Math.round(cx + dx), z = Math.round(cz + dz);
          var pal = t > 0.72 ? LEAF_TOP : (t > 0.34 ? LEAF_MID : LEAF_LOW);
          if (t > 0.72 && h3(x, y, z) > 0.72) pal = LEAF_MID;    // break up the crown
          grid.set(x, y, z, pickC(pal, x, y, z));

          /* A few clumps dangling under the rim. Kept SHORT — an earlier pass
             let these run to six cells and the crown grew green curtains. */
          if (L === 0 && q > 0.45 && h3(x, y + 9, z) > 0.78) {
            var drop = 1 + Math.floor(h3(x, z, y) * 2);
            if (sag > 0 && Math.cos(sagDir) * dx + Math.sin(sagDir) * dz > 0) {
              drop += Math.round(sag * 0.5);
            }
            if (drop > 3) drop = 3;
            for (var d = 1; d <= drop; d++) grid.set(x, y - d, z, pickC(LEAF_LOW, x, y - d, z));
          }
        }
      }
    }
  }

  // a bare limb from the trunk out to a point, used for the forked variant
  function limb(grid, x0, y0, z0, x1, y1, z1, r) {
    var n = Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0)));
    for (var s = 0; s <= n; s++) {
      var t = s / n;
      disc(grid, x0 + (x1 - x0) * t, Math.round(y0 + (y1 - y0) * t), z0 + (z1 - z0) * t, r, BARK);
    }
  }

  /* ============================================================
     the three variants
     ============================================================ */

  // 1 — compact and upright. Single broad flat crown on a straight trunk,
  //     six even prop roots. The "textbook" one.
  function variant1() {
    var g = new VoxMesh.Grid(V);
    rootCage(g, 6, 7, 4.4, 0.62, 0.3);
    // clear length of bare trunk between the root cage and the crown — in the
    // reference that gap is most of variant 1's silhouette
    trunk(g, 0, 17, 1.5, 1.0, 0, 0, false);
    canopy(g, 0, 16, 0, 8.5, 8.0, 6, {});
    return g.build();
  }

  // 2 — tall, leaning, forked. The trunk S-curves and splits; the smaller
  //     branch carries its own crown below and to one side of the main mass.
  function variant2() {
    var g = new VoxMesh.Grid(V);
    rootCage(g, 7, 9, 5.6, 0.62, 0.9);
    var top = trunk(g, 0, 18, 1.6, 1.0, 4.5, -1.5, true);
    // the fork has to be WIDE and the side crown clearly lower, or the two
    // masses merge into one blob and the variant stops being distinguishable
    limb(g, top.x, 16, top.z, top.x - 10, 17, top.z + 3, 0.8);     // side branch
    limb(g, top.x, 17, top.z, top.x + 3, 22, top.z - 1, 0.9);      // main leader
    canopy(g, top.x + 2.5, 21, top.z - 1, 7.5, 6.8, 6, {});        // main crown
    canopy(g, top.x - 10, 16, top.z + 3, 4.8, 4.4, 4, {});         // lower side crown
    return g.build();
  }

  // 3 — the big one. Widest, deepest crown, hanging heavier on one side,
  //     over a tall wide cage of roots.
  function variant3() {
    var g = new VoxMesh.Grid(V);
    // 7 legs, not 9: at this reach nine of them overlap into a solid cone
    rootCage(g, 7, 10, 6.8, 0.6, 0.15);
    var top = trunk(g, 0, 18, 1.7, 1.1, 2.6, 1.2, true);
    limb(g, top.x, 17, top.z, top.x - 3, 20, top.z - 2, 0.9);
    canopy(g, top.x - 1, 19, top.z - 1, 11.5, 9.5, 8, { sag: 2.2, sagDir: Math.PI });
    return g.build();
  }

  var cache = null;
  function variants() {
    if (!cache) cache = [variant1(), variant2(), variant3()];
    return cache;
  }

  /* ---------- pneumatophores ----------
     The pencil-like breathing roots that carpet the mud around a mangrove.
     Strictly these belong to Avicennia / Sonneratia rather than the Rhizophora
     the trees are modelled on, but a Chek Jawa mangrove fringe is mixed and
     the spike field is one of the most recognisable things about it.

     Deliberately NOT baked into the tree geometry: as a separate instanced
     field they follow the terrain (baked in, they would float or sink on the
     slope), they can spread wider than the tree's own footprint, and they can
     carpet the mud BETWEEN trees, which is what the real fringe looks like.

     Finer voxels than the trees (0.15 m vs 0.30) — at the tree scale a spike
     would be a single fat cube. Sized at the tall end of real ones (~0.5–1 m,
     Sonneratia territory) so they read as texture at mid distance instead of
     vanishing. */
  var PV = 0.15;
  var PNEU = [0x5f4e37, 0x6d5b41, 0x53442f, 0x7a6748];
  var PNEU_TIP = [0x8a7a5e, 0x7d6d52];      // weathered, paler tip

  var pneuGeo = null;
  function pneumatophore() {
    if (pneuGeo) return pneuGeo;
    var g = new VoxMesh.Grid(PV);
    var h = 5;
    for (var y = 0; y < h; y++) {
      g.set(0, y, 0, y >= h - 1 ? pickC(PNEU_TIP, 0, y, 0) : pickC(PNEU, 0, y, 0));
    }
    // centre the column on its own axis so instance rotation spins in place
    pneuGeo = g.build({ originX: PV * 0.5, originZ: PV * 0.5 });
    return pneuGeo;
  }

  var mat = null;
  function material() {
    if (!mat) mat = new THREE.MeshLambertMaterial({ vertexColors: true });
    return mat;
  }

  window.Mangrove = {
    variants: variants,
    pneumatophore: pneumatophore,
    material: material,
    VOXEL: V
  };
})();
