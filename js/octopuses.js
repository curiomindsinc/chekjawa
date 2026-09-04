/* ============================================================
   octopuses.js — the day octopus (BUILD_GUIDE §41, roster item 1).

   The last predator of the low shore, and the first animal here with
   a HOME IT CHOSE. Everything else on this shore either has no fixed
   address at all (the swimming crab digs in wherever the ebb catches
   it, §36) or is stuck to one (the barnacle, the oyster, the anemone).
   The fiddler crab comes closest — it has a burrow and defends a
   territory round it (crabs.js) — but a fiddler's burrow is a hole in
   mud that it re-digs anywhere. An octopus keeps ONE den, goes out
   from it, and comes back to the same one, and the pile of broken
   shells outside the door is the proof that it has been doing so for
   a while.

   THE MIDDEN IS THE RECEIPT, and it is the fourth one on this shore
   after the fiddler's pellets (§28), the moon snail's sand collar
   (§35) and the horseshoe crab's furrow (§38). Every predator here
   catches nothing — the egret's strike (§30), the sand star's probe
   (§32), the moon snail's drill (§35) and the anemone's fold (§39)
   all stop short on purpose, because what is honest to model is the
   part that shows. The midden is that rule taken one step further:
   the pounce still takes nothing off the shore, and the shell that
   appears outside the den afterwards is the visible half of a meal
   whose other half happened under a spread web where there was
   nothing to see anyway. Watch a den for a few tides and the pile
   grows. That is the whole argument.

   WHAT DRIVES AN OCTOPUS, in priority order:
     1. is the den deep enough to leave  — if not, stay in
     2. is there something to pounce on  — go to it, web out
     3. is the water running off me       — jet home, mantle first
     4. otherwise                        — crawl the flat, arms first

   COLOUR IS THE BEHAVIOUR, and it is the reason this species is worth
   the trouble. Nothing else on this shore changes colour except the
   sponge, which stains slowly with the tide (§35), and the carpet
   anemone, which appears to change because two differently-coloured
   parts trade places (§39). This one genuinely repaints itself in
   under a second: dark red-brown down the den, sand-pale out on the
   flat, and BLANCHED WHITE over a pounce, which is what a real
   *Octopus cyanea* does when it lands on prey. octopusbody.js bakes
   the animal in a neutral mid-tone precisely so `instanceColor` has
   all three channels to work with — §36's lesson, applied forward
   this time instead of being discovered halfway through.

   THE ARMS ARE POSED, NOT SOLVED. §36's rule: IK is for a foot with a
   job to do on the ground, angle-driven posing is for a limb whose
   job is the motion itself. An octopus arm is the second thing every
   time. Each of the eight is a chain of five segments whose direction
   comes straight out of a row of seven numbers, eased between six
   posture presets — balling up in the den, splaying to crawl,
   throwing the web open and streamlining to jet are four rows of one
   table.

   THE SEVENTH OF THOSE NUMBERS IS A SECOND MODEL, not a parameter,
   and it is the only place this animal needed one. A radial crown —
   arm `a` at roll phi about the body axis — is right for the jet and
   silently wrong for the crawl: it puts each arm and its mirror
   across the horizontal plane at the SAME plan-view bearing, so eight
   arms occupy four. `fan` blends that construction against a bearing
   spread across the SEABED, which is what a crawling octopus actually
   does with its arms. Both bugs in this file were found the same way,
   by decomposing the instance matrices (§30) rather than by looking:
   this one, and arm tips 7 cm under the sand because the floor clamp
   was written as a constant on a body that is pitched.

   PREY, AND THE §39 CHECK DONE FIRST. The roster claimed this
   animal's larder was complete: swimming crab (§36), pen shell (§32),
   oyster and mussel (§35). Reading the four species' own constants
   says otherwise, and it says so before a line of scanning code:

     swimming crab   -0.15 .. 0.85 m CD, z 26-64   OVERLAPS
     pen shell        0.10 .. 0.90 m CD, z 26-62   OVERLAPS
     oyster / mussel  1.30 .. 2.10 m CD                 — the high
                      boulders, dry at every low tide and four
                      hundred vertical millimetres above anything
                      that has to stay wet

   So the octopus hunts the first two and cannot reach the second two,
   and that is not a gap to be papered over — it is the shore being
   the shape it is. §39's rule was "check that a predator and its prey
   are ever there at the same time"; this is the vertical version of
   the same question, and the honest answer removed two rows from a
   list rather than adding a scan that would have fired zero times.

   THE INK WAITED FOR A PREDATOR, AND §42 BROUGHT ONE. When this file
   shipped there was nothing on the shore that ate an octopus — the
   swimming crab is prey, the egret works a drained flat this animal
   is never on, and the sea hare already owns the ink gag (§27) — so
   the one thing everybody knows an octopus for was left out on
   purpose. Writing it then would have been writing a behaviour that
   never fires, which is the trap §31's hermit-crab shell fight is the
   standing warning against, and the note here said it goes in with
   the otter or it does not go in.

   The smooth-coated otter (§42) is the otter. `ink` is now a state:
   an otter inside INK_R of an animal that is out of its den turns it
   nearly black, throws its arms wide for half a second over a cloud
   of four blobs, and hands it straight to `jet`, which already knew
   how to get it home. The check sits BEFORE the switch, because a
   romp arriving does not care what the octopus was in the middle of.

   The cloud outlives the state that made it — the animal is shut in
   its den well before the ink has finished dispersing, which is the
   entire point of ink — so `stepCloud` runs every frame for every
   animal rather than inside the `ink` case.
   ============================================================ */
