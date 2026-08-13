/* ============================================================
   egrets.js — the little egret (BUILD_GUIDE §1 stretch, §30).

   THE ONLY ANIMAL ON THIS SHORE THAT IS NOT ALWAYS HERE. Everything
   else in the roster is resident: it may be down a burrow, buried,
   clamped shut or lying in a pool, but it is on the plot, and the
   tide only decides what it is doing. An egret is a VISITOR. It flies
   in when the flat drains, works it, and leaves when the water comes
   back — so at high tide the population count for this species is
   genuinely zero and the sky is empty.

   §1 listed it as the stretch goal for one reason: "a single animal
   that demonstrates the whole tidal-predator switch in one shot". The
   fiddler crab already shows the switch from below (it comes UP when
   the water leaves). The egret shows it from above, and between them
   the same falling tide turns one guild on and hands it to another.

   WHAT DRIVES A BIRD, in priority order:
     1. is there exposed flat to work   — if not, leave, or stay away
     2. is it dark                      — egrets roost at night
     3. otherwise                       — stalk the waterline, and stab

   THE HUNT IS THE ANIMATION. A heron hunting is three speeds in
   sequence and the contrast between them is the whole thing: a slow
   deliberate wade, a dead FREEZE with the neck cocked, then a strike
   too fast to follow. Anything that moves at one speed reads as a
   chicken. So `stab` is 0.12 s of neck extension against a freeze
   that can last six seconds.

   IT DOES NOT KILL ANYTHING, and that is deliberate rather than
   unfinished. There is no mortality path anywhere in this sim (§24
   removed the last one), and adding one for a visiting predator would
   mean population bookkeeping — respawns, counts, an empty burrow —
   for an animal that is off the plot half the time. What IS modelled
   is the half that shows: the strike, and the PANIC. A fiddler crab
   within PANIC_R of a standing egret bolts for its burrow, which is
   what makes species.js's "bolts at the first sign of water or a
   shadow overhead" true — until now only water could do it.

   RENDERING. Ten InstancedMeshes for a population of five, every bird
   holding fixed slots in each. The bird is mostly POSED LIMBS rather
   than a solid: three neck segments, two legs of two segments each,
   and the wings, are all aimed per frame like the crab's cheliped.
   ============================================================ */
