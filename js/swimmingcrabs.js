/* ============================================================
   swimmingcrabs.js — the swimming crab (roster item 1, "the mirror
   of the fiddler").

   crabs.js (§1, §6) IS INVERTED FOR THE SAME REASON THIS ONE IS, in
   the opposite direction. A fiddler crab is an air-breather living in
   a burrow: active while its column is dry, down the hole on the
   flood. A swimming crab is the ordinary marine animal that fiddler
   is the exception to — active while submerged, and it is the ebb
   that sends it under, burying flush in the sand with nothing but its
   eyes showing until the water comes back. Put the two on the same
   shore and the same falling tide that switches one off switches the
   other on, from underneath instead of from above — the same trick
   the little egret plays from the air (§30), a third demonstration of
   the one idea this whole build keeps returning to.

   WHAT DRIVES A CRAB, in priority order:
     1. is there water where it stands  — if not, bury, right there
     2. otherwise                       — swim, mostly; walk sometimes;
                                           strike at nothing, once in a
                                           while, at whatever it thinks
                                           it has found

   NO FIXED HOME. A fiddler's whole life revolves around one burrow it
   is never far from (crabs.js's TERRITORY). This animal has no hole to
   return to — it digs in wherever the tide catches it and digs out
   wherever the flood finds it — so there is no burrow mesh, no pellet
   field, no flee-to-the-door state. That absence is not a shortcut
   taken to save time; it is what "no fixed home" actually looks like
   in code, and it is most of why this is the cheapest animal left on
   the roster.

   THE PADDLE IS THE ANIMAL. Three of its four walking-leg pairs are
   ordinary crab legs, planted on the sand exactly like a fiddler's —
   crabs.js's two-link IK, unchanged, and swimmingcrabbody.js's legSeg
   / legTip are built by the same code as crabbody.js's own (see that
   file for why). The FOURTH pair is not: swimmingcrabbody.js's flat
   paddle blade, and while the animal is actually swimming that leg
   stops being planted on anything at all — `paddleStroke()` below
   poses it directly by ANGLE, a rowing cycle with a fast broadside
   power stroke and a slower feathered recovery, the same "three
   speeds are the animal" instinct the egret's freeze-then-strike
   plays on a different clock (egrets.js).

   NOTHING IS CAUGHT, same rule as every predator here (§30, §32, §35):
   the strike is a lunge with an open claw and nothing under it. What
   is modelled is the part that shows.

   BLUE, THE WHOLE ANIMAL. The first pass really did borrow crabbody.js
   wholesale — every limb, fiddler-orange included — on the theory
   that a shape shared with the fiddler and the hermit crab was cheap
   and a colour nobody had asked about yet was not worth a second
   palette. It was cheap and it was also wrong the moment the ask
   became "totally blue like the real animal": `instanceColor` only
   MULTIPLIES a baked vertex colour, and an orange base has almost no
   blue channel in it for a tint to bring out — no per-instance number
   was ever going to turn fiddler-orange legs blue. So
   swimmingcrabbody.js now carries its own copies of armSeg, clawPalm,
   both fingers, legSeg and legTip — same geometry-building code,
   *Portunus pelagicus* blue instead of fiddler orange — and only the
   small, dark eyestalks and eyes still come from crabbody.js, because
   nothing about recolouring those was ever going to be visible.

   RENDERING. Ten InstancedMeshes: carapace, eyestalks, eyes, arm
   segments, claw palms, both fingers, leg segments, ordinary leg tips
   and the paddle — eight of the ten from swimmingcrabbody.js's own
   blue kit, two borrowed from crabbody.js.
   ============================================================ */
