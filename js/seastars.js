/* ============================================================
   seastars.js — the knobbly sea stars (BUILD_GUIDE §1, §6).

   Sixth organism, and the one this shore is known for. Chek Jawa's
   mascot only shows up on the lowest spring tides, and that is not a
   detail to smooth over — it is the reason those tides draw crowds.
   So this species is deliberately RARE and deliberately LOW: a handful
   of animals in the 0.3–0.9 m band, which the water only leaves on a
   spring low. Most of the time you have to go looking for them.

     creep    submerged. Crawls the lagoon floor on tube feet, slower
              than anything else here.
     retreat  the water is thinning. Works down-shore toward depth.
     exposed  left dry, and LYING THERE. This is the state the crowds
              come for — see the note below.
     bury     it has been out too long. Settles into wet sand.
     buried   under, waiting out the low.

   EXPOSED IS NOT A FAILURE STATE. The first pass had a stranded star
   start burying immediately, which was defensible and completely wrong
   for this shore: the whole reason people walk Chek Jawa on a spring
   low is that knobbly sea stars are lying out ON the drained flat, in
   the open, waiting. Burying is what happens when the exposure drags
   on — so each animal carries its own patience, and the flat keeps its
   scatter of orange stars through the low.

   `stranding` (§6) is null — but that is a modelling choice with a real
   caveat, and it is worth stating plainly: a stranded sea star in full
   sun does die, and in 2007 prolonged rain killed much of this shore's
   population (§10, the deferred monsoon event). What is modelled here
   is the ordinary tide, which this animal handles by burying. The
   mortality path belongs with the salinity scalar, not here.

   NO FACING. Every other animal on this shore points somewhere. This
   one is radial: five arms at 72°, no front, no yaw to steer. It
   creeps in a direction without turning to face it, which is exactly
   what a sea star looks like and falls out of the model for free.

   RENDERING. Three InstancedMeshes — disc, arms (5 each), knobs (20
   each). At this population that is a few hundred instances for the
   most-photographed animal on the shore, which is the right place to
   spend them.
   ============================================================ */
