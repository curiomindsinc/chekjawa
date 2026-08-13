/* ============================================================
   rockfield.js — the rock surface, as the animals that live on it
   need to see it.

   world.rocks publishes {x, z, r, top} per boulder (world.js), which is
   where they are, not what their surface is. Two species so far have
   to stand ON that surface at an angle — barnacles cemented to it,
   nerites crawling over it — and both needed the same three things:

     which boulders are worth living on   (in the band, big enough,
                                           and not buried in another)
     a surface point at (bearing, radius) on one
     the outward normal there

   The second species is where it got lifted out, same rule as facet.js:
   two copies of a model is where a shared file starts paying.

   THE MODEL. A boulder is an ELLIPSOID CAP: radius r at the ground,
   rising to `top` at the centre. Real boulders are lumpy piles of
   voxels (rocks.js), so the cap is deliberately conservative —

     r is worked INSIDE                  the real rock has usually
                                         stopped short of its bounding
                                         radius, and an animal placed
                                         out there hangs in mid-air
     the cap is sunk by `inset`          so a foot or a shell base
                                         meets stone instead of floating
                                         a centimetre above it
     engulfed boulders are dropped       rocks are scattered without
                                         overlap checks, so a small
                                         cobble can sit entirely inside
                                         a big boulder. Animals given
                                         that cobble are drawn correctly
                                         and are INSIDE solid rock,
                                         which reads as "the species
                                         didn't spawn"

   That last one cost a debugging pass: eight snails, projecting to the
   middle of the screen, drawn every frame, invisible.
   ============================================================ */
(function () {
  'use strict';

  /* Boulders an animal can live on.

     opts: zone   [lo, hi] metres CD — the cap must cross this band
           minR   smallest bounding radius worth using
           minH   smallest cap height worth using
           inset  metres to sink the cap surface by
           shrink fraction of the bounding radius to work inside */
  function usable(world, opts) {
    var zone = opts.zone;
    var minR = opts.minR === undefined ? 0.4 : opts.minR;
    var minH = opts.minH === undefined ? 0.25 : opts.minH;
    var inset = opts.inset === undefined ? 0.05 : opts.inset;
    var shrink = opts.shrink === undefined ? 0.82 : opts.shrink;

    var all = world.rocks, out = [], i, j;
    for (i = 0; i < all.length; i++) {
      var rk = all[i];
      var base = world.heightAt(rk.x, rk.z);
      if (rk.top < zone[0] || base > zone[1]) continue;
      if (rk.top - base < minH || rk.r < minR) continue;

      // buried inside a bigger, taller neighbour? then it has no surface
      var engulfed = false;
      for (j = 0; j < all.length; j++) {
        if (j === i) continue;
        var o = all[j];
        if (o.r <= rk.r || o.top <= rk.top) continue;
        var dx = o.x - rk.x, dz = o.z - rk.z;
        if (dx * dx + dz * dz < (o.r - rk.r * 0.5) * (o.r - rk.r * 0.5)) { engulfed = true; break; }
      }
      if (engulfed) continue;

      out.push({
        x: rk.x, z: rk.z,
        r: rk.r * shrink,
        base: base,
        h: (rk.top - base) - inset
      });
    }
    return out;
  }

  /* Surface point and outward normal on a cap, at radial distance d and
     bearing a. `out` is any object with x/y/z/nx/ny/nz — the caller's
     own animal record, so this allocates nothing per frame. */
  function capPoint(rk, d, a, out) {
    var f = Math.max(0, 1 - (d / rk.r) * (d / rk.r));
    var y = rk.base + rk.h * Math.sqrt(f);
    out.x = rk.x + Math.cos(a) * d;
    out.z = rk.z + Math.sin(a) * d;
    out.y = y;
    /* Ellipsoid gradient. A flat cap (small h, wide r) gives a nearly
       vertical normal; a tall one leans the animal out over the side,
       which is what a barnacle field on a boulder actually looks like. */
    var rr = rk.r * rk.r, hh = rk.h * rk.h || 1e-4;
    var gx = 2 * (Math.cos(a) * d) / rr;
    var gz = 2 * (Math.sin(a) * d) / rr;
    var gy = 2 * (y - rk.base) / hh;
    var L = Math.hypot(gx, gy, gz) || 1;
    out.nx = gx / L; out.ny = gy / L; out.nz = gz / L;
    return out;
  }

  window.RockField = { usable: usable, capPoint: capPoint };
})();
