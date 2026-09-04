/* ============================================================
   anemones.js — Haddon's carpet anemone (BUILD_GUIDE §39, roster
   item 2 of 4).

   The shore's first CNIDARIAN, and the first predator on it that
   cannot go anywhere. Everything that hunts here so far hunts by
   moving — the egret walks the flat, the sand star quarters the
   sediment, the moon snail ploughs after buried shells, the swimming
   crab paddles. This one waits, and the whole animal is the waiting:
   a half-metre disc of sticky tentacles lying open on the sand with
   its mouth in the middle of it.

     spread    submerged. The carpet is out, flat and wide, and this
               is the state a real one spends its feeding life in
     fold      something walked onto it. The disc purses in over the
               top — the only move a sessile animal has
     embrace    an anemonefish is sheltering in the tentacles, and
               they have closed loosely around it INSTEAD of on it
     shrunk    the water has gone. Pulled down into the sand, and
               what is left above ground is the orange column

   ONE KNOB DRIVES ALL FOUR. `open` is 0 shut .. 1 fully spread, and
   every state is a target value for it — the pen shell's pattern
   (§32) with two more reasons to close. The disc's radius, the disc's
   height, the column's height and the column's girth are all read off
   that one number, which is what makes a contraction a single
   continuous move instead of four parts arguing.

   THE CONTRACTION IS ALSO THE COLOUR CHANGE, FOR FREE. anemonebody.js
   gives the disc a drab green-brown and the column an orange-red,
   because that is what a real S. haddoni is. A spread one is a green
   carpet with its orange column buried under it; a shut one is an
   orange blob with a small green cap. Nothing tints anything — the
   two parts simply trade places, and the animal changes colour on the
   ebb without one line of instanceColor work. The sponge (§35) had to
   do that with a tint because a sponge has only one part to show.

   WHAT SETS OFF A FOLD is the sand star and the swimming crab, both
   already working this exact band (§32, §36) — a real carpet anemone
   on this shore eats crabs and small fish, and the two mobile animals
   most likely to blunder across one are those. Fifth and sixth
   inter-population wirings, and optional like every one before them.

   NOTHING IS EATEN. The fold is the part that shows and the part
   that is honest to model; a real capture takes hours and happens
   under a closed disc where there is nothing to see. Same call the
   egret's strike (§30), the sand star's probe (§32) and the moon
   snail's drill (§35) all made.

   AND THE SEVENTH WIRING IS THE POINT OF THE PAIR. anemonefish.js
   hands each fish a host and sets `guests` on it every frame. A
   guest gets `embrace`, not `fold` — the same tentacles, the same
   contact, the opposite outcome. That difference IS the symbiosis,
   and it is why these two species ship together.
   ============================================================ */
