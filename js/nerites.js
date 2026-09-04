/* ============================================================
   nerites.js — the nerite snails (BUILD_GUIDE §1, §6).

   Fourth organism. The barnacle proved a sessile animal on rock; this
   is the same rock with an animal that MOVES on it, and the movement
   is the whole species:

     graze   the rock is wet. It crawls the boulder's surface, rasping
             biofilm off the stone.
     homing  the water has dropped past it. It heads back to its own
             scar — the shallow depression its shell fits tightest in.
     clamp   dry and home. Shell down, tentacles in, waiting.

   `stranding` (§6) is null. A clamped nerite is not in trouble; a
   sealed shell on a shaded rock outlasts a low tide easily. The cost
   of being caught out is lost feeding time, not death, and that is
   why this animal walks back to a known spot instead of panicking.

   CRAWLING ON A CURVED SURFACE. Position is not (x, z) here — it is
   (bearing, radius) ON A BOULDER, converted to a world point through
   the same ellipsoid-cap model the barnacles use. That is what keeps a
   snail glued to a rounded rock face instead of sliding through it,
   and it means "crawl" is two numbers changing, not a 3D pathfind.

   BIOFILM (§7). Grazing is no longer cosmetic: `grazeAt()` reads and
   depletes the biofilm grid through `world.filmAt` / `world.grazeFilm`,
   and whether the film is there decides the gait — feed in tight
   circles, travel in straight lines. As promised when it was stubbed,
   that one function is the whole change; the states, the crawl and the
   tide logic are untouched.

   RENDERING. Three InstancedMeshes: shell, foot, tentacles (2 each).
   Tentacles are hidden on a clamped animal rather than scaled to zero
   every frame — a clamped snail writes nothing at all.
   ============================================================ */
