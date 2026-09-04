/* ============================================================
   horseshoecrabs.js — the mangrove horseshoe crabs (BUILD_GUIDE §38).

   The shore's only TIDAL COMMUTER, and the last of ROSTER.md's
   cheap-to-build items.

   Every other animal here has a band and stays in it. The fiddler
   works its patch of mudflat, the sand dollar ploughs its corner of
   the lagoon, the nerite lives on one boulder. This one has no band:
   it rides the flood up into the mangrove fringe, works the mud
   while the water is over it, and starts back down as soon as the
   water begins to leave. Where it is at any moment is a function of
   the tide and nothing else.

   IT USUALLY LOSES. This is the point, not a bug. The water on this
   shore falls at a speed no animal moving at ten centimetres a
   second can match, so most of the population is caught out on most
   ebbs — and a stranded horseshoe crab does exactly what a real one
   does: works itself down under the mud until only the rim of the
   carapace shows and waits for the next flood. The reason to model
   the commute at all is that its failures are what you actually see.

     plough   in water, moving. Steering is not a decision — see below
     work     stopped on mud worth turning over
     strand   the water has gone. It settles, buries, and waits

   IT KNOWS WHICH WAY THE TIDE IS GOING, AND IT HAS TO. The first
   version of this file steered on a depth error alone — head seaward
   when the water is too shallow, landward when it is too deep — on
   the theory that a commute would fall out of that one comparison
   with nothing in the code aware of the tide's direction. It is a
   nicer design and it does not survive contact with this shore.

   Measured over six tide cycles it produced DRIFT, not a commute:
   the population walked 20 m seaward and stopped going up into the
   mangrove fringe at all, because a depth band wide enough to be
   usable (0.4-1.1 m) covers forty metres of a flat this gently
   sloped, and the animal simply settles wherever that band is
   satisfied longest. Narrowing the band does not rescue it either —
   the waterline here crosses the flat at metres per second and
   nothing that walks can track an edge moving that fast.

   So it reads `world.tideDir` instead, and that turns out to be the
   more truthful animal anyway: horseshoe crabs are one of the
   textbook cases of an endogenous tidal clock, and a real one is not
   inferring the tide from how wet it is. Flooding, with water over
   it: work up-shore. Ebbing, with the water getting low: turn and go.
   Otherwise wander and feed.

   THE FURROW IS THE SPECIES. §28 made the fiddler's pellets the
   receipt for its feeding and §32 made the cucumber's casts the
   receipt for its; this animal's receipt is a TRAIL OF TURNED MUD,
   because it does not walk over the flat, it ploughs through the
   top centimetre of it. On a real Chek Jawa low tide the furrows
   are the thing people photograph — the animal is usually under the
   far end of one. So the furrow is laid PER METRE TRAVELLED rather
   than per second: it is a record of distance, and a crab that has
   stopped to feed should not pile up trench in one spot.

   RENDERING. Six InstancedMeshes. The two carapace plates and the
   telson are one instance per animal; the legs are ten; the eyes
   two; and the furrow is a ring buffer shared across the
   population, exactly as the sea cucumber's casts are (§32).
   ============================================================ */