(function () {
  'use strict';

  var TAU = Math.PI * 2;

  /* ---------- the knobs ---------- */
  var S = 0.40;                  // metres per body unit — MANTLE length. Arm span comes out ~1.9 m
  var COUNT = 6;                 // solitary animals with big territories. Six is a lot already

  /* Dens go where there is still water at a spring low (0.10 m CD,
     tide.js) — the subtidal channel and the runnel behind the sandbar,
     which becomes the biggest pool on the shore. An octopus whose den
     dries is a dead octopus, so this threshold is not a preference. */
  var DEN_ZONE = [-0.60, 0.00];
  var DEN_Z = [46, 70];
  var DEN_SPACING = 15;          // metres. They are territorial and they are big

  var HUNT_DEPTH = 0.55;         // metres of water over the den before it will come out
  var RETREAT_DEPTH = 0.35;      // and over its own head before it turns for home
  var MIN_DEPTH = 0.40;          // no wander target shallower than this
  var RANGE = 22;                // metres it will work away from the den
  var HUNT_Z = [32, 71];

  var CRAWL = 0.38;              // m/s, arms-first over the bottom
  var JET = 2.1;                 // m/s, mantle-first. Five times the crawl, and that ratio is the animal
  var TURN = 2.2;                // rad/s
  var GAIT_HZ = 0.65;            // the travelling wave down the arms while crawling

  var SCAN_SECS = 0.5;
  var SCAN_R = 6.5;              // metres it will notice prey across
  var POUNCE_R = 0.9;            // and how close it has to get to throw the web
  var POUNCE_SECS = 3.4;
  /* Most of them fail, and that is not a difficulty setting. A web
     thrown over a swimming crab in open water is a coin toss, and
     without the misses the midden is a clock rather than a record —
     every den would end up with the same pile after the same number of
     tides. */
  var POUNCE_HIT = 0.55;
  var EMERGE_SECS = 1.3;
  var HOME_SECS = 1.1;
  var DEN_SECS = [26, 58];       // how long it sits in before going out again
  var HUNT_SECS = [40, 95];      // and how long a trip lasts before it heads back regardless
  var DEN_R = 0.7;               // metres — close enough to count as arrived
  var ARRIVE_R = 0.5;

  var MIDDEN_MAX = 16;
  var MIDDEN_START = [2, 7];     // the pile already there when the sim starts — a den has a history

  /* ---------- the ink (§42) ----------
     §41 shipped this animal without ink deliberately: nothing here ate
     an octopus, so the startle would have been a behaviour that never
     fired (§31's rule). The smooth-coated otter is what changed that,
     and these are the only knobs it needed.

     A romp is big and loud and an octopus sees it coming, so INK_R is
     generous — much larger than the pounce reach, because this is a
     decision made at distance rather than on contact. */
  var INK_R = 5.5;               // metres — an otter this close and it goes
  var INK_SECS = 0.55;           // the release itself: dark, arms wide, then away
  var INK_COOL = 12;             // seconds before the same animal will ink again
  var CLOUD_PER = 4;             // blobs per animal — a cloud is several (octopusbody.js)
  var CLOUD_LIFE = [3.0, 4.6];   // seconds from release to gone
  var CLOUD_R = [0.35, 2.3];     // body-unit radius: grows, then shrinks back through it
  var CLOUD_DRIFT = 0.28;        // m/s the blobs pull apart as they disperse

  /* ---------- body layout, in body units (mantle length = 1) ----------
     +X is FORWARD, toward the arm crown; the mantle hangs off the
     BACK of the origin. See octopusbody.js's header. */
  var MANTLE_LEN = 1.0;
  var CROWN_X = 0.40;            // where the head part ends and the arms start
  var CROWN_R = 0.17;            // radius of the ring of arm bases
  /* The eye sits ON the head, not in it. The head part is 0.30 body
     units in radius where the eyes go (octopusbody.js), and the first
     pass put them at y 0.17 / z 0.20 — a centre 0.26 from the axis,
     which is INSIDE the skin, so the gold iris began level with the
     surface and the animal read as blind from every angle but one.
     0.20 / 0.23 puts the centre at 0.30, right on the skin, and the
     dome bulges out of it the way a real one does. Caught by
     decomposing the matrices (§30), not by looking. */
  var EYE = { x: 0.15, y: 0.20, z: 0.23 };
  var EYE_DIR = [0.22, 0.60, 0.77];
  var SIPHON = { x: 0.02, y: -0.14, z: 0.15 };
  var SIPHON_DIR = [0.50, -0.75, 0.43];

  var ARM_SEGS = 5;
  var ARMS = 8;
  var ARM_LEN = 2.15;                                  // body units, crown to tip, at full reach
  var ARM_FRAC = [0.26, 0.24, 0.21, 0.17, 0.12];       // sums to 1
  var ARM_TH   = [1.00, 0.84, 0.66, 0.47, 0.28];       // radius multiplier per segment
  var DOWN_K = 0.16;                                   // droop added per segment index
  var FLOOR_CLEAR = 0.04;                              // body units an arm tip keeps above the sand
  var FAN_SPAN = 4.4;                                  // radians the crawling fan spreads through (~250 deg)
  var FAN_DIP = 0.10;                                  // and how much each segment of it dips toward the sand

  /* ---------- the four postures ----------
     Six numbers a row, eased between. This table IS the animation, in
     the same way `open` is the whole of the anemone (§39) — except
     that a boneless animal needs six knobs where a hinged one needs
     one, and `reach` is the honest one: a real octopus arm shortens
     when it bunches, and a chain of fixed-length segments cannot,
     so the segments are scaled instead. */
  var POSE = {
    //         pitch0  curl  down  wave  reach crownR fan
    den:      [1.75,   0.42, 0.15, 0.05, 0.55, 0.75, 0.15],
    emerge:   [1.35,   0.30, 0.35, 0.22, 0.80, 0.90, 0.50],
    hunt:     [0.95,   0.20, 0.55, 0.30, 1.00, 1.00, 0.85],
    pounce:   [1.35,   0.10, 0.40, 0.06, 1.10, 1.15, 0.80],
    jet:      [0.16,   0.03, 0.02, 0.10, 0.95, 0.55, 0.00],
    home:     [1.50,   0.36, 0.25, 0.12, 0.68, 0.82, 0.25],
    /* The recoil (§42): arms thrown wide for an instant, then gone.
       An octopus that has just inked is a starburst for about a third
       of a second and a streak after that. */
    ink:      [1.55,   0.05, 0.10, 0.45, 1.05, 1.20, 0.30]
  };
  /* mantle length x girth, web spread, lift off the bottom, nose-down
     pitch. A jetting octopus is long and thin and rides high; a
     denned one is a ball pushed into a hole. */
  var SHAPE = {
    //         mlen  girth spread lift  pitch
    den:      [0.80, 1.25, 0.05, 0.10, -0.10],
    emerge:   [0.92, 1.10, 0.05, 0.18,  0.05],
    hunt:     [1.00, 1.00, 0.12, 0.26,  0.16],
    pounce:   [0.92, 1.10, 1.00, 0.20,  0.42],
    jet:      [1.12, 0.82, 0.05, 0.62, -0.05],
    home:     [0.88, 1.14, 0.05, 0.14,  0.00],
    ink:      [1.06, 0.94, 0.30, 0.50, -0.20]
  };
  /* And the colour, as an instanceColor multiplier on a neutral base.
     Dark red-brown in the hole, sand-pale on the flat, blanched over
     a pounce. */
  var SKIN = {
    den:    [0.62, 0.40, 0.34],
    emerge: [0.78, 0.62, 0.52],
    hunt:   [1.02, 0.98, 0.88],
    pounce: [1.26, 1.22, 1.16],
    jet:    [0.66, 0.48, 0.44],
    home:   [0.74, 0.55, 0.46],
    /* Nearly black. A real one goes dark the moment it releases, so
       that what the predator is left looking at is the cloud and not
       the animal — the ink is a decoy and the blanching is its
       opposite. */
    ink:    [0.38, 0.26, 0.24]
  };
  var POSE_RATE = 2.4;           // 1/s — how fast a posture is taken up
  var CHROMA_RATE = 3.0;         // and the colour, which is faster on purpose

  var seed = 4241983;
  function rand() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
  function range(a, b) { return a + rand() * (b - a); }
  function pickRange(p) { return range(p[0], p[1]); }

  var UP = new THREE.Vector3(0, 1, 0);
  var FWD = new THREE.Vector3(0, 0, 1);
  var AXIS_X = new THREE.Vector3(1, 0, 0);

  function spawn(scene, world, opts) {
    var P = OctopusBody.parts();
    var mat = OctopusBody.material();
    opts = opts || {};
    var swimmingcrabs = opts.swimmingcrabs || null;   // optional — see the header
    var penshells = opts.penshells || null;           // optional
    /* §42. The one thing on this shore that eats an octopus, and the
       reason this file finally has an `ink` state. A PULL, unlike the
       otter's own hunt: meeting an otter is entirely the octopus's
       problem, so otters.js has never heard of an octopus. */
    var otters = opts.otters || null;                 // optional

    var group = new THREE.Group();
    group.name = 'octopuses';
    scene.add(group);

    var halfX = world.simArea.halfX - 10;
    var zHi = Math.min(DEN_Z[1], world.simArea.zMax - 2);

    function depthAt(x, z) {
      var surf = world.waterAt(x, z);
      if (surf === null) return 0;
      var d = surf - world.heightAt(x, z);
      return d > 0 ? d : 0;
    }

    /* ---------- place the dens, then an animal on each ---------- */
    var octopuses = [];
    var guard = 0;
    while (octopuses.length < COUNT && guard++ < COUNT * 900) {
      var x = range(-halfX, halfX);
      var z = range(DEN_Z[0], zHi);
      var h = world.heightAt(x, z);
      if (h < DEN_ZONE[0] || h > DEN_ZONE[1]) continue;
      var clash = false;
      for (var pi = 0; pi < octopuses.length; pi++) {
        var q = octopuses[pi];
        if ((q.den.x - x) * (q.den.x - x) + (q.den.z - z) * (q.den.z - z) < DEN_SPACING * DEN_SPACING) {
          clash = true; break;
        }
      }
      if (clash) continue;

      var mid = Math.round(pickRange(MIDDEN_START));
      var shells = [];
      for (var si = 0; si < MIDDEN_MAX; si++) {
        /* Laid out once and never moved. A midden is a heap that grew
           where it fell, so the bearings are scattered and the radius
           creeps outward as the pile gets older — the later shells sit
           further from the door. */
        var a = range(0, TAU);
        var rr = S * range(0.55, 0.80 + si * 0.055);
        shells.push({
          x: x + Math.cos(a) * rr, z: z + Math.sin(a) * rr,
          yaw: range(0, TAU), tilt: range(-0.5, 0.5), size: S * range(0.55, 0.95)
        });
      }

      octopuses.push({
        den: { x: x, y: h, z: z, size: range(0.85, 1.25) },
        x: x, y: h, z: z,
        yaw: range(0, TAU),
        size: range(0.82, 1.22),
        state: 'den',
        stateT: 0,
        denT: pickRange(DEN_SECS) * rand(),   // stagger the first emergence
        huntT: 0,
        tx: x, tz: z,                          // where it is walking
        prey: null,
        scan: range(0, SCAN_SECS),
        gait: rand(),
        midden: mid, middenDrawn: -1,
        shells: shells,
        pounces: 0,
        meals: 0,
        carry: false,
        trips: 0,
        /* the six posture numbers and the five shape numbers, live */
        pose: POSE.den.slice(),
        shape: SHAPE.den.slice(),
        skin: SKIN.den.slice(),
        /* per-animal variation on top of the state colour, so six
           octopuses are not one octopus drawn six times */
        hue: [range(0.94, 1.08), range(0.93, 1.05), range(0.90, 1.06)],
        drawnSkin: -1,
        inkCool: 0,
        inks: 0,
        /* One cloud per animal, CLOUD_PER blobs in it. Reused rather
           than allocated: an animal cannot be inking twice at once. */
        cloud: (function () {
          var c = [];
          for (var ci = 0; ci < CLOUD_PER; ci++) {
            c.push({ x: 0, y: 0, z: 0, dx: 0, dz: 0, dy: 0, age: 0, life: 0, seedR: rand() });
          }
          return c;
        })(),
        tintAge: 0
      });
    }
    var N = octopuses.length;

    function slots(geo, per, shadow) {
      var m = new THREE.InstancedMesh(geo, mat, Math.max(N * per, 1));
      m.frustumCulled = false;
      m.castShadow = !!shadow;
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      group.add(m);
      return { mesh: m, per: per };
    }
    var R = {
      mantle: slots(P.mantle, 1, true),
      head:   slots(P.head, 1, true),
      eye:    slots(P.eye, 2, false),
      armSeg: slots(P.armSeg, ARMS * ARM_SEGS, true),
      web:    slots(P.web, 1, false),
      siphon: slots(P.siphon, 1, false),
      lair:   slots(P.lair, 1, false),
      shell:  slots(P.shell, MIDDEN_MAX, false),
      ink:    slots(P.ink, CLOUD_PER, false)
    };
    /* The den and its midden are NOT the animal and must never take
       the animal's skin colour — a white pounce would otherwise blanch
       the shell pile outside a den 20 m away. They are the only two
       meshes here that keep their baked colour. */
    var SKINNED = ['mantle', 'head', 'eye', 'armSeg', 'web', 'siphon'];

    /* ---------- placement helpers ---------- */
    var xa = new THREE.Vector3(), ya = new THREE.Vector3(), za = new THREE.Vector3();
    var mPart = new THREE.Matrix4(), mBody = new THREE.Matrix4(), mOut = new THREE.Matrix4();
    var root = new THREE.Vector3(), tmp = new THREE.Vector3(), dir = new THREE.Vector3();
    var wpos = new THREE.Vector3(), qb = new THREE.Quaternion(), eul = new THREE.Euler();
    var tint = new THREE.Color();

    /* Body-local: point +X down `d`, scale it to `len`, fatten across
       to `thick`. anemones.js's put, unchanged — it is the same three
       lines every species on this shore places a limb with. */
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
    /* World-space version, for the den — the lair and its shells are
       furniture on the seabed and have nothing to do with the animal's
       body frame. */
    function putWorld(rec, slot, px, py, pz, dx, dy, dz, len, thick) {
      xa.set(dx, dy, dz).normalize();
      tmp.copy(Math.abs(xa.y) > 0.985 ? FWD : UP);
      za.crossVectors(xa, tmp).normalize();
      ya.crossVectors(za, xa).normalize();
      mOut.makeBasis(xa.multiplyScalar(len), ya.multiplyScalar(thick), za.multiplyScalar(thick));
      mOut.setPosition(wpos.set(px, py, pz));
      rec.mesh.setMatrixAt(slot, mOut);
    }

    /* The body basis. +X is forward; the house rule since §20 is that
       a heading of atan2(dx, dz) is a +Z bearing and the Euler needs
       `yaw - PI/2`. Written in from the start, which is what the
       roster says to do. The pitch is a rotation about the body's own
       Z, applied BEFORE the yaw — order 'YXZ' with x=0 gives exactly
       Ry(yaw) * Rz(-pitch), which tips the arm crown down without
       swinging the heading. */
    function setBody(o) {
      var sc = S * o.size;
      eul.set(0, o.yaw - Math.PI * 0.5, -o.shape[4], 'YXZ');
      qb.setFromEuler(eul);
      mBody.compose(root.set(o.x, o.y, o.z), qb, tmp.set(sc, sc, sc));
    }

    /* ------------------------------------------------------------
       draw — the animal
       ------------------------------------------------------------ */
    function draw(o, oi) {
      setBody(o);
      var mlen = o.shape[0], girth = o.shape[1], spread = o.shape[2], lift = o.shape[3];

      // the bag hangs off the back: apex at -mlen, neck at the origin
      put(R.mantle, oi, root.set(-MANTLE_LEN * mlen, 0, 0), AXIS_X, mlen, girth);
      put(R.head, oi, root.set(0, 0, 0), AXIS_X, 1, girth * 0.96);
      for (var s = 0; s < 2; s++) {
        var sg = s === 0 ? 1 : -1;
        put(R.eye, oi * 2 + s, root.set(EYE.x, EYE.y, sg * EYE.z),
            dir.set(EYE_DIR[0], EYE_DIR[1], sg * EYE_DIR[2]), 1, 1);
      }
      put(R.siphon, oi, root.set(SIPHON.x, SIPHON.y, SIPHON.z),
          dir.set(SIPHON_DIR[0], SIPHON_DIR[1], SIPHON_DIR[2]), 1, 1);
      put(R.web, oi, root.set(CROWN_X, 0, 0), AXIS_X, spread, spread);

      /* ---- the eight arms ----
         Each is a chain: a direction from two angles, a step along it,
         repeat. The `down` term is a straight droop toward the seabed
         added per segment rather than a force — it is what makes a
         crawling animal's arms find the bottom and a jetting one's
         stream out behind it, and it needs no solver because nothing
         about it has to end anywhere in particular (§36). */
      var pitch0 = o.pose[0], curl = o.pose[1], down = o.pose[2];
      var wave = o.pose[3], reach = o.pose[4], crownR = o.pose[5];
      /* THE SEABED, IN BODY-LOCAL COORDINATES — and it is not a
         constant, because the body is PITCHED.

         The first pass took the obvious shortcut: clamp local y at
         `-lift`, on the grounds that the tilt is small. It is not
         small enough. The body basis is Ry(yaw)·Rz(-pitch), so world
         up in body-local is (-sin p, cos p, 0), and a point 2 body
         units forward on a crown pitched 0.16 rad down is already
         0.32 units lower than the origin — more than the whole of
         `lift`. Decomposing the matrices (§30) put the arm tips 15 cm
         UNDER the sand while the clamp reported them clear.

         So the floor is a plane, not a number: an arm tip is clear
         when  lift - x·sin p + y·cos p >= FLOOR_CLEAR, which solves
         for the local y below. */
      var sp = Math.sin(o.shape[4]), cp = Math.cos(o.shape[4]) || 1e-3;

      /* TWO WAYS TO AIM AN ARM, BLENDED BY `fan`. This is the one
         piece of the animal that needed a second model rather than a
         better number.

         The obvious construction is a RADIAL CROWN: arm `a` sits at
         roll phi round the body axis and pitches away from +X. It is
         right for a jetting octopus, whose arms really are gathered
         evenly around the axis like the spokes of a wheel — and it is
         wrong for a crawling one in a way that is invisible until the
         matrices are decomposed. A radial crown puts arm `a` and its
         MIRROR ACROSS THE HORIZONTAL PLANE at the same bearing in PLAN
         VIEW: cos(22.5) and cos(157.5) differ only in sign while the
         sines are identical, so the two arms come out one directly
         above the other. Eight arms occupying four bearings, with two
         of the eight plan-view gaps at 0 degrees.

         No amount of droop tuning touches it — a sweep of DOWN_K from
         0.16 down to 0.06 moved the smallest gap from 2 degrees to 1 —
         because the stacking is inherent to the construction and not
         to any parameter of it. A CRAWLING octopus does not spread its
         arms around its body at all; it fans them out ACROSS THE
         SEABED, through most of a circle in plan, dipping as they go.
         That is a different set of angles: a bearing in the horizontal
         plane and an elevation, rather than a roll and a pitch.

         So both are built and blended. `fan` is 0 for the jet, 0.85
         for the crawl, and low again for the ball in the den. */
      var fan = o.pose[6];

      for (var a = 0; a < ARMS; a++) {
        var phi = a / ARMS * TAU + Math.PI / ARMS;
        var uy = Math.cos(phi), uz = Math.sin(phi);
        // the fan's bearing for this arm: spread through FAN_SPAN, forward-centred
        var psi = (a / (ARMS - 1) - 0.5) * FAN_SPAN;
        var px = CROWN_X;
        var py = (uy * (1 - fan) + Math.sin(-0.25) * fan) * CROWN_R * crownR;
        var pz = (uz * (1 - fan) + Math.sin(psi) * fan) * CROWN_R * crownR;
        var base = oi * ARMS * ARM_SEGS + a * ARM_SEGS;
        for (var j = 0; j < ARM_SEGS; j++) {
          var w = wave * Math.sin(o.gait * TAU - j * 0.6 + a * 0.8);
          var ang = pitch0 + curl * j + w;
          // radial: roll phi about the body axis, pitched off +X
          var rx = Math.cos(ang), vr = Math.sin(ang);
          var ry = vr * uy - DOWN_K * down * j;
          var rz = vr * uz;
          // fan: a bearing across the seabed, dipping as it runs out
          var el = -FAN_DIP * (j + 1) + w * 0.5;
          var ce = Math.cos(el), ps = psi + w * 0.6;
          var fx = ce * Math.cos(ps), fy = Math.sin(el), fz = ce * Math.sin(ps);

          var vx = rx + (fx - rx) * fan;
          var vy = ry + (fy - ry) * fan;
          var vz = rz + (fz - rz) * fan;
          var L = Math.sqrt(vx * vx + vy * vy + vz * vz) || 1;
          var len = ARM_FRAC[j] * ARM_LEN * reach;

          /* Work out where this segment ENDS, clamp THAT to the floor,
             and only then derive the direction it is drawn along. The
             obvious order — place the segment, then clamp the running
             position for the next one — leaves the LAST segment of
             each arm drawn along its unclamped direction, so the tips
             go under the sand while the clamp reports every root
             clear. That is what the decomposed matrices showed: roots
             fine, tips 7 cm buried.

             Clamping the endpoint also does the crawl posture for
             free. An arm aimed below the seabed is laid flat ALONG it
             instead of being deleted or bent by a solver, which is
             what a crawling octopus's arms actually do. */
          var ex = px + (vx / L) * len;
          var ey = py + (vy / L) * len;
          var ez = pz + (vz / L) * len;
          var floorLocal = (FLOOR_CLEAR - lift + ex * sp) / cp;
          if (ey < floorLocal) ey = floorLocal;

          var sx = ex - px, sy = ey - py, sz = ez - pz;
          var sl = Math.sqrt(sx * sx + sy * sy + sz * sz) || 1e-4;
          dir.set(sx / sl, sy / sl, sz / sl);
          put(R.armSeg, base + j, root.set(px, py, pz), dir, sl, ARM_TH[j]);
          px = ex; py = ey; pz = ez;
        }
      }
    }

    /* ------------------------------------------------------------
       drawDen — the lair mouth and the midden.

       Redrawn only when the pile changes, which for most dens is
       never. The unplaced shells are parked under the seabed at a
       vanishing scale rather than left at an identity matrix, which
       would stack sixteen of them at the world origin.
       ------------------------------------------------------------ */
    function drawDen(o, oi) {
      var d = o.den, ds = S * d.size;
      /* Sunk until the top cap is a whisker under the sand, so what is
         left is a hole and not a black button lying on the seabed. */
      putWorld(R.lair, oi, d.x, d.y + 0.02 - 0.30 * ds, d.z, 0, 1, 0, ds, ds);

      for (var i = 0; i < MIDDEN_MAX; i++) {
        var sh = o.shells[i];
        var slot = oi * MIDDEN_MAX + i;
        if (i >= o.midden) {
          mOut.makeScale(1e-4, 1e-4, 1e-4);
          mOut.setPosition(wpos.set(d.x, d.y - 6, d.z));
          R.shell.mesh.setMatrixAt(slot, mOut);
          continue;
        }
        eul.set(0, sh.yaw, sh.tilt, 'YXZ');
        qb.setFromEuler(eul);
        mOut.compose(wpos.set(sh.x, world.heightAt(sh.x, sh.z) + sh.size * 0.05, sh.z),
                     qb, tmp.set(sh.size, sh.size, sh.size));
        R.shell.mesh.setMatrixAt(slot, mOut);
      }
    }

    /* ------------------------------------------------------------
       prey — the two populations whose bands actually overlap this
       animal's. See the header for the two that do not.
       ------------------------------------------------------------ */
    function findPrey(o) {
      var best = null, bestD = SCAN_R * SCAN_R, i, t, dx, dz, d2;
      if (swimmingcrabs) {
        for (i = 0; i < swimmingcrabs.length; i++) {
          t = swimmingcrabs[i];
          if (t.state !== 'active') continue;      // a buried crab is under dry sand, and so is nothing an octopus can reach
          dx = t.x - o.x; dz = t.z - o.z;
          d2 = dx * dx + dz * dz;
          if (d2 < bestD) { bestD = d2; best = t; }
        }
      }
      if (penshells && !best) {
        /* Second choice, and only if there is no crab: a pen shell is
           anchored and is not going anywhere, so a crab in the water
           is the opportunity that expires. */
        for (i = 0; i < penshells.length; i++) {
          t = penshells[i];
          if (t.state === 'shut') continue;        // shut means the flat is dry over it
          dx = t.x - o.x; dz = t.z - o.z;
          d2 = dx * dx + dz * dz;
          if (d2 < bestD) { bestD = d2; best = t; }
        }
      }
      return best;
    }

    /* A place to crawl to that is inside the range, inside the plot,
       and — the only condition that matters — deep enough to be in. */
    function wanderTarget(o) {
      for (var k = 0; k < 24; k++) {
        var a = range(0, TAU), r = range(2.5, RANGE);
        var x = o.den.x + Math.cos(a) * r;
        var z = o.den.z + Math.sin(a) * r;
        if (x < -halfX || x > halfX) continue;
        if (z < HUNT_Z[0] || z > Math.min(HUNT_Z[1], world.simArea.zMax - 2)) continue;
        if (depthAt(x, z) < MIN_DEPTH) continue;
        o.tx = x; o.tz = z;
        return true;
      }
      o.tx = o.den.x; o.tz = o.den.z;
      return false;
    }

    function ease(cur, want, k) {
      for (var i = 0; i < cur.length; i++) cur[i] += (want[i] - cur[i]) * k;
    }

    /* ------------------------------------------------------------
       the otter, and the ink (§42)

       A PULL, unlike everything the otter itself does: otters.js has
       never heard of an octopus, and an octopus meeting a romp is
       entirely the octopus's problem. Only otters that are actually
       in the water count — a hauled-out animal lying on a bar is not
       hunting anything.
       ------------------------------------------------------------ */
    function otterNear(o) {
      if (!otters) return false;
      for (var i = 0; i < otters.length; i++) {
        var t = otters[i];
        if (!t.vis || t.state === 'haul') continue;
        var dx = t.x - o.x, dz = t.z - o.z;
        if (dx * dx + dz * dz < INK_R * INK_R) return true;
      }
      return false;
    }

    /* Fire the cloud. The blobs start together at the animal and pull
       apart along their own bearings — a real release is one pulse
       that shears in the current, and giving each blob its own drift
       is the cheapest thing that reads as that. */
    function release(o, oi) {
      var sc = S * o.size;
      for (var i = 0; i < CLOUD_PER; i++) {
        var b = o.cloud[i];
        var a = (i / CLOUD_PER) * TAU + rand() * 0.9;
        b.x = o.x + Math.cos(a) * 0.10 * sc;
        b.z = o.z + Math.sin(a) * 0.10 * sc;
        b.y = o.y + range(-0.10, 0.16) * sc;
        b.dx = Math.cos(a) * CLOUD_DRIFT * range(0.55, 1.35);
        b.dz = Math.sin(a) * CLOUD_DRIFT * range(0.55, 1.35);
        b.dy = range(0.02, 0.10);          // ink rises a little as it disperses
        b.age = 0;
        b.life = pickRange(CLOUD_LIFE) * range(0.8, 1.2);
      }
    }

    /* Grow, drift, shrink, gone. See octopusbody.js: there is one
       material on this shore and it is opaque, so a cloud cannot fade
       — it disperses by coming back down through its own radius. */
    function stepCloud(o, oi, dt) {
      var any = false;
      for (var i = 0; i < CLOUD_PER; i++) {
        var b = o.cloud[i];
        var slot = oi * CLOUD_PER + i;
        if (b.life <= 0) {
          mOut.makeScale(1e-4, 1e-4, 1e-4);
          mOut.setPosition(wpos.set(0, -900, 0));
          R.ink.mesh.setMatrixAt(slot, mOut);
          continue;
        }
        b.age += dt;
        if (b.age >= b.life) { b.life = 0; any = true; continue; }
        var k = b.age / b.life;
        b.x += b.dx * dt; b.z += b.dz * dt; b.y += b.dy * dt;
        /* Up fast, down slow — a puff that expands in the first
           quarter of its life and then thins away over the rest. */
        var grow = k < 0.25 ? (k / 0.25) : 1 - ((k - 0.25) / 0.75);
        var rr = (CLOUD_R[0] + (CLOUD_R[1] - CLOUD_R[0]) * Math.sqrt(Math.max(0, grow)))
                 * S * (0.7 + b.seedR * 0.6);
        eul.set(b.seedR * 3.1, b.seedR * 5.7, 0, 'YXZ');
        qb.setFromEuler(eul);
        mOut.compose(wpos.set(b.x, b.y, b.z), qb, tmp.set(rr, rr * 0.72, rr));
        R.ink.mesh.setMatrixAt(slot, mOut);
        any = true;
      }
      return any;
    }

    /* ------------------------------------------------------------
       update
       ------------------------------------------------------------ */
    function update(dt) {
      var moved = false, tinted = false, dens = false, inked = false;

      for (var oi = 0; oi < N; oi++) {
        var o = octopuses[oi];
        var sc = S * o.size;
        var denDepth = depthAt(o.den.x, o.den.z);
        var here = depthAt(o.x, o.z);

        /* ---- the state machine ---- */
        if (o.stateT > 0) o.stateT -= dt;
        if (o.inkCool > 0) o.inkCool -= dt;

        /* THE INK, AND IT OVERRIDES EVERYTHING (§42). It is checked
           before the switch rather than inside it because an otter
           does not care what the animal was doing — a romp arriving
           over a crawling octopus, a pouncing one or one halfway home
           produces the same answer, and the only states it cannot
           interrupt are the ones already inside the den. */
        if (o.inkCool <= 0 && o.state !== 'den' && o.state !== 'home' && o.state !== 'ink'
            && otterNear(o)) {
          release(o, oi);
          o.state = 'ink';
          o.stateT = INK_SECS;
          o.prey = null;
          o.inkCool = INK_COOL;
          o.inks++;
        }

        switch (o.state) {
          case 'ink':
            /* Nothing moves for the length of the release. The animal
               is a dark starburst over a spreading cloud, and then it
               is gone — straight into the jet, which already knows how
               to get it home. */
            if (o.stateT <= 0) {
              o.state = 'jet';
              o.tx = o.den.x; o.tz = o.den.z;
            }
            break;

          case 'den':
            o.denT -= dt;
            o.x = o.den.x; o.z = o.den.z;
            if (o.denT <= 0 && denDepth >= HUNT_DEPTH) {
              o.state = 'emerge'; o.stateT = EMERGE_SECS;
            }
            break;

          case 'emerge':
            if (o.stateT <= 0) {
              o.state = 'hunt';
              o.huntT = pickRange(HUNT_SECS);
              o.trips++;
              o.prey = null;
              wanderTarget(o);
            }
            break;

          case 'hunt':
            o.huntT -= dt;
            o.scan -= dt;
            if (o.scan <= 0) {
              o.scan = SCAN_SECS;
              if (!o.prey) o.prey = findPrey(o);
              /* A crab that has buried itself or swum out of reach is
                 no longer a target. Re-checking on the tick rather than
                 every frame is the same call anemones.js makes. */
              if (o.prey && o.prey.state !== undefined) {
                if (o.prey.state === 'buried' || o.prey.state === 'burying' || o.prey.state === 'shut') o.prey = null;
              }
            }
            if (o.prey) { o.tx = o.prey.x; o.tz = o.prey.z; }

            var dxh = o.tx - o.x, dzh = o.tz - o.z;
            var dh = Math.sqrt(dxh * dxh + dzh * dzh);
            if (o.prey && dh < POUNCE_R) {
              o.state = 'pounce'; o.stateT = POUNCE_SECS;
            } else if (dh < ARRIVE_R && !o.prey) {
              wanderTarget(o);
            }
            /* Two ways home, and the water is the one that overrides.
               `here` is the depth over the animal's own head — a
               falling tide catches it out on the flat long before the
               den runs shallow, because the den is the deepest place
               it knows. */
            if (here < RETREAT_DEPTH || o.huntT <= 0) {
              o.state = 'jet'; o.prey = null;
              o.tx = o.den.x; o.tz = o.den.z;
            }
            break;

          case 'pounce':
            if (o.stateT <= 0) {
              o.pounces++;
              o.prey = null;
              if (rand() < POUNCE_HIT) {
                /* A MEAL ENDS THE TRIP, and this is the whole reason
                   the den has a midden at all. A real octopus does not
                   eat where it caught something — it carries the crab
                   home and works on it inside, which is why the shells
                   pile up at one address instead of being scattered
                   over the flat. So the catch turns the animal round
                   immediately, and `carry` is what it is holding.

                   The first run of this file did the obvious thing
                   instead — pounce, then carry on hunting — and
                   returned 192 pounces in 600 seconds across six
                   animals, five a trip. That is not a tuning error in
                   POUNCE_R or SCAN_R; it is the wrong shape for the
                   behaviour, and no threshold would have fixed it.
                   §31's rule is that a behaviour which never fires is
                   not modelled; this is the same rule from the other
                   end. */
                o.carry = true;
                o.state = 'jet';
                o.tx = o.den.x; o.tz = o.den.z;
              } else {
                o.state = 'hunt';
                o.huntT -= 6;              // a miss costs it, and it moves on
                wanderTarget(o);
              }
            }
            break;

          case 'jet':
            o.tx = o.den.x; o.tz = o.den.z;
            var dxj = o.den.x - o.x, dzj = o.den.z - o.z;
            if (dxj * dxj + dzj * dzj < DEN_R * DEN_R) {
              o.state = 'home'; o.stateT = HOME_SECS;
            }
            break;

          case 'home':
            o.x += (o.den.x - o.x) * Math.min(1, 3 * dt);
            o.z += (o.den.z - o.z) * Math.min(1, 3 * dt);
            if (o.stateT <= 0) {
              /* The shell is dropped HERE, at the door, and not where
                 the animal caught it. That is the one line that makes
                 the pile mean something. */
              if (o.carry) {
                o.carry = false;
                o.meals++;
                if (o.midden < MIDDEN_MAX) { o.midden++; dens = true; }
              }
              o.state = 'den'; o.denT = pickRange(DEN_SECS);
            }
            break;
        }

        /* ---- movement ---- */
        var speed = o.state === 'hunt' ? CRAWL : (o.state === 'jet' ? JET : 0);
        if (speed > 0) {
          var mx = o.tx - o.x, mz = o.tz - o.z;
          var md = Math.sqrt(mx * mx + mz * mz);
          if (md > 1e-4) {
            var want = Math.atan2(mx, mz);
            /* Jetting is the one time this animal travels BACKWARD.
               A real octopus jets mantle-first with the arms streamed
               out behind, so the body's +X — which is the arm crown —
               has to face the way it CAME from. Easing the yaw through
               that half-turn reads as the animal spinning round to go,
               which is also what it does. */
            if (o.state === 'jet') want += Math.PI;
            var dyaw = want - o.yaw;
            while (dyaw > Math.PI) dyaw -= TAU;
            while (dyaw < -Math.PI) dyaw += TAU;
            var step = TURN * dt;
            o.yaw += Math.abs(dyaw) < step ? dyaw : (dyaw > 0 ? step : -step);

            var go = Math.min(speed * dt, md);
            o.x += (mx / md) * go;
            o.z += (mz / md) * go;
          }
          o.gait += dt * GAIT_HZ * (o.state === 'jet' ? 1.6 : 1);
          if (o.gait > 1) o.gait -= 1;
        }

        /* ---- the body follows the seabed, and stays under the water ----
           A jetting octopus rides 0.62 mantle-lengths off the bottom,
           which on a shallow flood is higher than there is water for.
           The clamp is not cosmetic: without it the mantle breaks the
           surface and the animal reads as a floating bag. */
        var ground = world.heightAt(o.x, o.z);
        var wantY = ground + o.shape[3] * sc;
        var surf = world.waterAt(o.x, o.z);
        if (surf !== null) {
          var ceil = surf - 0.18 * sc;
          if (wantY > ceil) wantY = Math.max(ground + 0.06 * sc, ceil);
        }
        o.y += (wantY - o.y) * Math.min(1, 6 * dt);

        /* ---- posture, shape and colour, all eased toward the state ---- */
        var k = Math.min(1, POSE_RATE * dt);
        ease(o.pose, POSE[o.state], k);
        ease(o.shape, SHAPE[o.state], k);
        ease(o.skin, SKIN[o.state], Math.min(1, CHROMA_RATE * dt));

        draw(o, oi);
        moved = true;

        /* Colour is written only when it has actually moved — six
           animals is nothing, but instanceColor uploads the whole
           buffer and a still population should not be paying for it.

           THE REFRESH IS NOT REDUNDANT. ui.js's hover glow (§34) works
           by SAVING an animal's instanceColor, multiplying it by 1.55,
           and writing the saved value back when the cursor leaves. Any
           species that also writes instanceColor per frame can have its
           new colour overwritten by that restore, and a settled animal
           would then wear the stale one indefinitely — sponges.js has
           the same shape and the same hole. Forcing a rewrite twice a
           second costs 264 setColorAt calls across the whole
           population and heals it without ui.js having to know this
           species exists. */
        o.tintAge += dt;
        var sk = o.skin[0] + o.skin[1] * 3 + o.skin[2] * 7;
        if (Math.abs(sk - o.drawnSkin) > 0.004 || o.tintAge > 0.5) {
          o.drawnSkin = sk;
          o.tintAge = 0;
          tint.setRGB(o.skin[0] * o.hue[0], o.skin[1] * o.hue[1], o.skin[2] * o.hue[2]);
          for (var ki = 0; ki < SKINNED.length; ki++) {
            var rec = R[SKINNED[ki]];
            for (var jj = 0; jj < rec.per; jj++) rec.mesh.setColorAt(oi * rec.per + jj, tint);
          }
          tinted = true;
        }

        if (o.midden !== o.middenDrawn) { o.middenDrawn = o.midden; drawDen(o, oi); dens = true; }

        /* The cloud outlives the state that made it: an octopus is
           already home and shut in before its ink has finished
           dispersing, which is exactly the point of ink. So this runs
           every frame for every animal, not inside the `ink` case. */
        if (stepCloud(o, oi, dt)) inked = true;
      }

      if (moved) {
        R.mantle.mesh.instanceMatrix.needsUpdate = true;
        R.head.mesh.instanceMatrix.needsUpdate = true;
        R.eye.mesh.instanceMatrix.needsUpdate = true;
        R.armSeg.mesh.instanceMatrix.needsUpdate = true;
        R.web.mesh.instanceMatrix.needsUpdate = true;
        R.siphon.mesh.instanceMatrix.needsUpdate = true;
      }
      if (dens) {
        R.lair.mesh.instanceMatrix.needsUpdate = true;
        R.shell.mesh.instanceMatrix.needsUpdate = true;
      }
      if (inked) R.ink.mesh.instanceMatrix.needsUpdate = true;
      if (tinted) {
        for (var kk = 0; kk < SKINNED.length; kk++) {
          var m = R[SKINNED[kk]].mesh;
          if (m.instanceColor) m.instanceColor.needsUpdate = true;
        }
      }
    }

    /* ---------- first frame ---------- */
    for (var i0 = 0; i0 < N; i0++) {
      var o0 = octopuses[i0];
      o0.y = world.heightAt(o0.x, o0.z) + o0.shape[3] * S * o0.size;
      draw(o0, i0);
      drawDen(o0, i0);
      o0.middenDrawn = o0.midden;
      stepCloud(o0, i0, 0);        // parks every blob until one is actually released
      tint.setRGB(o0.skin[0] * o0.hue[0], o0.skin[1] * o0.hue[1], o0.skin[2] * o0.hue[2]);
      for (var k0 = 0; k0 < SKINNED.length; k0++) {
        var r0 = R[SKINNED[k0]];
        for (var j0 = 0; j0 < r0.per; j0++) r0.mesh.setColorAt(i0 * r0.per + j0, tint);
      }
    }
    for (var kf in R) {
      R[kf].mesh.instanceMatrix.needsUpdate = true;
      if (R[kf].mesh.instanceColor) R[kf].mesh.instanceColor.needsUpdate = true;
    }

    return {
      count: N,
      group: group,
      octopuses: octopuses,
      update: update,
      // how many are out of the den right now — this species' tide gauge
      out: function () {
        var n = 0;
        for (var i = 0; i < N; i++) if (octopuses[i].state !== 'den' && octopuses[i].state !== 'home') n++;
        return n;
      },
      // lifetime ink releases — the §42 wiring, counted
      inks: function () {
        var n = 0;
        for (var i = 0; i < N; i++) n += octopuses[i].inks;
        return n;
      },

      /* WHERE a cloud is hanging right now, or null (§48).

         `inks()` above counts releases over the run, which answers
         "does this wiring fire" and cannot aim a camera. The cinematic
         needs the other question — is there ink on screen at this
         instant and where — and this is savanna's `world.fireCentre()`
         to the letter: an event that CANNOT BE PRE-AIMED, because it
         only happens when a romp wanders inside INK_R of a den, so the
         shot has to poll for it and fly in after the fact.

         The CLOUD, not the animal. The whole purpose of ink is that
         the octopus is not where the ink is — it is home behind its
         door before the cloud has finished spreading (see `stepCloud`),
         so a camera pointed at the octopus is pointed at nothing.
         Centroid of the live blobs, and the FRESHEST cloud wins when
         two are up, because that is the one still growing. */
      inkAt: function () {
        var best = null, bestAge = Infinity;
        for (var i = 0; i < N; i++) {
          var c = octopuses[i].cloud, x = 0, y = 0, z = 0, n = 0, age = 0;
          for (var b = 0; b < c.length; b++) {
            if (c[b].life <= 0) continue;
            x += c[b].x; y += c[b].y; z += c[b].z; age += c[b].age; n++;
          }
          if (!n) continue;
          age /= n;
          if (age < bestAge) { bestAge = age; best = { x: x / n, y: y / n, z: z / n, age: age }; }
        }
        return best;
      },
      // lifetime pounces, and the shells outside the doors. §31's rule:
      // count the events over a long run before calling a species done
      // meals actually landed — the pile at the door
      meals: function () {
        var n = 0;
        for (var i = 0; i < N; i++) n += octopuses[i].meals;
        return n;
      },
      pounces: function () {
        var n = 0;
        for (var i = 0; i < N; i++) n += octopuses[i].pounces;
        return n;
      },
      midden: function () {
        var n = 0;
        for (var i = 0; i < N; i++) n += octopuses[i].midden;
        return n;
      },
      trips: function () {
        var n = 0;
        for (var i = 0; i < N; i++) n += octopuses[i].trips;
        return n;
      }
    };
  }

  window.Octopuses = { spawn: spawn };
})();
