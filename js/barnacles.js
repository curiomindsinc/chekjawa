/* ============================================================
   barnacles.js — the barnacle band (BUILD_GUIDE §1, §6).

   Third organism, and the first SESSILE one. Everything the crab and
   the mudskipper needs — targets, wandering, skipping — is gone.
   What is left is the tide seam by itself:

     open   the column is water. The trapdoor parts and the cirral fan
            sweeps, combing plankton out of the water.
     shut   the column is dry. The plates close on a mouthful of
            seawater and the animal waits, for hours if it has to.

   `stranding` (§6) is null and always will be. Being out of water is
   not a hazard to a barnacle, it is half of its life; the sealed water
   store in the shell is exactly the adaptation for it. Nothing here
   can die and nothing here moves house.

   WHY THE BAND IS THE POINT. A barnacle is the one animal that draws
   the tide on the shore itself. It can only settle where the water
   still reaches it often enough to feed, so the top of the band marks
   the top of the living shore — the same reading a naturalist takes
   off a boulder without a gauge. So placement is not scattered: it is
   clamped to ZONE, in clusters, on rock only.

   SITTING ON A ROCK, NOT ON THE GROUND. Every organism before this one
   stood on the terrain, so its ground normal was up. A barnacle is
   cemented to the side of a boulder at whatever angle the boulder
   offers. world.rocks publishes {x, z, r, top} per boulder — enough to
   model each as an ellipsoid cap and take a real surface point and
   normal off it. The shell is built along +X from its base
   (barnaclebody.js), so placing one is "point +X down the normal" and
   a barnacle on a vertical face costs no extra code.

   RENDERING. Three InstancedMeshes. The shells are written once at
   spawn and never touched again — they are as static as the rocks. Only
   the trapdoor and the fan move, and only while submerged.
   ============================================================ */
