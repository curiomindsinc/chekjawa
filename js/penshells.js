/* ============================================================
   penshells.js — the pen shells (BUILD_GUIDE §32).

   The second filter feeder. `FILTER FEEDERS` has held the barnacle
   alone since §22, which made the whole guild look like "the thing
   that lives on rocks" — and the guild's real story on a tidal flat is
   that it also stands up out of open sand where there is nothing to
   cling to at all.

     open   submerged. The valves gape and the mantle fringe shows
     clap   SHUT HARD, and not because of the tide — something came
            too close. Holds for a couple of seconds, then reopens
     shut   the water has gone. Closed on a mouthful of it, waiting

   THE BARNACLE'S PATTERN, ONE STATE WIDER. §23's barnacle has exactly
   one decision in the whole file: is there water over me. This is the
   same file with a second input, and the second input is the
   interesting one — a pen shell claps its valves when something passes
   over it, and that startle is the only thing a sessile animal can do
   that is not about the tide.

   WHAT SETS IT OFF IS THE SAND STAR. Both species ship in §32 and both
   work the same low flat, so the pairing costs nothing and is real: a
   sand star quartering the sediment goes straight over the top of
   anything standing in it. This is the fourth inter-population wiring
   on this shore, after the sea star setting off the sea hare's ink
   (§27), the egret sending fiddlers down their holes (§30) and hermit
   crabs fighting each other (§31) — and like all of them it is an
   OPTIONAL argument, so neither species needs the other to exist.

   NOTHING IS EATEN AND NOTHING IS HURT. A sand star cannot open a pen
   shell; a real one is opened by an octopus, which is still on the
   queue. What is modelled is the flinch, which is the part that shows.

   STANDING IN SAND, NOT CEMENTED TO ROCK. The barnacle needed
   rockfield.js to find a surface and a normal. This one needs neither:
   it stands upright in flat sediment, so placement is the plain
   band-and-spacing scatter every sand-flat species here uses, and the
   body axis is simply up.

   RENDERING. Three InstancedMeshes: valves (2 each), mantle, and the
   sand collar at the base. The collar is written once at spawn and
   never touched again — like the barnacle's shells, it is as static as
   the ground.
   ============================================================ */