(function () {
  'use strict';

  /* ---------- the knobs ---------- */
  var S = 0.42;                  // metres per body unit — carapace width. A real one is ~18-20 cm
  var COUNT = 36;
  var ZONE = [-0.15, 0.85];      // metres CD — the lagoon floor down to the sandbar
  var Z_RANGE = [26, 64];
  var SPACING = 2.4;

  var WALK = 0.30;               // m/s, crawling the bottom
  var SWIM = 1.15;                // m/s, paddling — nearly four times the walk
  var TURN = 2.6;                 // rad/s
  var STRIDE = 0.20;              // metres per walking-gait cycle

  var SWIM_SECS = [4, 11];        // how long one swim leg lasts before a fresh heading
  var WALK_SECS = [2, 6];
  var SWIM_ODDS = 0.72;           // this animal is a swimmer first, a walker second
  var LEG_LEN_SWIM = [4, 14];     // metres covered choosing a swim target
  var LEG_LEN_WALK = [1.2, 4];
  var ARRIVE_R = 0.35;

  var SWIM_LIFT = 1.05;           // body units off the sand while actually swimming
  var BOB = 0.05;                 // and a little rise and fall on the stroke cycle

  var STRIKE_ODDS = 0.28;          // chance of a strike on arriving somewhere new
  var STRIKE_OUT = 0.10;           // seconds — the lunge itself, too fast to watch happen
  var STRIKE_BACK = 0.30;          // and the recovery, which is not

  /* ---------- the paddle stroke ----------
     POWER_FRAC short, the rest long — a real portunid's stroke is a
     quick, forceful sweep back and a longer, feathered recovery
     forward, not a symmetrical oar cycle. Same asymmetric-timing
     instinct as the egret's stab (STAB_SECS / RECOVER_SECS,
     egrets.js) and the pen shell's shut-hard-open-slow valve
     (penshells.js) — everywhere on this shore, the fast half of a
     motion and the slow half are never split down the middle. */
  var PADDLE_HZ = 1.7;            // strokes per second while actively swimming
  var POWER_FRAC = 0.42;
  var SWEEP = 1.05;                // radians, the fore-aft arc of one stroke

  var BURY_SECS = 0.65;
  var EMERGE_SECS = 0.40;
  var BURY_DEPTH = 0.85;           // body units sunk when fully buried
  var SUBMERGE = 0.02;

  var seed = 61803;
  function rand() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
  function range(a, b) { return a + rand() * (b - a); }

  var UP = new THREE.Vector3(0, 1, 0);
  var FWD = new THREE.Vector3(0, 0, 1);

  /* ---------- body layout, in body units ----------
     Shared almost verbatim with crabs.js's own — a walking leg's hip
     offset does not care which species is swinging it. Only
     CARAPACE_Y drops, because this shell sits lower and flatter over
     its legs than the fiddler's domed one does. */
  var CARAPACE_Y = 0.24;
  var HIP = { x: 0.42, y: 0.28 };
  var HIP_Z = [0.24, 0.06, -0.14, -0.32];   // four leg pairs, front to back — index 3 carries the paddle
  var FOOT_X = 0.88;
  var FOOT_SPREAD = 1.15;
  var L_FEMUR = 0.34, L_TIBIA = 0.34, L_TIP = 0.20;
  var PADDLE_LEN = 0.30, PADDLE_WIDE = 0.30;
  var SHOULDER = { x: 0.40, y: 0.32, z: 0.30 };
  var STALK = { x: 0.12, y: 0.42, z: 0.30, len: 0.20 };
  var ARM = { merus: 0.30, carpus: 0.26, palm: 0.80, finger: 0.38 };
  var CLAW = CrabBody.CLAW;      // how the fingers hang and swing — see crabbody.js

  function spawn(scene, world) {
    var C = CrabBody.parts();                 // eyestalks and eyes only — see swimmingcrabbody.js
    var P = SwimmingCrabBody.parts();          // carapace, paddle, and the whole blue limb kit
    var mat = CrabBody.material();             // one shared material for every crab on the shore

    function onRock(x, z) {
      for (var i = 0; i < world.rocks.length; i++) {
        var r = world.rocks[i];
        var dx = r.x - x, dz = r.z - z;
        if (dx * dx + dz * dz < (r.r + 1.0) * (r.r + 1.0)) return true;
      }
      return false;
    }
    function legal(x, z) {
      if (!world.inSimArea(x, z)) return false;
      if (z < Z_RANGE[0] || z > Z_RANGE[1]) return false;
      var h = world.heightAt(x, z);
      if (h < ZONE[0] || h > ZONE[1]) return false;
      return !onRock(x, z);
    }

    var halfX = world.simArea.halfX - 8;
    var crabs = [];
    var guard = 0;
    while (crabs.length < COUNT && guard++ < COUNT * 500) {
      var x = range(-halfX, halfX);
      var z = range(Z_RANGE[0], Z_RANGE[1]);
      if (!legal(x, z)) continue;
      var clash = false;
      for (var si = 0; si < crabs.length; si++) {
        var o = crabs[si];
        if ((o.x - x) * (o.x - x) + (o.z - z) * (o.z - z) < SPACING * SPACING) { clash = true; break; }
      }
      if (clash) continue;
      crabs.push({
        x: x, y: world.heightAt(x, z), z: z, yaw: range(0, Math.PI * 2), strafe: 1,
        state: 'buried',
        act: 'buried',
        sink: 1,
        mode: 'swim', modeTimer: range(1, 6),
        tgtX: x, tgtZ: z,
        gait: rand(), paddlePhase: rand(),
        strikeT: 0, claw: 0,
        vis: false,
        speed: range(0.85, 1.15),
        size: range(0.82, 1.22)
      });
    }
    var N = crabs.length;

    var group = new THREE.Group();
    group.name = 'swimming-crabs';
    scene.add(group);

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
      stalk:    slots(C.eyestalk, 2),          // small and dark — no reason to redraw these blue
      eye:      slots(C.eye, 2),
      arm:      slots(P.armSeg, 4),
      palm:     slots(P.clawPalm, 2, true),
      pollex:   slots(P.pollex, 2),
      dactyl:   slots(P.dactyl, 2),
      leg:      slots(P.legSeg, 16),
      tip:      slots(P.legTip, 6),           // the three ordinary leg pairs, both sides
      paddle:   slots(P.paddle, 2)             // the fourth pair, both sides
    };

    var tint = new THREE.Color();
    for (var i = 0; i < N; i++) {
      /* Plain per-animal brightness, same spread every other species
         uses — the geometry itself is blue now (swimmingcrabbody.js),
         so there is no orange base left to correct for here. */
      var g = range(0.86, 1.12);
      tint.setRGB(g, g, g);
      for (var key in R) {
        for (var j = 0; j < R[key].per; j++) R[key].mesh.setColorAt(i * R[key].per + j, tint);
      }
    }
    for (var kc in R) if (R[kc].mesh.instanceColor) R[kc].mesh.instanceColor.needsUpdate = true;

    /* ---------- placement helpers — the fiddler's, unchanged ---------- */
    var xa = new THREE.Vector3(), ya = new THREE.Vector3(), za = new THREE.Vector3();
    var rya = new THREE.Vector3(), rza = new THREE.Vector3();
    var mPart = new THREE.Matrix4(), mBody = new THREE.Matrix4(), mOut = new THREE.Matrix4();
    var root = new THREE.Vector3(), dir = new THREE.Vector3(), tmp = new THREE.Vector3();
    var HIDE = new THREE.Matrix4().makeScale(0, 0, 0);

    function basis(m, r, d, len, thick, flat) {
      xa.copy(d).normalize();
      if (flat) {
        za.copy(FWD).addScaledVector(xa, -FWD.dot(xa));
        if (za.lengthSq() < 1e-6) za.copy(UP).addScaledVector(xa, -UP.dot(xa));
        za.normalize();
      } else {
        tmp.copy(Math.abs(xa.y) > 0.985 ? FWD : UP);
        za.crossVectors(xa, tmp).normalize();
      }
      ya.crossVectors(za, xa).normalize();
      m.makeBasis(xa.multiplyScalar(len), ya.multiplyScalar(thick), za.multiplyScalar(thick));
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
    /* An explicit ROLL on top of an auto-derived right-handed basis —
       ya/za come from the same cross-product construction `basis()`
       uses (always right-handed, whatever `d` is), and are then
       rotated TOGETHER about the length axis, which is a proper
       rotation and cannot flip handedness the way picking three fixed
       axes by hand can (§35's oyster/mussel hinge bug — see
       ROSTER.md). This is what lets the paddle feather through a
       stroke without ever silently mirroring itself. */
    function putBasisRoll(rec, slot, r, d, len, thick, roll) {
      xa.copy(d).normalize();
      tmp.copy(Math.abs(xa.y) > 0.985 ? FWD : UP);
      za.crossVectors(xa, tmp).normalize();
      ya.crossVectors(za, xa).normalize();
      var cr = Math.cos(roll), sr = Math.sin(roll);
      rya.copy(ya).multiplyScalar(cr).addScaledVector(za, sr);
      rza.copy(ya).multiplyScalar(-sr).addScaledVector(za, cr);
      mPart.makeBasis(xa.clone().multiplyScalar(len), rya.multiplyScalar(thick), rza.multiplyScalar(thick));
      mPart.setPosition(r);
      mOut.multiplyMatrices(mBody, mPart);
      rec.mesh.setMatrixAt(slot, mOut);
    }
    function hide(rec, slot) { rec.mesh.setMatrixAt(slot, HIDE); }

    /* ---------- one cheliped ----------
       Both claws the same size — this animal has no display claw, so
       there is no MAJOR/MINOR split to draw, just one pose blended by
       `w`: 0 held ready and folded in, 1 lunged out in a strike. */
    var poseC = { merus: new THREE.Vector3(), carpus: new THREE.Vector3(), palm: new THREE.Vector3() };
    var jp = new THREE.Vector3(), hinge = new THREE.Vector3(), fdir = new THREE.Vector3(), fup = new THREE.Vector3();
    function clawPose(h, w, out) {
      out.merus.set(h * (0.50 + 0.16 * w), -0.25 + 0.20 * w, 0.78 - 0.34 * w);
      out.carpus.set(h * (-0.35 + 0.55 * w), -0.15 + 0.15 * w, 0.88 - 0.58 * w);
      out.palm.set(h * (-0.55 + 0.85 * w), -0.05 + 0.10 * w, 0.55 - 0.28 * w);
    }
    function cheliped(ci, side, w) {
      var armSlot = ci * 4 + (side > 0 ? 0 : 2);
      var clawSlot = ci * 2 + (side > 0 ? 0 : 1);
      clawPose(side, w, poseC);

      jp.set(side * SHOULDER.x, SHOULDER.y, SHOULDER.z);
      dir.copy(poseC.merus).normalize();
      put(R.arm, armSlot, jp, dir, ARM.merus, 1);
      jp.addScaledVector(dir, ARM.merus);

      dir.copy(poseC.carpus).normalize();
      put(R.arm, armSlot + 1, jp, dir, ARM.carpus, 0.95);
      jp.addScaledVector(dir, ARM.carpus);

      dir.copy(poseC.palm).normalize();
      put(R.palm, clawSlot, jp, dir, ARM.palm, 1, true);
      jp.addScaledVector(dir, ARM.palm * 0.94);

      // fingers, off the crabbody.js CLAW numbers — see the note there
      dir.copy(poseC.palm).normalize();
      hinge.crossVectors(dir, UP).normalize();
      fup.copy(UP).addScaledVector(dir, -UP.dot(dir));
      if (fup.lengthSq() < 1e-6) fup.copy(FWD).addScaledVector(dir, -FWD.dot(dir));
      fup.normalize();
      var rootOff = CLAW.ROOT * ARM.finger;
      root.copy(jp).addScaledVector(fup, -rootOff);
      put(R.pollex, clawSlot, root, dir, ARM.finger * CLAW.POLLEX, 0.95, true);
      root.copy(jp).addScaledVector(fup, rootOff);
      // a strike cracks the claw open as well as lunging it out
      fdir.copy(dir).applyAxisAngle(hinge, -CLAW.SHUT + Math.min(1, w * 1.6) * CLAW.OPEN);
      put(R.dactyl, clawSlot, root, fdir, ARM.finger, 1, true);
    }

    /* ---------- one ordinary walking leg ----------
       crabs.js's own two-link IK, unchanged, except the FOOT geometry
       is now a parameter — three of the four pairs still end in
       crabbody.js's `legTip`, but the fourth needs to end in this
       species' own paddle instead, and both have to come out of the
       same function or they would drift apart the moment either one
       was tuned. */
    var hipV = new THREE.Vector3(), ankle = new THREE.Vector3(), knee = new THREE.Vector3();
    var e1 = new THREE.Vector3(), e2 = new THREE.Vector3(), d2 = new THREE.Vector3();
    function leg(ci, segLi, side, zi, footX, footY, footZ, tipRec, tipSlot) {
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
      put(R.leg, ci * 16 + segLi * 2, hipV, dir, L_FEMUR, 1);

      dir.subVectors(ankle, knee).normalize();
      put(R.leg, ci * 16 + segLi * 2 + 1, knee, dir, L_TIBIA, 0.92);

      dir.set(footX - ankle.x, footY - ankle.y, footZ - ankle.z).normalize();
      put(tipRec, tipSlot, ankle, dir, L_TIP, 0.9);
    }

    /* ---------- the paddle stroke ----------
       Not IK — nothing here is planted on anything. `phase` 0..1 is
       one full stroke: a short, near-linear POWER sweep with the
       blade held broadside (feather 0, maximum resistance), then a
       longer RECOVERY that lifts the blade clear, twists it edge-on
       (feather -> 1) to cut drag, and carries it back to the start of
       the next power sweep. */
    var pd = { theta: 0, lift: 0, feather: 0 };
    function paddlePhase(p, out) {
      var power = p < POWER_FRAC;
      var t = power ? p / POWER_FRAC : (p - POWER_FRAC) / (1 - POWER_FRAC);
      var ease = t * t * (3 - 2 * t);
      out.theta = power ? (SWEEP - 2 * SWEEP * ease) : (-SWEEP + 2 * SWEEP * ease);
      out.lift = power ? 0 : Math.sin(t * Math.PI) * 0.32;
      out.feather = power ? 0 : Math.sin(t * Math.PI);
      return out;
    }
    function paddleStroke(ci, segLi, side, phase, padSlot) {
      paddlePhase(phase, pd);
      hipV.set(side * HIP.x, HIP.y, HIP_Z[3]);
      dir.set(side * 0.32, -0.55 + pd.lift, Math.sin(pd.theta) * 0.85).normalize();
      put(R.leg, ci * 16 + segLi * 2, hipV, dir, L_FEMUR, 1);
      root.copy(hipV).addScaledVector(dir, L_FEMUR);
      put(R.leg, ci * 16 + segLi * 2 + 1, root, dir, L_TIBIA, 0.92);
      root.addScaledVector(dir, L_TIBIA);
      putBasisRoll(R.paddle, padSlot, root, dir, PADDLE_LEN, PADDLE_WIDE, pd.feather * Math.PI * 0.5);
    }

    /* ------------------------------------------------------------
       draw one crab
       ------------------------------------------------------------ */
    var qy = new THREE.Quaternion();
    function drawCrab(c, ci) {
      var sc = S * c.size;
      var groundY = world.heightAt(c.x, c.z);
      var swimming = c.state === 'active' && c.mode === 'swim';
      var swimY = swimming ? (SWIM_LIFT + Math.sin(c.paddlePhase * Math.PI * 2) * BOB) * sc : 0;
      var buryY = -c.sink * BURY_DEPTH * sc;
      var y = groundY + swimY + buryY;

      qy.setFromAxisAngle(UP, c.yaw);
      mBody.compose(root.set(c.x, y, c.z), qy, tmp.set(sc, sc, sc));

      putCentred(R.carapace, ci, root.set(0, CARAPACE_Y, 0), 1);

      var s;
      for (s = 0; s < 2; s++) {
        var side = s === 0 ? 1 : -1;
        root.set(side * STALK.x, STALK.y, STALK.z);
        dir.set(side * 0.20, 1, 0.34).normalize();
        put(R.stalk, ci * 2 + s, root, dir, STALK.len, 1);
        putCentred(R.eye, ci * 2 + s, root.addScaledVector(dir, STALK.len), 1);
      }

      cheliped(ci, 1, c.claw);
      cheliped(ci, -1, c.claw);

      var walking = c.state === 'active' && c.mode === 'walk';
      for (var li = 0; li < 8; li++) {
        var lside = li < 4 ? 1 : -1;
        var zi = li % 4;

        if (zi === 3) {
          /* Full slot indices, `ci *` and all — leg()/paddleStroke() take
             whatever slot they are handed and write exactly that one, the
             same contract every put() call on this shore honours. Passing
             the bare 0/1 compact index here (no `ci * 2 +`) was the bug:
             every crab's paddle stroke landed on slot 0 or 1 of the SAME
             two slots, so crab 0 "won" and every other crab's paddle sat
             at the spawn-time HIDE matrix forever — found by decomposing
             a swimmer's own paddle instances and finding scale 0. */
          var padSlot = ci * 2 + (lside > 0 ? 0 : 1);
          if (swimming) { paddleStroke(ci, li, lside, c.paddlePhase, padSlot); continue; }
          var padTipX = walking ? lside * FOOT_X + (walkAlong(c, zi, lside)) : lside * FOOT_X * 0.55;
          var padTipY = walking ? walkLift(c, zi) : 0.30;
          var padTipZ = walking ? HIP_Z[zi] * FOOT_SPREAD : HIP_Z[zi] * FOOT_SPREAD * 0.5;
          leg(ci, li, lside, zi, padTipX, padTipY, padTipZ, R.paddle, padSlot);
          continue;
        }

        var tipIdx = ci * 6 + (lside > 0 ? 0 : 3) + zi;
        var footX, footY, footZ;
        if (walking) {
          footX = lside * FOOT_X + walkAlong(c, zi, lside);
          footY = walkLift(c, zi);
          footZ = HIP_Z[zi] * FOOT_SPREAD;
        } else if (swimming) {
          footX = lside * FOOT_X * 0.50; footY = 0.32; footZ = HIP_Z[zi] * FOOT_SPREAD * 0.45;
        } else {
          footX = lside * FOOT_X; footY = 0; footZ = HIP_Z[zi] * FOOT_SPREAD;
        }
        leg(ci, li, lside, zi, footX, footY, footZ, R.tip, tipIdx);
      }
    }
    function walkAlong(c, zi, lside) {
      var ph = (c.gait + (zi % 2) * 0.5 + (lside > 0 ? 0 : 0.25)) % 1;
      var swing = ph < 0.4, sp = swing ? ph / 0.4 : (ph - 0.4) / 0.6;
      return (swing ? (-1 + 2 * sp) : (1 - 2 * sp)) * 0.20 * c.strafe;
    }
    function walkLift(c, zi) {
      // lift does not depend on side, only gait phase
      var ph = (c.gait + (zi % 2) * 0.5) % 1;
      var swing = ph < 0.4, sp = swing ? ph / 0.4 : (ph - 0.4) / 0.6;
      return swing ? Math.sin(sp * Math.PI) * 0.16 : 0;
    }

    function hideCrab(ci) {
      hide(R.carapace, ci);
      var s;
      for (s = 0; s < 2; s++) { hide(R.stalk, ci * 2 + s); hide(R.eye, ci * 2 + s); }
      for (s = 0; s < 4; s++) hide(R.arm, ci * 4 + s);
      for (s = 0; s < 2; s++) { hide(R.palm, ci * 2 + s); hide(R.pollex, ci * 2 + s); hide(R.dactyl, ci * 2 + s); }
      for (s = 0; s < 16; s++) hide(R.leg, ci * 16 + s);
      for (s = 0; s < 6; s++) hide(R.tip, ci * 6 + s);
      for (s = 0; s < 2; s++) hide(R.paddle, ci * 2 + s);
    }

    for (i = 0; i < N; i++) hideCrab(i);
    for (var k0 in R) R[k0].mesh.instanceMatrix.needsUpdate = true;

    /* ------------------------------------------------------------
       where to go next — a straight leg of travel, longer while
       about to swim than while about to walk, exactly like the
       distinction egrets.js and moonsnails.js each draw between their
       own two gaits.
       ------------------------------------------------------------ */
    function pickTarget(c, forMode) {
      var range2 = forMode === 'swim' ? LEG_LEN_SWIM : LEG_LEN_WALK;
      for (var t = 0; t < 24; t++) {
        var a = rand() * Math.PI * 2, r = range(range2[0], range2[1]);
        var x = c.x + Math.cos(a) * r, z = c.z + Math.sin(a) * r;
        if (!legal(x, z)) continue;
        c.tgtX = x; c.tgtZ = z;
        return;
      }
      c.tgtX = c.x; c.tgtZ = c.z;
    }

    /* Sideways again — a portunid scuttles and paddles with its body
       square to the direction of travel exactly the way a fiddler
       walks (crabs.js's own step()), so the same "pick whichever
       heading is the smaller turn" solve carries over unchanged. */
    function stepTo(c, tx, tz, spd, dt) {
      var dx = tx - c.x, dz = tz - c.z;
      var d = Math.sqrt(dx * dx + dz * dz);
      if (d < 1e-4) return 0;
      var ux = dx / d, uz = dz / d;
      var mv = Math.min(d, spd * dt);
      c.x += ux * mv; c.z += uz * mv;

      var yawA = Math.atan2(-uz, ux), yawB = yawA + Math.PI;
      var dA = Math.abs(wrapPi(yawA - c.yaw)), dB = Math.abs(wrapPi(yawB - c.yaw));
      var want = dA <= dB ? yawA : yawB;
      c.strafe = dA <= dB ? 1 : -1;
      c.yaw += wrapPi(want - c.yaw) * Math.min(1, dt * TURN);

      c.gait = (c.gait + mv / STRIDE) % 1;
      return d - mv;
    }
    function wrapPi(a) {
      while (a > Math.PI) a -= Math.PI * 2;
      while (a < -Math.PI) a += Math.PI * 2;
      return a;
    }

    /* ------------------------------------------------------------
       what an active crab does
       ------------------------------------------------------------ */
    function active(c, dt) {
      if (c.strikeT > 0) {
        c.act = 'strike';
        c.strikeT -= dt;
        var total = STRIKE_OUT + STRIKE_BACK, backFrac = STRIKE_BACK / total;
        var into = c.strikeT / total;
        c.claw = into > backFrac ? 1 : into / backFrac;
        if (c.strikeT <= 0) c.claw = 0;
        return;
      }

      c.modeTimer -= dt;
      if (c.modeTimer <= 0) {
        c.mode = rand() < SWIM_ODDS ? 'swim' : 'walk';
        c.modeTimer = range((c.mode === 'swim' ? SWIM_SECS : WALK_SECS)[0],
                             (c.mode === 'swim' ? SWIM_SECS : WALK_SECS)[1]);
        pickTarget(c, c.mode);
      }
      c.act = c.mode;

      var spd = (c.mode === 'swim' ? SWIM : WALK) * c.speed;
      var left = stepTo(c, c.tgtX, c.tgtZ, spd, dt);
      if (left < ARRIVE_R) {
        if (rand() < STRIKE_ODDS) { c.strikeT = STRIKE_OUT + STRIKE_BACK; }
        pickTarget(c, c.mode);
      }

      c.paddlePhase = (c.paddlePhase + dt * PADDLE_HZ * (c.mode === 'swim' ? 1 : 0.3)) % 1;
    }

    /* ------------------------------------------------------------
       update
       ------------------------------------------------------------ */
    function update(dt) {
      var touched = false;
      for (var ci = 0; ci < N; ci++) {
        var c = crabs[ci];
        var wet = world.waterAt(c.x, c.z) !== null;

        switch (c.state) {
          case 'buried':
            c.act = 'buried';
            if (wet) { c.state = 'emerging'; c.sink = 1; }
            break;

          case 'emerging':
            c.act = 'emerging';
            c.sink -= dt / EMERGE_SECS;
            if (c.sink <= 0) {
              c.sink = 0; c.state = 'active'; c.mode = rand() < SWIM_ODDS ? 'swim' : 'walk';
              c.modeTimer = range(1, 3);
              pickTarget(c, c.mode);
            }
            break;

          case 'active':
            if (!wet) { c.state = 'burying'; c.strikeT = 0; c.claw = 0; break; }
            active(c, dt);
            break;

          case 'burying':
            c.act = 'burying';
            c.sink += dt / BURY_SECS;
            if (c.sink >= 1) { c.sink = 1; c.state = 'buried'; }
            break;
        }

        var visible = c.state !== 'buried';
        if (visible) {
          drawCrab(c, ci);
          c.vis = true;
          touched = true;
        } else if (c.vis) {
          hideCrab(ci);
          c.vis = false;
          touched = true;
        }
      }
      if (touched) for (var k2 in R) R[k2].mesh.instanceMatrix.needsUpdate = true;
    }

    return {
      count: N,
      group: group,
      crabs: crabs,
      update: update,
      // how many are up and about — 0 across a full ebb
      active: function () {
        var n = 0;
        for (var i2 = 0; i2 < N; i2++) if (crabs[i2].state === 'active') n++;
        return n;
      },
      swimming: function () {
        var n = 0;
        for (var i3 = 0; i3 < N; i3++) if (crabs[i3].state === 'active' && crabs[i3].mode === 'swim') n++;
        return n;
      }
    };
  }

  window.SwimmingCrabs = { spawn: spawn };
})();
