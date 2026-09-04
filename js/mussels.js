/* ============================================================
   mussels.js — the green mussel bed (BUILD_GUIDE §35, roster item 3).

   THE OYSTER'S PATTERN, ONE HINGE WIDER. oysters.js cements a shell
   to a rock's surface and its normal (RockField, barnaclebody.js's
   whole placement scheme) and rolls a valve open around a fixed
   body-local hinge line. This file reuses every part of that except
   which valve moves: an oyster's lower valve is cemented dead and
   only the lid lifts; a mussel's byssal point is the only fixed thing
   about it and BOTH valves gape from there, symmetrically — the pen
   shell's own two-sided roll (penshells.js), carried over onto a
   rock-normal body frame instead of a sand-standing one.

   THE ONE NEW FIELD IS `lean`. A barnacle stands off its rock at
   exactly the surface normal and a cluster of them reads as a
   volcano field, which is right for a barnacle. A mussel bed does not
   read that way: every individual in a real clump sits at its own
   jumbled angle, packed edge to edge and leaning on its neighbours.
   `lean` tilts body-local +X away from the pure normal, in local
   space, BEFORE the normal alignment and the per-animal spin are
   applied — so it rotates with the animal rather than fighting the
   randomisation already doing the heavy lifting for barnacle and
   oyster alike.

   DENSER THAN EITHER OF THEM. Real beds are the tightest packing on
   this shore's rock, tighter than an oyster reef and far tighter than
   a barnacle patch — CLUSTER and CLUSTER_R below are pulled in to
   match, which is the whole of what "the beat is the clump" (roster)
   costs to build once the placement code already exists.
   ============================================================ */