(function () {
  'use strict';

  /* ---------- the knobs ---------- */
  var S = 0.62;                 // metres per body unit — shell height. A real one is 20–40 cm
  var COUNT = 26;
  var ZONE = [0.10, 0.90];      // metres CD — the low flat and the lagoon
  var Z_RANGE = [26, 62];
  var SPACING = 2.0;

  var BURIED = 0.36;            // fraction of the shell below the sand — point down, two thirds out
  var SUBMERGE = 0.05;          // metres of water over the gape before it opens
  var GAPE = 0.32;              // radians each valve rolls open off the hinge
  var SHUT_ROLL = 0.05;         // and how far apart they sit even shut — the shell's own thickness
  var PULSE_SECS = 2.6;         // one slow breathing cycle of the gape

  var CLAP_R = 1.25;            // metres — how close something has to pass
  var CLAP_SECS = 2.2;          // how long it stays shut after a fright
  var SCAN_SECS = 0.35;         // it checks for company on a tick, not every frame

  var seed = 3141597;
  function rand() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
  function range(a, b) { return a + rand() * (b - a); }

  var UP = new THREE.Vector3(0, 1, 0);
  var FWD = new THREE.Vector3(0, 0, 1);
  var AXIS_X = new THREE.Vector3(1, 0, 0);

  /* Body layout, in body units. The hinge runs down one edge and both
     valves swing about it, so the parting is a V opening to one side
     rather than a shell splitting down its middle. */
  var HINGE_Z = 0.02;
  var MANTLE_AT = 0.66;         // how far up the shell the fringe sits
  var MANTLE_LEN = 0.26;

  function spawn(scene, world, opts) {
    var P = PenShellBody.parts();
    var mat = PenShellBody.material();
    opts = opts || {};
    var sandstars = opts.sandstars || null;      // optional — see the header

    var group = new THREE.Group();
    group.name = 'pen-shells';
    scene.add(group);

    function onRock(x, z) {
      for (var i = 0; i < world.rocks.length; i++) {
        var r = world.rocks[i];
        var dx = r.x - x, dz = r.z - z;
        if (dx * dx + dz * dz < (r.r + 1.2) * (r.r + 1.2)) return true;
      }
      return false;
    }

    var halfX = world.simArea.halfX - 8;
    var shells = [];
    var guard = 0;
    while (shells.length < COUNT && guard++ < COUNT * 500) {
      var x = range(-halfX, halfX);
      var z = range(Z_RANGE[0], Z_RANGE[1]);
      var h = world.heightAt(x, z);
      if (h < ZONE[0] || h > ZONE[1]) continue;
      if (onRock(x, z)) continue;
      var clash = false;
      for (var pi = 0; pi < shells.length; pi++) {
        var o = shells[pi];
        if ((o.x - x) * (o.x - x) + (o.z - z) * (o.z - z) < SPACING * SPACING) { clash = true; break; }
      }
      if (clash) continue;
      shells.push({
        x: x, y: h, z: z,
        yaw: range(0, Math.PI * 2),
        /* Real ones lean. A perfectly upright row reads as fence posts,
           and a pen shell settles at whatever angle the current that
           dropped its larva left it at. */
        lean: range(-0.22, 0.22),
        tilt: range(-0.22, 0.22),
        state: 'shut',
        open: 0,                          // 0 clamped .. 1 fully gaping
        pulse: rand(),
        clapT: 0,                         // seconds left of a fright
        scan: range(0, SCAN_SECS),
        size: range(0.72, 1.30),
        claps: 0
      });
    }
    var N = shells.length;

    function slots(geo, per, shadow) {
      var m = new THREE.InstancedMesh(geo, mat, Math.max(N * per, 1));
      m.frustumCulled = false;
      m.castShadow = !!shadow;
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      group.add(m);
      return { mesh: m, per: per };
    }
    var R = {
      valve:  slots(P.valve, 2, true),
      mantle: slots(P.mantle, 1),
      collar: slots(P.collar, 1)
    };

    var tint = new THREE.Color();
    for (var i = 0; i < N; i++) {
      var g = range(0.82, 1.16);
      tint.setRGB(g * range(1.0, 1.06), g, g * range(0.88, 0.99));
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
    var UPX = new THREE.Vector3(), WID = new THREE.Vector3(), NRM = new THREE.Vector3();

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
    /* An EXPLICIT basis, which `put` cannot give.

       `put` derives the two side axes from the length axis, and for a
       limb that is exactly right — a leg does not care which way it is
       rolled. A bivalve valve does: it is a flat sheet, and the whole
       animal is the angle between two of those sheets. Rolling it is
       the only thing that matters and `put` has no way to say it.

       The first pass tried to open the shell by tilting each valve's
       LENGTH axis instead, which is a different operation entirely, and
       the broadside came back with two parallel plates of different
       apparent widths leaning the same way. Blade geometry runs length
       along +X, width along +Y and thickness along +Z (facet.js), so
       those are the three vectors this takes. */
    function putBasis(rec, slot, r, ax, ay, az, len, wide) {
      xa.copy(ax).normalize().multiplyScalar(len);
      ya.copy(ay).normalize().multiplyScalar(wide);
      za.copy(az).normalize().multiplyScalar(wide);
      mPart.makeBasis(xa, ya, za);
      mPart.setPosition(r);
      mOut.multiplyMatrices(mBody, mPart);
      rec.mesh.setMatrixAt(slot, mOut);
    }

    /* The body basis: +X is up out of the sand, `yaw` spins the animal
       about that axis and `lean`/`tilt` give it the angle it settled
       at. Built once per shell, reused for both valves and the fringe. */
    function setBody(p) {
      var sc = S * p.size;
      var floorY = world.heightAt(p.x, p.z);
      eul.set(p.tilt, p.yaw, Math.PI * 0.5 + p.lean, 'YXZ');
      qb.setFromEuler(eul);
      // the shell's own origin is its buried point, below the surface
      mBody.compose(
        root.set(p.x, floorY - BURIED * sc, p.z), qb, tmp.set(sc, sc, sc)
      );
    }

    /* ------------------------------------------------------------
       draw the moving parts

       `open` is 0 clamped, 1 fully gaping. The two valves swing about
       the hinge edge by half the gape each, and the mantle fringe
       shows through the gap — so one value drives both, and the animal
       can never be caught with its fringe out through a shut shell.
       Same guarantee, and the same reason, as the barnacle's trapdoor.
       ------------------------------------------------------------ */
    function draw(p, pi2) {
      setBody(p);

      /* Both valves keep the SAME length axis — straight up the shell,
         which is +X in body space. What opens is the angle between
         their faces, rolled about that axis: a book, hinged down its
         spine. `SHUT_ROLL` is the shell's own thickness, so a clamped
         pair is two sheets a few degrees apart rather than two sheets
         in the same plane fighting over the same pixels. */
      var o = p.open;
      var s;
      for (s = 0; s < 2; s++) {
        var side = s === 0 ? 1 : -1;
        var roll = side * (SHUT_ROLL + GAPE * o);
        var cr = Math.cos(roll), sr = Math.sin(roll);
        UPX.set(1, 0, 0);
        WID.set(0, cr, sr);                        // the valve's width, rolled about the shell axis
        NRM.set(0, -sr, cr);                       // and its face normal, square to that
        root.set(0, 0, side * HINGE_Z);
        putBasis(R.valve, pi2 * 2 + s, root, UPX, WID, NRM, 1, 1);
      }

      if (o < 0.10) {
        // a clamped shell shows nothing soft at all
        putCentred(R.mantle, pi2, root.set(0, -99, 0), 0.0001);
        return;
      }
      /* The fringe, breathing. It is not a valve, so it does not roll —
         it sits across the gape at the top of the shell and pulses,
         which at any real viewing distance is the whole difference
         between a feeding animal and a dead shell standing in sand. */
      var breath = 0.82 + 0.18 * Math.sin(p.pulse * Math.PI * 2);
      UPX.set(1, 0, 0);
      WID.set(0, 1, 0);
      NRM.set(0, 0, 1);
      root.set(MANTLE_AT, 0, 0);
      putBasis(R.mantle, pi2, root, UPX, WID, NRM, MANTLE_LEN * o * breath, 0.62 * o);
    }

    /* Anything close enough to set it off. Kept to a tick rather than
       every frame: 26 shells against 24 stars is 624 distance checks,
       which is nothing three times a second and wasteful sixty times. */
    function startled(p) {
      if (!sandstars) return false;
      for (var i2 = 0; i2 < sandstars.length; i2++) {
        var st = sandstars[i2];
        if (st.state === 'buried') continue;       // a buried star passes underneath
        var dx = st.x - p.x, dz = st.z - p.z;
        if (dx * dx + dz * dz < CLAP_R * CLAP_R) return true;
      }
      return false;
    }

    /* ------------------------------------------------------------
       update
       ------------------------------------------------------------ */
    function update(dt) {
      var touched = false;

      for (var pi2 = 0; pi2 < N; pi2++) {
        var p = shells[pi2];
        var sc = S * p.size;
        // the gape is at the TOP of the shell, not at the sand
        var gapeY = world.heightAt(p.x, p.z) + (1 - BURIED) * sc * 0.9;
        var surf = world.waterAt(p.x, p.z);
        var wet = surf !== null && surf > gapeY + SUBMERGE;

        if (p.clapT > 0) p.clapT -= dt;

        if (!wet) {
          p.state = 'shut';
          p.clapT = 0;
        } else {
          p.scan -= dt;
          if (p.scan <= 0) {
            p.scan = SCAN_SECS;
            if (p.clapT <= 0 && startled(p)) { p.clapT = CLAP_SECS; p.claps++; }
          }
          p.state = p.clapT > 0 ? 'clap' : 'open';
        }

        var want = p.state === 'open' ? 1 : 0;
        var moved = false;
        if (p.open !== want) {
          /* Shutting is a muscle, opening is the muscle letting go, so
             they are not the same speed — and a startle shuts harder
             than the tide does. The barnacle makes the same
             distinction; a pen shell just makes it louder. */
          var rate = want ? 1.6 : (p.state === 'clap' ? 14 : 6);
          p.open += (want - p.open) * Math.min(1, rate * dt);
          if (Math.abs(p.open - want) < 0.01) p.open = want;
          moved = true;
        }
        if (p.state === 'open') {
          p.pulse += dt / PULSE_SECS;
          if (p.pulse > 1) p.pulse -= 1;
          moved = true;
        }
        if (!moved) continue;                      // shut and settled: nothing to write

        draw(p, pi2);
        touched = true;
      }

      if (touched) {
        R.valve.mesh.instanceMatrix.needsUpdate = true;
        R.mantle.mesh.instanceMatrix.needsUpdate = true;
      }
    }

    // the sand collars are static: written once, never again
    for (i = 0; i < N; i++) {
      setBody(shells[i]);
      putCentred(R.collar, i, root.set(BURIED * 0.98, 0, 0), 1);
      draw(shells[i], i);
    }
    for (var k3 in R) R[k3].mesh.instanceMatrix.needsUpdate = true;

    return {
      count: N,
      group: group,
      shells: shells,
      update: update,
      // how many are gaping — the guild's other tide gauge, one band lower
      feeding: function () {
        var n = 0;
        for (var i3 = 0; i3 < N; i3++) if (shells[i3].state === 'open') n++;
        return n;
      },
      // total startles since spawn — the number that says the wiring fires
      claps: function () {
        var n = 0;
        for (var i4 = 0; i4 < N; i4++) n += shells[i4].claps;
        return n;
      }
    };
  }

  window.PenShells = { spawn: spawn };
})();