(function () {
  'use strict';

  /* ---------- the knobs ---------- */
  var S = 0.26;                 // metres per body unit — see the scale note below
  var COUNT = 340;
  var ZONE = [2.2, 2.8];        // metres CD — guide §1, the barnacle band
  var CLUSTER = 7;              // how many settle around one seed point
  var CLUSTER_R = 0.55;         // metres — how tight a cluster is
  var SUBMERGE = 0.03;          // metres of water over the shell before it opens
  var SWEEP_SECS = 0.9;         // one full cirral sweep
  var INSET = 0.05;             // metres sunk into the rock surface — see the placement note

  /* Same exaggeration as the crab and the mudskipper: a real barnacle is
     1–2 cm across, invisible on a 300 m transect. S is the one knob. */

  var seed = 5150;
  function rand() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
  function range(a, b) { return a + rand() * (b - a); }

  var AXIS_X = new THREE.Vector3(1, 0, 0);
  var UP = new THREE.Vector3(0, 1, 0);
  var FWD = new THREE.Vector3(0, 0, 1);

  /* Body layout, in body units. The mouth is the top of the cone, and
     both moving parts hang off it. */
  var MOUTH_X = 0.58;
  var MOUTH_R = 0.27;
  var CIRRI_LEN = 0.44;

  function spawn(scene, world) {
    var P = BarnacleBody.parts();
    var mat = BarnacleBody.material();

    var group = new THREE.Group();
    group.name = 'barnacles';
    scene.add(group);

    /* ------------------------------------------------------------
       placement

       Each boulder is treated as an ellipsoid cap: radius r at the
       ground, rising to `top` at its centre. That gives both a surface
       point and a normal at any radial distance, which is all a
       cemented animal needs. Rocks whose cap never crosses the band
       are skipped outright — barnacles do not settle below the water
       they can feed in or above the water that reaches them.
       ------------------------------------------------------------ */
    var usable = RockField.usable(world, {
      zone: ZONE, minR: 0.4, minH: 0.25, inset: INSET
    });
    var capPoint = RockField.capPoint;

    var barnacles = [];
    var tmpPt = {};
    if (usable.length) {
      var guard = 0;
      while (barnacles.length < COUNT && guard++ < COUNT * 40) {
        var rk2 = usable[Math.floor(rand() * usable.length) % usable.length];
        // seed the cluster somewhere legal on this rock
        var sa = range(0, Math.PI * 2), sd = range(0.15, 0.95) * rk2.r;
        capPoint(rk2, sd, sa, tmpPt);
        if (tmpPt.y < ZONE[0] || tmpPt.y > ZONE[1]) continue;

        /* Larvae settle beside barnacles that are already there — proof
           the spot works, and a mate within reach of an animal that can
           never move. That is why they arrive in patches, and why this
           places a cluster per seed rather than one at a time. */
        var n = 1 + Math.floor(rand() * CLUSTER);
        for (var c = 0; c < n && barnacles.length < COUNT; c++) {
          var da = sa + range(-1, 1) * (CLUSTER_R / Math.max(0.4, sd));
          var dd = Math.max(0.05, sd + range(-CLUSTER_R, CLUSTER_R));
          if (dd > rk2.r * 0.98) continue;
          capPoint(rk2, dd, da, tmpPt);
          if (tmpPt.y < ZONE[0] || tmpPt.y > ZONE[1]) continue;
          if (tmpPt.ny < 0.18) continue;                  // no upside-down animals
          barnacles.push({
            x: tmpPt.x, y: tmpPt.y, z: tmpPt.z,
            nx: tmpPt.nx, ny: tmpPt.ny, nz: tmpPt.nz,
            spin: range(0, Math.PI * 2),
            size: range(0.68, 1.25),
            state: 'shut',
            phase: rand(),                                // sweeps are not in step
            open: 0,                                      // 0 shut .. 1 parted
            vis: true
          });
        }
      }
    }

    var N = barnacles.length;

    /* ---------- meshes ----------
       Frustum culling off, same reason as every other population here:
       three derives an InstancedMesh's bounds from its geometry, so a
       field spread over 300 m would vanish as soon as the camera left
       the middle of the plot. */
    function slots(geo, per, shadow) {
      var m = new THREE.InstancedMesh(geo, mat, Math.max(N * per, 1));
      m.frustumCulled = false;
      m.castShadow = !!shadow;
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      group.add(m);
      return { mesh: m, per: per };
    }
    var R = {
      shell: slots(P.shell, 1, true),
      plate: slots(P.operculum, 2),
      cirri: slots(P.cirri, 1)
    };

    var tint = new THREE.Color();
    for (var i = 0; i < N; i++) {
      var g = range(0.84, 1.10);
      tint.setRGB(g * range(0.98, 1.03), g, g * range(0.95, 1.02));
      for (var key in R) {
        for (var j = 0; j < R[key].per; j++) R[key].mesh.setColorAt(i * R[key].per + j, tint);
      }
    }
    for (var k in R) if (R[k].mesh.instanceColor) R[k].mesh.instanceColor.needsUpdate = true;

    /* ---------- placement helpers — same basis trick as the crab ---------- */
    var xa = new THREE.Vector3(), ya = new THREE.Vector3(), za = new THREE.Vector3();
    var mPart = new THREE.Matrix4(), mBody = new THREE.Matrix4(), mOut = new THREE.Matrix4();
    var root = new THREE.Vector3(), dir = new THREE.Vector3(), tmp = new THREE.Vector3();
    var qb = new THREE.Quaternion(), qSpin = new THREE.Quaternion(), nrm = new THREE.Vector3();
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

    /* The body basis: +X points down the rock's outward normal, so
       everything the body file built along +X stands off the rock
       correctly, and `spin` turns the animal around that axis. */
    function setBody(b) {
      nrm.set(b.nx, b.ny, b.nz).normalize();
      qb.setFromUnitVectors(AXIS_X, nrm);
      qSpin.setFromAxisAngle(nrm, b.spin);
      qb.premultiply(qSpin);
      var sc = S * b.size;
      mBody.compose(root.set(b.x, b.y, b.z), qb, tmp.set(sc, sc, sc));
    }

    /* ---------- shells: written once, never again ---------- */
    for (i = 0; i < N; i++) {
      setBody(barnacles[i]);
      R.shell.mesh.setMatrixAt(i, mBody);
    }
    R.shell.mesh.instanceMatrix.needsUpdate = true;

    /* ------------------------------------------------------------
       draw the moving parts

       `open` is 0 shut, 1 fully parted. The plates swing apart around
       the mouth's centre line and the fan rolls out through the gap —
       so one value drives both, and the animal cannot be caught
       sweeping through a closed trapdoor.
       ------------------------------------------------------------ */
    function draw(b, bi) {
      setBody(b);

      var o = b.open;
      var swing = o * 0.85;                       // radians the plates lift
      var s;
      for (s = 0; s < 2; s++) {
        var side = s === 0 ? 1 : -1;
        root.set(MOUTH_X, 0, 0);
        dir.set(Math.sin(swing), 0, side * Math.cos(swing));
        put(R.plate, bi * 2 + s, root, dir, MOUTH_R, MOUTH_R * 1.5, true);
      }

      if (o < 0.12) {
        R.cirri.mesh.setMatrixAt(bi, HIDE);       // nothing sticks out of a shut shell
        return;
      }
      /* The sweep: the fan reaches out, curls back toward the mouth,
         and repeats. `phase` is per animal so a cluster does not beat
         in unison — a patch of barnacles feeding is a shimmer, not a
         metronome. */
      var ph = b.phase * Math.PI * 2;
      var reach = 0.45 + 0.55 * (0.5 - 0.5 * Math.cos(ph));
      var lean = Math.sin(ph) * 0.9;
      /* The fan reaches ACROSS the mouth, not straight up out of it. An
         earlier version pointed it down the shell axis and every animal
         grew a dark vertical feather — barnacles do not wave flags,
         they rake sideways through the water above the aperture. */
      dir.set(0.58, Math.sin(lean) * 0.82, Math.cos(lean) * 0.82).normalize();
      root.set(MOUTH_X, 0, 0);
      put(R.cirri, bi, root, dir, CIRRI_LEN * reach * o, MOUTH_R * 1.25 * o, true);
    }

    /* ------------------------------------------------------------
       update

       The only decision in the file: is there water over me. Note it
       reads world.waterAt, not world.tide — a barnacle sitting in a
       pool that is standing above the sea is submerged and feeding,
       and the pool is exactly what waterAt exists to report (§3).
       ------------------------------------------------------------ */
    function update(dt) {
      var touched = false;

      for (var bi = 0; bi < N; bi++) {
        var b = barnacles[bi];
        var surf = world.waterAt(b.x, b.z);
        var wet = surf !== null && surf > b.y + SUBMERGE;
        b.state = wet ? 'open' : 'shut';

        var want = wet ? 1 : 0;
        var moved = false;
        if (b.open !== want) {
          // the plates snap shut and open more slowly — shutting is the reflex
          var rate = want ? 2.2 : 5.5;
          b.open += (want - b.open) * Math.min(1, rate * dt);
          if (Math.abs(b.open - want) < 0.01) b.open = want;
          moved = true;
        }
        if (wet) {
          b.phase += dt / SWEEP_SECS;
          if (b.phase > 1) b.phase -= 1;
          moved = true;
        }
        if (!moved) continue;                     // shut and settled: nothing to write

        draw(b, bi);
        touched = true;
      }

      if (touched) {
        R.plate.mesh.instanceMatrix.needsUpdate = true;
        R.cirri.mesh.instanceMatrix.needsUpdate = true;
      }
    }

    // first frame: put every trapdoor in its shut pose
    for (i = 0; i < N; i++) draw(barnacles[i], i);
    R.plate.mesh.instanceMatrix.needsUpdate = true;
    R.cirri.mesh.instanceMatrix.needsUpdate = true;

    return {
      count: N,
      group: group,
      barnacles: barnacles,
      update: update,
      // how many are feeding right now — the band's own tide gauge
      feeding: function () {
        var n = 0;
        for (var i2 = 0; i2 < N; i2++) if (barnacles[i2].state === 'open') n++;
        return n;
      }
    };
  }

  window.Barnacles = { spawn: spawn };
})();
