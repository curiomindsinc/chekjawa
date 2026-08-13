/* ============================================================
   rocks.js — the shore boulders, built the same way as the mangroves
   (voxmesh.js: rasterise to a voxel grid, mesh only the exposed faces).

   They were the last thing still using Voxel.build: ~190 boulders of 3–5
   boxes each was ~760 Meshes, and nearly the whole scene's draw-call
   budget. Six geometries now cover the lot.

   OPPOSITE INSTANCING CHOICE TO THE MANGROVES. Trees are individual
   Meshes because there are only ~46 and they need to stay raycastable
   for a clickable v2 species. Rocks are far more numerous and nothing
   will ever click one — they are terrain furniture — so they render as
   an InstancedMesh per variant: six draw calls for the whole field.

   Their positions are still published (world.rocks) because barnacles
   and nerites will need to sit ON them; that lookup must not depend on
   how they happen to be drawn.
   ============================================================ */
(function () {
  'use strict';

  var V = 0.25;                    // metres per voxel — finer than the trees, rocks are smaller

  /* Weathered intertidal rock: grey-brown, damp and dark at the base,
     bleached on top, with a pale crust of shell and barnacle on the upward
     faces (which is also a hint of the barnacle zone this band is named for). */
  var ROCK_MID  = [0x8a8478, 0x7d7669, 0x938c7e, 0x847d70];
  var ROCK_DARK = [0x5f594e, 0x6b6459, 0x554f46];        // shaded / permanently damp
  var ROCK_PALE = [0x9e9789, 0xa8a294];                  // sun-bleached upper faces
  var CRUST     = [0xc3bcab, 0xd0c9b6, 0xb5ae9d];        // shell / barnacle crust

  var noise3 = VoxMesh.noise3, pick = VoxMesh.pick;

  /* One boulder: a few overlapping ellipsoid lobes, with the surface
     threshold perturbed by noise so the silhouette is lumpy rather than a
     clean blob. Lobes are what stop it reading as an egg. */
  function boulder(seed, rx, ry, rz, lobeCount) {
    var g = new VoxMesh.Grid(V);
    var lobes = [], i;
    for (i = 0; i < lobeCount; i++) {
      var n1 = noise3(seed, i, 1), n2 = noise3(seed, i, 2), n3 = noise3(seed, i, 3);
      var n4 = noise3(seed, i, 4), n5 = noise3(seed, i, 5), n6 = noise3(seed, i, 6);
      lobes.push({
        cx: (n1 - 0.5) * rx * 0.9,
        cy: n2 * ry * 0.45,
        cz: (n3 - 0.5) * rz * 0.9,
        rx: rx * (0.55 + n4 * 0.45),
        ry: ry * (0.55 + n5 * 0.45),
        rz: rz * (0.55 + n6 * 0.45)
      });
    }

    var bx = Math.ceil(rx * 1.6), by = Math.ceil(ry * 1.6), bz = Math.ceil(rz * 1.6);
    for (var x = -bx; x <= bx; x++) {
      for (var y = 0; y <= by; y++) {
        for (var z = -bz; z <= bz; z++) {
          var inside = false;
          for (i = 0; i < lobes.length; i++) {
            var L = lobes[i];
            var q = Math.pow((x - L.cx) / L.rx, 2) +
                    Math.pow((y - L.cy) / L.ry, 2) +
                    Math.pow((z - L.cz) / L.rz, 2);
            // noise on the threshold, not the radius — cheaper and it pits
            // the surface instead of just wobbling the whole outline
            if (q < 1 + (noise3(x * 0.9, y * 0.9, z * 0.9 + seed) - 0.5) * 0.45) {
              inside = true; break;
            }
          }
          if (!inside) continue;
          var t = y / Math.max(1, by);                     // 0 at the foot, 1 at the crown
          var pal = t < 0.3 ? ROCK_DARK : (t > 0.68 ? ROCK_PALE : ROCK_MID);
          g.set(x, y, z, pick(pal, x, y, z));
        }
      }
    }

    /* Crust pass. Has to run AFTER the shape is filled, because "is this cell
       on the top surface" needs the finished occupancy — that is exactly what
       Grid.forEach is for. */
    var crust = [];
    g.forEach(function (x, y, z) {
      if (g.has(x, y + 1, z)) return;                      // not an upward face
      if (y < by * 0.35) return;                           // only the upper half crusts over
      if (noise3(x * 2.1, y * 2.1, z * 2.1 + seed) > 0.72) crust.push([x, y, z]);
    });
    for (i = 0; i < crust.length; i++) {
      g.set(crust[i][0], crust[i][1], crust[i][2], pick(CRUST, crust[i][0], crust[i][1], crust[i][2]));
    }

    // centre it horizontally so placement rotation spins about the rock, not its corner
    return g.build();
  }

  var cache = null;
  /* Six shapes: a couple of squat slabs, a couple of rounded lumps, a tall
     one and a long one. Placement adds rotation and scale on top, so six
     is plenty of variety for a field of a couple of hundred. */
  function variants() {
    if (!cache) {
      /* Height is ~0.6–1.0x the width. The first pass used ~0.4 and the whole
         band read as scattered pancakes lying on the mud rather than rocks
         sitting in it — on a near-flat shore seen from above, a boulder's
         height is most of what tells you it is a boulder. */
      cache = [
        boulder(11, 5.5, 3.6, 4.5, 3),     // squat slab
        boulder(23, 4.0, 3.8, 3.6, 4),     // rounded lump
        boulder(37, 7.0, 3.2, 3.4, 3),     // long ridge
        boulder(52, 3.4, 5.2, 3.0, 4),     // tall knuckle
        boulder(68, 5.0, 4.2, 5.2, 5),     // broad clustered lump
        boulder(81, 2.8, 2.4, 2.6, 3)      // small cobble
      ];
    }
    return cache;
  }

  var mat = null;
  function material() {
    if (!mat) mat = new THREE.MeshLambertMaterial({ vertexColors: true });
    return mat;
  }

  window.Rocks = { variants: variants, material: material, VOXEL: V };
})();
