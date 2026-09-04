/* ============================================================
   oysters.js — the oyster reef (BUILD_GUIDE §35, roster item 2 —
   "cheapest by a distance").

   THE BARNACLE'S PATTERN, ALMOST WHOLESALE. barnacles.js (§23) is the
   template for every sessile animal cemented to a rock: RockField for
   the surface and its normal, a cluster-seeded scatter so larvae settle
   beside the neighbours that proved the spot works, and one open/shut
   decision keyed on `world.waterAt`. Nothing about that changes here —
   the instance record is the barnacle's, field for field.

   WHAT ACTUALLY DIFFERS IS THE HINGE. A barnacle's trapdoor swings on
   two plates that meet down the shell's own long axis (barnacles.js).
   An oyster's upper valve swings on a hinge line ACROSS the shell, and
   the lower valve is cemented and never moves at all — so `draw()`
   below only ever touches the upper valve and the mantle, and the
   lower valve is written once, exactly like the barnacle's cone.

   THE HINGE NEEDS NO EXTRA FIELD. Body-local +X is already the rock's
   outward normal (`setBody`, same trick as the barnacle), which makes
   local Y and Z the two tangents lying flat against the stone. `spin`
   — already on every instance for the barnacle's own reasons — rotates
   those tangents to a random bearing per animal, so the hinge line can
   simply BE local Z: no second random angle to draw or store, the
   randomisation the barnacle already had is exactly the randomisation
   the hinge needed.

   LOWER LOWER THAN THE BARNACLE. Filtering water for long enough to
   feed a bivalve this size needs more submersion than a barnacle's
   sealed-water-store trick can get away with skipping, so this band
   sits a step down the same boulders — real zonation, not just a
   second population dropped on the barnacle's own rock.
   ============================================================ */