(function () {
  'use strict';

  /* ---------- the knobs ---------- */
  var S = 0.13;                 // metres per body unit — shell length. A real one is 8-15 cm
  var COUNT = 420;
  var ZONE = [1.30, 2.10];      // metres CD — a further step down the oyster's own boulders
  var CLUSTER = 12;              // the tightest packing on this shore's rock
  var CLUSTER_R = 0.26;
  var SUBMERGE = 0.04;
  var OPEN_RATE = 1.6;
  var SHUT_RATE = 5.0;
  var GAPE = 0.14;               // narrower than the oyster — a mussel never gapes wide
  var SHUT_ROLL = 0.025;
  var HINGE_GAP = 0.012;         // body units between the two valve roots at the point
  var INSET = 0.02;
  var LEAN_MAX = 0.55;           // radians — how far off the pure normal a mussel can tip

  var BYSSUS_N = 3;

  var seed = 74123;
  function rand() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
  function range(a, b) { return a + rand() * (b - a); }

  var AXIS_X = new THREE.Vector3(1, 0, 0);
  var LOCAL_Z = new THREE.Vector3(0, 0, 1);
  var UP = new THREE.Vector3(0, 1, 0);
  var FWD = new THREE.Vector3(0, 0, 1);

  /* Right-handed by the same fix as oysters.js: (Z, +Y, X) is a
     mirrored (det -1) ordering, (Z, -Y, X) is not. See its comment. */
  var HINGE = new THREE.Vector3(0, 0, 1);   // valve length runs along body-local Z
  var TAN   = new THREE.Vector3(0, -1, 0);  // the width tangent
  var NRM0  = new THREE.Vector3(1, 0, 0);   // body-local +X: the rock's outward normal

  function spawn(scene, world) {
    var P = MusselBody.parts();
    var mat = MusselBody.material();

    var group = new THREE.Group();
    group.name = 'mussels';
    scene.add(group);

    var usable = RockField.usable(world, { zone: ZONE, minR: 0.4, minH: 0.25, inset: INSET });
    var capPoint = RockField.capPoint;

    var mussels = [];
    var tmpPt = {};
    if (usable.length) {
      var guard = 0;
      while (mussels.length < COUNT && guard++ < COUNT * 40) {
        var rk = usable[Math.floor(rand() * usable.length) % usable.length];
        var sa = range(0, Math.PI * 2), sd = range(0.15, 0.95) * rk.r;
        capPoint(rk, sd, sa, tmpPt);
        if (tmpPt.y < ZONE[0] || tmpPt.y > ZONE[1]) continue;

        var n = 1 + Math.floor(rand() * CLUSTER);
        for (var c = 0; c < n && mussels.length < COUNT; c++) {
          var da = sa + range(-1, 1) * (CLUSTER_R / Math.max(0.35, sd));
          var dd = Math.max(0.05, sd + range(-CLUSTER_R, CLUSTER_R));
          if (dd > rk.r * 0.98) continue;
          capPoint(rk, dd, da, tmpPt);
          if (tmpPt.y < ZONE[0] || tmpPt.y > ZONE[1]) continue;
          if (tmpPt.ny < 0.12) continue;
          mussels.push({
            x: tmpPt.x, y: tmpPt.y, z: tmpPt.z,
            nx: tmpPt.nx, ny: tmpPt.ny, nz: tmpPt.nz,
            spin: range(0, Math.PI * 2),
            lean: range(0, LEAN_MAX),
            size: range(0.60, 1.20),
            state: 'shut',
            open: 0,
            vis: true
          });
        }
      }
    }
    var N = mussels.length;

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
      byssus: slots(P.byssus, BYSSUS_N)
    };

    var tint = new THREE.Color();
    for (var i = 0; i < N; i++) {
      var g = range(0.80, 1.16);
      tint.setRGB(g, g * range(0.98, 1.05), g * range(1.0, 1.08));
      for (var key in R) {
        for (var j = 0; j < R[key].per; j++) R[key].mesh.setColorAt(i * R[key].per + j, tint);
      }
    }
    for (var kc in R) if (R[kc].mesh.instanceColor) R[kc].mesh.instanceColor.needsUpdate = true;

    /* ---------- placement helpers ---------- */
    var mPart = new THREE.Matrix4(), mBody = new THREE.Matrix4(), mOut = new THREE.Matrix4();
    var root = new THREE.Vector3(), dir = new THREE.Vector3(), tmp = new THREE.Vector3();
    var qb = new THREE.Quaternion(), qSpin = new THREE.Quaternion(), qLean = new THREE.Quaternion();
    var nrm = new THREE.Vector3();
    var xa = new THREE.Vector3(), ya = new THREE.Vector3(), za = new THREE.Vector3();

    function putBasis(rec, slot, r, ax, ay, az, len, wide) {
      xa.copy(ax).multiplyScalar(len);
      ya.copy(ay).multiplyScalar(wide);
      za.copy(az).multiplyScalar(wide);
      mPart.makeBasis(xa, ya, za);
      mPart.setPosition(r);
      mOut.multiplyMatrices(mBody, mPart);
      rec.mesh.setMatrixAt(slot, mOut);
    }
    /* Direction-only aim, for the byssal threads — a thread is a limb,
       not a sheet, so it does not need putBasis's explicit roll. */
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

    /* Body-local +X aligns to the rock's outward normal (barnaclebody's
       trick); `lean` tips that alignment off-normal FIRST, in local
       space, so it rotates with the animal once `spin` turns it to a
       random bearing — see the header. */
    function setBody(m) {
      nrm.set(m.nx, m.ny, m.nz).normalize();
      qb.setFromUnitVectors(AXIS_X, nrm);
      qLean.setFromAxisAngle(LOCAL_Z, m.lean);
      qb.multiply(qLean);
      qSpin.setFromAxisAngle(nrm, m.spin);
      qb.premultiply(qSpin);
      var sc = S * m.size;
      mBody.compose(root.set(m.x, m.y, m.z), qb, tmp.set(sc, sc, sc));
    }

    /* ---------- byssus: written once, never again ---------- */
    for (i = 0; i < N; i++) {
      setBody(mussels[i]);
      for (var bi = 0; bi < BYSSUS_N; bi++) {
        var a = -0.9 + bi * (1.8 / (BYSSUS_N - 1)) + (mussels[i].spin % 1) * 0.3;
        dir.set(-0.92, Math.sin(a) * 0.30, Math.cos(a) * 0.30).normalize();
        put(R.byssus, i * BYSSUS_N + bi, root.set(0, 0, 0), dir, range(0.22, 0.40), 1);
      }
    }
    R.byssus.mesh.instanceMatrix.needsUpdate = true;

    /* ------------------------------------------------------------
       draw the moving parts

       Both valves roll about the same hinge line, mirrored — the pen
       shell's exact pattern (penshells.js), on this animal's own
       tangent frame instead of "up out of the sand".
       ------------------------------------------------------------ */
    var C = new THREE.Vector3(), N0 = new THREE.Vector3();
    function draw(m, mi) {
      setBody(m);
      var s;
      for (s = 0; s < 2; s++) {
        var side = s === 0 ? 1 : -1;
        var roll = side * (SHUT_ROLL + GAPE * m.open);
        var cr = Math.cos(roll), sr = Math.sin(roll);
        C.copy(TAN).multiplyScalar(cr).addScaledVector(NRM0, sr);
        N0.copy(TAN).multiplyScalar(-sr).addScaledVector(NRM0, cr);
        putBasis(R.valve, mi * 2 + s, root.set(0, 0, 0).addScaledVector(TAN, side * HINGE_GAP),
          HINGE, C, N0, 1, 1);
      }
    }

    /* ---------- update ----------
       Identical decision to the barnacle and the oyster: is there
       water over me. */
    function update(dt) {
      var touched = false;
      for (var mi = 0; mi < N; mi++) {
        var m = mussels[mi];
        var surf = world.waterAt(m.x, m.z);
        var wet = surf !== null && surf > m.y + SUBMERGE;
        m.state = wet ? 'open' : 'shut';

        var want = wet ? 1 : 0;
        if (m.open === want) continue;
        var rate = want ? OPEN_RATE : SHUT_RATE;
        m.open += (want - m.open) * Math.min(1, rate * dt);
        if (Math.abs(m.open - want) < 0.01) m.open = want;

        draw(m, mi);
        touched = true;
      }
      if (touched) R.valve.mesh.instanceMatrix.needsUpdate = true;
    }

    for (i = 0; i < N; i++) draw(mussels[i], i);
    R.valve.mesh.instanceMatrix.needsUpdate = true;

    return {
      count: N,
      group: group,
      mussels: mussels,
      update: update,
      feeding: function () {
        var n = 0;
        for (var i2 = 0; i2 < N; i2++) if (mussels[i2].state === 'open') n++;
        return n;
      }
    };
  }

  window.Mussels = { spawn: spawn };
})();
