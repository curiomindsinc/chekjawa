/* ============================================================
   otters.js — the smooth-coated otter (BUILD_GUIDE §42 and §43, roster item
   1 of 1). THE LAST ANIMAL ON THE ROSTER.

   It is here to do three things nothing else on this shore does.

   1. IT IS THE APEX. `foodweb.js:28` has carried a note since §9
      saying to add an `APEX PREDATORS` row above `PREDATORS` when the
      otter arrives. This is when. Every predator below it is also
      somebody's prey or is simply too small to matter to anything;
      nothing eats an otter.

   2. IT MOVES AS A FAMILY. Every population before this one is a
      scatter of individuals that happen to share a species and a band
      — eighty fiddler crabs each mind their own burrow, five egrets
      each work their own patch, six octopuses each keep their own den
      fifteen metres from the next. A smooth-coated otter romp is ONE
      ANIMAL made of six: they arrive together, swim in a loose
      formation, dive out of it and rejoin it, haul out together and
      leave together. The group is the unit of decision here, and the
      individuals only ever break formation for a fish.

   3. IT ACTUALLY KILLS. The goby (§40) is the only species on this
      shore that can die, and until now the only thing that killed one
      was a falling tide and a heron that got lucky. The otter is the
      first PREDATOR that is a real mortality path rather than a
      demonstration, and it reuses the goby's own one-in-one-out
      bookkeeping so nothing grows and no population model appears
      that nobody asked for.

   THE OTHER VISITOR, ON THE OPPOSITE TIDE. The little egret (§30) is
   the shore's low-water visitor: it drops in behind the falling water,
   works the drained flat, and is pushed off by the flood. This animal
   is the mirror of that, and deliberately so — a romp needs water to
   swim in, so it comes in ON THE FLOOD and leaves as the flat drains.
   Between them the shore is visited from outside at both ends of the
   cycle by two apex-ish predators that never meet, which is the same
   trick the fiddler crab and the swimming crab play from below (§36)
   played one level up.

   WHAT DRIVES A ROMP, in priority order:
     1. is there water, is it day, is the tide high enough — if not, away
     2. is the flat draining past LEAVE_BELOW      — then go, seaward
     3. has it been out long enough                — haul out on the bar
     4. otherwise                                  — work the flat

   and what drives ONE OTTER inside that:
     1. is there a fish within reach — leave formation and dive at it
     2. am I holding one            — surface and chew it
     3. otherwise                   — hold my slot in the formation

   THE §39/§41 OVERLAP CHECK, DONE FIRST AND IN BOTH AXES:

     sand goby   0.10 - 1.75 m CD, resident, always on the plot   OVERLAPS
     octopus     out of its den whenever there is 0.55 m over it  OVERLAPS
     fiddler     1.8 - 2.2 m CD, and down the burrow when wet          no
     egret       arrives BELOW 1.30 m CD and falling                   no

   The goby is resident and in the water at every tide this animal
   visits on, so the hunt fires. The octopus is out of its den on
   anything but a spring low, so the ink fires. The fiddler is on a
   band that is either dry — where a swimming otter never goes — or
   flooded, in which case the crab is underground; and the egret is
   gone before the otter arrives by construction. Two wirings written,
   two declined, and all four decided by reading constants rather than
   by running a scan and counting zero.

   IT PUSHES, AND THAT IS NEW. Every wiring since §27 has been a PULL:
   the prey looks for the predator and the predator has never heard of
   it. That works when the interaction is the PREY's behaviour — a
   crab bolting, a pen shell clapping, a fish diving into an anemone.
   It does not work here, because the interaction IS the predator's
   behaviour: a romp picks a fish, chases it down, and comes up with
   it. So this file reads `gobies.fish`, writes `scared` onto the ones
   it passes, and calls `gobies.take()` on the one it catches — the
   same shape as the anemonefish writing `host.guests` (§39), which
   was the first crack in the rule and this is the second.

   The ink is the other way round, and stays a pull: octopuses.js
   looks for otters. An octopus meeting an otter is entirely the
   octopus's problem.

   RENDERING. Twenty InstancedMeshes. Six are the fittings — ears (2),
   eyes (2), whiskers (6), leg segments (8), feet (4) and the fish (1),
   the last drawn only while an animal is actually holding one. The
   other fourteen are the BODY, which is not a torso, a neck, a head
   and a tail any more but one chain of links from the tail tip to the
   nose: otterbody.js cuts a single nose-to-tail profile into fourteen
   pieces and this file drops them along a centreline, so the animal
   bends without any join being able to open. See its ONE SURFACE
   block, and drawBody below.
   ============================================================ */
