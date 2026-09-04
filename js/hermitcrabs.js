/* ============================================================
   hermitcrabs.js — the hermit crabs (BUILD_GUIDE §31).

   The species that fills the one empty row in the food web.
   SCAVENGERS has been an empty band in foodweb.js since §22: a
   labelled level with nothing standing on it. This is what goes
   there.

   THE SHELL IS THE BEHAVIOUR. Everything else on this shore is an
   animal reacting to the tide. This one reacts to a MARKET. Shells
   are a fixed, conserved resource — there are exactly as many on the
   plot at the end of a run as there were at the start — and every
   crab on the flat is either housed in one, walking toward a better
   one, or arguing with another crab over it.

     forage    working the wet sand for detritus and film
     seek      crossing to an empty shell it has spotted
     inspect   at the shell, turning it over. The pause is the beat
     fight     two crabs reached the same shell. The bigger one wins
     swap      out of the old, into the new. The one moment its soft
               abdomen is in the open — and the moment the old shell
               goes back on the market
     withdraw  the water has left. Pulled in, claw across the mouth

   CONSERVED, NOT SPAWNED. `shells` is one array built at spawn and
   never appended to. A shell is either held (holder = crab index) or
   lying free on the sand (holder = -1), and a swap is two writes to
   that field. That is what makes this a market and not a particle
   effect: a crab can only move up if some other crab left something
   behind, which is exactly the constraint real hermit crabs live
   under. Vacancy chains fall out of it for free — one big shell
   arriving on the flat can rehouse three crabs in a row.

   WHY IT NEVER SETTLES. Crabs grow (`need` creeps up), so a shell
   that fitted last tide is tight this one. Growth is what keeps the
   market liquid; the fit score is what decides who wants what.

   NO MORTALITY HERE EITHER (§30). A crab that reaches its adult size
   is retired and replaced by a juvenile, still holding the big shell
   it grew into — which it will then trade DOWN out of, and that swap
   is where the large shells re-enter the market. It is bookkeeping,
   not a death: it only ever happens to an animal already withdrawn and
   hidden inside its shell, so nothing pops.

   RENDERING. Nine InstancedMeshes. The shell mesh is indexed by
   SHELL, not by crab — free shells and carried ones are the same
   geometry in the same buffer, which is the whole reason a swap costs
   nothing to draw.
   ============================================================ */
