/* ============================================================
   mudskippers.js — the mudskipper population.

   Replaces the goby (BUILD_GUIDE §21). Same slot in the roster, and
   the opposite animal: a goby is a fish that gets caught out by the
   tide, and a mudskipper is a fish that MEANS to be out of the water.

   WHAT CHANGED, AND WHY IT MATTERS. The goby's whole model was
   stranding: caught dry, it flopped on its side, a 26 s clock ran, and
   it died. Every line of that is wrong for this animal.

     it does not lie on its side   A stranded fish is a fish on its
                                   side. A mudskipper on mud is UPRIGHT,
                                   propped on its pectoral fins with its
                                   head raised. It is the posture that
                                   makes the species readable at fifty
                                   metres.
     it does not just lie there    It SKIPS: a tail-flick launch, an
                                   arc, a landing back on the props. In
                                   between it crutches forward on the
                                   pectorals.
     it does not die of air        Air is where it works. It breathes
                                   through skin and a wet gill chamber,
                                   which is also the one real constraint
                                   — see MOISTURE below.

   THE WATER EDGE IS THE HABITAT. A real mudskipper is almost never far
   from water; it works the wet margin, and it goes back to wet itself.
   So the animal here has an EDGE PREFERENCE rather than a depth
   preference: it wants terrain sitting just above the current
   waterline, and every target it picks is scored on how close that
   spot is to the edge. When the tide moves, the band moves, and the
   population walks with it — up the shore on the flood, down on the
   ebb, always strung out along the waterline.

     water    swimming, in the shallows it prefers
     pooled   in a standing pool. It USES pools — it is not trapped in
              one. See the note on §5 below.
     perch    out of water, propped on its pectorals, dorsal up
     skip     the vault itself: launch, arc, land
     towater  drying out, and heading for the nearest water to re-wet

   MOISTURE, NOT MORTALITY. `wet` runs 1 → 0 over DRY_SECS out of the
   water. It never kills: at LOW_WET the animal simply stops what it is
   doing and goes to the nearest water, dips, and comes back out. That
   is the real behaviour and it produces the real pattern — constant
   traffic across the waterline, all day.

   WHAT THIS COSTS: §5's TRAPPING DEMONSTRATION. The pool finder used
   to be proved by gobies stuck in pools at low water, and this animal
   cannot be stuck — it walks out. Pools still work and are still
   modelled (`pooled` reads them, and the mudskipper prefers a pool's
   edge like any other water), but nothing on this shore is currently
   TRAPPED by one. That demonstration needs a true fish; see the note
   in the guide.

   RENDERING. Six InstancedMeshes: body, eyes (2), tail, sail dorsal,
   second dorsal, pectorals (2).
   ============================================================ */