(function () {
  'use strict';

  var TAU = Math.PI * 2;

  /* ---------- the knobs ---------- */
  /* Metres per body unit, and the body unit is the TORSO — rump to
     shoulder joint. It drops from 0.70 to hold the animal at the size
     it already was: `Otter.obj` is 2.82 torso lengths nose to tail
     where the swept body was 2.50, so at the old scale the otter would
     have grown 13% and quietly changed the meaning of every metre
     tuned against it — HAUL_R, TAKE_R, the romp's own spacing. Baked
     by tools/bake-otter.js, which computes it from the mesh. */
  var S = OtterMesh.S;           // 0.6195; nose to tail ~1.75 m, as before
  var COUNT = 6;                 // one romp. Real ones run 4-8 and are family groups

  /* ---------- when it comes, and when it goes ----------
     The egret's hysteresis (§30), inverted. Two marks and not one, or
     an animal sitting on the threshold flickers in and out; and a
     direction test, so arrivals happen behind the ADVANCING waterline
     rather than at the same height on the way back down.

     Against tide.js's envelope — spring low 0.13, neap low 1.00, neap
     high 2.20, spring high 3.10 — 1.55 is cleared on every cycle
     including neaps, so unlike the egret (whose big days are the
     spring lows) this animal's schedule does not care about the
     spring/neap envelope at all. That would put a romp on the shore
     something like half of all time, which is far too much presence
     for an apex predator, so VISIT_ODDS declines most of the
     opportunities. A romp working a coast has a range of many
     kilometres and this plot is one stop on it. */
  var ARRIVE_ABOVE = 1.20;       // metres CD — swims in once the flood passes this
  /* Deliberately close under ARRIVE_ABOVE. Leaving on the bare TURN
     of the tide caps a visit at about 37 seconds — the flood only runs
     from 1.55 to its peak for a fraction of a cycle — and that is not
     long enough to work the flat, travel to the waterline and lie on
     it, so the haul-out starved a second time. Lingering over the top
     of the tide and going once the ebb has actually made some water is
     both what buys the time and what a real romp does. */
  var LEAVE_BELOW = 1.05;        // and out again once the ebb drops under it
  var VISIT_ODDS = 0.5;          // chance a given qualifying tide actually brings them
  var VISIT_MAX = [95, 160];     // seconds — they move on whether or not the tide turns

  var SWIM_DEPTH = 0.45;         // metres of water a romp will cross
  var HAUL_DEPTH = 0.14;         // and the depth of a bar shallow enough to lie on
  /* THE WHOLE FLOODED SHORE, not just the low end. The first pass
     fenced this at z 30 — the lagoon, the bar and the channel — and
     that one number silently killed the haul-out: measured against the
     transect, the only ground shallow enough to lie on at the tides
     this animal visits is the UPPER MUDFLAT waterline, which sits at
     z ~2 at 1.55 m CD and marches landward to z ~-72 at a spring high.
     It is never more than 13-28 m from swimmable water, so it was
     always reachable; it was simply outside the fence. See §42. */
  var Z_RANGE = [-60, 71];       // the flooded flat, the lagoon, the bar and the channel
  var SEA_Z = 68;                // where they come in from and go back out to

  var SWIM = 2.20;               // m/s cruising in formation. The plot is 144 m across
                                 // and a visit is a couple of minutes — at a real otter's
                                 // 1.4 m/s cruise the romp cannot cross it and back
  var CHASE = 3.1;               // m/s after a fish — twice a goby's DART
  var TURN = 2.4;                // rad/s
  var PORPOISE_HZ = 0.75;        // the slow rise-and-fall of a cruising romp

  /* ---------- the formation ----------
     Slots are metres BEHIND and BESIDE the romp's own point, in its
     frame of travel. They fan out rather than trailing in a line: a
     real romp swims abreast on open water and strings out only in a
     channel, and abreast is also the only arrangement in which six
     animals are all visible at once. */
  var SLOT_BACK = 1.15;          // metres per rank
  var SLOT_SIDE = 1.55;          // metres per file
  var SLOT_JITTER = 0.55;        // and how much each animal wanders inside its slot
  var SLOT_HZ = 0.11;            // how fast that wander drifts

  /* ---------- the hunt ---------- */
  var SCAN_SECS = 0.45;
  var HUNT_R = 7.0;              // metres it will leave formation for a fish
  var GIVE_UP = 5.5;             // seconds of chase before it gives up and rejoins
  var TAKE_R = 0.55;             // metres — close enough to have it, and see below: in 3D
  /* How far above the fish a diving otter levels off, in body units.
     The animal is about 0.19 body units from its axis to its belly, so
     0.30 puts the belly just clear of the prey rather than through it.
     `floorMin` still has the last word when the goby is on the bed,
     which is where a goby usually is. */
  var DIVE_CLEAR = 0.30;
  var SCARE_R = 5.0;             // and how far the fish can tell it is coming
  var CHEW_SECS = [3.0, 5.5];    // seconds at the surface with the fish in its jaws
  var HUNT_COOL = [9, 24];       // and how long before that animal hunts again
  /* Most chases fail. A goby in open water is fast, and without this
     the romp farms the population — a first run put 56 kills into a
     54-fish population over ten tide cycles, which is not predation,
     it is harvesting. */
  var CATCH_ODDS = 0.45;
  /* The surfaced kill is a FLOAT, not a hover — an otter on its back
     with a fish held in its forepaws, the way the reference shot has
     it, not upright and treading water. */
  /* BELLY-UP, and it is back for good. §42 chose the raft off a
     reference shot; a later section set this to 0 and turned the
     animal belly-down, which the user had not asked for. Restored on
     their word: an eating otter floats on its back with the fish on
     its chest and its head clear of the water.

     ATT.catch carries the rest of the posture and its pitch reads
     BACKWARDS against every other state, because the roll is applied
     after it (see setBody): +0.28 lifts the muzzle out of the water,
     where +0.55 on `dive` drives the nose under. Measured with
     tools/probe-catch.js, which asks the two questions this posture is
     about — is the belly up, and is the head out — in world metres
     against world.waterAt(). Run it after touching any of these. */
  var CATCH_ROLL = Math.PI * 0.90;  // 0 = belly-down; Math.PI * 0.90 = on its back
  var CATCH_ROCK = 0.06;            // rad either way — the roll breathes rather than locking
  var CATCH_BOB  = 0.05;            // body units of vertical bob, softer than the swim porpoise
  var CATCH_BOB_HZ = 0.55;
  var CATCH_DRIFT = 0.10;           // m/s — a slow meander, not travel

  /* ---------- hauling out ---------- */
  var WORK_SECS = [6, 12];       // seconds working the flat between haul-outs
  var HAUL_SECS = [8, 16];       // and how long they lie on the bar
  /* NOT how far it will travel — how close the waterline has to be
     before the romp takes the chance. At 60 m the trip was 32 seconds
     and the ebb cut it short every time: `tohaul` ran 3% of the clock
     and converted to `haul` exactly never. The up-shore bias in
     `swimSpot` already walks the group toward the waterline during
     the work legs, so the haul-out is something it arrives NEXT TO
     rather than something it sets off for. */
  /* PUT BACK UP, because the cut was treating the symptom. The trip
     was never too long in METRES — it was too long against a clock
     nothing was checking (see `work`). Now that the romp prices the
     swim against the water it actually has left, a far haul-out is
     simply one it declines early in the visit and takes when the
     numbers allow, instead of one it can never see at all.

     70 m is what the transect requires. The romp comes in from the
     channel at z 68 and the only ground shallow enough to lie on is
     the waterline at z ~2 and landward — 50 m from where it arrives on
     the best of these tides, and further on the bigger ones. At 30 m
     the group could not see the bar until it had wandered most of the
     way there, by which time the tide had turned: three trips started
     and one finished across 900 seconds. */
  var HAUL_R = 70;               // metres — how far off a haul-out can be and still be worth it
  var HAUL_CHECK = [2.5, 5];     // and how often the romp re-prices the trip while working

  /* ---------- drying off ----------
     A wet otter is nearly black and a dry one is milk chocolate.
     otterbody.js bakes it between the two on purpose (§41's lesson,
     one species on) so instanceColor has room to go both ways. */
  var WET = [0.62, 0.58, 0.55];
  var DRY = [1.16, 1.12, 1.06];
  var DRY_RATE = 0.055;          // 1/s out of the water — about 20 s to dry off
  var WET_RATE = 1.8;            // and it re-wets in one duck under

  /* ---------- body layout, in body units (torso length = 1) ----------
     Origin at the SHOULDER. The torso runs BACK from it to the rump at
     -1.0, the neck and head run forward, the tail carries on out of
     the rump — so every part is placed from one landmark and the
     animal cannot come apart at the joins.

     `sweep`'s t=0 is the rump (§39, and octopusbody.js's header). */
  /* These follow otterbody.js's measured rebuild against the GLB
     reference — see that file's header. Anything here that feeds the
     GAIT (L_UPPER, L_LOWER, STRIDE, the LIFTs) is deliberately left
     where it was: the walk is solved against those numbers and the
     reference's stubbier legs are not worth re-tuning a working gait
     for. Everything below is silhouette only. */
  /* The animal is the mesh now, so these come off it. HEAD_AT is where
     the skull starts, in body-local x, and the face fittings are
     placed forward of it. */
  var HEAD_AT = OtterMesh.X_TIP + (OtterMesh.X_NOSE - OtterMesh.X_TIP) * OtterMesh.S_NECK_END;
  var HEAD_LEN = OtterMesh.X_NOSE - HEAD_AT;
  /* WHERE THE FISH RESTS is not typed any more — see `headTip` and the
     CHEST_X/CHEST_Y derived from it beside the centreline. It used to
     be (-0.05, -0.20), chosen to sit between the raised forepaws, and
     that was fine while the head never moved. Once the head reaches,
     the food has to be where the mouth is GOING to be, and only the
     centreline knows that. Typing both is how they come to disagree —
     which is the same mistake as a typed skull radius (§43) and a typed
     eye socket (§47), for the third time on this animal. */
  /* 1.04 torso lengths in the GLB, against the 0.68 this animal was
     drawn with — a third of the tail was simply missing, and on a
     mustelid that is most of the outline. */
  var TAIL_LEN = (OtterMesh.X_NOSE - OtterMesh.X_TIP) * OtterMesh.S_RUMP;
  /* THE WHISKER PAD, AND NOTHING ELSE ANY MORE. The eyes and ears used
     to be placed here too; `Otter.obj` has its own, so they are skin
     now and cannot be misplaced at all.

     NOT ONE OF THESE THREE NUMBERS IS A DISTANCE, and that is the
     point. `at` is a fraction ALONG THE HEAD, `y` and `z` are a
     DIRECTION out of the centreline, and how far out the skin actually
     is at that station is otterbody.js's `halfW`/`halfH` to answer —
     measured off whatever mesh is currently the animal. See `onSkin`.

     §43 learned half of this the hard way: the fittings were typed
     radii, the body was rebuilt, and every one of them ended up inside
     the head — 100% of the ear and eye, 93% of the whiskers. The
     radius was fixed then. The x was NOT, and this rebuild caught it:
     the pad sat at a fixed 0.41, the nose moved from 0.46 to 0.70, and
     the whiskers came out of the animal's cheek. Both coordinates are
     relative now. */
  var WHISK = { at: 0.81, y: 0.015, z: 0.058 };   // 81% along the head — the muzzle side
  /* ------------------------------------------------------------
     THE FOUR LIMBS, NOW MEASURED RATHER THAN CHOSEN (§44).

     Every one of these used to be a typed number, and §42 said so out
     loud: "LENGTHS ARE DELIBERATELY LEFT ALONE — the reference's own
     stubbier legs are not worth re-tuning a working walk for." That
     was a fair trade while the body was swept procedurally around
     whatever legs the gait wanted. It stops being one the moment the
     SKIN comes from the mesh: a vertex is bound to the bone the bake
     fitted, so if the rig's bone is a different length from the fitted
     one the leg stretches or telescopes inside its own skin.

     So they are read straight off `ottermesh.js`, which fitted them
     from each limb's own vertex cloud. Two consequences worth naming:

     THE SEGMENTS ARE NOT EQUAL AND NOT THE SAME FRONT AND BACK. A
     forelimb here is 0.16 upper on 0.29 lower — a short scapula over a
     long forearm — and a hind limb is 0.20 on 0.19. The IK already
     solved the general case (law of cosines on two lengths), so this
     costs nothing; it was simply never asked for anything but 0.20
     against 0.20.

     THE HIPS SIT WIDER APART AND LOWER. Fore at x 0.00 against the old
     -0.13, hind at -0.96 against -0.78, and both about 0.08 further
     under the body, because this animal is deeper through the chest
     than the swept one was.

     And the knee's SIGN is now measured instead of asserted. §42 hand-
     signed `rx = fore ? -1 : 1` — elbow back, stifle forward — and the
     fitted joints agree: the fore knee lands behind both hip and ankle,
     the hind knee in front of both. */
  var LIMB = OtterMesh.limbs;
  var HIP_X = [LIMB[0].hip[0], LIMB[1].hip[0], LIMB[2].hip[0], LIMB[3].hip[0]];
  var HIP_Y = [LIMB[0].hip[1], LIMB[1].hip[1], LIMB[2].hip[1], LIMB[3].hip[1]];
  /* HIP_Z IS A MAGNITUDE, and has to be. The fitted hips carry their
     own sign — limb 1 and 3 come off the bake at negative z — but all
     three readers here write `side * HIP_Z[l]`, and `side` is already
     the left/right sign. Passing the signed value through cancelled it
     and put BOTH left limbs on the right of the centreline: measured,
     over 3000 walk frames, fore-L paw z median +0.057 where fore-R sat
     at +0.171 and the rest pose has them at -0.181 and +0.181. The
     splay at line ~888 says the same thing on its own — `side *
     (HIP_Z[l] + WALK_SPLAY)` only widens a stance if HIP_Z is a width.
     It dates from §42, when HIP_Z was a single hand-typed number and
     the sign genuinely lived in HIP_SIDE alone. */
  var HIP_Z = [Math.abs(LIMB[0].hip[2]), Math.abs(LIMB[1].hip[2]),
               Math.abs(LIMB[2].hip[2]), Math.abs(LIMB[3].hip[2])];
  var HIP_SIDE = [1, -1, 1, -1];
  function seg(a, b) { return Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]); }
  var L_UP = [], L_LO = [], L_FT = [];
  (function () {
    for (var l = 0; l < 4; l++) {
      L_UP.push(seg(LIMB[l].hip, LIMB[l].knee));
      L_LO.push(seg(LIMB[l].knee, LIMB[l].ankle));
      L_FT.push(seg(LIMB[l].ankle, LIMB[l].toe));
    }
  })();
  /* kept as scalars for the few places that want "a leg's reach" without
     caring which leg — the longest, so a clamp is never too tight */
  var L_UPPER = Math.max.apply(null, L_UP), L_LOWER = Math.max.apply(null, L_LO);
  var FOOT_LEN = Math.max.apply(null, L_FT);
  /* How far above the sand a limb is allowed to finish, in body units.
     Not zero: a paddle lying exactly in the plane z-fights the terrain
     it is lying on. */
  var FLOOR_CLEAR = 0.02;

  /* ---------- crawling on the sand ----------
     THE FIRST PASS SAID THIS ANIMAL NEVER WALKS, AND THE MEASUREMENTS
     SAID OTHERWISE. otterbody.js's header argued that a romp arrives
     swimming, works the flat swimming and hauls out only to LIE DOWN,
     so there was no gait to get wrong. Two things falsified it. The
     "ground has the last word" rule labels any animal on dry sand
     `haul` whatever the group is doing, and that is 5.5% of all otter
     frames — most of it while the animal is still steering toward its
     slot. And once the haul-out started converting, `tohaul` began
     crossing ground the ebb had already drained. Both draw a sprawled,
     lying otter travelling across sand on its belly.

     A behaviour that never fires is not modelled (§31); a behaviour
     that fires while posed as a different one is worse, because it
     looks like a bug rather than an omission.

     THE PHASE IS DRIVEN BY DISTANCE, NOT BY TIME, and that is the
     whole trick. A foot in stance has to hold its WORLD position while
     the body moves over it, so advancing the cycle by metres travelled
     makes the body-local backward slide of a planted foot exactly
     equal to the distance the body advanced — zero slip, at any speed,
     with no clock to tune against the steering. Time-driven phase is
     what makes a walk cycle skate, and no gait constant fixes it.

     This is also the one limb on this animal that §36's rule sends to
     IK rather than to posing: a foot in stance has a job to do on the
     ground and must stay planted. The paddle, mid-stroke, does not. */
  var LAND_SPEED = 1.20;         // m/s on sand — a bounding otter, not a swimming one
  var WALK_ON = 0.30;            // m/s — above this, on land, it is walking
  var WALK_OFF = 0.10;           // and below this it has settled down to lie. Hysteresis,
                                 // or an animal on the threshold flickers between postures
  /* Ride height, in body units, measured off the mesh rather than
     chosen: the model was built STANDING, so the gap between its body
     axis and its own toes IS the height this animal holds itself at.
     Taking it from anywhere else puts the feet through the sand or the
     belly in the air, and neither is visible in code review. */
  /* Ride height, in body units, ASKED OF THE MESH rather than typed.
     These were 0.52 and 0.24 with a comment saying they had been
     measured off the model, which was true when it was written and
     silently stopped being true when the model was replaced: the
     small-clawed otter's legs are shorter, its toes hang 0.476 below
     the body axis instead of 0.520, and standing it at 0.52 asks the
     walk's IK to reach four and a half centimetres of ground that is
     not there. `bake-otter.js` measures both now and ships them.

     TOE_DROP is where the feet are, so it IS the standing height.
     BELLY_DROP is the deepest part of the torso; a lying animal settles
     a little INTO the sand rather than balancing on its own belly, and
     0.86 is the fraction the old pair of numbers stood in. */
  var WALK_LIFT = OtterMesh.TOE_DROP;
  var HAUL_LIFT = OtterMesh.BELLY_DROP * 0.86;
  var STRIDE = 0.90;             // body units the animal advances per gait cycle
  var DUTY = 0.62;               // fraction of that cycle a given foot is planted
  var STEP_LIFT = 0.10;          // how high a foot is picked up through the swing
  var WALK_BOB = 0.020;          // the back humping through the bound
  var WALK_SPLAY = 0.045;        // feet a little wider than the hips on land
  /* Diagonal couplets: fore-right with hind-left, fore-left with
     hind-right. Limbs are [fore-R, fore-L, hind-R, hind-L]. */
  var GAIT_PH = [0, 0.5, 0.5, 0];
  /* How fast a leg gives back the phase it borrowed for a corrective
     step, as a fraction of the phase the distance just advanced. Below
     1 by construction: at 1 the leg would hang in the air for ever,
     and above it the phase would run backwards. */
  var GAIT_REPAY = 0.5;

  /* ---------- the four postures ----------
     Per limb PAIR: the angle the upper segment makes from straight
     DOWN toward BACKWARD, the extra bend at the joint, and how far the
     limb splays out to its side. Fore and hind differ in every row,
     which is most of what makes a swimming mustelid read correctly —
     the front legs tuck in against the chest and the back ones do the
     work.

               foreAng foreKnee foreSplay  hindAng hindKnee hindSplay  paddle
     swim      tucked back and in         extended back, paddling      yes
     dive      the same, harder                                        yes
     catch     forelegs UP, holding                                    no
     haul      sprawled flat, sideways                                 no  */
  var POSE = {
    swim:  [1.42, 0.30, 0.16,  1.30, 0.34, 0.30, 1.00],
    dive:  [1.55, 0.22, 0.12,  1.42, 0.26, 0.24, 1.30],
    /* THE FOREPAWS HOLD THE FISH. Solved rather than chosen: the food
       sits where the curled muzzle reaches (see headTip), and these two
       angles are the two-link solution that puts the paw on it —
       0.544 of the limb's 0.600 of reach, so it is not straining. The
       upper arm passes -PI/2 and therefore points forward and UP, which
       is what brings the hands in front of the chest instead of leaving
       them trailing at the hips where the old numbers had them
       (measured: paw at x -0.360, splayed to z 0.406, nowhere near the
       food it was supposed to be holding).
       The splay is NEGATIVE so the paws come in off the hips toward
       the fish — but only part way. Taken all the way to the midline
       they arrive where the MUZZLE already is and push through the jaw;
       an otter holds food with a hand either side of it, not with both
       hands in its own mouth. */
    catch: [-1.924, 0.909, -0.05,  1.20, 0.55, 0.40, 0.15],
    haul:  [0.35, 0.95, 1.05,  0.40, 1.05, 1.10, 0.00],
    away:  [1.42, 0.30, 0.16,  1.30, 0.34, 0.30, 0.00],
    /* Never read for the limbs — a walking animal's are solved, not
       posed — but `ease` still runs through it, so it holds the
       posture the legs settle INTO when the animal stops and lies
       down. Legs under the body, not streamed out behind it. */
    walk:  [0.55, 0.70, 0.30,  0.60, 0.75, 0.34, 0.00]
  };
  /* Body attitude: nose-down pitch, how far the torso axis sits below
     the water surface, the tail's own droop, and roll about the body's
     own long axis — read by every state but only ever nonzero for
     `catch`, which is the one posture drawn belly-up.

     AND IN `catch` THE FIRST TWO COLUMNS READ INVERTED, because that
     roll is applied after the pitch. +0.28 pitch is the muzzle coming
     UP out of the water (the same +0.55 on `dive` puts it under), and
     the sink lifts what it would otherwise sink. The numbers are what
     probe-catch.js measures as: nose 0.29 m clear of the surface, the
     whole head clear at the bottom of the bob, the fish 0.27 m up on
     the chest, and 0.28 m of back under the water — an animal lying
     IN the water rather than on it. -0.55 pitch, which is what stood
     here while the animal was belly-down, rolls into a muzzle 0.14 m
     UNDER the surface, and 0 leaves it lying too high with its chin
     awash. */
  var ATT = {
    //       pitch  sink   tailDip  roll
    swim:  [ 0.02,  0.11,  0.10,    0],
    dive:  [ 0.55,  0.42,  0.30,    0],
    catch: [ 0.28, -0.02, -0.05,    CATCH_ROLL],
    haul:  [ 0.00,  0.00,  0.02,    0],
    away:  [ 0.02,  0.11,  0.10,    0],
    walk:  [ 0.00,  0.00,  0.06,    0]     // level, and the tail drags
  };
  var POSE_RATE = 3.2;
  var PADDLE_HZ = 2.4;

  /* ---------- how hard the body itself flexes ----------
     One scalar per state, eased like everything else, feeding the
     centreline's travelling wave. It is NOT the same thing as the
     paddle: the limbs can be still while the spine is working, which
     is exactly what a porpoising otter does.

     UNDULATE is the amplitude in body units at the tail tip, where
     the wave is largest. Small on purpose — a body this long turns a
     couple of centimetres of offset into a very readable ripple, and
     the failure mode is a swimming otter that looks like an eel. */
  var UNDULATE = 0.085;
  var FLEX = {
    swim:  1.00,
    dive:  1.30,      // driving hard, and the whole body is in it
    catch: 0.22,      // floating on its back, just riding the water
    haul:  0.05,      // lying on sand: almost nothing, but not zero
    away:  0.70,
    walk:  0.60       // a bounding otter's back humps through the stride
  };
  var FLEX_RATE = 2.6;
  /* How much of the animal's own turn rate becomes a sideways bend,
     and how fast that reading follows. A turn is a lean into the arc,
     not a pivot. */
  var BEND_GAIN = 0.55, BEND_RATE = 3.0, BEND_MAX = 1.0;
  /* How far the head turns and nods on its own, in radians. Kept small
     — this is an animal glancing about, not one shaking its head.

     THIS MOVES THE WHISKERS AND NOTHING ELSE, and it is worth being
     clear about that because it looks like it moves the head. `draw`
     builds a head frame out of it and hangs the whisker fan on that
     frame; the SKULL is skinned off `spineAt`, which has never heard
     of it. For an idle glance that is a fair trade — the muzzle
     furniture moves, the silhouette does not, and nobody has ever
     noticed. It is not a fair trade for reaching at something. */
  var HEAD_LOOK = 0.28, HEAD_NOD = 0.16;

  /* ------------------------------------------------------------
     REACHING FOR THE FISH IT IS HOLDING.

     A `catch` otter floats belly-up with the fish on its chest at
     (CHEST_X, CHEST_Y) and, until now, stared straight ahead at the
     sky for the whole three to five seconds. What it should be doing
     is bending its neck down over the food and working at it, turning
     its head as it goes — WITHOUT the body following, because the body
     is a raft and the animal is balanced on it.

     SO THIS BENDS THE CENTRELINE AND NOT A FRAME. `spineAt` is what
     the skull is skinned off, so an aim that is applied anywhere else
     moves the whiskers and leaves the head behind (see HEAD_LOOK). The
     bend is applied FORWARD OF THE SHOULDER ONLY and ramped as t^2, so
     the chest and everything behind it do not move at all and the
     curve is all in the neck and skull — which is the difference
     between an otter looking down at its meal and an otter jack-
     knifing in the water.

     The roll is untouched. `catch` still rolls the animal onto its
     back, which is what it does and what §42's reference shot shows;
     belly-up, -y in body-local is the animal's own chest, so bending
     the head toward -y is bending it toward the food and not away.

     A TRANSLATION IS NOT A REACH, and the first version was one. It
     dropped the centreline 0.22 body units at the nose, because a y
     offset is what every other thing this rig does to the spine is
     made of. Measured, that pitched the muzzle 27 degrees and moved
     the nose along the body axis by nothing whatsoever — x stayed at
     0.640 with the fish 0.69 body units behind it. The head sagged
     toward the water in front of the animal and never came near the
     food, which is exactly what "the neck and head did not bend toward
     the food" describes.

     Reaching needs jx, and jx needs an arc. See L_NECK, further down,
     next to the centreline it bends. */
  /* How far the neck curls at full reach, in radians — the knob for how
     hard the animal folds over its food. CHEST_X/CHEST_Y are derived
     from it, so moving it moves the fish to match. */
  var AIM_CURL  = 0.90;
  var FOOD_GAP  = 0.05;          // how far BEYOND the muzzle the food is held
  var AIM_SWING = 0.085;         // and how far it sweeps side to side, working at it
  /* CYCLES A SECOND, off the chew clock and not off `wob`. `wob` is the
     formation-wander phase and it advances at SLOT_HZ = 0.11 a second,
     so driving the sweep from it ran the head through one turn every
     fifteen seconds against a hold that lasts three to five: measured
     0.048 body units of sweep where the amplitude asks for 0.170.
     `chew` is already a per-animal countdown in real seconds. */
  var AIM_HZ    = 0.45;
  var AIM_RATE  = 2.2;           // how fast the reach is taken up and given back

  var seed = 5150021;
  function rand() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
  function range(a, b) { return a + rand() * (b - a); }
  function pair(p) { return range(p[0], p[1]); }

  var UP = new THREE.Vector3(0, 1, 0);
  var FWD = new THREE.Vector3(0, 0, 1);
  var AXIS_X = new THREE.Vector3(1, 0, 0);

  function spawn(scene, world, opts) {
    var P = OtterBody.parts();
    var mat = OtterBody.material();
    opts = opts || {};
    /* The whole population object, not just its array — see the
       header. This is the first wiring on the shore that has to CALL
       into another species rather than only read it. */
    var gobies = opts.gobies || null;
    var fishList = gobies ? gobies.fish : null;

    var group = new THREE.Group();
    group.name = 'otters';
    scene.add(group);

    var halfX = world.simArea.halfX - 8;
    var zHi = Math.min(Z_RANGE[1], world.simArea.zMax - 2);

    function depthAt(x, z) {
      var surf = world.waterAt(x, z);
      if (surf === null) return 0;
      var d = surf - world.heightAt(x, z);
      return d > 0 ? d : 0;
    }

    /* ---------- the romp ----------
       One record, and it is the thing that makes decisions. The six
       animals below it only ever choose whether to leave their slot. */
    var romp = {
      state: 'away',
      x: 0, z: SEA_Z, yaw: Math.PI,     // the point the formation is built around
      tx: 0, tz: SEA_Z,
      stateT: 0,
      visitT: 0,
      armed: true,                       // has this tide's arrival roll been taken yet
      holdHaul: false,                   // cinematic.js only — see the `work` case
      visits: 0
    };

    var otters = [];
    for (var i = 0; i < COUNT; i++) {
      var rank = Math.floor(i / 2), file = (i % 2) * 2 - 1;
      otters.push({
        x: 0, y: 0, z: SEA_Z,
        yaw: Math.PI, pitch: 0,
        size: range(0.82, 1.14),
        /* Formation slot, in the romp's frame: metres back and to the
           side. Rank 0 is abreast of the point, so somebody is always
           at the front and the group has a face. */
        back: rank * SLOT_BACK,
        side: file * (SLOT_SIDE * (0.55 + rank * 0.45)),
        wob: rand(), wobZ: rand(),
        gaitL: rand(),                  // land gait phase, advanced by DISTANCE (see above)
        gaitD: 0,                       // and how much of it this frame
        plant: [null, null, null, null],// where each foot is planted, in WORLD metres
        gOff: [0, 0, 0, 0],             // a leg's own phase, borrowed and paid back
        liftX: [0, 0, 0, 0],            // body-local, where this leg last stood
        liftZ: [0, 0, 0, 0],
        lifted: [false, false, false, false],
        speed: 0, step: 0,              // m/s and metres-this-frame over the ground
        ground: 0,
        state: 'away',
        vis: false,
        prey: null,
        preyT: 0,
        chew: 0,
        cool: pair(HUNT_COOL) * rand(),
        scan: range(0, SCAN_SECS),
        gait: rand(),
        wet: 1,                          // 1 soaked .. 0 dry
        drawnWet: -1,
        glowBase: null,               // its own tint, so a glow can multiply it
        glowing: false,
        pose: POSE.away.slice(),
        att: ATT.away.slice(),
        /* The spine rig's two drive values — see the CENTRELINE block.
           `flex` is how hard the travelling wave runs, `bend` is the
           lateral lean, and `lastYaw` is what `bend` is measured from. */
        flex: FLEX.away,
        bend: 0,
        lastYaw: Math.PI,
        /* How far into "reaching for the fish it is holding" this
           animal is, 0..1 — see AIM_DROP. Its own phase so six otters
           in a raft do not sweep their heads in unison. */
        aim: 0,
        aimPh: rand() * TAU,
        kills: 0
      });
    }
    var N = otters.length;

    function slots(geo, per, shadow) {
      var m = new THREE.InstancedMesh(geo, mat, Math.max(N * per, 1));
      m.frustumCulled = false;
      m.castShadow = !!shadow;
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      group.add(m);
      return { mesh: m, per: per };
    }
    /* Only the two parts the mesh does not carry are still instanced —
       the whisker fan, which the reference does not have, and the fish,
       which is not part of the otter at all. */
    var R = {
      whisker: slots(P.whisker, 6, false),
      fish:    slots(P.fish, 1, false)
    };

    /* ============================================================
       THE BODY IS ONE SKINNED MESH PER ANIMAL.

       Everything else on this shore is an InstancedMesh: one geometry,
       one matrix per individual, the whole population drawn in one
       call. That works because every other body is a KIT — parts that
       are individually rigid, so an individual is a list of matrices.

       This one is not a kit. It is `Otter.obj`, one welded surface with
       the legs grown out of the torso, and the only way to bend it is
       to move its vertices. Six animals in six different poses is six
       different vertex buffers, so six Meshes, and instancing has
       nothing to instance.

       WHAT THAT COSTS, AND WHAT IT BUYS. It costs the shared-material
       tricks: `instanceColor` is where every population keeps its
       per-individual tone, and where ui.js drives its hover glow, so
       both need another route (see `tintOf` and `glowApply` below).
       It buys a surface with NO JOINS ANYWHERE. §43 spent a whole
       section getting rid of the steps where four swept parts met, and
       solved it by making adjacent links read the same profile; a
       skinned single surface cannot have the problem in the first
       place, including across a shoulder, which links never managed.

       Geometry is NON-INDEXED, because the faceted look is one flat
       colour per triangle and a shared vertex cannot hold two. That
       means 6000 vertex slots for 1027 real vertices — so the skinning
       transforms the 1027 and SCATTERS them, rather than doing the work
       six times over.

       Normals are not touched per frame at all. `flatShading` makes the
       shader derive them from screen-space derivatives, which is exact
       for a flat-shaded facet and costs nothing; recomputing 2000 face
       normals per animal per frame is the obvious alternative and is
       pure waste. It needs its own material instance rather than
       Facet's shared one — which this animal needs anyway, to carry its
       own wet/dry tint.
       ============================================================ */
    var MESH = window.OtterMesh;
    var NV = MESH.nVert, NT = MESH.nTri;
    var TRI = MESH.tri;
    /* the rest-pose bone frames, rebuilt once — the runtime rebuilds
       them per frame from the live joints, and a vertex is bound in
       the rest one, so the two constructions have to agree exactly */
    /* The live limb chain in body-local space — [limb][hip,knee,ankle,toe].
       walkLimb writes it when the animal is on sand and the posed path
       writes it the rest of the time; the skinning is the only reader,
       and neither writer knows or cares which one is drawing. */
    var JOINT = [];
    (function () {
      for (var l = 0; l < 4; l++) JOINT.push([[0,0,0],[0,0,0],[0,0,0],[0,0,0]]);
    })();
    var skinPos = new Float32Array(NV * 3);       // the 1027, deformed
    var bodyRec = [], skinMesh = [], skinAttr = [], skinMat = [];
    (function buildSkins() {
      var base = new Float32Array(NT * 9), col = new Float32Array(NT * 9);
      var c = new THREE.Color(), t, k, vi;
      for (t = 0; t < NT * 3; t++) {
        vi = TRI[t];
        base[t * 3] = MESH.X_TIP + (MESH.X_NOSE - MESH.X_TIP) * MESH.s[vi];
        base[t * 3 + 1] = MESH.oy[vi];
        base[t * 3 + 2] = MESH.oz[vi];
      }
      for (t = 0; t < NT; t++) {
        c.setHex(MESH.cTab[MESH.cIdx[t]]);
        for (k = 0; k < 3; k++) {
          col[t * 9 + k * 3] = c.r; col[t * 9 + k * 3 + 1] = c.g; col[t * 9 + k * 3 + 2] = c.b;
        }
      }
      for (var oi = 0; oi < N; oi++) {
        var g = new THREE.BufferGeometry();
        var pa = new THREE.Float32BufferAttribute(base.slice(), 3);
        pa.setUsage(THREE.DynamicDrawUsage);
        g.setAttribute('position', pa);
        g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
        g.computeBoundingSphere();
        g.boundingSphere.radius *= 3;              // it deforms; do not let it cull itself
        var mm = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
        var me = new THREE.Mesh(g, mm);
        me.frustumCulled = false;
        me.castShadow = true;
        me.visible = false;
        me.matrixAutoUpdate = false;               // the body matrix is written directly
        group.add(me);
        skinMesh.push(me); skinAttr.push(pa); skinMat.push(mm);
      }
    })();
    var chainKeys = [];
    var SKINNED = ['whisker'];

    /* ---------- placement ---------- */
    var xa = new THREE.Vector3(), ya = new THREE.Vector3(), za = new THREE.Vector3();
    var mPart = new THREE.Matrix4(), mBody = new THREE.Matrix4(), mOut = new THREE.Matrix4();
    var root = new THREE.Vector3(), tmp = new THREE.Vector3(), dir = new THREE.Vector3();
    var qb = new THREE.Quaternion(), eul = new THREE.Euler();
    var tint = new THREE.Color();
    var HIDE = new THREE.Matrix4().makeScale(1e-4, 1e-4, 1e-4).setPosition(0, -900, 0);

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
    /* §36's `putBasisRoll`, which this file needs for exactly one part.
       A webbed foot is a SHEET (Facet.blade builds it in the part's X-Y
       plane, so its face normal is the part's Z), and `put` derives its
       side axes from the length axis and world up — which leaves the
       sole facing SIDEWAYS whatever the leg is doing. Rolling both side
       axes together about the length axis is a proper rotation and
       cannot flip handedness, which is the trap §35 fell into by
       hand-picking three fixed axes instead. */
    function putRoll(rec, slot, r, d, len, wide, roll) {
      xa.copy(d).normalize();
      tmp.copy(Math.abs(xa.y) > 0.985 ? FWD : UP);
      za.crossVectors(xa, tmp).normalize();
      ya.crossVectors(za, xa).normalize();
      var c = Math.cos(roll), s = Math.sin(roll);
      var yx = ya.x * c + za.x * s, yy = ya.y * c + za.y * s, yz = ya.z * c + za.z * s;
      var zx = za.x * c - ya.x * s, zy = za.y * c - ya.y * s, zz = za.z * c - ya.z * s;
      ya.set(yx, yy, yz); za.set(zx, zy, zz);
      mPart.makeBasis(xa.multiplyScalar(len), ya.multiplyScalar(wide), za.multiplyScalar(wide));
      mPart.setPosition(r);
      mOut.multiplyMatrices(mBody, mPart);
      rec.mesh.setMatrixAt(slot, mOut);
    }

    /* House rule since §20 and written in from the start: bodies are
       built along +X, headings are atan2(dx, dz) — a +Z bearing — so
       the Euler needs `yaw - PI/2`. The pitch is the Z component for a
       +X body (§30's "the old pitch was a roll"), and order 'YXZ' with
       x = 0 gives Ry(yaw)·Rz(-pitch).

       The X component is free for exactly one thing: rolling the body
       about its own long axis, which every state carries as `att[3]`
       and only `catch` ever sets away from zero. Because `Rz(pitch)`
       is applied first in this order, a nonzero roll technically turns
       about an axis tipped by the pitch rather than the pure forward
       one — small at `catch`'s 0.28 rad pitch, and not worth a second
       composition for. What it is NOT free of is the sign: the roll
       lands on top of the pitch, so a belly-up otter pitches the
       opposite way round to every other state. See ATT. A small extra wobble rides on top so a
       floating otter breathes rather than locking to the target roll. */
    function setBody(o) {
      var sc = S * o.size;
      var roll = o.att[3] + (o.state === 'catch'
        ? CATCH_ROCK * Math.sin(o.gait * TAU * 2) : 0);
      eul.set(roll, o.yaw - Math.PI * 0.5, -o.att[0], 'YXZ');
      qb.setFromEuler(eul);
      mBody.compose(root.set(o.x, o.y, o.z), qb, tmp.set(sc, sc, sc));
    }

    function hide(oi) {
      for (var k in R) {
        for (var j = 0; j < R[k].per; j++) R[k].mesh.setMatrixAt(oi * R[k].per + j, HIDE);
      }
      /* An instanced part is hidden by parking its matrix at nothing; a
         whole Mesh just stops being drawn, which is cheaper and also
         skips its skinning entirely. */
      if (skinMesh[oi]) skinMesh[oi].visible = false;
    }

    /* THE FLOOR IS A PLANE, NOT A NUMBER — §41, and it caught this
       animal too. The limbs are posed in body-local space and nothing
       tested them against the sand, so a hauled otter lay with its
       hind paddles 5 cm UNDER the bar it was lying on.

       Body-local, the basis is Ry(yaw)·Rz(-pitch), so world up is
       (-sin p, cos p, 0) and a point (x, y) sits `liftU - x·sin p +
       y·cos p` above the origin's own height. Solving that for y is
       the whole clamp.

       Two departures from the octopus's version, both because a leg is
       a BONE and an arm is not. §41 clamps the endpoint and lets the
       segment stretch to reach it; a leg that stretches 35% reads as
       broken, so this re-aims the segment UPWARD ABOUT ITS OWN BEARING
       and keeps the length — a rigid rotation, which is also what a
       real limb does when it meets the ground. And it clamps the
       ENDPOINT rather than the running position, which is §41's second
       half: clamping after placing leaves the last link drawn along
       its unclamped direction.

       One pass, not a solve: re-aiming moves x a little and x is in
       the plane equation, but only through sin(pitch), and the pitch
       is 0 in the one posture that ever touches the sand. */
    var liftU = 0, planeSin = 0, planeCos = 1, bodySin = 0, bodyCos = 1, bodyScale = 1;
    function floorClamp(px, py, pz, len) {
      var ey = py + dir.y * len;
      var minY = (FLOOR_CLEAR - liftU + (px + dir.x * len) * planeSin) / planeCos;
      if (ey >= minY) return;
      var ny = (minY - py) / len;
      if (ny > 0.999) ny = 0.999;              // straight up, and it can go no higher
      var h = Math.sqrt(dir.x * dir.x + dir.z * dir.z);
      var k = h > 1e-6 ? Math.sqrt(Math.max(0, 1 - ny * ny)) / h : 0;
      dir.set(dir.x * k, ny, dir.z * k);
    }

    /* Body-local height of the sand at a body-local x. floorClamp is
       this solved as an inequality; the gait needs it as a value. */
    function floorY(x) {
      return (FLOOR_CLEAR - liftU + x * planeSin) / planeCos;
    }

    /* ------------------------------------------------------------
       one limb of the land gait — the only limb on this animal that
       is SOLVED rather than posed (§36).

       The foot target comes first and the joints are worked back from
       it, because the thing that has to be right is where the foot is:
       planted on the sand and not moving, while the body travels over
       it. Everything else about the leg is whatever reaches that.
       ------------------------------------------------------------ */
    function walkLimb(o, oi, l) {
      var fore = l < 2, side = HIP_SIDE[l];
      var hx = HIP_X[l], hy = HIP_Y[l], hz = side * HIP_Z[l];

      /* STANCE AND SWING. Over one cycle the body advances STRIDE, so
         over the stance — DUTY of the cycle — it advances STRIDE*DUTY,
         and that is exactly how far a planted foot must travel
         BACKWARD in body-local space. Get this excursion wrong and the
         foot skates; it is the only number here that has a right
         answer rather than a taste. */
      var E = STRIDE * DUTY;
      var q = o.gaitL + GAIT_PH[l] + o.gOff[l];
      q -= Math.floor(q);
      var fx, fz = side * (HIP_Z[l] + WALK_SPLAY), lift = 0;

      /* PLANTED MEANS PLANTED IN THE WORLD, AND THE PHASE ALONE CANNOT
         SAY THAT. Sliding the foot back through body-local space at
         the body's own speed holds it still while the animal walks in
         a STRAIGHT LINE, and the measurement says so — 0.07 cm of
         scrub against an 8.7 cm stride. The moment it turns, a
         body-local point swings through the world with it: the same
         measurement put a quarter of all stance frames at 1.43 cm,
         twenty times worse, and these animals are steering toward a
         formation slot almost constantly.

         So the plant is REMEMBERED IN WORLD METRES at touchdown and
         converted back each frame. The phase decides WHEN a foot is
         down and where it lands; after that the ground owns it. */
      var pl = o.plant[l], lx = 0, lz = 0;
      if (pl) {
        var wx = pl.x - o.x, wz = pl.z - o.z;
        lx = (wx * bodySin + wz * bodyCos) / bodyScale;
        lz = (-wx * bodyCos + wz * bodySin) / bodyScale;
      }

      /* ------------------------------------------------------------
         THE CORRECTIVE STEP.

         A foot that has been left behind — a hard turn, or the animal
         simply sped up — is out of reach, and something has to give.
         What used to give was the plant: it was dropped, and the foot
         appeared 22 cm away in the SAME FRAME, with no lift, no swing
         and no landing. Rare, about one stance frame in two hundred,
         and only while turning; but a foot that teleports is not a
         foot, and a real quadruped in that spot takes a step.

         WHY THIS IS NOT A SECOND AUTHORITY. The gait phase is driven
         by DISTANCE TRAVELLED and nothing else — that is the whole
         mechanism holding a planted foot still, and §43 has a section
         on why a time-driven phase skates. So this does not reach into
         the phase. Each leg carries its own CONSTANT offset, exactly
         like GAIT_PH does; losing a footing borrows from that constant
         until the leg is at the top of its swing, and the distance
         goes on driving everything as before.

         Borrowed, and paid back: the offset unwinds toward zero so the
         diagonal couplets re-form, and it unwinds ONLY WHILE THE LEG IS
         IN THE AIR and never by more than a fraction of the phase the
         distance just advanced. So it can neither move a planted foot
         nor stall a swinging one.
         ------------------------------------------------------------ */
      if (pl && q < DUTY) {
        var over = (lx - hx) * (lx - hx) + (lz - hz) * (lz - hz);
        if (over > (L_UP[l] + L_LO[l]) * (L_UP[l] + L_LO[l])) {
          o.gOff[l] += DUTY - q;
          o.gOff[l] -= Math.floor(o.gOff[l]);
          o.liftX[l] = lx; o.liftZ[l] = lz; o.lifted[l] = true;
          o.plant[l] = null; pl = null;
          q = DUTY;                              // into the swing, this frame
        }
      }

      if (q < DUTY) {
        fx = hx + E * (0.5 - q / DUTY);          // where the phase alone says to stand
        if (pl) { fx = lx; fz = lz; }
        else o.plant[l] = { x: o.x + (fx * bodySin - fz * bodyCos) * bodyScale,
                            z: o.z + (fx * bodyCos + fz * bodySin) * bodyScale };
        o.lifted[l] = false;
      } else {
        var u = (q - DUTY) / (1 - DUTY);          // swung forward again, and picked up
        fx = hx + E * (-0.5 + u);
        lift = Math.sin(Math.PI * u) * STEP_LIFT;
        o.plant[l] = null;
        /* A CORRECTIVE SWING STARTS WHERE THE FOOT IS, not where the
           phase would have put it - otherwise the lift itself is the
           jump, just moved one frame later. Easing from one to the
           other over the swing is what makes it a step.

           Only after a corrective step. An ordinary swing already
           starts where the stance left off, and running every swing
           through this instead was measured: it spread a 5 cm
           discretisation error across all of them and put the median
           frame-to-frame discontinuity up twentyfold, to fix a jump
           that was not there. */
        if (o.lifted[l]) {
          var bl = u * u * (3 - 2 * u);
          fx = o.liftX[l] + (fx - o.liftX[l]) * bl;
          fz = o.liftZ[l] + (fz - o.liftZ[l]) * bl;
        }
        /* pay the borrowed phase back, in the air only */
        var gv = o.gOff[l];
        if (gv > 1e-6) {
          var want = gv > 0.5 ? 1 - gv : -gv;    // toward the nearer of 0 and 1
          var cap = GAIT_REPAY * o.gaitD;
          if (want > cap) want = cap; else if (want < -cap) want = -cap;
          gv += want;
          if (gv >= 1 || gv < 1e-6) gv = 0;
          o.gOff[l] = gv;
        }
      }
      /* THE PLANE IS THE BODY'S SAND, NOT THE FOOT'S. `floorY` reads
         one plane fitted under the animal's own centre, and a paw
         stands a third of a metre away from that centre on a shore
         that is not flat. Measured over 6000 walk frames before this
         line existed: 7.2% of feet were more than 2 cm under the sand,
         2.3% more than 5 cm, and the worst was 19 cm — a buried paw,
         and worst exactly where the animal is most watched, on the
         ridges it walks over to haul out.

         So the ground is asked WHERE THE FOOT IS, in world metres,
         and the answer is carried back to body-local as an offset
         from the plane. The plane still does the pitch; this only
         moves the sand up or down under one paw. One `heightAt` per
         limb per frame, which is four per animal and is what every
         grazer on this shore already spends. */
      var wfx = o.x + (fx * bodySin - fz * bodyCos) * bodyScale;
      var wfz = o.z + (fx * bodyCos + fz * bodySin) * bodyScale;
      var gBase = o.ground === undefined ? world.heightAt(o.x, o.z) : o.ground;
      var gOff = (world.heightAt(wfx, wfz) - gBase) / (bodyScale * planeCos);
      var fy = floorY(fx) + gOff + lift;

      /* Two links, equal lengths, law of cosines. The reach is clamped
         a hair inside full extension: at full stretch the knee angle
         is undefined and the leg snaps straight, which reads as a
         flicker on exactly the frame the foot touches down. */
      var dx = fx - hx, dy = fy - hy, dz = fz - hz;
      var d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      var reach = (L_UP[l] + L_LO[l]) * 0.985;
      if (d > reach) {
        var k = reach / d;
        dx *= k; dy *= k; dz *= k; d = reach;
        fx = hx + dx; fy = hy + dy; fz = hz + dz;
      }
      if (d < 1e-3) { dy = -1e-3; d = 1e-3; }
      var ux = dx / d, uy = dy / d, uz = dz / d;
      var a = (d * d + L_UP[l] * L_UP[l] - L_LO[l] * L_LO[l]) / (2 * d);
      var hh = L_UP[l] * L_UP[l] - a * a;
      hh = hh > 0 ? Math.sqrt(hh) : 0;

      /* WHICH WAY THE JOINT BENDS IS THE MUSTELID, and it is not the
         same answer front and back: an otter's elbow points BACKWARD
         and its knee points FORWARD. One sign, and getting it wrong
         gives an animal with four identical legs, which is the thing
         that makes a bad quadruped look like a toy. */
      var rx = fore ? -1 : 1;
      var dot = rx * ux;
      var nx = rx - ux * dot, ny = -uy * dot, nz = -uz * dot;
      var nl = Math.sqrt(nx * nx + ny * ny + nz * nz);
      if (nl < 1e-4) { nx = 0; ny = 1; nz = 0; nl = 1; }
      nx /= nl; ny /= nl; nz /= nl;

      var kx = hx + ux * a + nx * hh,
          ky = hy + uy * a + ny * hh,
          kz = hz + uz * a + nz * hh;

      /* THE SOLVE ENDS AT FOUR POINTS, NOT AT FOUR MATRICES. It used
         to place two leg segments and a paddle directly; now it writes
         the chain and the skinning hangs the animal's own leg on it.
         The IK itself is untouched — same law of cosines, same measured
         knee sign — because the thing that changed is what wears the
         answer, not the answer. */
      var J = JOINT[l];
      J[0][0] = hx; J[0][1] = hy; J[0][2] = hz;
      J[1][0] = kx; J[1][1] = ky; J[1][2] = kz;
      J[2][0] = fx; J[2][1] = fy; J[2][2] = fz;
      /* The paw lies FLAT and points along the sand, which is a
         different direction from the shin it hangs off — a swimming
         foot carries on along the leg, a standing one does not.
         (cos p, sin p, 0) is body-local "forward along the ground". */
      J[3][0] = fx + planeCos * L_FT[l];
      J[3][1] = fy + planeSin * L_FT[l];
      J[3][2] = fz;
    }

    /* ============================================================
       THE CENTRELINE.

       One parameter `s` describes the whole animal from tail tip to
       nose, and every part that is not a limb is sampled off it:

         s = 0            the tail tip
         s = S_RUMP       where the tail meets the body
         s = S_SHOULDER   where the body meets the neck
         s = S_NECK_END   where the neck meets the skull
         s = 1            the nose

       x(s) is fixed — it is just the body-unit layout laid end to end.
       y(s) and z(s) are where the animal bends, and both are LIVE.

       WHY A TRAVELLING WAVE AND NOT A HINGE. An otter swims by
       undulating in the VERTICAL plane — it is a mustelid, not a fish,
       and the giveaway of a fish-swimming otter is a body that waggles
       side to side. So the driving wave is in y, running backward down
       the body with a phase that lags with distance from the head, and
       the amplitude grows toward the tail because that is the end that
       is free to move. The rump end of the tail therefore moves with
       the back it grows out of, and the tip whips.

       z(s) is the TURN. A body turning at speed leans and bends into
       the arc instead of pivoting rigidly about its centre, so the
       lateral bend is driven by how fast the animal's heading is
       actually changing.
       ============================================================ */
    /* The landmarks come from otterbody.js, which derives them from the
       part lengths — so the profile and the centreline cannot disagree
       about where the shoulder is. */
    var S_RUMP = OtterBody.S_RUMP, S_SHOULDER = OtterBody.S_SHOULDER;
    var S_NECK_END = OtterBody.S_NECK_END;
    var X_TIP = OtterMesh.X_TIP, X_NOSE = OtterMesh.X_NOSE;
    /* Each link is drawn a little longer than the gap it spans, so a
       bend cannot open a seam between two links. */
    var LINK_OVER = 1.12;

    var ARCH = 0.048;              // the back's own curve, crest over mid-torso
    var HEAD_RISE = 0.105;         // how far the skull rides above the shoulder line
    var WAVE_K = 5.0;              // radians of phase across the whole animal
    var WAVE_HZ = 1.0;             // cycles of the wave per unit of `gait`
    var BEND_Z = 0.60;             // how hard a turn bends the body sideways

    /* Body-local x for a centreline parameter. `s` is proportional to
       LENGTH along the animal — otterbody.js builds it that way — so
       this is a straight line rather than the four spliced spans it
       used to be. */
    function xAt(s) { return X_TIP + (X_NOSE - X_TIP) * s; }

    /* ------------------------------------------------------------
       THE NECK CURLS. THE SKULL DOES NOT.

       `xAt` is fixed — every station's x is a constant of the
       parameterisation — so until now the centreline could only move in
       y and z. That is enough for the wave, the arch and the turn, and
       it is NOT enough to reach for something: the first version of the
       eating aim dropped the head 0.21 body units and rotated the muzzle
       27 degrees, and the nose's x did not move by so much as a
       thousandth. Measured, it stayed 0.69 body units in FRONT of the
       fish the whole time. The head sank; it never reached. That is
       what "the neck and head did not bend toward the food" was.

       So the reach bends the neck into a CIRCULAR ARC, which needs jx.
       Constant curvature parameterised by arc length: at distance `l`
       along the neck the offset is (sin(kl)/k, -(1-cos(kl))/k) with
       k = theta / L_NECK. Its derivative has unit length at every l, so
       the neck bends without stretching — which a rotation about a
       point would not do, and the skin would pay for.

       AND THE SKULL RIDES RIGIDLY ON THE END OF IT. Curving everything
       forward of the shoulder bends the cranium too and the animal
       comes out banana-headed. Past S_NECK_END the arc stops and the
       head is carried straight along the neck's final tangent, which is
       both what a skull does and what keeps the face's own shape.
       ------------------------------------------------------------ */
    var L_NECK = 0, L_SKULL = 0;
    (function () {
      L_NECK = xAt(S_NECK_END) - xAt(S_SHOULDER);
      L_SKULL = X_NOSE - xAt(S_NECK_END);
    })();

    /* Where the muzzle ends up at a given amount of curl, and which way
       it points when it gets there. The fish is placed off THIS rather
       than typed, so the food and the mouth cannot disagree about where
       the mouth is — the same rule as `onSkin` and for the same reason
       (§43, §47's buried eyes). Returns body-local x/y and a unit
       heading; HEAD_RISE is in it because the real nose carries it. */
    function headTip(aim) {
      var th = aim * AIM_CURL, x0 = xAt(S_SHOULDER);
      if (th < 1e-5) return { x: X_NOSE, y: HEAD_RISE, tx: 1, ty: 0 };
      var k = th / L_NECK;
      var ex = Math.sin(th) / k, ey = -(1 - Math.cos(th)) / k;
      var ct = Math.cos(th), st = Math.sin(th);
      return { x: x0 + ex + L_SKULL * ct,
               y: ey - L_SKULL * st + HEAD_RISE,
               tx: ct, ty: -st };
    }

    /* The fish's resting place, DERIVED: just BEYOND the muzzle at full
       reach, along the head's own heading, so the animal closes on food
       that is where its mouth is going to be and the food is still in
       front of the mouth rather than inside the skull. (Placed one
       FOOD_GAP the other way first, which buried it: the skull is 0.28
       body units long and the fish went 0.10 back into it.)

       It is a CONSTANT. The fish is held in the forepaws and must not
       follow the head, or it jitters with every sweep and the otter
       spends the whole hold chasing its own meal. */
    var CHEST_X = 0, CHEST_Y = 0;
    (function () {
      var tip = headTip(1);
      CHEST_X = tip.x + tip.tx * FOOD_GAP;
      CHEST_Y = tip.y + tip.ty * FOOD_GAP;
    })();

    /* Writes the joint at `s` into jx/jy/jz. */
    var jx = 0, jy = 0, jz = 0;
    function spineAt(o, s) {
      jx = xAt(s);
      /* Amplitude: nothing at the shoulders, everything at the tip.
         Squared so the front half of the animal stays quiet and the
         motion is all in the back — which is what reads as swimming
         rather than as wobbling. */
      var back = 1 - s;
      var amp = o.flex * back * back;
      var ph = o.gait * TAU * WAVE_HZ - s * WAVE_K;
      jy = amp * UNDULATE * Math.sin(ph);
      /* THE TURN'S LATERAL BEND IS SET HERE, at the top, and not at the
         bottom where it used to be. It is an ASSIGNMENT — the only one
         `jz` gets — so anything else that wants a say has to come after
         it, and the head's aim swing was written before it and silently
         overwritten for its whole first pass. Measured z of a bent head
         came back exactly 0.000, which looked like the sweep phase
         being at a zero crossing and was not. */
      jz = o.bend * BEND_Z * back * back;
      /* The static arch, which used to be baked into the torso as
         `curveY`. It belongs here now so that it bends with everything
         else instead of fighting it — and it peaks over the BACK, not
         over the whole animal: spreading one sine from the rump to the
         nose put its crest in the neck and left the spine flat, which
         renders as a slab with a snout. */
      if (s > S_RUMP) {
        var b = (s - S_RUMP) / (S_SHOULDER - S_RUMP);
        if (b > 1) b = 1;
        jy += ARCH * Math.sin(b * Math.PI);
      }
      /* AND THE HEAD IS CARRIED ABOVE THE BACK. Every reference render
         of this animal shows the skull riding clear of the shoulder
         line; the centreline had it dead level, which is the other
         half of why the silhouette read as a reptile. */
      if (s > S_SHOULDER) {
        var h = (s - S_SHOULDER) / (1 - S_SHOULDER);
        jy += HEAD_RISE * h;
        /* AND IT CURLS DOWN OVER WHAT IT IS HOLDING. Forward of the
           shoulder only, so the chest and everything behind it do not
           move at all — the body stays the horizontal raft it is
           floating on, which is the whole point. See L_NECK. */
        if (o.aim > 0.001) {
          var th = o.aim * AIM_CURL;
          var x0 = xAt(S_SHOULDER), ell = jx - x0;
          var k = th / L_NECK;
          if (ell <= L_NECK) {                 // in the neck: follow the arc
            jx = x0 + Math.sin(k * ell) / k;
            jy -= (1 - Math.cos(k * ell)) / k;
          } else {                             // past it: the skull, carried straight
            var d = ell - L_NECK, ct = Math.cos(th), st = Math.sin(th);
            jx = x0 + Math.sin(th) / k + d * ct;
            jy -= (1 - ct) / k + d * st;
          }
          jz += AIM_SWING * o.aim * h * h * Math.sin(o.chew * TAU * AIM_HZ + o.aimPh);
        }
      }
      /* The tail's own droop, from the attitude — a diving otter's
         tail comes up behind it, a hauled one's lies flat. */
      if (s < S_RUMP) jy -= o.att[2] * (S_RUMP - s) * TAIL_LEN;
      return s;
    }

    /* Unit tangent from the joint at `a` to the joint at `b`. */
    var tan = new THREE.Vector3();
    function tangentAt(o, a, b) {
      spineAt(o, a); var ax = jx, ay = jy, az = jz;
      spineAt(o, b); tan.set(jx - ax, jy - ay, jz - az);
      if (tan.lengthSq() < 1e-12) tan.set(1, 0, 0);
      tan.normalize();
      spineAt(o, a);                     // leave jx/jy/jz on the start joint
      return tan;
    }

    /* Drop every body link along the centreline. Each link already
       knows the s range it was cut from, so this just samples the curve
       at those two parameters and spans the gap — the link order and
       the profile order are the same thing by construction, which is
       what stops the tail going on backwards. */
    /* ============================================================
       SKINNING — the centreline and the four limb chains, applied to
       1027 vertices.

       This replaces `drawBody`, which walked fourteen links and placed
       each as a rigid solid between two centreline samples. The links
       are gone; the parameterisation they were built on is not. Every
       vertex still knows its `s` and its offset from the centreline, so
       the same spine that used to carry fourteen matrices now carries a
       thousand points, and the joins that §43 fought to make continuous
       cannot exist because there is nothing to join.

       THE FRAME TABLE IS SAMPLED, NOT SOLVED PER VERTEX. The centreline
       is the expensive part — `spineAt` walks a travelling wave — and a
       thousand vertices sitting on sixty-four distinct places along the
       body would ask for the same answer sixteen times each. So the
       spine is evaluated at NS stations and each vertex interpolates
       between the two either side of it. At NS = 48 the sampling error
       is far below a facet.

       ORDER MATTERS: the limb chains must already be solved when this
       runs, because a vertex at a shoulder is part spine and part bone
       and needs both. `draw` calls the limbs first for that reason.
       ============================================================ */
    var NS = 48;
    var frmX = new Float32Array(NS), frmY = new Float32Array(NS), frmZ = new Float32Array(NS);
    var bnO = new Float32Array(12 * 3), bnX = new Float32Array(12 * 3);
    var bnY = new Float32Array(12 * 3), bnZ = new Float32Array(12 * 3);
    var tv = new THREE.Vector3(), tu = new THREE.Vector3(), ts = new THREE.Vector3();

    /* THE REST REFERENCE AXIS, per bone, derived here the same way the
       bake derives it — from the bone's REST direction, taking whichever
       world axis it points at least. Both sides have to agree or a
       vertex lands in a frame it was not bound in. Deriving it rather
       than shipping it means they cannot disagree.

       A threshold rule ('world up unless the bone is nearly vertical')
       is what this replaces, and the reason is that a leg swinging
       across the threshold flips its frame and twists a quarter turn
       between two frames of animation. */
    var REFA = new Float32Array(12 * 3);
    (function () {
      for (var l = 0; l < 4; l++) {
        var J = OtterMesh.limbs[l], P = [J.hip, J.knee, J.ankle, J.toe];
        for (var b = 0; b < 3; b++) {
          var ex = P[b + 1][0] - P[b][0], ey = P[b + 1][1] - P[b][1], ez = P[b + 1][2] - P[b][2];
          var L = Math.sqrt(ex * ex + ey * ey + ez * ez) || 1;
          var ax = Math.abs(ex / L), ay = Math.abs(ey / L), az = Math.abs(ez / L);
          var i3 = (l * 3 + b) * 3;
          if (ax <= ay && ax <= az) REFA[i3] = 1;
          else if (ay <= az) REFA[i3 + 1] = 1;
          else REFA[i3 + 2] = 1;
        }
      }
    })();

    /* One bone's frame. A vertex bound in the bake's rest frame lands
       back where it was bound, because both build it the same way. */
    function boneFrame(bi, ax, ay, az, bx, by, bz) {
      var ex = bx - ax, ey = by - ay, ez = bz - az;
      var L = Math.sqrt(ex * ex + ey * ey + ez * ez) || 1;
      tv.set(ex / L, ey / L, ez / L);
      tu.set(REFA[bi * 3], REFA[bi * 3 + 1], REFA[bi * 3 + 2]);
      ts.crossVectors(tv, tu);
      if (ts.lengthSq() < 1e-12) ts.set(0, 0, 1);
      ts.normalize();
      tu.crossVectors(ts, tv).normalize();
      var b = bi * 3;
      bnO[b] = ax; bnO[b + 1] = ay; bnO[b + 2] = az;
      bnX[b] = tv.x; bnX[b + 1] = tv.y; bnX[b + 2] = tv.z;
      bnY[b] = tu.x; bnY[b + 1] = tu.y; bnY[b + 2] = tu.z;
      bnZ[b] = ts.x; bnZ[b + 1] = ts.y; bnZ[b + 2] = ts.z;
    }

    /* ============================================================
       BLEND ROTATIONS, NOT POSITIONS.

       Every vertex is told by two or three things where to go: the
       spine says one place, the bone at its socket says another, and
       until now the answer was the straight-line average of those
       places. That is linear blend skinning, and it has exactly one
       failure mode, always in the same spot - the average of two
       points either side of a big rotation lies INSIDE the arc, not
       on it.

           leg near its modelled pose          leg swung ~80 degrees
             spine says:  .                      spine says: .
             bone  says:   .                     bone  says:              .
             average:     .   <- on the arc      average:        .  <- inside it,
                                                                    the skin pinches

       The OBJ was modelled STANDING. Walking barely moves a leg from
       there, which is why walking was nearly clean; swimming streams
       the legs about eighty degrees back, which is why swimming was
       not - 4.73% of edges past twice their rest length, worst at 8x,
       and every one of them at a hip or a shoulder.

       The fix is to average the MOTIONS and let the vertex ride the
       arc. Each influence is a rigid motion carrying the rest animal
       to the posed one. Written as a dual quaternion, a weighted sum
       of rigid motions renormalised is still a rigid motion, so the
       skin cannot collapse: two rotations average to a rotation
       between them, which is the whole point.

       WHAT IS BLENDED IS A MOTION, NOT A PLACE, so every influence has
       to act on ONE rest position. It does. s/oy/oz reproduce the
       un-posed vertex for EVERY vertex, limbs included - the bake
       writes them from the unbent mesh before it looks at limbs at all
       - and the bone-local ba/bo/bs it also emits are that same point
       read in a bone's rest frame. So the runtime stops reading them
       and derives each bone's rest frame from the joints instead, the
       same construction REFA already uses. They stay in the file
       because check-roundtrip.js measures the two against the source
       OBJ, and that is what keeps the bake honest.

       SIGN. q and -q are the same rotation but average to nothing, so
       every influence is flipped into the same hemisphere as the spine
       station under the vertex before it is added.
       ============================================================ */

    /* quaternion (x,y,z,w) from an orthonormal basis given as COLUMNS */
    function quatFromBasis(Xx, Xy, Xz, Yx, Yy, Yz, Zx, Zy, Zz, out, o) {
      var tr = Xx + Yy + Zz, s;
      if (tr > 0) {
        s = Math.sqrt(tr + 1) * 2;
        out[o] = (Yz - Zy) / s; out[o + 1] = (Zx - Xz) / s; out[o + 2] = (Xy - Yx) / s; out[o + 3] = 0.25 * s;
      } else if (Xx > Yy && Xx > Zz) {
        s = Math.sqrt(1 + Xx - Yy - Zz) * 2;
        out[o] = 0.25 * s; out[o + 1] = (Yx + Xy) / s; out[o + 2] = (Zx + Xz) / s; out[o + 3] = (Yz - Zy) / s;
      } else if (Yy > Zz) {
        s = Math.sqrt(1 + Yy - Xx - Zz) * 2;
        out[o] = (Yx + Xy) / s; out[o + 1] = 0.25 * s; out[o + 2] = (Zy + Yz) / s; out[o + 3] = (Zx - Xz) / s;
      } else {
        s = Math.sqrt(1 + Zz - Xx - Yy) * 2;
        out[o] = (Zx + Xz) / s; out[o + 1] = (Zy + Yz) / s; out[o + 2] = 0.25 * s; out[o + 3] = (Xy - Yx) / s;
      }
    }
    /* v turned by a unit quaternion, left in rvx/rvy/rvz */
    var rvx = 0, rvy = 0, rvz = 0;
    function qrot(qx, qy, qz, qw, vx, vy, vz) {
      var tx = 2 * (qy * vz - qz * vy), ty = 2 * (qz * vx - qx * vz), tz = 2 * (qx * vy - qy * vx);
      rvx = vx + qw * tx + qy * tz - qz * ty;
      rvy = vy + qw * ty + qz * tx - qx * tz;
      rvz = vz + qw * tz + qx * ty - qy * tx;
    }
    /* the dual half of a motion: 0.5 * (0, t) (x) q, for translation t */
    function dualPart(tx, ty, tz, qx, qy, qz, qw, de, o) {
      de[o]     = 0.5 * ( tx * qw + ty * qz - tz * qy);
      de[o + 1] = 0.5 * ( ty * qw + tz * qx - tx * qz);
      de[o + 2] = 0.5 * ( tz * qw + tx * qy - ty * qx);
      de[o + 3] = 0.5 * (-tx * qx - ty * qy - tz * qz);
    }

    /* Each bone's REST frame, built by the SAME construction as the
       live one - same REFA, same crosses - because a bone sitting at
       rest has to come out as no motion at all, and it only does if
       both sides agree to the last bit. Stored conjugated: what the
       per-frame code wants is the inverse. */
    var brqx = new Float32Array(12), brqy = new Float32Array(12);
    var brqz = new Float32Array(12), brqw = new Float32Array(12);
    var brO = new Float32Array(12 * 3);
    (function () {
      var q = new Float32Array(4);
      for (var l = 0; l < 4; l++) {
        var J = OtterMesh.limbs[l], P = [J.hip, J.knee, J.ankle, J.toe];
        for (var b = 0; b < 3; b++) {
          var bi = l * 3 + b, i3 = bi * 3;
          boneFrame(bi, P[b][0], P[b][1], P[b][2], P[b + 1][0], P[b + 1][1], P[b + 1][2]);
          brO[i3] = bnO[i3]; brO[i3 + 1] = bnO[i3 + 1]; brO[i3 + 2] = bnO[i3 + 2];
          quatFromBasis(bnX[i3], bnX[i3 + 1], bnX[i3 + 2],
                        bnY[i3], bnY[i3 + 1], bnY[i3 + 2],
                        bnZ[i3], bnZ[i3 + 1], bnZ[i3 + 2], q, 0);
          brqx[bi] = -q[0]; brqy[bi] = -q[1]; brqz[bi] = -q[2]; brqw[bi] = q[3];
        }
      }
    })();

    /* each bone as a MOTION: live frame composed with the inverse of the
       frame it was bound in. A bone that has not moved gives the
       identity, which is what makes the bind pose come back exactly. */
    function boneMotions() {
      for (var k = 0; k < 12; k++) {
        var b3 = k * 3, b4 = k * 4;
        quatFromBasis(bnX[b3], bnX[b3 + 1], bnX[b3 + 2],
                      bnY[b3], bnY[b3 + 1], bnY[b3 + 2],
                      bnZ[b3], bnZ[b3 + 1], bnZ[b3 + 2], qtmp, 0);
        var ax = qtmp[0], ay = qtmp[1], az = qtmp[2], aw = qtmp[3];
        var cx = brqx[k], cy = brqy[k], cz = brqz[k], cw = brqw[k];
        var qx = aw * cx + ax * cw + ay * cz - az * cy;
        var qy = aw * cy + ay * cw + az * cx - ax * cz;
        var qz = aw * cz + az * cw + ax * cy - ay * cx;
        var qw = aw * cw - ax * cx - ay * cy - az * cz;
        bq0[b4] = qx; bq0[b4 + 1] = qy; bq0[b4 + 2] = qz; bq0[b4 + 3] = qw;
        qrot(qx, qy, qz, qw, brO[b3], brO[b3 + 1], brO[b3 + 2]);
        dualPart(bnO[b3] - rvx, bnO[b3 + 1] - rvy, bnO[b3 + 2] - rvz, qx, qy, qz, qw, bqe, b4);
      }
    }

    /* the per-frame motions: one per spine station, one per bone */
    var sq0 = new Float32Array(NS * 4), sqe = new Float32Array(NS * 4);
    var bq0 = new Float32Array(12 * 4), bqe = new Float32Array(12 * 4);
    var qtmp = new Float32Array(4);
    /* the one rest position every motion acts on, and the rest x of
       each spine station on the same straight axis */
    var restX = new Float32Array(NV), restY = new Float32Array(NV), restZ = new Float32Array(NV);
    var stnX = new Float32Array(NS);
    (function () {
      var span = MESH.X_NOSE - MESH.X_TIP;
      for (var i = 0; i < NV; i++) {
        restX[i] = MESH.X_TIP + span * MESH.s[i];
        restY[i] = MESH.oy[i];
        restZ[i] = MESH.oz[i];
      }
      for (i = 0; i < NS; i++) stnX[i] = MESH.X_TIP + span * (i / (NS - 1));
    })();

    /* ============================================================
       THE BIND POSE IS NOT THE POSE THE MODEL WAS DRAWN IN.

       Otter.obj was modelled STANDING, legs pointing down, and every
       vertex is bound to that. How far a socket has to shear is set by
       how far the leg has swung SINCE it was bound, and nothing else -
       so binding at one end of the animal's range means the far end
       pays for all of it:

           bound standing            bound mid-range
             haul  0.4 rad away        haul  0.5 rad away
             walk  ~0.4                walk  ~0.5
             swim  1.4    <- pays      swim  0.5
             dive  1.5    <- pays      dive  0.6

       Swimming is seventy per cent of this animal's screen time, so
       the pose it was drawn in was the one pose it almost never holds.
       Measured: 3.4% of edges past twice their rest length while
       swimming against 0.1% while walking, and the difference was
       nothing but the angle.

       So the legs are swung back once, at load, into a bind pose
       roughly in the middle of the range - using the same skinning
       the runtime uses, so nothing new can go wrong here - and every
       rest position and every bone rest frame is re-read off THAT.
       The mesh file is untouched: it is a record of the OBJ, and where
       the animal holds its legs is the rig's business, not the bake's.

       The angle matches the rig's own convention: pose[0], where 0 is
       straight down and PI/2 is straight back. Rotating about the hip
       leaves the hip where it is and every segment as long as it was,
       so the IK, the walk and the floor clamp neither know nor care.
       ============================================================ */
    var BIND_SWING = 0.85;
    (function rebind() {
      if (!BIND_SWING) return;
      var cs = Math.cos(BIND_SWING), sn = Math.sin(BIND_SWING);
      var OFF = [], l, b, i, k;
      for (l = 0; l < 4; l++) {
        var Lm = OtterMesh.limbs[l], Pj = [Lm.hip, Lm.knee, Lm.ankle, Lm.toe], q = [];
        for (b = 0; b < 4; b++) {
          var dx = Pj[b][0] - Pj[0][0], dy = Pj[b][1] - Pj[0][1];
          q.push([Pj[0][0] + dx * cs + dy * sn, Pj[0][1] - dx * sn + dy * cs, Pj[b][2]]);
        }
        OFF.push(q);
      }
      /* the twelve motions carrying the standing bones to the new ones */
      for (l = 0; l < 4; l++)
        for (b = 0; b < 3; b++)
          boneFrame(l * 3 + b, OFF[l][b][0], OFF[l][b][1], OFF[l][b][2],
                               OFF[l][b + 1][0], OFF[l][b + 1][1], OFF[l][b + 1][2]);
      boneMotions();
      /* every vertex, blended exactly as a frame is. The spine is not
         moving, so its influence is the identity motion and drops out
         of the sum except as weight. */
      var NBS0 = MESH.nbs, BIDX0 = MESH.bidx, BWT0 = MESH.bwt, W0 = MESH.w;
      for (i = 0; i < NV; i++) {
        var w = W0[i];
        if (w <= 0) continue;
        var q0x = 0, q0y = 0, q0z = 0, q0w = 1 - w;      // the spine's identity
        var qex = 0, qey = 0, qez = 0, qew = 0;
        for (var sl = 0; sl < NBS0; sl++) {
          var g = BWT0[i * NBS0 + sl];
          if (g <= 0) break;
          var c4 = BIDX0[i * NBS0 + sl] * 4;
          if (bq0[c4 + 3] < 0) g = -g;                   // hemisphere of the identity
          q0x += bq0[c4] * g; q0y += bq0[c4 + 1] * g; q0z += bq0[c4 + 2] * g; q0w += bq0[c4 + 3] * g;
          qex += bqe[c4] * g; qey += bqe[c4 + 1] * g; qez += bqe[c4 + 2] * g; qew += bqe[c4 + 3] * g;
        }
        var n = Math.sqrt(q0x * q0x + q0y * q0y + q0z * q0z + q0w * q0w);
        if (n < 1e-8) continue;
        n = 1 / n;
        q0x *= n; q0y *= n; q0z *= n; q0w *= n;
        qex *= n; qey *= n; qez *= n; qew *= n;
        qrot(q0x, q0y, q0z, q0w, restX[i], restY[i], restZ[i]);
        restX[i] = rvx + 2 * (q0w * qex - qew * q0x + q0y * qez - q0z * qey);
        restY[i] = rvy + 2 * (q0w * qey - qew * q0y + q0z * qex - q0x * qez);
        restZ[i] = rvz + 2 * (q0w * qez - qew * q0z + q0x * qey - q0y * qex);
      }
      /* and the frames the runtime measures the live pose against */
      var qq = new Float32Array(4);
      for (l = 0; l < 4; l++) {
        for (b = 0; b < 3; b++) {
          var bi = l * 3 + b, i3 = bi * 3;
          boneFrame(bi, OFF[l][b][0], OFF[l][b][1], OFF[l][b][2],
                        OFF[l][b + 1][0], OFF[l][b + 1][1], OFF[l][b + 1][2]);
          brO[i3] = bnO[i3]; brO[i3 + 1] = bnO[i3 + 1]; brO[i3 + 2] = bnO[i3 + 2];
          quatFromBasis(bnX[i3], bnX[i3 + 1], bnX[i3 + 2],
                        bnY[i3], bnY[i3 + 1], bnY[i3 + 2],
                        bnZ[i3], bnZ[i3 + 1], bnZ[i3 + 2], qq, 0);
          brqx[bi] = -qq[0]; brqy[bi] = -qq[1]; brqz[bi] = -qq[2]; brqw[bi] = qq[3];
        }
      }
    })();

    function skin(o, oi) {
      var i, k;
      /* --- the spine stations --- */
      for (i = 0; i < NS; i++) {
        var sv = i / (NS - 1);
        spineAt(o, sv);
        frmX[i] = jx; frmY[i] = jy; frmZ[i] = jz;
        tangentAt(o, sv, 1);
        /* side is the tangent crossed with world up, and up closes the
           frame — the same construction the links used, so the animal
           does not roll where it used to not roll */
        ts.crossVectors(tan, UP);
        if (ts.lengthSq() < 1e-10) ts.set(0, 0, 1);
        ts.normalize();
        tu.crossVectors(ts, tan).normalize();
        /* the station as a MOTION. The rest spine is straight along
           +X with up +Y and side +Z, so its basis is the identity and
           the rotation IS the live basis; the translation is whatever
           carries the rest station to the live one. */
        var s4 = i * 4;
        quatFromBasis(tan.x, tan.y, tan.z, tu.x, tu.y, tu.z, ts.x, ts.y, ts.z, sq0, s4);
        qrot(sq0[s4], sq0[s4 + 1], sq0[s4 + 2], sq0[s4 + 3], stnX[i], 0, 0);
        dualPart(frmX[i] - rvx, frmY[i] - rvy, frmZ[i] - rvz,
                 sq0[s4], sq0[s4 + 1], sq0[s4 + 2], sq0[s4 + 3], sqe, s4);
      }
      /* --- the twelve limb bones --- */
      for (k = 0; k < 4; k++) {
        var J = JOINT[k];
        for (i = 0; i < 3; i++) {
          boneFrame(k * 3 + i, J[i][0], J[i][1], J[i][2], J[i + 1][0], J[i + 1][1], J[i + 1][2]);
        }
      }
      boneMotions();
      /* --- the 1027 --- */
      var W = MESH.w, S_ = MESH.s;
      var NBS = MESH.nbs, BIDX = MESH.bidx, BWT = MESH.bwt;
      for (i = 0; i < NV; i++) {
        var f = S_[i] * (NS - 1);
        var j0 = f | 0; if (j0 > NS - 2) j0 = NS - 2;
        var u = f - j0, a4 = j0 * 4, b4 = a4 + 4;
        var w = W[i], g;

        /* the spine station under this vertex is the sign reference:
           every other influence is flipped to match it. */
        var rfx = sq0[a4], rfy = sq0[a4 + 1], rfz = sq0[a4 + 2], rfw = sq0[a4 + 3];
        g = (1 - w) * (1 - u);
        var q0x = rfx * g, q0y = rfy * g, q0z = rfz * g, q0w = rfw * g;
        var qex = sqe[a4] * g, qey = sqe[a4 + 1] * g, qez = sqe[a4 + 2] * g, qew = sqe[a4 + 3] * g;

        g = (1 - w) * u;
        if (sq0[b4] * rfx + sq0[b4 + 1] * rfy + sq0[b4 + 2] * rfz + sq0[b4 + 3] * rfw < 0) g = -g;
        q0x += sq0[b4] * g; q0y += sq0[b4 + 1] * g; q0z += sq0[b4 + 2] * g; q0w += sq0[b4 + 3] * g;
        qex += sqe[b4] * g; qey += sqe[b4 + 1] * g; qez += sqe[b4 + 2] * g; qew += sqe[b4 + 3] * g;

        if (w > 0) {
          /* THE BONES THIS VERTEX LISTENS TO, and how much. The bake
             emits a list, not a pair, because a pair has to be CHOSEN
             and choosing puts a boundary somewhere: neighbours either
             side of it followed different bones and the skin between
             them carried the whole difference. A list that fades in
             and out has no boundary to be on the wrong side of. */
          var s0 = i * NBS;
          for (var sl = 0; sl < NBS; sl++) {
            g = BWT[s0 + sl];
            if (g <= 0) break;                 // the list is sorted; nothing after
            var c4 = BIDX[s0 + sl] * 4;
            if (bq0[c4] * rfx + bq0[c4 + 1] * rfy + bq0[c4 + 2] * rfz + bq0[c4 + 3] * rfw < 0) g = -g;
            q0x += bq0[c4] * g; q0y += bq0[c4 + 1] * g; q0z += bq0[c4 + 2] * g; q0w += bq0[c4 + 3] * g;
            qex += bqe[c4] * g; qey += bqe[c4 + 1] * g; qez += bqe[c4 + 2] * g; qew += bqe[c4 + 3] * g;
          }
        }

        /* renormalising is what makes the sum rigid again */
        var n = q0x * q0x + q0y * q0y + q0z * q0z + q0w * q0w;
        if (n < 1e-12) {                 // influences cancelled: keep the spine
          q0x = rfx; q0y = rfy; q0z = rfz; q0w = rfw;
          qex = sqe[a4]; qey = sqe[a4 + 1]; qez = sqe[a4 + 2]; qew = sqe[a4 + 3];
          n = 1;
        } else n = 1 / Math.sqrt(n);
        q0x *= n; q0y *= n; q0z *= n; q0w *= n;
        qex *= n; qey *= n; qez *= n; qew *= n;

        /* one rest point, one blended motion: turn it, then shift it */
        qrot(q0x, q0y, q0z, q0w, restX[i], restY[i], restZ[i]);
        var t3 = i * 3;
        skinPos[t3]     = rvx + 2 * (q0w * qex - qew * q0x + q0y * qez - q0z * qey);
        skinPos[t3 + 1] = rvy + 2 * (q0w * qey - qew * q0y + q0z * qex - q0x * qez);
        skinPos[t3 + 2] = rvz + 2 * (q0w * qez - qew * q0z + q0x * qey - q0y * qex);
      }
      /* --- scatter into the non-indexed buffer --- */
      var arr = skinAttr[oi].array;
      for (i = 0; i < NT * 3; i++) {
        var v3 = TRI[i] * 3, a3 = i * 3;
        arr[a3] = skinPos[v3]; arr[a3 + 1] = skinPos[v3 + 1]; arr[a3 + 2] = skinPos[v3 + 2];
      }
      skinAttr[oi].needsUpdate = true;
      skinMesh[oi].matrix.copy(mBody);
      skinMesh[oi].visible = true;
    }


    /* The head's own frame, so the face rides the skull. */
    var hbF = new THREE.Vector3(), hbU = new THREE.Vector3(), hbS = new THREE.Vector3();
    var fpt = new THREE.Vector3(), fdir = new THREE.Vector3();
    function headBasis(t) {
      hbF.copy(t).normalize();
      hbS.crossVectors(hbF, UP);
      if (hbS.lengthSq() < 1e-8) hbS.set(0, 0, 1);
      hbS.normalize();
      hbU.crossVectors(hbS, hbF).normalize();
    }
    /* A point given in head-local (forward, up, side) put back into
       body-local space, offset from the head's root. */
    function faceAt(ox, oy, oz, f, u, sd) {
      fpt.set(ox + hbF.x * f + hbU.x * u + hbS.x * sd,
              oy + hbF.y * f + hbU.y * u + hbS.y * sd,
              oz + hbF.z * f + hbU.z * u + hbS.z * sd);
    }
    function faceDir(f, u, sd) {
      fdir.set(hbF.x * f + hbU.x * u + hbS.x * sd,
               hbF.y * f + hbU.y * u + hbS.y * sd,
               hbF.z * f + hbU.z * u + hbS.z * sd).normalize();
    }

    /* ------------------------------------------------------------
       PUT A FITTING ON THE SKIN.

       Given a body-local x and a direction out of the centreline —
       `u` up, `sd` to the side — this writes back how far up and out
       the SURFACE actually is there, into `fu`/`fs`, for faceAt to
       use as its offsets.

       The cross-section is an ellipse with semi-axes `halfW` across
       and `halfH` tall, both read off otterbody.js's own profile at
       the same `s` the body links are built from, so the face lands on
       the same surface the head is drawn with by construction. A
       feature can no longer sink into the head because somebody
       re-shaped the head; the only way to bury one now is to ask for a
       sink, which is what `sink` is for and why it is a fraction of
       the local radius rather than an absolute depth.
       ------------------------------------------------------------ */
    var fu = 0, fs = 0;
    function onSkin(x, u, sd, sink) {
      var s = Math.max(0, Math.min(1, (x - X_TIP) / (X_NOSE - X_TIP)));
      var a = OtterBody.halfW(s), b = OtterBody.halfH(s);
      var L = Math.sqrt(u * u + sd * sd) || 1;
      var du = u / L, ds = sd / L;
      var r = 1 / Math.sqrt((ds / a) * (ds / a) + (du / b) * (du / b));
      r *= 1 - sink;
      fu = du * r; fs = ds * r;
    }

    function draw(o, oi) {
      setBody(o);
      var sg;
      liftU = (o.y - (o.ground === undefined ? o.y : o.ground)) / (S * o.size);
      planeSin = Math.sin(o.att[0]);
      planeCos = Math.cos(o.att[0]);
      /* Body +X in world is the heading (sin yaw, 0, cos yaw) and body
         +Z is (-cos yaw, 0, sin yaw) — the two axes walkLimb needs to
         put a world-space plant back into body-local space. */
      bodySin = Math.sin(o.yaw);
      bodyCos = Math.cos(o.yaw);
      bodyScale = S * o.size;          // walkLimb converts world metres to body units with it

      /* ---- THE SPINE, THE NECK, THE HEAD AND THE TAIL ARE ONE LINE ----

         Everything from the rump to the tail tip is now sampled off a
         single centreline, `spineAt`, and the parts are dropped along
         it link by link. That is the whole difference between this
         animal and the one that read as a block: it used to be three
         rigid tubes bolted end to end at fixed angles, so nothing about
         it could bend, and a mustelid is a body that does almost
         nothing BUT bend.

         `s` runs 0 at the tail tip to 1 at the nose, so one parameter
         covers the whole animal and the wave that travels down it is
         continuous across the rump — the join that used to be a hinge.
         The centreline is walked, not integrated: each link is placed
         from one sample to the next, spanning whatever distance that
         turns out to be. */
      /* NOTE THE ORDER. The limbs are solved first, then the skin is
         laid over both spine and bones together, because a vertex at a
         shoulder socket belongs partly to each and cannot be placed
         until both are known. Under the old rigid-link body the two
         were independent and the order did not matter. */

      /* The face rides the skull, so it is placed off the centreline
         where the head is rather than off fixed body coordinates. */
      spineAt(o, S_NECK_END);
      var hx = jx, hy = jy, hz = jz;
      tangentAt(o, S_NECK_END, 1);
      /* THE HEAD GETS ITS OWN MOTION, because the centreline alone
         leaves it dead still: the wave's amplitude falls off as
         (1-s)^2 so that the front of the animal is a stable platform,
         which is right for the body and wrong for the head — measured
         at 0.5 mm of travel, i.e. a rigid mask on a moving animal.

         So it looks around, slowly, on its own phase per animal, and
         it is damped hard while the animal is hunting: a cruising
         otter scans, one chasing a fish does not take its eyes off it.
         `pose[6]` is the paddle drive, which is already high exactly
         when the animal is committed, so it does the damping for free. */
      var scan = 1 - Math.min(1, o.pose[6] * 0.75);
      var lookY = Math.sin(o.wob * TAU * 0.37 + oi * 1.7) * HEAD_LOOK * scan;
      var lookP = Math.sin(o.wobZ * TAU * 0.29 + oi * 2.3) * HEAD_NOD * scan;
      var cL = Math.cos(lookY), sL = Math.sin(lookY);
      tan.set(tan.x * cL - tan.z * sL, tan.y + lookP, tan.x * sL + tan.z * cL).normalize();

      /* THE EYES AND EARS ARE PART OF THE ANIMAL NOW. Both used to be
         separate solids placed here against the skull; `Otter.obj` has
         its own, the eyes as two loose components the bake colours flat
         black and the ears welded into the head, so they are skinned
         along with everything else and cannot come adrift of it.

         What is left riding the head frame is the WHISKER FAN, the one
         thing the reference does not have. It still has to be carried
         by the head's own frame rather than pinned to body axes, or the
         muzzle turns and the whiskers stay put. */
      headBasis(tan);
      for (var s = 0; s < 2; s++) {
        sg = s === 0 ? 1 : -1;
        /* A fan of three off one root per side — up, level, down —
           rather than three separately-placed roots. Real whiskers
           spring from a tight pad, not a spread. */
        var wkx = HEAD_AT + WHISK.at * HEAD_LEN;
        onSkin(wkx, WHISK.y, WHISK.z, 0);
        for (var w = 0; w < 3; w++) {
          faceAt(hx, hy, hz, wkx - HEAD_AT, fu, sg * fs);
          faceDir(0.55 + w * 0.035, 0.22 - w * 0.21, sg * 0.80);
          put(R.whisker, oi * 6 + s * 3 + w, root.copy(fpt), dir.copy(fdir), 1, 1);
        }
      }

      /* ---- the four limbs ----
         Two segments each, posed from an angle and a bend (§36: a limb
         whose job is the motion itself is posed, not solved). `a` is
         measured from straight DOWN toward BACKWARD, so 0 is a leg
         hanging under the animal and 1.5 is one streamed out behind
         it — which is the difference between a hauled otter and a
         swimming one, in one number. */
      var paddle = o.pose[6];
      var walking = o.state === 'walk';
      for (var l = 0; l < 4; l++) {
        if (walking) { walkLimb(o, oi, l); continue; }
        var fore = l < 2;
        var a0 = fore ? o.pose[0] : o.pose[3];
        var knee = fore ? o.pose[1] : o.pose[4];
        var spl = fore ? o.pose[2] : o.pose[5];
        var side = HIP_SIDE[l];
        /* Fore and hind beat in antiphase, and the two sides of a pair
           are half a beat apart again — a swimming mustelid's hind feet
           alternate rather than kicking together. */
        var ph = o.gait * TAU + (fore ? 0 : Math.PI) + (side > 0 ? 0 : Math.PI * 0.5);
        var beat = paddle * 0.30 * Math.sin(ph);

        var a = a0 + beat;
        var px = HIP_X[l], py = HIP_Y[l], pz = side * HIP_Z[l];
        var Jp = JOINT[l];
        Jp[0][0] = px; Jp[0][1] = py; Jp[0][2] = pz;

        for (var j = 0; j < 2; j++) {
          var aj = j === 0 ? a : a + knee + beat * 0.5;
          var vx = -Math.sin(aj);
          var vy = -Math.cos(aj);
          var vz = side * spl * (j === 0 ? 1 : 1.25);
          var L = Math.sqrt(vx * vx + vy * vy + vz * vz) || 1;
          dir.set(vx / L, vy / L, vz / L);
          var len = j === 0 ? L_UP[l] : L_LO[l];
          floorClamp(px, py, pz, len);
          px += dir.x * len; py += dir.y * len; pz += dir.z * len;
          Jp[j + 1][0] = px; Jp[j + 1][1] = py; Jp[j + 1][2] = pz;
        }
        /* The paw carries on from the ankle along the last segment — a
           swimming foot streams with the leg, which is exactly the case
           the walk's flat-on-the-sand paw is not.

           It is clamped like a BONE, because it is as long as either
           leg segment on this animal; clamping the ankle and letting
           the paddle carry on downward buries exactly the part that is
           supposed to be resting ON the sand (§41's lesson, and it
           survived the change of body unchanged). */
        floorClamp(px, py, pz, L_FT[l]);
        Jp[3][0] = px + dir.x * L_FT[l];
        Jp[3][1] = py + dir.y * L_FT[l];
        Jp[3][2] = pz + dir.z * L_FT[l];
      }

      skin(o, oi);

      /* The fish, held crosswise on the chest between the forepaws —
         it surfaces in the jaws (§42's original call) but the animal
         is drawn belly-up for the whole `catch` hold, so that is where
         it would actually be resting. Drawn only while it has one —
         the rest of the time its slot is parked. */
      if (o.chew > 0) {
        put(R.fish, oi, root.set(CHEST_X, CHEST_Y, 0), dir.set(0.10, 0.28, 1), 1, 1);
      } else {
        mOut.copy(HIDE);
        R.fish.mesh.setMatrixAt(oi, mOut);
      }
    }

    /* ------------------------------------------------------------
       finding places
       ------------------------------------------------------------ */
    /* `upShore` biases the target landward, and it is not decoration —
       it is what makes the haul-out reachable at all.

       A romp arrives at the seaward end and the only ground it can lie
       on is the waterline, fifty to seventy metres up the shore. An
       unbiased random walk between targets 6-20 m apart covers plenty
       of PATH and almost no NET DISTANCE, so the group milled about
       the channel for the whole visit and `haulSpot` never once
       returned anything inside HAUL_R. Zero haul-outs across ten tide
       cycles, and with them the whole drying-off colour mechanic —
       §31's "a behaviour that never fires is not modelled", found by
       the state histogram rather than by watching.

       Following the flood up the shore is also simply what the animal
       does, so the fix and the behaviour are the same thing. */
    function swimSpot(cx, cz, near, far, out, upShore) {
      var tries = upShore ? 60 : 30;
      for (var k = 0; k < tries; k++) {
        var a = range(0, TAU), r = range(near, far);
        var x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
        if (x < -halfX || x > halfX) continue;
        if (z < Z_RANGE[0] || z > zHi) continue;
        // first two thirds of the tries insist on progress landward
        if (upShore && k < tries * 0.66 && z > cz - r * 0.35) continue;
        if (depthAt(x, z) < SWIM_DEPTH) continue;
        out.x = x; out.z = z;
        return true;
      }
      return false;
    }

    /* Ground just awash — shallow enough to lie on, and it has to be
       genuinely shallow rather than merely shallower.

       NEAREST rather than first-found, because the haul-out is not
       scattered about: on this transect it is a LINE, the waterline
       itself, and everything qualifying lies along it. A random-sample
       search that stops at the first hit sends the romp to an
       arbitrary point on that line, which can be forty metres further
       along the shore than the piece directly in front of them. */
    function haulSpot(cx, cz, out) {
      var bestD = Infinity, bx = 0, bz = 0, found = false;
      for (var k = 0; k < 220; k++) {
        var a = range(0, TAU), r = range(3, HAUL_R);
        var x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
        if (x < -halfX || x > halfX) continue;
        if (z < Z_RANGE[0] || z > zHi) continue;
        var d = depthAt(x, z);
        if (d <= 0 || d > HAUL_DEPTH) continue;   // dry ground is not a haul-out either, it is land
        var dd = (x - cx) * (x - cx) + (z - cz) * (z - cz);
        if (dd < bestD) { bestD = dd; bx = x; bz = z; found = true; }
      }
      if (found) { out.x = bx; out.z = bz; }
      return found;
    }
    var spot = { x: 0, z: 0 };

    /* ------------------------------------------------------------
       the hunt — the push wiring. See the header for why this one
       is not a pull like every wiring since §27.
       ------------------------------------------------------------ */
    function findFish(o) {
      if (!fishList) return null;
      var best = null, bestD = HUNT_R * HUNT_R;
      for (var i2 = 0; i2 < fishList.length; i2++) {
        var f = fishList[i2];
        if (f.state === 'dead' || !f.vis) continue;
        var dx = f.x - o.x, dz = f.z - o.z;
        var d2 = dx * dx + dz * dz;
        if (d2 < bestD) { bestD = d2; best = f; }
      }
      return best;
    }

    /* Everything close enough to know it is being hunted. `scared` is
       the goby's own field, already decayed and already wired to its
       DART speed (gobies.js) — so frightening one costs one line and
       needs no new state on either side. */
    function scareNearby(o) {
      if (!fishList) return;
      for (var i3 = 0; i3 < fishList.length; i3++) {
        var f = fishList[i3];
        if (f.state === 'dead' || !f.vis) continue;
        var dx = f.x - o.x, dz = f.z - o.z;
        if (dx * dx + dz * dz < SCARE_R * SCARE_R) f.scared = 1.1;
      }
    }

    function ease(cur, want, k) {
      for (var i4 = 0; i4 < cur.length; i4++) cur[i4] += (want[i4] - cur[i4]) * k;
    }

    /* `allowDry` is false for every swimming animal and true for the
       romp's own point and for a hauled one.

       A swimmer must not cross dry ground, and nothing in the steering
       stopped it: the formation slot is up to two metres off the
       romp's point in any direction, and near the waterline — which is
       exactly where this animal spends the end of every visit — that
       is enough to put half the family on land. 5005 frames of otters
       swimming over dry sand across twenty tide cycles, caught by an
       invariant in the harness rather than by anything visible in the
       state histogram. gobies.js's own `steer` has had this guard
       since §40 for the same reason; this is that guard.

       The romp's POINT is exempt because it is not an animal — it is
       the formation's origin, and stalling it on a waterline would
       jam the whole group behind it. */
    function steer(o, tx, tz, speed, dt, allowDry) {
      var dx = tx - o.x, dz = tz - o.z;
      var d = Math.sqrt(dx * dx + dz * dz);
      if (d > 1e-4) {
        var want = Math.atan2(dx / d, dz / d);
        var e = want - o.yaw;
        while (e > Math.PI) e -= TAU;
        while (e < -Math.PI) e += TAU;
        var t = TURN * dt;
        o.yaw += Math.abs(e) < t ? e : (e > 0 ? t : -t);
        var go = Math.min(speed * dt, d);
        var nx = o.x + Math.sin(o.yaw) * go;
        var nz = o.z + Math.cos(o.yaw) * go;
        /* THE GUARD ONLY STOPS AN ANIMAL ENTERING DRY GROUND. It must
           never stop one LEAVING it, and the first version did exactly
           that — which turned 5000 stranded frames into 55000.

           The ebb dries the ground under a hauled romp while it is
           lying on it; that is not a bug, it is what a falling tide
           does. But a plain "the step must land in water" test then
           traps the whole family on the bar, because from dry ground
           almost every candidate step is also dry. Allowing the step
           whenever the animal is ALREADY dry lets it walk itself back
           to the water, which is the one thing it must always be able
           to do.

           A CUT-OFF POOL IS NOT AN EXIT EITHER, and that is the second
           half of the same rule. `waterAt` returns the POOL RIM inside
           an isolated pool (world.js, §3) — which is exactly what makes
           the goby's pool trap emergent — so an otter left in one reads
           perfectly good water under itself, `stuck` stays false, and
           every step over the rim is refused as dry. One romp member
           paddled a puddle for 11.5 s, 31 m behind the group, until the
           departing point hid the whole family. A goby cannot leave a
           pool; an otter walks out of one, so pool water counts here as
           being stranded rather than as being afloat. */
        var here = world.waterAt(o.x, o.z);
        var pool = world.poolAt ? world.poolAt(o.x, o.z) : null;
        var stuck = here === null || (pool !== null && pool.rimY > world.tide);
        if (allowDry || stuck || world.waterAt(nx, nz) !== null) { o.x = nx; o.z = nz; }
      }
      return d;
    }

    /* Seconds of usable water left in this visit. `LEAVE_BELOW` is
       the mark the romp goes out on, so this is its real deadline —
       see `work`. Falls back to the visit timer if tide.js is not
       there, which keeps this file runnable on its own. */
    function waterLeft(simTime) {
      if (!window.Tide || !Tide.secsUntilBelow) return romp.visitT;
      return Tide.secsUntilBelow(simTime, LEAVE_BELOW, 120);
    }

    /* Put a romp on the shore, from off the plot, swimming.

       Lifted out of `case 'away'` in §48 and otherwise unchanged. It
       is a function now because the CINEMATIC has to be able to call
       it: a tour that opens with the flood and cuts to the romp cannot
       be at the mercy of VISIT_ODDS declining half of all tides, and
       `summon` below is the only honest way to skip that roll — it
       skips the DICE, not the animal. Everything after this call is
       the same behaviour the sim runs unattended, which is the whole
       point (see cinematic.js's one rule). */
    function beginVisit(secs) {
      romp.state = 'arrive';
      romp.visits++;
      romp.visitT = secs;
      romp.x = range(-halfX * 0.5, halfX * 0.5);
      romp.z = Math.min(SEA_Z, zHi);
      romp.yaw = Math.PI;
      if (!swimSpot(romp.x, romp.z - 16, 4, 18, spot)) { spot.x = romp.x; spot.z = romp.z - 14; }
      romp.tx = spot.x; romp.tz = spot.z;
      for (var q = 0; q < N; q++) {
        var oq = otters[q];
        oq.x = romp.x + oq.side * 0.8;
        oq.z = romp.z + oq.back * 0.8 + range(0, 4);
        oq.y = world.heightAt(oq.x, oq.z) + 0.2;
        oq.yaw = Math.PI;
        oq.state = 'swim';
        oq.vis = true;
        oq.prey = null;
        oq.chew = 0;
        oq.wet = 1;
        oq.cool = pair(HUNT_COOL) * rand();
      }
    }

    /* ------------------------------------------------------------
       update
       ------------------------------------------------------------ */
    function update(dt, simTime) {
      var tide = world.tide;
      var rising = world.tideDir > 0;
      var moved = false, tinted = false;

      /* ---- the romp's own decisions ---- */
      romp.stateT -= dt;
      switch (romp.state) {
        case 'away':
          /* One roll per qualifying tide, not one per frame. `armed`
             is cleared on the roll and set again when the tide drops
             back, so a declined tide stays declined instead of being
             re-rolled sixty times a second until it succeeds. */
          if (tide < LEAVE_BELOW) romp.armed = true;
          if (romp.armed && rising && tide >= ARRIVE_ABOVE && !world.isNight) {
            romp.armed = false;
            if (rand() < VISIT_ODDS) beginVisit(pair(VISIT_MAX));
          }
          break;

        case 'arrive':
          if (steer(romp, romp.tx, romp.tz, SWIM, dt, true) < 2.5) {
            romp.state = 'work';
            /* Zero, not a work leg: the haul-out is 50 m away and the
               water is at its deepest the moment they arrive, so the
               first thing worth asking is whether there is time to go
               and lie on it. Waiting out a 6-12 second leg first is
               how the last three visits spent their margin. */
            romp.stateT = 0;
          }
          break;

        case 'work':
          romp.visitT -= dt;
          if (steer(romp, romp.tx, romp.tz, SWIM, dt, true) < 2.5) {
            /* Landward while the flood is still making, which is both
               how a romp works a shore and how it gets within reach of
               somewhere to haul out. */
            if (swimSpot(romp.x, romp.z, 8, 24, spot, rising)) { romp.tx = spot.x; romp.tz = spot.z; }
          }
          /* `tohaul` is a TRAVEL leg and `haul` is the lying-down. The
             first pass ran them as one state, so the animals were
             labelled 'haul' — and posed sprawled, and drying off —
             while still swimming twenty metres to get there. The
             waterline is far enough away on this shore that the
             difference is most of a minute. */
          /* DO NOT SET OFF FOR A HAUL-OUT THE VISIT CANNOT PAY FOR.
             `HAUL_R` was already cut from 60 m to 30 m for this, and
             it was not enough: over 900 seconds the romp still started
             three trips, finished one, and lay down for less than half
             a second before the visit ran out under it. `tohaul` was
             3.0% of the clock and `haul` was 0.0% — §31's "a behaviour
             that never fires", surviving one round of tuning by being
             ALMOST fired.

             The distance was never the binding constraint; the CLOCK
             was, and it is the clock that is checked here. The trip is
             a known speed over a known distance, so the romp can price
             it before it commits, and it only goes if what is left of
             the visit covers the swim AND a full lie-down at the end.
             §38's rule, one level up: if a behaviour will not come out,
             work out which of the decisions around it is running
             longer, rather than moving the thing it is aiming at. */
          /* PRICE THE TRIP AGAINST THE CLOCK THAT IS ACTUALLY BINDING,
             and the first attempt at this got that wrong.

             `visitT` is 95-160 seconds and the tide cycle is 90, so
             the visit timer NEVER runs out — the romp always leaves
             because the water went, not because it had had enough. A
             guard written against `visitT` therefore passes every
             time it is asked and changes nothing, which is exactly
             what the measurement showed: three trips, one arrival,
             `haul` at 0.0% of the clock both before and after.

             §38's rule, asked of a clock instead of a band: when a
             behaviour will not come out, find which of the decisions
             around it is running longer. Here the answer is that there
             are two deadlines and the code was watching the slack one.
             `Tide.secsUntilBelow` answers the tight one, so the romp
             can compare a known swim at a known speed against the
             water it genuinely has, and commit or decline honestly. */
          /* `holdHaul` is the cinematic's, and it only ever DELAYS this
             check — it cannot invent a haul-out or move one. A romp that
             decides to lie down in the middle of the hunt shot is a romp
             that is not hunting, and the tour would be filming an empty
             stretch of water while the one behaviour it came for happened
             off the clock. Held during the hunt beats and released before
             the haul-out beat, so the trip is priced and taken by the
             animal exactly as it always is, a few seconds later than it
             might otherwise have been. */
          if (romp.stateT <= 0 && !romp.holdHaul) {
            romp.stateT = pair(HAUL_CHECK);
            if (haulSpot(romp.x, romp.z, spot)) {
              var trip = Math.sqrt((spot.x - romp.x) * (spot.x - romp.x) +
                                   (spot.z - romp.z) * (spot.z - romp.z)) / SWIM;
              if (Math.min(romp.visitT, waterLeft(simTime)) > trip + HAUL_SECS[0]) {
                romp.state = 'tohaul';
                romp.tx = spot.x; romp.tz = spot.z;
              }
            }
          }
          /* THEY LEAVE ON THE TURN, not at a height. A romp comes in
             on the flood and goes out with it, and waiting for the
             water to drop past a mark instead strands the family: at
             high water they are far up the shore, and the ebb pulls
             the waterline seaward faster than a formation follows it.
             LEAVE_BELOW survives only as the backstop that re-arms
             the arrival roll. */
          if (romp.visitT <= 0 || (!rising && tide < LEAVE_BELOW) || world.isNight) {
            romp.state = 'leave';
            romp.tz = Math.min(SEA_Z + 2, zHi);
          }
          break;

        case 'tohaul':
          romp.visitT -= dt;
          if (steer(romp, romp.tx, romp.tz, SWIM, dt, true) < 2.0) {
            romp.state = 'haul';
            romp.stateT = pair(HAUL_SECS);
          }
          if (romp.visitT <= 0 || (!rising && tide < LEAVE_BELOW)) {
            romp.state = 'leave';
            romp.tz = Math.min(SEA_Z + 2, zHi);
          }
          break;

        case 'haul':
          romp.visitT -= dt;
          if (romp.stateT <= 0) {
            romp.state = 'work';
            romp.stateT = pair(WORK_SECS);
            if (swimSpot(romp.x, romp.z, 5, 18, spot)) { romp.tx = spot.x; romp.tz = spot.z; }
          }
          if (romp.visitT <= 0 || (!rising && tide < LEAVE_BELOW)) {
            romp.state = 'leave';
            romp.tz = Math.min(SEA_Z + 2, zHi);
          }
          break;

        case 'leave':
          steer(romp, romp.tx, romp.tz, SWIM * 1.15, dt, true);
          if (romp.z >= romp.tz - 1.5) {
            romp.state = 'away';
            for (var q2 = 0; q2 < N; q2++) {
              otters[q2].state = 'away';
              otters[q2].vis = false;
              otters[q2].prey = null;
              otters[q2].chew = 0;
              hide(q2);
            }
            moved = true;
          }
          break;
      }

      /* ---- and each animal inside it ---- */
      var hauling = romp.state === 'haul';
      var sinY = Math.sin(romp.yaw), cosY = Math.cos(romp.yaw);

      for (var oi = 0; oi < N; oi++) {
        var o = otters[oi];
        if (!o.vis) continue;
        var sc = S * o.size;
        var x0 = o.x, z0 = o.z;               // for this frame's ground speed — see below

        o.wob += dt * SLOT_HZ;
        o.wobZ += dt * SLOT_HZ * 0.8;

        if (o.chew > 0) {
          /* Surfaced with a fish. It stops swimming and stops hunting,
             which is the only time an otter here holds still over the
             ground in open water — but it still floats: a slow drift
             on the current rather than parked at a fixed point. */
          o.chew -= dt;
          o.state = 'catch';
          if (o.chew <= 0) { o.state = 'swim'; o.cool = pair(HUNT_COOL); }
          o.x += Math.sin(o.wob * TAU) * CATCH_DRIFT * dt;
          o.z += Math.cos(o.wobZ * TAU) * CATCH_DRIFT * dt;
        } else if (o.prey) {
          o.state = 'dive';
          o.preyT -= dt;
          if (o.prey.state === 'dead' || !o.prey.vis || o.preyT <= 0) {
            o.prey = null;
            o.state = 'swim';
            o.cool = pair(HUNT_COOL);
          } else {
            var d = steer(o, o.prey.x, o.prey.z, CHASE, dt);
            o.prey.scared = 1.2;
            /* THE REACH IS A SPHERE, not a circle drawn on the map.
               The same bug as the height above and it has to go in the
               same breath, because a horizontal-only test lets the
               animal take a fish that is directly below it and out of
               reach — which makes the descent decoration. */
            var dyp = o.prey.y - o.y;
            if (d * d + dyp * dyp < TAKE_R * TAKE_R) {
              /* MOST CHASES FAIL, and the roll happens at the moment
                 of contact rather than when the chase starts — the
                 pursuit is real either way and only the outcome
                 differs. Without it the romp harvests: a first run put
                 56 kills into a 54-fish population over ten tide
                 cycles, which is not predation. */
              if (rand() < CATCH_ODDS) {
                /* THE CALL. gobies.js owns the bookkeeping — the slot
                   empties, counts down and comes back as a recruit from
                   the channel — so nothing here allocates, counts or
                   respawns anything. */
                if (gobies && gobies.take) gobies.take(o.prey, 'otter');
                o.kills++;
                o.chew = pair(CHEW_SECS);
                o.state = 'catch';
              } else {
                o.prey.scared = 1.6;      // it got away, and it knows
                o.state = 'swim';
              }
              o.prey = null;
              o.cool = pair(HUNT_COOL);
            }
          }
        } else {
          /* An individual only ever has five states, and `tohaul` is
             not one of them — travelling to the haul-out IS swimming.
             The romp's state list is longer than the animals' on
             purpose: the group makes the plans. */
          o.state = hauling ? 'haul' : 'swim';
          /* Hold the slot. The formation is built in the ROMP's frame,
             so it turns with the group instead of being a fixed
             pattern on the map. */
          var jx = Math.sin(o.wob * TAU) * SLOT_JITTER;
          var jz = Math.cos(o.wobZ * TAU) * SLOT_JITTER;
          var lx = o.side + jx, lz = -o.back + jz;
          var tx = romp.x + lx * cosY + lz * sinY;
          var tz = romp.z - lx * sinY + lz * cosY;
          /* AN OTTER ON SAND DOES NOT TRAVEL AT SWIMMING SPEED, and
             until now one crossing a drained flat during `tohaul` did
             2.75 m/s — faster than it swims. The test is the ground
             under the animal, not what the group is doing, so it reads
             last frame's own label: `walk` and `haul` are both set
             from `surf === null` below. One frame late costs nothing
             and saves computing the water height twice. */
          var onLand = o.state === 'walk' || o.state === 'haul';
          var dist = steer(o, tx, tz,
                           onLand ? LAND_SPEED : SWIM * 1.25, dt, hauling || onLand);
          if (dist < 0.25) o.state = hauling ? 'haul' : 'swim';

          o.cool -= dt;
          o.scan -= dt;
          if (o.scan <= 0) {
            o.scan = SCAN_SECS;
            scareNearby(o);
            /* A ROMP HUNTS ON THE WAY, and gating this on `work`
               alone cost most of the predation. Once the haul-out
               started converting, `tohaul` took a third of the time
               the group had on the plot, and because the scan ignored
               it the kills fell from 8 in 900 seconds to 3 in 1800.

               `tohaul` is a travel leg through exactly the water the
               romp was working a moment earlier — this file already
               says as much about the individuals, who have no
               `tohaul` state and are simply swimming. A fish passed
               on the way to the bar is still a fish, and an animal
               breaking formation for it is the same behaviour it was
               doing before the group changed its mind. `haul` is the
               real exclusion, and `hauling` already covers that. */
            if (o.cool <= 0 && !hauling &&
                (romp.state === 'work' || romp.state === 'tohaul')) {
              var f = findFish(o);
              if (f) { o.prey = f; o.preyT = GIVE_UP; o.state = 'dive'; }
            }
          }
        }

        /* ---- height: a swimmer rides the surface, a hauled animal
           lies on the sand ---- */
        var ground = world.heightAt(o.x, o.z);
        o.ground = ground;                    // draw() needs it for the floor plane
        var surf = world.waterAt(o.x, o.z);
        /* THE GROUND HAS THE LAST WORD ON WHETHER AN ANIMAL IS HAULED.
           The romp decides where to go; whether an individual is
           swimming or lying down is settled by whether there is water
           under it, and nothing else. Without this the formation's
           own spread — two metres either side of a point sitting on
           the waterline — leaves half the family posed mid-paddle on
           dry sand, which was 6% of all otter-frames. An otter on dry
           ground is hauled out by definition, so the label follows the
           ground rather than the group. */
        /* What the animal actually did this frame, over the ground.
           `steer` returns the distance still to GO, which is not the
           same thing and is zero for an animal held at its slot. */
        o.step = Math.sqrt((o.x - x0) * (o.x - x0) + (o.z - z0) * (o.z - z0));
        o.speed = dt > 0 ? o.step / dt : 0;

        /* ON LAND, AND THE ONLY QUESTION LEFT IS WHETHER IT IS MOVING.
           The rule below used to end here, at `haul`, and that is what
           put a sprawled animal across the sand on its belly. Lying
           down and crawling are different postures and the ground
           cannot tell them apart — only the speed can, with a gap in
           the middle so an animal on the threshold does not flicker
           between the two (§32's BARE/SPENT/GOOD, asked of a gait). */
        if (surf === null && o.state !== 'dive' && o.state !== 'catch') {
          o.state = o.state === 'walk'
            ? (o.speed < WALK_OFF ? 'haul' : 'walk')
            : (o.speed > WALK_ON ? 'walk' : 'haul');
        }
        var st = o.state;
        /* The gait advances by METRES, not by seconds — see the header
           block on STRIDE. This one line is what plants the feet. */
        if (st === 'walk') {
          o.gaitD = (o.step / sc) / STRIDE;
          o.gaitL += o.gaitD;
          o.gaitL -= Math.floor(o.gaitL);
        } else o.gaitD = 0;
        var wantY;
        if (st === 'haul' || st === 'walk' || surf === null) {
          /* Standing on its legs, or lying on its belly. The gap
             between the two is what the gait needs room to work in. */
          wantY = ground + (st === 'walk' ? WALK_LIFT : HAUL_LIFT) * sc;
          /* A bounding otter's back rises and falls twice a cycle —
             once per diagonal couplet. */
          if (st === 'walk') wantY += Math.sin(o.gaitL * TAU * 2) * WALK_BOB * sc;
          o.wet += (0 - o.wet) * Math.min(1, DRY_RATE * dt);
        } else {
          /* The porpoise: a cruising romp rises and falls, and the
             backs coming out of the water in sequence is what says
             "six animals moving together" from any distance. A floating
             `catch` gets its own, softer bob rather than none at all —
             a body on its back rides the water, it does not sit on it. */
          var bob = st === 'swim' ? 0.035 * Math.sin((o.gait + oi * 0.13) * TAU * PORPOISE_HZ * 2)
                  : st === 'catch' ? CATCH_BOB * Math.sin(o.gait * TAU * CATCH_BOB_HZ * 2) : 0;
          wantY = surf - (ATT[st] ? ATT[st][1] : 0.11) * sc + bob * sc;
          /* THE DIVE HAS TO ACTUALLY GO DOWN, and for a while it did
             not. `ATT.dive` sinks the animal 0.42 body units — about
             25 cm — under the surface, which is a POSTURE and not a
             depth, and the chase itself is written in x and z only.
             Over the lagoon at high water that left a diving otter
             2.2 m above the goby it was chasing, and taking it anyway.

             This is §41's vertical check turned on the hunt instead of
             on the larder. The header's overlap table asked whether
             these two species are ever on the shore at the same time
             and answered yes; it never asked whether they are ever at
             the same DEPTH, and a fish that holds the bottom is not
             where a surface swimmer is. So a dive aims at the prey's
             own height, and the sink goes back to being what it always
             was — the attitude the animal holds on the way down. */
          if (st === 'dive' && o.prey) {
            var preyY = o.prey.y + DIVE_CLEAR * sc;
            if (preyY < wantY) wantY = preyY;
          }
          var floorMin = ground + 0.16 * sc;
          if (wantY < floorMin) wantY = floorMin;
          o.wet += (1 - o.wet) * Math.min(1, WET_RATE * dt);
        }
        o.y += (wantY - o.y) * Math.min(1, 7 * dt);

        o.gait += dt * PADDLE_HZ * (st === 'dive' ? 1.5 : st === 'catch' ? 0.25 : 1);
        if (o.gait > 1) o.gait -= 1;

        var k = Math.min(1, POSE_RATE * dt);
        ease(o.pose, POSE[st] || POSE.swim, k);
        ease(o.att, ATT[st] || ATT.swim, k);

        /* ---- the spine rig's two drive values ----
           `flex` eases between states like every other posture number.
           `bend` is measured, not posed: it is this frame's actual turn
           rate, so the body leans into a turn it is really making
           rather than into one the state machine merely intends. The
           yaw difference is wrapped, or the animal snaps into a hard
           bend every time its heading crosses PI. */
        o.flex += ((FLEX[st] === undefined ? FLEX.swim : FLEX[st]) - o.flex) *
                  Math.min(1, FLEX_RATE * dt);
        var dyaw = o.yaw - o.lastYaw;
        while (dyaw > Math.PI) dyaw -= TAU;
        while (dyaw < -Math.PI) dyaw += TAU;
        o.lastYaw = o.yaw;
        var wantBend = dt > 1e-6 ? (dyaw / dt) * BEND_GAIN : 0;
        if (wantBend > BEND_MAX) wantBend = BEND_MAX;
        else if (wantBend < -BEND_MAX) wantBend = -BEND_MAX;
        o.bend += (wantBend - o.bend) * Math.min(1, BEND_RATE * dt);

        /* ---- and the third: reaching for the fish ----
           Driven off `chew` rather than off the state, because `chew`
           is what `draw` draws the fish from. The two cannot disagree
           about whether there is anything there to reach for, which is
           the only way a head bends down over nothing. Eased both ways,
           so it returns to the normal carriage on its own when the
           fish is finished. */
        o.aim += ((o.chew > 0 ? 1 : 0) - o.aim) * Math.min(1, AIM_RATE * dt);

        draw(o, oi);
        moved = true;

        if (Math.abs(o.wet - o.drawnWet) > 0.01) {
          o.drawnWet = o.wet;
          var w = o.wet;
          tint.setRGB(DRY[0] + (WET[0] - DRY[0]) * w,
                      DRY[1] + (WET[1] - DRY[1]) * w,
                      DRY[2] + (WET[2] - DRY[2]) * w);
          for (var ki = 0; ki < SKINNED.length; ki++) {
            var rec = R[SKINNED[ki]];
            for (var jj = 0; jj < rec.per; jj++) rec.mesh.setColorAt(oi * rec.per + jj, tint);
          }
          /* THE BODY TINTS THROUGH ITS OWN MATERIAL, not through
             `instanceColor`, because it is not instanced any more. The
             effect is identical — three.js multiplies material colour
             into the vertex colour in exactly the same place — and this
             animal is the only one on the shore that can afford a
             material each, six of them. `glowBase` is what ui.js's
             hover has to multiply, so it is kept rather than read back
             off the material it is about to overwrite. */
          o.glowBase = tint.clone();
          if (!o.glowing) skinMat[oi].color.copy(tint);
          tinted = true;
        }
      }

      if (moved) for (var k2 in R) R[k2].mesh.instanceMatrix.needsUpdate = true;
      if (tinted) {
        for (var k3 = 0; k3 < SKINNED.length; k3++) {
          var m = R[SKINNED[k3]].mesh;
          if (m.instanceColor) m.instanceColor.needsUpdate = true;
        }
      }
    }

    for (var i0 = 0; i0 < N; i0++) hide(i0);
    for (var kf in R) R[kf].mesh.instanceMatrix.needsUpdate = true;

    return {
      count: N,
      group: group,
      otters: otters,
      romp: romp,
      update: update,
      // is the romp on the plot at all — the visitor's presence gauge
      present: function () { return romp.state !== 'away'; },

      /* ------------------------------------------------------------
         summon / dismiss — the CINEMATIC's two handles (§48).

         Savanna's tour calls `world.trigger('rain', 12)` to force a
         weather event to a length that fits a shot. This shore has no
         weather; what it has is a visitor that turns up on half of the
         qualifying tides and stays 95-160 seconds, and a tour cannot
         hang a two-minute third act on a coin flip.

         `summon` SKIPS THE ROLL AND NOTHING ELSE. It does not place
         the animals, script a route, or guarantee a kill — it calls
         the same `beginVisit` the sim calls when the dice come up, so
         everything from the arrival swim onward is the ordinary,
         unattended behaviour. That is the line: the tour may decide
         that a romp comes, the way it decides the tide is flooding;
         it may not decide what the romp then does.

         `dismiss` is the other end, for the "and they leave" beat —
         the ebb would do it on its own, but the shot needs it on the
         cut rather than whenever the water happens to drop past
         LEAVE_BELOW. `leave` is a real state, so this is still the
         animal's own departure and not a despawn.

         Called on a romp that is already here, `summon` tops the visit
         clock up instead of restarting the visit — a second call must
         not teleport six animals back out to the channel mid-shot. */
      summon: function (secs) {
        var want = secs || pair(VISIT_MAX);
        if (romp.state !== 'away') {
          if (romp.visitT < want) romp.visitT = want;
          return false;
        }
        romp.armed = false;
        beginVisit(want);
        return true;
      },
      dismiss: function () {
        if (romp.state === 'away' || romp.state === 'leave') return false;
        romp.state = 'leave';
        romp.tz = Math.min(SEA_Z + 2, zHi);
        return true;
      },
      // Delay the haul-out decision, never fake one. See the `work` case.
      holdHaul: function (v) { romp.holdHaul = !!v; },

      /* Point the formation at a spot, for the tour's ONE nudge.

         The romp picks its own work targets and this overwrites the
         current one — it is steering, not scripting: where the family
         swims, not what it does when it gets there. The hunt still
         fires on the ordinary HUNT_R scan and still misses on
         CATCH_ODDS. Refused if the spot is not swimmable, so a nudge
         can never beach six animals. */
      steerTo: function (x, z) {
        if (romp.state !== 'work' && romp.state !== 'arrive') return false;
        var d = world.waterAt(x, z);
        if (d === null || d - world.heightAt(x, z) < SWIM_DEPTH) return false;
        romp.tx = x; romp.tz = z;
        return true;
      },

      /* Where to point a camera, and it is NOT `romp.x/z`.

         The romp's own point is the formation's anchor, which is a
         bookkeeping position with no animal at it — six otters hang
         off it at their slot offsets, and during a hunt one of them is
         thirty metres away chasing a fish. A shot framed on the anchor
         is framed on empty water whenever the family spreads out. This
         is the centre of the animals that are actually visible.

         Returns null when there is nothing on the plot, so a shot can
         tell the difference between "they are over there" and "they
         are not here", rather than being handed the origin. */
      centre: function () {
        var x = 0, y = 0, z = 0, n = 0;
        for (var i = 0; i < N; i++) {
          if (!otters[i].vis) continue;
          x += otters[i].x; y += otters[i].y; z += otters[i].z; n++;
        }
        return n ? { x: x / n, y: y / n, z: z / n, n: n } : null;
      },

      /* The first animal in one of the hunt states, for the shots that
         ride an individual instead of the family. `catch` before
         `dive`, because a surfaced otter eating on its back is the
         better picture and a shot that asked for either should not
         settle for the chase while the kill is on screen. */
      hunter: function (which) {
        var i;
        if (which !== 'dive') {
          for (i = 0; i < N; i++) if (otters[i].vis && otters[i].state === 'catch') return otters[i];
          if (which === 'catch') return null;
        }
        for (i = 0; i < N; i++) if (otters[i].vis && otters[i].state === 'dive') return otters[i];
        return null;
      },
      /* ------------------------------------------------------------
         HOW TO MAKE ONE OF THESE GLOW.

         ui.js drives its hover highlight by writing above 1.0 into a
         population's `instanceColor`, which works for every species
         here because every species is instanced. This one is not: its
         body is a Mesh per animal (see THE BODY IS ONE SKINNED MESH),
         so there is no per-instance colour buffer to write into.

         The same trick still applies one level up — three.js multiplies
         the MATERIAL colour into the vertex colour in the same place —
         so the population publishes this and ui.js calls it instead of
         reaching into a buffer. The whisker fan is still instanced and
         still glows the generic way; only the body needs the hook.
         `glowing` is remembered so the wet/dry tint, which runs every
         frame and knows nothing about hovering, does not overwrite a
         glow that is currently on.
         ------------------------------------------------------------ */
      glowApply: function (ind, mul) {
        var idx = otters.indexOf(ind);
        if (idx < 0) return;
        var base = ind.glowBase || tint.setRGB(1, 1, 1).clone();
        ind.glowing = mul !== 1;
        skinMat[idx].color.setRGB(base.r * mul, base.g * mul, base.b * mul);
      },
      stats: function () {
        var kills = 0, holding = 0;
        for (var i = 0; i < N; i++) { kills += otters[i].kills; if (otters[i].chew > 0) holding++; }
        return { visits: romp.visits, kills: kills, holding: holding, state: romp.state };
      }
    };
  }

  window.Otters = { spawn: spawn };
})();