(function () {
  'use strict';

  /* ---------- the knobs ---------- */
  var S = 0.30;                 // metres per body unit — prosoma 1.0 wide, a ~30 cm animal
  var COUNT = 12;               // big animals, and Chek Jawa's are not dense
  /* WHERE IT LIVES, AND HOW THAT WAS DECIDED.

     Not by picking a band — by measuring one. §1's roster asked for
     an animal that ploughs the MANGROVE FRINGE on the flood, and the
     first two tuning passes tried to put it there. Both failed, in
     opposite directions and for the same reason.

       spawned 1.55-2.95 m CD   12 of 12 stranded for a minute at a
       (in the fringe)          time, mean-z swing under 1 m. Dry too
                                much of the cycle to do anything.

       spawned 1.30-2.30 m CD   walked 20 m seaward over 6 cycles and
                                stayed there.

       spawned 1.75-2.45 m CD   walked 10 m seaward over 10 cycles and
                                was still going.

     Every run converges on the same place: about 1.8 m CD, the mid
     mudflat. That is not a tuning accident — two runs approaching it
     from OPPOSITE sides landing on one number is the "compare against
     a control, not against itself" discipline §32 asked for, and what
     it says is that 1.8 m is where a walker this slow can be in water
     often enough to commute at all.

     So the fringe pairing did not survive the tide model, and the
     honest version of this species is an UPPER MUDFLAT animal that
     commutes within it, living below the mangroves rather than under
     them. What actually decides the band is the pair of steering
     windows — see RETREAT below, which is where that arithmetic is
     written down. ZONE spawns them there so there is no opening
     transient; ROAM is the wider corridor they may travel through. */
  var ZONE = [1.80, 2.00];      // metres CD — the equilibrium the two windows set, see RETREAT
  var ROAM = [1.15, 3.02];      // the corridor it may travel through
  var Z_RANGE = [-38, -14];
  var SPACING = 3.2;

  var PLOUGH = 0.16;            // m/s. Slow, but ten times the sand dollar — it has ground to cover
  var TURN_RATE = 0.9;          // rad/s, how fast it can swing onto a new bearing
  var WANDER_SECS = [3, 9];
  var WORK_SECS = [5, 16];
  var MOVE_SECS = [8, 22];

  /* The two thresholds the commute runs on, and they are deliberately
     NOT a matched pair around one depth — see the header. RETREAT is
     high because this animal is slow and has to leave early; ADVANCE
     is low because any water at all is water it can work in. The gap
     between them is what stops it turning round every second frame,
     which is §32's BARE/SPENT/GOOD lesson in its other form. */
  var RETREAT = 0.60;           // ebbing and shallower than this — turn seaward while it still can
  var ADVANCE = 0.15;           // flooding and deeper than this — there is mud up there to work

  /* THESE TWO NUMBERS SET WHERE THE POPULATION LIVES, and it took
     three drifting runs to notice why. They are not a comfort range.
     They are the lengths of the two steering windows, and the band
     the population settles in is wherever those windows balance.

     For an animal sitting at height h, with the tide topping out at
     `high`:

       landward window   tide runs h+ADVANCE .. high   =  high - h - ADVANCE
       seaward window    tide runs h+RETREAT .. h      =  RETREAT

     The seaward one is a FIXED span of tide — it does not care where
     the animal is — while the landward one shrinks the higher up the
     shore it gets. So it walks up until the two are equal and then
     stays, which is h = high - (RETREAT + ADVANCE). Mean high water
     here is about 2.65 m CD, so 0.60 and 0.15 predict a band at 1.90;
     thirteen measured cycles sit at 1.85 and hold there.

     Raising RETREAT strands fewer animals and moves the whole
     population DOWN the shore. That trade is the knob; there is no
     setting that does both. */

  var BURY_SECS = 7.0;          // it works down slowly; this is not a sand star
  var STRAND_BURY = 0.62;       // how far under a stranded animal ends up — the rim still shows
  var TELSON_SECS = 6.5;        // one lever push against the mud, while stranded

  /* A FURROW IS A LINE, NOT A ROW OF TILES. The first pass laid a
     segment every 0.24 m at 0.78 body widths across and a fifth of a
     body unit proud of the mud, and photographed as a scatter of flat
     angular plates lying ON the flat — cardboard, not a trench. Three
     things fix it and all three matter: segments SHORTER than they
     are long so consecutive ones overlap into one continuous line,
     LOW enough that only the levee crest stands proud, and SUNK so
     the mud closes over the rest. */
  var FURROW_STEP = 0.17;       // metres of travel per segment laid
  var FURROWS_PER = 20;         // ring buffer — the visible length of one animal's trail
  var FURROW_W = 0.52;          // multiples of prosoma width
  var FURROW_H = 0.085;         // how far the levee stands proud, in body units

  var LEGS = 5;                 // pairs
  var STRIDE = 0.9;             // rad/s of leg phase per m/s of travel, scaled below

  var seed = 5150231;
  function rand() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
  function range(a, b) { return a + rand() * (b - a); }

  var UP = new THREE.Vector3(0, 1, 0);
  var FWD = new THREE.Vector3(1, 0, 0);

  /* How much a patch of mud is worth turning over.

     There is no infauna grid on this shore and building one for a
     single species would be a resource system nobody else reads —
     the biofilm grid exists because five grazers share it, and this
     animal eats worms and small clams, not film. A positional hash
     gives the only thing that is actually visible: some patches hold
     it for a while and some it walks straight through. Deterministic,
     so the same patch is always the good one. */
  function richness(x, z) {
    var gx = Math.floor(x / 3.5), gz = Math.floor(z / 3.5);
    return Facet.hash(gx, gz, 613) * 0.75 + Facet.hash(gx * 2, gz * 2, 907) * 0.25;
  }
  var WORTH = 0.55;             // rich enough to stop on

  function spawn(scene, world) {
    var P = HorseshoeBody.parts();
    var mat = HorseshoeBody.material();

    var group = new THREE.Group();
    group.name = 'horseshoe-crabs';
    scene.add(group);

    function onRock(x, z) {
      for (var i = 0; i < world.rocks.length; i++) {
        var r = world.rocks[i];
        var dx = r.x - x, dz = r.z - z;
        if (dx * dx + dz * dz < (r.r + 1.1) * (r.r + 1.1)) return true;
      }
      return false;
    }
    function legal(x, z) {
      if (!world.inSimArea(x, z)) return false;
      if (z < Z_RANGE[0] - 14 || z > Z_RANGE[1] + 10) return false;
      var h = world.heightAt(x, z);
      if (h < ROAM[0] || h > ROAM[1]) return false;
      return !onRock(x, z);
    }

    var halfX = world.simArea.halfX - 10;
    var crabs = [];
    var guard = 0;
    while (crabs.length < COUNT && guard++ < COUNT * 500) {
      var x = range(-halfX, halfX);
      var z = range(Z_RANGE[0], Z_RANGE[1]);
      if (!legal(x, z)) continue;
      var h0 = world.heightAt(x, z);
      if (h0 < ZONE[0] || h0 > ZONE[1]) continue;
      var clash = false;
      for (var ci = 0; ci < crabs.length; ci++) {
        var o = crabs[ci];
        if ((o.x - x) * (o.x - x) + (o.z - z) * (o.z - z) < SPACING * SPACING) { clash = true; break; }
      }
      if (clash) continue;
      crabs.push({
        x: x, y: h0, z: z,
        yaw: range(0, Math.PI * 2),
        state: 'plough',
        bury: 0,
        pitch: 0,                          // nose-down while ploughing
        tailPitch: range(-0.15, 0.05),
        tailT: range(0, TELSON_SECS),
        gait: range(0, Math.PI * 2),
        timer: range(0, MOVE_SECS[1]),
        wander: range(0, WANDER_SECS[1]),
        wanderYaw: 0,
        moved: 0,                          // metres since the last furrow segment
        legAmp: 0,                         // leg swing amplitude, driven by travel
        fur: 0, furs: 0,                   // ring-buffer write slot, and how many are out
        size: range(0.82, 1.20)
      });
    }
    var N = crabs.length;

    function slots(geo, per, shadow) {
      var m = new THREE.InstancedMesh(geo, mat, Math.max(N * per, 1));
      m.frustumCulled = false;
      m.castShadow = !!shadow;
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      group.add(m);
      return { mesh: m, per: per };
    }
    var R = {
      prosoma: slots(P.prosoma, 1, true),
      opistho: slots(P.opistho, 1, true),
      telson:  slots(P.telson, 1, true),
      legSeg:  slots(P.legSeg, LEGS * 2, false),
      eye:     slots(P.eye, 2, false)
    };

    /* The furrow field. One shared mesh for the whole population; the
       ring buffer alone is what keeps a trail a fixed length, with no
       fade and no clean-up pass (§32). */
    var mFur = new THREE.InstancedMesh(P.furrow, mat, Math.max(N * FURROWS_PER, 1));
    mFur.frustumCulled = false;
    mFur.receiveShadow = true;
    mFur.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    group.add(mFur);

    var tint = new THREE.Color();
    var i;
    for (i = 0; i < N; i++) {
      var g = range(0.86, 1.12);
      tint.setRGB(g * range(0.98, 1.06), g, g * range(0.92, 1.00));
      R.prosoma.mesh.setColorAt(i, tint);
      R.opistho.mesh.setColorAt(i, tint);
      R.telson.mesh.setColorAt(i, tint);
    }
    for (var kc in R) if (R[kc].mesh.instanceColor) R[kc].mesh.instanceColor.needsUpdate = true;
    // the furrow is sediment, not animal: its own, tighter spread
    for (i = 0; i < N * FURROWS_PER; i++) {
      var g2 = range(0.92, 1.08);
      tint.setRGB(g2, g2 * range(0.99, 1.03), g2 * range(0.96, 1.01));
      mFur.setColorAt(i, tint);
    }
    if (mFur.instanceColor) mFur.instanceColor.needsUpdate = true;

    /* ---------- placement helpers (the moonsnails.js idiom) ---------- */
    var xa = new THREE.Vector3(), ya = new THREE.Vector3(), za = new THREE.Vector3();
    var mPart = new THREE.Matrix4(), mBody = new THREE.Matrix4(), mOut = new THREE.Matrix4();
    var root = new THREE.Vector3(), dir = new THREE.Vector3(), tmp = new THREE.Vector3();
    var qb = new THREE.Quaternion(), eul = new THREE.Euler();
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
    function putCentred(rec, slot, r, sx, sy, sz) {
      mPart.makeScale(sx, sy === undefined ? sx : sy, sz === undefined ? sx : sz);
      mPart.setPosition(r);
      mOut.multiplyMatrices(mBody, mPart);
      rec.mesh.setMatrixAt(slot, mOut);
    }
    /* A furrow segment is laid in WORLD space, independent of whatever
       the animal is doing now — a receipt left behind, not a limb —
       so this skips the mBody multiply, exactly as §35's sand collar
       does. */
    function putWorldFlat(slot, px, py, pz, yaw, len, wide, high) {
      eul.set(0, yaw - Math.PI / 2, 0, 'YXZ');
      qb.setFromEuler(eul);
      mOut.compose(root.set(px, py, pz), qb, tmp.set(len, high, wide));
      mFur.setMatrixAt(slot, mOut);
    }

    var furDirty = false;
    function clearFur(slot) { mFur.setMatrixAt(slot, HIDE); furDirty = true; }
    for (i = 0; i < N * FURROWS_PER; i++) clearFur(i);
    mFur.instanceMatrix.needsUpdate = true;

    function dropFurrow(c, ci) {
      var slot = ci * FURROWS_PER + c.fur;
      c.fur = (c.fur + 1) % FURROWS_PER;
      if (c.furs < FURROWS_PER) c.furs++;
      var sc = S * c.size;
      // laid just behind the animal, and just below the mud surface so
      // only the turned levee stands proud of the flat
      var bx = c.x - Math.sin(c.yaw) * sc * 0.30;
      var bz = c.z - Math.cos(c.yaw) * sc * 0.30;
      // sunk so the mud closes over all but the crest of the levee
      var fy = world.heightAt(bx, bz) - sc * FURROW_H * 0.55;
      putWorldFlat(slot, bx, fy, bz, c.yaw,
        FURROW_STEP * 1.7, sc * FURROW_W, sc * FURROW_H);
      furDirty = true;
    }

    function hide(rec, si) {
      for (var j = 0; j < rec.per; j++) rec.mesh.setMatrixAt(si * rec.per + j, HIDE);
    }

    /* ------------------------------------------------------------
       draw

       Body axis is +X forward, so the body quaternion carries the
       usual `yaw - PI/2` correction (§20/§21/§27/§30) — written in
       from the start, as everything since §31 has been.
       ------------------------------------------------------------ */
    var LEG_X = [0.26, 0.15, 0.03, -0.09, -0.21];     // hip positions down the prosoma
    var LEG_Z = 0.13;
    var EYE_AT = 0.16, EYE_Z = 0.20;
    var OPI_AT = -0.46;                                // where the abdominal plate hinges
    var TAIL_AT = -0.58;

    function draw(c, ci) {
      var sc = S * c.size;
      var floorY = world.heightAt(c.x, c.z);
      // 0 = sitting on the mud, 1 = worked down until the rim is level with it
      var y = floorY + 0.055 * sc - c.bury * 0.085 * sc;

      eul.set(c.pitch, c.yaw - Math.PI / 2, 0, 'YXZ');
      qb.setFromEuler(eul);
      mBody.compose(root.set(c.x, y, c.z), qb, tmp.set(sc, sc, sc));

      putCentred(R.prosoma, ci, root.set(0, 0, 0), 1);

      /* The abdominal plate sits a little lower than the prosoma and
         hinges up a few degrees — one rigid joint, no animation:
         a horseshoe crab flexes this hinge when it rights itself and
         at no other time anyone will be watching. */
      putCentred(R.opistho, ci, root.set(OPI_AT, -0.018, 0), 1);

      // the telson runs aft, pitched by `tailPitch`
      dir.set(-Math.cos(c.tailPitch), Math.sin(c.tailPitch), 0);
      put(R.telson, ci, root.set(TAIL_AT, -0.005, 0), dir, 1, 1);

      // eyes on the ophthalmic ridges, matching horseshoebody's dome bumps
      for (var e = 0; e < 2; e++) {
        var sz = e ? 1 : -1;
        dir.set(0.22, 0.94, sz * 0.26);
        put(R.eye, ci, root.set(EYE_AT, 0.115, sz * EYE_Z), dir, 1, 1);
      }

      /* Legs. Angle-driven, not solved — see horseshoebody.js:legSeg
         for why. Each pair is half a cycle out of phase with the one
         in front, which is the metachronal wave a real one walks
         with, and the whole set stops dead when the animal does. */
      for (var li = 0; li < LEGS; li++) {
        for (var s2 = 0; s2 < 2; s2++) {
          var side = s2 ? 1 : -1;
          var ph = c.gait + li * 1.05 + (s2 ? Math.PI : 0);
          var swing = Math.sin(ph) * 0.16 * c.legAmp;
          var lift = Math.max(0, Math.cos(ph)) * 0.05 * c.legAmp;
          dir.set(swing, -0.86 + lift, side * 0.55);
          put(R.legSeg, ci * LEGS * 2 + li * 2 + s2,
            root.set(LEG_X[li], -0.030, side * LEG_Z), dir, 0.125, 0.8);
        }
      }
    }

    function step(c, dist) {
      var nx = c.x + Math.sin(c.yaw) * dist;
      var nz = c.z + Math.cos(c.yaw) * dist;
      if (!legal(nx, nz)) {
        // turn away from whatever it is and try again next frame
        c.yaw += 1.9;
        c.wander = Math.min(c.wander, 0.6);
        return 0;
      }
      c.x = nx; c.z = nz;
      return dist;
    }

    // steer toward a bearing at a limited rate — nothing here snaps round
    function steer(c, want, dt) {
      var d = want - c.yaw;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      var lim = TURN_RATE * dt;
      c.yaw += Math.max(-lim, Math.min(lim, d));
    }

    /* ------------------------------------------------------------
       update
       ------------------------------------------------------------ */
    function update(dt) {
      for (var ci = 0; ci < N; ci++) {
        var c = crabs[ci];
        var floorY = world.heightAt(c.x, c.z);
        var surf = world.waterAt(c.x, c.z);
        var depth = surf === null ? 0 : surf - floorY;
        var moving = 0;

        if (surf === null) {
          /* Left by the ebb. It stops, works itself down into the mud
             and waits — the state most of this population is in for
             most of a spring low, and the one you actually photograph. */
          c.state = 'strand';
          c.bury += (STRAND_BURY - c.bury) * Math.min(1, dt / BURY_SECS);
          c.pitch += (0 - c.pitch) * Math.min(1, dt * 1.5);

          /* The telson's real job: a stranded horseshoe crab levers
             against the mud with it. One slow push, then a rest. */
          c.tailT -= dt;
          if (c.tailT <= 0) c.tailT = TELSON_SECS * range(0.7, 1.4);
          var push = Math.max(0, Math.sin((1 - c.tailT / TELSON_SECS) * Math.PI * 2));
          c.tailPitch += (-0.05 - push * 0.42 - c.tailPitch) * Math.min(1, dt * 2.2);
        } else {
          c.bury += (0 - c.bury) * Math.min(1, dt / (BURY_SECS * 0.6));
          c.tailPitch += (-0.10 - c.tailPitch) * Math.min(1, dt * 1.2);

          /* THE COMMUTE, in two lines. Bearing 0 is seaward and PI is
             landward (yaw is a +Z bearing, as everywhere on this
             shore). `world.tideDir` is +1 flooding, -1 ebbing. */
          var fleeing = world.tideDir < 0 && depth < RETREAT;
          var want = null;
          if (fleeing) want = 0;
          else if (world.tideDir > 0 && depth > ADVANCE) want = Math.PI;

          c.wander -= dt;
          if (c.wander <= 0) {
            c.wander = range(WANDER_SECS[0], WANDER_SECS[1]);
            c.wanderYaw = c.yaw + range(-1.1, 1.1);
          }
          steer(c, want === null ? c.wanderYaw : want, dt);

          var here = richness(c.x, c.z);
          c.timer -= dt;
          if (c.state === 'work') {
            /* It leaves when the patch is done or when the water it is
               standing in stops being water it can work — a feeding
               animal that ignores a falling tide is an animal that
               strands every cycle on purpose. */
            if (c.timer <= 0 || fleeing) {
              c.state = 'plough';
              c.timer = range(MOVE_SECS[0], MOVE_SECS[1]);
            }
          } else {
            c.state = 'plough';
            moving = step(c, PLOUGH * dt);
            /* It stops where the mud is worth stopping on — including
               part way up a flood run, because working the mud is what
               it goes up there FOR. The first version gated this on
               having no commute bearing at all, and measured out at 4%
               feeding against 34% walking: a deposit feeder that never
               fed. The one case where it will not stop is the one where
               it genuinely cannot afford to, which is a falling tide
               with the water already low. */
            if (!fleeing && here > WORTH) {
              c.state = 'work';
              c.timer = range(WORK_SECS[0], WORK_SECS[1]);
            } else if (c.timer <= 0) {
              c.timer = range(MOVE_SECS[0], MOVE_SECS[1]);
            }
          }

          // the front edge digs in while it is actually ploughing
          var wantPitch = c.state === 'plough' ? 0.085 : 0.02;
          c.pitch += (wantPitch - c.pitch) * Math.min(1, dt * 2.0);
        }

        /* The furrow is a record of DISTANCE. A crab that has stopped
           to feed lays none, however long it stands there. */
        if (moving > 0) {
          c.moved += moving;
          if (c.moved >= FURROW_STEP) { c.moved = 0; dropFurrow(c, ci); }
        }

        // legs run off travel, so they stop when the animal does
        c.legAmp = moving > 0 ? 1 : Math.max(0, (c.legAmp || 0) - dt * 3);
        c.gait += moving * STRIDE * 9;

        c.y = floorY;
        draw(c, ci);
      }

      R.prosoma.mesh.instanceMatrix.needsUpdate = true;
      R.opistho.mesh.instanceMatrix.needsUpdate = true;
      R.telson.mesh.instanceMatrix.needsUpdate = true;
      R.legSeg.mesh.instanceMatrix.needsUpdate = true;
      R.eye.mesh.instanceMatrix.needsUpdate = true;
      if (furDirty) { mFur.instanceMatrix.needsUpdate = true; furDirty = false; }
    }

    update(0.0001);

    return {
      count: N,
      group: group,
      crabs: crabs,
      update: update,
      // how many the ebb has caught out — the low-tide picture
      stranded: function () {
        var n = 0;
        for (var i2 = 0; i2 < N; i2++) if (crabs[i2].state === 'strand') n++;
        return n;
      },
      // furrow segments on the mud right now — the trail the population has laid
      furrowCount: function () {
        var n = 0;
        for (var i3 = 0; i3 < N; i3++) n += crabs[i3].furs;
        return n;
      }
    };
  }

  window.HorseshoeCrabs = { spawn: spawn };
})();
