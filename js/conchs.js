/* ============================================================
   conchs.js — the dog conches (BUILD_GUIDE §1, §6).

   Fifth organism, and the first one whose behaviour is ABOUT the
   waterline rather than about being above or below it.

   The crab waits for the water to leave. The mudskipper works its edge. The
   barnacle and the nerite switch on and off with it. A dog conch
   TRACKS it: it stays in the thin wet band just behind the retreating
   edge, where the sand is freshly uncovered, still wet, and safest to
   feed on — and it does that by hopping down-shore all through the
   ebb, then back up on the flood.

     follow   in water, working toward its preferred depth
     hop      the vault itself. Not a crawl — the pointed operculum
              plants in the sand and levers the whole animal forward
     bury     caught dry. It works itself under the sand and waits
     buried   under, only a hump showing

   `stranding` (§6) is null: a buried conch is fine. Sand at low tide
   stays cool and damp a few centimetres down, which is the whole point
   of burying rather than running.

   WHY HOPPING MATTERS. It is the thing that reads on screen at a
   distance. A snail that slides is a rock that moves; a snail that
   vaults is unmistakably an animal, and the leap is also its escape
   response — the abrupt hop breaks a predator's grip and its search
   image at the same time.

   BIOFILM (§7). Wired: it grazes the film off the sand it rests on,
   and `pickTarget()` scores candidate landings on food as well as
   depth — but food is the cheaper term by design, so this stays the
   animal that tracks the waterline and merely prefers a good patch
   inside the band it was going to work anyway.

   RENDERING. Five InstancedMeshes: shell, lip, foot, eyestalks (2),
   eyes (2). Buried animals stop being drawn entirely.
   ============================================================ */
