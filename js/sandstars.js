/* ============================================================
   sandstars.js — the sand stars (BUILD_GUIDE §32).

   The second sea star, and the argument for it is speed. §23's
   knobbly is the postcard: rare, enormous, slower than anything else
   here, and the whole point of it is that it LIES THERE on a spring
   low for people to walk out and see. Build a second star that also
   creeps and you have built a recolour.

   So this one is the opposite animal on the axis that shows:

     quarter  a long straight run across the sand. Four times the
              knobbly's creep — this is the fastest sea star there is,
              and on this shore it is the only thing in the lagoon
              that moves at a pace you notice
     probe    stopped, disc humped, arm tips curled down into the
              sediment. It hunts buried prey by feel, so the hunting
              looks like digging
     sink     working itself under
     buried   gone. Only the arm edges break the surface

   IT IS A PREDATOR THAT NEVER CATCHES ANYTHING, and that is §30's
   decision applied again rather than dodged. An Astropecten swallows
   small buried molluscs whole, and this shore has no infauna to
   swallow — so what is modelled is the SEARCH, which is the part that
   shows: quarter, stop, dig, move on. The food web lists what the
   animal eats because the catalog describes the shore, not the
   simulation's bookkeeping.

   MOSTLY BURIED IS THE POINT, AND IT IS NOT THE SAND DOLLAR (§31).
   The sand dollar is under the surface almost always and you follow a
   travelling mound; this one is on top while it works and vanishes
   when it stops, so the two read as opposite halves of the same
   habit. `sink` is the sand dollar's `bury` number by another name —
   the same one-value trick, no second model.

   NO FACING, same as §23: five arms at 72°, no front, and `dir` is
   where the tube feet are pulling rather than where the animal is
   pointed. But this one holds a LINE — a quartering star that
   wandered would read as a slow one.

   RENDERING. Three InstancedMeshes: disc, arms (5 each), marginal
   spines (5 x 8 each).
   ============================================================ */
