/* ============================================================
   seahares.js — the sea hares (BUILD_GUIDE §1 v2, §7, §27).

   Seventh organism, and the one the seagrass was built for. Every
   grazer before it bottoms out at 1.0 m CD; this one lives BELOW that,
   in the lagoon, and eats the crop laid down in seagrass.js.

   IT IS THE FIRST TRUE FORAGER. That is the new problem it adds.

     - the nerite grazes, but it cannot leave its boulder, so its food
       has to be tuned to an equilibrium it can never escape (§25)
     - the conch scores food when it picks a landing, but depth wins
       the argument and always will — it is a tide follower that
       prefers a good patch
     - this animal is driven by food and nothing else. It strips the
       turf under it, and when the turf is gone it CROSSES OPEN GROUND
       to a patch it has sampled. Deplete, travel, deplete — the loop
       §7's resource grid was built to support, finally exercised.

   Everything else about it falls out of that plus one constraint: it
   is slow, it is soft, and it cannot outrun anything.

     graze    on weed, feeding, parapodia rippling
     roam     the patch is worked out — crawling to the best spot it
              sampled
     flee     startled. Ink, and crawl away from what startled it
     huddle   the lagoon has drained out from under it. It cannot
              follow the water at 4 cm/s, so it does not try: it sits
              in the wet hollow it is in and waits the low out

   `stranding` (§6) is null, consistent with the rest of this shore. A
   stranded sea hare in real sun does die, and this one does not — the
   same caveat the knobbly sea star carries (§23).

   THE INK IS NOT DECORATION. It is why the animal can afford to be a
   soft bag with no shell and no speed, and it is the sim's FIRST
   interaction between two populations: a knobbly sea star creeping
   within range sets it off. The star is not modelled as eating it —
   the hare simply does not wait to find out, which is exactly what
   the ink is for.

   RENDERING. Five InstancedMeshes on the shared faceted material
   (body, parapodia x2, rhinophores x2, oral tentacles x2, warts x6),
   plus one more for ink on its own transparent material.
   ============================================================ */
