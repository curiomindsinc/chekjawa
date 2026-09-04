/* ============================================================
   seacucumbers.js — the sea cucumbers (BUILD_GUIDE §32).

   The third deposit feeder, and the one that shows its working.

     feed     stopped on sediment worth eating. The tentacle crown
              wipes the sand and stuffs it into the mouth, and every
              few seconds a CAST comes out the other end
     crawl    that patch is worked out. Moving, slowly, to fresher sand
     hunker   the water has gone. It contracts into a fat lump and
              waits — the one thing a stranded sea cucumber can do

   THE CASTS ARE THE SPECIES. §28 made the fiddler crab's pellets the
   receipt for its grazing rather than set dressing, and this is the
   same idea run the other way. A fiddler works in a ring around a
   fixed hole and the flood erases the whole field twice a day; a sea
   cucumber never comes back, so its casts are a TRAIL, and the ring
   buffer that caps the cost also gives the trail a natural length —
   the oldest coil is overwritten as a new one is laid, so what you
   see behind an animal is the last few minutes of its work fading out
   at the far end. Nothing is spawned, nothing is destroyed, and the
   mesh never grows.

   WHY THE MOUTH END IS ALL OF IT. This is the plainest silhouette on
   the shore: a sausage. What makes it read as alive is the tentacle
   crown sweeping at the front and the coils appearing at the back, so
   both are driven off the SAME phase — a cucumber that is not feeding
   is not casting either, and the two ends of the animal always agree
   about what it is doing.

   NOT THE SAND DOLLAR AGAIN (§31). Both are slow deposit feeders on
   the same low flat, so they had to differ where it shows: the sand
   dollar goes UNDER and you follow a mound, this one stays ON the
   surface and you follow the animal. They also strand differently —
   the sand dollar lies flat and reveals its petals, this one draws
   itself into a lump, which is what a real one does the moment you
   pick it up.

   RENDERING. Five InstancedMeshes: body, papillae (6 each), tentacles
   (8 each), and the cast field.
   ============================================================ */