(function () {
  'use strict';

  /* ---------- the knobs ---------- */
  var S = 0.46;                 // metres per body unit — spread disc diameter. A real one is 20-50 cm
  var COUNT = 30;
  var ZONE = [0.25, 1.15];      // metres CD — the low sand flat, up to the lagoon edge
  var Z_RANGE = [24, 60];
  var SPACING = 4.2;            // they are big, and real ones are scattered, not bedded

  var SUBMERGE = 0.06;          // metres of water over the disc before it opens out
  /* Fraction of the SPREAD DISC RADIUS that counts as "on me". Bigger
     than 1 on purpose: an anemone's catch is the disc PLUS the reach
     of the tentacles round its edge, and a real one takes anything
     that brushes it. Set to 0.85 the first pass and a 600-second run
     produced two folds across eighteen animals — the wiring was
     correct and effectively not modelled, which is the trap §31's
     hermit-crab shell fight fell into. At 2.4 the reach is ~0.55 m
     against a 0.46 m animal, the same "twice its own size" the pen
     shell's CLAP_R already uses (§32). */
  var FOLD_R = 2.4;
  var FOLD_SECS = 5.5;          // how long the disc stays pursed after a contact
  var SCAN_SECS = 0.4;          // company is checked on a tick, not every frame

  /* The four targets for `open`. Fold and embrace are deliberately
     different numbers: a fold is a clench and an embrace is a fold
     that stopped short, which is exactly what it looks like on a real
     one with a fish in it. */
  var OPEN_SPREAD = 1.0;
  var OPEN_EMBRACE = 0.58;
  var OPEN_FOLD = 0.42;
  var OPEN_SHRUNK = 0.0;

  /* Body-unit geometry, read off `open`. See the header — these five
     lines are the entire animation.

     THE COLUMN MUST STAY NARROWER THAN THE DISC AT EVERY VALUE OF
     `open`, or the animal is inside out. The first pass gave the
     SPREAD column a 0.60 radius against a 1.00 disc DIAMETER — a
     collar half again as wide as the carpet meant to hide it — and
     the render came back as an orange slab with a small green cap,
     which is the shut animal's silhouette wearing the spread one's
     numbers. Radius against diameter, in one table, is exactly the
     kind of thing that only shows up side-on. */
  /* Spread, the column's top must finish BELOW GROUND (0.02 against a
     0.05 bury), or it pokes up through the middle of its own disc.
     The first pass left it 0.02 proud and the carpet came back with an
     orange starburst at the centre — the column's jittered top cap
     interpenetrating the oral cone, which from directly above looks
     exactly like a deliberate pattern and is not one. When the animal
     is open, the trunk is under the sand and there is nothing to see.  */
  var COL_H  = [0.30, 0.02];    // column height:   shut, spread
  var COL_R  = [0.30, 0.26];    // column RADIUS:   shut, spread
  /* Shut, the disc is a CAP on the blob, not a spike on a post — it
     has to be wide enough to cover most of the 0.60-wide column top
     and low enough not to come to a point. A contracted carpet
     anemone is a wrinkled orange lump with a puckered green top, and
     the ratio between these two numbers is the whole difference
     between that and a traffic cone. */
  var DISC_R = [0.52, 1.00];    // disc DIAMETER:   shut, spread
  var DISC_H = [1.20, 1.00];    // disc height:     shut, spread — a shut one domes up
  /* How far the disc sits above the SAND, not above the buried origin.
     Spread it lies almost on the ground; shut it caps the column just
     below its top, so the two read as one animal rather than a lid
     balanced on a post. */
  var DISC_Y = [0.28, 0.015];
  var COL_GEO_R = 0.30;         // the radius anemonebody.js's column is actually built at
  var BURY = 0.05;              // body units of column below the sand, so there is no seam

  var PULSE_SECS = 5.2;         // one slow breath of the spread carpet

  var seed = 907331;
  function rand() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
  function range(a, b) { return a + rand() * (b - a); }

  function lerp(pair, k) { return pair[0] + (pair[1] - pair[0]) * k; }

  var UP = new THREE.Vector3(0, 1, 0);
  var FWD = new THREE.Vector3(0, 0, 1);
  var AXIS_X = new THREE.Vector3(1, 0, 0);

  function spawn(scene, world, opts) {
    var P = AnemoneBody.parts();
    var mat = AnemoneBody.material();
    opts = opts || {};
    var sandstars = opts.sandstars || null;         // optional — see the header
    var swimmingcrabs = opts.swimmingcrabs || null; // optional

    var group = new THREE.Group();
    group.name = 'anemones';
    scene.add(group);

    function onRock(x, z) {
      for (var i = 0; i < world.rocks.length; i++) {
        var r = world.rocks[i];
        var dx = r.x - x, dz = r.z - z;
        if (dx * dx + dz * dz < (r.r + 1.6) * (r.r + 1.6)) return true;
      }
      return false;
    }

    var halfX = world.simArea.halfX - 9;
    var anemones = [];
    var guard = 0;
    while (anemones.length < COUNT && guard++ < COUNT * 500) {
      var x = range(-halfX, halfX);
      var z = range(Z_RANGE[0], Z_RANGE[1]);
      var h = world.heightAt(x, z);
      if (h < ZONE[0] || h > ZONE[1]) continue;
      if (onRock(x, z)) continue;
      var clash = false;
      for (var pi = 0; pi < anemones.length; pi++) {
        var o = anemones[pi];
        if ((o.x - x) * (o.x - x) + (o.z - z) * (o.z - z) < SPACING * SPACING) { clash = true; break; }
      }
      if (clash) continue;
      anemones.push({
        x: x, y: h, z: z,
        yaw: range(0, Math.PI * 2),
        /* A carpet anemone settles on whatever the sand under it does,
           so it lies at a slight angle rather than dead level. Small —
           it is a flat animal on a flat shore, not a pen shell. */
        lean: range(-0.10, 0.10),
        tilt: range(-0.10, 0.10),
        size: range(0.72, 1.34),
        state: 'shrunk',
        open: 0,                   // 0 pulled into the sand .. 1 carpet fully out
        drawn: -1,                 // last `open` written to the matrices
        pulse: rand(),
        foldT: 0,                  // seconds left of a contact
        scan: range(0, SCAN_SECS),
        guests: 0,                 // set every frame by anemonefish.js
        folds: 0                   // lifetime contacts — the number that says the wiring fires
      });
    }
    var N = anemones.length;

    function slots(geo, per, shadow) {
      var m = new THREE.InstancedMesh(geo, mat, Math.max(N * per, 1));
      m.frustumCulled = false;
      m.castShadow = !!shadow;
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      group.add(m);
      return { mesh: m, per: per };
    }
    var R = {
      disc:   slots(P.disc, 1, true),
      column: slots(P.column, 1, true)
    };

    /* Per-animal tint, written once. Real ones vary from grey-green
       through olive to a bruised purple, and one flat population of
       identical discs on open sand reads as printed wallpaper. This is
       the ONLY thing instanceColor does here — unlike the sponge, the
       tide's colour change is carried by the geometry (see header). */
    var tint = new THREE.Color();
    for (var i = 0; i < N; i++) {
      var g = range(0.82, 1.14);
      tint.setRGB(g * range(0.92, 1.06), g * range(0.96, 1.06), g * range(0.88, 1.08));
      for (var key in R) {
        for (var j = 0; j < R[key].per; j++) R[key].mesh.setColorAt(i * R[key].per + j, tint);
      }
    }
    for (var kc in R) if (R[kc].mesh.instanceColor) R[kc].mesh.instanceColor.needsUpdate = true;

    /* ---------- placement helpers ---------- */
    var xa = new THREE.Vector3(), ya = new THREE.Vector3(), za = new THREE.Vector3();
    var mPart = new THREE.Matrix4(), mBody = new THREE.Matrix4(), mOut = new THREE.Matrix4();
    var root = new THREE.Vector3(), tmp = new THREE.Vector3();
    var qb = new THREE.Quaternion(), eul = new THREE.Euler();

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
    /* A part scaled differently along its own axis than across it.
       `putCentred` everywhere else on this shore takes ONE scale, and
       one scale cannot say "shorter and fatter", which is the whole
       shape of a contraction. The disc's +X is its height and its
       Y/Z are its radius (anemonebody.js), so this is two numbers, not
       a new basis — no rolling involved, so §36's putBasisRoll and its
       handedness trap are not in play here. */
    function putScaled(rec, slot, r, sx, syz) {
      mPart.makeScale(sx, syz, syz);
      mPart.setPosition(r);
      mOut.multiplyMatrices(mBody, mPart);
      rec.mesh.setMatrixAt(slot, mOut);
    }

    /* The body basis: +X is up out of the sand, `yaw` spins the animal
       about it, `lean`/`tilt` give it the angle the sand left it at.
       Straight out of penshells.js (§32) — the two species stand in
       the same sediment the same way. */
    function setBody(p) {
      var sc = S * p.size;
      var floorY = world.heightAt(p.x, p.z);
      eul.set(p.tilt, p.yaw, Math.PI * 0.5 + p.lean, 'YXZ');
      qb.setFromEuler(eul);
      mBody.compose(root.set(p.x, floorY - BURY * sc, p.z), qb, tmp.set(sc, sc, sc));
    }

    /* ------------------------------------------------------------
       draw — four numbers off one knob
       ------------------------------------------------------------ */
    function draw(p, pi2) {
      setBody(p);
      var o = p.open;
      /* The breath is a spread animal's only idle motion, and it is
         scaled BY `open` so a shut one is completely still — a blob
         pulsing on dry sand would be the tell that this is a machine. */
      var breath = 1 + 0.035 * o * Math.sin(p.pulse * Math.PI * 2);

      var colH = lerp(COL_H, o);
      var colR = lerp(COL_R, o);
      var discR = lerp(DISC_R, o) * breath;
      var discH = lerp(DISC_H, o);

      // the column stands from the buried base up; +X is up in body space
      put(R.column, pi2, root.set(0, 0, 0), AXIS_X, colH + BURY, colR / COL_GEO_R);
      // and the disc rides on it, at its own height above the sand
      putScaled(R.disc, pi2, root.set(BURY + lerp(DISC_Y, o), 0, 0), discH, discR);
    }

    /* Anything big enough and close enough to land on the carpet.
       Kept to a tick: 18 anemones against 24 stars and 16 crabs is
       ~720 distance checks, nothing twice a second and wasteful
       sixty times. */
    function touched(p, reach) {
      var i2, o, dx, dz;
      if (sandstars) {
        for (i2 = 0; i2 < sandstars.length; i2++) {
          o = sandstars[i2];
          if (o.state === 'buried') continue;       // a buried star passes underneath
          dx = o.x - p.x; dz = o.z - p.z;
          if (dx * dx + dz * dz < reach * reach) return true;
        }
      }
      if (swimmingcrabs) {
        for (i2 = 0; i2 < swimmingcrabs.length; i2++) {
          o = swimmingcrabs[i2];
          if (o.state !== 'active') continue;       // a buried crab is under the sand, not on the disc
          dx = o.x - p.x; dz = o.z - p.z;
          if (dx * dx + dz * dz < reach * reach) return true;
        }
      }
      return false;
    }

    /* ------------------------------------------------------------
       update
       ------------------------------------------------------------ */
    function update(dt) {
      var moved = false;

      for (var pi2 = 0; pi2 < N; pi2++) {
        var p = anemones[pi2];
        var sc = S * p.size;
        var discY = world.heightAt(p.x, p.z) + DISC_Y[1] * sc;
        var surf = world.waterAt(p.x, p.z);
        var wet = surf !== null && surf > discY + SUBMERGE;

        if (p.foldT > 0) p.foldT -= dt;

        if (!wet) {
          /* Air beats everything. A contracted anemone cannot fold on
             anything and is not hosting anybody — the fish left with
             the water (anemonefish.js). */
          p.state = 'shrunk';
          p.foldT = 0;
        } else {
          p.scan -= dt;
          if (p.scan <= 0) {
            p.scan = SCAN_SECS;
            if (p.foldT <= 0 && touched(p, FOLD_R * 0.5 * sc)) { p.foldT = FOLD_SECS; p.folds++; }
          }
          p.state = p.foldT > 0 ? 'fold' : (p.guests > 0 ? 'embrace' : 'spread');
        }

        var want = p.state === 'spread' ? OPEN_SPREAD
                 : p.state === 'embrace' ? OPEN_EMBRACE
                 : p.state === 'fold' ? OPEN_FOLD
                 : OPEN_SHRUNK;

        var busy = false;
        if (p.open !== want) {
          /* Closing is a muscle and opening is that muscle letting go,
             so they run at different speeds — the pen shell's
             distinction (§32). A contact clenches fastest of all; the
             ebb is the slowest thing that happens to this animal, and
             a real one takes minutes to pull itself down. */
          var rate = want > p.open ? 0.55 : (p.state === 'fold' ? 3.2 : 0.75);
          p.open += (want - p.open) * Math.min(1, rate * dt);
          if (Math.abs(p.open - want) < 0.004) p.open = want;
          busy = true;
        }
        if (p.open > 0.02) {
          p.pulse += dt / PULSE_SECS;
          if (p.pulse > 1) p.pulse -= 1;
          busy = true;
        }
        p.guests = 0;               // anemonefish.js re-counts it every frame

        if (!busy && Math.abs(p.open - p.drawn) < 0.002) continue;
        p.drawn = p.open;
        draw(p, pi2);
        moved = true;
      }

      if (moved) {
        R.disc.mesh.instanceMatrix.needsUpdate = true;
        R.column.mesh.instanceMatrix.needsUpdate = true;
      }
    }

    for (i = 0; i < N; i++) draw(anemones[i], i);
    for (var k3 in R) R[k3].mesh.instanceMatrix.needsUpdate = true;

    return {
      count: N,
      group: group,
      anemones: anemones,
      update: update,
      // how many carpets are actually out — the sessile predators' tide gauge
      spread: function () {
        var n = 0;
        for (var i3 = 0; i3 < N; i3++) if (anemones[i3].state === 'spread') n++;
        return n;
      },
      // lifetime contacts — the number that says the star/crab wiring fires
      folds: function () {
        var n = 0;
        for (var i4 = 0; i4 < N; i4++) n += anemones[i4].folds;
        return n;
      },
      // how many are holding a fish right now — the other half of the pair
      hosting: function () {
        var n = 0;
        for (var i5 = 0; i5 < N; i5++) if (anemones[i5].state === 'embrace') n++;
        return n;
      }
    };
  }

  window.Anemones = { spawn: spawn };
})();
