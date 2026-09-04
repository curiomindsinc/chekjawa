/* ============================================================
   moonsnails.js — the moon snail (BUILD_GUIDE §35, roster item 1 —
   "now unblocked").

   THE FIRST PREDATOR ON THIS SHORE WITH A NAMED PREY. The egret
   panics fiddler crabs (§30) and the sand star sets off pen shells
   (§32), but neither one EATS the species it interacts with — this
   is the first animal the roster held back specifically because
   nothing worth hunting existed yet. Now the pen shell does (§32),
   and once the oyster and the mussel join it in the same build this
   one animal, both are named prey too: a moon snail drills bivalves,
   and this shore finally has three kinds standing around for it.

   NOTHING DIES, THE SAME DECISION AS EVERY PREDATOR HERE (§30, §32).
   A moon snail's real hunt takes hours and ends with a hole through a
   shell that never closes again — this shore has no mortality
   bookkeeping and is not getting one for a fourth predator when three
   already made the opposite call on purpose. What is modelled is the
   full-length PERFORMANCE of a hunt that shows: the plough, the huge
   foot closing over a shell, and the sand collar left behind — an
   attempt, not a kill, exactly like the egret's strike and the sand
   star's dig.

   TWO STATES ARE ONE NUMBER EACH. `bury` sinks the whole animal into
   the sand exactly the way the sand dollar's does (sanddollars.js) —
   deep while ploughing, shallow while a real target is worth
   surfacing for. `footScale` is the performance: small and tucked in
   on the plough, ballooned to several times the shell's own footprint
   while the animal sits on a bivalve. Nothing else moves.

   PEN SHELLS ARE AN OPTIONAL TARGET, not a requirement. Handed the
   pen shell array, a moon snail actively paths toward the nearest one
   in reach and only ever drills there — hunting with nothing to point
   at is still hunting, but drilling needs a real animal under the
   foot, so with no array passed this species simply ploughs forever
   and never drills. Same optionality as every inter-population wiring
   here since §27: neither population needs the other to exist.

   THE SAND COLLAR IS THE RECEIPT, laid where a drill just finished —
   moonsnailbody.js's `collarSeg`, chained end to end into a broken
   ring around the spot. One collar per animal, in a fixed instance
   budget, overwritten by the next drill: the same ring-buffer economy
   the fiddler crab's pellets use (crabs.js §28), at a budget of one
   slot instead of eight because this is one receipt per HUNT, not one
   per bite.
   ============================================================ */
