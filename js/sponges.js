/* ============================================================
   sponges.js — the encrusting sponge (BUILD_GUIDE §35, roster item 4 —
   "static body").

   THE CHEAPEST ANIMAL IN THE BUILD, and deliberately so — the roster
   calls it out as such before a line of this file was written. Every
   other sessile species here (barnacle, oyster, mussel) earns its
   keep by moving a part on the tide; a sponge pumps water constantly,
   through no part big enough to draw at this scale, so there is
   nothing to hinge and nothing to redraw. What IS true of a real
   sponge and IS free to show is simpler than any of that: exposed to
   the air and the sun, it dulls and darkens; submerged, its colour is
   as vivid as spongebody.js's palette gets. So the entire behaviour
   of this species is ONE NUMBER — how wet it is — driving an
   `instanceColor` tint, and not one instance matrix is ever rewritten
   after spawn. No barnacle-style trapdoor, no valve, because there is
   nothing here that has one.

   PLACEMENT IS THE BARNACLE'S ROCK-CLUSTER SCHEME (barnacles.js,
   RockField), pulled to the LOWEST usable band this shore's rock
   actually reaches. A real sponge like this one favours the lowest,
   most-submerged hard ground on a flat — the roster's own framing is
   "boulders and channel edge" — and the boulder field here (world.js)
   never scatters as far out as the subtidal channel. This is a
   limitation of the terrain, not of the species: the zone below is
   set as low as ANY rock on this shore goes, which is the honest
   answer to "as close to the channel edge as this build can put one".
   ============================================================ */