(function () {
  'use strict';

  /* ---------- the knobs ---------- */
  var S = 0.30;                 // metres per body unit — a 30 cm animal, and Dolabella really is
  var COUNT = 16;
  var ZONE = [0.05, 0.92];      // metres CD — the seagrass lagoon, matching seagrass.js
  var Z_RANGE = [16, 60];
  var SPACING = 3.5;            // metres — they are big and they do not pile up

  var CRAWL = 0.045;            // m/s grazing — a sea hare is not going anywhere fast
  var ROAM = 0.100;             // m/s crossing to a new patch
  var FLEE = 0.150;             // m/s startled, and this is as fast as it gets

  /* Feeding rate and patience are one decision, not two. A sea hare should
     be grazing most of the time it is on screen, and the first tuning had it
     travelling 77% of the time: the turf ran out in nine seconds and the walk
     to the next patch took a minute. So the bout has to outlast the walk —
     it crops slowly, and it does not give up on a spot the moment one node
     under it is bare. */
  var GRAZE_RATE = 0.028;       // crop units per second under the radula
  var BARE = 0.15;              // below this there is nothing left to take
  var GOOD = 0.30;              // below this the patch is not worth STAYING on — see update()
  var GIVE_UP = 5.0;            // seconds of finding nothing before it relocates
  var SAMPLE = 9;               // candidate patches sniffed out when it decides to move
  var SAMPLE_R = [1.0, 4.0];    // metres it will look over
  var STARTLE_R = 2.0;          // metres — a sea star this close sets off the ink
  var FLEE_SECS = [3.0, 5.5];
  var INK_COOLDOWN = 14;        // seconds before it can ink again — ink is expensive to make

  /* Body layout, in body units. */
  var LIFT = 0.13;              // body centre above the mud
  var FLAP_AT = { x: -0.16, y: 0.09, z: 0.16 };
  var FLAP_LEN = 0.66;
  var RHINO_AT = { x: 0.26, y: 0.15, z: 0.055 };
  var RHINO_LEN = 0.22;
  var TENT_AT = { x: 0.37, y: -0.01, z: 0.10 };
  var TENT_LEN = 0.15;
  var WARTS = 6;

  var INK_SLOTS = 30;           // puffs alive at once, across the whole population
  var PUFF_LIFE = [2.6, 4.2];

  var seed = 515151;
  function rand() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
  function range(a, b) { return a + rand() * (b - a); }

  var AXIS_X = new THREE.Vector3(1, 0, 0);
  var UP = new THREE.Vector3(0, 1, 0);
  var FWD = new THREE.Vector3(0, 0, 1);

  /* `opts.seastars` is the live sea star array, if there is one. Optional
     on purpose: the sea hare is a complete animal without it, and the
     startle is an interaction between two populations rather than a
     dependency of either. */
  function spawn(scene, world, opts) {
    var P = SeaHareBody.parts();
    var mat = SeaHareBody.material();
    var stars = (opts && opts.seastars) || null;

    var group = new THREE.Group();
    group.name = 'sea-hares';
    scene.add(group);

    /* ---------- placement ---------- */
    function onRock(x, z) {
      for (var i = 0; i < world.rocks.length; i++) {
        var r = world.rocks[i];
        var dx = r.x - x, dz = r.z - z;
        if (dx * dx + dz * dz < (r.r + 0.8) * (r.r + 0.8)) return true;
      }
      return false;
    }

    var hares = [];
    var halfX = world.simArea.halfX - 10;
    var guard = 0;
    while (hares.length < COUNT && guard++ < COUNT * 900) {
      var x = range(-halfX, halfX);
      var z = range(Z_RANGE[0], Z_RANGE[1]);
      var h = world.heightAt(x, z);
      if (h < ZONE[0] || h > ZONE[1]) continue;
      if (onRock(x, z)) continue;
      // start them ON the weed — this animal has no reason to be anywhere else
      if (world.grassAt(x, z) < 0.4) continue;
      var clash = false;
      for (var hi = 0; hi < hares.length; hi++) {
        var o = hares[hi];
        if ((o.x - x) * (o.x - x) + (o.z - z) * (o.z - z) < SPACING * SPACING) { clash = true; break; }
      }
      if (clash) continue;

      hares.push({
        x: x, y: h, z: z,
        yaw: range(0, Math.PI * 2),
        state: 'graze',
        tx: x, tz: z,                       // where it is heading, when it is heading anywhere
        wave: rand(),                       // pedal-wave / parapodium phase
        turn: range(2, 7),
        empty: 0,                           // seconds of finding nothing — the bout timer
        flee: 0,                            // seconds of startle left
        inkT: range(0, INK_COOLDOWN),       // cooldown, so they do not all ink at once
        squash: 0,                          // 0 normal .. 1 hunkered flat
        size: range(0.80, 1.22),            // they vary a lot — this is a very variable animal
        vis: true
      });
    }

    var N = hares.length;

    function slots(geo, per, shadow) {
      var m = new THREE.InstancedMesh(geo, mat, Math.max(N * per, 1));
      m.frustumCulled = false;
      m.castShadow = !!shadow;
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      group.add(m);
      return { mesh: m, per: per };
    }
    var R = {
      body:  slots(P.body, 1, true),
      flap:  slots(P.parapodium, 2, true),
      rhino: slots(P.rhinophore, 2),
      tent:  slots(P.tentacle, 2),
      wart:  slots(P.wart, WARTS)
    };

    var tint = new THREE.Color();
    for (var i = 0; i < N; i++) {
      // olive to sandy — a sea hare is coloured by what it has been eating
      var g = range(0.80, 1.18);
      tint.setRGB(g * range(0.94, 1.06), g * range(0.96, 1.05), g * range(0.82, 0.98));
      for (var key in R) {
        for (var j = 0; j < R[key].per; j++) R[key].mesh.setColorAt(i * R[key].per + j, tint);
      }
    }
    for (var k in R) if (R[k].mesh.instanceColor) R[k].mesh.instanceColor.needsUpdate = true;

    /* ---------- ink ----------
       One mesh for every puff on the shore. Fading is done with scale and
       brightness rather than per-instance alpha, which instancing does not
       give us without a second shader: a puff swells, washes out toward the
       water's tone, and shrinks away. */
    var inkMesh = new THREE.InstancedMesh(P.puff, SeaHareBody.inkMaterial(), INK_SLOTS);
    inkMesh.frustumCulled = false;
    inkMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    inkMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(INK_SLOTS * 3), 3);
    inkMesh.renderOrder = 2;
    group.add(inkMesh);
    var puffs = [];
    for (i = 0; i < INK_SLOTS; i++) puffs.push({ live: false, x: 0, y: 0, z: 0, age: 0, life: 1, r: 1, rise: 0, drift: 0 });
    var inkCursor = 0;

    function inkAt(x, y, z, n) {
      for (var p = 0; p < n; p++) {
        var pf = puffs[inkCursor];
        inkCursor = (inkCursor + 1) % INK_SLOTS;
        pf.live = true;
        pf.x = x + range(-0.12, 0.12);
        pf.y = y + range(0.00, 0.11);
        pf.z = z + range(-0.12, 0.12);
        pf.age = -p * 0.09;                     // the cloud comes out in a pulse, not a ball
        pf.life = range(PUFF_LIFE[0], PUFF_LIFE[1]);
        pf.r = range(0.22, 0.42);
        pf.rise = range(0.05, 0.16);
        pf.drift = range(-0.06, 0.06);
      }
    }

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

       The body is centred and runs +X forward. Two motions, and both
       are the animal being soft: a pedal wave running the length of
       the sole (it does not have legs, it has a moving ripple of
       muscle), and the parapodia lifting and settling out of phase
       with it.
       ------------------------------------------------------------ */
    function draw(s, si) {
      var sc = S * s.size;
      var moving = s.state === 'roam' || s.state === 'flee';
      var w = s.wave * Math.PI * 2;
      // hunkered down, it spreads and flattens rather than shrinking
      var flat = 1 - 0.34 * s.squash;
      var wide = 1 + 0.22 * s.squash;

      s.y = world.heightAt(s.x, s.z);
      /* The -90°. Bodies are built along +X (facet.js), but every heading
         on this shore is `atan2(dx, dz)`, which is a +Z bearing — so a body
         placed at its raw yaw crawls sideways. Same correction the conch
         carries; caught here by a broadside screenshot showing a slug the
         wrong way round, which is the only way this bug ever shows up. */
      eul.set(0, s.yaw - Math.PI * 0.5, 0, 'YZX');
      qb.setFromEuler(eul);
      mBody.compose(root.set(s.x, s.y + LIFT * sc * flat, s.z), qb, tmp.set(sc, sc, sc));

      // body: the pedal wave stretches and shortens it as the ripple runs through
      var stretch = 1 + (moving ? 0.05 : 0.02) * Math.sin(w);
      mPart.makeScale(stretch, flat, wide);
      mPart.setPosition(root.set(0, 0, 0));
      mOut.multiplyMatrices(mBody, mPart);
      R.body.mesh.setMatrixAt(si, mOut);

      // parapodia: a standing ruffle each side, rippling out of phase
      for (var f = 0; f < 2; f++) {
        var side = f === 0 ? 1 : -1;
        var lift = 0.055 * Math.sin(w + side * 0.9) * (1 - s.squash);
        root.set(FLAP_AT.x, FLAP_AT.y * flat + lift, side * FLAP_AT.z * wide);
        dir.set(1, 0.06 * Math.sin(w + side), side * 0.10);
        put(R.flap, si * 2 + f, root, dir, FLAP_LEN * stretch, (0.85 + 0.25 * (1 - s.squash)));
      }

      /* Rhinophores: up and slightly back when it is grazing, laid down
         flat when it is hunkered — a sea hare pulls them in the moment
         it is unhappy, and that is most of what its mood looks like. */
      for (var h2 = 0; h2 < 2; h2++) {
        var sd = h2 === 0 ? 1 : -1;
        root.set(RHINO_AT.x, RHINO_AT.y * flat, sd * RHINO_AT.z);
        dir.set(0.30 + 0.45 * s.squash, 0.92 - 0.75 * s.squash, sd * 0.22);
        put(R.rhino, si * 2 + h2, root, dir, RHINO_LEN * (1 - 0.35 * s.squash), 1);
      }

      // oral tentacles: low, wide, sweeping the weed in front of the mouth
      for (var t2 = 0; t2 < 2; t2++) {
        var sd2 = t2 === 0 ? 1 : -1;
        root.set(TENT_AT.x, TENT_AT.y, sd2 * TENT_AT.z);
        dir.set(0.86, -0.18 + 0.10 * Math.sin(w * 1.5 + t2), sd2 * 0.44);
        put(R.tent, si * 2 + t2, root, dir, TENT_LEN, 1);
      }

      // warts, alternating down the back — the thing that breaks the rim
      for (var wi = 0; wi < WARTS; wi++) {
        var u = (wi + 0.5) / WARTS;
        var sd3 = wi % 2 === 0 ? 1 : -1;
        root.set(0.42 - u * 0.86, (0.13 - 0.05 * u) * flat, sd3 * 0.16 * wide);
        dir.set(0.10, 0.85, sd3 * 0.5);
        put(R.wart, si * WARTS + wi, root, dir, 1, 1);
      }
    }

    /* ------------------------------------------------------------
       where to go next — the forage decision

       Sniff a ring of spots and take the best weed that is still under
       water. This is the whole animal: no depth preference, no edge
       preference, no home. Where the food is.
       ------------------------------------------------------------ */
    function pickPatch(s) {
      var bestX = s.x, bestZ = s.z, best = world.grassAt(s.x, s.z), found = false;
      for (var t = 0; t < SAMPLE; t++) {
        var a = range(0, Math.PI * 2), d = range(SAMPLE_R[0], SAMPLE_R[1]);
        var nx = s.x + Math.sin(a) * d, nz = s.z + Math.cos(a) * d;
        if (!world.inSimArea(nx, nz)) continue;
        var h = world.heightAt(nx, nz);
        if (h < ZONE[0] || h > ZONE[1]) continue;
        if (world.waterAt(nx, nz) === null) continue;      // it will not cross dry ground
        var g = world.grassAt(nx, nz);
        if (g > best) { best = g; bestX = nx; bestZ = nz; found = true; }
      }
      s.tx = bestX; s.tz = bestZ;
      return found;
    }

    // crawl toward (tx,tz); returns true once it is there
    function crawlTo(s, speed, dt) {
      var dx = s.tx - s.x, dz = s.tz - s.z;
      var d = Math.hypot(dx, dz);
      if (d < 0.10) return true;
      var want = Math.atan2(dx, dz);
      var turn = want - s.yaw;
      while (turn > Math.PI) turn -= Math.PI * 2;
      while (turn < -Math.PI) turn += Math.PI * 2;
      // it cannot pivot, it has to bend round — slow yaw is part of looking soft
      s.yaw += Math.max(-1.4 * dt, Math.min(1.4 * dt, turn));
      var step = Math.min(d, speed * dt);
      s.x += Math.sin(s.yaw) * step;
      s.z += Math.cos(s.yaw) * step;
      return false;
    }

    // the nearest sea star within STARTLE_R, or null
    function threatNear(s) {
      if (!stars) return null;
      for (var i2 = 0; i2 < stars.length; i2++) {
        var st = stars[i2];
        if (st.state === 'buried') continue;            // a buried star is not a looming shape
        var dx = st.x - s.x, dz = st.z - s.z;
        if (dx * dx + dz * dz < STARTLE_R * STARTLE_R) return st;
      }
      return null;
    }

    /* ------------------------------------------------------------
       update
       ------------------------------------------------------------ */
    function update(dt, t) {
      var i2, s;

      for (var si = 0; si < N; si++) {
        s = hares[si];
        s.wave += dt * (s.state === 'graze' ? 0.55 : 0.95);
        if (s.wave > 1) s.wave -= 1;
        if (s.inkT > 0) s.inkT -= dt;

        var surf = world.waterAt(s.x, s.z);
        var wet = surf !== null;

        if (!wet) {
          /* Drained. It cannot follow the water at 4 cm/s and it does not
             try — it flattens into whatever damp it is sitting in and
             waits. This is the animal people find on a spring low. */
          s.state = 'huddle';
          s.squash = Math.min(1, s.squash + dt * 0.7);
        } else {
          s.squash = Math.max(0, s.squash - dt * 1.1);

          if (s.flee > 0) {
            s.flee -= dt;
            s.state = 'flee';
            if (crawlTo(s, FLEE, dt)) s.flee = 0;
          } else {
            var threat = threatNear(s);
            if (threat) {
              /* Ink and go. The cloud is a screen it leaves BEHIND — so it
                 is released where the animal is standing now, not where it
                 is running to. */
              if (s.inkT <= 0) {
                inkAt(s.x, s.y + 0.06, s.z, 5);
                s.inkT = INK_COOLDOWN;
              }
              s.flee = range(FLEE_SECS[0], FLEE_SECS[1]);
              s.state = 'flee';
              // straight away from the star, as far as the lagoon allows
              var ax = s.x - threat.x, az = s.z - threat.z;
              var an = Math.hypot(ax, az) || 1;
              s.tx = s.x + ax / an * 4.5;
              s.tz = s.z + az / an * 4.5;
              world.clampToSimArea(tmp.set(s.tx, 0, s.tz), 6);
              s.tx = tmp.x; s.tz = tmp.z;
            } else if (s.state === 'roam') {
              if (crawlTo(s, ROAM, dt)) s.state = 'graze';
            } else {
              s.state = 'graze';
              /* TWO thresholds, and the second one is not optional. `BARE`
                 is "is there anything left to take"; `GOOD` is "is this
                 worth staying for". With one threshold the animal pins the
                 node at exactly BARE, regrowth trickles it a hair above,
                 the hare eats it straight back down — and because it got
                 *something* every second it never decides the patch is
                 finished. Fourteen of sixteen sat in their own craters
                 reading exactly 0.15 for ten tide cycles. */
              var here = world.grassAt(s.x, s.z);
              if (here > BARE) world.grazeGrass(s.x, s.z, GRAZE_RATE * dt);
              if (here >= GOOD) s.empty = 0;
              else s.empty += dt;
              /* It drifts as it feeds either way. A bare node under a
                 grazer is not a reason to leave — the next one over is
                 half a body length away, and a bout only ends when the
                 whole neighbourhood has come up empty. */
              s.turn -= dt;
              if (s.turn <= 0) {
                s.turn = range(1.4, 3.4);
                /* Steer up the food gradient rather than wandering. It has
                   rhinophores — it can smell which way the weed thickens —
                   and this is what stops a grazer re-crossing the swathe it
                   has just cut. What it leaves behind is a mown lane, which
                   is the only way one animal's feeding is legible on a
                   meadow this size. */
                var bestYaw = s.yaw, bestG = -1;
                for (var q = -1; q <= 1; q++) {
                  var ty = s.yaw + q * 0.85;
                  var g2 = world.grassAt(s.x + Math.sin(ty) * 1.1, s.z + Math.cos(ty) * 1.1);
                  if (g2 > bestG) { bestG = g2; bestYaw = ty; }
                }
                s.yaw = bestYaw + range(-0.35, 0.35) * (s.empty > 0 ? 2.4 : 1);
              }
              s.tx = s.x + Math.sin(s.yaw) * 0.4;
              s.tz = s.z + Math.cos(s.yaw) * 0.4;
              crawlTo(s, CRAWL, dt);

              if (s.empty > GIVE_UP) {
                // the patch is worked out. Look around, and go to the best thing smelled
                s.empty = 0;
                if (pickPatch(s)) s.state = 'roam';
                else s.yaw += range(-1.6, 1.6);
              }
            }
          }
        }

        draw(s, si);
      }

      for (var k2 in R) R[k2].mesh.instanceMatrix.needsUpdate = true;

      /* ---- ink ---- */
      var anyInk = false;
      for (i2 = 0; i2 < INK_SLOTS; i2++) {
        var pf = puffs[i2];
        if (!pf.live) { continue; }
        pf.age += dt;
        if (pf.age < 0) { inkMesh.setMatrixAt(i2, HIDE); anyInk = true; continue; }
        var a2 = pf.age / pf.life;
        if (a2 >= 1) { pf.live = false; inkMesh.setMatrixAt(i2, HIDE); anyInk = true; continue; }
        pf.y += pf.rise * dt;
        pf.x += pf.drift * dt;
        // swells fast, then thins away: scale out over the last third
        var grow = pf.r * (0.35 + 1.9 * Math.min(1, a2 * 2.4));
        var fade = a2 > 0.62 ? 1 - (a2 - 0.62) / 0.38 : 1;
        mPart.makeScale(grow * fade, grow * fade * 0.8, grow * fade);
        mPart.setPosition(root.set(pf.x, pf.y, pf.z));
        inkMesh.setMatrixAt(i2, mPart);
        // washing out toward the water as it disperses
        var wash = 1 + a2 * 1.1;
        tint.setRGB(wash, wash * 0.95, wash);
        inkMesh.setColorAt(i2, tint);
        anyInk = true;
      }
      if (anyInk) {
        inkMesh.instanceMatrix.needsUpdate = true;
        inkMesh.instanceColor.needsUpdate = true;
      }
    }

    for (i = 0; i < INK_SLOTS; i++) inkMesh.setMatrixAt(i, HIDE);
    inkMesh.instanceMatrix.needsUpdate = true;
    for (i = 0; i < N; i++) draw(hares[i], i);
    for (var k3 in R) R[k3].mesh.instanceMatrix.needsUpdate = true;

    return {
      count: N,
      group: group,
      hares: hares,
      update: update,
      // how many are actually feeding right now — the pressure the meadow meets
      grazing: function () {
        var n = 0;
        for (var i3 = 0; i3 < N; i3++) if (hares[i3].state === 'graze') n++;
        return n;
      },
      inkLive: function () {
        var n = 0;
        for (var i4 = 0; i4 < INK_SLOTS; i4++) if (puffs[i4].live) n++;
        return n;
      }
    };
  }

  window.SeaHares = { spawn: spawn };
})();