(function () {
  'use strict';

  /* ---------- the knobs ---------- */
  var S = 0.22;                 // metres per body unit — shell length. A real one is 3-9 cm
  var COUNT = 16;                // uncommon, solitary — sparser than the sand star
  var ZONE = [0.05, 0.85];      // metres CD — the low flat and the lagoon, same water pen shells need
  var Z_RANGE = [24, 62];
  var SPACING = 3.0;

  var HUNT_SPEED = 0.085;       // m/s — a slow plough, just under the sand dollar's crawl
  var TURN = 1.1;                // rad/s
  var HUNT_SECS = [10, 26];     // how long it holds one leg before picking a fresh one
  var HUNT_RANGE = 26;          // metres — how far it will notice a pen shell worth crossing to
  var TARGET_PENSHELL_ODDS = 0.82;
  var ARRIVE_R = 0.45;
  var DRILL_R = 1.0;             // close enough to a targeted shell to start drilling

  var DRILL_SECS = [11, 21];
  var POSE_SECS = 1.6;          // how long the foot takes to balloon out, or fold back in
  var AVOID_SECS = 90;          // a snail leaves a shell it just worked alone for a while

  var BURY_HUNT = 0.80;          // ploughing: mostly under, the sand dollar's own "travelling mound" read
  var BURY_DRILL = 0.22;         // surfaced — a real target is worth showing for
  var BURY_DRY = 1.0;
  var BURY_RATE = 0.55;
  var SUNK = 0.20;                // body units the fully-buried animal sits below the sand

  var FOOT_IN = 0.42;
  var FOOT_OUT = 2.55;
  var SUBMERGE = 0.03;

  var COLLAR_SEGS = 10;
  var COLLAR_ARC = Math.PI * 2 * 0.84;    // leaves a gap — real collars are rarely a closed loop
  var COLLAR_R = [0.92, 1.35];            // × the animal's own size

  var seed = 40507;
  function rand() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
  function range(a, b) { return a + rand() * (b - a); }
  function approach(v, want, rate, dt) { return v + (want - v) * (1 - Math.exp(-rate * dt)); }

  var UP = new THREE.Vector3(0, 1, 0);
  var FWD = new THREE.Vector3(0, 0, 1);

  /* Body layout, in body units. */
  var BODY_Y = 0.30;             // shell centre above the sand, fully surfaced
  var FOOT_AT = -0.06;
  var SIPHON_AT = 0.42;

  function spawn(scene, world, opts) {
    var P = MoonSnailBody.parts();
    var mat = MoonSnailBody.material();
    opts = opts || {};
    var penshells = opts.penshells || null;

    var group = new THREE.Group();
    group.name = 'moon-snails';
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
    var snails = [];
    var guard = 0;
    while (snails.length < COUNT && guard++ < COUNT * 500) {
      var x = range(-halfX, halfX);
      var z = range(Z_RANGE[0], Z_RANGE[1]);
      if (!legal(x, z)) continue;
      var clash = false;
      for (var si = 0; si < snails.length; si++) {
        var o = snails[si];
        if ((o.x - x) * (o.x - x) + (o.z - z) * (o.z - z) < SPACING * SPACING) { clash = true; break; }
      }
      if (clash) continue;
      snails.push({
        x: x, y: world.heightAt(x, z), z: z, yaw: range(0, Math.PI * 2),
        state: 'hunt',
        act: 'hunt',
        bury: BURY_HUNT,
        footScale: FOOT_IN,
        footPulse: rand(),
        siphonOut: 1,
        moving: 0,
        tgtX: x, tgtZ: z,
        huntTimer: range(0, HUNT_SECS[1]),
        drillTimer: 0,
        poseT: 0,                            // 0 hunting pose .. 1 fully surfaced/ballooned
        huntShell: null,
        avoidShell: null, avoidUntil: 0,
        collarLaid: false,
        collarSlot: si,
        speed: range(0.85, 1.15),
        size: range(0.80, 1.25)
      });
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
      shell:  slots(P.shell, 1, true),
      foot:   slots(P.foot, 1, true),
      siphon: slots(P.siphon, 1),
      collar: slots(P.collarSeg, COLLAR_SEGS)
    };

    var tint = new THREE.Color();
    for (var i = 0; i < N; i++) {
      var g = range(0.86, 1.12);
      tint.setRGB(g * range(0.98, 1.04), g, g * range(0.92, 1.0));
      for (var key in R) {
        for (var j = 0; j < R[key].per; j++) R[key].mesh.setColorAt(i * R[key].per + j, tint);
      }
    }
    for (var kc in R) if (R[kc].mesh.instanceColor) R[kc].mesh.instanceColor.needsUpdate = true;

    /* ---------- placement helpers ---------- */
    var xa = new THREE.Vector3(), ya = new THREE.Vector3(), za = new THREE.Vector3();
    var mPart = new THREE.Matrix4(), mBody = new THREE.Matrix4(), mOut = new THREE.Matrix4();
    var root = new THREE.Vector3(), dir = new THREE.Vector3(), tmp = new THREE.Vector3();
    var qy = new THREE.Quaternion();
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
    function putCentred(rec, slot, r, s) {
      mPart.makeScale(s, s, s);
      mPart.setPosition(r);
      mOut.multiplyMatrices(mBody, mPart);
      rec.mesh.setMatrixAt(slot, mOut);
    }
    /* Collar segments are laid directly in WORLD space, independent of
       any animal's current pose or heading — a receipt left behind,
       not a limb — so this skips the mBody multiply every other put
       here goes through. */
    function putWorld(rec, slot, r, d, len, thick) {
      xa.copy(d).normalize();
      tmp.copy(Math.abs(xa.y) > 0.985 ? FWD : UP);
      za.crossVectors(xa, tmp).normalize();
      ya.crossVectors(za, xa).normalize();
      mOut.makeBasis(xa.multiplyScalar(len), ya.multiplyScalar(thick), za.multiplyScalar(thick));
      mOut.setPosition(r);
      rec.mesh.setMatrixAt(slot, mOut);
    }

    function hide(rec, si) {
      for (var j = 0; j < rec.per; j++) rec.mesh.setMatrixAt(si * rec.per + j, HIDE);
    }
    for (i = 0; i < N * COLLAR_SEGS; i++) R.collar.mesh.setMatrixAt(i, HIDE);
    R.collar.mesh.instanceMatrix.needsUpdate = true;

    /* ------------------------------------------------------------
       draw
       ------------------------------------------------------------ */
    function draw(m, mi) {
      var sc = S * m.size;
      var floorY = world.heightAt(m.x, m.z);
      // sunk into the sand by `bury`, same trick as the sand dollar
      var y = floorY + BODY_Y * sc * (1 - m.bury) - m.bury * SUNK * sc;

      qy.setFromAxisAngle(UP, m.yaw - Math.PI / 2);   // the usual -90 correction, §20/§21/§27/§30
      mBody.compose(root.set(m.x, y, m.z), qy, tmp.set(sc, sc, sc));

      putCentred(R.shell, mi, root.set(0, 0, 0), 1);

      // the foot spreads out from under the shell — a wide, low blob
      // that grows almost entirely sideways as footScale climbs
      var fs = m.footShow || m.footScale;
      var fh = 0.55 + 0.45 / Math.max(1, fs * 0.6);
      mPart.makeScale(fs, fs * fh, fs);
      mPart.setPosition(FOOT_AT, -0.10, 0);
      mOut.multiplyMatrices(mBody, mPart);
      R.foot.mesh.setMatrixAt(mi, mOut);

      if (m.siphonOut < 0.05) {
        hide(R.siphon, mi);
      } else {
        dir.set(0.94, 0.10, 0).normalize();
        put(R.siphon, mi, root.set(SIPHON_AT, 0.08, 0), dir, 0.32 * m.siphonOut, 1);
      }
    }

    /* Lay a fresh sand collar at (cx, cz), replacing this snail's own
       previous one. A broken ring: COLLAR_ARC is short of a full
       circle on purpose, because a real collar is a fragile cemented
       tube and is rarely found whole. */
    function layCollar(m, mi) {
      var sc = S * m.size;
      var R0 = range(COLLAR_R[0], COLLAR_R[1]) * sc;
      var a0 = m.yaw + range(0, Math.PI * 2);
      var base = mi * COLLAR_SEGS;
      for (var k = 0; k < COLLAR_SEGS; k++) {
        var t0 = k / COLLAR_SEGS, t1 = (k + 1) / COLLAR_SEGS;
        var aa = a0 + COLLAR_ARC * (t0 - 0.5), ab = a0 + COLLAR_ARC * (t1 - 0.5);
        var p0x = m.x + Math.sin(aa) * R0, p0z = m.z + Math.cos(aa) * R0;
        var p1x = m.x + Math.sin(ab) * R0, p1z = m.z + Math.cos(ab) * R0;
        var p0y = world.heightAt(p0x, p0z) + 0.01, p1y = world.heightAt(p1x, p1z) + 0.01;
        root.set(p0x, p0y, p0z);
        dir.set(p1x - p0x, p1y - p0y, p1z - p0z);
        var len = dir.length() || 0.001;
        putWorld(R.collar, base + k, root, dir, len, 0.62 * sc);
      }
      m.collarLaid = true;
      R.collar.mesh.instanceMatrix.needsUpdate = true;
    }

    /* ------------------------------------------------------------
       hunting: pick somewhere to go
       ------------------------------------------------------------ */
    function nearestShell(m, simTime) {
      if (!penshells || !penshells.length) return null;
      var best = null, bestD = HUNT_RANGE * HUNT_RANGE;
      for (var pi = 0; pi < penshells.length; pi++) {
        var p = penshells[pi];
        if (p === m.avoidShell && simTime < m.avoidUntil) continue;
        var dx = p.x - m.x, dz = p.z - m.z;
        var d2 = dx * dx + dz * dz;
        if (d2 < bestD) { bestD = d2; best = p; }
      }
      return best;
    }
    function pickTarget(m, simTime) {
      var shell = nearestShell(m, simTime);
      if (shell && rand() < TARGET_PENSHELL_ODDS) {
        m.huntShell = shell;
        m.tgtX = shell.x; m.tgtZ = shell.z;
      } else {
        m.huntShell = null;
        var t = 0;
        do {
          m.tgtX = range(-halfX, halfX);
          m.tgtZ = range(Z_RANGE[0], Z_RANGE[1]);
          t++;
        } while (t < 20 && !legal(m.tgtX, m.tgtZ));
      }
      m.huntTimer = range(HUNT_SECS[0], HUNT_SECS[1]);
    }

    function stepTo(m, tx, tz, spd, dt) {
      var dx = tx - m.x, dz = tz - m.z;
      var d = Math.sqrt(dx * dx + dz * dz);
      if (d < 1e-4) { m.moving = approach(m.moving, 0, 5, dt); return 0; }
      var want = Math.atan2(dx, dz);
      var da = want - m.yaw;
      while (da > Math.PI) da -= Math.PI * 2;
      while (da < -Math.PI) da += Math.PI * 2;
      m.yaw += Math.max(-TURN * dt, Math.min(TURN * dt, da));
      var mv = Math.min(d, spd * dt);
      m.x += dx / d * mv;
      m.z += dz / d * mv;
      m.moving = approach(m.moving, 1, 5, dt);
      return d - mv;
    }

    /* ------------------------------------------------------------
       update
       ------------------------------------------------------------ */
    function update(dt, simTime) {
      simTime = simTime || 0;
      var touched = false;

      for (var mi = 0; mi < N; mi++) {
        var m = snails[mi];
        var surf = world.waterAt(m.x, m.z);
        var wet = surf !== null && surf > world.heightAt(m.x, m.z) + SUBMERGE;

        if (!wet) {
          m.state = 'buried'; m.act = 'buried';
          m.bury = approach(m.bury, BURY_DRY, BURY_RATE, dt);
          m.footScale = approach(m.footScale, FOOT_IN, 1 / POSE_SECS, dt);
          m.siphonOut = approach(m.siphonOut, 0, 2, dt);
          m.drillTimer = 0;
          m.footShow = m.footScale;
          draw(m, mi);
          touched = true;
          continue;
        }

        if (m.state === 'buried') { m.state = 'hunt'; pickTarget(m, simTime); }

        if (m.state === 'drill') {
          m.act = 'drill';
          m.bury = approach(m.bury, BURY_DRILL, BURY_RATE, dt);
          m.footScale = approach(m.footScale, FOOT_OUT, 1 / POSE_SECS, dt);
          m.siphonOut = approach(m.siphonOut, 0.3, 2, dt);
          m.footPulse += dt / 3.4;
          var breathe = Math.sin(m.footPulse * Math.PI * 2) * 0.06;
          m.footShow = m.footScale + breathe;
          m.drillTimer -= dt;
          if (m.drillTimer <= 0) {
            layCollar(m, mi);
            m.avoidShell = m.huntShell; m.avoidUntil = simTime + AVOID_SECS;
            m.state = 'hunt';
            pickTarget(m, simTime);
          }
          draw(m, mi);
          touched = true;
          continue;
        }

        /* ---- hunt ---- */
        m.act = 'hunt';
        m.bury = approach(m.bury, BURY_HUNT, BURY_RATE, dt);
        m.footScale = approach(m.footScale, FOOT_IN, 1 / POSE_SECS, dt);
        m.siphonOut = approach(m.siphonOut, 1, 2, dt);
        m.huntTimer -= dt;

        var left = stepTo(m, m.tgtX, m.tgtZ, HUNT_SPEED * m.speed, dt);

        if (m.huntShell) {
          var dxs = m.huntShell.x - m.x, dzs = m.huntShell.z - m.z;
          if (dxs * dxs + dzs * dzs < DRILL_R * DRILL_R) {
            m.state = 'drill';
            m.drillTimer = range(DRILL_SECS[0], DRILL_SECS[1]);
          }
        }
        if (m.state === 'hunt' && (left < ARRIVE_R || m.huntTimer <= 0)) {
          pickTarget(m, simTime);
        }

        m.footShow = m.footScale;
        draw(m, mi);
        touched = true;
      }

      if (touched) { R.shell.mesh.instanceMatrix.needsUpdate = true; R.foot.mesh.instanceMatrix.needsUpdate = true; R.siphon.mesh.instanceMatrix.needsUpdate = true; }
    }

    for (i = 0; i < N; i++) draw(snails[i], i);
    R.shell.mesh.instanceMatrix.needsUpdate = true;
    R.foot.mesh.instanceMatrix.needsUpdate = true;
    R.siphon.mesh.instanceMatrix.needsUpdate = true;

    return {
      count: N,
      group: group,
      snails: snails,
      update: update,
      hunting: function () {
        var n = 0;
        for (var i2 = 0; i2 < N; i2++) if (snails[i2].state === 'drill') n++;
        return n;
      }
    };
  }

  window.MoonSnails = { spawn: spawn };
})();