(function () {
  'use strict';

  /* ---------- the knobs ---------- */
  var S = 0.34;                 // metres per body unit — cushion diameter. A real patch is 15-40 cm
  /* An upper ASK, not a promise — see ZONE below. The lowest rock on
     this shore is scarce, so the placement loop settles for whatever
     it can legally find there and stops well short of this number,
     which is honest: a real low-shore sponge patch is scarce too. */
  var COUNT = 60;
  /* The lowest band this shore's rock actually reaches. world.js never
     scatters a boulder whose OWN ground point sits under 1.7 m CD (the
     `gh < 1.7` guard in scatterRocks), so nothing here can go lower
     than that regardless of how low ZONE's floor is set — the real
     floor is the terrain's, not this file's. 1.0 is kept as the
     nominal floor anyway so the intent reads correctly; the ceiling is
     what actually does the work of keeping this the lowest of the
     four rock-encrusters (barnacle 2.2-2.8, oyster 1.55-2.25, mussel
     1.30-2.10, sponge below all three). */
  var ZONE = [1.0, 2.05];
  var CLUSTER = 3;                // sponges settle far more loosely than a barnacle or a mussel
  var CLUSTER_R = 0.85;
  var SUBMERGE = 0.03;
  var WET_RATE = 0.55;          // how fast the colour eases toward its target — slow, a stain not a switch
  var INSET = 0.02;

  var seed = 25717;
  function rand() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
  function range(a, b) { return a + rand() * (b - a); }

  var AXIS_X = new THREE.Vector3(1, 0, 0);

  function spawn(scene, world) {
    var P = SpongeBody.parts();
    var mat = SpongeBody.material();

    var group = new THREE.Group();
    group.name = 'sponges';
    scene.add(group);

    var usable = RockField.usable(world, { zone: ZONE, minR: 0.35, minH: 0.20, inset: INSET });
    var capPoint = RockField.capPoint;

    var sponges = [];
    var tmpPt = {};
    if (usable.length) {
      var guard = 0;
      /* A much bigger guard multiplier than any other rock-cluster
         species here needs (barnacles.js, oysters.js, mussels.js all
         use *40) — the usable band is thin enough that most seed
         picks miss it, and a *40 budget starved the count as soon as
         COUNT itself was turned down to something honest. */
      while (sponges.length < COUNT && guard++ < COUNT * 220) {
        var rk = usable[Math.floor(rand() * usable.length) % usable.length];
        var sa = range(0, Math.PI * 2), sd = range(0.1, 0.95) * rk.r;
        capPoint(rk, sd, sa, tmpPt);
        if (tmpPt.y < ZONE[0] || tmpPt.y > ZONE[1]) continue;

        var n = 1 + Math.floor(rand() * CLUSTER);
        for (var c = 0; c < n && sponges.length < COUNT; c++) {
          var da = sa + range(-1, 1) * (CLUSTER_R / Math.max(0.4, sd));
          var dd = Math.max(0.05, sd + range(-CLUSTER_R, CLUSTER_R));
          if (dd > rk.r * 0.98) continue;
          capPoint(rk, dd, da, tmpPt);
          if (tmpPt.y < ZONE[0] || tmpPt.y > ZONE[1]) continue;
          if (tmpPt.ny < 0.15) continue;
          var g = range(0.80, 1.18);
          sponges.push({
            x: tmpPt.x, y: tmpPt.y, z: tmpPt.z,
            nx: tmpPt.nx, ny: tmpPt.ny, nz: tmpPt.nz,
            spin: range(0, Math.PI * 2),
            size: range(0.55, 1.35),
            wet: 0, wetDrawn: -1,
            state: 'dry',
            tintR: g * range(0.98, 1.06), tintG: g, tintB: g * range(0.80, 0.94)
          });
        }
      }
    }
    var N = sponges.length;

    var mesh = new THREE.InstancedMesh(P.cushion, mat, Math.max(N, 1));
    mesh.frustumCulled = false;
    mesh.castShadow = true;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(Math.max(N, 1) * 3), 3);
    group.add(mesh);

    var root = new THREE.Vector3(), tmp = new THREE.Vector3();
    var qb = new THREE.Quaternion(), qSpin = new THREE.Quaternion(), nrm = new THREE.Vector3();
    var m4 = new THREE.Matrix4();
    var tint = new THREE.Color();

    /* Written once at spawn — the whole point of this species. */
    for (var i = 0; i < N; i++) {
      var sp = sponges[i];
      nrm.set(sp.nx, sp.ny, sp.nz).normalize();
      qb.setFromUnitVectors(AXIS_X, nrm);
      qSpin.setFromAxisAngle(nrm, sp.spin);
      qb.premultiply(qSpin);
      var sc = S * sp.size;
      m4.compose(root.set(sp.x, sp.y, sp.z), qb, tmp.set(sc, sc, sc));
      mesh.setMatrixAt(i, m4);
    }
    mesh.instanceMatrix.needsUpdate = true;

    /* ---------- colour ----------
       DRY pulls the tint down and toward grey — a sponge out of water
       loses saturation before it loses brightness, which is what
       "dulled" actually looks like on a real one. WET is the palette's
       own colour, close to full strength. */
    function paintTint(sp, wetT) {
      var dryR = (sp.tintR + 0.62) * 0.42, dryG = (sp.tintG + 0.62) * 0.42, dryB = (sp.tintB + 0.62) * 0.42;
      tint.setRGB(
        dryR + (sp.tintR - dryR) * wetT,
        dryG + (sp.tintG - dryG) * wetT,
        dryB + (sp.tintB - dryB) * wetT
      );
    }
    for (i = 0; i < N; i++) { paintTint(sponges[i], 0); mesh.setColorAt(i, tint); sponges[i].wetDrawn = 0; }
    mesh.instanceColor.needsUpdate = true;

    /* ---------- update ----------
       The only decision in the file, same as the barnacle's: is there
       water over me — eased, not switched, because a stain does not
       apply itself in one frame. */
    function update(dt) {
      var touched = false;
      for (var si = 0; si < N; si++) {
        var sp = sponges[si];
        var surf = world.waterAt(sp.x, sp.z);
        var wet = surf !== null && surf > sp.y + SUBMERGE;
        sp.state = wet ? 'wet' : 'dry';
        var want = wet ? 1 : 0;
        if (sp.wet !== want) {
          sp.wet += (want - sp.wet) * Math.min(1, WET_RATE * dt);
          if (Math.abs(sp.wet - want) < 0.01) sp.wet = want;
        }
        if (Math.abs(sp.wet - sp.wetDrawn) < 0.01) continue;
        sp.wetDrawn = sp.wet;
        paintTint(sp, sp.wet);
        mesh.setColorAt(si, tint);
        touched = true;
      }
      if (touched) mesh.instanceColor.needsUpdate = true;
    }

    return {
      count: N,
      group: group,
      sponges: sponges,
      update: update,
      // how many are submerged and at full colour — the guild's slowest tide gauge
      feeding: function () {
        var n = 0;
        for (var i2 = 0; i2 < N; i2++) if (sponges[i2].state === 'wet') n++;
        return n;
      }
    };
  }

  window.Sponges = { spawn: spawn };
})();