(function () {
  'use strict';

  /* ---------- the knobs ---------- */
  var S = 0.20;                 // metres per body unit — a ~2 cm snail, exaggerated like the rest
  var COUNT = 150;
  var ZONE = [1.9, 2.7];        // metres CD — guide §1, overlapping the barnacle band below it
  var CRAWL = 0.055;            // m/s — a snail's pace, and it should look like one
  var SEEK_CRAWL = 0.078;       // m/s — off the food and travelling, still a snail
  var HOME_CRAWL = 0.085;       // m/s — a drying snail moves with more purpose
  /* Film units per second under the radula. Tuned against the regrowth
     the upper shore actually gets (biofilm.js): the band this animal
     works is submerged only around high water, so the population has to
     take a little less per tide than the rock grows back, or the whole
     nerite zone scrubs bare and stays bare. */
  var GRAZE_RATE = 0.010;
  var BARE = 0.08;              // below this the stone is worked out — move on
  var WET_MARGIN = -0.02;       // water this far above the shell counts as wet
  var RASP_SECS = 0.55;         // one rasp of the radula
  var INSET = 0.05;             // metres sunk into the rock surface, so the foot meets stone

  var seed = 24601;
  function rand() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
  function range(a, b) { return a + rand() * (b - a); }

  var AXIS_X = new THREE.Vector3(1, 0, 0);
  var UP = new THREE.Vector3(0, 1, 0);
  var FWD = new THREE.Vector3(0, 0, 1);

  /* Body layout, in body units. */
  var FOOT_LIFT = 0.10;         // the foot sits just off the rock, under the shell
  var TENT_AT = { x: 0.16, z: 0.17 };
  var TENT_LEN = 0.34;

  function spawn(scene, world) {
    var P = NeriteBody.parts();
    var mat = NeriteBody.material();

    var group = new THREE.Group();
    group.name = 'nerites';
    scene.add(group);

    /* ---------- the boulders they live on ----------
       The same surface model the barnacles use (rockfield.js):
       band-crossing boulders only, worked inside their bounding radius,
       and any cobble buried inside a bigger boulder dropped — a snail on
       one of those is drawn perfectly, inside solid rock, and reads as a
       species that failed to spawn. */
    var usable = RockField.usable(world, {
      zone: ZONE, minR: 0.5, minH: 0.3, inset: INSET
    });
    var capPoint = RockField.capPoint;
    var pt = {};

    /* Write a snail's (bearing, radius) back out to a world point. Also
       the only place its normal is refreshed, so a crawling animal
       stays square to the rock as the face turns under it. */
    function place(s) {
      capPoint(s.rock, s.d, s.a, pt);
      s.x = pt.x; s.y = pt.y; s.z = pt.z;
      s.nx = pt.nx; s.ny = pt.ny; s.nz = pt.nz;
    }

    var snails = [];
    if (usable.length) {
      var guard = 0;
      while (snails.length < COUNT && guard++ < COUNT * 60) {
        var rk2 = usable[Math.floor(rand() * usable.length) % usable.length];
        var a0 = range(0, Math.PI * 2), d0 = range(0.12, 0.92) * rk2.r;
        capPoint(rk2, d0, a0, pt);
        if (pt.y < ZONE[0] || pt.y > ZONE[1]) continue;
        if (pt.ny < 0.22) continue;
        var s = {
          rock: rk2,
          a: a0, d: d0,                       // where it is now, on the cap
          homeA: a0, homeD: d0,               // its scar — the spot it always comes back to
          x: 0, y: 0, z: 0, nx: 0, ny: 1, nz: 0,
          heading: range(0, Math.PI * 2),     // crawl direction, in cap space
          state: 'clamp',
          rasp: rand(),
          turn: range(1.5, 5),                // seconds until it wanders off its current line
          feed: 0,                            // 0..1 smoothed "am I getting food" — gait and rasp read it
          size: range(0.75, 1.2),
          out: 0,                             // 0 clamped .. 1 fully out and grazing
          vis: true
        };
        place(s);
        snails.push(s);
      }
    }

    var N = snails.length;

    function slots(geo, per, shadow) {
      var m = new THREE.InstancedMesh(geo, mat, Math.max(N * per, 1));
      m.frustumCulled = false;                // 300 m of shore, same as every other population
      m.castShadow = !!shadow;
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      group.add(m);
      return { mesh: m, per: per };
    }
    var R = {
      shell: slots(P.shell, 1, true),
      foot:  slots(P.foot, 1),
      tent:  slots(P.tentacle, 2)
    };

    var tint = new THREE.Color();
    for (var i = 0; i < N; i++) {
      var g = range(0.82, 1.12);
      tint.setRGB(g * range(0.97, 1.04), g, g * range(0.94, 1.03));
      for (var key in R) {
        for (var j = 0; j < R[key].per; j++) R[key].mesh.setColorAt(i * R[key].per + j, tint);
      }
    }
    for (var k in R) if (R[k].mesh.instanceColor) R[k].mesh.instanceColor.needsUpdate = true;

    /* ---------- placement helpers ---------- */
    var xa = new THREE.Vector3(), ya = new THREE.Vector3(), za = new THREE.Vector3();
    var mPart = new THREE.Matrix4(), mBody = new THREE.Matrix4(), mOut = new THREE.Matrix4();
    var root = new THREE.Vector3(), dir = new THREE.Vector3(), tmp = new THREE.Vector3();
    var qb = new THREE.Quaternion(), qSpin = new THREE.Quaternion(), nrm = new THREE.Vector3();
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

    // +X points off the rock; `heading` spins the animal around that axis
    function setBody(s) {
      nrm.set(s.nx, s.ny, s.nz).normalize();
      qb.setFromUnitVectors(AXIS_X, nrm);
      qSpin.setFromAxisAngle(nrm, s.heading);
      qb.premultiply(qSpin);
      var sc = S * s.size;
      mBody.compose(root.set(s.x, s.y, s.z), qb, tmp.set(sc, sc, sc));
    }

    /* ------------------------------------------------------------
       draw

       The idle is a shell-rasp wobble, not a head-dip: §2 struck the
       savanna grazing animation off this build because a snail has no
       neck. The whole animal rocks a few degrees as the radula works,
       which at this size is the only motion that reads.
       ------------------------------------------------------------ */
    function draw(s, si) {
      setBody(s);

      // a snail crossing scrubbed rock is not rasping: tentacles in, no wobble
      var rasping = s.out > 0.2 && (s.state !== 'graze' || s.feed > 0.15);
      var wob = rasping ? Math.sin(s.rasp * Math.PI * 2) * 0.055 * s.out : 0;

      // shell: lifted off the rock a little while the foot is out
      putCentred(R.shell, si, root.set(0.06 + 0.05 * s.out + wob * 0.4, wob * 0.5, 0), 1);
      putCentred(R.foot, si, root.set(FOOT_LIFT, 0, 0), 1);

      if (!rasping) {
        R.tent.mesh.setMatrixAt(si * 2, HIDE);
        R.tent.mesh.setMatrixAt(si * 2 + 1, HIDE);
        return;
      }
      /* Tentacles sweep the stone ahead of the animal. They lead the
         crawl direction, which in body space is +Y after the spin. */
      for (var t = 0; t < 2; t++) {
        var side = t === 0 ? 1 : -1;
        var swing = Math.sin(s.rasp * Math.PI * 2 + t) * 0.35;
        root.set(TENT_AT.x, 0.34, side * TENT_AT.z);
        dir.set(0.30 + swing * 0.2, 0.92, side * 0.25).normalize();
        put(R.tent, si * 2 + t, root, dir, TENT_LEN * s.out, 1, false);
      }
    }

    /* ------------------------------------------------------------
       grazing — the biofilm seam (§7), now wired

       Everything a grazing nerite does is here, and it is one rule:
       the film under the foot decides whether this is feeding or
       travelling.

       Feeding, it rasps and turns often, staying inside the patch.
       Run the patch out and it stops rasping, straightens up and
       crawls faster until it finds film again — area-restricted
       search, which is what a real grazer does and which here is the
       visible consequence of the resource being finite. The pale
       scrubbed haloes that appear on busy boulders at low water are
       this loop's output, not a texture.
       ------------------------------------------------------------ */
    function grazeAt(s, dt) {
      var here = world.filmAt(s.x, s.z);
      var feeding = here > BARE;
      if (feeding) world.grazeFilm(s.x, s.z, GRAZE_RATE * dt);

      // smoothed so the animal does not flicker between the two gaits
      s.feed += ((feeding ? 1 : 0) - s.feed) * Math.min(1, 2.2 * dt);

      if (s.feed > 0.15) {
        s.rasp += dt / RASP_SECS;
        if (s.rasp > 1) s.rasp -= 1;
      }

      var working = s.feed > 0.5;
      s.turn -= dt;
      if (s.turn <= 0) {
        if (working) { s.turn = range(1.2, 3.2); s.heading += range(-1.3, 1.3); }
        else         { s.turn = range(3.5, 7.0); s.heading += range(-0.45, 0.45); }
      }
      step(s, (working ? CRAWL : SEEK_CRAWL) * dt);
    }

    /* Move `dist` metres along `heading` in cap space, then keep the
       animal on legal rock: inside the cap, inside its tidal band, and
       off any face too steep to hold. Anything illegal turns it away
       rather than stopping it — a snail that stops looks broken. */
    function step(s, dist) {
      var rk = s.rock;
      var da = Math.cos(s.heading) * dist / Math.max(0.25, s.d);
      var dd = Math.sin(s.heading) * dist;
      var na = s.a + da, nd = s.d + dd;
      if (nd < 0.10 || nd > rk.r * 0.96) { s.heading = Math.PI - s.heading; return; }
      capPoint(rk, nd, na, pt);
      if (pt.y < ZONE[0] || pt.y > ZONE[1] || pt.ny < 0.20) { s.heading += 2.2; return; }
      s.a = na; s.d = nd;
      place(s);
    }

    // walk the shortest way back to the scar, in cap space
    function homeStep(s, dt) {
      var dA = s.homeA - s.a;
      while (dA > Math.PI) dA -= Math.PI * 2;
      while (dA < -Math.PI) dA += Math.PI * 2;
      var dD = s.homeD - s.d;
      var arc = dA * Math.max(0.25, s.d);
      var dist = Math.hypot(arc, dD);
      if (dist < 0.04) { s.a = s.homeA; s.d = s.homeD; place(s); return true; }
      s.heading = Math.atan2(dD, arc);
      step(s, Math.min(dist, HOME_CRAWL * dt));
      return false;
    }

    /* ------------------------------------------------------------
       update
       ------------------------------------------------------------ */
    function update(dt) {
      var touched = false;

      for (var si = 0; si < N; si++) {
        var s = snails[si];
        var surf = world.waterAt(s.x, s.z);
        var wet = surf !== null && surf > s.y + WET_MARGIN;

        if (wet) {
          s.state = 'graze';
          grazeAt(s, dt);
        } else if (s.state !== 'clamp') {
          /* Dry: get home, then shut down. The walk back is the visible
             part of "homing to a scar" — a snail already home just
             clamps where it stands. */
          s.state = 'homing';
          if (homeStep(s, dt)) s.state = 'clamp';
        }

        var want = (s.state === 'graze') ? 1 : (s.state === 'homing' ? 0.75 : 0);
        var settled = Math.abs(s.out - want) < 0.01;
        if (!settled) {
          s.out += (want - s.out) * Math.min(1, 3.0 * dt);
          if (Math.abs(s.out - want) < 0.01) s.out = want;
        }
        // a clamped, settled snail is as static as the rock it is on
        if (s.state === 'clamp' && settled) continue;

        draw(s, si);
        touched = true;
      }

      if (touched) for (var k2 in R) R[k2].mesh.instanceMatrix.needsUpdate = true;
    }

    // first frame: everyone clamped at their scar
    for (i = 0; i < N; i++) draw(snails[i], i);
    for (var k3 in R) R[k3].mesh.instanceMatrix.needsUpdate = true;

    return {
      count: N,
      group: group,
      snails: snails,
      update: update,
      // how many are feeding — the grazing pressure the biofilm grid will meet
      grazing: function () {
        var n = 0;
        for (var i2 = 0; i2 < N; i2++) if (snails[i2].state === 'graze') n++;
        return n;
      }
    };
  }

  window.Nerites = { spawn: spawn };
})();
