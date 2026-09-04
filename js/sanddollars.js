/* ============================================================
   sanddollars.js — the sand dollars (BUILD_GUIDE §31).

   The second deposit feeder on the shore, and the first animal here
   that is USUALLY NOT VISIBLE.

   Every other species in this build is a body you can follow. This
   one spends most of the tide ploughing along a centimetre under the
   sand, so what the camera can see of it is a low mound travelling
   very slowly across the lagoon floor — an animal you infer rather
   than watch. That was the interesting part of building it, and the
   whole design falls out of one number:

     bury   1 fully under, mound up over it
            0 lying clear on the drained sand, petals showing

   Nothing else switches. The test is drawn every frame at every
   value of `bury`; it is simply below the terrain surface for most of
   them, and the mound's scale is `bury` too, so it shrinks away
   exactly as the animal comes out from under it. No second model, no
   swap, no pop.

     plough   submerged, moving. Sediment in at the front, worked
              over, out behind — the mound is the only tell
     feed     submerged, stopped on a patch worth working
     strand   the water has gone. It settles, the sand comes off it,
              and for the length of a spring low it is a visible
              animal with five petals on its back

   WHY IT IS WORTH THE SLOT. §1 asked for the sand dollar because it
   reaches the tape meadow's band (seagrass.js, 0.0–1.0 m CD) from
   below, and because a shore with only one deposit feeder makes the
   fiddler crab look like the definition of the guild rather than one
   answer to it. The fiddler works exposed mud with a claw at low
   water; this works submerged sand with its whole underside at high
   water. Same trophic row, opposite half of the cycle.

   RENDERING. Two InstancedMeshes for the whole population. It is by
   a wide margin the cheapest animal in the build.
   ============================================================ */
