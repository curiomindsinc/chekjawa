/* ============================================================
   egrets.js — the little egret (BUILD_GUIDE §1 stretch, §30, §33).

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
     1. is the water low and still falling — if not, stay away
     2. has the flood reached LEAVE_ABOVE  — then go, wherever it is
     3. is it dark                       — egrets roost at night
     4. otherwise                        — work the flat: walk, and peck

   TWO FORAGING MODES, AND THE GROUND DECIDES WHICH (§33). The first
   pass gave this bird one mode — the grey heron's: stand in water,
   freeze for six seconds, spear. It is a real behaviour and it is the
   wrong default, because *Egretta garzetta* is the RESTLESS one. A
   grey heron is a statue; a little egret is the bird that trots about
   the flat with its head down, stabbing at whatever the falling water
   left behind. So:

     ON DRAINED MUD    it WALKS. Long legs going, head low and forward,
                       short pauses, and pecks at the sediment — the
                       whole animal tipping down to the ground and back.
                       This is where a bird spends most of its visit,
                       because most of the band it works is drained.
     STANDING IN WATER it stalks. Now the long freeze earns its keep:
                       motionless with the neck cocked, then a strike
                       too fast to follow, then still again.

   The contrast between those two is worth more than either alone, and
   `wetFoot()` is the single test that switches between them.

   THE WALK IS THE OTHER HALF. A leggy bird is judged entirely on its
   gait, and the first pass had none: both legs swung off one sine, the
   shank hung vertical whatever the thigh did, and the feet slid over
   the mud instead of being put down on it. Now the feet are PLANTED —
   two-link IK from hip to toe, the same solve the fiddler crab and the
   hermit use — with the joint bending BACKWARD, because that is the
   thing everybody notices about a bird's leg. Stance holds the toe
   still in the world and lets the body pass over it; swing lifts it
   clear and reaches ahead. The torso rolls and sways onto whichever
   leg is carrying, and the head does NOT: a heron's head is famously
   the steadiest thing about it, so the neck root cancels most of what
   the body is doing under it.

   AND THE OLD PITCH WAS A ROLL. `Euler(pitch, yaw, 0, 'YXZ')` puts the
   pitch on the X axis, which for a body built along +X (facet.js) is
   the ROLL axis — so the standing bird was tilted 9 degrees sideways
   and no amount of tuning that number was ever going to make it lean
   over its feet. Pitch for a +X body is the Z component. That one
   character is most of why the animal read as a plank.

   IT DOES NOT KILL ANYTHING, and that is deliberate rather than
   unfinished. There is no mortality path anywhere in this sim (§24
   removed the last one), and adding one for a visiting predator would
   mean population bookkeeping — respawns, counts, an empty burrow —
   for an animal that is off the plot half the time. What IS modelled
   is the half that shows: the strike, the peck, and the PANIC. A
   fiddler crab within PANIC_R of a standing egret bolts for its
   burrow, which is what makes species.js's "bolts at the first sign of
   water or a shadow overhead" true — until now only water could do it.

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

  /* ---------- WHEN IT COMES, AND WHEN IT GOES ----------
     This is a LOW TIDE bird and the gate has to say so. The first pass
     gated on "tide below the top of the hunting band", 2.15 m, which is
     true for most of a cycle — and on a neap tide, whose high water is
     only 2.20 (tide.js), it is very nearly always true, so the bird
     never left at all. Being present most of the time is exactly what
     this species must not be.

     So: two marks, not one, read against tide.js's envelope —
     spring low 0.13, neap low 1.00, neap high 2.20, spring high 3.10.

     HYSTERESIS IS THE POINT. A single threshold makes a bird that
     hovers at the mark flap in and out every few seconds. A real egret
     commits to a tide: it drops in behind the falling water and works
     until the flood pushes it off. The gap between the two marks is
     that commitment.

     It also has to be EBBING to come in, so arrivals happen behind the
     retreating waterline rather than at the same height on the way back
     up. One consequence worth knowing: on a neap tide, low water is
     1.00 and barely clears ARRIVE_BELOW, so the birds hardly visit —
     the big feeding days are the spring lows. That is true of the real
     place and it is why the flat is worth visiting on a spring low. */
  var ARRIVE_BELOW = 1.30;      // metres CD — flies in once the water is under this, and falling
  var LEAVE_ABOVE = 1.70;       // metres CD — and off again once the flood reaches this

  var WALK = 0.46;              // m/s, the working walk across drained mud
  var STALK = 0.26;             // m/s, the deliberate wade through standing water
  var TURN = 1.35;              // rad/s — a bird steps round a corner, it does not pivot
  var TURN_BRAKE = 0.9;         // radians of heading error that stalls the walk to a turn

  /* ---------- the gait ----------
     STRIDE is the fore-and-aft distance a planted toe travels through
     the body frame during its stance, in body units. STANCE is the
     fraction of the cycle it is on the ground for — over 0.5, so there
     is always at least one foot down and the bird never reads as
     hopping. Between them they FIX the distance covered per cycle:
     STRIDE / STANCE body units, and the gait phase has to be advanced
     at exactly that rate or the feet skate. That is the whole trick,
     and getting it wrong is what makes a CG animal look like it is
     standing on a conveyor belt. */
  var STANCE = 0.60;
  var STRIDE = 0.92;            // body units of ground per stance
  var FOOT_LIFT = 0.30;         // body units a swinging toe clears the mud by
  var TRACK = 0.115;            // body units either side of the midline the toes fall
  /* A standing bird does not stand to attention. Both feet level and
     side by side is the one pose a real bird almost never holds, and
     broadside — which is how this animal is nearly always seen — it
     hides one whole leg behind the other. So a stopped bird keeps one
     foot forward of the other. */
  var STAND_SPLIT = 0.14;       // body units one foot leads the other by at rest

  /* The hunt. FREEZE is long and STAB is short on purpose — see above. */
  var FREEZE = [1.4, 6.0];      // seconds motionless before a strike, in water
  var PAUSE = [0.35, 1.5];      // seconds standing between pecks, on mud
  var STAB_SECS = 0.12;         // neck fully out
  var RECOVER_SECS = 0.55;      // and back
  var STAB_ODDS = 0.55;         // chance a freeze in water ends in a strike rather than a step

  /* The ground peck: down, two quick jabs at the sediment, and up. All
     three phases are needed. Down-and-up alone reads as a nod; it is
     the jabs at the bottom that read as an animal working something
     out of the mud. */
  var PECK_DOWN = 0.26, PECK_JAB = 0.34, PECK_UP = 0.34;
  var PECK_SECS = PECK_DOWN + PECK_JAB + PECK_UP;
  var PECK_ODDS = 0.62;         // chance a pause on mud ends in a peck rather than a step
  var STIR_ODDS = 0.14;         // little egrets really do foot-stir; rare enough to still notice
  var STIR_SECS = [0.8, 1.8];

  /* How far it walks between forage bouts. The first pass moved a bird
     4-16% of the way to a new spot, which at this scale is a few
     centimetres — the bird shuffled in place for its entire visit. A
     little egret WORKS a flat: it covers ground. */
  var LEG_LEN = [1.6, 7.0];     // metres of open walking per leg of the wander
  var BOUT = [1, 4];            // forage actions at the end of a leg before it moves on

  /* Flight. */
  var CRUISE_Y = 15.0;          // metres above CD it flies at
  var FLY_SPD = 11.0;           // m/s — a real little egret cruises about this
  var FLAP_HZ = 2.3;
  var DESCEND_FROM = 22;        // metres out that it starts dropping toward the landing spot
  /* Short, because the arrival window itself is short: the tide is only
     below ARRIVE_BELOW and still falling for something like twenty
     seconds of a ninety-second cycle. At 26 s some birds never made it
     in at all before the flood turned them back. */
  var ARRIVE_STAGGER = [0, 9];  // seconds — they still do not all pitch in together

  /* The panic radius. Generous: a crab does not wait to find out how
     hungry the heron is. */
  var PANIC_R = 4.6;

  var seed = 7717;
  function rand() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
  function range(a, b) { return a + rand() * (b - a); }
  function smooth(t) { return t * t * (3 - 2 * t); }
  /* Frame-rate independent ease toward a value. Used everywhere a pose
     has to CATCH UP rather than snap — the neck settling, the sway
     dying as a bird stops. */
  function approach(v, want, rate, dt) { return v + (want - v) * (1 - Math.exp(-rate * dt)); }

  var UP = new THREE.Vector3(0, 1, 0);
  var FWD = new THREE.Vector3(0, 0, 1);
  var BACK = new THREE.Vector3(-1, 0, 0);

  /* ---------- body layout, in body units ----------
     BODY_Y sits the torso so the hip is just inside the leg's reach:
     hip at BODY_Y + HIP.y = 1.40 above the mud against THIGH + SHANK =
     1.58, so a standing leg is 89% extended and still shows its bend,
     and a toe reaching a full half-stride ahead is still inside the
     solve rather than being clamped flat. Get this wrong in either
     direction and the IK either locks straight (a stilt) or folds into
     a crouch (a chicken). */
  var BODY_Y = 1.58;            // torso centre above the ground when standing
  var SHOULDER = { x: 0.16, y: 0.10, z: 0.30 };
  var HIP = { x: -0.06, y: -0.18, z: 0.14 };
  var THIGH = 0.72, SHANK = 0.86;
  var NECK_AT = 0.42;           // where the neck leaves the torso, along +X
  var NECK_SEG = [0.40, 0.38, 0.34];
  var BILL_LEN = 0.62;
  var TAIL_AT = -0.48;
  var PLUME_LEN = 0.50;

  /* How much of the torso's bob and sway the neck cancels. Not 1.0: a
     perfectly still head on a moving body looks mechanical in the other
     direction. 0.82 leaves just enough carry-through. */
  var HEAD_STEADY = 0.82;

  /* Neck poses, per segment, as (forward, up) in the body frame. The
     whole neck is these three sets blended — folded is the S every
     heron carries at rest, extended is one straight line for the
     strike, down is the reach to the ground for a peck.

     THE DOWN POSE IS A SHALLOW C, NOT A DROP. The first cut of it aimed
     all three segments nearly straight down, which looks correct
     written out and is wrong on screen for a reason that only shows up
     once it is blended: segment 0 of the S points BACK and UP, so
     interpolating it toward straight-down takes it through zero, and
     at the half-blends the walk actually uses the whole neck collapsed
     into a knot over the shoulders. A pose set has to be judged on the
     path between the poses, not just at the ends. So down leads with
     the neck already reaching forward-and-under, and every blend
     between fold and down stays a curve. */
  var NECK_FOLD = [[-0.34, 0.94], [0.42, 0.90], [0.93, 0.30]];
  var NECK_EXT  = [[0.90, 0.42], [0.95, 0.28], [0.98, 0.14]];
  var NECK_DOWN = [[0.88, -0.48], [0.45, -0.89], [0.22, -0.98]];
  /* How much of the head's turn each segment carries. A bird swings the
     whole neck, not the skull — the head itself only adds the last of
     it, which is why an egret looking sideways is a shape change and
     not a rotating prop. */
  var NECK_TWIST = [0.20, 0.55, 1.0];

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
        freeze: 0, stab: 0, stir: 0, peck: 0,
        bout: 0,                  // forage actions still owed at this spot
        neckOut: 0,               // 0 = folded S, 1 = speared straight out
        neckDown: 0,              // 0 = level, 1 = bill on the mud
        neckYaw: 0, neckYawT: 0,  // where the head is looking, and where it wants to
        headTilt: 0, headTiltT: 0,// the sideways cock — one eye down at the ground
        look: 0,                  // seconds until it picks somewhere new to look
        gait: rand(),
        lead: rand() < 0.5 ? 1 : -1,   // which foot this bird stands with forward
        moving: 0,                // 0..1, how much of the walk cycle is live
        bob: 0, sway: 0, roll: 0, pitch: 0,
        flap: rand(),
        wingOut: 0,               // 0 = folded, 1 = spread
        flick: 0,                 // half-open wings for balance out of a sharp turn
        tgtX: 0, tgtZ: 0,
        fromX: 0, fromZ: 0, fly: 0, flyLen: 1,
        vis: false,
        speed: range(0.9, 1.12),
        size: range(0.94, 1.07)
      });
    }

    var mBody = new THREE.Matrix4(), mPart = new THREE.Matrix4(), mOut = new THREE.Matrix4();
    var q = new THREE.Quaternion(), qh = new THREE.Quaternion(), scl = new THREE.Vector3();
    var eul = new THREE.Euler(0, 0, 0, 'YXZ');
    var xa = new THREE.Vector3(), ya = new THREE.Vector3(), za = new THREE.Vector3();
    var tmp = new THREE.Vector3(), root = new THREE.Vector3(), dir = new THREE.Vector3();
    var hipV = new THREE.Vector3(), toe = new THREE.Vector3(), knee = new THREE.Vector3();
    var e1 = new THREE.Vector3(), e2 = new THREE.Vector3(), d2 = new THREE.Vector3();
    /* `bpos` exists because put() uses `tmp` for its own basis work, so
       anything still needed AFTER the call — or worse, passed IN as the
       position — cannot be tmp. Passing tmp as the root put the bill a
       clean metre above the bird's back and nowhere near its head. */
    var fdir = new THREE.Vector3(), hpos = new THREE.Vector3(), hoff = new THREE.Vector3();
    var bpos = new THREE.Vector3();
    var HIDE = new THREE.Matrix4().makeScale(0, 0, 0);

    /* The torso's pitch, held here so everything bolted to the torso can
       swing with it without each one redoing the trig. A +X body pitches
       about Z, so this is a rotation in the XY plane. */
    var _cp = 1, _sp = 0;
    function setPitch(p) { _cp = Math.cos(p); _sp = Math.sin(p); }
    function pitched(v, x, y, z) { return v.set(x * _cp - y * _sp, x * _sp + y * _cp, z); }

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
    /* yaw / pitch / roll for a body built along +X. Euler 'YXZ' applies
       Z first, so the Z slot is the PITCH and the X slot is the ROLL —
       the inverse of what the argument order looks like at a glance,
       and exactly the trap the first pass fell into. */
    function putAt(rec, slot, r, yaw, pitch, roll, s) {
      eul.set(roll, yaw, pitch, 'YXZ');
      q.setFromEuler(eul);
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
       one leg, hip to toe

       Two-link IK, and the joint is solved BACKWARD rather than up.
       That is the whole reason a bird's leg is recognisable at a
       glance: what looks like a backwards knee is the ankle, and the
       segment above it is shin, not thigh. Solve it the crab's way —
       joint toward +UP — and you get a mammal in a heron suit.
       ------------------------------------------------------------ */
    function leg(b, bi, li, side, toeX, toeY, toeZ, toeDrop) {
      pitched(hipV, HIP.x, HIP.y, 0);
      hipV.z = side * HIP.z + b.sway;

      toe.set(toeX, toeY, toeZ);
      d2.subVectors(toe, hipV);
      var d = d2.length();
      var reach = (THIGH + SHANK) * 0.985;
      if (d > reach) { d2.multiplyScalar(reach / d); d = reach; toe.copy(hipV).add(d2); }
      if (d < 1e-4) d = 1e-4;

      e1.copy(d2).divideScalar(d);
      e2.copy(BACK).addScaledVector(e1, -BACK.dot(e1));
      if (e2.lengthSq() < 1e-6) e2.set(0, 0, 1); else e2.normalize();

      var ca = (THIGH * THIGH + d * d - SHANK * SHANK) / (2 * THIGH * d);
      var a = Math.acos(Math.max(-1, Math.min(1, ca)));
      dir.copy(e1).multiplyScalar(Math.cos(a)).addScaledVector(e2, Math.sin(a));
      knee.copy(hipV).addScaledVector(dir, THIGH);
      put(R.leg, bi * 4 + li * 2, hipV, dir, THIGH, 1);

      dir.subVectors(toe, knee).normalize();
      put(R.leg, bi * 4 + li * 2 + 1, knee, dir, SHANK, 0.92);

      /* The foot lies flat off the toe joint, splayed a little out from
         the midline. A swinging foot hangs its toes, which is most of
         what sells a lifted leg at this size. */
      fdir.set(0.985, toeDrop, side * 0.12).normalize();
      put(R.foot, bi * 2 + li, toe, fdir, 1, 1);
    }

    /* ------------------------------------------------------------
       draw

       The neck is the whole animal. At rest it folds into the S every
       heron carries — back over the shoulders, up, then forward — the
       strike straightens all three segments into one line, and a peck
       curls the same three down to the mud. `neckOut` and `neckDown`
       interpolate between those poses, so cock-and-fire and stoop-and-
       jab are two numbers the behaviour side drives.
       ------------------------------------------------------------ */
    function drawBird(b, bi, groundY) {
      var s = S * b.size;
      var flying = b.state === 'inbound' || b.state === 'outbound';

      setPitch(b.pitch);

      /* mBody carries POSITION, HEADING AND SCALE ONLY, so the frame it
         defines is upright and local Y is world up. Everything that
         leans — torso, neck, wings — leans inside it, which is what
         lets the feet be put on the actual ground rather than on a
         plane tilted along with the bird.

         THE -90 AGAIN. Bodies here are built along +X (facet.js) but every
         heading in this file is `atan2(dx, dz)`, a +Z bearing. A yaw
         rotation about Y sends +X to (cos a, 0, -sin a), so lining that up
         with (sin yaw, 0, cos yaw) needs a = yaw - PI/2. The conch and the
         sea hare both carry this same correction; this is the fourth
         species on this build to be caught by it, and as usual it was
         invisible in review and obvious the moment a broadside shot came
         back with the animal facing the camera. */
      eul.set(0, b.yaw - Math.PI / 2, 0, 'YXZ');
      q.setFromEuler(eul);
      mBody.compose(tmp.set(b.x, b.y + b.bob * s, b.z), q, scl.set(s, s, s));

      /* the torso: pitched forward over its feet, rolled onto whichever
         leg is carrying, and slid across with the sway */
      putAt(R.body, bi, root.set(0, 0, b.sway), 0, b.pitch, b.roll, 1);

      /* ---------- legs ---------- */
      if (flying) {
        /* trailing straight behind, which is what makes a flying heron
           unmistakable. No IK here: the leg is simply held out. */
        for (var fi = 0; fi < 2; fi++) {
          var fside = fi ? 1 : -1;
          pitched(root, HIP.x, HIP.y, 0); root.z = fside * HIP.z;
          dir.set(-0.94, -0.10, fside * 0.05).normalize();
          put(R.leg, bi * 4 + fi * 2, root, dir, THIGH, 1);
          root.addScaledVector(dir, THIGH);
          put(R.leg, bi * 4 + fi * 2 + 1, root, dir, SHANK, 0.92);
          root.addScaledVector(dir, SHANK);
          fdir.set(-0.98, -0.16, fside * 0.10).normalize();
          put(R.foot, bi * 2 + fi, root, fdir, 1, 1);
        }
      } else {
        /* Where the mud is, in this bird's own local units. Sampled per
           FOOT rather than per bird: this transect is warped, and a
           metre-tall animal standing across a slope with both toes on
           the same plane floats one of them. */
        var localGround = -(BODY_Y + b.bob);
        var ca = Math.cos(b.yaw), sa = Math.sin(b.yaw);
        for (var li = 0; li < 2; li++) {
          var side = li ? 1 : -1;
          var ph = (b.gait + (li ? 0.5 : 0)) % 1;
          var along, lift, drop;
          if (ph < STANCE) {
            /* stance: the toe is nailed to the mud and the body walks
               over it, so in the body frame it slides straight back at
               exactly the speed the bird is going forward */
            along = STRIDE * (0.5 - ph / STANCE);
            lift = 0;
            drop = 0;
          } else {
            var sw = (ph - STANCE) / (1 - STANCE);
            along = STRIDE * (smooth(sw) - 0.5);
            lift = Math.sin(sw * Math.PI) * FOOT_LIFT;
            drop = -0.38 * Math.sin(sw * Math.PI);
          }
          /* At a standstill the cycle is faded out rather than frozen
             mid-stride, so a bird that stops does not stop with one
             foot still in the air — it settles onto the split stance
             instead. */
          along = along * b.moving + (li ? -b.lead : b.lead) * STAND_SPLIT * (1 - b.moving);
          lift *= b.moving;
          drop *= b.moving;
          var toeZ = side * TRACK;
          /* this toe's world position, for its own terrain sample */
          var wx = b.x + (along * ca - toeZ * sa) * s;
          var wz = b.z + (along * sa + toeZ * ca) * s;
          var dy = (world.heightAt(wx, wz) - groundY) / s;
          leg(b, bi, li, side, along, localGround + dy + lift, toeZ, drop - 0.04);
        }
      }

      /* ---------- neck ----------
         Rooted on the torso, so it swings with the pitch — but it
         cancels most of the bob and sway under it, because a heron's
         head is the steadiest part of the animal and letting it ride
         the body is what turns a walk into a wind-up toy. */
      var out = b.neckOut, dn = b.neckDown;
      pitched(root, NECK_AT, 0.16, 0);
      var nx = root.x;
      var ny = root.y - b.bob * HEAD_STEADY;
      var nz = b.sway * (1 - HEAD_STEADY);
      var lastX = 1, lastY = 0, lastZ = 0;
      for (var ni = 0; ni < 3; ni++) {
        var dx = NECK_FOLD[ni][0] + (NECK_EXT[ni][0] - NECK_FOLD[ni][0]) * out;
        var dy2 = NECK_FOLD[ni][1] + (NECK_EXT[ni][1] - NECK_FOLD[ni][1]) * out;
        dx += (NECK_DOWN[ni][0] - dx) * dn;
        dy2 += (NECK_DOWN[ni][1] - dy2) * dn;
        /* pitch the pose with the torso, then swing it sideways: the
           head turn is spread down the whole neck, not hinged at the
           skull */
        var px = dx * _cp - dy2 * _sp, py = dx * _sp + dy2 * _cp;
        var t = b.neckYaw * NECK_TWIST[ni];
        dir.set(px * Math.cos(t), py, -px * Math.sin(t)).normalize();
        root.set(nx, ny, nz);
        put(R.neck, bi * 3 + ni, root, dir, NECK_SEG[ni], 1);
        nx += dir.x * NECK_SEG[ni];
        ny += dir.y * NECK_SEG[ni];
        nz += dir.z * NECK_SEG[ni];
        lastX = dir.x; lastY = dir.y; lastZ = dir.z;
      }

      /* The head carries on along the last segment — its pitch and yaw
         are read straight off that vector, so every neck pose gets a
         head pointing the right way without a second set of numbers to
         keep in sync. `headTilt` is the cock: one eye rolled down at
         the ground, which herons do constantly and nothing else on this
         shore can do at all. */
      var hyaw = Math.atan2(-lastZ, lastX);
      var hpitch = Math.atan2(lastY, Math.sqrt(lastX * lastX + lastZ * lastZ));
      hpos.set(nx, ny, nz);
      putAt(R.head, bi, hpos, hyaw, hpitch, b.headTilt, 1);

      eul.set(b.headTilt, hyaw, hpitch, 'YXZ');
      qh.setFromEuler(eul);

      /* bill, eyes and plumes all hang off the head's own frame, which
         is what lets the head turn mean anything */
      hoff.set(1, -0.06, 0).applyQuaternion(qh);
      bpos.copy(hpos).addScaledVector(hoff, 0.10);
      put(R.bill, bi, bpos, hoff, BILL_LEN, 1);

      for (var ei = 0; ei < 2; ei++) {
        hoff.set(0.07, 0.06, ei ? 0.075 : -0.075).applyQuaternion(qh).add(hpos);
        putAt(R.eye, bi * 2 + ei, hoff, 0, 0, 0, 1);
      }
      /* the two nape plumes, trailing back off the head — they lie flat
         along the neck when it is speared out and lift when it is not */
      for (var pi = 0; pi < 2; pi++) {
        hoff.set(-0.05, 0.07, pi ? 0.035 : -0.035).applyQuaternion(qh).add(hpos);
        fdir.set(-0.86 - 0.10 * out, 0.22 - 0.30 * out, pi ? 0.10 : -0.10)
          .normalize().applyQuaternion(qh);
        put(R.plume, bi * 2 + pi, hoff, fdir, PLUME_LEN, 1);
      }

      /* wings: folded along the flank, half-open for balance out of a
         hard turn or a landing, or spread and flapping */
      var beat = flying ? Math.sin(b.flap * Math.PI * 2) : 0;
      var open = Math.max(b.wingOut, b.flick);
      for (var wi = 0; wi < 2; wi++) {
        var wside = wi ? 1 : -1;
        pitched(root, SHOULDER.x, SHOULDER.y, 0);
        root.z = wside * SHOULDER.z + b.sway;
        if (open > 0.02) {
          var raise = beat * 0.55 + (1 - b.wingOut) * b.flick * 0.30;
          dir.set(-0.16, raise, wside * 0.98).normalize();
          // folded and spread blend on the direction, so half-open reads
          tmp.set(-0.92, 0.05, wside * 0.30).normalize();
          dir.lerp(tmp, 1 - open).normalize();
          put(R.wing, bi * 2 + wi, root, dir, 0.86 + 0.14 * open, 1);
        } else {
          dir.set(-0.92, 0.02, wside * 0.28).normalize();
          put(R.wing, bi * 2 + wi, root, dir, 0.86, 1);
        }
      }

      pitched(root, TAIL_AT, 0.06, 0);
      root.z = b.sway;
      pitched(dir, -0.96, 0.28, 0);
      dir.normalize();
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

       `near` biases the sample to a ring around the bird, so a walk is
       one leg of a wander over a patch rather than a march across the
       whole flat.
       ------------------------------------------------------------ */
    function findSpot(out, b, near) {
      for (var t = 0; t < 40; t++) {
        var x, z;
        if (near) {
          var a = rand() * Math.PI * 2, r = range(LEG_LEN[0], LEG_LEN[1]);
          x = b.x + Math.cos(a) * r;
          z = b.z + Math.sin(a) * r;
          if (z < Z_RANGE[0] || z > Z_RANGE[1]) continue;
          if (x < -world.simArea.halfX + 6 || x > world.simArea.halfX - 6) continue;
        } else {
          x = range(-world.simArea.halfX + 6, world.simArea.halfX - 6);
          z = range(Z_RANGE[0], Z_RANGE[1]);
        }
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

    /* Is this bird standing in water? The single test that picks which
       of the two foraging modes it is in. Shallow — anything over an
       ankle and findSpot would not have sent it here. */
    function wetFoot(b) {
      var surf = world.waterAt(b.x, b.z);
      return surf !== null && surf - world.heightAt(b.x, b.z) > 0.02;
    }

    /* Worth flying in for: low water, still falling, and light enough to
       hunt in. Egrets are diurnal and roost at night. */
    function canArrive() {
      return !world.isNight && world.tideDir < 0 && world.tide < ARRIVE_BELOW;
    }
    /* And the reasons to give up on the tide. Note this is NOT the
       negation of the one above — the gap between the two marks is what
       keeps a bird working through the bottom of the tide instead of
       leaving the moment the water turns. */
    function mustLeave() {
      return world.isNight || world.tide > LEAVE_ABOVE;
    }

    /* Walk one step toward a target and return the distance still to go.

       The gait phase is advanced by the ground actually covered divided
       by the distance one cycle is WORTH — STRIDE / STANCE body units —
       and that division is the contract that keeps a planted toe
       planted. Anything else and the feet skate.

       A big heading error brakes the walk nearly to a standstill, so
       the bird turns on its feet instead of skidding round the corner
       at full speed. That is also where the wing flick comes from. */
    function stepTo(b, tx, tz, spd, dt) {
      var flying = b.state === 'inbound' || b.state === 'outbound';
      var dx = tx - b.x, dz = tz - b.z;
      var d = Math.sqrt(dx * dx + dz * dz);
      if (d < 1e-4) { if (!flying) b.moving = approach(b.moving, 0, 7, dt); return 0; }

      var want = Math.atan2(dx, dz);
      var da = want - b.yaw;
      while (da > Math.PI) da -= Math.PI * 2;
      while (da < -Math.PI) da += Math.PI * 2;
      var rate = flying ? TURN * 1.6 : TURN;
      b.yaw += Math.max(-rate * dt, Math.min(rate * dt, da));

      var brake = 1;
      if (!flying) {
        brake = Math.max(0.12, 1 - Math.abs(da) / TURN_BRAKE);
        if (Math.abs(da) > TURN_BRAKE * 0.8) b.flick = Math.min(1, b.flick + dt * 2.5);
      }

      var mv = Math.min(d, spd * brake * dt);
      b.x += dx / d * mv;
      b.z += dz / d * mv;
      if (!flying) {
        var cycle = STRIDE / STANCE * S * b.size;      // metres of ground per gait cycle
        b.gait = (b.gait + mv / cycle) % 1;
        b.moving = approach(b.moving, 1, 8, dt);
      }
      return d - mv;
    }

    /* ------------------------------------------------------------
       update
       ------------------------------------------------------------ */
    function update(dt) {
      var arriving = canArrive(), leaving = mustLeave();
      var touched = false;

      for (var bi = 0; bi < N; bi++) {
        var b = birds[bi];

        switch (b.state) {
          /* ---- off the plot entirely ---- */
          case 'away':
            b.act = 'away';
            if (arriving) {
              b.wait -= dt;
              if (b.wait <= 0 && findSpot(spot, b, false)) {
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
                b.neckOut = 0; b.neckDown = 0;
                b.moving = 0; b.bob = 0; b.sway = 0; b.roll = 0; b.pitch = -0.10;
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
            var groundIn = world.heightAt(b.x, b.z);
            if (leftIn < DESCEND_FROM) {
              var k = leftIn / DESCEND_FROM;
              b.y = groundIn + BODY_Y * S * b.size + (CRUISE_Y - groundIn) * k * k;
              b.flap = (b.flap + FLAP_HZ * 0.4 * dt) % 1;   // set the wings and glide in
              /* nose comes up on the approach as the legs swing down */
              b.pitch = -0.10 + 0.34 * (1 - k);
            } else {
              b.y = CRUISE_Y;
              b.pitch = -0.10;
            }
            if (leftIn < 0.25) {
              b.y = groundIn + BODY_Y * S * b.size;
              b.state = 'hunt';
              b.wingOut = 0;
              b.flick = 0.8;                 // wings still half up as it settles
              b.bout = Math.round(range(BOUT[0], BOUT[1]));
              b.freeze = range(0.3, 0.9);
              b.tgtX = b.x; b.tgtZ = b.z;
            }
            break;

          /* ---- working the flat ---- */
          case 'hunt':
            if (leaving) {
              b.state = 'outbound';
              b.wingOut = 1;
              b.neckOut = 0; b.neckDown = 0;
              b.peck = 0; b.stab = 0; b.stir = 0; b.freeze = 0;
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
            b.pitch = -0.10;
            b.moving = 0; b.bob = 0; b.sway = 0; b.roll = 0;
            if (leftOut < 0.5) {
              b.state = 'away';
              b.wait = range(ARRIVE_STAGGER[0], ARRIVE_STAGGER[1]);
            }
            break;
        }

        if (b.state === 'hunt') {
          /* The body's own motion, ALL of it caused by the legs: the
             torso drops between steps and lifts over each one (twice a
             cycle), and rolls and slides onto whichever foot is
             carrying (once a cycle). Nothing here idles — a standing
             bird stands still, which is the entire point of the freeze,
             so every one of these fades to zero when `moving` does. */
          var w = b.moving;
          b.bob = approach(b.bob, w * (-Math.cos(b.gait * Math.PI * 4) * 0.030 - 0.006), 14, dt);
          b.sway = approach(b.sway, w * -Math.sin(b.gait * Math.PI * 2) * 0.055, 14, dt);
          b.roll = approach(b.roll, w * -Math.sin(b.gait * Math.PI * 2) * 0.09, 14, dt);
          b.flick = approach(b.flick, 0, 3.2, dt);
        }

        var visible = b.state !== 'away';
        if (visible) {
          drawBird(b, bi, b.y - BODY_Y * S * b.size);
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
       looking

       Where the head points, driven SEPARATELY from where the body is
       going, because that separation is the animal: a bird walking one
       way while watching the mud off to its left is doing two things at
       once, and doing one thing at a time is most of what made the
       first pass read as a puppet. A walking egret keeps its head low
       and mostly ahead; a stopped one swings it about and cocks it
       over to put one eye on the ground.
       ------------------------------------------------------------ */
    function look(b, dt) {
      b.look -= dt;
      if (b.look <= 0) {
        var busy = b.act === 'wade';
        b.neckYawT = range(-1, 1) * (busy ? 0.30 : 0.85);
        b.headTiltT = rand() < (busy ? 0.15 : 0.40) ? range(-0.7, 0.7) : 0;
        b.look = busy ? range(0.5, 1.6) : range(0.4, 1.4);
      }
      /* Fast to the new angle, then hold it. A head that eases the
         whole way reads as a camera on a gimbal; a real one snaps and
         then locks. */
      b.neckYaw = approach(b.neckYaw, b.neckYawT, 7, dt);
      b.headTilt = approach(b.headTilt, b.headTiltT, 8, dt);
    }

    /* ------------------------------------------------------------
       the hunt

       Two modes, and wetFoot() picks between them. Everything below is
       written so that a bird on drained mud spends its visit WALKING
       and PECKING, and one standing in water spends it frozen and
       striking.
       ------------------------------------------------------------ */
    function hunt(b, dt) {
      /* ---- a strike in progress: nothing else matters ---- */
      if (b.stab > 0) {
        b.act = 'stab';
        b.stab -= dt;
        b.moving = approach(b.moving, 0, 12, dt);
        var into = b.stab / (STAB_SECS + RECOVER_SECS);
        var backFrac = RECOVER_SECS / (STAB_SECS + RECOVER_SECS);
        // out fast, back slow
        b.neckOut = into > backFrac ? 1 : into / backFrac;
        b.neckDown = approach(b.neckDown, 0, 10, dt);
        b.neckYaw = approach(b.neckYaw, 0, 14, dt);
        b.headTilt = approach(b.headTilt, 0, 14, dt);
        b.pitch = approach(b.pitch, -0.08, 10, dt);
        if (b.stab <= 0) {
          b.neckOut = 0;
          b.freeze = range(FREEZE[0], FREEZE[1]);
        }
        return;
      }

      /* ---- a peck in progress ----
         Down, jab, up. The body tips WITH the neck: an egret does not
         reach the mud with its neck alone, it folds the whole front of
         itself down over its feet, and leaving the torso level is what
         turns a peck into a drinking-bird desk toy. */
      if (b.peck > 0) {
        b.act = 'peck';
        b.peck -= dt;
        b.moving = approach(b.moving, 0, 12, dt);
        var u = 1 - Math.max(0, b.peck) / PECK_SECS;
        var reach;
        if (u < PECK_DOWN / PECK_SECS) {
          reach = smooth(u / (PECK_DOWN / PECK_SECS));
        } else if (u < (PECK_DOWN + PECK_JAB) / PECK_SECS) {
          /* two quick jabs at the bottom, each giving back a sixth of
             the reach — small, fast, and the beat that says the bird
             is working something out of the sediment */
          var j = (u - PECK_DOWN / PECK_SECS) / (PECK_JAB / PECK_SECS);
          reach = 1 - 0.16 * Math.abs(Math.sin(j * Math.PI * 2));
        } else {
          var upf = (u - (PECK_DOWN + PECK_JAB) / PECK_SECS) / (PECK_UP / PECK_SECS);
          reach = 1 - smooth(Math.min(1, upf));
        }
        b.neckDown = reach;
        b.neckOut = approach(b.neckOut, 0, 12, dt);
        b.pitch = approach(b.pitch, -0.34 * reach, 12, dt);
        b.neckYaw = approach(b.neckYaw, b.neckYawT * 0.25, 10, dt);
        b.headTilt = approach(b.headTilt, 0, 10, dt);
        if (b.peck <= 0) {
          b.neckDown = 0;
          b.freeze = range(0.25, 0.7);
          b.look = 0;                 // and it looks somewhere new straight after
        }
        return;
      }

      /* ---- foot-stirring ----
         A little egret vibrates one foot in the sediment to flush
         whatever is hiding in it, then watches the spot. Small, odd,
         and unmistakably this species. */
      if (b.stir > 0) {
        b.act = 'stir';
        b.stir -= dt;
        b.moving = approach(b.moving, 0.4, 8, dt);
        b.gait = (b.gait + dt * 3.0) % 1;
        b.neckDown = approach(b.neckDown, 0.55, 6, dt);
        b.neckOut = approach(b.neckOut, 0, 6, dt);
        b.pitch = approach(b.pitch, -0.16, 6, dt);
        look(b, dt);
        if (b.stir <= 0) b.freeze = range(0.4, 1.1);
        return;
      }

      var wet = wetFoot(b);

      /* ---- standing ----
         In water this is the long freeze the family is famous for. On
         mud it is the short pause between pecks, and the difference in
         LENGTH is most of what separates the two modes on screen. */
      if (b.freeze > 0) {
        b.act = 'freeze';
        b.freeze -= dt;
        b.moving = approach(b.moving, 0, 9, dt);
        b.neckOut = approach(b.neckOut, wet ? 0.12 : 0, 3, dt);
        b.neckDown = approach(b.neckDown, wet ? 0.10 : 0.34, 5, dt);
        b.pitch = approach(b.pitch, wet ? -0.05 : -0.16, 5, dt);
        look(b, dt);
        if (b.freeze <= 0) choose(b, wet);
        return;
      }

      /* ---- walking ----
         Head low and forward, which is the foraging carriage: an egret
         crossing the flat is already looking at it. */
      b.act = 'wade';
      b.neckOut = approach(b.neckOut, 0, 5, dt);
      b.neckDown = approach(b.neckDown, 0.40, 5, dt);
      b.pitch = approach(b.pitch, -0.20, 5, dt);
      look(b, dt);
      var left = stepTo(b, b.tgtX, b.tgtZ, (wet ? STALK : WALK) * b.speed, dt);
      if (left < 0.10) {
        b.bout = Math.round(range(BOUT[0], BOUT[1]));
        b.freeze = wet ? range(FREEZE[0], FREEZE[1]) : range(PAUSE[0], PAUSE[1]);
      }
    }

    /* What a standing bird does next, and the odds ARE the behaviour:
       in water it mostly waits and strikes, on mud it mostly pecks and
       then moves on. `bout` is what stops it pecking the same square
       foot of mud forever — a few actions and the patch is worked out,
       so it walks a proper leg to another one. */
    function choose(b, wet) {
      var r = rand();
      if (wet) {
        if (r < STAB_ODDS) { b.stab = STAB_SECS + RECOVER_SECS; return; }
        if (r < STAB_ODDS + STIR_ODDS) { b.stir = range(STIR_SECS[0], STIR_SECS[1]); return; }
      } else if (b.bout > 0) {
        b.bout--;
        if (r < PECK_ODDS) { b.peck = PECK_SECS; return; }
        if (r < PECK_ODDS + STIR_ODDS) { b.stir = range(STIR_SECS[0], STIR_SECS[1]); return; }
        /* a pace or two sideways to the next likely bit of mud */
        if (findSpot(spot, b, true)) {
          b.tgtX = b.x + (spot.x - b.x) * range(0.10, 0.30);
          b.tgtZ = b.z + (spot.z - b.z) * range(0.10, 0.30);
          return;
        }
      }
      /* patch worked out — walk a full leg of the wander */
      if (findSpot(spot, b, true) || findSpot(spot, b, false)) {
        b.tgtX = spot.x; b.tgtZ = spot.z;
        b.bout = 0;
      } else {
        b.freeze = range(PAUSE[0], PAUSE[1]);
      }
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
      },

      /* A bird mid-strike, or the nearest one working the flat (§48).

         Same shape as `octopuses.inkAt` and for the same reason: the
         stab lasts under a second and fires on STAB_ODDS, so a shot
         cannot be aimed at it in advance — it polls. Unlike the ink
         this falls back to a hunting bird rather than to null, because
         a heron standing head-down in two inches of water is a shot in
         its own right and the strike is the bonus. Returns the bird,
         so a caller can keep riding the same one after `stab` has run
         down rather than jumping to whichever bird stabs next. */
      striker: function () {
        var i4;
        for (i4 = 0; i4 < N; i4++) if (birds[i4].state !== 'away' && birds[i4].stab > 0) return birds[i4];
        for (i4 = 0; i4 < N; i4++) if (birds[i4].state === 'hunt') return birds[i4];
        for (i4 = 0; i4 < N; i4++) if (birds[i4].state !== 'away') return birds[i4];
        return null;
      }
    };
  }

  window.Egrets = { spawn: spawn, SCALE: S };
})();
