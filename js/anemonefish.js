/* ============================================================
   anemonefish.js — the false clown anemonefish (BUILD_GUIDE §39,
   built with its host in anemones.js).

   THE SECOND SPECIES ON THIS SHORE THAT CANNOT EXIST WITHOUT ANOTHER
   ONE. The hermit crab needs shells and gets them from a market it
   runs itself (§31); this fish needs a living anemone, and if
   anemones.js is not on the shore there is nothing here to spawn. So
   unlike every other wiring in this build, the host is NOT optional —
   `spawn` with no anemones returns an empty population, on purpose,
   because a homeless anemonefish is not a thing that happens.

     away     the water is too shallow over its host. Gone to the
              channel — the second species after the egret (§30) that
              is genuinely not on the plot some of the time
     arrive   swimming back in over the flood
     hover    station-keeping a body's length above the carpet, which
              is where one spends most of its life
     sortie   a dart out and back for something in the water
     dive     running for the tentacles
     nestle   down IN the carpet, wriggling

   IT SWIMS ON ITS PECTORALS. Every other moving thing on this shore
   is driven from its legs or its body axis; an anemonefish rows,
   alternately, with two big pectoral fins, and holds station that way
   with its tail almost still. The tail is only used to bolt. So
   `row` runs continuously and the tail's wag is scaled by SPEED —
   which means a hovering fish is visibly doing something different
   from a diving one, and it is the fins that say so.

   THE HOME RANGE IS THE ANIMAL. A real anemonefish spends its adult
   life inside about a metre of one anemone and dies if it leaves, so
   there is no wander target here that is not measured from the host.
   Nothing in this file steers by the shore; everything steers by an
   address.

   WHAT SENDS IT DOWN IS THE SWIMMING CRAB (§36), AND THE FIRST
   ANSWER WAS THE EGRET, WHICH COULD NOT WORK. The egret was the
   obvious pick — it already walks this flat and already sends fiddler
   crabs down their burrows (§30) — and a 600-second run fired the
   dive exactly zero times. The reason is in the two species' own
   numbers and not in the code: an egret wades in a hand's depth of
   water, this fish leaves for the channel below 0.30 m of it, and
   those two windows do not overlap on any tide. A bird that is on the
   shore only when the fish is gone can never frighten it.

   The swimming crab has the opposite schedule and it is a real
   predator of small fish: it is active submerged and buried on the
   ebb, so it is on the flat exactly when this fish is. Better still,
   it is one of the two animals that also makes the anemone clench
   (anemones.js), so ONE crab paddling past produces both halves of
   the partnership in the same frame — the host closing on the
   intruder and the guest diving into the closing host. Nothing was
   added to get that; it fell out of picking the threat that could
   actually be there.

   It LOOKS for the crab rather than being told about one, the way the
   pen shell looks for sand stars (§32). Pull, not push, because the
   crab population should not have to learn about a new species every
   time one arrives that is afraid of it.

   AND THE THING THE PAIR IS FOR: `host.guests++` every frame a fish
   is nestled. anemones.js reads that and closes its tentacles into an
   `embrace` instead of a `fold` — the same contact that makes it
   clench on a sand star makes it cradle this. That one branch is the
   whole symbiosis, and it is the reason these two species could not
   be built in separate sections.
   ============================================================ */
