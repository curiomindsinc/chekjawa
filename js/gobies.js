/* ============================================================
   gobies.js — the sand goby (BUILD_GUIDE §40).

   THIS IS A DEBT BEING PAID, NOT A NEW SPECIES. §21 built a goby and
   §24 replaced it with the mudskipper at the user's request. That was
   the right call for the mudskipper and it broke §5: the pool finder
   in world.js exists to prove that a draining shore leaves water
   behind in basins, and the proof was a fish stuck in one. A
   mudskipper cannot be stuck — it walks out — so from §24 to here
   nothing on this shore has been trapped by anything, and there has
   been NO MORTALITY ANYWHERE IN THE SIM.

   So this species arrives ALONGSIDE the mudskipper and never as a
   replacement, and it is the deliberate decision the roster asked for:
   the first animal on this shore that can die.

   ------------------------------------------------------------------
   WHAT A REAL GOBY DOES, AND WHICH HALF OF IT THIS IS

   Intertidal gobies split into two strategies and they are usually
   different species:

     POOL RESIDENTS   Bathygobius and friends. They do not leave on the
                      ebb at all — the pool IS home, and they ride out
                      low water in it. The famous one memorises the
                      pool layout while swimming over it at high tide
                      and then jumps between pools BLIND at low water.
     TIDAL TRANSIENTS Most sand- and mudflat gobies. Up onto the flat
                      on the flood to feed, back to the channel on the
                      ebb. They follow the water.

   This animal is a TRANSIENT WITH A POOL FALLBACK, which is the
   combination that actually produces the §5 demonstration. A pure
   transient always escapes and nothing is ever trapped. A pure
   resident is never in danger, because it is at home. What strands a
   fish is being CAUGHT OUT — and that is what is modelled here.

   ------------------------------------------------------------------
   THE TRAP IS EMERGENT, AND THAT IS THE NICEST THING IN THIS FILE

   Nothing below ever decides to trap a fish. The retreat is triggered
   by ONE reading: how deep the water is where the fish is standing,
   from `world.waterAt` — and waterAt returns the POOL RIM inside a
   pool (world.js, §3). So:

     a fish on the open flat  sees its depth falling with the tide,
                              breaks off feeding, and walks down the
                              gradient with the water. It lives.
     a fish inside a pool     sees a perfectly good depth, because the
                              basin is holding its water. It has no
                              reason to leave, so it does not, and the
                              sea goes without it.

   That is exactly why real pools catch real fish, and it fell out of
   calling the one lookup §3 says to call. Do not add a "get trapped"
   branch; there isn't one, and there should not be.

   ------------------------------------------------------------------
   A POOL IS REFUGE, NOT SAFETY. Three things can still happen in one:

     THE POOL GOES BAD    `stress` runs while a pool is cut off, and it
                          runs FASTER IN A SMALL POOL — a few square
                          metres of water in the sun heats,
                          deoxygenates and turns salty within one low,
                          and a big one does not. This is the first
                          thing on the shore that makes pool AREA mean
                          something. Full stress and the fish gives up
                          on that basin and goes over the side.
     IT JUMPS             Bathygobius's leap, and the one piece of pure
                          spectacle here. Over the rim, an arc through
                          the air, into a neighbouring pool it knows
                          about from high water. It is the best-
                          documented behaviour in intertidal fish and it
                          costs one state.
     THE EGRET            §30's bird wades a hand's depth of water and
                          works exactly this band on exactly this tide.
                          A fish in a pool at low water is a fish in a
                          bird's dish, and this is the wiring that
                          finally lets the strike connect. See THE
                          EGRET below.

   And out of the water there is the stranding clock, which is a RACE
   and not a sentence: the flood catches most of them. `rescues`
   counts the ones it reaches in time, and that number should be the
   larger one.

   ------------------------------------------------------------------
   THE EGRET, AND WHY IT WORKS HERE WHEN IT FAILED IN §39

   The anemonefish was wired to dive from the egret and fired zero
   times in 600 seconds, because an egret wades in a hand's depth and
   that fish leaves below 0.30 m of water: the two windows never
   overlap. §39's rule is to check the two species' own constants
   against each other before writing the scan, so:

     egret HUNT_BAND        0.9 – 2.3 m CD, worked while DRAINED
     tide pools             the sand-flat band is 1.0 – 1.6 m CD
                            (world.js PROFILE, z −4 .. 22)
     a pool is cut off      only once the sea is below its rim, i.e.
                            below 1.0 – 1.6 m

   The bird's hunting ground and the trapped fish's pool are the same
   ground at the same stage of the same tide. They overlap on every
   tide that drops far enough to isolate a pool, which is most of
   them. This is the opposite case to §39 and it is why the goby, not
   the anemonefish, is the species that gets an egret wired to it.

   It PULLS rather than being pushed (§32, §39): this file looks for
   birds, egrets.js is not told about fish. And the kill is tied to
   the bird's own `stab` — the fish is taken during the strike
   animation that is already on screen, so the death is something you
   watch rather than a counter going up.

   ------------------------------------------------------------------
   MORTALITY AND BOOKKEEPING. One-in-one-out on a fixed COUNT: a dead
   fish's slot goes empty for RECRUIT_SECS and then comes back as a new
   animal swimming in from the channel. No arrays grow, no meshes are
   reallocated, and the population is a constant — which is what stops
   "the shore now has deaths in it" from turning into a population
   model nobody asked for.

   STATES
     forage   working the bottom, water is fine
     rest     sat on the sand on its pelvic disc — the goby posture
     retreat  depth falling, following the water down the gradient
     pooled   cut off in a tide pool
     jump     over the rim, mid-air, heading for the next pool
     strand   out of water, on its side, the clock running
     dead     hidden; the slot is waiting for a recruit

   RENDERING. Eight InstancedMeshes: body, eyes (2), pelvic disc, tail,
   two dorsals, anal, pectorals (2).
   ============================================================ */
