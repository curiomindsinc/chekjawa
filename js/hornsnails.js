/* ============================================================
   hornsnails.js — the horn snails (BUILD_GUIDE §31).

   The third biofilm grazer on this shore, and the one that had to
   justify itself. The nerite scrapes rock, the conch works the sand
   flat behind the waterline — a third scraper is only worth building
   if it grazes DIFFERENTLY, and this one does, in two ways.

   1. IT IS A CROWD. Nerites and conches are individuals that happen
      to be near each other; horn snails come in dense aggregations of
      dozens, and the aggregation is the animal you actually see. So
      cohesion is modelled directly (`herd`), and the visible result
      is a grazing FRONT — a patch works itself out, the clump slides
      onto fresher mud, and behind it is a scrubbed halo far bigger
      than any one snail could make.

   2. IT IS THE NERITE INVERTED. A nerite grazes while the rock is WET
      and clamps when the water leaves. A horn snail lives higher, on
      mangrove-fringe mud that stays damp on its own, so it grazes
      while the flat is EXPOSED — and when the water comes up on a
      spring tide it climbs up-shore ahead of it rather than sitting
      there. Same band, same food, opposite clock.

     graze   on film worth eating. Short steps, tight turns
     seek    the patch is worked out. Longer lines, and it pulls
             toward the rest of the clump on the way
     climb   the flood has reached it. Straight up-shore, fast
     seal    caught by the water anyway. Shut, tentacles in

   ZONE. 2.0 – 2.6 m CD, the mangrove fringe and the top of the mud
   flat. That band is only submerged near a SPRING high (tide.js:
   spring high 3.10, neap high 2.20), so on neap days this species
   never climbs at all and on spring days the whole population walks
   up the shore at once. That is the one thing the tide gauge's
   spring button does for it.

   TUNED UNDER REGROWTH. See §25/§28's rule and the numbers at the
   bottom of §31: a confined grazer's rate is set against what its own
   band grows back, not against what looks busy — and this band is the
   slowest-regrowing pasture on the shore (biofilm.js: DRY_RATE 0.12
   applies for most of the cycle up here). Two thresholds, because
   "is there anything left?" and "is this worth staying for?" are
   different questions.

   RENDERING. Three InstancedMeshes: shell, foot, tentacles (2 each).
   A sealed snail is drawn once and then left alone.
   ============================================================ */