(function () {
  'use strict';

  /* ---------- the knobs ---------- */
  var S = 0.62;                 // metres per body unit — see the scale note below
  var COUNT = 46;
  var ZONE = [0.8, 2.6];        // metres CD — the mudflat, higher than the goby's band.
                                // A mudskipper's ground is the flat the tide UNCOVERS, and the
                                // top of it reaches the mangrove fringe so there is still dry
                                // edge to sit on at high water.
  var EDGE_ABOVE = 0.14;        // metres above the waterline it likes to sit
  var EDGE_BAND = 0.45;         // metres — how far above the water it will work
  var CRUISE = 0.50;            // m/s swimming
  var DART = 1.90;              // m/s, the burst when startled
  var CLEAR = 0.10;             // metres between belly and floor while swimming
  var SWIM_DEPTH = 0.09;        // metres of water before it swims rather than walks.
                                // NOT the same as "wet enough" — see update()

  var SKIP_DIST = [0.35, 0.95]; // metres per skip
  var SKIP_SECS = 0.34;         // launch to landing — fast, it is a flick not a hop
  var SKIP_ARC = 0.16;          // metres of air under it at the top
  var PERCH = [0.5, 2.8];       // seconds propped between skips
  var CRUTCH = 0.10;            // m/s — the slow pectoral walk while perched

  var DRY_SECS = 55;            // seconds out of water before it must re-wet
  var LOW_WET = 0.30;           // below this it breaks off and heads for water
  var REWET_SECS = 2.5;         // seconds in water to come back to full

  /* Same exaggeration the rest of the shore carries: a real mudskipper
     is 10–20 cm, invisible on a 300 m transect. S is the one knob. */

  var seed = 31337;
  function rand() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
  function range(a, b) { return a + rand() * (b - a); }

  var AXIS_X = new THREE.Vector3(1, 0, 0);
  var UP = new THREE.Vector3(0, 1, 0);
  var FWD = new THREE.Vector3(0, 0, 1);

  /* ---------- body layout, in body units ----------
     The eyes moved: on the goby they sat high on the head, on this
     animal they sit ON TOP of it and closer to the midline. */
  var EYE_AT = { x: 0.33, y: 0.105, z: 0.035 };
  var SAIL = { x: 0.09, len: 0.19, half: 0.20 };
  var DORSAL_2 = { x: -0.17, len: 0.28, half: 0.09 };
  var PECT_AT = { x: 0.19, y: -0.055, z: 0.075 };
  var PECT_LEN = 0.21;
  var PECT_THICK = 0.30;
  /* Ashore the pectorals are LIMBS and have to read as limbs: longer, so
     they reach the mud, and thick enough to look like something the animal
     puts its weight on. The first pass used the swimming values for both
     and the props vanished under the body — the animal just looked beached. */
  var PROP_LEN = 0.32;
  var PROP_THICK = 0.55;
  var PROP_LIFT = 0.115;        // body units the belly clears the mud by
  var PROP_PITCH = 0.32;        // radians nose-up while propped
  var TAIL_AT = -0.47;

  function spawn(scene, world) {
    var P = MudskipperBody.parts();
    var mat = MudskipperBody.material();

    var group = new THREE.Group();
    group.name = 'mudskippers';
    scene.add(group);

    function slots(geo, per, shadow) {
      var m = new THREE.InstancedMesh(geo, mat, Math.max(COUNT * per, 1));
      m.frustumCulled = false;      // 300 m of shore — see the note in crabs.js
      m.castShadow = !!shadow;
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      group.add(m);
      return { mesh: m, per: per };
    }
    var R = {
      body:   slots(P.body, 1, true),
      eye:    slots(P.eye, 2),
      tail:   slots(P.tailFin, 1),
      sail:   slots(P.dorsalSail, 1),
      dorsal: slots(P.dorsalFin, 1),
      pect:   slots(P.pectoralFin, 2, true)
    };

    /* ---------- the animals ---------- */
    var fish = [];
    var tint = new THREE.Color();
    var i, j;
    for (i = 0; i < COUNT; i++) {
      var f = {
        x: 0, z: 0, y: 0,
        yaw: range(0, Math.PI * 2),
        pitch: 0,
        tgtX: 0, tgtZ: 0,
        state: 'perch',
        speed: 0,
        wag: rand(),
        dart: 0,
        rest: range(0, 3),
        pool: null,
        vis: false,
        size: range(0.82, 1.18),

        wet: 1,                       // 1 fresh from the water .. 0 parched
        skip: 0,                      // 0..1 through a skip
        skipFrom: { x: 0, z: 0 }, skipTo: { x: 0, z: 0 },
        prop: 1,                      // 0 flat .. 1 fully propped up on the pectorals
        flag: rand(),                 // dorsal sail, 0 folded .. 1 flying

        /* How far above the waterline this individual likes to work.
           The spread is what strings the population out along the edge
           instead of stacking them all on one contour. */
        perchH: range(0.02, EDGE_BAND)
      };
      fish.push(f);
      var g = range(0.86, 1.12);
      tint.setRGB(g * range(0.97, 1.04), g, g * range(0.94, 1.02));
      for (var key in R) {
        for (j = 0; j < R[key].per; j++) R[key].mesh.setColorAt(i * R[key].per + j, tint);
      }
    }
    for (var k in R) if (R[k].mesh.instanceColor) R[k].mesh.instanceColor.needsUpdate = true;

    /* ---------- placement helpers — same basis trick as the crab ---------- */
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
      R.sail.mesh.setMatrixAt(fi, HIDE);
      R.dorsal.mesh.setMatrixAt(fi, HIDE);
      for (var s = 0; s < 2; s++) {
        R.eye.mesh.setMatrixAt(fi * 2 + s, HIDE);
        R.pect.mesh.setMatrixAt(fi * 2 + s, HIDE);
      }
    }

    /* ------------------------------------------------------------
       draw

       THE ONE RULE: roll is always zero. The goby rolled onto its side
       when it beached, because that is what a dying fish does. This
       animal is never on its side — out of water it stands on its
       pectorals with its nose up, and that posture IS the species.
       ------------------------------------------------------------ */
    function draw(f, fi) {
      var sc = S * f.size;
      var ashore = f.state === 'perch' || f.state === 'skip' || f.state === 'towater';
      var arc = f.state === 'skip' ? Math.sin(f.skip * Math.PI) : 0;

      /* Propped up: the head lifts and the whole body sits nose-high.
         Mid-skip it pitches up on the launch and noses down to land. */
      var pitch = f.pitch;
      if (ashore) pitch = PROP_PITCH * f.prop + Math.sin(f.skip * Math.PI * 2) * 0.30 * arc;

      var lift = ashore ? (PROP_LIFT * f.prop) : 0;
      var y = f.y + (lift + arc * SKIP_ARC / sc) * sc;

      /* -90° because the body is built along +X while `yaw` is a compass
         heading from +Z — the same correction the goby needed, and the
         same one the fiddler crab next door does NOT. */
      eul.set(0, f.yaw - Math.PI * 0.5, pitch, 'YZX');
      qb.setFromEuler(eul);
      mBody.compose(root.set(f.x, y, f.z), qb, tmp.set(sc, sc, sc));

      putCentred(R.body, fi, root.set(0, 0, 0), 1);

      var swim = Math.sin(f.wag * Math.PI * 2);
      var effort = ashore ? 0.30 : (0.35 + Math.min(1, f.speed / CRUISE) * 0.65);
      var s;

      for (s = 0; s < 2; s++) {
        var side = s === 0 ? 1 : -1;
        putCentred(R.eye, fi * 2 + s, root.set(EYE_AT.x, EYE_AT.y, side * EYE_AT.z), 1);

        if (ashore) {
          /* CRUTCHES. The pectorals go down and forward and take the
             animal's weight; during a skip they sweep back as it
             launches and reach forward again to catch the landing. */
          var reach = 0.45 + arc * 0.5 + Math.sin(f.wag * Math.PI * 2 + s * Math.PI) * 0.12 * f.prop;
          root.set(PECT_AT.x, PECT_AT.y, side * PECT_AT.z);
          /* Down and out, planted wide of the body: the arm has to be
             SEEN taking the weight, or the pose reads as a fish lying
             down with its fins tucked under it. */
          dir.set(0.28 + reach * 0.30, -1.0 + arc * 0.55, side * 0.62).normalize();
          put(R.pect, fi * 2 + s, root, dir, PROP_LEN, PROP_THICK, false);
        } else {
          // in water they row, the way any goby does
          var row = Math.sin(f.wag * Math.PI * 2 + s * Math.PI) * 0.5 * effort;
          root.set(PECT_AT.x, PECT_AT.y, side * PECT_AT.z);
          dir.set(-0.25 - row * 0.5, -0.12, side * (0.95 - Math.abs(row) * 0.2)).normalize();
          put(R.pect, fi * 2 + s, root, dir, PECT_LEN, PECT_THICK, false);
        }
      }

      /* The sail. Up when propped ashore — a mudskipper on a mudbank
         flies its first dorsal — and folded down in the water. A fin's
         LENGTH runs along the back and its HEIGHT stands off it, so it
         points +X and the blade's own Y is the height (the mistake that
         cost the goby a debugging pass). */
      var sailH = SAIL.half * 2 * (0.30 + 0.70 * f.flag);
      root.set(SAIL.x - SAIL.len * 0.5, 0.090, 0);
      put(R.sail, fi, root, AXIS_X, SAIL.len, sailH, true);

      root.set(DORSAL_2.x - DORSAL_2.len * 0.5, 0.068, 0);
      put(R.dorsal, fi, root, AXIS_X, DORSAL_2.len, DORSAL_2.half * 2, true);

      /* The tail. In water it wags to swim; ashore it stays cocked to
         one side, which is the spring that throws the next skip. */
      var wagA = ashore ? (0.35 + arc * 0.5) * (f.skipSide || 1) : swim * 0.55 * effort;
      root.set(TAIL_AT, 0, 0);
      dir.set(-Math.cos(wagA), 0, Math.sin(wagA));
      put(R.tail, fi, root, dir, 1, 1, true);
    }

    /* ------------------------------------------------------------
       the water edge

       `edgeScore` is the whole habitat model: how good a spot is, for
       an animal that wants to be just above the water rather than in
       it or far from it. Everything else — following the tide up and
       down the shore, hanging around pool rims, never wandering into
       the mangroves — falls out of maximising it.
       ------------------------------------------------------------ */
    function waterLevelNear(x, z) {
      /* The surface it should measure itself against: the pool it is
         standing in if there is one, otherwise the sea. */
      var p = world.poolAt(x, z);
      if (p && p.rimY > world.tide) return p.rimY;
      return world.tide;
    }

    function edgeScore(f, x, z) {
      if (!world.inSimArea(x, z)) return -1e9;
      var h = world.heightAt(x, z);
      if (h < ZONE[0] - 0.6 || h > ZONE[1] + 0.4) return -1e9;
      var lvl = waterLevelNear(x, z);
      var above = h - lvl;                       // + = dry ground, − = under water
      /* Best is a little above the waterline; being under water is
         tolerable, being high and dry is not. */
      var want = f.perchH + EDGE_ABOVE;
      var err = Math.abs(above - want);
      var score = 2.2 - err * 3.0;
      if (above > EDGE_BAND + 0.5) score -= 4;   // too far up the shore
      if (above < -0.9) score -= 2;              // too deep
      return score;
    }

    function inWater(x, z) { return world.waterAt(x, z) !== null; }

    /* Nearest water, for an animal that has to re-wet. Omnidirectional
       — the same lesson the goby's scramble taught: water behind you is
       still water. */
    function pickWater(f) {
      var bestX = f.x, bestZ = f.z, best = -1e9, found = false;
      var t, a, d, x, z;
      for (t = 0; t < 26; t++) {
        a = range(0, Math.PI * 2); d = range(0.5, 9);
        x = f.x + Math.sin(a) * d; z = f.z + Math.cos(a) * d;
        if (!world.inSimArea(x, z)) continue;
        var surf = world.waterAt(x, z);
        if (surf === null) continue;
        var away = Math.hypot(x - f.x, z - f.z);
        var score = -away;                        // nearest wins, full stop
        if (score > best) { best = score; bestX = x; bestZ = z; found = true; }
      }
      if (found) { f.tgtX = bestX; f.tgtZ = bestZ; return true; }

      /* NOTHING WET WITHIN REACH — head DOWNHILL.

         An animal left high on the flat by a fast ebb can have no water
         at all inside the sample radius, and the first version simply
         gave up: it sat there with `wet` pinned at 0 forever, which is
         a fish quietly failing to do the one thing it must. Water is
         always downhill on a shore, so the fallback needs no map: take
         the lowest ground on offer and keep going. */
      var lowY = world.heightAt(f.x, f.z), lowX = f.x, lowZ = f.z, dropped = false;
      for (t = 0; t < 8; t++) {
        a = (t / 8) * Math.PI * 2;
        x = f.x + Math.sin(a) * 6; z = f.z + Math.cos(a) * 6;
        if (!world.inSimArea(x, z)) continue;
        var h = world.heightAt(x, z);
        if (h < lowY) { lowY = h; lowX = x; lowZ = z; dropped = true; }
      }
      if (dropped) { f.tgtX = lowX; f.tgtZ = lowZ; }
      return dropped;
    }

    function pickTarget(f) {
      if (f.pool) {
        // working a pool: stay on its rim, where the food is
        for (var i2 = 0; i2 < 16; i2++) {
          var rad = Math.sqrt(f.pool.area) * range(0.15, 0.55);
          var a2 = range(0, Math.PI * 2);
          var px = f.pool.cx + Math.cos(a2) * rad, pz = f.pool.cz + Math.sin(a2) * rad;
          if (world.inSimArea(px, pz)) { f.tgtX = px; f.tgtZ = pz; return; }
        }
        f.tgtX = f.pool.cx; f.tgtZ = f.pool.cz;
        return;
      }
      var bestX = f.x, bestZ = f.z, best = edgeScore(f, f.x, f.z);
      for (var t = 0; t < 20; t++) {
        var a = range(0, Math.PI * 2), d = range(0.6, 7);
        var x = f.x + Math.sin(a) * d, z = f.z + Math.cos(a) * d;
        var sc = edgeScore(f, x, z) + range(0, 0.6);
        if (sc > best) { best = sc; bestX = x; bestZ = z; }
      }
      f.tgtX = bestX; f.tgtZ = bestZ;
    }

    /* ------------------------------------------------------------
       ashore: skipping and crutching
       ------------------------------------------------------------ */
    function launchSkip(f) {
      var dx = f.tgtX - f.x, dz = f.tgtZ - f.z;
      var dist = Math.hypot(dx, dz);
      if (dist < 0.05) { pickTarget(f); return false; }
      var hop = Math.min(dist, range(SKIP_DIST[0], SKIP_DIST[1]) * (f.wet < LOW_WET ? 1.35 : 1));
      var ux = dx / dist, uz = dz / dist;
      var nx = f.x + ux * hop, nz = f.z + uz * hop;
      if (!world.inSimArea(nx, nz)) { pickTarget(f); return false; }
      var h = world.heightAt(nx, nz);
      if (h > ZONE[1] + 0.5) { pickTarget(f); return false; }     // never skip up into the trees
      f.skipFrom.x = f.x; f.skipFrom.z = f.z;
      f.skipTo.x = nx; f.skipTo.z = nz;
      f.yaw = Math.atan2(ux, uz);
      f.skip = 0;
      f.skipSide = rand() < 0.5 ? 1 : -1;        // which way the tail is cocked
      f.state = 'skip';
      return true;
    }

    function ashoreStep(f, dt, floorY) {
      f.y += (floorY - f.y) * Math.min(1, dt * 8);
      f.prop += (1 - f.prop) * Math.min(1, dt * 4);
      f.speed = 0;

      // the dorsal goes up and down as it displays, more when settled
      f.flag += (( (f.state === 'perch' ? 0.85 : 0.25) - f.flag)) * Math.min(1, dt * 2);

      if (f.state === 'skip') {
        f.skip += dt / SKIP_SECS;
        if (f.skip >= 1) {
          f.skip = 1;
          f.x = f.skipTo.x; f.z = f.skipTo.z;
          f.state = 'perch';
          f.rest = range(PERCH[0], PERCH[1]) * (f.wet < LOW_WET ? 0.25 : 1);
        } else {
          var k = f.skip;
          f.x = f.skipFrom.x + (f.skipTo.x - f.skipFrom.x) * k;
          f.z = f.skipFrom.z + (f.skipTo.z - f.skipFrom.z) * k;
        }
        f.wag = (f.wag + dt * 3.5) % 1;
        return;
      }

      /* Perched. It crutches slowly toward its target on the pectorals
         between skips — a mudskipper is not still, it shuffles. */
      var dx = f.tgtX - f.x, dz = f.tgtZ - f.z;
      var dist = Math.hypot(dx, dz);
      if (dist > 0.08) {
        var step = CRUTCH * dt;
        var ux = dx / dist, uz = dz / dist;
        var nx = f.x + ux * step, nz = f.z + uz * step;
        if (world.inSimArea(nx, nz)) {
          f.x = nx; f.z = nz;
          f.yaw += wrapPi(Math.atan2(ux, uz) - f.yaw) * Math.min(1, dt * 2.5);
        }
      }
      f.wag = (f.wag + dt * 0.5) % 1;

      f.rest -= dt;
      if (f.rest <= 0) {
        if (dist < 0.25) pickTarget(f);
        if (!launchSkip(f)) f.rest = range(0.2, 0.8);
      }
    }

    /* ------------------------------------------------------------
       in the water
       ------------------------------------------------------------ */
    function swimStep(f, dt, surf, floorY) {
      f.prop += (0 - f.prop) * Math.min(1, dt * 5);

      var want = Math.min(surf - 0.08, floorY + CLEAR);
      if (want < floorY + 0.03) want = floorY + 0.03;
      f.y += (want - f.y) * Math.min(1, dt * 6);

      var dx = f.tgtX - f.x, dz = f.tgtZ - f.z;
      var dist = Math.hypot(dx, dz);
      if (f.dart > 0) f.dart -= dt;

      if (dist < 0.30) {
        f.rest -= dt;
        if (f.rest <= 0) { pickTarget(f); f.rest = range(0.5, 2.2); }
        f.speed += (CRUISE * 0.2 - f.speed) * Math.min(1, dt * 2);
      } else {
        var target = f.dart > 0 ? DART : CRUISE;
        f.speed += (target - f.speed) * Math.min(1, dt * 3);
        var ux = dx / dist, uz = dz / dist;
        f.yaw += wrapPi(Math.atan2(ux, uz) - f.yaw) * Math.min(1, dt * 4.5);
        var step = f.speed * dt;
        var nx = f.x + Math.sin(f.yaw) * step, nz = f.z + Math.cos(f.yaw) * step;
        /* Unlike the goby, walking OUT of the water is allowed and
           normal — that is the entire species. Landing is handled by
           update() the moment the column under it is dry. */
        if (world.inSimArea(nx, nz)) { f.x = nx; f.z = nz; }
        else pickTarget(f);
      }

      f.pitch += ((f.speed > CRUISE * 1.4 ? -0.10 : 0) - f.pitch) * Math.min(1, dt * 3);
      f.wag = (f.wag + dt * (1.1 + f.speed * 1.9)) % 1;
    }

    /* ------------------------------------------------------------
       update
       ------------------------------------------------------------ */
    function update(dt) {
      var touched = false;

      for (var fi = 0; fi < COUNT; fi++) {
        var f = fish[fi];

        if (!f.placed) { if (!place(f)) continue; }

        var surf = world.waterAt(f.x, f.z);
        var floorY = world.heightAt(f.x, f.z);
        var depth = surf === null ? -1 : surf - floorY;

        /* WETTING AND SWIMMING ARE TWO DIFFERENT THRESHOLDS, and
           conflating them was a real bug: the first version only
           counted water deeper than SWIM_DEPTH, so animals standing in
           the two-centimetre film right at the waterline — exactly
           where this species lives — dried out to zero while visibly
           sitting in water. ANY water wets a mudskipper. It takes a lot
           more than that before it can swim in it. */
        if (surf !== null) f.wet = Math.min(1, f.wet + dt / REWET_SECS);
        else f.wet = Math.max(0, f.wet - dt / DRY_SECS);

        if (depth > SWIM_DEPTH) {
          /* Deep enough to swim. Note whether this is a pool — it uses
             pools, it is not caught by them. */
          var pool = world.poolAt(f.x, f.z);
          f.pool = (pool && pool.rimY > world.tide + 0.01) ? pool : null;
          f.state = f.pool ? 'pooled' : 'water';
          swimStep(f, dt, surf, floorY);
        } else {
          /* On the mud, or in the film over it — the same behaviour
             either way, propped up and skipping. This is not an
             emergency and there is no clock counting down to anything
             except a trip back to deeper water. */
          f.pool = null;
          if (f.wet < LOW_WET) {
            if (f.state !== 'skip') {
              f.state = 'towater';
              if (!inWater(f.tgtX, f.tgtZ)) pickWater(f);
            }
          } else if (f.state !== 'skip') {
            f.state = 'perch';
          }
          ashoreStep(f, dt, floorY);
        }

        draw(f, fi);
        f.vis = true;
        touched = true;
      }

      if (touched) for (var k2 in R) R[k2].mesh.instanceMatrix.needsUpdate = true;
    }

    /* First placement: on the edge, wherever the edge happens to be at
       load. They are never removed from the shore after this — an
       amphibious animal has nowhere it needs to go. */
    function place(f) {
      for (var t = 0; t < 40; t++) {
        var x = range(-world.simArea.halfX + 6, world.simArea.halfX - 6);
        var z = range(-30, 60);
        if (!world.inSimArea(x, z)) continue;
        var h = world.heightAt(x, z);
        if (h < ZONE[0] || h > ZONE[1]) continue;
        f.x = x; f.z = z; f.y = h;
        f.tgtX = x; f.tgtZ = z;
        f.placed = true;
        pickTarget(f);
        return true;
      }
      return false;
    }

    function wrapPi(a) {
      while (a > Math.PI) a -= Math.PI * 2;
      while (a < -Math.PI) a += Math.PI * 2;
      return a;
    }

    for (var q = 0; q < COUNT; q++) hideFish(q);
    for (var k3 in R) R[k3].mesh.instanceMatrix.needsUpdate = true;

    return {
      count: COUNT,
      group: group,
      fish: fish,
      update: update,
      // how many are out of the water right now — the thing you notice
      ashore: function () {
        var n = 0;
        for (var i3 = 0; i3 < COUNT; i3++) {
          var s = fish[i3].state;
          if (s === 'perch' || s === 'skip' || s === 'towater') n++;
        }
        return n;
      },
      tally: function () {
        var t = { water: 0, pooled: 0, perch: 0, skip: 0, towater: 0 };
        for (var i4 = 0; i4 < COUNT; i4++) t[fish[i4].state] = (t[fish[i4].state] || 0) + 1;
        return t;
      }
    };
  }

  window.Mudskippers = { spawn: spawn };
})();