(function () {
  'use strict';

  /* ---------- the knobs ---------- */
  var S = 0.40;                 // metres per body unit — test diameter 1.0, a ~7 cm animal exaggerated
  var COUNT = 50;
  var ZONE = [0.05, 0.95];      // metres CD — the low flat, the lagoon and the runnel
  var Z_RANGE = [26, 62];
  var SPACING = 1.6;

  var PLOUGH = 0.013;           // m/s. Deliberately the slowest mover on the shore
  var TURN_SECS = [6, 18];      // it holds a line for a long time
  var FEED_SECS = [4, 14];
  var MOVE_SECS = [10, 30];

  var BURY_SECS = 5.0;          // how long it takes to work under, or to come clear
  var STRAND_BURY = 0.10;       // how much sand is left over a stranded animal
  var GRAZE_RATE = 0.010;       // film units per second while ploughing (§7, retuned §32)
  var BARE = 0.06;              // nothing left here to take at all
  var SPENT = 0.18;             // worked out — move on. Two marks with a gap, per §25
  var GOOD = 0.35;              // rich enough to stop and work over

  var seed = 918273;
  function rand() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
  function range(a, b) { return a + rand() * (b - a); }

  var THICK = 0.13;             // must match sanddollarbody.js's test length

  function spawn(scene, world) {
    var P = SandDollarBody.parts();
    var mat = SandDollarBody.material();

    var group = new THREE.Group();
    group.name = 'sand-dollars';
    scene.add(group);

    function onRock(x, z) {
      for (var i = 0; i < world.rocks.length; i++) {
        var r = world.rocks[i];
        var dx = r.x - x, dz = r.z - z;
        if (dx * dx + dz * dz < (r.r + 0.8) * (r.r + 0.8)) return true;
      }
      return false;
    }
    function legal(x, z) {
      if (!world.inSimArea(x, z)) return false;
      var h = world.heightAt(x, z);
      if (h < ZONE[0] || h > ZONE[1]) return false;
      return !onRock(x, z);
    }

    var halfX = world.simArea.halfX - 8;
    var dollars = [];
    var guard = 0;
    while (dollars.length < COUNT && guard++ < COUNT * 400) {
      var x = range(-halfX, halfX);
      var z = range(Z_RANGE[0], Z_RANGE[1]);
      if (!legal(x, z)) continue;
      var clash = false;
      for (var di = 0; di < dollars.length; di++) {
        var o = dollars[di];
        if ((o.x - x) * (o.x - x) + (o.z - z) * (o.z - z) < SPACING * SPACING) { clash = true; break; }
      }
      if (clash) continue;
      dollars.push({
        x: x, y: world.heightAt(x, z), z: z,
        yaw: range(0, Math.PI * 2),
        tilt: range(-0.09, 0.09),          // it lies almost, but not quite, flat
        roll: range(-0.09, 0.09),
        state: 'plough',
        bury: 1,
        timer: range(0, MOVE_SECS[1]),
        turn: range(0, TURN_SECS[1]),
        size: range(0.78, 1.22)
      });
    }
    var N = dollars.length;

    function slots(geo, shadow) {
      var m = new THREE.InstancedMesh(geo, mat, Math.max(N, 1));
      m.frustumCulled = false;
      m.castShadow = !!shadow;
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      group.add(m);
      return { mesh: m };
    }
    var R = { test: slots(P.test, true), mound: slots(P.mound, true) };

    var tint = new THREE.Color();
    for (var i = 0; i < N; i++) {
      var g = range(0.88, 1.10);
      tint.setRGB(g * range(0.98, 1.05), g, g * range(0.94, 1.02));
      R.test.mesh.setColorAt(i, tint);
      // the mound is sediment, not animal: it gets its own, tighter, spread
      var g2 = range(0.94, 1.06);
      tint.setRGB(g2, g2 * range(0.99, 1.02), g2 * range(0.97, 1.01));
      R.mound.mesh.setColorAt(i, tint);
    }
    for (var kc in R) if (R[kc].mesh.instanceColor) R[kc].mesh.instanceColor.needsUpdate = true;

    var mBody = new THREE.Matrix4();
    var root = new THREE.Vector3(), tmp = new THREE.Vector3();
    var qb = new THREE.Quaternion(), eul = new THREE.Euler();
    var HIDE = new THREE.Matrix4().makeScale(0, 0, 0);

    /* ------------------------------------------------------------
       draw

       The test's axis is +X and +X here means UP, so the body Euler
       has to stand the part on end: a Z rotation of +PI/2 sends +X to
       +Y. `yaw` then spins the petals about that axis — which for
       this animal is the ONLY thing yaw does, since a disc has no
       front. (The usual -90 trap, §20/§21/§27/§30, in its one form
       that is not a bug: here the quarter turn is deliberate.)
       ------------------------------------------------------------ */
    function draw(d, di) {
      var sc = S * d.size;
      var floorY = world.heightAt(d.x, d.z);

      // 0 = bottom of the test resting on the sand, 1 = whole test under it
      var y = floorY + THICK * 0.5 * sc - d.bury * (THICK * sc + 0.015);

      eul.set(d.tilt, d.yaw, Math.PI * 0.5 + d.roll, 'YXZ');
      qb.setFromEuler(eul);
      mBody.compose(root.set(d.x, y, d.z), qb, tmp.set(sc, sc, sc));
      R.test.mesh.setMatrixAt(di, mBody);

      if (d.bury < 0.06) {
        R.mound.mesh.setMatrixAt(di, HIDE);
        return;
      }
      /* The mound is the sand ON TOP of it, so it scales with `bury` in
         EVERY axis, not just height. The first pass kept the footprint
         nearly constant on the theory that a shallow-buried animal
         still displaces a disc's width of sediment — and the result was
         a 52 cm sand blister sitting on top of a 40 cm animal at the
         exact moment the animal was supposed to be on show. If it is
         out of the sand, the sand is not there. */
      eul.set(0, d.yaw * 0.7, Math.PI * 0.5, 'YXZ');
      qb.setFromEuler(eul);
      var mb = sc * d.bury;
      mBody.compose(root.set(d.x, floorY - 0.01, d.z), qb, tmp.set(mb, mb * 1.06, mb * 1.06));
      R.mound.mesh.setMatrixAt(di, mBody);
    }

    function step(d, dist) {
      var nx = d.x + Math.sin(d.yaw) * dist;
      var nz = d.z + Math.cos(d.yaw) * dist;
      if (!legal(nx, nz)) { d.yaw += 2.3; d.turn = Math.min(d.turn, 1.0); return; }
      d.x = nx; d.z = nz;
      d.y = world.heightAt(nx, nz);
    }

    /* ------------------------------------------------------------
       update
       ------------------------------------------------------------ */
    function update(dt) {
      for (var di = 0; di < N; di++) {
        var d = dollars[di];
        var surf = world.waterAt(d.x, d.z);
        var wet = surf !== null;

        if (!wet) {
          /* Drained. It cannot follow the water — nothing moving at a
             centimetre a second can — so it stops where it stands and
             the sand drains off it. This is the only time it is a
             visible animal, and on this shore that means spring lows. */
          d.state = 'strand';
          d.bury += (STRAND_BURY - d.bury) * Math.min(1, dt / (BURY_SECS * 0.45));
        } else {
          d.bury += (1 - d.bury) * Math.min(1, dt / (BURY_SECS * 0.8));

          var here = world.filmAt(d.x, d.z);
          if (here > BARE) world.grazeFilm(d.x, d.z, GRAZE_RATE * dt);

          d.timer -= dt;
          if (d.state === 'plough') {
            d.turn -= dt;
            if (d.turn <= 0) { d.turn = range(TURN_SECS[0], TURN_SECS[1]); d.yaw += range(-0.9, 0.9); }
            step(d, PLOUGH * dt);
            /* It stops on anything rich, and ONLY on anything rich. A
               deposit feeder is not chasing a patch, it is deciding
               whether the sand it has already got in its mouth is worth
               another minute — but the first version of this also
               stopped whenever the travel timer ran out, whatever it
               was standing on. Twelve tide cycles of measurement put
               the film under these animals at 0.155 against a control
               of 0.94 and FLAT, which is the signature of a population
               parked in the hole it has eaten rather than one moving
               through the sediment (§32). The timer now only re-rolls;
               the sand decides. */
            if (here > GOOD) {
              d.state = 'feed';
              d.timer = range(FEED_SECS[0], FEED_SECS[1]);
            } else if (d.timer <= 0) {
              d.timer = range(MOVE_SECS[0], MOVE_SECS[1]);
            }
          } else {
            // and it leaves as soon as the spot is worked out, not just on a clock
            if (d.timer <= 0 || here <= SPENT) {
              d.state = 'plough';
              d.timer = range(MOVE_SECS[0], MOVE_SECS[1]);
            }
          }
        }

        d.y = world.heightAt(d.x, d.z);
        draw(d, di);
      }
      R.test.mesh.instanceMatrix.needsUpdate = true;
      R.mound.mesh.instanceMatrix.needsUpdate = true;
    }

    update(0.0001);

    return {
      count: N,
      group: group,
      dollars: dollars,
      update: update,
      // how many are lying clear of the sand — the spring-low payoff
      showing: function () {
        var n = 0;
        for (var i2 = 0; i2 < N; i2++) if (dollars[i2].bury < 0.4) n++;
        return n;
      }
    };
  }

  window.SandDollars = { spawn: spawn };
})();