(function () {
  'use strict';

  /* ---------- the knobs ---------- */
  var S = 0.22;                 // metres per body unit — shell height 1.0, a ~4 cm snail exaggerated
  var CLUMPS = 18;              // aggregations, not a scatter
  var PER_CLUMP = [7, 15];
  var CLUMP_R = 3.4;            // metres — how wide one aggregation starts
  var ZONE = [2.0, 2.6];        // metres CD — mangrove fringe and the top of the flat
  var Z_RANGE = [-62, -20];

  var CRAWL = 0.028;            // m/s on food — slower than a nerite, and it should look it
  /* Travelling speed had to go UP, and the reason is worth keeping:
     at 0.045 a snail could not cross its own clump's scrubbed halo
     inside one tide cycle, so the aggregation sat in the hole it had
     eaten and the band ran down for thirty cycles straight. A grazer
     has to be able to OUTWALK its own damage. See §31. */
  var SEEK_CRAWL = 0.078;       // m/s crossing worked-out mud — a nerite's travelling pace
  var CLIMB_CRAWL = 0.095;      // m/s ahead of a spring flood — the fastest this animal ever moves

  /* Film per second under the radula. Set against what THIS band grows
     back, not against what looks busy — see the table in §31. */
  var GRAZE_RATE = 0.0014;
  var BARE = 0.05;              // nothing left here at all
  var GOOD = 0.20;              // ...and this much is worth standing still for
  var RASP_SECS = 0.7;

  var HERD_R = 2.6;             // metres — who counts as "the clump"
  var HERD_PULL = 0.75;         // 0..1 how strongly a travelling snail steers into it
  var PERSONAL = 0.30;          // metres — closer than this and it turns away
  var HERD_SLACK = 1.1;         // metres — inside this of the centroid it is already home

  var WET_MARGIN = 0.01;        // water this far over the foot counts as caught
  var CLIMB_DEPTH = 0.22;       // deeper than this and climbing out is no longer an option

  var seed = 3312907;
  function rand() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
  function range(a, b) { return a + rand() * (b - a); }

  var UP = new THREE.Vector3(0, 1, 0);
  var FWD = new THREE.Vector3(0, 0, 1);

  /* Body layout, in body units. The shell is carried spire-up and
     trailing back over the foot, which is how a cerith actually sits —
     same construction as the hermit crab's borrowed shell. */
  var APERTURE = { x: 0.06, y: 0.11 };
  var SHELL_TILT = { x: -0.88, y: 0.47 };
  var FOOT_AT = { x: 0.02, y: 0.05 };
  var TENT_AT = { x: 0.20, y: 0.10, z: 0.05 };
  var TENT_LEN = 0.24;

  function spawn(scene, world) {
    var P = HornSnailBody.parts();
    var mat = HornSnailBody.material();

    var group = new THREE.Group();
    group.name = 'horn-snails';
    scene.add(group);

    function onRock(x, z) {
      for (var i = 0; i < world.rocks.length; i++) {
        var r = world.rocks[i];
        var dx = r.x - x, dz = r.z - z;
        if (dx * dx + dz * dz < (r.r + 0.5) * (r.r + 0.5)) return true;
      }
      return false;
    }
    function legal(x, z) {
      if (!world.inSimArea(x, z)) return false;
      var h = world.heightAt(x, z);
      if (h < ZONE[0] || h > ZONE[1]) return false;
      return !onRock(x, z);
    }

    /* ---------- placement ----------
       Clump centres first, then snails around each one. Scattering
       them evenly over the fringe would be forty metres between
       neighbours and there would be no aggregation to model. */
    var halfX = world.simArea.halfX - 8;
    var snails = [];
    for (var cl = 0; cl < CLUMPS; cl++) {
      var cx = 0, cz = 0, ok = false;
      for (var g = 0; g < 400 && !ok; g++) {
        cx = range(-halfX, halfX);
        cz = range(Z_RANGE[0], Z_RANGE[1]);
        ok = legal(cx, cz);
      }
      if (!ok) continue;
      var want = Math.round(range(PER_CLUMP[0], PER_CLUMP[1]));
      for (var k = 0; k < want; k++) {
        var x = 0, z = 0, placed = false;
        for (var t = 0; t < 60 && !placed; t++) {
          var a = range(0, Math.PI * 2), rr = Math.sqrt(rand()) * CLUMP_R;
          x = cx + Math.cos(a) * rr;
          z = cz + Math.sin(a) * rr;
          placed = legal(x, z);
        }
        if (!placed) continue;
        snails.push({
          x: x, y: world.heightAt(x, z), z: z,
          yaw: range(0, Math.PI * 2),
          state: 'graze',
          feed: 0,                        // 0..1 smoothed "am I getting food"
          rasp: rand(),
          turn: range(0.5, 4),
          out: 1,                         // 0 sealed .. 1 foot and tentacles out
          size: range(0.78, 1.20),
          clump: cl
        });
      }
    }
    var N = snails.length;

    function slots(geo, per, shadow) {
      var m = new THREE.InstancedMesh(geo, mat, Math.max(N * per, 1));
      m.frustumCulled = false;
      m.castShadow = !!shadow;
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      group.add(m);
      return { mesh: m, per: per };
    }
    var R = {
      shell: slots(P.shell, 1, true),
      foot:  slots(P.foot, 1),
      tent:  slots(P.tentacle, 2)
    };

    var tint = new THREE.Color();
    for (var i = 0; i < N; i++) {
      var gg = range(0.80, 1.18);
      tint.setRGB(gg * range(0.97, 1.05), gg, gg * range(0.92, 1.02));
      for (var key in R) {
        for (var j = 0; j < R[key].per; j++) R[key].mesh.setColorAt(i * R[key].per + j, tint);
      }
    }
    for (var kc in R) if (R[kc].mesh.instanceColor) R[kc].mesh.instanceColor.needsUpdate = true;

    /* ---------- placement helpers ---------- */
    var xa = new THREE.Vector3(), ya = new THREE.Vector3(), za = new THREE.Vector3();
    var mPart = new THREE.Matrix4(), mBody = new THREE.Matrix4(), mOut = new THREE.Matrix4();
    var root = new THREE.Vector3(), dir = new THREE.Vector3(), tmp = new THREE.Vector3();
    var qb = new THREE.Quaternion(), eul = new THREE.Euler();
    var HIDE = new THREE.Matrix4().makeScale(0, 0, 0);

    function put(rec, slot, r, d, len, thick) {
      xa.copy(d).normalize();
      tmp.copy(Math.abs(xa.y) > 0.985 ? FWD : UP);
      za.crossVectors(xa, tmp).normalize();
      ya.crossVectors(za, xa).normalize();
      mPart.makeBasis(xa.multiplyScalar(len), ya.multiplyScalar(thick), za.multiplyScalar(thick));
      mPart.setPosition(r);
      mOut.multiplyMatrices(mBody, mPart);
      rec.mesh.setMatrixAt(slot, mOut);
    }
    function putCentred(rec, slot, r, scl) {
      mPart.makeScale(scl, scl, scl);
      mPart.setPosition(r);
      mOut.multiplyMatrices(mBody, mPart);
      rec.mesh.setMatrixAt(slot, mOut);
    }

    /* ------------------------------------------------------------
       draw

       THE -90 (§20, §21, §27, §30). Parts run along +X, `yaw` is a
       atan2(dx, dz) bearing off +Z, so the body Euler is yaw - PI/2.
       ------------------------------------------------------------ */
    function draw(s, si) {
      var sc = S * s.size;
      eul.set(0, s.yaw - Math.PI * 0.5, 0, 'YZX');
      qb.setFromEuler(eul);
      mBody.compose(root.set(s.x, s.y, s.z), qb, tmp.set(sc, sc, sc));

      /* A sealed snail settles a little into the mud; a working one
         lifts its shell clear on the foot. One number, both reads. */
      var lift = 0.02 + 0.05 * s.out;
      var rasping = s.out > 0.2 && s.feed > 0.15;
      var wob = rasping ? Math.sin(s.rasp * Math.PI * 2) * 0.05 : 0;

      dir.set(SHELL_TILT.x, SHELL_TILT.y + wob, 0).normalize();
      root.set(APERTURE.x + dir.x * 0.5, APERTURE.y + lift + dir.y * 0.5, 0);
      put(R.shell, si, root, dir, 1, 1);

      putCentred(R.foot, si, root.set(FOOT_AT.x, FOOT_AT.y + lift * 0.4, 0), s.out * 0.4 + 0.6);

      if (!rasping) {
        R.tent.mesh.setMatrixAt(si * 2, HIDE);
        R.tent.mesh.setMatrixAt(si * 2 + 1, HIDE);
        return;
      }
      for (var q = 0; q < 2; q++) {
        var side = q === 0 ? 1 : -1;
        var swing = Math.sin(s.rasp * Math.PI * 2 + q) * 0.30;
        root.set(TENT_AT.x, TENT_AT.y + lift, side * TENT_AT.z);
        dir.set(0.86 + swing * 0.1, 0.34, side * 0.38).normalize();
        put(R.tent, si * 2 + q, root, dir, TENT_LEN * s.out, 1);
      }
    }

    /* ------------------------------------------------------------
       the clump

       Cohesion with a dead zone in the middle and a shove at very
       close range. Without the dead zone every aggregation collapses
       to a point and stays there; without the shove they stack into
       one shell. Only ever consulted on a turn tick, so this is a few
       thousand distance checks a second across the whole population,
       not per frame.
       ------------------------------------------------------------ */
    var hx = 0, hz = 0, hn = 0, hNear = 0, hNearX = 0, hNearZ = 0;
    function herd(s) {
      hx = 0; hz = 0; hn = 0; hNear = 0; hNearX = 0; hNearZ = 0;
      for (var i2 = 0; i2 < N; i2++) {
        var o = snails[i2];
        if (o === s) continue;
        var dx = o.x - s.x, dz = o.z - s.z;
        var d2 = dx * dx + dz * dz;
        if (d2 > HERD_R * HERD_R) continue;
        hx += o.x; hz += o.z; hn++;
        if (d2 < PERSONAL * PERSONAL) { hNear++; hNearX += dx; hNearZ += dz; }
      }
      if (hn) { hx /= hn; hz /= hn; }
    }

    /* Where to point next. Off its food, the clump is the prior — the
       rest of the aggregation is the best evidence available about
       where the mud is still worth eating.

       UNLESS THE CLUMP IS STANDING IN ITS OWN HOLE, and that check is
       the difference between a grazing front and a mill. Cohesion with
       no escape clause is a trap: the crowd eats out the ground under
       itself, every member then tries to leave, and every member is
       pulled straight back to the middle of the bare patch by the
       others. Thirty tide cycles of that ran the whole band down (§31).

       So: if the ground under the clump's own centre is worked out,
       break OUTWARD instead of inward and hold the line long enough to
       clear the halo. The aggregation disperses, re-forms on fresh mud
       a few metres on, and what it leaves behind is a recovering patch
       — which is what a real grazing front looks like from above. */
    function pickHeading(s) {
      herd(s);
      if (hNear) {
        // too close to a neighbour: turn directly away from the crush
        s.yaw = Math.atan2(-hNearX, -hNearZ) + range(-0.5, 0.5);
        return;
      }
      var wander = s.yaw + range(-1.2, 1.2);
      if (!hn) { s.yaw = wander; return; }

      if (world.filmAt(hx, hz) <= GOOD) {
        var ox = s.x - hx, oz = s.z - hz;
        s.yaw = (ox || oz) ? Math.atan2(ox, oz) + range(-0.6, 0.6) : wander;
        s.turn = range(7, 14);            // long enough to get clear of the halo
        return;
      }

      var dx = hx - s.x, dz = hz - s.z;
      if (Math.hypot(dx, dz) < HERD_SLACK) { s.yaw = wander; return; }
      var toClump = Math.atan2(dx, dz);
      var da = toClump - wander;
      while (da > Math.PI) da -= Math.PI * 2;
      while (da < -Math.PI) da += Math.PI * 2;
      s.yaw = wander + da * HERD_PULL;
    }

    // one step along the heading, turned back at anything illegal
    function step(s, dist) {
      var nx = s.x + Math.sin(s.yaw) * dist;
      var nz = s.z + Math.cos(s.yaw) * dist;
      if (!legal(nx, nz)) { s.yaw += 2.1; s.turn = Math.min(s.turn, 0.4); return; }
      s.x = nx; s.z = nz;
      s.y = world.heightAt(nx, nz);
    }

    /* ------------------------------------------------------------
       grazing — two thresholds, not one (§25)

       BARE answers "is there anything left here at all?" and GOOD
       answers "is it worth standing still for?". One threshold cannot
       do both jobs: set it low and the clump never leaves a patch it
       has already ruined, set it high and it walks off good mud.
       ------------------------------------------------------------ */
    function grazeAt(s, dt) {
      var here = world.filmAt(s.x, s.z);
      if (here > BARE) world.grazeFilm(s.x, s.z, GRAZE_RATE * dt);

      var worth = here > GOOD ? 1 : (here > BARE ? 0.4 : 0);
      s.feed += (worth - s.feed) * Math.min(1, 2.0 * dt);

      if (s.feed > 0.15) {
        s.rasp += dt / RASP_SECS;
        if (s.rasp > 1) s.rasp -= 1;
      }

      var working = s.feed > 0.55;
      s.state = working ? 'graze' : 'seek';
      s.turn -= dt;
      if (s.turn <= 0) {
        if (working) { s.turn = range(1.5, 3.6); s.yaw += range(-1.4, 1.4); }
        else         { s.turn = range(2.4, 5.5); pickHeading(s); }
      }
      step(s, (working ? CRAWL : SEEK_CRAWL) * dt);
    }

    /* ------------------------------------------------------------
       update
       ------------------------------------------------------------ */
    function update(dt) {
      var touched = false;

      for (var si = 0; si < N; si++) {
        var s = snails[si];
        var surf = world.waterAt(s.x, s.z);
        var caught = surf !== null && surf > s.y + WET_MARGIN;

        if (caught) {
          var depth = surf - s.y;
          if (depth < CLIMB_DEPTH) {
            /* Out of the water, up-shore, in a straight line. -z is
               landward on this transect (world.js §4), and on a rising
               spring tide that is the only direction that helps. */
            s.state = 'climb';
            s.yaw = Math.PI + range(-0.25, 0.25);
            step(s, CLIMB_CRAWL * dt);
            s.feed = 0;
          } else {
            // outrun by the flood. Shut, and wait it out under water
            s.state = 'seal';
            s.feed = 0;
          }
        } else {
          grazeAt(s, dt);
        }

        var want = s.state === 'seal' ? 0 : (s.state === 'climb' ? 0.7 : 1);
        var settled = Math.abs(s.out - want) < 0.01;
        if (!settled) {
          s.out += (want - s.out) * Math.min(1, 3.0 * dt);
          if (Math.abs(s.out - want) < 0.01) s.out = want;
        }
        // a sealed, settled snail is as static as the mud it is sitting in
        if (s.state === 'seal' && settled) continue;

        draw(s, si);
        touched = true;
      }

      if (touched) for (var k2 in R) R[k2].mesh.instanceMatrix.needsUpdate = true;
    }

    for (i = 0; i < N; i++) draw(snails[i], i);
    for (var k3 in R) R[k3].mesh.instanceMatrix.needsUpdate = true;

    return {
      count: N,
      group: group,
      snails: snails,
      update: update,
      // how many are actually rasping — the pressure the biofilm meets
      grazing: function () {
        var n = 0;
        for (var i2 = 0; i2 < N; i2++) if (snails[i2].state === 'graze') n++;
        return n;
      },
      // mean film under the population, for tuning against a control band
      filmUnder: function () {
        var f = 0;
        for (var i3 = 0; i3 < N; i3++) f += world.filmAt(snails[i3].x, snails[i3].z);
        return N ? f / N : 0;
      }
    };
  }

  window.HornSnails = { spawn: spawn };
})();