(function () {
  'use strict';

  /* ---------- the knobs ---------- */
  var S = 0.34;                 // metres per body unit — a ~6 cm shell, exaggerated like the rest
  var COUNT = 44;
  var ZONE = [1.0, 1.8];        // metres CD — guide §1
  var Z_RANGE = [-30, 30];      // the sandy flat it works
  var WANT_DEPTH = [0.10, 0.55];// metres of water it tries to keep over itself
  var HOP_DIST = [0.30, 0.62];  // metres per vault
  var HOP_SECS = 0.55;          // one vault, plant to landing
  var REST = [0.7, 2.6];        // seconds between vaults — it is not in a hurry
  var BURY_SECS = 3.2;          // how long it takes to work under the sand
  var SPACING = 1.1;            // metres — they feed spread out, not in a heap
  var GRAZE_RATE = 0.06;        // film units per second while resting on the sand (§7)
  var BARE = 0.10;              // below this the patch is cleaned up — worth hopping on
  var SPOON_BITE = 0.45;        // fraction of that rate it takes off the spoon mat (§29)

  var seed = 777001;
  function rand() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
  function range(a, b) { return a + rand() * (b - a); }

  var AXIS_X = new THREE.Vector3(1, 0, 0);
  var UP = new THREE.Vector3(0, 1, 0);
  var FWD = new THREE.Vector3(0, 0, 1);

  /* Body layout, in body units. */
  var SHELL_Y = 0.22;           // shell centre above the sand while standing
  var LIP_AT = { x: -0.10, y: -0.05, z: 0.13 };
  var LIP_LEN = 0.56, LIP_H = 0.34;
  var FOOT_AT = { x: 0.05, y: -0.14 };
  var FOOT_LEN = 0.34;
  var STALK_AT = { x: 0.30, y: 0.07, z: 0.08 };
  var STALK_LEN = 0.22;

  function spawn(scene, world) {
    var P = ConchBody.parts();
    var mat = ConchBody.material();

    var group = new THREE.Group();
    group.name = 'dog-conches';
    scene.add(group);

    /* ---------- placement ---------- */
    function onRock(x, z) {
      for (var i = 0; i < world.rocks.length; i++) {
        var r = world.rocks[i];
        var dx = r.x - x, dz = r.z - z;
        if (dx * dx + dz * dz < (r.r + 0.6) * (r.r + 0.6)) return true;
      }
      return false;
    }

    var conches = [];
    var halfX = world.simArea.halfX - 6;
    var guard = 0;
    while (conches.length < COUNT && guard++ < COUNT * 400) {
      var x = range(-halfX, halfX);
      var z = range(Z_RANGE[0], Z_RANGE[1]);
      var h = world.heightAt(x, z);
      if (h < ZONE[0] || h > ZONE[1]) continue;
      if (onRock(x, z)) continue;
      var clash = false;
      for (var ci = 0; ci < conches.length; ci++) {
        var o = conches[ci];
        if ((o.x - x) * (o.x - x) + (o.z - z) * (o.z - z) < SPACING * SPACING) { clash = true; break; }
      }
      if (clash) continue;

      conches.push({
        x: x, y: h, z: z,
        yaw: range(0, Math.PI * 2),
        state: 'buried',
        want: range(WANT_DEPTH[0], WANT_DEPTH[1]),   // the depth this individual likes
        rest: range(0, 3),
        hop: 0,                                       // 0..1 through a vault
        hopFrom: { x: x, z: z }, hopTo: { x: x, z: z },
        sink: 1,                                      // 1 fully buried .. 0 standing clear
        lean: 0,
        size: range(0.82, 1.18),
        vis: false
      });
    }

    var N = conches.length;

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
      lip:   slots(P.lip, 1, true),
      foot:  slots(P.foot, 1),
      stalk: slots(P.eyestalk, 2),
      eye:   slots(P.eye, 2)
    };

    var tint = new THREE.Color();
    for (var i = 0; i < N; i++) {
      var g = range(0.86, 1.12);
      tint.setRGB(g * range(0.98, 1.04), g, g * range(0.93, 1.0));
      for (var key in R) {
        for (var j = 0; j < R[key].per; j++) R[key].mesh.setColorAt(i * R[key].per + j, tint);
      }
    }
    for (var k in R) if (R[k].mesh.instanceColor) R[k].mesh.instanceColor.needsUpdate = true;

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
    function putCentred(rec, slot, r, scl) {
      mPart.makeScale(scl, scl, scl);
      mPart.setPosition(r);
      mOut.multiplyMatrices(mBody, mPart);
      rec.mesh.setMatrixAt(slot, mOut);
    }
    function hide(ci) {
      R.shell.mesh.setMatrixAt(ci, HIDE);
      R.lip.mesh.setMatrixAt(ci, HIDE);
      R.foot.mesh.setMatrixAt(ci, HIDE);
      for (var s = 0; s < 2; s++) {
        R.stalk.mesh.setMatrixAt(ci * 2 + s, HIDE);
        R.eye.mesh.setMatrixAt(ci * 2 + s, HIDE);
      }
    }

    /* ------------------------------------------------------------
       draw

       `sink` buries the animal by dropping the whole body below the
       sand — no separate buried model, and the hump that stays showing
       is just the top of the shell. `lean` is the vault: the shell
       pitches nose-up as the foot plants, then noses down as it lands.
       ------------------------------------------------------------ */
    function draw(c, ci) {
      var sc = S * c.size;
      var floorY = world.heightAt(c.x, c.z);
      var arc = c.state === 'hop' ? Math.sin(c.hop * Math.PI) : 0;

      var y = floorY + (SHELL_Y * sc) * (1 - c.sink) + arc * 0.22 * sc * 8;
      eul.set(0, c.yaw - Math.PI * 0.5, c.lean, 'YZX');
      qb.setFromEuler(eul);
      mBody.compose(root.set(c.x, y, c.z), qb, tmp.set(sc, sc, sc));

      putCentred(R.shell, ci, root.set(0, 0, 0), 1);

      /* The flared lip: a wing standing along the aperture side. It has
         to HUG the shell — set it too far out or too long and it reads
         as a separate plate floating beside the animal, which is what
         the first pass looked like. */
      root.set(LIP_AT.x, LIP_AT.y, LIP_AT.z);
      put(R.lip, ci, root, AXIS_X, LIP_LEN, LIP_H, true);

      /* The foot points down and BACKWARD between vaults, and swings
         down-and-forward to plant as the animal launches — that plant
         is the whole reason a conch moves in leaps. */
      var plant = arc;
      root.set(FOOT_AT.x, FOOT_AT.y, 0);
      dir.set(-0.30 + plant * 0.95, -0.95, 0).normalize();
      put(R.foot, ci, root, dir, FOOT_LEN, 0.9, false);

      for (var s = 0; s < 2; s++) {
        var side = s === 0 ? 1 : -1;
        var wob = Math.sin(c.hop * 6 + s * 2) * 0.10;
        root.set(STALK_AT.x, STALK_AT.y, side * STALK_AT.z);
        dir.set(0.75, 0.55 + wob, side * 0.30).normalize();
        put(R.stalk, ci * 2 + s, root, dir, STALK_LEN, 1, false);
        // the eye rides on the tip of its stalk
        putCentred(R.eye, ci * 2 + s, root.set(
          STALK_AT.x + dir.x * STALK_LEN,
          STALK_AT.y + dir.y * STALK_LEN,
          side * STALK_AT.z + dir.z * STALK_LEN
        ), 1);
      }
    }

    /* ------------------------------------------------------------
       where to hop next

       It is looking for its preferred DEPTH, which on a falling tide
       is always down-shore of where it stands — so following the
       waterline falls out of a depth preference rather than being
       coded as a direction. Candidates are sampled around the animal
       and scored; the best one wins.

       Food is the second term (§7). It is deliberately worth less than
       the water: FOOD_WEIGHT prices a full patch of biofilm at about
       12 cm of depth error, so a hungry conch will cross a slightly
       wrong depth for a good patch but will not follow food up out of
       its band. Depth still wins the argument, which is what keeps
       this the animal that tracks the waterline.
       ------------------------------------------------------------ */
    var TRIES = 7;
    var FOOD_WEIGHT = 0.12;       // metres of depth error one full patch is worth
    /* Spoon grass is worth rather less per unit than clean film (§29). A
       conch rasps epiphytes and detritus off the mat rather than eating
       the leaf, so a thick mat is not the windfall a thick biofilm is —
       and pricing them equally made the animal ignore the open sand it is
       supposed to work. Two thirds is what keeps both foods in play. */
    var SPOON_WEIGHT = 0.08;
    /* THE BAND TERM (§29) — a fix, not a feature.
       Twelve tide cycles put the median conch at 1.91 m CD and the upper
       quartile at 2.00, against a stated band of 1.0–1.8, with not one
       animal below 1.0. They pile up against pickTarget's own ceiling of
       ZONE[1] + 0.3 = 2.10.

       The ratchet is in the asymmetry between the two halves of the
       cycle. On the ebb a conch that lags the retreating waterline is
       left dry and BURIES — it stops moving, passively. On the flood it
       digs out and actively follows the water, and on a flood the
       shallow depth it wants is always up-shore. So every cycle spends
       its down-shore travel passively and its up-shore travel actively,
       and the animal walks up the beach a little at a time.

       Depth preference alone cannot see this, because at any instant the
       conch is standing in exactly the water it asked for. The band has
       to be in the score directly.

       IT HAS TO BE STEEP, and the first attempt at 0.9 was not: it only
       slowed the drift (median 1.91 -> 1.54, then back to 1.78 over ten
       more cycles). Both terms are in metres and both read the SAME
       shore slope — about 0.03 m of height per metre travelled — so a
       hop that buys 0.03 of band also costs about 0.03 of depth error,
       and at a weight near 1.0 they cancel almost exactly. The band term
       is zero anywhere inside the zone, so it can afford to be brutal
       outside it without ever touching the waterline-following that is
       this animal's whole character. */
    var BAND_PULL = 4.0;          // metres of depth error per metre outside the band
    function bandMiss(h) {
      if (h < ZONE[0]) return ZONE[0] - h;
      if (h > ZONE[1]) return h - ZONE[1];
      return 0;
    }
    function pickTarget(c) {
      var bestX = c.x, bestZ = c.z, bestScore = Infinity, found = false;
      var dist = range(HOP_DIST[0], HOP_DIST[1]);
      for (var t = 0; t < TRIES; t++) {
        var a = t === 0 ? c.yaw : range(0, Math.PI * 2);
        var nx = c.x + Math.sin(a) * dist;
        var nz = c.z + Math.cos(a) * dist;
        if (!world.inSimArea(nx, nz)) continue;
        var h = world.heightAt(nx, nz);
        if (h < ZONE[0] - 0.5 || h > ZONE[1] + 0.3) continue;
        var surf = world.waterAt(nx, nz);
        if (surf === null) continue;                       // never hop onto dry sand
        var depth = surf - h;
        var score = Math.abs(depth - c.want)
                  + bandMiss(h) * BAND_PULL
                  - world.filmAt(nx, nz) * FOOD_WEIGHT
                  - world.spoonAt(nx, nz) * SPOON_WEIGHT;
        if (score < bestScore) { bestScore = score; bestX = nx; bestZ = nz; found = true; }
      }
      if (!found) return false;
      c.hopFrom.x = c.x; c.hopFrom.z = c.z;
      c.hopTo.x = bestX; c.hopTo.z = bestZ;
      c.yaw = Math.atan2(bestX - c.x, bestZ - c.z);
      c.hop = 0;
      c.state = 'hop';
      return true;
    }

    /* ------------------------------------------------------------
       update
       ------------------------------------------------------------ */
    function update(dt) {
      var touched = false;

      for (var ci = 0; ci < N; ci++) {
        var c = conches[ci];
        var surf = world.waterAt(c.x, c.z);
        var wet = surf !== null;

        if (!wet) {
          /* Caught out. Work under the sand — this is not an emergency,
             it is the ordinary end of every ebb for an animal that did
             not keep up with the water. */
          c.state = c.sink >= 1 ? 'buried' : 'bury';
          c.sink = Math.min(1, c.sink + dt / BURY_SECS);
          c.lean *= Math.max(0, 1 - 4 * dt);
        } else if (c.sink > 0) {
          c.state = 'follow';
          c.sink = Math.max(0, c.sink - dt / (BURY_SECS * 0.7));   // digging out is quicker
        } else if (c.state === 'hop') {
          c.hop += dt / HOP_SECS;
          if (c.hop >= 1) {
            c.hop = 1;
            c.x = c.hopTo.x; c.z = c.hopTo.z;
            c.state = 'follow';
            c.rest = range(REST[0], REST[1]);
            c.lean = 0;
          } else {
            var k = c.hop;
            c.x = c.hopFrom.x + (c.hopTo.x - c.hopFrom.x) * k;
            c.z = c.hopFrom.z + (c.hopTo.z - c.hopFrom.z) * k;
            // nose up on the launch, down on the landing
            c.lean = Math.sin(k * Math.PI * 2) * 0.42;
          }
        } else {
          c.state = 'follow';
          /* A resting conch is a feeding conch: it is scraping the film
             off the sand it is standing on (§7). Its band is under water
             most of the cycle, so it grazes far longer per tide than a
             nerite does — but spread over the whole flat, so what it
             leaves is a faint trail of worked patches, not bare ground. */
          var here = world.filmAt(c.x, c.z);
          if (here > BARE) world.grazeFilm(c.x, c.z, GRAZE_RATE * dt);
          /* And the spoon grass mat under it, where there is one (§29).
             Slower than it takes film: this is a snail rasping epiphytes
             off leaves, not stripping the mat, and the mat has to survive
             44 conches working the same band it grows in. What it leaves
             is a thinner, olive-er patch of turf, not bare sand. */
          var grass = world.spoonAt(c.x, c.z);
          if (grass > BARE) world.grazeSpoon(c.x, c.z, GRAZE_RATE * SPOON_BITE * dt);
          c.rest -= dt;
          if (c.rest <= 0) {
            var depth = surf - world.heightAt(c.x, c.z);
            /* Reasons to move on. Being out of the band matters most —
               without it a conch that has drifted up-shore is perfectly
               content where it stands and never re-picks, so the band
               term above never gets a vote.

               DEPTH ONLY COUNTS ON THE EBB (§29), and that is the rest
               of the ratchet fix. Clamping the band stopped conches
               leaving their zone but they still crept to the top of it,
               because chasing a preferred depth is not symmetric: on a
               FALLING tide the water it wants is down-shore, on a RISING
               tide it is up-shore, and only the falling half is ever
               interrupted — the ebb outruns a conch (the waterline
               crosses this slope at about 2 m/s against a hop of well
               under one), it is left dry, and it buries. So it gives up
               ground passively and takes it back deliberately, every
               cycle, forever.

               The half that is wrong is the flood. A conch that is
               already submerged and feeding has no reason to walk
               up-shore after shallower water; it sits, which is what
               being caught by a rising tide actually looks like. Keeping
               the ebb half intact is what keeps this the animal that
               tracks the waterline down. */
            var ebbing = world.tideDir < 0;
            if ((ebbing && Math.abs(depth - c.want) > 0.06) ||
                bandMiss(world.heightAt(c.x, c.z)) > 0.05 ||
                (here <= BARE && grass <= BARE)) {
              if (!pickTarget(c)) c.rest = range(0.4, 1.2);
            } else {
              c.rest = range(REST[0], REST[1]);
            }
          }
        }

        c.y = world.heightAt(c.x, c.z);

        if (c.state === 'buried') {
          if (c.vis) { hide(ci); c.vis = false; touched = true; }
          continue;
        }
        draw(c, ci);
        c.vis = true;
        touched = true;
      }

      if (touched) for (var k2 in R) R[k2].mesh.instanceMatrix.needsUpdate = true;
    }

    for (i = 0; i < N; i++) hide(i);
    for (var k3 in R) R[k3].mesh.instanceMatrix.needsUpdate = true;

    return {
      count: N,
      group: group,
      conches: conches,
      update: update,
      // how many are up and working the waterline
      active: function () {
        var n = 0;
        for (var i2 = 0; i2 < N; i2++) if (conches[i2].state !== 'buried') n++;
        return n;
      }
    };
  }

  window.Conchs = { spawn: spawn };
})();