(function () {
  'use strict';

  /* ---------- the knobs ---------- */
  var S = 0.75;                 // metres per body unit — arm span. A real one is ~30 cm
  var COUNT = 15;               // rare on purpose: the spring-low animal
  var ZONE = [0.3, 0.9];        // metres CD — guide §1, the lagoon
  var Z_RANGE = [-6, 62];       // seaward of the flat
  var CREEP = 0.035;            // m/s — slower than every other animal here
  var RETREAT = 0.075;          // m/s — a sea star hurrying is still slow
  var THIN = 0.12;              // metres of water below which it starts working for depth
  var BURY_SECS = 5.0;          // sinking into wet sand takes a while
  var PATIENCE = [40, 110];     // seconds it will lie exposed before bothering to bury
  var SPACING = 4.0;            // metres — they are not gregarious
  var ARMS = 5;
  var KNOBS_PER_ARM = 4;

  var seed = 606060;
  function rand() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
  function range(a, b) { return a + rand() * (b - a); }

  var AXIS_X = new THREE.Vector3(1, 0, 0);
  var UP = new THREE.Vector3(0, 1, 0);
  var FWD = new THREE.Vector3(0, 0, 1);

  /* Body layout, in body units. */
  var ARM_LEN = 0.46;           // centre to tip
  var ARM_THICK = 1.0;
  var DISC_LIFT = 0.10;         // disc centre above the sand

  function spawn(scene, world) {
    var P = SeaStarBody.parts();
    var mat = SeaStarBody.material();

    var group = new THREE.Group();
    group.name = 'knobbly-sea-stars';
    scene.add(group);

    /* ---------- placement ---------- */
    function onRock(x, z) {
      for (var i = 0; i < world.rocks.length; i++) {
        var r = world.rocks[i];
        var dx = r.x - x, dz = r.z - z;
        if (dx * dx + dz * dz < (r.r + 1.0) * (r.r + 1.0)) return true;
      }
      return false;
    }

    var stars = [];
    var halfX = world.simArea.halfX - 8;
    var guard = 0;
    while (stars.length < COUNT && guard++ < COUNT * 900) {
      var x = range(-halfX, halfX);
      var z = range(Z_RANGE[0], Z_RANGE[1]);
      var h = world.heightAt(x, z);
      if (h < ZONE[0] || h > ZONE[1]) continue;
      if (onRock(x, z)) continue;
      var clash = false;
      for (var si = 0; si < stars.length; si++) {
        var o = stars[si];
        if ((o.x - x) * (o.x - x) + (o.z - z) * (o.z - z) < SPACING * SPACING) { clash = true; break; }
      }
      if (clash) continue;

      stars.push({
        x: x, y: h, z: z,
        spin: range(0, Math.PI * 2),      // which way the arms happen to lie. Not a facing.
        dir: range(0, Math.PI * 2),       // the direction the tube feet are pulling
        state: 'buried',
        patience: range(PATIENCE[0], PATIENCE[1]),   // how long it will lie out before digging in
        dryFor: 0,
        turn: range(3, 12),               // seconds before it drifts onto a new line
        wave: rand(),                     // arm-flex phase
        sink: 1,                          // 1 under the sand .. 0 clear on top
        size: range(0.82, 1.16),
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
      disc: slots(P.disc, 1, true),
      arm:  slots(P.arm, ARMS, true),
      knob: slots(P.knob, ARMS * KNOBS_PER_ARM)
    };

    var tint = new THREE.Color();
    for (var i = 0; i < N; i++) {
      // sea stars vary a lot in tone: some almost brick, some sandy
      var g = range(0.80, 1.15);
      tint.setRGB(g * range(1.0, 1.08), g * range(0.92, 1.0), g * range(0.86, 0.98));
      for (var key in R) {
        for (var j = 0; j < R[key].per; j++) R[key].mesh.setColorAt(i * R[key].per + j, tint);
      }
    }
    for (var k in R) if (R[k].mesh.instanceColor) R[k].mesh.instanceColor.needsUpdate = true;

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
      for (a = 0; a < ARMS * KNOBS_PER_ARM; a++) R.knob.mesh.setMatrixAt(si * ARMS * KNOBS_PER_ARM + a, HIDE);
    }

    /* ------------------------------------------------------------
       draw

       The disc is built along +X, so the body basis stands +X up and
       the arms lie in the body's Y-Z plane, spaced 72° apart. Each arm
       flexes on its own phase — a live sea star is never quite flat,
       and that slow, uneven lift is the only motion it has.
       ------------------------------------------------------------ */
    function draw(s, si) {
      var sc = S * s.size;
      var floorY = world.heightAt(s.x, s.z);
      var y = floorY + DISC_LIFT * sc * (1 - s.sink) - 0.14 * sc * s.sink;

      eul.set(0, s.spin, 0, 'YZX');
      qb.setFromEuler(eul);
      mBody.compose(root.set(s.x, y, s.z), qb, tmp.set(sc, sc, sc));

      // disc: stand it up on +X so its flat faces are up and down
      xa.set(1, 0, 0);
      putCentred(R.disc, si, root.set(0, 0, 0), 1);

      var base = si * ARMS, kbase = si * ARMS * KNOBS_PER_ARM;
      for (var a = 0; a < ARMS; a++) {
        var ang = (a / ARMS) * Math.PI * 2;
        /* Arm lift: each on its own phase, and damped right down while
           buried so a half-sunk animal does not wave at you. */
        var lift = (0.10 + 0.10 * Math.sin((s.wave + a / ARMS) * Math.PI * 2)) * (1 - s.sink);
        var cx = Math.cos(ang), cz = Math.sin(ang);
        dir.set(cx, lift, cz).normalize();
        root.set(cx * 0.10, 0.02, cz * 0.10);        // arms start at the disc's rim
        put(R.arm, base + a, root, dir, ARM_LEN, ARM_THICK);

        /* Knobs ride the arm: spaced along it, shrinking toward the
           tip, sitting proud of the upper surface. */
        for (var kk = 0; kk < KNOBS_PER_ARM; kk++) {
          var f = 0.22 + kk * 0.22;
          var kscale = 1.05 - kk * 0.18;
          root.set(
            cx * (0.10 + ARM_LEN * f),
            0.02 + lift * ARM_LEN * f + 0.055 * kscale,
            cz * (0.10 + ARM_LEN * f)
          );
          put(R.knob, kbase + a * KNOBS_PER_ARM + kk, root, UP, kscale, kscale);
        }
      }
    }

    /* ------------------------------------------------------------
       where to go

       It is not looking for food — a knobbly sea star eats sponges and
       whatever dead matter it finds, and modelling that needs prey this
       shore does not have yet. It is looking for WATER: the one thing
       that decides whether it lives on the flat or under it. So the
       rule is simply "creep, and when the water thins, creep toward
       depth", which is what following the ebb into the lagoon is.
       ------------------------------------------------------------ */
    var TRIES = 6;
    function pickDeeper(s) {
      var bestA = null, bestDepth = -Infinity;
      for (var t = 0; t < TRIES; t++) {
        var a = range(0, Math.PI * 2);
        var nx = s.x + Math.sin(a) * 1.6, nz = s.z + Math.cos(a) * 1.6;
        if (!world.inSimArea(nx, nz)) continue;
        var surf = world.waterAt(nx, nz);
        if (surf === null) continue;
        var depth = surf - world.heightAt(nx, nz);
        if (depth > bestDepth) { bestDepth = depth; bestA = a; }
      }
      if (bestA !== null) s.dir = bestA;
      return bestA !== null;
    }

    function creepStep(s, dt, speed) {
      var nx = s.x + Math.sin(s.dir) * speed * dt;
      var nz = s.z + Math.cos(s.dir) * speed * dt;
      if (!world.inSimArea(nx, nz)) { s.dir += 2.4; return; }
      var h = world.heightAt(nx, nz);
      if (h < ZONE[0] - 0.5 || h > ZONE[1] + 0.4) { s.dir += 2.0; return; }
      s.x = nx; s.z = nz;
    }

    /* ------------------------------------------------------------
       update
       ------------------------------------------------------------ */
    function update(dt) {
      var touched = false;

      for (var si = 0; si < N; si++) {
        var s = stars[si];
        var surf = world.waterAt(s.x, s.z);
        var floorY = world.heightAt(s.x, s.z);
        var depth = surf === null ? -1 : surf - floorY;

        if (surf === null) {
          /* Dry. Lie there first — the spring-low sight this shore is
             known for — and only start digging once this individual's
             patience runs out. */
          s.dryFor += dt;
          if (s.dryFor < s.patience) {
            s.state = 'exposed';
            s.sink = Math.max(0, s.sink - dt / BURY_SECS);   // finish surfacing if it was under
            s.wave += dt * 0.05;                              // barely moving, but not dead
            if (s.wave > 1) s.wave -= 1;
          } else {
            s.state = s.sink >= 1 ? 'buried' : 'bury';
            s.sink = Math.min(1, s.sink + dt / BURY_SECS);
          }
        } else {
          s.dryFor = 0;
          if (s.sink > 0) s.sink = Math.max(0, s.sink - dt / (BURY_SECS * 0.8));
          s.wave += dt * 0.22;
          if (s.wave > 1) s.wave -= 1;
          s.spin += dt * 0.05 * (s.size - 1);          // a slow, barely-there rotation

          if (depth < THIN) {
            // the water is going. Work toward whatever is deeper.
            s.state = 'retreat';
            if (!pickDeeper(s)) s.dir += 1.7;
            creepStep(s, dt, RETREAT);
          } else {
            s.state = 'creep';
            s.turn -= dt;
            if (s.turn <= 0) { s.turn = range(4, 14); s.dir += range(-1.1, 1.1); }
            creepStep(s, dt, CREEP);
          }
        }

        s.y = world.heightAt(s.x, s.z);

        if (s.state === 'buried') {
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
      // how many are out on the lagoon floor — what a spring low reveals
      showing: function () {
        var n = 0;
        for (var i2 = 0; i2 < N; i2++) if (stars[i2].state !== 'buried') n++;
        return n;
      },
      // the postcard: stars lying out on drained sand
      exposed: function () {
        var n = 0;
        for (var i3 = 0; i3 < N; i3++) if (stars[i3].state === 'exposed') n++;
        return n;
      }
    };
  }

  window.SeaStars = { spawn: spawn };
})();