(function () {
  'use strict';

  /* ---------- the knobs ---------- */
  var S = 0.15;                 // metres per body unit — shell length. A real one is 8-12 cm
  var COUNT = 360;
  var ZONE = [1.55, 2.25];      // metres CD — a step down the barnacle's own boulders
  var CLUSTER = 9;               // reefs pack tighter than a barnacle patch
  var CLUSTER_R = 0.38;
  var SUBMERGE = 0.04;          // metres of water over the hinge before it gapes
  var OPEN_RATE = 1.1;          // slower than the barnacle — a heavier lid to lift
  var SHUT_RATE = 4.4;
  var INSET = 0.03;

  var seed = 61903;
  function rand() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
  function range(a, b) { return a + rand() * (b - a); }

  var AXIS_X = new THREE.Vector3(1, 0, 0);
  var UP = new THREE.Vector3(0, 1, 0);
  var FWD = new THREE.Vector3(0, 0, 1);

  /* The hinge triad, in body-local units — fixed, because `spin`
     already carries the per-animal randomisation (see header). */
  /* (HINGE, TAN, NRM0) has to be RIGHT-handed for putBasis to compose a
     proper rotation. HINGE = local Z and NRM0 = local X are both fixed
     by what they mean (the pivot line; the rock's own outward normal),
     which leaves TAN's sign as the one free choice — and (Z, +Y, X) is
     the LEFT-handed ordering, det -1. (Z, -Y, X) is the right-handed
     one: caught by decomposing a placed instance's matrix and finding
     a mirrored (negative) scale where nothing should be. */
  var HINGE = new THREE.Vector3(0, 0, 1);   // the hinge line: valve length runs along it
  var TAN   = new THREE.Vector3(0, -1, 0);  // the other tangent: valve width
  var NRM0  = new THREE.Vector3(1, 0, 0);   // body-local +X, the rock's outward normal

  var GAPE = 0.30;               // radians the upper valve lifts, fully open
  var SHUT_ROLL = 0.03;          // the shell's own thickness, even clamped
  var GAP_LIFT = 0.02;           // body units the upper valve is raised off the lower

  function spawn(scene, world) {
    var P = OysterBody.parts();
    var mat = OysterBody.material();

    var group = new THREE.Group();
    group.name = 'oysters';
    scene.add(group);

    var usable = RockField.usable(world, { zone: ZONE, minR: 0.4, minH: 0.25, inset: INSET });
    var capPoint = RockField.capPoint;

    var oysters = [];
    var tmpPt = {};
    if (usable.length) {
      var guard = 0;
      while (oysters.length < COUNT && guard++ < COUNT * 40) {
        var rk = usable[Math.floor(rand() * usable.length) % usable.length];
        var sa = range(0, Math.PI * 2), sd = range(0.15, 0.95) * rk.r;
        capPoint(rk, sd, sa, tmpPt);
        if (tmpPt.y < ZONE[0] || tmpPt.y > ZONE[1]) continue;

        var n = 1 + Math.floor(rand() * CLUSTER);
        for (var c = 0; c < n && oysters.length < COUNT; c++) {
          var da = sa + range(-1, 1) * (CLUSTER_R / Math.max(0.4, sd));
          var dd = Math.max(0.05, sd + range(-CLUSTER_R, CLUSTER_R));
          if (dd > rk.r * 0.98) continue;
          capPoint(rk, dd, da, tmpPt);
          if (tmpPt.y < ZONE[0] || tmpPt.y > ZONE[1]) continue;
          if (tmpPt.ny < 0.18) continue;
          oysters.push({
            x: tmpPt.x, y: tmpPt.y, z: tmpPt.z,
            nx: tmpPt.nx, ny: tmpPt.ny, nz: tmpPt.nz,
            spin: range(0, Math.PI * 2),
            size: range(0.62, 1.30),
            state: 'shut',
            open: 0,
            vis: true
          });
        }
      }
    }
    var N = oysters.length;

    function slots(geo, per, shadow) {
      var m = new THREE.InstancedMesh(geo, mat, Math.max(N * per, 1));
      m.frustumCulled = false;
      m.castShadow = !!shadow;
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      group.add(m);
      return { mesh: m, per: per };
    }
    var R = {
      lower:  slots(P.lower, 1, true),
      upper:  slots(P.upper, 1, true),
      mantle: slots(P.mantle, 1)
    };

    var tint = new THREE.Color();
    for (var i = 0; i < N; i++) {
      var g = range(0.82, 1.12);
      tint.setRGB(g, g * range(0.97, 1.02), g * range(0.95, 1.04));
      for (var key in R) {
        for (var j = 0; j < R[key].per; j++) R[key].mesh.setColorAt(i * R[key].per + j, tint);
      }
    }
    for (var kc in R) if (R[kc].mesh.instanceColor) R[kc].mesh.instanceColor.needsUpdate = true;

    /* ---------- placement helpers ---------- */
    var mPart = new THREE.Matrix4(), mBody = new THREE.Matrix4(), mOut = new THREE.Matrix4();
    var root = new THREE.Vector3(), tmp = new THREE.Vector3();
    var qb = new THREE.Quaternion(), qSpin = new THREE.Quaternion(), nrm = new THREE.Vector3();
    var xa = new THREE.Vector3(), ya = new THREE.Vector3(), za = new THREE.Vector3();
    var HIDE = new THREE.Matrix4().makeScale(0, 0, 0);

    /* An explicit basis — same reason and the same shape as the pen
       shell's `putBasis` (penshells.js): a valve is a flat sheet, and
       the only thing that matters is the angle between two of them,
       which `put()`'s direction-only aim cannot express. */
    function putBasis(rec, slot, r, ax, ay, az, len, wide) {
      xa.copy(ax).multiplyScalar(len);
      ya.copy(ay).multiplyScalar(wide);
      za.copy(az).multiplyScalar(wide);
      mPart.makeBasis(xa, ya, za);
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

    function setBody(o) {
      nrm.set(o.nx, o.ny, o.nz).normalize();
      qb.setFromUnitVectors(AXIS_X, nrm);
      qSpin.setFromAxisAngle(nrm, o.spin);
      qb.premultiply(qSpin);
      var sc = S * o.size;
      mBody.compose(root.set(o.x, o.y, o.z), qb, tmp.set(sc, sc, sc));
    }

    /* ---------- the lower valve: written once, never again ---------- */
    var C = new THREE.Vector3(), N0 = new THREE.Vector3();
    for (i = 0; i < N; i++) {
      setBody(oysters[i]);
      putBasis(R.lower, i, root.set(0, 0, 0), HINGE, TAN, NRM0, 1, 1);
    }
    R.lower.mesh.instanceMatrix.needsUpdate = true;

    /* ------------------------------------------------------------
       draw the moving parts

       `open` is 0 clamped, 1 fully gaping. The upper valve rolls
       around the fixed hinge line, tangent and normal rotating
       together — the pen shell's own trick (penshells.js), generalised
       from a sand-standing "up" axis to a rock-cemented one.
       ------------------------------------------------------------ */
    function draw(o, oi) {
      setBody(o);

      var roll = SHUT_ROLL + GAPE * o.open;
      var cr = Math.cos(roll), sr = Math.sin(roll);
      C.copy(TAN).multiplyScalar(cr).addScaledVector(NRM0, sr);
      N0.copy(TAN).multiplyScalar(-sr).addScaledVector(NRM0, cr);
      putBasis(R.upper, oi, root.set(0, 0, 0).addScaledVector(N0, GAP_LIFT * o.open + 0.006),
        HINGE, C, N0, 0.97, 0.94);

      if (o.open < 0.12) {
        putCentred(R.mantle, oi, root.set(0, -99, 0), 0.0001);
        return;
      }
      // the fringe sits right at the free edge, opposite the hinge
      root.set(0, 0, 0).addScaledVector(TAN, 0.30).addScaledVector(N0, GAP_LIFT * o.open + 0.02);
      putBasis(R.mantle, oi, root, HINGE, TAN, N0, 0.62 * o.open, 0.5 * o.open);
    }

    /* ---------- update ----------
       Identical decision to the barnacle: is there water over me. */
    function update(dt) {
      var touched = false;
      for (var oi = 0; oi < N; oi++) {
        var o = oysters[oi];
        var surf = world.waterAt(o.x, o.z);
        var wet = surf !== null && surf > o.y + SUBMERGE;
        o.state = wet ? 'open' : 'shut';

        var want = wet ? 1 : 0;
        var moved = false;
        if (o.open !== want) {
          var rate = want ? OPEN_RATE : SHUT_RATE;
          o.open += (want - o.open) * Math.min(1, rate * dt);
          if (Math.abs(o.open - want) < 0.01) o.open = want;
          moved = true;
        }
        if (!moved) continue;

        draw(o, oi);
        touched = true;
      }
      if (touched) {
        R.upper.mesh.instanceMatrix.needsUpdate = true;
        R.mantle.mesh.instanceMatrix.needsUpdate = true;
      }
    }

    for (i = 0; i < N; i++) draw(oysters[i], i);
    R.upper.mesh.instanceMatrix.needsUpdate = true;
    R.mantle.mesh.instanceMatrix.needsUpdate = true;

    return {
      count: N,
      group: group,
      oysters: oysters,
      update: update,
      feeding: function () {
        var n = 0;
        for (var i2 = 0; i2 < N; i2++) if (oysters[i2].state === 'open') n++;
        return n;
      }
    };
  }

  window.Oysters = { spawn: spawn };
})();