(function () {
  'use strict';

  /* ---------- the knobs ---------- */
  var S = 0.085;                // metres per body unit — body length. A real ocellaris is 8-11 cm
  var OCCUPANCY = 0.66;         // fraction of anemones that carry fish. Real ones are not all taken
  var PER_HOST = [1, 3];        // a breeding pair plus a juvenile or two

  var HOME_R = 1.15;            // metres — it never goes further from the host than this
  var HOVER_H = [0.10, 0.30];   // metres above the carpet it likes to sit
  var MIN_DEPTH = 0.30;         // metres of water over the host, below which the fish leaves
  var BACK_DEPTH = 0.45;        // and above which it comes back — a gap, so it does not flicker
  var CLEAR_BED = 0.045;        // it will not swim closer to the sand than this
  var CLEAR_SURF = 0.055;       // nor closer to the surface

  var CRUISE = 0.32;            // m/s hovering and pottering
  var BOLT = 1.35;              // m/s running for cover
  var TURN = 5.0;               // rad/s — a damselfish turns almost on the spot
  var ARRIVE_FROM = 6.0;        // metres seaward the returning fish appears

  var DIVE_R = 2.2;             // metres — how close a paddling crab has to be
  var DIVE_HOLD = [2.5, 6.0];   // seconds it stays buried in the carpet after a fright
  var NESTLE_EVERY = [7, 22];   // seconds between voluntary dips into the tentacles
  var NESTLE_FOR = [1.6, 4.5];
  var SORTIE_EVERY = [3.0, 9.0];
  var SCAN_SECS = 0.35;

  var ROW_HZ = 2.6;             // pectoral beats per second at cruise

  var seed = 6180339;
  function rand() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
  function range(a, b) { return a + rand() * (b - a); }
  function pair(p) { return range(p[0], p[1]); }

  var UP = new THREE.Vector3(0, 1, 0);
  var FWD = new THREE.Vector3(0, 0, 1);
  var AXIS_X = new THREE.Vector3(1, 0, 0);

  /* Body layout, in body units — body length 1.0, centred, +X is the
     head. Every number here was set against a broadside render, which
     is the only way any of them have ever been set on this build. */
  var EYE_AT = { x: 0.325, y: 0.055, z: 0.062 };
  /* The vertical fins sit HIGH and LOW enough to clear a body that is
     0.27 deep either side of the midline — the first pass used the
     mudskipper's offsets against a body a third as deep and both fins
     vanished inside it. A blade is symmetric about its root
     (facet.js), so the root goes at the SKIN and half the fin is
     deliberately buried, which is what gives it a base rather than a
     seam. */
  var DORSAL = { x: -0.34, len: 0.55, h: 0.30, y: 0.24 };
  var ANAL   = { x: -0.34, len: 0.34, h: 0.22, y: -0.105 };
  var PECT_AT = { x: 0.155, y: -0.020, z: 0.082 };
  var PECT_LEN = 0.27, PECT_H = 0.21;
  var PELV_AT = { x: 0.095, y: -0.125, z: 0.046 };
  var PELV_LEN = 0.20, PELV_H = 0.14;
  var TAIL_AT = -0.465;

  function spawn(scene, world, opts) {
    var P = AnemoneFishBody.parts();
    var mat = AnemoneFishBody.material();
    opts = opts || {};
    var hosts = (opts.anemones || null);
    var swimmingcrabs = opts.swimmingcrabs || null;   // optional — see the header

    var group = new THREE.Group();
    group.name = 'anemonefish';
    scene.add(group);

    /* ---------- who lives where ----------
       No host, no fish. See the header: this is the one population on
       the shore that is not independent, and pretending otherwise
       would put orange damselfish hovering over bare sand. */
    var fish = [];
    if (hosts && hosts.length) {
      for (var hi = 0; hi < hosts.length; hi++) {
        if (rand() > OCCUPANCY) continue;
        var host = hosts[hi];
        var n = Math.round(pair(PER_HOST));
        for (var c = 0; c < n; c++) {
          fish.push({
            host: host,
            x: host.x, y: host.y + 0.2, z: host.z,
            tgtX: host.x, tgtY: host.y + 0.2, tgtZ: host.z,
            yaw: range(0, Math.PI * 2), pitch: 0,
            speed: 0,
            state: 'away',
            vis: false,
            /* The biggest fish of a group is the female and sits
               highest in the water — a real anemonefish group is a
               size ladder, and it is free to show. */
            size: c === 0 ? range(1.05, 1.25) : range(0.72, 1.00),
            perch: pair(HOVER_H) * (c === 0 ? 1.15 : 0.85),
            row: rand(), wag: rand(),
            holdT: 0,                 // seconds left of a nestle or a fright
            nextNestle: pair(NESTLE_EVERY),
            nextSortie: pair(SORTIE_EVERY),
            scan: range(0, SCAN_SECS),
            dives: 0                  // lifetime frights — the count that says the egret wiring fires
          });
        }
      }
    }
    var N = fish.length;

    function slots(geo, per, shadow) {
      var m = new THREE.InstancedMesh(geo, mat, Math.max(N * per, 1));
      m.frustumCulled = false;
      m.castShadow = !!shadow;
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      group.add(m);
      return { mesh: m, per: per };
    }
    var R = {
      body:   slots(P.body, 1, true),
      eye:    slots(P.eye, 2),
      tail:   slots(P.tailFin, 1),
      dorsal: slots(P.dorsalFin, 1),
      anal:   slots(P.analFin, 1),
      pect:   slots(P.pectoralFin, 2),
      pelvic: slots(P.pelvicFin, 2)
    };

    /* Barely any per-animal tint. The bars ARE the species
       (anemonefishbody.js) and a population of them shaded every which
       way stops reading as one kind of fish — this is the opposite call
       to the sand-flat animals, where the variation is the point. */
    var tint = new THREE.Color();
    for (var i = 0; i < N; i++) {
      var g = range(0.94, 1.06);
      tint.setRGB(g * range(0.99, 1.03), g, g * range(0.97, 1.02));
      for (var key in R) {
        for (var j = 0; j < R[key].per; j++) R[key].mesh.setColorAt(i * R[key].per + j, tint);
      }
    }
    for (var kc in R) if (R[kc].mesh.instanceColor) R[kc].mesh.instanceColor.needsUpdate = true;

    /* ---------- placement helpers — the crab's basis trick again ---------- */
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
    function putCentred(rec, slot, r, scl) {
      mPart.makeScale(scl, scl, scl);
      mPart.setPosition(r);
      mOut.multiplyMatrices(mBody, mPart);
      rec.mesh.setMatrixAt(slot, mOut);
    }
    function hideFish(fi) {
      R.body.mesh.setMatrixAt(fi, HIDE);
      R.tail.mesh.setMatrixAt(fi, HIDE);
      R.dorsal.mesh.setMatrixAt(fi, HIDE);
      R.anal.mesh.setMatrixAt(fi, HIDE);
      for (var s = 0; s < 2; s++) {
        R.eye.mesh.setMatrixAt(fi * 2 + s, HIDE);
        R.pect.mesh.setMatrixAt(fi * 2 + s, HIDE);
        R.pelvic.mesh.setMatrixAt(fi * 2 + s, HIDE);
      }
    }

    /* ------------------------------------------------------------
       draw

       THE −90° RULE. The body is built along +X and `yaw` is a compass
       bearing off +Z, so the body Euler needs `yaw - PI/2`. Written in
       from the start, as it has been since §31.
       ------------------------------------------------------------ */
    function draw(f, fi) {
      var sc = S * f.size;
      var nested = f.state === 'nestle';

      /* Nestled, the fish lies over on its side in the tentacles —
         which is exactly what a real one does, and it is the one
         posture on this animal that is not level. Everything else it
         does, it does upright. */
      var roll = nested ? 0.85 * Math.sin(f.wag * Math.PI * 2) + 0.55 : 0;

      eul.set(roll, f.yaw - Math.PI * 0.5, f.pitch, 'YZX');
      qb.setFromEuler(eul);
      mBody.compose(root.set(f.x, f.y, f.z), qb, tmp.set(sc, sc, sc));

      putCentred(R.body, fi, root.set(0, 0, 0), 1);

      var effort = 0.35 + Math.min(1, f.speed / CRUISE) * 0.65;
      var swim = Math.sin(f.wag * Math.PI * 2);
      var s;

      for (s = 0; s < 2; s++) {
        var side = s === 0 ? 1 : -1;
        putCentred(R.eye, fi * 2 + s, root.set(EYE_AT.x, EYE_AT.y, side * EYE_AT.z), 1);

        /* The pectorals ROW, and they row out of phase with each other.
           This is the animal's whole propulsion and it does not stop
           when the fish is holding station — a hovering anemonefish is
           working hard, and a pair of still fins is the tell that it
           is not. */
        var beat = Math.sin(f.row * Math.PI * 2 + s * Math.PI);
        root.set(PECT_AT.x, PECT_AT.y, side * PECT_AT.z);
        dir.set(-0.34 - beat * 0.40, -0.16 - beat * 0.12, side * 0.90).normalize();
        put(R.pect, fi * 2 + s, root, dir, PECT_LEN, PECT_H, false);

        root.set(PELV_AT.x, PELV_AT.y, side * PELV_AT.z);
        dir.set(-0.42, -0.88, side * 0.22).normalize();
        put(R.pelvic, fi * 2 + s, root, dir, PELV_LEN, PELV_H, false);
      }

      /* The vertical fins. A fin's LENGTH runs along the back and its
         HEIGHT stands off it, so it points +X and the blade's own Y
         does the standing — the mistake that cost the goby a whole
         debugging pass in §21. */
      root.set(DORSAL.x, DORSAL.y, 0);
      put(R.dorsal, fi, root, AXIS_X, DORSAL.len, DORSAL.h, true);

      root.set(ANAL.x, ANAL.y, 0);
      put(R.anal, fi, root, AXIS_X, ANAL.len, ANAL.h, true);

      /* And the tail, which is the ONLY part scaled by speed. Hovering
         it barely moves; bolting it beats hard. */
      var wagA = swim * 0.50 * (0.15 + 0.85 * Math.min(1, f.speed / BOLT));
      root.set(TAIL_AT, 0, 0);
      dir.set(-Math.cos(wagA), 0, Math.sin(wagA));
      put(R.tail, fi, root, dir, 1, 1, true);
    }

    /* ------------------------------------------------------------
       steering
       ------------------------------------------------------------ */
    function depthOver(h) {
      var surf = world.waterAt(h.x, h.z);
      if (surf === null) return 0;
      var d = surf - world.heightAt(h.x, h.z);
      return d > 0 ? d : 0;
    }

    /* A point in the water column near the host, clamped so the fish
       never swims into the sand or out through the surface. */
    function pickNear(f, radius, height) {
      var h = f.host;
      var a = range(0, Math.PI * 2), d = range(0.15, 1) * radius;
      f.tgtX = h.x + Math.cos(a) * d;
      f.tgtZ = h.z + Math.sin(a) * d;
      f.tgtY = clampY(f, world.heightAt(h.x, h.z) + height);
    }
    function clampY(f, y) {
      var bed = world.heightAt(f.host.x, f.host.z);
      var surf = world.waterAt(f.host.x, f.host.z);
      var lo = bed + CLEAR_BED;
      var hi = surf === null ? lo : surf - CLEAR_SURF;
      if (hi < lo) hi = lo;
      if (y < lo) y = lo;
      if (y > hi) y = hi;
      return y;
    }

    /* A paddling swimming crab inside DIVE_R. The pen shell's scan
       (§32), one species over — LOOK for the threat rather than
       waiting to be told about it. */
    function threatened(f) {
      if (!swimmingcrabs) return false;
      for (var ci = 0; ci < swimmingcrabs.length; ci++) {
        var o = swimmingcrabs[ci];
        if (o.state !== 'active') continue;       // a buried crab is under the sand and harmless
        var dx = o.x - f.x, dz = o.z - f.z;
        if (dx * dx + dz * dz < DIVE_R * DIVE_R) return true;
      }
      return false;
    }

    function goHome(f, y) {
      f.tgtX = f.host.x;
      f.tgtZ = f.host.z;
      f.tgtY = clampY(f, world.heightAt(f.host.x, f.host.z) + y);
    }

    /* ------------------------------------------------------------
       update
       ------------------------------------------------------------ */
    function update(dt) {
      if (!N) return;
      var touched = false;

      for (var fi = 0; fi < N; fi++) {
        var f = fish[fi];
        var h = f.host;
        var depth = depthOver(h);
        var bed = world.heightAt(h.x, h.z);

        /* ---- the tide decides whether this fish is on the plot ---- */
        if (f.state === 'away') {
          if (depth > BACK_DEPTH) {
            /* Comes back in from the SEAWARD side, and which side that
               is gets measured rather than assumed — sample the ground
               both ways along z and start from the lower one. Cheap,
               once per return, and it cannot be wrong the way a
               hard-coded bearing can. */
            var zA = h.z + ARRIVE_FROM, zB = h.z - ARRIVE_FROM;
            var away = world.heightAt(h.x, zA) < world.heightAt(h.x, zB) ? zA : zB;
            f.x = h.x + range(-2, 2);
            f.z = away;
            f.y = clampY(f, bed + f.perch);
            f.state = 'arrive';
            f.vis = true;
            goHome(f, f.perch);
          } else {
            if (f.vis) { hideFish(fi); touched = true; }
            f.vis = false;
            continue;
          }
        } else if (depth < MIN_DEPTH) {
          /* Out it goes. Nothing dies here — this is the egret's
             departure (§30) on a fish's schedule, and the roster is
             explicit that the goby, not this, is the species that
             would reintroduce a real death. */
          f.state = 'away';
          f.vis = false;
          hideFish(fi);
          touched = true;
          continue;
        }

        f.vis = true;
        if (f.holdT > 0) f.holdT -= dt;

        /* ---- what it is doing ---- */
        f.scan -= dt;
        var seesBird = false;
        if (f.scan <= 0) { f.scan = SCAN_SECS; seesBird = threatened(f); }

        if (seesBird && f.state !== 'dive' && f.state !== 'nestle') {
          f.state = 'dive';
          f.holdT = pair(DIVE_HOLD);
          f.dives++;
          goHome(f, 0.02);
        }

        switch (f.state) {
          case 'arrive':
            if (near(f, 0.55)) { f.state = 'hover'; goHome(f, f.perch); }
            break;

          case 'dive':
            if (near(f, 0.14)) f.state = 'nestle';
            break;

          case 'nestle':
            /* Down in the carpet. THIS is the line the whole pair
               exists for — see the header and anemones.js. */
            h.guests++;
            f.x += (h.x - f.x) * Math.min(1, 6 * dt);
            f.z += (h.z - f.z) * Math.min(1, 6 * dt);
            f.y += (clampY(f, bed + 0.02) - f.y) * Math.min(1, 6 * dt);
            f.speed = 0;
            if (f.holdT <= 0 && !seesBird) {
              f.state = 'hover';
              f.nextNestle = pair(NESTLE_EVERY);
              goHome(f, f.perch);
            }
            break;

          case 'sortie':
            if (near(f, 0.18)) { f.state = 'hover'; goHome(f, f.perch); }
            break;

          default:                                  // hover
            f.nextNestle -= dt;
            f.nextSortie -= dt;
            if (f.nextNestle <= 0) {
              /* A voluntary dip. A real anemonefish goes back into its
                 anemone every few seconds all day — nothing is chasing
                 it, that is simply where it lives. */
              f.state = 'dive';
              f.holdT = pair(NESTLE_FOR);
              goHome(f, 0.02);
            } else if (f.nextSortie <= 0) {
              f.nextSortie = pair(SORTIE_EVERY);
              f.state = 'sortie';
              pickNear(f, HOME_R, f.perch + range(-0.05, 0.14));
            } else if (near(f, 0.10)) {
              // bob gently around the station rather than parking on it
              pickNear(f, 0.30, f.perch + range(-0.04, 0.06));
            }
            break;
        }

        /* ---- move ---- */
        if (f.state !== 'nestle') {
          var want = f.state === 'dive' ? BOLT : (f.state === 'arrive' ? CRUISE * 1.6 : CRUISE);
          f.speed += (want - f.speed) * Math.min(1, 3.5 * dt);

          var dx = f.tgtX - f.x, dz = f.tgtZ - f.z, dy = f.tgtY - f.y;
          var flat = Math.hypot(dx, dz);
          if (flat > 1e-4) {
            var wantYaw = Math.atan2(dx, dz);
            var d = wantYaw - f.yaw;
            while (d > Math.PI) d -= Math.PI * 2;
            while (d < -Math.PI) d += Math.PI * 2;
            var turn = TURN * dt;
            f.yaw += Math.abs(d) < turn ? d : (d > 0 ? turn : -turn);
          }
          var step = f.speed * dt;
          if (flat > 1e-4) {
            var k = Math.min(1, step / flat);
            f.x += dx * k;
            f.z += dz * k;
          }
          f.y += dy * Math.min(1, 3.0 * dt);
          f.y = clampY(f, f.y);
          /* Nose follows the climb. Small — a hovering damselfish is
             level, and a fish angled 30° up while it drifts sideways
             reads as a model on a wire. */
          var wantPitch = Math.max(-0.45, Math.min(0.45, -dy * 1.6));
          f.pitch += (wantPitch - f.pitch) * Math.min(1, 4 * dt);
        }

        f.row += dt * ROW_HZ * (0.75 + Math.min(1, f.speed / CRUISE) * 0.5);
        if (f.row > 1) f.row -= Math.floor(f.row);
        f.wag += dt * (1.1 + Math.min(1, f.speed / BOLT) * 3.4);
        if (f.wag > 1) f.wag -= Math.floor(f.wag);

        draw(f, fi);
        touched = true;
      }

      if (touched) for (var k3 in R) R[k3].mesh.instanceMatrix.needsUpdate = true;
    }

    function near(f, r) {
      var dx = f.tgtX - f.x, dy = f.tgtY - f.y, dz = f.tgtZ - f.z;
      return dx * dx + dy * dy + dz * dz < r * r;
    }

    for (i = 0; i < N; i++) hideFish(i);
    for (var k4 in R) R[k4].mesh.instanceMatrix.needsUpdate = true;

    return {
      count: N,
      group: group,
      fish: fish,
      update: update,
      // how many are on the plot right now — the tide read for this species
      home: function () {
        var n = 0;
        for (var i2 = 0; i2 < N; i2++) if (fish[i2].vis) n++;
        return n;
      },
      // how many are down in the tentacles — the symbiosis, counted
      sheltering: function () {
        var n = 0;
        for (var i3 = 0; i3 < N; i3++) if (fish[i3].state === 'nestle') n++;
        return n;
      },
      // lifetime frights — the number that says the egret wiring fires
      dives: function () {
        var n = 0;
        for (var i4 = 0; i4 < N; i4++) n += fish[i4].dives;
        return n;
      }
    };
  }

  window.AnemoneFish = { spawn: spawn };
})();