(function () {
  'use strict';

  /* ---------- the knobs ---------- */
  var S = 0.60;                 // metres per body unit — body length. A real one is ~25 cm
  var COUNT = 40;
  var ZONE = [0.05, 0.90];      // metres CD — the lagoon floor and the low flat
  var Z_RANGE = [28, 62];
  var SPACING = 2.4;

  var CRAWL = 0.030;            // m/s — only the sand dollar is slower
  var TURN_SECS = [5, 16];
  var FEED_SECS = [8, 22];      // how long it will work one patch
  var MOVE_SECS = [6, 18];

  var SWEEP_SECS = 1.6;         // one pass of the tentacle crown
  var CAST_SECS = 3.4;          // seconds of feeding per coil laid
  var CASTS_PER = 10;           // ring buffer — the visible length of the trail

  /* Film units per second. Applied CONTINUOUSLY — see the note in
     update() — so this is much lower than a stop-and-go forager's and
     the intake over a tide works out about the same. */
  var GRAZE_RATE = 0.005;
  var BARE = 0.05;              // nothing left here to take at all
  /* Two marks with a gap between them, not one (§25). It stops on
     sediment above GOOD and moves on when it has worked the spot below
     SPENT; a single threshold makes an animal that stops and starts
     every second frame, which is what the first pass did. */
  var SPENT = 0.16;
  var GOOD = 0.34;

  var PLUMP_SECS = 3.0;         // contracting, or filling back out
  var HUNKER = 0.55;            // how short a contracted animal gets

  var seed = 4242101;
  function rand() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
  function range(a, b) { return a + rand() * (b - a); }

  var UP = new THREE.Vector3(0, 1, 0);
  var FWD = new THREE.Vector3(0, 0, 1);

  /* Body layout, in body units. */
  var BODY_LIFT = 0.15;         // body centre above the sand
  var MOUTH_X = 0.46;           // the front end, where the crown sits
  var CROWN = 8;
  var TENT_LEN = 0.20;
  var PAPS = 6;

  function spawn(scene, world) {
    var P = SeaCucumberBody.parts();
    var mat = SeaCucumberBody.material();

    var group = new THREE.Group();
    group.name = 'sea-cucumbers';
    scene.add(group);

    function onRock(x, z) {
      for (var i = 0; i < world.rocks.length; i++) {
        var r = world.rocks[i];
        var dx = r.x - x, dz = r.z - z;
        if (dx * dx + dz * dz < (r.r + 1.0) * (r.r + 1.0)) return true;
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
    var cukes = [];
    var guard = 0;
    while (cukes.length < COUNT && guard++ < COUNT * 500) {
      var x = range(-halfX, halfX);
      var z = range(Z_RANGE[0], Z_RANGE[1]);
      if (!legal(x, z)) continue;
      var clash = false;
      for (var ki = 0; ki < cukes.length; ki++) {
        var o = cukes[ki];
        if ((o.x - x) * (o.x - x) + (o.z - z) * (o.z - z) < SPACING * SPACING) { clash = true; break; }
      }
      if (clash) continue;
      cukes.push({
        x: x, y: world.heightAt(x, z), z: z,
        yaw: range(0, Math.PI * 2),
        state: 'feed',
        sweep: rand(),                    // tentacle-crown phase
        castT: range(0, CAST_SECS),       // seconds of feeding banked toward the next coil
        cast: 0, casts: 0,                // ring-buffer write slot, and how many are out
        timer: range(0, FEED_SECS[1]),
        turn: range(0, TURN_SECS[1]),
        plump: 1,                         // 1 extended and working .. 0 contracted
        size: range(0.78, 1.24)
      });
    }
    var N = cukes.length;

    function slots(geo, per, shadow) {
      var m = new THREE.InstancedMesh(geo, mat, Math.max(N * per, 1));
      m.frustumCulled = false;
      m.castShadow = !!shadow;
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      group.add(m);
      return { mesh: m, per: per };
    }
    var R = {
      body: slots(P.body, 1, true),
      pap:  slots(P.papilla, PAPS),
      tent: slots(P.tentacle, CROWN)
    };

    var tint = new THREE.Color();
    for (var i = 0; i < N; i++) {
      var g = range(0.78, 1.20);
      tint.setRGB(g * range(1.0, 1.07), g, g * range(0.86, 0.98));
      for (var key in R) {
        for (var j = 0; j < R[key].per; j++) R[key].mesh.setColorAt(i * R[key].per + j, tint);
      }
    }
    for (var kc in R) if (R[kc].mesh.instanceColor) R[kc].mesh.instanceColor.needsUpdate = true;

    /* ---------- the cast field ----------
       Lifted straight from crabs.js's pellet field (§28), with one
       difference that matters: a crab's pellets ring a fixed hole and
       the flood wipes them, so `washPellets` exists. These are laid
       along a path the animal never revisits, so there is nothing to
       wash — the ring buffer alone is what keeps the trail a fixed
       length, and the oldest coil simply becomes the newest one
       somewhere else. */
    var mCast = new THREE.InstancedMesh(P.cast, mat, Math.max(N * CASTS_PER, 1));
    mCast.frustumCulled = false;
    mCast.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    group.add(mCast);
    var cm4 = new THREE.Matrix4(), cq = new THREE.Quaternion();
    var cv = new THREE.Vector3(), csv = new THREE.Vector3();
    var ZERO = new THREE.Vector3(0, 0, 0);
    var castDirty = false;

    function clearCast(slot) {
      cm4.compose(cv.set(0, -999, 0), cq.identity(), ZERO);
      mCast.setMatrixAt(slot, cm4);
      castDirty = true;
    }
    /* One coil, laid at the animal's back end. Behind it, not under it:
       the cast comes out of the anus, which is the far end from the
       mouth that is doing the feeding. */
    function dropCast(c, ci) {
      var slot = ci * CASTS_PER + c.cast;
      c.cast = (c.cast + 1) % CASTS_PER;
      if (c.casts < CASTS_PER) c.casts++;
      var sc = S * c.size;
      var a = c.yaw + Math.PI + range(-0.35, 0.35);
      var px = c.x + Math.sin(a) * 0.52 * sc;
      var pz = c.z + Math.cos(a) * 0.52 * sc;
      cq.setFromAxisAngle(UP, range(0, Math.PI * 2));
      var ps = sc * range(0.72, 1.05);
      cm4.compose(cv.set(px, world.heightAt(px, pz) + 0.02 * sc, pz), cq, csv.set(ps, ps, ps));
      mCast.setMatrixAt(slot, cm4);
      castDirty = true;
    }
    for (i = 0; i < N * CASTS_PER; i++) clearCast(i);
    mCast.instanceMatrix.needsUpdate = true;

    /* ---------- placement helpers ---------- */
    var xa = new THREE.Vector3(), ya = new THREE.Vector3(), za = new THREE.Vector3();
    var mPart = new THREE.Matrix4(), mBody = new THREE.Matrix4(), mOut = new THREE.Matrix4();
    var root = new THREE.Vector3(), dir = new THREE.Vector3(), tmp = new THREE.Vector3();
    var qb = new THREE.Quaternion(), eul = new THREE.Euler();
    var HIDE = new THREE.Matrix4().makeScale(0, 0, 0);

    function put(rec, slot, r, d, len, thick, flatFace) {
      xa.copy(d).normalize();
      if (flatFace) {
        za.copy(FWD).addScaledVector(xa, -FWD.dot(xa));
        if (za.lengthSq() < 1e-6) za.copy(UP).addScaledVector(xa, -UP.dot(xa));
        za.normalize();
      } else {
        tmp.copy(Math.abs(xa.y) > 0.985 ? FWD : UP);
        za.crossVectors(xa, tmp).normalize();
      }
      ya.crossVectors(za, xa).normalize();
      mPart.makeBasis(xa.multiplyScalar(len), ya.multiplyScalar(thick), za.multiplyScalar(thick));
      mPart.setPosition(r);
      mOut.multiplyMatrices(mBody, mPart);
      rec.mesh.setMatrixAt(slot, mOut);
    }
    function putScaled(rec, slot, r, sx, sy, sz) {
      mPart.makeScale(sx, sy, sz);
      mPart.setPosition(r);
      mOut.multiplyMatrices(mBody, mPart);
      rec.mesh.setMatrixAt(slot, mOut);
    }

    /* ------------------------------------------------------------
       draw

       THE -90 (§20, §21, §27, §30, §31). Parts run along +X, `yaw` is
       an atan2(dx, dz) bearing off +Z, so the body Euler is yaw - PI/2.

       `plump` is the whole contraction: an extended animal is long and
       slim, a hunkered one is short and fat, and because the body is
       one centred sweep that is two numbers on one scale — no second
       model, the same trick `bury` plays for the sand dollar (§31).
       ------------------------------------------------------------ */
    function draw(c, ci) {
      var sc = S * c.size;
      var p = c.plump;
      var lng = 0.62 + 0.38 * p;                 // 1.0 extended .. 0.62 contracted
      var fat = 1.34 - 0.34 * p;                 // and fatter as it shortens

      eul.set(0, c.yaw - Math.PI * 0.5, 0, 'YZX');
      qb.setFromEuler(eul);
      mBody.compose(
        root.set(c.x, c.y + BODY_LIFT * sc * fat, c.z), qb, tmp.set(sc, sc, sc)
      );

      putScaled(R.body, ci, root.set(0, 0, 0), lng, fat, fat);

      /* Dorsal papillae down the back, alternating side to side. They
         flatten as the animal contracts — a hunkered sea cucumber is
         mostly a change in how its bumps sit. */
      for (var q = 0; q < PAPS; q++) {
        var f = -0.36 + q * (0.72 / (PAPS - 1));
        var side = (q % 2 === 0 ? 1 : -1) * 0.055;
        root.set(f * lng, 0.15 * fat, side * fat);
        dir.set(0.10, 1, side * 2).normalize();
        put(R.pap, ci * PAPS + q, root, dir, 0.6 + 0.4 * p, 0.8 + 0.2 * p, false);
      }

      if (p < 0.25) {
        // contracted: the crown is pulled inside the body wall
        for (var h = 0; h < CROWN; h++) R.tent.mesh.setMatrixAt(ci * CROWN + h, HIDE);
        return;
      }

      /* The crown. Eight fronds around the mouth, each on its own
         offset of the same sweep phase, so the ring wipes round rather
         than pulsing all at once — that travelling wipe is what reads
         as feeding at any distance you would actually watch from. */
      var mouth = MOUTH_X * lng;
      for (var t = 0; t < CROWN; t++) {
        var ang = (t / CROWN) * Math.PI * 2;
        var ph = (c.sweep + t / CROWN) % 1;
        // out to the sand, wipe inward, lift, repeat
        var reach = 0.45 + 0.55 * (0.5 - 0.5 * Math.cos(ph * Math.PI * 2));
        /* A CONE AROUND THE FORWARD AXIS, not a fan across it. The
           first version splayed the fronds in ±Z with a downward tilt,
           which from the side read as four straggling blades rather
           than a ring — the crown has to close around +X or it does not
           look like a crown at all. `splay` is the half-angle of the
           cone and `DIP` tips the whole thing toward the sand, which is
           where a deposit feeder's crown is always pointed. */
        var splay = 0.70 + 0.42 * reach;
        var cs = Math.cos(splay), sn = Math.sin(splay);
        root.set(mouth, 0.04 * fat, 0);
        dir.set(cs, sn * Math.cos(ang) - 0.60, sn * Math.sin(ang)).normalize();
        put(R.tent, ci * CROWN + t, root, dir, TENT_LEN * (0.62 + 0.38 * reach) * p, 1.15 * p, true);
      }
    }

    function step(c, dist) {
      var nx = c.x + Math.sin(c.yaw) * dist;
      var nz = c.z + Math.cos(c.yaw) * dist;
      if (!legal(nx, nz)) { c.yaw += 2.3; c.turn = Math.min(c.turn, 1.0); return; }
      c.x = nx; c.z = nz;
      c.y = world.heightAt(nx, nz);
    }

    /* ------------------------------------------------------------
       update
       ------------------------------------------------------------ */
    function update(dt) {
      for (var ci = 0; ci < N; ci++) {
        var c = cukes[ci];
        var surf = world.waterAt(c.x, c.z);
        var wet = surf !== null;

        if (!wet) {
          /* Drained. It cannot follow the water and it cannot dig, so
             it draws itself in and waits — which is exactly what one
             does in your hand, and the reason they feel like a
             different animal out of the sea. */
          c.state = 'hunker';
          c.plump += (0 - c.plump) * Math.min(1, dt / PLUMP_SECS);
        } else {
          c.plump += (1 - c.plump) * Math.min(1, dt / (PLUMP_SECS * 1.3));
          c.timer -= dt;

          /* FEEDING IS CONTINUOUS, AND THE STATES ONLY SET THE PACE.
             The first pass gated eating on the `feed` state and the
             time budget came back 37% feeding against 56% travelling —
             a deposit feeder that spends most of its life commuting,
             which is not the animal. A sea cucumber is a conveyor: the
             crown never stops, it just moves the body along under it
             when the sediment in reach runs out. So the grazing, the
             sweep and the casts all live out here, ahead of the branch,
             and `feed` versus `crawl` decides only whether the body is
             parked. */
          var here = world.filmAt(c.x, c.z);
          var eating = here > BARE;
          if (eating) {
            world.grazeFilm(c.x, c.z, GRAZE_RATE * dt);
            c.sweep += dt / SWEEP_SECS;
            if (c.sweep > 1) c.sweep -= 1;
            c.castT -= dt;
            if (c.castT <= 0) { c.castT = CAST_SECS * range(0.75, 1.3); dropCast(c, ci); }
          }

          if (c.state === 'crawl') {
            c.turn -= dt;
            if (c.turn <= 0) { c.turn = range(TURN_SECS[0], TURN_SECS[1]); c.yaw += range(-1.0, 1.0); }
            step(c, CRAWL * dt);
            if (here > GOOD) {
              c.state = 'feed';
              c.timer = range(FEED_SECS[0], FEED_SECS[1]);
            } else if (c.timer <= 0) {
              // nothing better found; keep going rather than stop on bare sand
              c.timer = range(MOVE_SECS[0], MOVE_SECS[1]);
            }
          } else {
            c.state = 'feed';
            if (c.timer <= 0 || here <= SPENT) {
              c.state = 'crawl';
              c.timer = range(MOVE_SECS[0], MOVE_SECS[1]);
            }
          }
        }

        c.y = world.heightAt(c.x, c.z);
        draw(c, ci);
      }

      for (var k2 in R) R[k2].mesh.instanceMatrix.needsUpdate = true;
      if (castDirty) { mCast.instanceMatrix.needsUpdate = true; castDirty = false; }
    }

    update(0.0001);

    return {
      count: N,
      group: group,
      cukes: cukes,
      update: update,
      // how many are actually processing sediment
      feeding: function () {
        var n = 0;
        for (var i2 = 0; i2 < N; i2++) if (cukes[i2].state === 'feed') n++;
        return n;
      },
      // coils on the sand right now — the trail the population has laid
      castCount: function () {
        var n = 0;
        for (var i3 = 0; i3 < N; i3++) n += cukes[i3].casts;
        return n;
      }
    };
  }

  window.SeaCucumbers = { spawn: spawn };
})();
