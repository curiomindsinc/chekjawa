/* ============================================================
   crabs.js — the fiddler crab population (BUILD_GUIDE §1, §6).

   First organism on this shore, so it also sets the pattern the other
   five will follow.

   THE SPECIES IS INVERTED and that is the whole point of putting it
   here first. Everything else in the v1 roster is active while it is
   WET and shuts down when the tide leaves. A fiddler crab is an
   air-breather living in a hole: it is active only while its column is
   DRY, and it goes down the burrow on the flood. So the shore is never
   empty — as the water walks up the transect, one guild switches off
   and this one switches on behind it. That reads on screen in a way no
   single species can.

   `emersion: 'emerge'` in the guide's table is exactly this, and
   `stranding` is null: being out of water is not a hazard to this
   animal, it is the condition it waits for.

   WHAT DRIVES A CRAB, in priority order:
     1. water at its burrow  — flee, immediately, no matter what
     2. tide rising to it    — flee early, before it arrives
     3. night                — go down; these are diurnal
     4. otherwise            — sift the mud near the burrow, and wave
                               (and range further out when it is thin)

   Waving is a male display and it is the thing people recognise, so it
   gets the most animation care: a bout of two to six sweeps, then a
   rest, and the rest is shorter the further the tide has dropped below
   the burrow — activity peaks at low water, which is what a mudflat
   full of these actually looks like.

   FEEDING IS WIRED TO THE BIOFILM (§7, §28). It was the last v1 species
   still grazing a resource that did not exist. The sift now drains
   `world.grazeFilm` and hands a PELLET back, so the crumb ring round a
   hole is the record of where the film went — and the flood erases the
   whole field twice a day. See the knobs below for why the rate is so
   small: this is the most confined grazer on the shore.

   RENDERING. Nine InstancedMeshes for the animals (one per body part,
   every crab holding a fixed slot in each) plus one static mesh for the
   burrow mouths and one live one for the pellets. Eleven draw calls for
   the whole population. Parts come from crabbody.js already sized in BODY
   UNITS — carapace width 1.0 — and the per-crab matrix carries S,
   metres per body unit, so the animal has exactly one size knob.
   ============================================================ */