(function () {
  'use strict';

  /* ---------- the knobs ---------- */
  var S = 0.30;                 // metres per body unit — shell length 1.0, so a ~3 cm shell
  var COUNT = 30;
  var SPARE = 16;               // empty shells lying on the flat at the start
  var ZONE = [0.6, 1.8];        // metres CD — the sand flat down to the lagoon edge
  var Z_RANGE = [-12, 40];
  var SPACING = 0.9;
  var COLONIES = 5;             // hermit crabs congregate — see the note at placement
  var COLONY_R = 5.5;           // metres across one colony

  var WALK = 0.16;              // m/s foraging
  var SEEK = 0.26;              // m/s with a shell in mind — a hermit crab in a hurry is a real sight
  var TURN = 2.4;               // rad/s
  var STRIDE = 0.22;            // metres per gait cycle

  var SCAN_R = 7.0;             // metres — how far it can spot an empty shell
  var SCAN_SECS = 1.4;          // it re-shops on a tick, not every frame
  var ARRIVE = 0.34;            // metres — close enough to start turning the shell over
  var INSPECT = [1.6, 2.8];     // seconds
  var FIGHT_SECS = 2.4;
  var SWAP_SECS = 1.2;
  var SNUB_SECS = 22;           // how long it remembers a shell it turned down
  var RIVAL_R = 1.6;            // metres — close enough to square up

  /* Fit. `need` is the crab; `size` is the shell. A shell smaller than
     the crab leaves its abdomen out, which is the thing a hermit crab
     will not tolerate, so that side of the curve is six times as steep
     as the other. Too big is only heavy. */
  var IDEAL = 1.18;
  var TIGHT_PENALTY = 6.0;
  var SHOP_AT = 0.09;           // discomfort it will walk across the flat to fix
  var WORTH_IT = 0.06;          // how much better a shell has to be before it swaps

  var GROW = 0.0016;            // need units per second — an adult in roughly four minutes
  var GRAZE_RATE = 0.018;       // film units per second while foraging (§7)
  var BARE = 0.06;

  var seed = 5150077;
  function rand() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
  function range(a, b) { return a + rand() * (b - a); }

  var UP = new THREE.Vector3(0, 1, 0);
  var FWD = new THREE.Vector3(0, 0, 1);

  /* Body layout, in body units, where 1.0 is a SHELL LENGTH. The limb
     figures are multiplied by `bodyScale` at draw time and the shell by
     the shell's own size, which is what makes a badly housed crab LOOK
     badly housed — a crab too big for its house has legs too long for
     it, and one rattling around in an outsized shell is visibly lost
     inside it.

     THE LIMBS ARE LAID OUT AGAINST THE SHELL, NOT AGAINST EACH OTHER.
     They were first written at about a third of this size and the
     screenshot was unambiguous: a full-length shell with a small
     orange knot of parts under its mouth. A fitted hermit crab sticks
     out of its shell by roughly its own shell's length, so the walking
     legs have to reach that far. */
  var APERTURE = { x: 0.02, y: 0.34 };        // where the animal comes out of its shell
  var SHELL_TILT = { x: -0.94, y: 0.34 };     // spire carried up and back
  /* Two visible pairs of walking legs; everything behind them is inside
     the shell, gripping it. Front and rear pairs get their own hip and
     foot positions — four legs at one x is a bundle, not a gait. */
  var HIP_X = [0.13, -0.02];
  var HIP = { y: 0.34, z: 0.17 };
  var FOOT_X = [0.62, 0.14];
  var FOOT_Z = [0.44, 0.52];
  var L_FEMUR = 0.50, L_TIBIA = 0.44, L_TIP = 0.26;
  var SHOULDER = { x: 0.17, y: 0.35, z: 0.16 };
  var ARM = { merus: 0.26, carpus: 0.21, palm: 0.42, finger: 0.21 };
  var MINOR = 0.62;                           // the left cheliped, the small one
  var CLAW = CrabBody.CLAW;                   // how the fingers hang and swing — see crabbody.js
  var STALK = { x: 0.25, y: 0.44, z: 0.17, len: 0.26 };   // z wide enough that the two eyes read as two

  /* need -> the scale its limbs are drawn at. Not the identity: `need`
     runs 0.42 to 1.10 and a juvenile drawn at 0.42 is a speck. The
     floor keeps every animal legible while the slope keeps the size
     difference between a juvenile and an adult worth reading. */
  function bodyScale(need) { return 0.50 + 0.70 * need; }

  function spawn(scene, world) {
    var C = CrabBody.parts();                 // the whole limb kit, borrowed wholesale
    var H = HermitBody.parts();
    var mat = Facet.material();

    var group = new THREE.Group();
    group.name = 'hermit-crabs';
    scene.add(group);

    function onRock(x, z) {
      for (var i = 0; i < world.rocks.length; i++) {
        var r = world.rocks[i];
        var dx = r.x - x, dz = r.z - z;
        if (dx * dx + dz * dz < (r.r + 0.6) * (r.r + 0.6)) return true;
      }
      return false;
    }

    var halfX = world.simArea.halfX - 6;
    function legalSpot(x, z) {
      var h = world.heightAt(x, z);
      return h >= ZONE[0] && h <= ZONE[1] && world.inSimArea(x, z) && !onRock(x, z);
    }
    // a legal spot within `spread` of (cx, cz), clear of everything placed
    function findSpot(others, spacing, cx, cz, spread) {
      for (var g = 0; g < 400; g++) {
        var a = range(0, Math.PI * 2), rr = Math.sqrt(rand()) * spread;
        var x = cx + Math.cos(a) * rr;
        var z = cz + Math.sin(a) * rr;
        if (!legalSpot(x, z)) continue;
        var clash = false;
        for (var i = 0; i < others.length; i++) {
          var o = others[i];
          if ((o.x - x) * (o.x - x) + (o.z - z) * (o.z - z) < spacing * spacing) { clash = true; break; }
        }
        if (clash) continue;
        return { x: x, z: z, y: world.heightAt(x, z) };
      }
      return null;
    }

    /* ---------- the shells ----------
       Built first, because a crab is defined by which one it is in.
       Sizes are spread deliberately wide: a flat where every shell is
       the same size has no market on it.

       AND THEY ARE PLACED IN COLONIES, which is a correction, not a
       flourish. Scattered evenly over a 280 m shore the population sat
       at one animal per hundred square metres, every crab was the only
       crab that could see any given shell, and over twenty tide cycles
       there was not a single shell fight — the species' most
       recognisable behaviour, modelled and never once fired. Real
       hermit crabs congregate, and it takes a crowd to make a market.
       Five colonies is what turns competition on. */
    var shells = [];
    var placed = [];
    var si, cl;
    var perColony = Math.ceil((COUNT + SPARE) / COLONIES);
    for (cl = 0; cl < COLONIES; cl++) {
      var cx = 0, cz = 0, ok = false;
      for (var t0 = 0; t0 < 500 && !ok; t0++) {
        cx = range(-halfX, halfX);
        cz = range(Z_RANGE[0], Z_RANGE[1]);
        ok = legalSpot(cx, cz);
      }
      if (!ok) continue;
      for (si = 0; si < perColony && shells.length < COUNT + SPARE; si++) {
        var sp = findSpot(placed, SPACING, cx, cz, COLONY_R);
        if (!sp) continue;
        placed.push(sp);
        shells.push({
          size: range(0.55, 1.35),
          x: sp.x, z: sp.z, y: sp.y,
          yaw: range(0, Math.PI * 2),
          roll: range(-0.5, 0.5),             // a free shell lies over on its side
          colX: cx, colZ: cz,                 // the colony it belongs to
          holder: -1
        });
      }
    }

    /* Hand the crabs the SMALL end of the range and leave the big ones
       on the sand, so the population opens under-housed and the first
       thing a visitor sees is shopping. */
    shells.sort(function (a, b) { return a.size - b.size; });

    var crabs = [];
    var nCrabs = Math.min(COUNT, Math.max(0, shells.length - 4));
    for (var ci = 0; ci < nCrabs; ci++) {
      var sh = shells[ci];
      sh.holder = crabs.length;
      crabs.push({
        x: sh.x, y: sh.y, z: sh.z,
        homeX: sh.colX, homeZ: sh.colZ,       // the colony it forages around
        yaw: range(0, Math.PI * 2),
        state: 'withdraw',
        shell: ci,
        need: sh.size / range(1.02, 1.35),    // most of them start a size behind
        maxNeed: range(0.72, 1.10),
        target: -1, rival: -1,
        snub: -1, snubT: 0,
        timer: 0, scan: range(0, SCAN_SECS),
        gait: rand(),
        sink: 1,                              // 1 fully withdrawn .. 0 fully out
        claw: 0,                              // 0 tucked .. 1 working
        size: 1
      });
    }
    var N = crabs.length, NS = shells.length;

    function slots(geo, count, shadow) {
      var m = new THREE.InstancedMesh(geo, mat, Math.max(count, 1));
      m.frustumCulled = false;
      m.castShadow = !!shadow;
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      group.add(m);
      return { mesh: m };
    }
    var R = {
      shell: slots(H.shell, NS, true),
      leg:   slots(C.legSeg, N * 8),
      tip:   slots(C.legTip, N * 4),
      arm:   slots(C.armSeg, N * 4),
      palm:  slots(C.clawPalm, N * 2, true),
      /* The dark-fingered variants (crabbody.js). A hermit crab's
         big claw is its DOOR — it plugs the shell mouth with it — and a
         horn-black one against a chalky shell reads at twice the range
         a pale one does. It is also what reference/crabclaw.jpg shows. */
      pollex: slots(C.pollexDark, N * 2),
      dactyl: slots(C.dactylDark, N * 2),
      stalk: slots(C.eyestalk, N * 2),
      eye:   slots(C.eye, N * 2)
    };

    /* Per-shell tint. Two shells side by side on the sand should not be
       the same shell twice — this is the population's only variation
       that a visitor can actually name. */
    var tint = new THREE.Color();
    for (si = 0; si < NS; si++) {
      var g2 = range(0.80, 1.18);
      tint.setRGB(g2 * range(0.97, 1.06), g2, g2 * range(0.90, 1.02));
      R.shell.mesh.setColorAt(si, tint);
    }
    var LIMBS = ['leg', 'tip', 'arm', 'palm', 'pollex', 'dactyl', 'stalk', 'eye'];
    for (ci = 0; ci < N; ci++) {
      var g3 = range(0.86, 1.14);
      tint.setRGB(g3 * range(0.98, 1.06), g3, g3 * range(0.93, 1.02));
      for (var li0 = 0; li0 < LIMBS.length; li0++) {
        var rec0 = R[LIMBS[li0]];
        var per0 = Math.max(1, Math.round(rec0.mesh.count / Math.max(1, N)));
        for (var j0 = 0; j0 < per0; j0++) rec0.mesh.setColorAt(ci * per0 + j0, tint);
      }
    }
    for (var kk in R) if (R[kk].mesh.instanceColor) R[kk].mesh.instanceColor.needsUpdate = true;

    /* ---------- placement helpers ---------- */
    var xa = new THREE.Vector3(), ya = new THREE.Vector3(), za = new THREE.Vector3();
    var mPart = new THREE.Matrix4(), mBody = new THREE.Matrix4(), mOut = new THREE.Matrix4();
    var root = new THREE.Vector3(), dir = new THREE.Vector3(), tmp = new THREE.Vector3();
    var qb = new THREE.Quaternion(), eul = new THREE.Euler();
    var HIDE = new THREE.Matrix4().makeScale(0, 0, 0);

    function basis(m, r, d, len, thick, flatFace) {
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
      m.makeBasis(xa.multiplyScalar(len), ya.multiplyScalar(thick), za.multiplyScalar(thick));
      m.setPosition(r);
    }
    function put(rec, slot, r, d, len, thick, flatFace) {
      basis(mPart, r, d, len, thick, flatFace);
      mOut.multiplyMatrices(mBody, mPart);
      rec.mesh.setMatrixAt(slot, mOut);
    }
    function putCentred(rec, slot, r, scl) {
      mPart.makeScale(scl, scl, scl);
      mPart.setPosition(r);
      mOut.multiplyMatrices(mBody, mPart);
      rec.mesh.setMatrixAt(slot, mOut);
    }
    function hide(rec, slot) { rec.mesh.setMatrixAt(slot, HIDE); }

    /* ------------------------------------------------------------
       drawing a shell

       Two cases, one geometry. A carried shell hangs off the crab's
       back at the aperture, tilted spire-up; a free one lies over on
       the sand with a roll to it, because a shell nobody is holding
       does not stand up neatly.
       ------------------------------------------------------------ */
    function drawShellFree(sh, idx) {
      var sc = S * sh.size;
      eul.set(sh.roll, sh.yaw - Math.PI * 0.5, 0.42, 'YZX');
      qb.setFromEuler(eul);
      mBody.compose(root.set(sh.x, sh.y + 0.26 * sc, sh.z), qb, tmp.set(sc, sc, sc));
      // the geometry is centred and unit-length, so an identity part is the whole shell
      mPart.identity();
      mOut.multiplyMatrices(mBody, mPart);
      R.shell.mesh.setMatrixAt(idx, mOut);
    }

    /* The carried shell, placed off the SAME body matrix as the limbs.
       `put` with a centred geometry positions its middle at r and runs
       its +X along d, so pointing d BACKWARDS is what swings the
       aperture round to the front, where the animal is. */
    function drawShellHeld(c, sh, idx) {
      var sz = sh.size;
      dir.set(SHELL_TILT.x, SHELL_TILT.y, 0).normalize();
      root.set(APERTURE.x + dir.x * 0.5 * sz,
               APERTURE.y * sz + dir.y * 0.5 * sz,
               0);
      put(R.shell, idx, root, dir, sz, sz * 0.98, false);
    }

    /* One leg: two-link IK from the hip to a planted foot, knee solved
       upward. Lifted from crabs.js, four legs instead of eight —
       everything behind the second pair is inside the shell hanging on
       to it, which is where a hermit crab's back legs actually are. */
    var hipV = new THREE.Vector3(), ankle = new THREE.Vector3(), knee = new THREE.Vector3();
    var e1 = new THREE.Vector3(), e2 = new THREE.Vector3(), d2 = new THREE.Vector3();
    function leg(ci2, li, side, pair, bs, footX, footY, footZ) {
      hipV.set(HIP_X[pair] * bs, HIP.y * bs, side * HIP.z * bs);
      ankle.set(footX, footY + L_TIP * bs * 0.92, footZ);

      d2.subVectors(ankle, hipV);
      var d = d2.length();
      var reach = (L_FEMUR + L_TIBIA) * bs * 0.985;
      if (d > reach) { d2.multiplyScalar(reach / d); d = reach; ankle.copy(hipV).add(d2); }
      if (d < 1e-4) d = 1e-4;

      e1.copy(d2).divideScalar(d);
      e2.copy(UP).addScaledVector(e1, -UP.dot(e1));
      if (e2.lengthSq() < 1e-6) e2.set(0, 0, 1); else e2.normalize();

      var lf = L_FEMUR * bs, lt = L_TIBIA * bs;
      var ca = (lf * lf + d * d - lt * lt) / (2 * lf * d);
      var a = Math.acos(Math.max(-1, Math.min(1, ca)));
      dir.copy(e1).multiplyScalar(Math.cos(a)).addScaledVector(e2, Math.sin(a));
      knee.copy(hipV).addScaledVector(dir, lf);
      put(R.leg, ci2 * 8 + li * 2, hipV, dir, lf, bs);

      dir.subVectors(ankle, knee).normalize();
      put(R.leg, ci2 * 8 + li * 2 + 1, knee, dir, lt, bs * 0.92);

      dir.set(footX - ankle.x, footY - ankle.y, footZ - ankle.z).normalize();
      put(R.tip, ci2 * 4 + li, ankle, dir, L_TIP * bs, bs * 0.9);
    }

    /* One cheliped: merus → carpus → palm → two fingers. The right one
       is the big one, and unlike the fiddler's it is not a billboard —
       it is the DOOR. A withdrawn hermit crab plugs its own aperture
       with it, which is what `seal` poses here. */
    var jp = new THREE.Vector3(), hinge = new THREE.Vector3(), fdir = new THREE.Vector3();
    var fup = new THREE.Vector3();
    function cheliped(ci2, side, big, bs, reachOut, seal, gape) {
      var sc = (big ? 1 : MINOR) * bs;
      var armSlot = ci2 * 4 + (big ? 0 : 2);
      var clawSlot = ci2 * 2 + (big ? 0 : 1);

      jp.set(SHOULDER.x * bs, SHOULDER.y * bs, side * SHOULDER.z * bs);

      /* Three poses blended by two numbers: tucked against the shell,
         reaching forward at the sand, and drawn back across the mouth
         of the shell. */
      var fx = 0.35 + reachOut * 0.75 - seal * 0.95;
      var fy = -0.15 - reachOut * 0.35 + seal * 0.55;
      var fz = side * (0.55 - reachOut * 0.25 - seal * 0.30);

      dir.set(fx, fy + 0.45, fz).normalize();
      put(R.arm, armSlot, jp, dir, ARM.merus * sc, sc);
      jp.addScaledVector(dir, ARM.merus * sc);

      dir.set(fx + 0.25, fy, fz * 0.7).normalize();
      put(R.arm, armSlot + 1, jp, dir, ARM.carpus * sc, sc * 0.95);
      jp.addScaledVector(dir, ARM.carpus * sc);

      dir.set(fx + 0.55, fy * 0.6, fz * 0.35).normalize();
      put(R.palm, clawSlot, jp, dir, ARM.palm * sc, sc, true);
      jp.addScaledVector(dir, ARM.palm * sc * 0.94);

      /* Fixed pollex low on the palm, movable dactyl hung high on it —
         the arrangement is crabs.js's and the numbers come from
         CrabBody.CLAW, so the two species cannot drift apart. */
      var lf = ARM.finger * sc;
      hinge.crossVectors(dir, UP).normalize();
      fup.copy(UP).addScaledVector(dir, -UP.dot(dir));
      if (fup.lengthSq() < 1e-6) fup.copy(FWD).addScaledVector(dir, -FWD.dot(dir));
      fup.normalize();

      var rootOff = CLAW.ROOT * lf;
      root.copy(jp).addScaledVector(fup, -rootOff);
      put(R.pollex, clawSlot, root, dir, lf * CLAW.POLLEX, sc * 0.95, true);
      root.copy(jp).addScaledVector(fup, rootOff);
      fdir.copy(dir).applyAxisAngle(hinge, -CLAW.SHUT + gape * CLAW.OPEN);
      put(R.dactyl, clawSlot, root, fdir, lf, sc, true);
    }

    function hideBody(ci2) {
      var s;
      for (s = 0; s < 8; s++) hide(R.leg, ci2 * 8 + s);
      for (s = 0; s < 4; s++) { hide(R.tip, ci2 * 4 + s); hide(R.arm, ci2 * 4 + s); }
      for (s = 0; s < 2; s++) {
        hide(R.palm, ci2 * 2 + s); hide(R.pollex, ci2 * 2 + s); hide(R.dactyl, ci2 * 2 + s);
        hide(R.stalk, ci2 * 2 + s); hide(R.eye, ci2 * 2 + s);
      }
    }

    /* ------------------------------------------------------------
       draw one crab

       THE -90 AGAIN (§20, §21, §27, §30). Parts are built along +X and
       `yaw` here is atan2(dx, dz), a +Z bearing, so the body Euler
       needs `yaw - PI/2`. Written in from the start this time.
       ------------------------------------------------------------ */
    function drawCrab(c, ci2) {
      var out = 1 - c.sink;
      var bs = bodyScale(c.need);               // limbs are sized by the ANIMAL, not by its house
      eul.set(0, c.yaw - Math.PI * 0.5, 0, 'YZX');
      qb.setFromEuler(eul);
      mBody.compose(root.set(c.x, c.y, c.z), qb, tmp.set(S, S, S));

      /* The shell it is wearing, if any. Mid-swap it is holding
         nothing, and that is the one moment the animal is naked on the
         sand — worth seeing, so nothing is drawn over it. */
      if (c.shell >= 0) drawShellHeld(c, shells[c.shell], c.shell);

      if (out < 0.03) {
        /* Withdrawn: NOTHING of the animal is drawn. Just the shell.

           An earlier pass kept the big claw out, jammed across the
           mouth — which is what the animal really does, and it looked
           wrong: a claw sitting proud of the aperture reads as a crab
           that has failed to get all the way in. The claw plugs the
           opening from INSIDE, so from any angle you can see the shell
           from, there is nothing showing. A shut hermit crab is a shell
           lying on the sand, and being indistinguishable from one is
           the entire point of the behaviour. */
        hideBody(ci2);
        return;
      }

      var moving = (c.state === 'forage' || c.state === 'seek');
      for (var li = 0; li < 4; li++) {
        var side = li < 2 ? 1 : -1;
        var pair = li % 2;
        // diagonal gait: opposite pairs on opposite sides swing together
        var ph = (c.gait + pair * 0.5 + (side > 0 ? 0 : 0.5)) % 1;
        var swing = ph < 0.4;
        var spn = swing ? ph / 0.4 : (ph - 0.4) / 0.6;
        var along = swing ? (-1 + 2 * spn) : (1 - 2 * spn);
        var lift = swing ? Math.sin(spn * Math.PI) * 0.16 * bs : 0;
        if (!moving) { along = 0; lift = 0; }
        leg(ci2, li, side, pair, bs,
          (FOOT_X[pair] + along * 0.20) * bs,
          lift,
          side * FOOT_Z[pair] * bs);
      }

      /* Eyestalks lean forward over the sand. A hermit crab's eyes are
         on the ground it is about to walk over, not on the sky. */
      for (var s = 0; s < 2; s++) {
        var sd = s === 0 ? 1 : -1;
        root.set(STALK.x * bs, STALK.y * bs, sd * STALK.z * bs);
        dir.set(0.86, 0.48, sd * 0.24).normalize();
        put(R.stalk, ci2 * 2 + s, root, dir, STALK.len * bs, bs);
        putCentred(R.eye, ci2 * 2 + s, root.addScaledVector(dir, STALK.len * bs), bs);
      }

      cheliped(ci2, 1, true, bs, c.claw, 0, c.claw * 0.75);
      cheliped(ci2, -1, false, bs, c.claw * 0.8, 0, c.claw * 0.5);
    }

    /* ------------------------------------------------------------
       the market

       `discomfort` is the whole economics of this species in four
       lines. Everything else — who shops, who fights, who settles for
       what it has — is that one number against a threshold.
       ------------------------------------------------------------ */
    function discomfort(shellSize, need) {
      var f = shellSize / need;
      if (f < 1) return (1 - f) * TIGHT_PENALTY;
      return Math.abs(f - IDEAL);
    }

    function shellDist2(c, sh) {
      var dx = sh.x - c.x, dz = sh.z - c.z;
      return dx * dx + dz * dz;
    }

    // the best free shell it can see that is worth crossing the flat for
    function shop(c) {
      var mine = c.shell >= 0 ? discomfort(shells[c.shell].size, c.need) : 99;
      if (mine < SHOP_AT) return -1;
      var best = -1, bestGain = WORTH_IT;
      for (var i = 0; i < NS; i++) {
        if (i === c.shell) continue;
        var sh = shells[i];
        if (sh.holder !== -1) continue;
        if (i === c.snub) continue;
        if (shellDist2(c, sh) > SCAN_R * SCAN_R) continue;
        var gain = mine - discomfort(sh.size, c.need);
        if (gain > bestGain) { bestGain = gain; best = i; }
      }
      return best;
    }

    // who else is walking at the same shell
    function rivalFor(ci2, target) {
      for (var j = 0; j < N; j++) {
        if (j === ci2) continue;
        if (crabs[j].target === target && crabs[j].state === 'seek') return j;
      }
      return -1;
    }

    function takeShell(c, ci2, idx) {
      var old = c.shell;
      if (old >= 0) {
        // the old one goes straight back on the market, where it stands
        var os = shells[old];
        os.holder = -1;
        os.x = c.x + Math.sin(c.yaw + 1.6) * 0.25;
        os.z = c.z + Math.cos(c.yaw + 1.6) * 0.25;
        os.y = world.heightAt(os.x, os.z);
        os.yaw = range(0, Math.PI * 2);
        os.roll = range(-0.6, 0.6);
      }
      shells[idx].holder = ci2;
      c.shell = idx;
    }

    /* Retirement (see the header). Only ever runs on an animal already
       shut inside its shell, so the substitution is never on screen. */
    function retire(c) {
      c.need = range(0.42, 0.60);
      c.maxNeed = range(0.72, 1.10);
      c.snub = -1;
      /* IT DOES NOT DROP THE SHELL, and the first version did — which
         left two or three crabs permanently homeless, wandering with a
         discomfort of 99 and nothing inside scanning range. A juvenile
         in a shell four times too big is the better model anyway: it is
         carrying a house it cannot use, its fit score is terrible, and
         it will trade DOWN at the first small shell it meets. That is
         how the big shells get back onto the flat — through an ordinary
         swap — and it is where a vacancy chain starts. */
    }

    /* ------------------------------------------------------------
       movement
       ------------------------------------------------------------ */
    function legal(x, z) {
      if (!world.inSimArea(x, z)) return false;
      var h = world.heightAt(x, z);
      if (h < ZONE[0] - 0.25 || h > ZONE[1] + 0.25) return false;
      return !onRock(x, z);
    }

    function steer(c, tx, tz, speed, dt) {
      var dx = tx - c.x, dz = tz - c.z;
      var dist = Math.hypot(dx, dz);
      if (dist < 1e-4) return 0;
      var want = Math.atan2(dx, dz);
      var da = want - c.yaw;
      while (da > Math.PI) da -= Math.PI * 2;
      while (da < -Math.PI) da += Math.PI * 2;
      c.yaw += Math.max(-TURN * dt, Math.min(TURN * dt, da));

      // it only gets up to speed once it is roughly pointed the right way
      var go = Math.min(speed * dt, dist) * (Math.abs(da) > 1.2 ? 0.25 : 1);
      var nx = c.x + Math.sin(c.yaw) * go;
      var nz = c.z + Math.cos(c.yaw) * go;
      if (legal(nx, nz)) {
        c.x = nx; c.z = nz;
        c.gait = (c.gait + go / (STRIDE * bodyScale(c.need))) % 1;
      } else {
        c.yaw += 1.9;
      }
      return dist;
    }

    // aimless working of the sand, kept inside the band and near the colony
    var STRAY = COLONY_R * 1.7;
    function wander(c, dt) {
      c.timer -= dt;
      if (c.timer <= 0) {
        c.timer = range(1.4, 4.2);
        var h = world.heightAt(c.x, c.z);
        var dx = c.homeX - c.x, dz = c.homeZ - c.z;
        /* Out of band, turn back into it. Down-shore is +z and up-shore
           -z, the convention world.js's transect uses. */
        if (h > ZONE[1]) c.yaw = Math.atan2(range(-0.4, 0.4), 1);
        else if (h < ZONE[0]) c.yaw = Math.atan2(range(-0.4, 0.4), -1);
        /* Strayed out of the colony: head back. Without this the five
           aggregations dissolve into an even scatter inside a few tide
           cycles and take the shell market with them. */
        else if (dx * dx + dz * dz > STRAY * STRAY) c.yaw = Math.atan2(dx, dz) + range(-0.5, 0.5);
        else c.yaw += range(-1.5, 1.5);
      }
      var go = WALK * dt;
      var nx = c.x + Math.sin(c.yaw) * go;
      var nz = c.z + Math.cos(c.yaw) * go;
      if (legal(nx, nz)) {
        c.x = nx; c.z = nz;
        c.gait = (c.gait + go / (STRIDE * bodyScale(c.need))) % 1;
      } else {
        c.yaw += 2.1;
        c.timer = range(0.6, 1.4);
      }
    }

    /* ------------------------------------------------------------
       update
       ------------------------------------------------------------ */
    function update(dt) {
      var ci2, c;

      for (ci2 = 0; ci2 < N; ci2++) {
        c = crabs[ci2];
        var surf = world.waterAt(c.x, c.z);
        var wet = surf !== null;

        if (c.snub >= 0) { c.snubT -= dt; if (c.snubT <= 0) c.snub = -1; }
        if (c.need < c.maxNeed) c.need = Math.min(c.maxNeed, c.need + GROW * dt);

        if (!wet) {
          /* The water has gone. Pull in, jam the big claw across the
             mouth and wait — the same answer the nerite and the conch
             give to the same problem, with different hardware. */
          if (c.state !== 'withdraw') {
            c.state = 'withdraw';
            c.target = -1;
            c.rival = -1;
          }
          c.sink = Math.min(1, c.sink + dt * 1.6);
          c.claw = Math.max(0, c.claw - dt * 2);
          if (c.sink >= 1 && c.need >= c.maxNeed) retire(c);
        } else {
          if (c.state === 'withdraw') { c.state = 'forage'; c.timer = range(0.3, 1.5); }
          c.sink = Math.max(0, c.sink - dt * 1.4);

          if (c.state === 'forage') {
            wander(c, dt);
            c.claw += ((0.55 + 0.35 * Math.sin(c.gait * Math.PI * 4)) - c.claw) * Math.min(1, 4 * dt);
            // scavenging: film, and whatever the last tide dropped on it (§7)
            if (world.filmAt(c.x, c.z) > BARE) world.grazeFilm(c.x, c.z, GRAZE_RATE * dt);
            c.scan -= dt;
            if (c.scan <= 0) {
              c.scan = SCAN_SECS * range(0.7, 1.3);
              var want = shop(c);
              if (want >= 0) { c.target = want; c.state = 'seek'; }
            }

          } else if (c.state === 'seek') {
            var sh2 = c.target >= 0 ? shells[c.target] : null;
            if (!sh2 || sh2.holder !== -1) { c.target = -1; c.state = 'forage'; }
            else {
              var d = steer(c, sh2.x, sh2.z, SEEK, dt);
              c.claw = Math.max(c.claw, 0.35);
              var riv = rivalFor(ci2, c.target);
              var rc = riv >= 0 ? crabs[riv] : null;
              if (rc && (rc.x - c.x) * (rc.x - c.x) + (rc.z - c.z) * (rc.z - c.z) < RIVAL_R * RIVAL_R) {
                c.state = 'fight'; c.rival = riv; c.timer = FIGHT_SECS;
                rc.state = 'fight'; rc.rival = ci2; rc.timer = FIGHT_SECS;
              } else if (d < ARRIVE) {
                c.state = 'inspect'; c.timer = range(INSPECT[0], INSPECT[1]);
              }
            }

          } else if (c.state === 'fight') {
            var r2 = c.rival >= 0 ? crabs[c.rival] : null;
            if (!r2 || r2.state !== 'fight' || r2.rival !== ci2) {
              c.state = c.target >= 0 ? 'seek' : 'forage'; c.rival = -1;
            } else {
              // square up, rap shells, and go nowhere
              var fx = r2.x - c.x, fz = r2.z - c.z;
              if (fx || fz) c.yaw = Math.atan2(fx, fz);
              c.claw = 0.8 + 0.2 * Math.sin(c.timer * 14);
              c.timer -= dt;
              if (c.timer <= 0) {
                /* Size settles it, as it does in the real thing: the
                   bigger animal has the bigger claw and the leverage. */
                var loser = c.need >= r2.need ? r2 : c;
                var winner = loser === c ? r2 : c;
                loser.snub = loser.target; loser.snubT = SNUB_SECS;
                loser.target = -1; loser.state = 'forage'; loser.rival = -1;
                winner.state = 'seek'; winner.rival = -1;
              }
            }

          } else if (c.state === 'inspect') {
            var sh3 = c.target >= 0 ? shells[c.target] : null;
            if (!sh3 || sh3.holder !== -1) { c.target = -1; c.state = 'forage'; }
            else {
              // turning it over: the claws work and the body rocks
              c.claw = 0.75 + 0.25 * Math.sin(c.timer * 9);
              c.yaw += Math.sin(c.timer * 6) * 0.9 * dt;
              c.timer -= dt;
              if (c.timer <= 0) {
                var mine2 = c.shell >= 0 ? discomfort(shells[c.shell].size, c.need) : 99;
                if (mine2 - discomfort(sh3.size, c.need) > WORTH_IT) {
                  c.state = 'swap'; c.timer = SWAP_SECS;
                } else {
                  // turned it down, and it will not come straight back to it
                  c.snub = c.target; c.snubT = SNUB_SECS;
                  c.target = -1; c.state = 'forage';
                }
              }
            }

          } else if (c.state === 'swap') {
            c.timer -= dt;
            c.claw = 0.25;
            /* Halfway through, the exchange happens. Before it the crab
               is still in the old shell; after it, in the new one — and
               the old shell is already back on the sand for whoever
               wants it next. */
            if (c.timer <= SWAP_SECS * 0.5 && c.target >= 0) {
              takeShell(c, ci2, c.target);
              c.target = -1;
            }
            if (c.timer <= 0) { c.state = 'forage'; c.timer = range(0.5, 1.6); }
          }
        }

        c.y = world.heightAt(c.x, c.z);
      }

      /* ---- draw ---- */
      for (ci2 = 0; ci2 < N; ci2++) drawCrab(crabs[ci2], ci2);
      for (var i2 = 0; i2 < NS; i2++) {
        var sh4 = shells[i2];
        if (sh4.holder === -1) { sh4.y = world.heightAt(sh4.x, sh4.z); drawShellFree(sh4, i2); }
      }
      for (var k2 in R) R[k2].mesh.instanceMatrix.needsUpdate = true;
    }

    // first frame: everyone shut in, every spare shell on the sand
    for (ci = 0; ci < N; ci++) hideBody(ci);
    update(0.0001);

    return {
      count: N,
      group: group,
      crabs: crabs,
      shells: shells,
      update: update,
      /* Which slots of a given mesh belong to one crab — for ui.js's
         hover glow (§34). Every other mesh here is indexed by crab and
         the generic rule finds it, but the SHELL mesh is indexed by
         shell: that is the whole reason a swap costs nothing to draw,
         and it is also why a hovered crab would otherwise light up its
         legs and not its house. Returning null means "use the generic
         rule"; an array means "these exact slots". */
      glowSlots: function (c, mesh) {
        if (mesh !== R.shell.mesh) return null;
        return c.shell >= 0 ? [c.shell] : [];
      },
      // how many are out of their shells and working
      active: function () {
        var n = 0;
        for (var i3 = 0; i3 < N; i3++) if (crabs[i3].state !== 'withdraw') n++;
        return n;
      },
      // shells lying on the sand right now — the market's supply side
      vacant: function () {
        var n = 0;
        for (var i4 = 0; i4 < NS; i4++) if (shells[i4].holder === -1) n++;
        return n;
      },
      // mean discomfort. 0 is a perfectly housed population
      housing: function () {
        var s3 = 0;
        for (var i5 = 0; i5 < N; i5++) {
          s3 += crabs[i5].shell >= 0 ? discomfort(shells[crabs[i5].shell].size, crabs[i5].need) : 3;
        }
        return N ? s3 / N : 0;
      }
    };
  }

  window.HermitCrabs = { spawn: spawn };
})();