(function () {
  'use strict';

  /* ---------- the knobs ----------
     A little egret is ~60 cm tall and this shore runs its animals at
     an exaggeration that shrinks as the real animal grows — the crab
     is 19x life, the mudskipper 4x, the sea hare 1x. A bird this size
     needs almost none: 1.5x puts a standing egret at about a metre,
     which towers over a 48 cm crab exactly as it should. */
  var S = 0.42;                 // metres per body unit (torso length)
  var COUNT = 5;
  var HUNT_BAND = [0.9, 2.3];   // metres CD it will work — the drained flat
  var WADE_DEPTH = 0.16;        // metres of water it will stand in; deeper and it walks out
  var Z_RANGE = [-34, 30];

  var WALK = 0.42;              // m/s, the deliberate wade
  var TURN = 2.2;               // rad/s
  var STEP_LEN = 0.62;          // metres per stride cycle

  /* The hunt. FREEZE is long and STAB is short on purpose — see above. */
  var FREEZE = [1.4, 6.0];      // seconds motionless before a strike or a step
  var STAB_SECS = 0.12;         // neck fully out
  var RECOVER_SECS = 0.55;      // and back
  var STAB_ODDS = 0.45;         // chance a freeze ends in a strike rather than a step
  var STIR_ODDS = 0.22;         // chance it foot-stirs instead — little egrets really do this
  var STIR_SECS = [0.8, 1.8];

  /* Flight. */
  var CRUISE_Y = 15.0;          // metres above CD it flies at
  var FLY_SPD = 11.0;           // m/s — a real little egret cruises about this
  var GLIDE_SPD = 3.4;          // m/s on final approach
  var FLAP_HZ = 2.3;
  var DESCEND_FROM = 22;        // metres out that it starts dropping toward the landing spot
  var ARRIVE_STAGGER = [0, 26]; // seconds — they do not all pitch in together

  /* The panic radius. Generous: a crab does not wait to find out how
     hungry the heron is. */
  var PANIC_R = 4.6;

  var seed = 7717;
  function rand() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
  function range(a, b) { return a + rand() * (b - a); }

  var UP = new THREE.Vector3(0, 1, 0);
  var FWD = new THREE.Vector3(0, 0, 1);

  /* ---------- body layout, in body units ---------- */
  var BODY_Y = 1.62;            // torso centre above the ground when standing
  var SHOULDER = { x: 0.16, y: 0.10, z: 0.30 };
  var HIP = { x: -0.10, z: 0.16 };
  var THIGH = 0.62, SHANK = 0.74;
  var NECK_AT = 0.42;           // where the neck leaves the torso, along +X
  var NECK_SEG = [0.40, 0.38, 0.34];
  var BILL_LEN = 0.62;
  var TAIL_AT = -0.48;
  var PLUME_LEN = 0.50;

  function spawn(scene, world, opts) {
    var P = EgretBody.parts();
    var mat = EgretBody.material();
    var crabs = (opts && opts.crabs) || null;

    var group = new THREE.Group();
    group.name = 'little-egrets';
    scene.add(group);

    var N = COUNT;
    function slots(geo, per, shadow) {
      var m = new THREE.InstancedMesh(geo, mat, Math.max(N * per, 1));
      m.frustumCulled = false;
      m.castShadow = !!shadow;
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      group.add(m);
      return { mesh: m, per: per };
    }
    var R = {
      body:  slots(P.body, 1, true),
      neck:  slots(P.neckSeg, 3, true),
      head:  slots(P.head, 1, true),
      bill:  slots(P.bill, 1),
      eye:   slots(P.eye, 2),
      leg:   slots(P.legSeg, 4),
      foot:  slots(P.foot, 2),
      wing:  slots(P.wing, 2, true),
      tail:  slots(P.tail, 1),
      plume: slots(P.plume, 2)
    };

    /* ---------- the birds ---------- */
    var birds = [];
    for (var i = 0; i < N; i++) {
      birds.push({
        x: 0, y: 0, z: 0, yaw: 0,
        state: 'away',
        act: 'away',
        wait: range(ARRIVE_STAGGER[0], ARRIVE_STAGGER[1]),
        freeze: 0, stab: 0, stir: 0,
        neckOut: 0,               // 0 = folded S, 1 = speared straight out
        gait: rand(),
        flap: rand(),
        wingOut: 0,               // 0 = folded, 1 = spread
        tgtX: 0, tgtZ: 0,
        fromX: 0, fromZ: 0, fly: 0, flyLen: 1,
        vis: false,
        speed: range(0.9, 1.12),
        size: range(0.94, 1.07)
      });
    }

    var mBody = new THREE.Matrix4(), mPart = new THREE.Matrix4(), mOut = new THREE.Matrix4();
    var q = new THREE.Quaternion(), scl = new THREE.Vector3();
    var xa = new THREE.Vector3(), ya = new THREE.Vector3(), za = new THREE.Vector3();
    var tmp = new THREE.Vector3(), root = new THREE.Vector3(), dir = new THREE.Vector3();
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
    function putAt(rec, slot, r, yaw, pitch, s) {
      q.setFromEuler(new THREE.Euler(pitch, yaw, 0, 'YXZ'));
      mPart.compose(r, q, scl.set(s, s, s));
      mOut.multiplyMatrices(mBody, mPart);
      rec.mesh.setMatrixAt(slot, mOut);
    }
    function hideBird(bi) {
      for (var k in R) {
        for (var j = 0; j < R[k].per; j++) R[k].mesh.setMatrixAt(bi * R[k].per + j, HIDE);
      }
    }

    /* ------------------------------------------------------------
       draw

       The neck is the whole animal. At rest it folds into the S every
       heron carries — back over the shoulders, up, then forward — and
       the strike straightens all three segments into one line. `out`
       interpolates between those two poses, so the cock-and-fire is
       one number the behaviour side drives.
       ------------------------------------------------------------ */
    function drawBird(b, bi) {
      var s = S * b.size;
      var flying = b.state === 'inbound' || b.state === 'outbound';
      var pitchBody = flying ? -0.12 : 0.16;      // level in the air, tilted forward standing

      /* THE -90 AGAIN. Bodies here are built along +X (facet.js) but every
         heading in this file is `atan2(dx, dz)`, a +Z bearing. A yaw
         rotation about Y sends +X to (cos a, 0, -sin a), so lining that up
         with (sin yaw, 0, cos yaw) needs a = yaw - PI/2. The conch and the
         sea hare both carry this same correction; this is the fourth
         species on this build to be caught by it, and as usual it was
         invisible in review and obvious the moment a broadside shot came
         back with the animal facing the camera. */
      q.setFromEuler(new THREE.Euler(pitchBody, b.yaw - Math.PI / 2, 0, 'YXZ'));
      mBody.compose(tmp.set(b.x, b.y, b.z), q, scl.set(s, s, s));

      /* the torso itself, at the origin of the body frame */
      putAt(R.body, bi, root.set(0, 0, 0), 0, 0, 1);

      /* legs — tucked back in flight, striding on the ground */
      var stride = flying ? 0 : Math.sin(b.gait * Math.PI * 2) * 0.38;
      for (var li = 0; li < 2; li++) {
        var side = li ? 1 : -1;
        var ph = li ? stride : -stride;
        root.set(HIP.x, -0.18, side * HIP.z);
        if (flying) {
          // trailing straight behind, which is what makes a flying heron unmistakable
          dir.set(-0.94, -0.10, side * 0.05).normalize();
          put(R.leg, bi * 4 + li * 2, root, dir, THIGH, 1);
          root.set(HIP.x - THIGH * 0.94, -0.18 - THIGH * 0.10, side * HIP.z + side * THIGH * 0.05);
          put(R.leg, bi * 4 + li * 2 + 1, root, dir, SHANK, 1);
          putAt(R.foot, bi * 2 + li, root.clone().add(tmp.set(-SHANK * 0.9, -0.06, 0)), b.yaw * 0 + Math.PI, 0, 0.8);
        } else {
          dir.set(ph * 0.30, -0.94, side * 0.06).normalize();
          put(R.leg, bi * 4 + li * 2, root, dir, THIGH, 1);
          var kneeX = HIP.x + dir.x * THIGH, kneeY = -0.18 + dir.y * THIGH, kneeZ = side * HIP.z + dir.z * THIGH;
          root.set(kneeX, kneeY, kneeZ);
          // the shank drops nearly vertical whatever the thigh is doing
          dir.set(ph * 0.10, -0.995, side * 0.02).normalize();
          put(R.leg, bi * 4 + li * 2 + 1, root, dir, SHANK, 1);
          root.set(kneeX + dir.x * SHANK, kneeY + dir.y * SHANK + 0.01, kneeZ + dir.z * SHANK);
          putAt(R.foot, bi * 2 + li, root, 0, 0, 1);
        }
      }

      /* neck: three segments from the S to the spear */
      var out = b.neckOut;
      /* Segment directions, folded -> extended. Folded runs back-up-
         forward, which is the S; extended is three of the same vector
         so the whole neck is one straight line out of the shoulders. */
      var fold = [[-0.34, 0.94, 0], [0.42, 0.90, 0], [0.93, 0.30, 0]];
      var ext  = [[0.90, 0.42, 0], [0.95, 0.28, 0], [0.98, 0.14, 0]];
      var nx = NECK_AT, ny = 0.16, nz = 0;
      for (var ni = 0; ni < 3; ni++) {
        var dx = fold[ni][0] + (ext[ni][0] - fold[ni][0]) * out;
        var dy = fold[ni][1] + (ext[ni][1] - fold[ni][1]) * out;
        root.set(nx, ny, nz);
        dir.set(dx, dy, 0).normalize();
        put(R.neck, bi * 3 + ni, root, dir, NECK_SEG[ni], 1);
        nx += dir.x * NECK_SEG[ni];
        ny += dir.y * NECK_SEG[ni];
      }

      /* head sits on the end of the last segment, bill carrying on
         along the same line */
      root.set(nx, ny, nz);
      var headPitch = -0.25 + 0.25 * out;
      putAt(R.head, bi, root, 0, headPitch, 1);
      dir.set(0.90 + 0.09 * out, -0.42 + 0.40 * out, 0).normalize();
      put(R.bill, bi, root.clone().add(tmp.set(dir.x * 0.10, dir.y * 0.10, 0)), dir, BILL_LEN, 1);
      for (var ei = 0; ei < 2; ei++) {
        putAt(R.eye, bi * 2 + ei, tmp.set(nx + 0.07, ny + 0.06, ei ? 0.075 : -0.075), 0, 0, 1);
      }
      /* the two nape plumes, trailing back off the head */
      for (var pi = 0; pi < 2; pi++) {
        root.set(nx - 0.05, ny + 0.07, pi ? 0.035 : -0.035);
        dir.set(-0.86 - 0.10 * out, 0.22 - 0.30 * out, pi ? 0.10 : -0.10).normalize();
        put(R.plume, bi * 2 + pi, root, dir, PLUME_LEN, 1);
      }

      /* wings: folded along the flank, or spread and flapping */
      var beat = flying ? Math.sin(b.flap * Math.PI * 2) : 0;
      for (var wi = 0; wi < 2; wi++) {
        var wside = wi ? 1 : -1;
        root.set(SHOULDER.x, SHOULDER.y, wside * SHOULDER.z);
        if (b.wingOut > 0.02) {
          var lift = beat * 0.55;
          dir.set(-0.16, lift, wside * 0.98).normalize();
          // folded and spread blend on the direction, so half-open reads
          tmp.set(-0.92, 0.05, wside * 0.30).normalize();
          dir.lerp(tmp, 1 - b.wingOut).normalize();
          put(R.wing, bi * 2 + wi, root, dir, 1.0, 1);
        } else {
          dir.set(-0.92, 0.02, wside * 0.28).normalize();
          put(R.wing, bi * 2 + wi, root, dir, 0.86, 1);
        }
      }

      root.set(TAIL_AT, 0.06, 0);
      dir.set(-0.96, 0.28, 0).normalize();
      put(R.tail, bi, root, dir, 1, 1);
    }

    for (i = 0; i < N; i++) hideBird(i);
    for (var k0 in R) R[k0].mesh.instanceMatrix.needsUpdate = true;

    /* ------------------------------------------------------------
       where to hunt

       The waterline, on ground that is drained or barely covered.
       Rejection-sampled against the real terrain like everything else
       here, because the transect is warped and the band a bird wants
       wanders in z.
       ------------------------------------------------------------ */
    function findSpot(out) {
      for (var t = 0; t < 40; t++) {
        var x = range(-world.simArea.halfX + 6, world.simArea.halfX - 6);
        var z = range(Z_RANGE[0], Z_RANGE[1]);
        if (!world.inSimArea(x, z)) continue;
        var h = world.heightAt(x, z);
        if (h < HUNT_BAND[0] || h > HUNT_BAND[1]) continue;
        var surf = world.waterAt(x, z);
        if (surf !== null && surf - h > WADE_DEPTH) continue;    // too deep to stand in
        out.x = x; out.z = z;
        return true;
      }
      return false;
    }
    var spot = { x: 0, z: 0 };

    /* Is there anything worth flying in for? The flat has to be out of
       the water and it has to be light. */
    function shoreIsOpen() {
      return !world.isNight && world.tide < HUNT_BAND[1] - 0.15;
    }

    function stepTo(b, tx, tz, spd, dt) {
      var dx = tx - b.x, dz = tz - b.z;
      var d = Math.sqrt(dx * dx + dz * dz);
      if (d < 1e-4) return 0;
      var want = Math.atan2(dx, dz);
      var da = want - b.yaw;
      while (da > Math.PI) da -= Math.PI * 2;
      while (da < -Math.PI) da += Math.PI * 2;
      b.yaw += Math.max(-TURN * dt, Math.min(TURN * dt, da));
      var mv = Math.min(d, spd * dt);
      b.x += dx / d * mv;
      b.z += dz / d * mv;
      b.gait = (b.gait + mv / STEP_LEN) % 1;
      return d - mv;
    }

    /* ------------------------------------------------------------
       update
       ------------------------------------------------------------ */
    function update(dt) {
      var open = shoreIsOpen();
      var touched = false;

      for (var bi = 0; bi < N; bi++) {
        var b = birds[bi];

        switch (b.state) {
          /* ---- off the plot entirely ---- */
          case 'away':
            b.act = 'away';
            if (open) {
              b.wait -= dt;
              if (b.wait <= 0 && findSpot(spot)) {
                /* Come in from off-shore — over the channel, not over
                   the mangroves, because that is the open water side
                   and it puts the arrival across the camera's view of
                   the flat rather than behind the trees. */
                b.tgtX = spot.x; b.tgtZ = spot.z;
                b.fromX = spot.x + range(-22, 22);
                b.fromZ = world.simArea.zMax + range(12, 30);
                b.x = b.fromX; b.z = b.fromZ; b.y = CRUISE_Y;
                b.flyLen = Math.max(1, Math.hypot(b.tgtX - b.fromX, b.tgtZ - b.fromZ));
                b.fly = 0;
                b.wingOut = 1;
                b.neckOut = 0;
                b.state = 'inbound';
              }
            } else {
              b.wait = range(ARRIVE_STAGGER[0], ARRIVE_STAGGER[1]);
            }
            break;

          /* ---- flying in ---- */
          case 'inbound':
            b.act = 'inbound';
            var leftIn = stepTo(b, b.tgtX, b.tgtZ, FLY_SPD, dt);
            b.flap = (b.flap + FLAP_HZ * dt) % 1;
            /* Height is a function of distance to go, not of time — so
               the glide always ends exactly at the ground however far
               out the bird happened to start. */
            var groundY = world.heightAt(b.x, b.z);
            if (leftIn < DESCEND_FROM) {
              var k = leftIn / DESCEND_FROM;
              b.y = groundY + BODY_Y * S * b.size + (CRUISE_Y - groundY) * k * k;
              b.flap = (b.flap + FLAP_HZ * 0.4 * dt) % 1;   // set the wings and glide in
            } else {
              b.y = CRUISE_Y;
            }
            if (leftIn < 0.25) {
              b.y = groundY + BODY_Y * S * b.size;
              b.state = 'hunt';
              b.wingOut = 0;
              b.freeze = range(FREEZE[0], FREEZE[1]);
            }
            break;

          /* ---- working the flat ---- */
          case 'hunt':
            if (!open) {
              b.state = 'outbound';
              b.wingOut = 1;
              b.neckOut = 0;
              b.fromX = b.x; b.fromZ = b.z;
              b.tgtX = b.x + range(-22, 22);
              b.tgtZ = world.simArea.zMax + range(14, 34);
              break;
            }
            hunt(b, dt);
            b.y = world.heightAt(b.x, b.z) + BODY_Y * S * b.size;
            break;

          /* ---- leaving ---- */
          case 'outbound':
            b.act = 'outbound';
            b.flap = (b.flap + FLAP_HZ * dt) % 1;
            var leftOut = stepTo(b, b.tgtX, b.tgtZ, FLY_SPD, dt);
            var g2 = world.heightAt(b.x, b.z);
            var climbed = Math.min(1, (Math.hypot(b.x - b.fromX, b.z - b.fromZ)) / DESCEND_FROM);
            b.y = g2 + BODY_Y * S * b.size + (CRUISE_Y - g2) * climbed * climbed;
            if (leftOut < 0.5) {
              b.state = 'away';
              b.wait = range(ARRIVE_STAGGER[0], ARRIVE_STAGGER[1]);
            }
            break;
        }

        var visible = b.state !== 'away';
        if (visible) {
          drawBird(b, bi);
          b.vis = true;
          touched = true;
        } else if (b.vis) {
          hideBird(bi);
          b.vis = false;
          touched = true;
        }
      }

      if (touched) for (var k2 in R) R[k2].mesh.instanceMatrix.needsUpdate = true;

      /* ---- and the shadow overhead (§30) ----
         Run once over the standing birds rather than per crab: 5 birds
         against 84 crabs, and only the birds that are actually on the
         ground can frighten anything. */
      if (crabs) panic();
    }

    /* A fiddler crab that is out and within PANIC_R of a standing egret
       runs for its hole. It is the crab's own flee path — the same one
       the flood uses — so nothing new had to be taught to that species
       beyond "here is another reason". */
    function panic() {
      for (var bi = 0; bi < N; bi++) {
        var b = birds[bi];
        if (b.state !== 'hunt') continue;
        for (var ci = 0; ci < crabs.length; ci++) {
          var c = crabs[ci];
          if (c.state !== 'out' || c.fleeing) continue;
          var dx = c.x - b.x, dz = c.z - b.z;
          if (dx * dx + dz * dz > PANIC_R * PANIC_R) continue;
          c.fleeing = true;
          c.tgtX = c.b.x; c.tgtZ = c.b.z;
          c.wave = 0; c.waveLeft = 0;
          c.scared = 1;
        }
      }
    }

    /* ------------------------------------------------------------
       the hunt: wade, freeze, stab

       Three speeds, and the contrast between them is the animal. The
       freeze is the long one — a hunting heron spends most of its time
       doing nothing at all, and a bird that is always walking reads as
       poultry.
       ------------------------------------------------------------ */
    function hunt(b, dt) {
      // strike in progress: nothing else matters
      if (b.stab > 0) {
        b.act = 'stab';
        b.stab -= dt;
        var into = b.stab / (STAB_SECS + RECOVER_SECS);
        // out fast, back slow
        b.neckOut = into > (RECOVER_SECS / (STAB_SECS + RECOVER_SECS))
          ? 1
          : into / (RECOVER_SECS / (STAB_SECS + RECOVER_SECS));
        if (b.stab <= 0) {
          b.neckOut = 0;
          b.freeze = range(FREEZE[0], FREEZE[1]);
        }
        return;
      }

      if (b.stir > 0) {
        /* Foot-stirring. A little egret vibrates one foot in the
           sediment to flush whatever is hiding in it, then watches the
           spot. Small, odd, and unmistakably this species. */
        b.act = 'stir';
        b.stir -= dt;
        b.gait = (b.gait + dt * 5.5) % 1;
        if (b.stir <= 0) b.freeze = range(0.5, 1.6);
        return;
      }

      if (b.freeze > 0) {
        b.act = 'freeze';
        b.freeze -= dt;
        b.neckOut = Math.max(0, b.neckOut - dt * 2);
        if (b.freeze <= 0) {
          var r = rand();
          if (r < STAB_ODDS) {
            b.stab = STAB_SECS + RECOVER_SECS;
          } else if (r < STAB_ODDS + STIR_ODDS) {
            b.stir = range(STIR_SECS[0], STIR_SECS[1]);
          } else if (findSpot(spot)) {
            /* Move on — but only a short way. A heron works a patch
               over rather than crossing the flat, so the new spot is
               pulled most of the way back toward where it stands. */
            b.tgtX = b.x + (spot.x - b.x) * range(0.04, 0.16);
            b.tgtZ = b.z + (spot.z - b.z) * range(0.04, 0.16);
            b.act = 'wade';
          }
        }
        return;
      }

      b.act = 'wade';
      var left = stepTo(b, b.tgtX, b.tgtZ, WALK * b.speed, dt);
      if (left < 0.06) b.freeze = range(FREEZE[0], FREEZE[1]);
    }

    return {
      count: N,
      group: group,
      birds: birds,
      update: update,
      // how many are actually on the shore — 0 for most of a high tide
      present: function () {
        var n = 0;
        for (var i2 = 0; i2 < N; i2++) if (birds[i2].state !== 'away') n++;
        return n;
      },
      hunting: function () {
        var n = 0;
        for (var i3 = 0; i3 < N; i3++) if (birds[i3].state === 'hunt') n++;
        return n;
      }
    };
  }

  window.Egrets = { spawn: spawn, SCALE: S };
})();