(function () {
  'use strict';

  /* ---------- the knobs ---------- */
  var S = 0.46;                 // metres per body unit — arm span. Smaller than the knobbly's 0.75
  var COUNT = 24;               // and far commoner: this is the ordinary star of the flat
  var ZONE = [0.15, 1.00];      // metres CD — the low flat and the lagoon edge
  var Z_RANGE = [18, 62];
  var SPACING = 2.2;

  var GLIDE = 0.135;            // m/s — four times the knobbly's creep
  var RUN_SECS = [8, 22];       // how long it holds one line
  var PROBE_SECS = [3, 9];      // stopped, digging
  var DRIFT = 0.16;             // radians of heading drift per second — it runs very nearly straight

  var SINK_SECS = 3.2;          // faster under than the knobbly: this one is built for it
  var REST_BURY = [18, 55];     // seconds it will work before dropping out of sight for a while
  var HIDE_SECS = [10, 30];     // and how long it stays under

  var ARMS = 5;
  var SPINES_PER_ARM = 8;       // four a side, down both edges

  var seed = 8080123;
  function rand() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
  function range(a, b) { return a + rand() * (b - a); }

  var UP = new THREE.Vector3(0, 1, 0);
  var FWD = new THREE.Vector3(0, 0, 1);

  /* Body layout, in body units. */
  var ARM_LEN = 0.44;
  var DISC_LIFT = 0.05;         // it lies far flatter than the knobbly's 0.10

  function spawn(scene, world) {
    var P = SandStarBody.parts();
    var mat = SandStarBody.material();

    var group = new THREE.Group();
    group.name = 'sand-stars';
    scene.add(group);

    function onRock(x, z) {
      for (var i = 0; i < world.rocks.length; i++) {
        var r = world.rocks[i];
        var dx = r.x - x, dz = r.z - z;
        if (dx * dx + dz * dz < (r.r + 0.9) * (r.r + 0.9)) return true;
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
    var stars = [];
    var guard = 0;
    while (stars.length < COUNT && guard++ < COUNT * 500) {
      var x = range(-halfX, halfX);
      var z = range(Z_RANGE[0], Z_RANGE[1]);
      if (!legal(x, z)) continue;
      var clash = false;
      for (var si = 0; si < stars.length; si++) {
        var o = stars[si];
        if ((o.x - x) * (o.x - x) + (o.z - z) * (o.z - z) < SPACING * SPACING) { clash = true; break; }
      }
      if (clash) continue;
      stars.push({
        x: x, y: world.heightAt(x, z), z: z,
        spin: range(0, Math.PI * 2),      // which way the arms happen to lie. Not a facing.
        dir: range(0, Math.PI * 2),       // where the tube feet are pulling
        state: 'buried',
        timer: range(0, RUN_SECS[1]),
        working: range(0, HIDE_SECS[1]),  // starts under, on a staggered clock
        hump: 0,                          // 0 flat .. 1 disc raised, arm tips down in the sand
        sink: 1,                          // 1 under the sand .. 0 clear on top
        wave: rand(),
        size: range(0.80, 1.20),
        vis: false
      });
    }
    var N = stars.length;

    function slots(geo, per, shadow) {
      var m = new THREE.InstancedMesh(geo, mat, Math.max(N * per, 1));
      m.frustumCulled = false;
      m.castShadow = !!shadow;
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      group.add(m);
      return { mesh: m, per: per };
    }
    var R = {
      disc:  slots(P.disc, 1, true),
      arm:   slots(P.arm, ARMS, true),
      spine: slots(P.spine, ARMS * SPINES_PER_ARM)
    };

    var tint = new THREE.Color();
    for (var i = 0; i < N; i++) {
      // sand stars vary far less than knobblies — they are all the colour of sand
      var g = range(0.90, 1.08);
      tint.setRGB(g * range(0.99, 1.04), g, g * range(0.94, 1.01));
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
    function hide(si) {
      R.disc.mesh.setMatrixAt(si, HIDE);
      var a;
      for (a = 0; a < ARMS; a++) R.arm.mesh.setMatrixAt(si * ARMS + a, HIDE);
      for (a = 0; a < ARMS * SPINES_PER_ARM; a++) {
        R.spine.mesh.setMatrixAt(si * ARMS * SPINES_PER_ARM + a, HIDE);
      }
    }

    /* ------------------------------------------------------------
       draw

       Two poses blended by `hump`. Running, the animal is pressed flat
       and the arms lie level. Probing, the disc lifts and the arm tips
       curl DOWN into the sediment — a digging star is a star standing
       on its own arm tips, and that shape is the only tell that the
       hunting is happening.

       `sink` drops the whole body below the sand. What stays visible
       longest is the spine comb along the arm edges, which is exactly
       what you find a buried Astropecten by.
       ------------------------------------------------------------ */
    function draw(s, si) {
      var sc = S * s.size;
      var floorY = world.heightAt(s.x, s.z);
      var y = floorY + (DISC_LIFT + 0.10 * s.hump) * sc * (1 - s.sink) - 0.13 * sc * s.sink;

      eul.set(0, s.spin, 0, 'YZX');
      qb.setFromEuler(eul);
      mBody.compose(root.set(s.x, y, s.z), qb, tmp.set(sc, sc, sc));

      putCentred(R.disc, si, root.set(0, 0, 0), 1);

      var base = si * ARMS, sbase = si * ARMS * SPINES_PER_ARM;
      for (var a = 0; a < ARMS; a++) {
        var ang = (a / ARMS) * Math.PI * 2;
        var cx = Math.cos(ang), cz = Math.sin(ang);
        /* Flat when running, tipped down when probing. A trace of
           per-arm wave so the animal is not a rigid star, but far less
           than the knobbly's — this one is pressed to the ground. */
        var flick = 0.03 * Math.sin((s.wave + a / ARMS) * Math.PI * 2) * (1 - s.sink);
        var tipY = flick - 0.30 * s.hump;   // digging, not standing on tiptoe
        dir.set(cx, tipY, cz).normalize();
        root.set(cx * 0.09, 0.01, cz * 0.09);
        put(R.arm, base + a, root, dir, ARM_LEN, 1);

        /* The spine comb: four a side, down BOTH edges of the arm. The
           side vector is the arm direction turned 90° in the ground
           plane, so the spines splay outward from the blade rather
           than standing up off it. */
        var sx = -cz, sz = cx;
        for (var q = 0; q < SPINES_PER_ARM; q++) {
          var idx = q >> 1;                          // 0..3 along the arm
          var side = (q & 1) ? 1 : -1;
          var f = 0.20 + idx * 0.24;
          var wide = 0.115 * (1 - f * 0.55);         // the arm narrows toward the tip
          root.set(
            cx * (0.09 + ARM_LEN * f) + sx * side * wide,
            0.01 + tipY * ARM_LEN * f,
            cz * (0.09 + ARM_LEN * f) + sz * side * wide
          );
          dir.set(sx * side + cx * 0.25, 0.22, sz * side + cz * 0.25).normalize();
          put(R.spine, sbase + a * SPINES_PER_ARM + q, root, dir, 1.05 - idx * 0.14, 1);
        }
      }
    }

    function glideStep(s, dt) {
      var nx = s.x + Math.sin(s.dir) * GLIDE * dt;
      var nz = s.z + Math.cos(s.dir) * GLIDE * dt;
      if (!legal(nx, nz)) { s.dir += 2.1; return; }
      s.x = nx; s.z = nz;
      s.y = world.heightAt(nx, nz);
    }

    /* ------------------------------------------------------------
       update
       ------------------------------------------------------------ */
    function update(dt) {
      var touched = false;

      for (var si = 0; si < N; si++) {
        var s = stars[si];
        var surf = world.waterAt(s.x, s.z);

        if (surf === null) {
          /* Dry. Straight under — no lying out. That is the §23 star's
             behaviour and the one thing these two must not share: the
             knobbly is the animal a spring low puts ON DISPLAY, and if
             this one did the same the flat would be paved with stars
             and the rare one would stop being rare. */
          s.state = s.sink >= 1 ? 'buried' : 'sink';
          s.sink = Math.min(1, s.sink + dt / SINK_SECS);
          s.hump = Math.max(0, s.hump - dt * 0.8);

        } else if (s.state === 'sink') {
          s.sink = Math.min(1, s.sink + dt / SINK_SECS);
          s.hump = Math.max(0, s.hump - dt * 1.6);
          if (s.sink >= 1) {
            s.state = 'buried';
            s.working = range(HIDE_SECS[0], HIDE_SECS[1]);   // seconds to stay under
          }

        } else if (s.state === 'buried') {
          /* `working` is the one clock, read two ways depending on
             which side of the cycle the animal is on: underground it
             counts down how long it stays hidden, above it counts down
             how long it works before dropping out of sight again. */
          s.working -= dt;
          if (s.working <= 0) {
            s.state = 'quarter';
            s.timer = range(RUN_SECS[0], RUN_SECS[1]);
            s.working = range(REST_BURY[0], REST_BURY[1]);
            s.dir = range(0, Math.PI * 2);
          }

        } else {
          s.sink = Math.max(0, s.sink - dt / (SINK_SECS * 0.8));
          s.wave += dt * 0.5;
          if (s.wave > 1) s.wave -= 1;
          s.working -= dt;
          s.timer -= dt;

          if (s.state === 'probe') {
            s.hump += (1 - s.hump) * Math.min(1, 2.5 * dt);
            if (s.timer <= 0) {
              s.state = 'quarter';
              s.timer = range(RUN_SECS[0], RUN_SECS[1]);
              s.dir += range(-1.2, 1.2);           // a new bearing off the old one
            }
          } else {
            s.state = 'quarter';
            s.hump = Math.max(0, s.hump - dt * 1.6);
            /* Nearly straight. A quartering animal that wandered would
               read as a slow one, and speed is the entire reason this
               species exists. */
            s.dir += range(-DRIFT, DRIFT) * dt;
            glideStep(s, dt);
            if (s.timer <= 0) {
              s.state = 'probe';
              s.timer = range(PROBE_SECS[0], PROBE_SECS[1]);
            }
          }

          // worked long enough: drop out of sight for a while
          if (s.working <= 0) s.state = 'sink';
        }

        s.y = world.heightAt(s.x, s.z);

        if (s.state === 'buried' && s.sink >= 1) {
          if (s.vis) { hide(si); s.vis = false; touched = true; }
          continue;
        }
        draw(s, si);
        s.vis = true;
        touched = true;
      }

      if (touched) for (var k2 in R) R[k2].mesh.instanceMatrix.needsUpdate = true;
    }

    for (i = 0; i < N; i++) hide(i);
    for (var k3 in R) R[k3].mesh.instanceMatrix.needsUpdate = true;

    return {
      count: N,
      group: group,
      stars: stars,
      update: update,
      // how many are up on the sand — this population is mostly not
      showing: function () {
        var n = 0;
        for (var i2 = 0; i2 < N; i2++) if (stars[i2].state !== 'buried') n++;
        return n;
      },
      hunting: function () {
        var n = 0;
        for (var i3 = 0; i3 < N; i3++) if (stars[i3].state === 'probe') n++;
        return n;
      }
    };
  }

  window.SandStars = { spawn: spawn };
})();