(function () {
  'use strict';

  /* ---------- the knobs ---------- */
  var S = 0.46;                 // metres per body unit — ~4x a real 11 cm goby, the
                                // same exaggeration the mudskipper carries at 0.62
  var COUNT = 90;
  var ZONE = [0.10, 1.75];      // metres CD — the sand flat, the lagoon and the channel.
                                // The TOP of this band is the interesting part: it is the
                                // pool ground, and it is the only place a fish gets caught.

  var CRUISE = 0.55;            // m/s pottering
  var DART = 1.70;              // m/s, the burst
  var RETREAT_SPD = 1.30;       // m/s following the water out — see THE WATERLINE OUTRUNS IT
  var TURN = 4.0;               // rad/s
  var CLEAR = 0.055;            // metres between belly and floor while swimming
  var SIT_CLEAR = 0.012;        // and while sat on the disc
  var SWIM_DEPTH = 0.07;        // metres of water it needs to swim rather than flop

  /* THE WATERLINE OUTRUNS IT, AND NO SWIM SPEED FIXES THAT. This
     sim runs a 6-hour ebb in 45 seconds. On the sand flat the ground
     falls about 0.022 m per metre, and the sea drops ~0.066 m/s, so
     the waterline crosses the flat at ~3 m/s — three times what a fish
     this size can do, at any tuning. The first pass triggered the
     retreat on ABSOLUTE depth (below 0.26 m) and 24 of 54 fish were
     high and dry within one tide, because by the time the water round
     a fish is shallow the water it needed to reach is already 60 m
     away.

     So the trigger is the FALLING, not the depth. A fish feels the
     water going long before it is shallow, and a real transient leaves
     on the turn rather than at the last minute. Retreating from the
     turn gives it the whole ebb instead of the last few seconds of it.

     AND THIS IS WHAT KEEPS THE POOL TRAP EMERGENT. `waterAt` returns
     a cut-off pool's rim, which does not move — so a fish in a pool
     measures a fall of exactly zero and has no reason to leave, while
     a fish in the open measures the sea going and follows it. One
     reading, opposite behaviour, no branch that knows about pools.
     Triggering on the tide's global direction instead would have told
     the pooled fish too, and there would be nothing left to trap. */
  var FALL_RATE = 0.010;        // m/s of local drop that starts a retreat
  var DEPTH_DT = 0.4;           // seconds between depth samples — the fall is measured, not guessed
  var EBB_DEPTH = 0.26;         // absolute backstop: this shallow and it goes regardless
  var OK_DEPTH = 0.42;          // and back to feeding above this, with the water steady
  var SCAN_R = 12;              // metres it can see water across when retreating
  var SCAN_N = 26;

  /* The other half of a transient, and the half the first pass left
     out. Retreat on its own is a RATCHET: every ebb pushes the
     population down the shore and nothing ever pushes it back, so
     within two tides every fish was parked in the channel and the
     shore never trapped another one. §38's rule — if a population
     drifts, find the decision that is running longer, do not move the
     band — and here the answer was that one of the two decisions had
     not been written. A real goby rides the flood UP to feed on
     ground that has just gone under, which is where the food is. */
  var FLOOD_R = 14;             // metres it will range up-shore on a flood
  var FEED_MIN = 0.15;          // it will not feed shallower than this
  var FEED_MAX = 0.90;          // nor bother going deeper than this to look

  var SIT_EVERY = [1.5, 5.0];   // seconds of swimming between sits
  var SIT_FOR = [1.2, 4.5];     // and how long it sits

  /* Pool life, tuned against the pools this terrain ACTUALLY has
     rather than against a guess. world.js's finder returns 28 of them,
     14–108 m², median 45, and the eight that matter — the ones on the
     sand flat at z −14..23 with rims 0.8–1.9 m — are 32 to 108 m².
     A basin is cut off for roughly 40 s of the 90 s cycle, so the
     numbers below are set to put the small end of that range over
     JUMP_AT inside one low and the big end comfortably outside it:

       20 m²   uneasy at 14 s, finished at 25 s
       45 m²   uneasy at 28 s — the median pool, on the edge
       108 m²  uneasy at 64 s, i.e. never within one low tide

     The first pass used 20 + 1.4/m², which put even a small pool's
     JUMP_AT at 38 s and fired the leap exactly zero times in 900
     seconds. A behaviour that never fires is not modelled (§31). */
  var POOL_BASE = 4;            // seconds of grace in any pool
  var POOL_PER_M2 = 1.05;       // plus this much per square metre of it
  var JUMP_AT = 0.55;           // stress at which it starts looking over the rim

  var JUMP_R = 9;               // metres it will leap across — it knows the layout from high water
  var JUMP_SECS = 0.55;         // launch to splashdown
  var JUMP_ARC = 0.55;          // metres of air at the top
  var JUMP_COOL = [3, 8];       // seconds before it will try another

  var STRAND_SECS = 26;         // seconds out of water before it dies. §21's number, and it is
                                // about a quarter of the 90 s tide cycle — a real race
  var FLOP_EVERY = [0.5, 1.9];  // seconds between flops while stranded
  var RECRUIT_SECS = [22, 60];  // before a dead fish's slot comes back as a new animal

  /* The bird. PANIC_R is what it reacts to, TAKE_R is what kills it,
     and the kill only lands during the bird's own strike. */
  var PANIC_R = 6.0;
  var TAKE_R = 2.6;
  var SCAN_SECS = 0.30;

  var seed = 90210;
  function rand() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
  function range(a, b) { return a + rand() * (b - a); }
  function pair(p) { return range(p[0], p[1]); }

  var AXIS_X = new THREE.Vector3(1, 0, 0);
  var UP = new THREE.Vector3(0, 1, 0);
  var FWD = new THREE.Vector3(0, 0, 1);

  /* ---------- body layout, in body units ----------
     Set against a broadside, like every other species here. The eye is
     the number that separates this animal from the mudskipper next
     door: that one puts its eyes ON TOP at z 0.035, this one puts them
     high on the SIDE of the head at z 0.062 — a bottom fish, not a
     periscope. */
  var EYE_AT = { x: 0.325, y: 0.072, z: 0.062 };
  var DISC_AT = { x: 0.130, y: -0.086 };          // the pelvic sucker, under the chest
  var D1 = { x: 0.130, len: 0.20, half: 0.105 };  // first dorsal, the little spiny flag
  var D2 = { x: -0.150, len: 0.32, half: 0.078 }; // second dorsal, long and low
  var ANAL = { x: -0.170, len: 0.27, half: 0.062 };
  var PECT_AT = { x: 0.200, y: -0.030, z: 0.078 };
  var PECT_LEN = 0.24, PECT_H = 0.20;
  var TAIL_AT = -0.470;
  var BODY_HALF = 0.105;                          // half-depth, for lying on its side

  function spawn(scene, world, opts) {
    var P = GobyBody.parts();
    var mat = GobyBody.material();
    opts = opts || {};
    /* Optional, like every wiring on this shore except the
       anemonefish's host. Without birds the fish simply never gets
       taken, and everything else still runs. */
    var egrets = opts.egrets || null;

    var group = new THREE.Group();
    group.name = 'gobies';
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
      disc:   slots(P.pelvicDisc, 1),
      tail:   slots(P.tailFin, 1),
      dors1:  slots(P.dorsalOne, 1),
      dors2:  slots(P.dorsalTwo, 1),
      anal:   slots(P.analFin, 1),
      pect:   slots(P.pectoralFin, 2)
    };

    /* ---------- the animals ---------- */
    var fish = [];
    var tint = new THREE.Color();
    var i, j;
    for (i = 0; i < COUNT; i++) {
      fish.push({
        x: 0, y: 0, z: 0,
        yaw: range(0, Math.PI * 2), pitch: 0, roll: 0,
        tgtX: 0, tgtZ: 0,
        state: 'forage',
        speed: 0,
        wag: rand(), fan: rand(),
        size: range(0.80, 1.20),
        vis: false,
        placed: false,

        pool: null,               // the pool it is cut off in, or null
        stress: 0,                // 0 fresh .. 1 this basin is finished
        dry: 0,                   // seconds out of water — the stranding clock
        flop: 0,                  // seconds to the next flop while stranded
        flopSide: 1,
        jump: 0,                  // 0..1 through a leap
        jumpFrom: { x: 0, z: 0 }, jumpTo: { x: 0, z: 0 },
        jumpCool: 0,
        sit: pair(SIT_EVERY),     // seconds until it sits down / gets up
        lastDepth: -1,            // the depth reading DEPTH_DT ago, AT lastX/lastZ — see the fall
        lastX: 0, lastZ: 0,
        depthT: range(0, DEPTH_DT),
        scan: range(0, SCAN_SECS),
        scared: 0,                // seconds left of bolting from a bird
        deadFor: 0,               // seconds left before this slot recruits again

        /* Per-animal lifetime tallies, summed by the accessors at the
           bottom. A behaviour that never fires is not modelled (§31) —
           these are how that gets checked over a long run. */
        strandings: 0, jumps: 0
      });
      var g = range(0.88, 1.14);
      tint.setRGB(g * range(0.98, 1.04), g, g * range(0.95, 1.02));
      for (var key in R) {
        for (j = 0; j < R[key].per; j++) R[key].mesh.setColorAt(i * R[key].per + j, tint);
      }
    }
    for (var kc in R) if (R[kc].mesh.instanceColor) R[kc].mesh.instanceColor.needsUpdate = true;

    // shore-wide tallies, for the long-run check
    var deaths = 0, taken = 0, driedOut = 0, rescues = 0, takenByOtter = 0;

    /* ---------- placement helpers — the crab's basis trick again ---------- */
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
      R.disc.mesh.setMatrixAt(fi, HIDE);
      R.tail.mesh.setMatrixAt(fi, HIDE);
      R.dors1.mesh.setMatrixAt(fi, HIDE);
      R.dors2.mesh.setMatrixAt(fi, HIDE);
      R.anal.mesh.setMatrixAt(fi, HIDE);
      for (var s = 0; s < 2; s++) {
        R.eye.mesh.setMatrixAt(fi * 2 + s, HIDE);
        R.pect.mesh.setMatrixAt(fi * 2 + s, HIDE);
      }
    }

    /* ------------------------------------------------------------
       draw

       THE ONE POSTURE THAT MATTERS IS THE STRANDED ONE, and it is the
       exact opposite of the mudskipper's. A mudskipper out of water is
       UPRIGHT, propped on its pectorals with its head up, because that
       is where it works. A goby out of water is ON ITS SIDE, because
       it is a fish that has run out of sea. The two animals share a
       shore and a family and they must never be confusable at fifty
       metres — this is the frame where that is decided.

       THE −90° RULE. The body is built along +X and `yaw` is a compass
       bearing off +Z, so the body Euler needs `yaw - PI/2`.
       ------------------------------------------------------------ */
    function draw(f, fi) {
      var sc = S * f.size;
      var stranded = f.state === 'strand';
      var airborne = f.state === 'jump';
      var arc = airborne ? Math.sin(f.jump * Math.PI) : 0;

      var pitch = f.pitch;
      if (airborne) pitch = Math.cos(f.jump * Math.PI) * 0.55;   // nose up out, nose down in

      var y = f.y + arc * JUMP_ARC;

      eul.set(f.roll, f.yaw - Math.PI * 0.5, pitch, 'YZX');
      qb.setFromEuler(eul);
      mBody.compose(root.set(f.x, y, f.z), qb, tmp.set(sc, sc, sc));

      putCentred(R.body, fi, root.set(0, 0, 0), 1);
      putCentred(R.disc, fi, root.set(DISC_AT.x, DISC_AT.y, 0), 1);

      var swim = Math.sin(f.wag * Math.PI * 2);
      /* Stranded, everything is either still or convulsing — there is
         no cruising effort to scale the fins by. */
      var effort = stranded ? 0 : (0.30 + Math.min(1, f.speed / CRUISE) * 0.70);
      var s;

      for (s = 0; s < 2; s++) {
        var side = s === 0 ? 1 : -1;
        putCentred(R.eye, fi * 2 + s, root.set(EYE_AT.x, EYE_AT.y, side * EYE_AT.z), 1);

        /* The pectorals FAN. A goby holding station on the bottom is
           working them constantly, so unlike the tail they never stop —
           and while it sits they are what is visibly holding it there. */
        var beat = Math.sin(f.fan * Math.PI * 2 + s * Math.PI) * (0.30 + effort * 0.55);
        if (stranded) beat = f.flopSide * 0.75;                 // splayed, not beating
        root.set(PECT_AT.x, PECT_AT.y, side * PECT_AT.z);
        dir.set(-0.30 - beat * 0.45, -0.15 - beat * 0.10, side * (0.92 - Math.abs(beat) * 0.15));
        put(R.pect, fi * 2 + s, root, dir.normalize(), PECT_LEN, PECT_H, false);
      }

      /* The vertical fins. A fin's LENGTH runs along the back and its
         HEIGHT stands off it, so it points +X and the blade's own Y is
         the height — the mistake that cost the goby a whole debugging
         pass in §21, written down here so it cannot cost a second one.

         The first dorsal is a FLAG: raised while the fish is up and
         swimming, clamped flat while it is stranded or bolting. */
      var flag = stranded ? 0.25 : (f.state === 'rest' ? 1.0 : 0.55 + effort * 0.35);
      root.set(D1.x - D1.len * 0.5, 0.070, 0);
      put(R.dors1, fi, root, AXIS_X, D1.len, D1.half * 2 * flag, true);

      root.set(D2.x - D2.len * 0.5, 0.062, 0);
      put(R.dors2, fi, root, AXIS_X, D2.len, D2.half * 2, true);

      root.set(ANAL.x - ANAL.len * 0.5, -0.058, 0);
      put(R.anal, fi, root, AXIS_X, ANAL.len, ANAL.half * 2, true);

      /* The tail. Wags to swim; mid-flop it is cocked hard over, which
         is the whole of what a stranded fish does with it. */
      var wagA = stranded ? f.flopSide * 0.95 * Math.max(0, f.flop) : swim * 0.55 * effort;
      root.set(TAIL_AT, 0, 0);
      dir.set(-Math.cos(wagA), 0, Math.sin(wagA));
      put(R.tail, fi, root, dir, 1, 1, true);
    }

    /* ------------------------------------------------------------
       reading the water

       Everything this species decides comes out of these three, and
       every one of them goes through world.waterAt — §3's seam, which
       is what makes the pool trap emergent rather than scripted.
       ------------------------------------------------------------ */
    function depthAt(x, z) {
      var surf = world.waterAt(x, z);
      if (surf === null) return -1;
      var d = surf - world.heightAt(x, z);
      return d > 0 ? d : 0;
    }

    /* Is the pool under this point CUT OFF from the sea? Same test the
       mudskipper uses (mudskippers.js) — a pool whose rim is above the
       tide is standing water with no way out of it. */
    function cutOffPool(x, z) {
      var p = world.poolAt(x, z);
      return (p && p.rimY > world.tide + 0.01) ? p : null;
    }

    /* The deepest water within reach. No seaward bias and none needed:
       while the sea is still close it is by far the deepest thing in
       the sample and wins on its own, and once it is out of range the
       best answer really is the nearest pool. That is a fish taking
       refuge, and it is the fallback this species is built around. */
    function pickWetter(f) {
      var bestX = f.x, bestZ = f.z, best = depthAt(f.x, f.z) - 0.02, found = false;
      for (var t = 0; t < SCAN_N; t++) {
        var a = range(0, Math.PI * 2), d = range(1.0, SCAN_R);
        var x = f.x + Math.sin(a) * d, z = f.z + Math.cos(a) * d;
        if (!world.inSimArea(x, z)) continue;
        var dep = depthAt(x, z);
        if (dep <= 0) continue;
        /* Nearer water of the same depth wins, so a fish does not swim
           past a perfectly good runnel to reach the sea. */
        var score = dep - Math.hypot(x - f.x, z - f.z) * 0.02;
        if (score > best) { best = score; bestX = x; bestZ = z; found = true; }
      }
      if (found) { f.tgtX = bestX; f.tgtZ = bestZ; return true; }

      /* NOTHING WET WITHIN REACH — head DOWNHILL. Water is always
         downhill on a shore, so the fallback needs no map. The
         mudskipper learned this the hard way (mudskippers.js) and the
         lesson is the same one: an animal that cannot find what it
         needs must still do SOMETHING, or it sits there failing
         silently. */
      var lowY = world.heightAt(f.x, f.z), lowX = f.x, lowZ = f.z, dropped = false;
      for (var q = 0; q < 8; q++) {
        var ang = (q / 8) * Math.PI * 2;
        var px = f.x + Math.sin(ang) * 7, pz = f.z + Math.cos(ang) * 7;
        if (!world.inSimArea(px, pz)) continue;
        var h = world.heightAt(px, pz);
        if (h < lowY) { lowY = h; lowX = px; lowZ = pz; dropped = true; }
      }
      if (dropped) { f.tgtX = lowX; f.tgtZ = lowZ; }
      return dropped;
    }

    /* UP THE SHORE, ONTO GROUND THAT HAS JUST GONE UNDER.

       The flood half of a tidal transient, and the one thing that stops
       the retreat from being a one-way ratchet. It is a single rule:
       of the water within reach, take the HIGHEST ground that still has
       enough over it to swim in. That is the flooding edge by
       definition — anything higher is dry and fails the depth test —
       so the population walks up the shore behind the water without
       ever being told which way up the shore is, and stops on its own
       at the waterline. Nothing here reads the tide.

       It is also what carries fish back over the pool ground every
       cycle, which is what makes the trap a recurring event rather
       than something that happens once at load and never again. */
    function pickUpshore(f) {
      var hHere = world.heightAt(f.x, f.z);
      var bestX = f.x, bestZ = f.z, best = -1e9, found = false;
      for (var t = 0; t < 18; t++) {
        var a = range(0, Math.PI * 2), d = range(2.0, FLOOD_R);
        var x = f.x + Math.sin(a) * d, z = f.z + Math.cos(a) * d;
        if (!world.inSimArea(x, z)) continue;
        var h = world.heightAt(x, z);
        if (h > ZONE[1]) continue;
        var dep = depthAt(x, z);
        if (dep < FEED_MIN || dep > FEED_MAX) continue;
        var score = (h - hHere) - Math.hypot(x - f.x, z - f.z) * 0.03 + range(0, 0.05);
        if (score > best) { best = score; bestX = x; bestZ = z; found = true; }
      }
      if (found) { f.tgtX = bestX; f.tgtZ = bestZ; return true; }
      return false;
    }

    /* A wander target inside the water it is already in. */
    function pickNear(f, radius) {
      for (var t = 0; t < 14; t++) {
        var a = range(0, Math.PI * 2), d = range(0.4, 1) * radius;
        var x = f.x + Math.sin(a) * d, z = f.z + Math.cos(a) * d;
        if (!world.inSimArea(x, z)) continue;
        if (depthAt(x, z) < SWIM_DEPTH) continue;
        var h = world.heightAt(x, z);
        if (h > ZONE[1] + 0.4) continue;
        f.tgtX = x; f.tgtZ = z;
        return true;
      }
      f.tgtX = f.x; f.tgtZ = f.z;
      return false;
    }

    /* ------------------------------------------------------------
       the leap

       Bathygobius's trick, and the reason a pool is not a dead end.
       The destination is a REAL neighbouring pool rather than a guess,
       because a real one has swum over this ground at high water and
       knows where the basins are — the memory is the documented half
       of the behaviour, and modelling the jump as a gamble would be
       modelling the wrong thing.
       ------------------------------------------------------------ */
    function findNextPool(f) {
      if (!world.pools || !world.pools.length) return null;
      var here = f.pool, best = null, bestScore = 0;
      for (var i2 = 0; i2 < world.pools.length; i2++) {
        var p = world.pools[i2];
        if (here && p.id === here.id) continue;
        if (p.rimY <= world.tide + 0.01) continue;          // that one has rejoined the sea
        var dx = p.cx - f.x, dz = p.cz - f.z;
        var dist = Math.hypot(dx, dz);
        if (dist > JUMP_R || dist < 0.5) continue;
        /* Worth the leap only if it is a BIGGER basin than the one it
           is leaving — a fish that hops between two dying puddles has
           gained nothing, and it would ping-pong forever. */
        if (here && p.area < here.area * 1.25) continue;
        var score = p.area - dist * 4;
        if (score > bestScore) { bestScore = score; best = p; }
      }
      return best;
    }

    function launchJump(f, to) {
      var dx = to.cx - f.x, dz = to.cz - f.z;
      var dist = Math.hypot(dx, dz);
      if (dist < 1e-3) return false;
      f.jumpFrom.x = f.x; f.jumpFrom.z = f.z;
      f.jumpTo.x = to.cx; f.jumpTo.z = to.cz;
      f.yaw = Math.atan2(dx / dist, dz / dist);
      f.jump = 0;
      f.state = 'jump';
      f.jumps++;
      f.jumpCool = pair(JUMP_COOL);
      return true;
    }

    /* ------------------------------------------------------------
       the bird

       PULL, not push (§32, §39): this file looks for egrets, and
       egrets.js has never heard of a goby. A fish only has to worry
       about one while it is stuck — a goby with water around it is
       gone long before the bird is in range, which is exactly why the
       kill needed a species that gets stuck.
       ------------------------------------------------------------ */
    function birdNear(f) {
      if (!egrets) return null;
      for (var bi = 0; bi < egrets.length; bi++) {
        var b = egrets[bi];
        if (b.state !== 'hunt') continue;
        var dx = b.x - f.x, dz = b.z - f.z;
        if (dx * dx + dz * dz < PANIC_R * PANIC_R) return b;
      }
      return null;
    }

    /* ------------------------------------------------------------
       moving
       ------------------------------------------------------------ */
    function steer(f, dt, want) {
      f.speed += (want - f.speed) * Math.min(1, dt * 3.5);
      var dx = f.tgtX - f.x, dz = f.tgtZ - f.z;
      var dist = Math.hypot(dx, dz);
      if (dist > 1e-4) {
        var wantYaw = Math.atan2(dx / dist, dz / dist);
        var d = wrapPi(wantYaw - f.yaw);
        var turn = TURN * dt;
        f.yaw += Math.abs(d) < turn ? d : (d > 0 ? turn : -turn);
      }
      var step = f.speed * dt;
      var nx = f.x + Math.sin(f.yaw) * step, nz = f.z + Math.cos(f.yaw) * step;
      /* It will not walk out of the water the way a mudskipper does.
         Leaving the water is what this animal is trying to avoid, and
         the ONE exception is a deliberate leap, which does not come
         through here. */
      if (world.inSimArea(nx, nz) && depthAt(nx, nz) >= SWIM_DEPTH * 0.6) {
        f.x = nx; f.z = nz;
      } else {
        f.speed *= 0.4;
        pickWetter(f);
      }
      return dist;
    }

    function floatY(f, dt, sc) {
      var floorY = world.heightAt(f.x, f.z);
      var surf = world.waterAt(f.x, f.z);
      var lo = floorY + CLEAR;
      var hi = surf === null ? lo : surf - 0.05;
      if (hi < lo) hi = lo;
      var want = Math.min(hi, lo + 0.05);
      f.y += (want - f.y) * Math.min(1, dt * 6);
    }

    /* ------------------------------------------------------------
       update
       ------------------------------------------------------------ */
    function update(dt) {
      var touched = false;

      for (var fi = 0; fi < COUNT; fi++) {
        var f = fish[fi];
        var sc = S * f.size;

        /* ---- a slot waiting for a recruit ---- */
        if (f.state === 'dead') {
          f.deadFor -= dt;
          if (f.deadFor <= 0 && recruit(f)) {
            f.vis = true;
            touched = true;
          } else {
            if (f.vis) { hideFish(fi); touched = true; }
            f.vis = false;
            continue;
          }
        }

        if (!f.placed) { if (!place(f)) { f.vis = false; continue; } }

        var floorY = world.heightAt(f.x, f.z);
        var surf = world.waterAt(f.x, f.z);
        var depth = surf === null ? -1 : surf - floorY;

        f.scan -= dt;
        var bird = null;
        if (f.scan <= 0) { f.scan = SCAN_SECS; bird = birdNear(f); }
        if (f.scared > 0) f.scared -= dt;
        if (f.jumpCool > 0) f.jumpCool -= dt;

        /* ---- mid-leap: nothing else applies ---- */
        if (f.state === 'jump') {
          f.jump += dt / JUMP_SECS;
          if (f.jump >= 1) {
            f.jump = 1;
            f.x = f.jumpTo.x; f.z = f.jumpTo.z;
            f.state = 'pooled';
            f.pool = cutOffPool(f.x, f.z);
            /* A bigger basin is not a fresh one, but it IS a reprieve —
               scale what is left of the stress by how much more water
               there is to spend. */
            f.stress = f.pool ? Math.min(f.stress * 0.35, 0.5) : f.stress;
            f.y = world.heightAt(f.x, f.z) + CLEAR;
          } else {
            var k = f.jump;
            f.x = f.jumpFrom.x + (f.jumpTo.x - f.jumpFrom.x) * k;
            f.z = f.jumpFrom.z + (f.jumpTo.z - f.jumpFrom.z) * k;
            f.y = world.heightAt(f.x, f.z) + CLEAR;
          }
          f.roll += (0 - f.roll) * Math.min(1, dt * 8);
          f.wag = (f.wag + dt * 4.0) % 1;
          f.fan = (f.fan + dt * 2.0) % 1;
          draw(f, fi);
          f.vis = true;
          touched = true;
          continue;
        }

        /* ---- out of the water: the clock ---- */
        if (depth < 0) {
          if (f.state !== 'strand') {
            f.state = 'strand';
            f.dry = 0;
            f.strandings++;
            f.flop = pair(FLOP_EVERY);
          }
          f.pool = null;
          f.speed = 0;
          f.dry += dt;
          f.y += ((floorY + BODY_HALF * sc) - f.y) * Math.min(1, dt * 8);
          /* On its side. This is the posture §24 took off the shore and
             it is the entire visual argument for putting it back. */
          f.roll += ((f.flopSide * 1.42) - f.roll) * Math.min(1, dt * 6);
          f.pitch += (0 - f.pitch) * Math.min(1, dt * 5);

          /* Flopping: a convulsion every second or two, throwing it a
             little way across the sand. Sometimes that is how a real
             one gets back to water, so let it actually move. */
          f.flop -= dt;
          if (f.flop <= 0) {
            f.flop = pair(FLOP_EVERY);
            f.flopSide = -f.flopSide;
            var a = f.yaw + range(-1.2, 1.2);
            var hx = f.x + Math.sin(a) * range(0.10, 0.32);
            var hz = f.z + Math.cos(a) * range(0.10, 0.32);
            if (world.inSimArea(hx, hz)) { f.x = hx; f.z = hz; f.yaw = a; }
          }

          /* Taken by a bird. It has to be a strike in progress — the
             death lands on the animation that is already on screen. */
          if (bird && bird.stab > 0) {
            var bdx = bird.x - f.x, bdz = bird.z - f.z;
            if (bdx * bdx + bdz * bdz < TAKE_R * TAKE_R) { kill(f, fi, 'taken'); touched = true; continue; }
          }
          if (f.dry >= STRAND_SECS) { kill(f, fi, 'dried'); touched = true; continue; }

          f.wag = (f.wag + dt * 1.2) % 1;
          draw(f, fi);
          f.vis = true;
          touched = true;
          continue;
        }

        /* ---- back in water: the flood got here in time ---- */
        if (f.state === 'strand') {
          rescues++;
          f.dry = 0;
          f.state = 'forage';
          f.roll = 0;
          pickNear(f, 3);
        }

        f.pool = cutOffPool(f.x, f.z);
        f.roll += (0 - f.roll) * Math.min(1, dt * 6);

        if (f.pool) {
          /* ---- CUT OFF ----
             Note what did NOT happen: nothing decided to trap this
             fish. It is standing in water that reads as perfectly
             adequate, because waterAt returns the pool's rim, and the
             sea has simply gone without it. */
          if (f.state !== 'pooled') { f.state = 'pooled'; }
          f.stress += dt / (POOL_BASE + f.pool.area * POOL_PER_M2);

          if (bird) {
            /* A heron over the rim. It bolts for the far side of its
               own pool — which is all a trapped fish CAN do, and is
               most of why being trapped is dangerous. */
            f.scared = 1.2;
            var away = Math.atan2(f.x - bird.x, f.z - bird.z);
            f.tgtX = f.pool.cx + Math.sin(away) * Math.sqrt(f.pool.area) * 0.35;
            f.tgtZ = f.pool.cz + Math.cos(away) * Math.sqrt(f.pool.area) * 0.35;
            if (bird.stab > 0) {
              var tdx = bird.x - f.x, tdz = bird.z - f.z;
              if (tdx * tdx + tdz * tdz < TAKE_R * TAKE_R) { kill(f, fi, 'taken'); touched = true; continue; }
            }
          } else if (f.stress > JUMP_AT && f.jumpCool <= 0) {
            var next = findNextPool(f);
            if (next && launchJump(f, next)) { draw(f, fi); f.vis = true; touched = true; continue; }
            f.jumpCool = pair(JUMP_COOL);          // nowhere to go; try again shortly
          }

          if (f.stress >= 1) {
            /* The basin is finished and there was nothing to jump to.
               It goes over the rim anyway, which is what a real one
               does, and now it is a stranded fish on a clock. */
            f.state = 'strand';
            f.dry = 0;
            f.strandings++;
            f.flop = pair(FLOP_EVERY);
            var esc = range(0, Math.PI * 2);
            f.x += Math.sin(esc) * Math.sqrt(f.pool.area) * 0.75;
            f.z += Math.cos(esc) * Math.sqrt(f.pool.area) * 0.75;
            f.pool = null;
            f.stress = 0;
            draw(f, fi); f.vis = true; touched = true;
            continue;
          }

          if (!f.scared && nearTarget(f, 0.30)) pickNear(f, Math.sqrt(f.pool.area) * 0.35);
          steer(f, dt, f.scared > 0 ? DART : CRUISE * 0.7);
          floatY(f, dt, sc);

        } else {
          /* ---- open water ---- */
          f.stress = 0;

          /* THE FALL. Sampled on its own clock rather than per frame,
             because a per-frame difference at 60 Hz is float noise
             against a tide that moves 0.066 m/s. */
          var falling = false, steady = false;
          f.depthT -= dt;
          if (f.depthT <= 0) {
            if (f.lastDepth >= 0) {
              /* RE-READ THE OLD SPOT, NOT THE NEW ONE. Depth under a
                 MOVING fish changes because the fish moved, and this
                 species spends the flood deliberately swimming into
                 shallower water — so comparing "depth here now" against
                 "depth there then" reported a fast ebb every time one
                 went up the shore to feed, and 39 of 54 fish were in
                 `retreat` at high water. Sampling the same point twice
                 leaves only the tide in the difference. */
              var rate = (f.lastDepth - depthAt(f.lastX, f.lastZ)) / DEPTH_DT;
              falling = rate > FALL_RATE;
              steady = rate < FALL_RATE * 0.3;
            }
            f.lastDepth = depth;
            f.lastX = f.x; f.lastZ = f.z;
            f.depthT = DEPTH_DT;
          }

          if (f.state !== 'retreat' && (falling || depth < EBB_DEPTH)) {
            /* The one decision this species is for, and it is triggered
               by the water going and by nothing else — no tide
               direction, no clock, no schedule. A fish in a cut-off
               pool never reaches this line, because the pool it is in
               is not going anywhere. */
            f.state = 'retreat';
            pickWetter(f);
          } else if (f.state === 'retreat' && steady && depth > OK_DEPTH) {
            f.state = 'forage';
            f.sit = pair(SIT_EVERY);
            if (!pickUpshore(f)) pickNear(f, 6);
          }

          if (f.state === 'retreat') {
            if (nearTarget(f, 0.6) || depth < EBB_DEPTH * 0.55) pickWetter(f);
            steer(f, dt, RETREAT_SPD);
            floatY(f, dt, sc);
          } else {
            /* Foraging, and the goby's own rhythm: a short dash, then
               DOWN on the sand for a few seconds propped on the pelvic
               disc. A goby that swims about continuously reads as a
               generic fish; the sitting is the species. */
            f.sit -= dt;
            if (f.state === 'rest') {
              f.speed += (0 - f.speed) * Math.min(1, dt * 5);
              var sy = world.heightAt(f.x, f.z) + SIT_CLEAR + BODY_HALF * 0.55 * sc;
              f.y += (sy - f.y) * Math.min(1, dt * 5);
              f.pitch += (0 - f.pitch) * Math.min(1, dt * 4);
              if (f.sit <= 0 || bird) {
                f.state = 'forage';
                f.sit = pair(SIT_EVERY);
                if (!pickUpshore(f)) pickNear(f, 6);
              }
            } else {
              if (bird) f.scared = 0.9;
              if (nearTarget(f, 0.35)) {
                if (f.sit <= 0) { f.state = 'rest'; f.sit = pair(SIT_FOR); }
                else if (!pickUpshore(f)) pickNear(f, 6);
              }
              steer(f, dt, f.scared > 0 ? DART : CRUISE);
              floatY(f, dt, sc);
              var wantPitch = Math.max(-0.3, Math.min(0.3, (f.y - (floorY + CLEAR)) * -0.8));
              f.pitch += (wantPitch - f.pitch) * Math.min(1, dt * 3);
            }
          }
        }

        f.wag = (f.wag + dt * (0.9 + f.speed * 2.0)) % 1;
        f.fan = (f.fan + dt * (1.6 + f.speed * 1.2)) % 1;

        draw(f, fi);
        f.vis = true;
        touched = true;
      }

      if (touched) for (var k2 in R) R[k2].mesh.instanceMatrix.needsUpdate = true;
    }

    /* ------------------------------------------------------------
       death, and the slot that replaces it

       One-in-one-out on a fixed COUNT. The animal is hidden, the slot
       counts down, and then the same slot comes back as a NEW fish
       swimming in from wherever the water is deepest. Nothing is
       allocated and the population never changes, so a shore with
       mortality on it still has exactly the draw cost of one without.
       ------------------------------------------------------------ */
    function kill(f, fi, how) {
      deaths++;
      if (how === 'taken') taken++;
      else if (how === 'otter') takenByOtter++;
      else driedOut++;
      f.state = 'dead';
      f.vis = false;
      f.placed = false;
      f.pool = null;
      f.stress = 0;
      f.dry = 0;
      f.roll = 0;
      f.deadFor = pair(RECRUIT_SECS);
      hideFish(fi);
    }

    /* A recruit arrives in the deepest water on the plot — the channel
       at the seaward end, which is the one place that is never
       exposed. Same argument as the egret flying in (§30): a
       population that only ever loses animals is a bug report waiting
       to happen. */
    function recruit(f) {
      for (var t = 0; t < 40; t++) {
        var x = range(-world.simArea.halfX + 8, world.simArea.halfX - 8);
        var z = range(46, world.simArea.zMax - 4);
        if (!world.inSimArea(x, z)) continue;
        if (depthAt(x, z) < 0.5) continue;
        f.x = x; f.z = z;
        f.y = world.heightAt(x, z) + CLEAR;
        f.yaw = range(0, Math.PI * 2);
        f.pitch = 0; f.roll = 0;
        f.speed = 0;
        f.state = 'forage';
        f.sit = pair(SIT_EVERY);
        f.placed = true;
        pickNear(f, 6);
        return true;
      }
      f.deadFor = 2;                 // no deep water this instant; look again shortly
      return false;
    }

    /* First placement: anywhere in the band that is under water right
       now. Fish that happen to land high on the flat are the ones the
       next ebb will test, and that spread is deliberate — a population
       all sitting in the channel would never demonstrate anything. */
    function place(f) {
      for (var t = 0; t < 50; t++) {
        var x = range(-world.simArea.halfX + 6, world.simArea.halfX - 6);
        var z = range(-6, world.simArea.zMax - 4);
        if (!world.inSimArea(x, z)) continue;
        var h = world.heightAt(x, z);
        if (h < ZONE[0] || h > ZONE[1]) continue;
        if (depthAt(x, z) < SWIM_DEPTH) continue;
        f.x = x; f.z = z;
        f.y = h + CLEAR;
        f.placed = true;
        f.state = 'forage';
        pickNear(f, 6);
        return true;
      }
      return false;
    }

    function nearTarget(f, r) {
      var dx = f.tgtX - f.x, dz = f.tgtZ - f.z;
      return dx * dx + dz * dz < r * r;
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

      /* ------------------------------------------------------------
         take — an outside predator claiming one of these fish (§42).

         Every wiring on this shore since §27 has been a PULL: the prey
         looks for the predator and the predator has never heard of it,
         which is why the egret above is scanned for from inside this
         file. That works when the interaction is the PREY's behaviour.
         The otter's is not — a romp picks a fish, runs it down and
         surfaces with it, and the whole event belongs to the otter.
         So otters.js calls this, the same way anemonefish.js writes
         `host.guests` onto an anemone (§39).

         The bookkeeping stays HERE, which is the point of exposing a
         function rather than the `kill` internals: the slot empties,
         counts down RECRUIT_SECS and comes back as a new fish swimming
         in from the channel. One-in-one-out on a fixed COUNT, so an
         apex predator arriving on the shore allocates nothing and the
         population is still a constant.

         `indexOf` rather than an index argument: the caller holds a
         fish reference and has no business knowing its slot, and 54
         entries scanned a handful of times a tide is not a cost. */
      take: function (f, how) {
        if (!f || f.state === 'dead') return false;
        var fi = fish.indexOf(f);
        if (fi < 0) return false;
        kill(f, fi, how || 'otter');
        return true;
      },

      /* The numbers that say the model works, for the long run §31
         asks for before calling a species done. `rescues` should
         comfortably exceed `deaths` — a stranding is meant to be a
         race the flood usually wins, and a shore where it does not is
         mis-tuned, not dramatic. */
      tally: function () {
        var t = { forage: 0, rest: 0, retreat: 0, pooled: 0, jump: 0, strand: 0, dead: 0 };
        for (var i2 = 0; i2 < COUNT; i2++) t[fish[i2].state] = (t[fish[i2].state] || 0) + 1;
        return t;
      },
      trapped: function () {
        var n = 0;
        for (var i3 = 0; i3 < COUNT; i3++) if (fish[i3].state === 'pooled') n++;
        return n;
      },
      stats: function () {
        var st = 0, jp = 0;
        for (var i4 = 0; i4 < COUNT; i4++) { st += fish[i4].strandings; jp += fish[i4].jumps; }
        return {
          strandings: st,      // times a fish has been caught out of water
          rescues: rescues,    // ...and the flood reached it in time
          jumps: jp,           // Bathygobius leaps between pools
          deaths: deaths,
          takenByEgret: taken,       // the §30 wiring, counted
          takenByOtter: takenByOtter, // and the §42 one, which is the shore's first real predation
          driedOut: driedOut
        };
      }
    };
  }

  window.Gobies = { spawn: spawn };
})();