(function () {
  'use strict';

  /* ---------- the knobs ----------
     S is the only one that changes how big the crab looks. A real
     fiddler is 2–3 cm across; drawn true to scale on a 300 m transect
     it is a single pixel next to 3 m boulders, so this is deliberately
     ~15x life size — the same exaggeration the boulders and mangroves
     already carry. Turn it down for realism, up for a diorama. */
  var S = 0.48;                 // metres per body unit
  var COUNT = 84;
  var ZONE = [1.78, 2.24];      // metres CD — guide §1, the fiddler band
  var Z_RANGE = [-36, -6];      // the mudflat, guide §4 profile
  var SPACING = 1.5;            // metres between burrows — they are territorial
  var TERRITORY = 1.30;         // metres it will wander from its hole
  var WALK = 0.34;              // m/s, foraging
  var FLEE = 1.55;              // m/s, running for the burrow
  var STRIDE = 0.20;            // metres per gait cycle
  var MALES = 0.62;             // fraction with the oversized claw

  /* ---------- feeding on the biofilm (§7, §28) ----------
     THE MOST CONFINED GRAZER ON THE SHORE, so the tuning rule that bit
     on the nerite bites twice as hard here: a grazer that cannot leave
     its patch has to sit UNDER regrowth or it strips its ground and
     then starves on it forever. Two things stack up against this
     animal that did not against the snail:

       - a territory 1.30 m wide is about one terrain node (3.0 x 1.5 m),
         and burrows are only 1.5 m apart, so roughly three crabs share
         the ground one of them is standing on;
       - it feeds ONLY while the flat is dry and lit, which is exactly
         when the film up here regrows slowest (biofilm.js DRY_RATE).

     GRAZE_RATE is therefore small and it is per SIFT, not per second of
     being out: a fiddler is not a scraper, it works in discrete
     claw-loads while standing still. Between sift and sift it is
     walking, and walking crabs eat nothing. */
  var GRAZE_RATE = 0.055;       // film units per second, while actively sifting
  var BARE = 0.06;              // below this the claw comes up with grit only
  var GOOD = 0.34;              // above this the sediment is worth working
  /* The two-threshold rule (see the sea hare, §27): BARE answers "is
     there anything left", GOOD answers "is this worth staying for". One
     cutoff pins the patch at exactly that value and the animal never
     registers that it is hungry. */
  var HUNGRY_REACH = 1.62;      // territory multiplier once the ring is worked out
  var TRIES = 5;                // sediment patches compared per move

  /* Deterministic, like the rest of the build: same shore every load. */
  var seed = 90210;
  function rand() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
  function range(a, b) { return a + rand() * (b - a); }
  function pick(a) { return a[Math.floor(rand() * a.length) % a.length]; }

  var AXIS_X = new THREE.Vector3(1, 0, 0);
  var UP = new THREE.Vector3(0, 1, 0);
  var FWD = new THREE.Vector3(0, 0, 1);

  /* ------------------------------------------------------------
     Body layout, in body units. Everything the animation touches is
     measured off these, so a proportion is changed in one place.
     ------------------------------------------------------------ */
  var CARAPACE_Y = 0.34;                       // centre height above the sand
  var HIP = { x: 0.41, y: 0.30 };
  var HIP_Z = [0.24, 0.06, -0.14, -0.32];      // four legs a side, front to back
  var FOOT_X = 0.86;
  var FOOT_SPREAD = 1.15;                      // feet fan wider than the hips
  var L_FEMUR = 0.34, L_TIBIA = 0.34, L_TIP = 0.20;
  var SHOULDER = { x: 0.38, y: 0.34, z: 0.30 };
  var STALK = { x: 0.11, y: 0.46, z: 0.29, len: 0.26 };
  var MAJOR = { merus: 0.30, carpus: 0.26, palm: 0.82, finger: 0.52 };
  var MINOR_SCALE = 0.34;

  /* Claw poses as raw directions; `h` is +1 for a right-handed crab and
     -1 for a left-handed one, which is the only difference between
     them. Interpolated and renormalised per frame — cheaper to reason
     about than a stack of Euler joints, and it is impossible to end up
     with a claw hinged through the carapace. */
  function majorPose(h, w, out) {
    /* w: 0 = folded across the front, 1 = out in the display.
       The wave is mostly LATERAL. An early pass raised it near-vertical
       and the crab looked like it was hailing a taxi — the real display
       throws the claw out and away from the body, and only about
       forty degrees up. */
    out.merus.set(h * (0.55 + 0.31 * w), -0.25 + 0.67 * w, 0.79 - 0.51 * w);
    out.carpus.set(h * (-0.30 + 1.08 * w), -0.10 + 0.66 * w, 0.95 - 0.75 * w);
    out.palm.set(h * (-0.92 + 1.64 * w), 0.06 + 0.56 * w, 0.38 - 0.28 * w);
    return out;
  }
  function minorPose(h, f, out) {
    // f: 0 = held at the mouth, 1 = dipped to the sand, sifting
    out.merus.set(h * 0.50, -0.35 - 0.20 * f, 0.79);
    out.carpus.set(h * -0.50, -0.35 - 0.35 * f, 0.79);
    out.palm.set(h * -0.55, -0.55 - 0.40 * f, 0.62 + 0.20 * f);
    return out;
  }

  /* ------------------------------------------------------------
     spawn
     ------------------------------------------------------------ */
  function spawn(scene, world) {
    var P = CrabBody.parts();
    var mat = CrabBody.material();

    /* ---------- where the holes go ----------
       Rejection sampling against the real terrain rather than a band of
       z: the transect is warped (world.js zEff), so the height a crab
       cares about wanders several metres in z along the shore. Ask the
       ground, don't assume it. */
    var burrows = [];
    var cellKey = {};                       // coarse hash for the spacing test
    function tooClose(x, z) {
      var cx = Math.floor(x / SPACING), cz = Math.floor(z / SPACING);
      for (var i = -1; i <= 1; i++) {
        for (var j = -1; j <= 1; j++) {
          var list = cellKey[(cx + i) + '|' + (cz + j)];
          if (!list) continue;
          for (var k = 0; k < list.length; k++) {
            var b = list[k];
            var dx = b.x - x, dz = b.z - z;
            if (dx * dx + dz * dz < SPACING * SPACING) return true;
          }
        }
      }
      return false;
    }
    function onRock(x, z) {
      for (var i = 0; i < world.rocks.length; i++) {
        var r = world.rocks[i];
        var dx = r.x - x, dz = r.z - z;
        if (dx * dx + dz * dz < (r.r + 0.8) * (r.r + 0.8)) return true;
      }
      return false;
    }

    var halfX = world.simArea.halfX - 5;
    var tries = 0;
    while (burrows.length < COUNT && tries++ < COUNT * 600) {
      var x = range(-halfX, halfX);
      var z = range(Z_RANGE[0], Z_RANGE[1]);
      var h = world.heightAt(x, z);
      if (h < ZONE[0] || h > ZONE[1]) continue;
      if (onRock(x, z) || tooClose(x, z)) continue;
      var rec = { x: x, z: z, y: h };
      burrows.push(rec);
      var key = Math.floor(x / SPACING) + '|' + Math.floor(z / SPACING);
      (cellKey[key] || (cellKey[key] = [])).push(rec);
    }

    var N = burrows.length;
    var group = new THREE.Group();
    group.name = 'fiddler-crabs';
    scene.add(group);

    /* ---------- the burrow mouths (static) ---------- */
    var mHole = new THREE.InstancedMesh(P.burrow, mat, Math.max(N, 1));
    mHole.receiveShadow = true;
    var m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
    var v = new THREE.Vector3(), sv = new THREE.Vector3();
    var i, j;
    for (i = 0; i < N; i++) {
      var b = burrows[i];
      q.setFromAxisAngle(UP, range(0, Math.PI * 2));
      var hs = S * range(0.85, 1.15);
      m4.compose(v.set(b.x, b.y + 0.01, b.z), q, sv.set(hs, hs, hs));
      mHole.setMatrixAt(i, m4);
    }
    mHole.instanceMatrix.needsUpdate = true;

    /* ---------- the pellet field (§28) ----------
       These used to be six crumbs scattered round each hole at build
       time and never touched again — set dressing. They are now the
       RECEIPT for the grazing above: one pellet is dropped wherever a
       crab finished a sift, so the litter accumulates exactly where the
       film went, in a ring that thins with distance from the hole
       because that is where the animal spends its time.

       And the flood wipes it. Every pellet a crab has out is cleared
       the moment its burrow goes under, which is what happens on a real
       flat twice a day — the whole worked surface is erased and the
       animal starts the next low tide on blank mud. Nothing else in
       this sim shows the tide undoing a day's work.

       Cost stays where it was: the same one InstancedMesh, the same
       fixed slot budget, a ring buffer per crab so a long low tide
       overwrites its own oldest crumbs instead of growing the mesh. */
    var PELLETS_PER = 8;
    var mPellet = new THREE.InstancedMesh(P.pellet, mat, Math.max(N * PELLETS_PER, 1));
    mPellet.frustumCulled = false;
    var pm4 = new THREE.Matrix4(), pq = new THREE.Quaternion();
    var pv = new THREE.Vector3(), psv = new THREE.Vector3();
    var ZERO = new THREE.Vector3(0, 0, 0);
    var pelletDirty = false;

    function clearPellet(slot) {
      pm4.compose(pv.set(0, -999, 0), pq.identity(), ZERO);
      mPellet.setMatrixAt(slot, pm4);
      pelletDirty = true;
    }
    /* One finished claw-load of sifted grit, dropped at the crab's feet. */
    function dropPellet(c, ci) {
      var slot = ci * PELLETS_PER + c.pellet;
      c.pellet = (c.pellet + 1) % PELLETS_PER;
      if (c.pellets < PELLETS_PER) c.pellets++;
      pq.setFromAxisAngle(UP, range(0, Math.PI * 2));
      var ps = S * range(0.5, 0.95);
      // just off the mouthparts, not under the body
      var a = c.yaw + range(-0.9, 0.9);
      var px = c.x + Math.sin(a) * 0.16, pz = c.z + Math.cos(a) * 0.16;
      pm4.compose(pv.set(px, world.heightAt(px, pz) + 0.01 * S, pz), pq, psv.set(ps, ps, ps));
      mPellet.setMatrixAt(slot, pm4);
      pelletDirty = true;
    }
    function washPellets(c, ci) {
      for (var s = 0; s < PELLETS_PER; s++) clearPellet(ci * PELLETS_PER + s);
      c.pellets = 0; c.pellet = 0;
    }
    for (i = 0; i < N * PELLETS_PER; i++) clearPellet(i);

    group.add(mHole, mPellet);

    /* ---------- dynamic: the animals ----------
       Frustum culling is off on all of these. Three computes a mesh's
       bounding sphere from its GEOMETRY, which for an InstancedMesh
       spread over 300 m of shore is a sphere around one crab-sized part
       at the origin — every crab would vanish the moment the camera
       looked away from the middle of the plot. */
    function slots(geo, per, shadow) {
      var m = new THREE.InstancedMesh(geo, mat, Math.max(N * per, 1));
      m.frustumCulled = false;
      m.castShadow = !!shadow;
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      group.add(m);
      return { mesh: m, per: per };
    }
    var R = {
      carapace: slots(P.carapace, 1, true),
      stalk:    slots(P.eyestalk, 2),
      eye:      slots(P.eye, 2),
      arm:      slots(P.armSeg, 4),
      palm:     slots(P.clawPalm, 2, true),
      upper:    slots(P.clawUpper, 2),
      lower:    slots(P.clawLower, 2),
      leg:      slots(P.legSeg, 16),
      tip:      slots(P.legTip, 8)
    };

    /* ---------- the crabs ---------- */
    var crabs = [];
    var tint = new THREE.Color();
    for (i = 0; i < N; i++) {
      var bur = burrows[i];
      var male = rand() < MALES;
      var c = {
        b: bur,
        x: bur.x, z: bur.z, y: bur.y,
        yaw: range(0, Math.PI * 2),
        male: male,
        hand: rand() < 0.5 ? 1 : -1,       // which side carries the big claw
        state: 'down',
        sink: 1,                            // 1 = fully in the hole, 0 = standing out
        wait: range(0, 6),                  // staggers emergence across the flat
        tgtX: bur.x, tgtZ: bur.z,
        pause: 0,
        fleeing: false,
        gait: rand(),
        wave: 0, waveT: 0, waveLeft: 0, waveRest: range(1, 8),
        scoop: 0, scoopT: range(0, 3),
        vis: false,
        speed: range(0.85, 1.15),
        /* feeding (§28) */
        act: 'down',                        // what the follow bar says it is doing
        fed: 0.5,                           // smoothed "the sediment here is worth working"
        sifting: false,                     // a claw-load is in progress
        pellet: 0, pellets: 0,              // ring-buffer write slot, and how many are out
        washed: true                        // pellet field already cleared for this flood
      };
      crabs.push(c);

      /* A little variation per animal, multiplied over the baked vertex
         colours. Subtle on purpose — they are one species. */
      var g = range(0.88, 1.10);
      tint.setRGB(g * range(0.97, 1.03), g, g * range(0.95, 1.02));
      for (var key in R) {
        for (j = 0; j < R[key].per; j++) R[key].mesh.setColorAt(i * R[key].per + j, tint);
      }
    }
    for (var k in R) if (R[k].mesh.instanceColor) R[k].mesh.instanceColor.needsUpdate = true;

    /* ------------------------------------------------------------
       Placement helpers.

       A limb part is built root-at-origin along +X, so placing one is:
       point +X down the joint direction, scale X to the segment length
       and Y/Z to its thickness. The roll is pinned by an explicit basis
       rather than by setFromUnitVectors, which picks an arbitrary one —
       and an arbitrary roll on a flattened claw palm is the difference
       between a crab holding a blade and a crab holding a spatula.
       ------------------------------------------------------------ */
    var xa = new THREE.Vector3(), ya = new THREE.Vector3(), za = new THREE.Vector3();
    var mPart = new THREE.Matrix4(), mBody = new THREE.Matrix4(), mOut = new THREE.Matrix4();
    var root = new THREE.Vector3(), dir = new THREE.Vector3(), tmp = new THREE.Vector3();
    var HIDE = new THREE.Matrix4().makeScale(0, 0, 0);

    function basis(m, r, d, len, thick, flat) {
      xa.copy(d).normalize();
      if (flat) {
        /* FLATTENED PARTS — the claw palm and its two fingers. Their thin
           axis is local Z, and where that ends up pointing is the whole
           difference between a crab brandishing a blade and a crab
           brandishing a butter knife. A fiddler holds the claw with the
           broad face forward, so local Z is the body's front-back axis
           squared off against the claw's own direction, NOT whatever
           cross(dir, up) happens to give. */
        za.copy(FWD).addScaledVector(xa, -FWD.dot(xa));
        if (za.lengthSq() < 1e-6) za.copy(UP).addScaledVector(xa, -UP.dot(xa));
        za.normalize();
      } else {
        // near-vertical parts (eyestalks) need a different hint or the cross collapses
        tmp.copy(Math.abs(xa.y) > 0.985 ? FWD : UP);
        za.crossVectors(xa, tmp).normalize();
      }
      ya.crossVectors(za, xa).normalize();
      m.makeBasis(
        xa.multiplyScalar(len),
        ya.multiplyScalar(thick),
        za.multiplyScalar(thick)
      );
      m.setPosition(r);
      return m;
    }
    function put(rec, slot, r, d, len, thick, flat) {
      basis(mPart, r, d, len, thick, flat);
      mOut.multiplyMatrices(mBody, mPart);
      rec.mesh.setMatrixAt(slot, mOut);
    }
    function putCentred(rec, slot, r, scl) {
      mPart.makeScale(scl, scl, scl);
      mPart.setPosition(r);
      mOut.multiplyMatrices(mBody, mPart);
      rec.mesh.setMatrixAt(slot, mOut);
    }
    function hide(rec, slot) {
      rec.mesh.setMatrixAt(slot, HIDE);
    }

    /* One cheliped: shoulder → merus → carpus → palm → two fingers.
       Returns nothing; walks the chain writing each segment as it goes. */
    var pose = { merus: new THREE.Vector3(), carpus: new THREE.Vector3(), palm: new THREE.Vector3() };
    var jp = new THREE.Vector3(), hinge = new THREE.Vector3(), fdir = new THREE.Vector3();
    function cheliped(ci, side, big, w, f, gape) {
      var sc = big ? 1 : MINOR_SCALE;
      var armSlot = ci * 4 + (big ? 0 : 2);
      var clawSlot = ci * 2 + (big ? 0 : 1);

      if (big) majorPose(side, w, pose); else minorPose(side, f, pose);

      jp.set(side * SHOULDER.x, SHOULDER.y, SHOULDER.z);
      var lm = MAJOR.merus * sc, lc = MAJOR.carpus * sc;
      var lp = MAJOR.palm * sc, lf = MAJOR.finger * sc;

      dir.copy(pose.merus).normalize();
      put(R.arm, armSlot, jp, dir, lm, sc);
      jp.addScaledVector(dir, lm);

      dir.copy(pose.carpus).normalize();
      put(R.arm, armSlot + 1, jp, dir, lc, sc * 0.95);
      jp.addScaledVector(dir, lc);

      dir.copy(pose.palm).normalize();
      put(R.palm, clawSlot, jp, dir, lp, sc, true);
      jp.addScaledVector(dir, lp * 0.94);

      /* The fingers carry on from the palm tip, opening away from each
         other by `gape`. A claw that never opens looks welded shut. */
      root.copy(jp);
      dir.copy(pose.palm).normalize();
      /* Its own axis vector: put() runs basis(), which reuses the shared
         scratch vectors, so anything still needed after a put() call has
         to live somewhere basis() will not touch. */
      hinge.crossVectors(dir, UP).normalize();
      fdir.copy(dir).applyAxisAngle(hinge, gape * 0.45);
      put(R.upper, clawSlot, root, fdir, lf, sc, true);
      fdir.copy(dir).applyAxisAngle(hinge, -gape * 0.30);
      put(R.lower, clawSlot, root, fdir, lf * 0.92, sc * 0.95, true);
    }

    /* One leg. Two-link IK from hip to ankle so the foot stays planted
       on the sand while the body moves over it — the thing that makes
       a walk read as a walk rather than as a slide. The knee is solved
       upward, which is the crab's own bend. */
    var hipV = new THREE.Vector3(), ankle = new THREE.Vector3(), knee = new THREE.Vector3();
    var e1 = new THREE.Vector3(), e2 = new THREE.Vector3(), d2 = new THREE.Vector3();
    function leg(ci, li, side, zi, footX, footY, footZ) {
      hipV.set(side * HIP.x, HIP.y, HIP_Z[zi]);
      ankle.set(footX, footY + L_TIP * 0.92, footZ);

      d2.subVectors(ankle, hipV);
      var d = d2.length();
      var reach = (L_FEMUR + L_TIBIA) * 0.985;
      if (d > reach) { d2.multiplyScalar(reach / d); d = reach; ankle.copy(hipV).add(d2); }
      if (d < 1e-4) d = 1e-4;

      e1.copy(d2).divideScalar(d);
      e2.copy(UP).addScaledVector(e1, -UP.dot(e1));
      if (e2.lengthSq() < 1e-6) e2.set(0, 0, 1); else e2.normalize();

      var ca = (L_FEMUR * L_FEMUR + d * d - L_TIBIA * L_TIBIA) / (2 * L_FEMUR * d);
      var a = Math.acos(Math.max(-1, Math.min(1, ca)));
      dir.copy(e1).multiplyScalar(Math.cos(a)).addScaledVector(e2, Math.sin(a));
      knee.copy(hipV).addScaledVector(dir, L_FEMUR);
      put(R.leg, ci * 16 + li * 2, hipV, dir, L_FEMUR, 1);

      dir.subVectors(ankle, knee).normalize();
      put(R.leg, ci * 16 + li * 2 + 1, knee, dir, L_TIBIA, 0.92);

      dir.set(footX - ankle.x, footY - ankle.y, footZ - ankle.z).normalize();
      put(R.tip, ci * 8 + li, ankle, dir, L_TIP, 0.9);
    }

    /* ------------------------------------------------------------
       draw one crab
       ------------------------------------------------------------ */
    var qy = new THREE.Quaternion();
    function drawCrab(c, ci) {
      var yOff = -c.sink * 0.95;                 // down the hole
      qy.setFromAxisAngle(UP, c.yaw);
      mBody.compose(root.set(c.x, c.y + yOff * S, c.z), qy, tmp.set(S, S, S));

      putCentred(R.carapace, ci, root.set(0, CARAPACE_Y, 0), 1);

      var s;
      for (s = 0; s < 2; s++) {
        var side = s === 0 ? 1 : -1;
        // eyestalks lean out and forward, the way they sit on the ref
        root.set(side * STALK.x, STALK.y, STALK.z);
        dir.set(side * 0.18, 1, 0.12).normalize();
        put(R.stalk, ci * 2 + s, root, dir, STALK.len, 1);
        putCentred(R.eye, ci * 2 + s, root.addScaledVector(dir, STALK.len), 1);
      }

      /* Gait. Feet swing along the body's X because a fiddler crab walks
         SIDEWAYS — the body faces across the direction of travel, which
         is why the yaw solve below picks a perpendicular heading. */
      var moving = c.pause <= 0 && (c.state === 'out');
      for (var li = 0; li < 8; li++) {
        var lside = li < 4 ? 1 : -1;
        var zi = li % 4;
        var ph = (c.gait + (zi % 2) * 0.5 + (lside > 0 ? 0 : 0.25)) % 1;
        var swing = ph < 0.4;
        var sp = swing ? ph / 0.4 : (ph - 0.4) / 0.6;
        // stance drags the foot back through the stroke, swing returns it
        var along = swing ? (-1 + 2 * sp) : (1 - 2 * sp);
        var lift = swing ? Math.sin(sp * Math.PI) * 0.16 : 0;
        if (!moving) { along = 0; lift = 0; }
        leg(ci, li, lside, zi,
          lside * FOOT_X + along * 0.20 * c.strafe,
          lift,
          HIP_Z[zi] * FOOT_SPREAD);
      }

      cheliped(ci, c.hand, true, c.wave, 0, c.wave * 0.8 + c.scoop * 0.2);
      cheliped(ci, -c.hand, false, 0, c.scoop, c.scoop * 0.5);
    }

    function hideCrab(ci) {
      hide(R.carapace, ci);
      var s;
      for (s = 0; s < 2; s++) { hide(R.stalk, ci * 2 + s); hide(R.eye, ci * 2 + s); }
      for (s = 0; s < 4; s++) hide(R.arm, ci * 4 + s);
      for (s = 0; s < 2; s++) { hide(R.palm, ci * 2 + s); hide(R.upper, ci * 2 + s); hide(R.lower, ci * 2 + s); }
      for (s = 0; s < 16; s++) hide(R.leg, ci * 16 + s);
      for (s = 0; s < 8; s++) hide(R.tip, ci * 8 + s);
    }

    // start with everything down the hole
    for (i = 0; i < N; i++) { crabs[i].strafe = 1; hideCrab(i); }
    for (k in R) R[k].mesh.instanceMatrix.needsUpdate = true;

    /* ------------------------------------------------------------
       update
       ------------------------------------------------------------ */
    function update(dt) {
      var anyDrawn = false;

      for (var ci = 0; ci < N; ci++) {
        var c = crabs[ci];
        var b = c.b;

        /* ---- should it be out at all? ----
           waterAt is THE seam (§3): it accounts for pools, so a crab
           whose hole sits inside one stays down even at dead low. */
        var wet = world.waterAt(b.x, b.z) !== null;
        var flooding = world.tideDir > 0 && world.tide > b.y - 0.08;
        var wantsOut = !wet && !flooding && !world.isNight;

        /* The flood takes the pellet field back (§28). Keyed off water
           actually reaching the hole, not off the crab going down — a
           crab that dives because night fell keeps its litter until the
           tide comes for it. */
        if (wet) {
          if (!c.washed) { washPellets(c, ci); c.washed = true; }
        } else if (c.washed && c.pellets === 0) {
          c.washed = false;
        }

        switch (c.state) {
          case 'down':
            c.act = 'down';
            if (wantsOut) {
              c.wait -= dt;
              if (c.wait <= 0) { c.state = 'rising'; c.sink = 1; }
            } else {
              c.wait = range(0.4, 6);        // re-stagger for the next low
            }
            break;

          case 'rising':
            c.act = 'rising';
            c.sink -= dt / 0.42;
            if (c.sink <= 0) {
              c.sink = 0; c.state = 'out'; c.fleeing = false;
              c.pause = range(0.2, 0.8);
              c.tgtX = b.x; c.tgtZ = b.z;
            }
            break;

          case 'out':
            if (!wantsOut && !c.fleeing) { c.fleeing = true; c.tgtX = b.x; c.tgtZ = b.z; }
            surface(c, ci, dt);
            break;

          case 'diving':
            c.act = 'diving';
            c.sink += dt / 0.34;
            if (c.sink >= 1) { c.sink = 1; c.state = 'down'; c.wait = range(0.4, 6); }
            break;
        }

        var visible = c.state !== 'down';
        if (visible) {
          drawCrab(c, ci);
          c.vis = true;
          anyDrawn = true;
        } else if (c.vis) {
          hideCrab(ci);                       // once, not every frame
          c.vis = false;
          anyDrawn = true;
        }
      }

      if (anyDrawn) for (var k2 in R) R[k2].mesh.instanceMatrix.needsUpdate = true;
      if (pelletDirty) { mPellet.instanceMatrix.needsUpdate = true; pelletDirty = false; }
    }

    /* What a crab does while it is standing on the flat. */
    function surface(c, ci, dt) {
      var b = c.b;
      var dx = c.tgtX - c.x, dz = c.tgtZ - c.z;
      var dist = Math.sqrt(dx * dx + dz * dz);

      if (c.fleeing) {
        c.act = 'flee';
        if (dist < 0.10) { c.state = 'diving'; return; }
        step(c, dx / dist, dz / dist, FLEE * c.speed, dt);
        c.wave = Math.max(0, c.wave - dt * 4);
        c.scoop = 0;
        c.sifting = false;
        return;
      }

      /* Waving. Males only, and only within reach of the hole — the
         display is worth nothing to a crab that cannot dive when
         something answers it. */
      var exposure = Math.max(0, Math.min(1, (b.y - world.tide) / 0.5));
      var atHole = Math.abs(c.x - b.x) < 0.45 && Math.abs(c.z - b.z) < 0.45;

      if (c.waveLeft > 0) {
        c.act = 'wave';
        c.waveT += dt;
        var T = 1.0;
        var p = (c.waveT % T) / T;
        // up fast, down slower: the real display snaps out and unfurls back
        c.wave = p < 0.55 ? Math.sin(p / 0.55 * Math.PI * 0.5) : Math.cos((p - 0.55) / 0.45 * Math.PI * 0.5);
        if (c.waveT >= T) { c.waveT = 0; c.waveLeft--; if (c.waveLeft <= 0) c.wave = 0; }
        c.pause = 0.05;
        return;
      }
      if (c.male && atHole) {
        c.waveRest -= dt * (0.4 + 1.6 * exposure);
        if (c.waveRest <= 0) {
          c.waveLeft = 2 + Math.floor(rand() * 5);
          c.waveT = 0;
          c.waveRest = range(3, 9);
          return;
        }
      }

      /* ---- feeding, wired to the biofilm (§7, §28) ----
         Stand still, dip the small claw to the sand and sift, then move
         a little and do it again — a deposit feeder works its way
         outward from the hole and back. The animation was always this;
         what is new is that the sift now takes something off the film
         grid and gives a pellet back, so the sediment the crab is
         standing on is a finite thing it can use up.

         Grazing happens ONLY in here, inside the pause. A walking crab
         eats nothing, which is what keeps 84 of them from flattening a
         band that regrows at its slowest while they are out. */
      if (c.pause > 0) {
        c.act = 'sift';
        c.pause -= dt;
        c.scoopT += dt;
        c.scoop = 0.5 - 0.5 * Math.cos(c.scoopT * 6.5);

        var here = world.filmAt(c.x, c.z);
        if (here > BARE) world.grazeFilm(c.x, c.z, GRAZE_RATE * dt);
        // GOOD, not BARE: "worth staying for", not "not yet empty"
        c.fed += ((here > GOOD ? 1 : 0) - c.fed) * Math.min(1, 0.9 * dt);

        if (c.pause <= 0 && c.sifting) { dropPellet(c, ci); c.sifting = false; }
        return;
      }
      c.act = 'forage';
      c.scoop = Math.max(0, c.scoop - dt * 3);

      if (dist < 0.09) {
        /* Rich sediment is worth working over; grit is not. Both ends
           of this feed back on the film: a crab that finds food stays
           and takes more of it, a crab that does not moves sooner and
           spreads its pressure. */
        c.pause = range(0.7, 2.1) * (0.62 + 0.76 * c.fed);
        c.sifting = true;
        pickPatch(c);
        return;
      }
      step(c, dx / dist, dz / dist, WALK * c.speed, dt);
    }

    /* ------------------------------------------------------------
       where to sift next (§28)

       Area-restricted search on a very short leash. Candidates are
       sampled inside the territory and the richest wins — but the
       territory is barely wider than one terrain node, so this is not
       really the animal choosing a patch. It is the animal choosing
       how far from its hole to risk being, and that is the term that
       matters: a crab whose ring is worked out pushes out to
       HUNGRY_REACH, further from the door than it would otherwise go.

       Which is the trade a real fiddler makes and the reason the
       burrow-fidelity story is worth telling: the crabs you see furthest
       out on the mud are the hungry ones, and they are the ones a rising
       tide or a mudskipper catches short.
       ------------------------------------------------------------ */
    function pickPatch(c) {
      var b = c.b;
      var reach = TERRITORY * (1 + (1 - c.fed) * (HUNGRY_REACH - 1));
      var bestX = b.x, bestZ = b.z, best = -1;
      /* A well-fed crab pots about near the door; a hungry one goes
         straight to the rim. Stretching `reach` alone was not enough to
         see — averaged over a circle it moved the animals 17 cm. The
         bias has to move with the hunger too. */
      var nearOdds = 0.10 + 0.30 * c.fed;
      for (var t = 0; t < TRIES; t++) {
        var ang = rand() * Math.PI * 2;
        var rad = reach * (rand() < nearOdds ? range(0, 0.35) : range(0.45, 1));
        var nx = b.x + Math.cos(ang) * rad;
        var nz = b.z + Math.sin(ang) * rad;
        if (world.waterAt(nx, nz) !== null) continue;      // never wade to feed
        var score = world.filmAt(nx, nz) - rad * 0.035;    // distance from the hole has a price
        if (score > best) { best = score; bestX = nx; bestZ = nz; }
      }
      c.tgtX = bestX; c.tgtZ = bestZ;
    }

    /* Move, and turn so the crab is walking SIDEWAYS along the travel
       line. Two headings satisfy that (it can lead with either side);
       take whichever is the smaller turn from where it is now, so it
       strafes left or right instead of spinning on the spot. */
    function step(c, ux, uz, spd, dt) {
      var d = spd * dt;
      c.x += ux * d;
      c.z += uz * d;
      c.y = world.heightAt(c.x, c.z);

      var yawA = Math.atan2(-uz, ux);
      var yawB = yawA + Math.PI;
      var dA = Math.abs(wrapPi(yawA - c.yaw)), dB = Math.abs(wrapPi(yawB - c.yaw));
      var want = dA <= dB ? yawA : yawB;
      c.strafe = dA <= dB ? 1 : -1;
      c.yaw += wrapPi(want - c.yaw) * Math.min(1, dt * 9);

      c.gait = (c.gait + d / STRIDE) % 1;
    }
    function wrapPi(a) {
      while (a > Math.PI) a -= Math.PI * 2;
      while (a < -Math.PI) a += Math.PI * 2;
      return a;
    }

    return {
      count: N,
      group: group,
      crabs: crabs,
      burrows: burrows,
      update: update,
      // how many are on the surface — the tide gauge could show this later
      surfaced: function () {
        var n = 0;
        for (var i = 0; i < N; i++) if (crabs[i].state !== 'down') n++;
        return n;
      },
      /* Tuning readout (§28). Band means hide local grazing, so this
         reports the film UNDER the animals and how many of them are
         finding anything — the two numbers the biofilm balance is
         actually judged on. */
      feeding: function () {
        var out = 0, sift = 0, fed = 0, film = 0, pel = 0;
        for (var i = 0; i < N; i++) {
          var c = crabs[i];
          pel += c.pellets;
          if (c.state === 'down') continue;
          out++;
          fed += c.fed;
          film += world.filmAt(c.x, c.z);
          if (c.act === 'sift') sift++;
        }
        return {
          out: out, sifting: sift, pellets: pel,
          fed: out ? fed / out : 0,
          filmUnder: out ? film / out : 0
        };
      }
    };
  }

  window.Crabs = { spawn: spawn, SCALE: S };
})();
