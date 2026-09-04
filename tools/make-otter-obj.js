/* ============================================================
   make-otter-obj.js — writes `reference/otter/AonyxOtter.obj`,
   an Asian small-clawed otter (Aonyx cinereus) built from numbers.

     node tools/make-otter-obj.js

   WHY A GENERATOR AND NOT A MESH. Everything downstream of this file
   already exists and is tuned: `bake-otter.js` fits the limb bones,
   measures the profile and blends the skin weights; `otters.js` reads
   nothing but what the bake emits. The one thing missing was a way to
   change the animal's SHAPE without opening a modeller, and every
   shape note this project has taken so far — "slim through the hips",
   "the tail leaves the back", "the paws do not read" — is a note about
   a number, not about a vertex. So the numbers live here, in one
   PARAMS block, and the mesh is a consequence of them.

   WHAT IT HAS TO PRODUCE, because the bake is not being changed:

     +Z nose, +Y up, +X side          `readObj` swizzles to +X nose
     ONE welded shell                 `components()` takes the largest
     EXACTLY two loose components     they are taken as the EYES and
                                      painted flat black; a third loose
                                      part would be painted as an eye
     four limbs hanging below the
     belly line, welded on            `fitLimbs` finds them by scanning
                                      for vertices under the underside
     a fore cluster and a hind
     cluster more than 2 units
     apart in x                       the lobe split
     limb vertices inside
     inLimb()'s windows               fore z 2.4..7.4, hind z -6..-1.6,
                                      y < 2.6, |x| > 0.8
     quads, ring-built along
     the body                         the section slicer and the un-bend
     about 32 units nose to tail      every unit-scale constant in the
                                      bake (RIN, ROUT, the 2.0 lobe gap,
                                      WIN_PAD) is in these units

   MODELLED NEARLY STRAIGHT, ON PURPOSE. `Otter.obj` was modelled
   standing, with an arched back, a steeply raised neck and a tail
   dragging on the floor, and the bake's whole first stage exists to
   take that back out again. Two things went wrong there and both are
   avoidable rather than fixable: a vertical section through a steeply
   raised neck cuts it obliquely, so the measured waist was a fifth
   instead of a third and could not set the scale; and un-bending a
   drooping tail lifts it onto the axis, which is what left the animal
   with no rump. This model is built with a gentle arch and a level
   tail, so the un-bend is nearly a no-op and the measured profile is a
   true perpendicular cross-section. `otters.js` puts the arch (ARCH),
   the head carriage (HEAD_RISE) and the tail's set (`tailSet`) back at
   runtime, which is where they were always going to come from.

   AONYX AGAINST LUTROGALE — what the numbers actually say. The old
   reference is a smooth-coated otter and reads as one: a long flat
   skull, a tail flattened top-to-bottom, full webs, and hips broad
   enough to merge with the hind legs into one pot-bellied lump. The
   small-clawed otter is the other animal in almost every respect and
   each difference below is a knob:

     ROUNDER, SHORTER SKULL      HEAD stations — a short muzzle, a real
                                 cheek-and-ear crest, a blunt nose pad
     A REAL NECK                 a width minimum between the crest and
                                 the shoulders. The old mesh dipped 1.63
                                 against 2.01 and the bake says so out
                                 loud; this one dips to 1.50 against 2.35
     SMALL ROUNDED EARS          EAR, welded into the skull rings
     SLIMMER THROUGH THE HIPS    the widest station is 2.52 against the
                                 old 3.02, and the haunch tapers into
                                 the rump instead of bulging past it
     A ROUND TAPERED TAIL        TAIL stations, near-circular section
                                 (SHAPE 2.0) rather than the flattened
                                 blade of a smooth-coated otter
     PAWS THAT READ AS PAWS      PAW — the pad flares, and five toe
                                 lobes are pushed forward out of the
                                 front ring. This is the animal's single
                                 most recognisable feature and the old
                                 mesh had nothing there at all

   THE SIZE IS NOT A KNOB. Nose-to-tail must stay at 1.75 m, because
   HAUL_R, TAKE_R and the romp's own spacing are all tuned in metres
   against it. The bake recomputes `S` to hold it, so the PROPORTIONS
   here are free and the LENGTH is not.
   ============================================================ */
'use strict';

var fs = require('fs');
var path = require('path');

var OUT = path.join(__dirname, '..', 'reference', 'otter', 'AonyxOtter.obj');

/* ============================================================
   PARAMS — the whole animal. Units are the OBJ's own, chosen so the
   nose-to-tail span lands near 32, which is what `Otter.obj` measured
   and what every unit-scale constant in the bake was tuned against.

   `f` is FORWARD (toward the nose), `u` is UP, `s` is SIDE. The writer
   emits them as `v s u f`, which is the +Z-nose frame `readObj` wants.
   ============================================================ */

/* THE ONLY THINGS BELOW THE BELLY LINE ARE THE LEGS, and that is a
   contract with `fitLimbs`, not a style choice. It scans for vertices
   sitting under the body's own underside (`y < -halfH * 0.98`), splits
   what it finds into a fore lobe and a hind lobe, and fits the four
   limb chains inside those two windows. A perfectly round tube's lowest
   vertex sits at exactly -halfH, which is under that threshold by the
   width of the percentile the profile is measured with — so a round
   TAIL registers as a limb, the hind window stretches backward into it,
   and the fitted hip walks out behind the rump. Measured: hind hip at
   x = -1.074 body units, which is behind the animal.

   So every ring carries at least this much belly lift, tail included.
   It costs a flat spot no one will ever see on the underside of a tail
   and it makes the limb windows unambiguous. */
var MIN_BELLY = 0.10;

var NR = 16;               // vertices per body ring. 16 puts the four
                           // cardinal directions on exact slots (top 0,
                           // side 4, bottom 8, side 12), which is what
                           // lets a socket be cut on a slot boundary.

/* ---- the body, station by station ----
   [ f, halfW, halfH, centreUp, shape, bellyLift ]

   `shape` is a superellipse exponent: 2 is a true ellipse, higher is
   squarer. The torso is held a little above 2 so the flanks read as
   flat-sided at low poly instead of as a balloon; the tail and the
   skull are true ellipses because both are round on this animal.

   `bellyLift` raises the underside without touching the back, which is
   how a swimming mustelid's section actually looks — a deep rounded
   back over a shallower belly — and is also what keeps the hind limb
   mass from merging with the abdomen the way it does on the old mesh.

   The three landmark features the bake HAS to find are marked. If any
   of them stops being a clear extremum, `landmarks()` silently picks a
   different feature and every proportion downstream moves. */
var BODY = [
  /*  f       halfW  halfH  cu     shape belly */
  /* NO COLLAPSED END RING. A ring of sixteen vertices at radius 0.045
     is sixteen vertices 0.016 units apart on a mesh whose median edge
     is 0.630 — a point, drawn forty times too expensively, whose facet
     normals are numerical noise. The pole closes the last REAL ring
     instead, which is what a pole is for. */
  [ -17.17,   0.20,  0.19,  4.38,  2.0,  0.00 ],   // tail tip ring
  [ -16.16,   0.32,  0.30,  4.43,  2.0,  0.00 ],
  [ -14.93,   0.47,  0.44,  4.50,  2.0,  0.00 ],
  [ -13.51,   0.69,  0.64,  4.58,  2.0,  0.00 ],
  [ -12.09,   0.90,  0.83,  4.67,  2.0,  0.00 ],
  [ -10.66,   1.14,  1.05,  4.77,  2.0,  0.00 ],
  [  -9.44,   1.36,  1.26,  4.87,  2.0,  0.00 ],
  [  -8.43,   1.60,  1.48,  4.96,  2.0,  0.02 ],
  [  -7.61,   1.86,  1.72,  5.03,  2.05, 0.06 ],
  [  -6.90,   2.06,  1.94,  5.09,  2.1,  0.12 ],   // rump: the tail's base
  [  -6.10,   2.32,  2.20,  5.16,  2.1,  0.20 ],
  [  -5.20,   2.54,  2.44,  5.23,  2.15, 0.27 ],
  /* THE HIPS ARE THE WIDEST STATION AND HAVE TO STAY THE WIDEST
     STATION. `landmarks()` takes the global halfW maximum as the hips
     and then walks BACK from it to find the rump; let the chest creep
     past them and it reads the chest as the haunch, puts the rump
     somewhere in the middle of the ribs, and the tail comes out half
     the animal long. That is the whole reason the chest below stops at
     2.52 against 2.62 rather than being tuned on its own. */
  [  -4.30,   2.62,  2.58,  5.30,  2.2,  0.30 ],   // HIPS - the global halfW max
  [  -3.30,   2.58,  2.66,  5.37,  2.2,  0.30 ],
  [  -2.20,   2.52,  2.72,  5.43,  2.2,  0.29 ],
  [  -1.00,   2.46,  2.76,  5.48,  2.25, 0.28 ],
  [   0.20,   2.45,  2.78,  5.50,  2.25, 0.28 ],   // the waist of the back
  [   1.40,   2.47,  2.78,  5.50,  2.25, 0.28 ],
  [   2.50,   2.50,  2.75,  5.49,  2.25, 0.29 ],
  [   3.50,   2.52,  2.69,  5.47,  2.2,  0.30 ],   // chest
  [   4.30,   2.46,  2.59,  5.46,  2.2,  0.30 ],   // fore socket sits here
  [   5.10,   2.20,  2.42,  5.46,  2.15, 0.22 ],
  [   5.90,   1.95,  2.20,  5.48,  2.1,  0.03 ],
  /* ---- the neck and the head ----
     DEEPER THROUGH THE CRANIUM THAN IT IS WIDE, which is what makes it
     a head. The first pass had halfH tracking halfW all the way to the
     nose, so there was no braincase in it and the animal read as a
     snake with whiskers. The stop at 10.46 is the other half of it.

     THE LENGTHS ARE BACK WHERE THEY STARTED, and that is a lesson
     rather than a revert. The head was shortened by an eighth to bring
     X_NOSE down from 0.838 body units toward the old mesh's 0.699 —
     and the number that moved was not the head. `TORSO` is measured
     between the fitted shoulder and the rump, the shoulder is fitted
     out of the FORE LIMB'S vertex cloud, and shortening the neck moved
     the cloud's own cut: torso 10.52 -> 11.73, every ratio downstream
     13% smaller, head 0.231 and tail 0.887. The head was never the
     problem. When the body unit is itself a measurement, a proportion
     is not a lever you can pull on one end of. */
  [   6.61,   1.72,  1.99,  5.53,  2.05, 0.00 ],
  [   7.20,   1.57,  1.86,  5.61,  2.0,  0.00 ],
  [   7.80,   1.50,  1.80,  5.72,  2.0,  0.00 ],   // NECK - the width minimum
  [   8.41,   1.58,  1.88,  5.86,  2.0,  0.00 ],
  [   8.96,   1.76,  2.02,  6.01,  2.0,  0.00 ],   // the cranium fills out
  [   9.46,   1.86,  2.06,  6.14,  2.0,  0.00 ],   // SKULL - cheek and ear crest
  [   9.96,   1.82,  2.00,  6.24,  2.0,  0.00 ],
  [  10.46,   1.62,  1.74,  6.30,  2.0,  0.00 ],   // the stop, under the eyes
  [  10.92,   1.34,  1.32,  6.33,  2.0,  0.00 ],
  [  11.32,   1.17,  1.10,  6.33,  2.0,  0.00 ],   // muzzle - wider than deep
  [  11.67,   1.03,  0.95,  6.31,  2.0,  0.00 ],
  [  11.96,   0.88,  0.80,  6.28,  2.0,  0.00 ],
  [  12.22,   0.70,  0.62,  6.25,  2.0,  0.00 ],   // nose pad
  [  12.40,   0.44,  0.38,  6.22,  2.0,  0.00 ]    // nose tip ring - see the tail's
];
/* the two poles that close the tube */
var TAIL_POLE = [-17.90, 4.34];      // [f, u]
var NOSE_POLE = [ 12.58, 6.21];

/* ---- the four limbs ----
   Joints as [f, u, sideMagnitude]; the right limb takes +s, the left
   -s. Every chain has a real reversal in `f` at the second joint,
   because `fitLimbs` finds the knee as the band where the x-slope
   REVERSES — a straight leg has no knee to find and the fit puts one
   in an arbitrary place.

     fore   elbow BACK of both hip and wrist
     hind   stifle FORWARD of both hip and hock

   which is the sign §42 hand-wrote and §44 then measured off the old
   mesh. It is asserted again here for the same reason it was there:
   the animal is being generated, so it has to be put in.

   L_UP + L_LO IS THE ONE NUMBER THE WALK ACTUALLY READS, and it is a
   sum of two bone lengths rather than anything geometric. `walkLimb`
   decides a foot is out of reach with

       (lx-hx)^2 + (lz-hz)^2  >  (L_UP + L_LO)^2

   which is a HORIZONTAL test — the foot's offset from the hip in x and
   z, with the drop not in it at all. A planted foot swings through
   +/- STRIDE*DUTY/2 = 0.279 body units of that, plus WALK_SPLAY and
   whatever a turn adds, so a limb whose two bones sum to much under
   about 0.31 loses its footing constantly and takes a corrective step
   to get it back. The old mesh fitted 0.448 on the fore and 0.392 on
   the hind; these chains are laid out to land in the same place, and
   the first pass that did not measured 2838 corrective steps over 6006
   walk frames against the old animal's 38.

   It is worth knowing that this is NOT the same as having enough bone
   to reach the ankle in three dimensions. An earlier pass tuned for
   3D slack, got the fore to 0.166 against the old 0.170 — and left the
   hind summing to 0.318, which passes every geometric check and fails
   the only test that runs.

   STILL OPEN: THE HIND SUM IS 0.341 AGAINST THE OLD MESH'S 0.392, and
   the remaining fix is not in this file. `fitLimbs` puts the ANKLE at a
   fixed 80% of the limb cloud's height range —

       iA = min(len-1, max(iK+1, round(len * 0.80)))

   — which suits a digitigrade leg standing on its toes. An otter is
   PLANTIGRADE: its hind foot is long and lies nearly flat, so almost
   none of the foot's length is height, the whole of it compresses into
   one or two height bands, and whichever of the hock and the ankle the
   trace lands on, the other is a stub. Measured across seven layouts
   here, the hind sum never got past 0.385 and most landed near 0.33 —
   lowering the toe, raising the hock, reversing the chain to the fore
   limb's own back-then-forward shape (0.299), all of it moves which
   bone is the stub and not the total.

   WHAT IT COSTS, measured rather than feared: 3533 corrective steps
   over 6006 walk frames against the old mesh's 2859 on the same code —
   24% more, all of it in turns, all of it handled by §45's corrective
   step. Re-plants per stance stay at 0.000, paws more than 2 cm under
   the sand are BETTER (0.14% against 0.22%) and so is paw clearance
   (2.44 cm median against 1.37). Nothing about it is visible.

   Whoever takes it further: the lever is the ankle rule, not the mesh.
   Find the ankle where the trace's HEIGHT stops changing and its x
   starts — where the leg becomes a foot — instead of at a fixed
   fraction. Then re-check both animals, because the old mesh is fitted
   by the same rule and currently benefits from it.

   A RING GOES ON EACH JOINT, and that is not a detail. `fitLimbs`
   finds the knee as the height band where the limb's x-slope REVERSES,
   which only exists in the mesh if the corner does. Spacing the rings
   evenly by arc length instead put no ring on the stifle, the corner
   was cut off between two rings, and the fit came back with a hind
   upper segment of 0.088 body units against a lower of 0.280 — a
   thigh shorter than the paw. So the tube is walked SEGMENT BY
   SEGMENT: `[seg, u]` names a fraction along one bone, and every bone
   ends on a ring.

   THE THIGH MUST NOT BE THE WIDEST PART OF THE ANIMAL. `buildProfile`
   only excludes what `inLimb` masks, and `inLimb` masks nothing above
   y = 2.6 — so an upper limb standing proud of the flank is measured as
   BODY WIDTH. First pass: hips 3.12 where the table said 2.52, the
   widest station landed on the hind thigh, `landmarks` took its rump
   from there and the tail came out 1.22 torsos long. That single
   number is also exactly what the user was looking at when they said
   the hind legs read as a big belly. Hip side plus tube radius is held
   just inside the body's own halfW at the same station.
   THE STANCE IS SPLAYED FROM THE ELBOW/HOCK DOWN, NOT FROM THE HIP.
   The first pass at widening moved all four joints out by the same
   amount and broke two things at once. Widening the HIP puts the
   thigh's counted rings past the body's own halfW, `landmarks()` took
   its widest station off the hind thigh (halfW 2.73 at unbent 12.50
   against the hips' 2.60 at 13.94), the rump walked forward and every
   downstream ratio moved with it. Widening the ELBOW past about 1.7
   extends the fore lobe backward (the elbow sits BACK of the hip, at
   f 2.15), the shoulder fit slides with it and the upper bone comes
   back 0.137 against a lower of 0.269 — the same thigh-shorter-than-
   shank failure the ring rule above is about.

   THE BUDGET, and it is a hard one: a tube ring above y = 2.6 is not
   masked by `inLimb`, so its side + halfAcross has to stay under the
   body's halfW at that station. That caps the fore at s(hip) 1.42 /
   s(elbow) 1.66 and leaves the hind hip and stifle where they were.
   Everything below y = 2.6 is masked and free, which is where the
   splay went: fore wrist/toe 1.66 -> 2.02/2.16, hind hock/toe
   1.84/1.90 -> 2.16/2.30. Fore paw centre 0.112 -> 0.114 at the hip
   and 0.129 -> 0.168 at the toe in body units; hind 0.139 -> 0.174.

   WHAT IT COSTS: the paw pad, splayed, hangs its outer corner lower
   than the rest pose predicts, so the feet ride nearer the sand.
   On a set-matched probe (lowest 12 vertices of each foot) the median
   clearance goes 0.87 cm -> 0.18 cm and samples more than 2 cm under
   the sand go 0.33% -> 0.55%. On `check-gait.js`'s own measure it is
   0.14% -> 0.16%, and everything else improves: corrective steps 3533
   -> 3071, stance scrub median 0.174 -> 0.136 cm, re-plants still
   0.000, and the worst stretched edge falls in all four states (walk
   2.45 -> 2.13, haul 5.38 -> 3.39, swim 6.86 -> 2.57, catch 10.39 ->
   3.33). The hind chain also comes out of the fit balanced for the
   first time — upper 0.189 against lower 0.185, where it was 0.252
   against 0.089.
 */
var LIMB = {
  fore: {
    ring: 4.30,           // body station the socket is cut at
    slot: 4,              // first ring slot of the socket (top=0, side=4)
    nk: 3, nr: 2,         // socket size, in slots and rings
    joints: [
      [ 4.40, 4.36, 1.42 ],   // hip, tucked inside the flank
      [ 2.15, 2.22, 1.66 ],   // elbow - BACK
      [ 4.25, 0.80, 2.02 ],   // wrist
      [ 5.55, 0.18, 2.16 ]    // toe
    ],
    /* [segment, fraction along it, halfAlong, halfAcross].
        THREE RINGS ON THE UPPER BONE, not one. The fit takes the hip
        from the mean of the CLOUD'S TOP HEIGHT BAND, and that band is
        whatever geometry happens to be there — so an upper bone
        represented by a single ring two fifths of the way down puts
        the fitted hip two fifths of the way down with it. Measured:
        hind hip at x -0.783 where the chain says -0.918, and an upper
        segment of 0.120 body units against a lower of 0.226. */
    tube: [
      [0, 0.20, 0.96, 0.98],
      [0, 0.60, 0.86, 0.90],
      [0, 1.00, 0.76, 0.82],   // the elbow
      [1, 0.55, 0.70, 0.78],
      [1, 1.00, 0.64, 0.72]    // the wrist
    ],
    paw: { halfW: 0.78, halfH: 0.32, toe: 0.32, spread: 1.00 }
  },
  hind: {
    ring: -5.20,
    slot: 4, nk: 3, nr: 2,
    joints: [
      [ -5.70, 4.36, 1.46 ],   // hip
      [ -4.30, 2.30, 1.72 ],   // stifle - FORWARD
      [ -5.85, 0.92, 2.16 ],   // hock
      [ -2.95, 0.18, 2.30 ]    // toe - the long hind foot carries well forward - the long hind foot carries well forward
    ],
    tube: [
      [0, 0.20, 1.04, 1.06],
      [0, 0.60, 0.92, 0.96],
      [0, 1.00, 0.80, 0.86],   // the stifle
      [1, 0.55, 0.74, 0.84],
      [1, 1.00, 0.66, 0.80]    // the hock
    ],
    /* the hind paw is the bigger of the two and carries what webbing
       this animal has - Aonyx is webbed only to the last joint, so the
       lobes stay separate at the tips and the pad is wide behind them */
    paw: { halfW: 0.92, halfH: 0.34, toe: 0.38, spread: 1.05 }
  }
};

/* ---- the ears ----
   Small, round, low on the side of the skull — the small-clawed otter's
   are barely more than a rim. Cut into the skull rings so they are part
   of the shell and get skinned with it; a loose ear would be taken for
   an eye by `components()`. */
var EAR = {
  ring: 9.46, slot: 2, nk: 2, nr: 1,
  /* A REAL SILHOUETTE OR NOTHING. The first pass stood the rim 0.62
     units off a socket 1.4 units across, which is a dimple: at the
     poly count this animal is drawn at it disappeared entirely, and an
     ear that cannot be seen is worse than no ear, because it still
     costs vertices and still moves the skull's measured width. Aonyx's
     ears really are small, so this is as far as it can be pushed while
     staying honest — but it does now read from the side. */
  out: 0.68,           // how far the rim stands off the skull
  back: -0.22,         // and how far back it leans
  rad: [[0.64, 0.56], [0.56, 0.48]]
};

/* ---- the eyes ----
   The only two loose components on the animal, and they have to stay
   the only two. Small and set well forward on the skull: on Aonyx the
   eyes sit far enough forward to be nearly binocular, which is part of
   why the face reads as round rather than long. */
/* ASKED OF THE SURFACE, NOT TYPED. §43 already paid for this once: the
   face fittings were placed at typed radii, the head was rebuilt, and
   100% of the eyes and ears ended up inside it. The first pass here
   repeated it exactly — a typed (side 1.12, up 0.72) puts the centre at
   0.58 of the way to the skin on a skull that measures 1.75 by 1.76, so
   a 0.40 bead sat wholly buried and the animal rendered blind.

   So the eye is given a STATION and a DIRECTION, and where the skin is
   at that direction is the ring's business. `sink` is the fraction of
   the bead that is pushed back under the skin, which is what stops it
   floating off the face when the skull changes shape again. */
var EYE = { f: 10.46, theta: 54 * Math.PI / 180, r: 0.34, sink: 0.42, seg: 8, rings: 4 };

/* ============================================================
   MESH
   ============================================================ */
function Mesh() { this.V = []; this.F = []; }
Mesh.prototype.v = function (s, u, f) { this.V.push([s, u, f]); return this.V.length - 1; };
Mesh.prototype.q = function (a, b, c, d) { this.F.push([a, b, c, d]); };
Mesh.prototype.t = function (a, b, c) { this.F.push([a, b, c]); };

/* Catmull-Rom through a column of the BODY table, so the ring the
   sockets are cut at can sit between two typed stations without a
   crease showing up in the profile. */
function crAt(rows, col, f) {
  var n = rows.length, i;
  if (f <= rows[0][0]) return rows[0][col];
  if (f >= rows[n - 1][0]) return rows[n - 1][col];
  for (i = 1; i < n; i++) if (rows[i][0] >= f) break;
  var i1 = i - 1, i2 = i;
  var i0 = Math.max(0, i1 - 1), i3 = Math.min(n - 1, i2 + 1);
  var t = (f - rows[i1][0]) / (rows[i2][0] - rows[i1][0]);
  var p0 = rows[i0][col], p1 = rows[i1][col], p2 = rows[i2][col], p3 = rows[i3][col];
  var t2 = t * t, t3 = t2 * t;
  return 0.5 * ((2 * p1) + (-p0 + p2) * t +
                (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
                (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}

/* A superellipse point. `k` is the slot, 0 at the TOP and running
   toward +side, so slot NR/4 is the flank and NR/2 the belly. */
function ringPoint(k, halfW, halfH, shape, bellyLift) {
  var th = 2 * Math.PI * k / NR;
  var st = Math.sin(th), ct = Math.cos(th);
  var e = 2 / shape;
  var s = halfW * Math.sign(st) * Math.pow(Math.abs(st), e);
  var u = halfH * Math.sign(ct) * Math.pow(Math.abs(ct), e);
  /* the belly is raised, the back is not: a smooth ramp that is 1 at
     the bottom slot and 0 by the flanks */
  if (u < 0) u += bellyLift * halfH * (-u / halfH);
  return [s, u];
}

/* ============================================================
   THE BODY TUBE
   ============================================================ */
function buildBody(M, ringF) {
  var grid = [];
  for (var r = 0; r < ringF.length; r++) {
    var f = ringF[r];
    var hw = crAt(BODY, 1, f), hh = crAt(BODY, 2, f);
    var cu = crAt(BODY, 3, f), sh = crAt(BODY, 4, f);
    var bl = Math.max(MIN_BELLY, crAt(BODY, 5, f));
    var row = [];
    for (var k = 0; k < NR; k++) {
      var p = ringPoint(k, hw, hh, sh, bl);
      row.push(M.v(p[0], cu + p[1], f));
    }
    grid.push(row);
  }
  return grid;
}

/* ============================================================
   CUTTING A SOCKET

   Removing `nr` x `nk` quads out of the ring grid leaves a hole whose
   boundary is the perimeter of an (nr+1) x (nk+1) patch of vertices —
   2*nr + 2*nk of them. That count is the limb's ring count, and it is
   why a limb is 10 vertices around and an ear is 6: the socket is what
   decides, not the limb.

   The loop is returned in perimeter order. Every ring the limb grows
   afterwards is laid out at the SAME angles this loop has about its own
   centre, which is what stops the tube from twisting where it meets
   the body — matching counts is not enough on its own.
   ============================================================ */
function socket(grid, r0, k0, nr, nk, holes) {
  var loop = [], i, j;
  for (j = 0; j <= nk; j++) loop.push(grid[r0][(k0 + j) % NR]);
  for (i = 1; i <= nr; i++) loop.push(grid[r0 + i][(k0 + nk) % NR]);
  for (j = nk - 1; j >= 0; j--) loop.push(grid[r0 + nr][(k0 + j) % NR]);
  for (i = nr - 1; i >= 1; i--) loop.push(grid[r0 + i][k0 % NR]);
  for (i = 0; i < nr; i++) for (j = 0; j < nk; j++) holes[(r0 + i) + ':' + ((k0 + j) % NR)] = 1;
  return loop;
}

/* A frame for a boundary loop: its centroid, an outward normal from
   the ring's own winding, and two in-plane axes. */
function loopFrame(M, loop) {
  var c = [0, 0, 0], i, k;
  for (i = 0; i < loop.length; i++) for (k = 0; k < 3; k++) c[k] += M.V[loop[i]][k] / loop.length;
  /* Newell's normal over the loop */
  var n = [0, 0, 0];
  for (i = 0; i < loop.length; i++) {
    var a = M.V[loop[i]], b = M.V[loop[(i + 1) % loop.length]];
    n[0] += (a[1] - b[1]) * (a[2] + b[2]);
    n[1] += (a[2] - b[2]) * (a[0] + b[0]);
    n[2] += (a[0] - b[0]) * (a[1] + b[1]);
  }
  var nl = Math.hypot(n[0], n[1], n[2]) || 1;
  n = [n[0] / nl, n[1] / nl, n[2] / nl];
  /* AND IT HAS TO POINT OUT OF THE ANIMAL. Newell's normal follows the
     loop's winding, and a socket's winding depends on which slots it
     was cut from — so half the sockets hand back an inward normal.
     Nothing that grows along a chain notices (the limbs take their
     direction from their joints), but the ear is built along this
     normal, and it spent three renders growing INTO the skull: its
     furthest vertex measured 1.38 units off the midline where the skull
     itself is 1.86, which is why there was never an ear to see. */
  var ax = [0, crAt(BODY, 3, c[2]), c[2]];
  if (dot(n, sub(c, ax)) < 0) n = [-n[0], -n[1], -n[2]];
  /* in-plane axes: the first loop vertex sets e1 */
  var d = sub(M.V[loop[0]], c);
  var e1 = norm(sub(d, mul(n, dot(d, n))));
  var e2 = cross(n, e1);
  return { c: c, n: n, e1: e1, e2: e2 };
}

function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
function add(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
function mul(a, k) { return [a[0] * k, a[1] * k, a[2] * k]; }
function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function cross(a, b) {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}
function norm(a) { var l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }

/* ============================================================
   A LIMB

   Rings walked along the hip->knee->ankle->toe polyline by arc length,
   each carrying a PARALLEL-TRANSPORTED frame so the tube does not spin
   about its own axis where the chain turns a corner. The socket loop's
   angles are reused at every ring, so the seam at the body is a plain
   quad band.
   ============================================================ */
/* A point a fraction `u` along bone `seg` of the chain, with that
   bone's own direction. Naming the bone rather than an arc-length
   fraction is what lets a ring sit exactly on a joint. */
function chainAt(J, seg, u) {
  var a = J[seg], b = J[seg + 1];
  return {
    p: [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u],
    d: norm([b[0] - a[0], b[1] - a[1], b[2] - a[2]])
  };
}

function buildLimb(M, loop, spec) {
  var N = loop.length;
  /* joints in (f,u,s) -> mesh order (s,u,f). Always the RIGHT limb;
     `reflect` makes the left one out of it. */
  var J = spec.joints.map(function (j) { return [j[2], j[1], j[0]]; });

  var fr = loopFrame(M, loop);
  /* the loop's own angles, measured in its plane */
  var ang = loop.map(function (vi) {
    var d = sub(M.V[vi], fr.c);
    return Math.atan2(dot(d, fr.e2), dot(d, fr.e1));
  });
  /* THE SOCKET'S OWN OUTLINE, AS A SHAPE AND NOT AS A SIZE. A socket
     cut out of a body ring is an oblong, not a circle, and a tube that
     jumps straight to a circle at its first ring puts a visible step at
     the shoulder. So the loop's radius per angle is kept — divided
     through by its own mean, so it carries the SHAPE only and the
     numbers in `tube` still mean what they say. (Kept as an absolute
     distance it multiplied the tube's radius by about 1.3 and every
     leg came out fat at the top.) */
  var rad0 = loop.map(function (vi) {
    var d = sub(M.V[vi], fr.c);
    return Math.hypot(dot(d, fr.e1), dot(d, fr.e2));
  });
  var rmean = rad0.reduce(function (a, b) { return a + b; }, 0) / rad0.length;
  rad0 = rad0.map(function (r) { return r / rmean; });

  /* AND THE ANGLES HAVE TO BE SPREAD OUT AS THE TUBE LEAVES THE
     SOCKET, for the same reason the radii do and with a worse failure
     if they are not.

     A socket loop is the perimeter of a two-by-three patch — a
     rectangle, not a circle — so two ADJACENT perimeter vertices can
     sit nearly on the same ray out of the centroid. On the socket they
     are a normal distance apart, because they are at different radii.
     Reuse those angles on a round ring further down the limb and the
     two collapse onto each other: measured, an edge of 0.031 units
     against a median of 0.630, at the elbow, on every limb.

     It is invisible — 0.2 cm on a 1.75 m animal — right up until
     something divides by it. `check-stretch` reports deformed length
     over REST length, so a rest edge twenty times too short reported
     16.9x stretch at `catch` while the p99 sat at 1.64. It also makes
     the flat-shaded normal of the two facets sharing it meaningless.

     So the angles are lerped toward evenly spaced ones over the same
     two rings the radii are, keeping the loop's own order and starting
     point so the seam at the body is still a plain quad band. */
  var unw = [ang[0]];
  for (var u1 = 1; u1 < N; u1++) {
    var dd = ang[u1] - unw[u1 - 1];
    while (dd >  Math.PI) dd -= 2 * Math.PI;
    while (dd < -Math.PI) dd += 2 * Math.PI;
    unw.push(unw[u1 - 1] + dd);
  }
  var turn = unw[N - 1] - unw[0] >= 0 ? 1 : -1;
  var even = [];
  for (var u2 = 0; u2 < N; u2++) even.push(unw[0] + turn * 2 * Math.PI * u2 / N);

  var prev = null, rings = [];
  for (var m = 0; m < spec.tube.length; m++) {
    var T = spec.tube[m];
    var at = chainAt(J, T[0], T[1]);
    /* parallel transport: rotate the previous frame's axes by the
       minimal rotation carrying the previous tangent onto this one */
    var e1, e2;
    if (!prev) {
      e1 = norm(sub(fr.e1, mul(at.d, dot(fr.e1, at.d))));
      e2 = cross(at.d, e1);
    } else {
      var r = rotateOnto(prev.d, at.d);
      e1 = norm(sub(r(prev.e1), mul(at.d, dot(r(prev.e1), at.d))));
      e2 = cross(at.d, e1);
    }
    prev = { d: at.d, e1: e1, e2: e2 };
    var row = [];
    for (var i = 0; i < N; i++) {
      /* blend out of the socket's own outline into a plain ellipse —
         both the radius and the ANGLE, or two loop vertices on the same
         ray collapse together on every ring below */
      var w = Math.min(1, m / 1.5);
      var rr = (1 - w) * rad0[i] + w;
      var th = (1 - w) * unw[i] + w * even[i];
      var px = Math.cos(th) * T[2] * rr;
      var py = Math.sin(th) * T[3] * rr;
      row.push(M.v(at.p[0] + e1[0] * px + e2[0] * py,
                   at.p[1] + e1[1] * px + e2[1] * py,
                   at.p[2] + e1[2] * px + e2[2] * py));
    }
    rings.push(row);
  }

  /* ---- the paw ----
     A flattened pad carried forward off the last tube ring, then a
     front ring whose alternate vertices are pushed out into five toe
     lobes. At ten vertices around that is exactly five bumps and five
     valleys, which is the cheapest thing that still reads as a foot
     from above and from the side. */
  var pw = spec.paw;
  var toe = J[3], ankle = J[2];
  var fwd = norm(sub(toe, ankle));
  var upv = [0, 1, 0];
  var sidev = norm(cross(fwd, upv));
  var upn = norm(cross(sidev, fwd));

  var padRings = [
    { at: 0.30, hw: pw.halfW * 0.82, hh: pw.halfH * 1.05, lobe: 0.00 },
    { at: 0.72, hw: pw.halfW * 1.00, hh: pw.halfH * 0.92, lobe: 0.45 },
    { at: 1.00, hw: pw.halfW * 0.86, hh: pw.halfH * 0.66, lobe: 1.00 }
  ];
  for (var pr = 0; pr < padRings.length; pr++) {
    var P = padRings[pr];
    var base = [ankle[0] + (toe[0] - ankle[0]) * P.at,
                ankle[1] + (toe[1] - ankle[1]) * P.at,
                ankle[2] + (toe[2] - ankle[2]) * P.at];
    var row2 = [];
    for (var i2 = 0; i2 < N; i2++) {
      /* `even`, not `ang` — the paw is the far end of the limb, where
         the socket's own outline has long since been blended out */
      var a2 = even[i2];
      var cx = Math.cos(a2), cy = Math.sin(a2);
      /* the pad's own axes: `sidev` across the foot, `upn` through it */
      var px2 = cx * P.hw * pw.spread, py2 = cy * P.hh;
      /* five lobes across the FRONT half of the outline. `cx` is the
         across-foot coordinate; the toes are the vertices whose index
         parity puts them on a bump. */
      var lobe = (i2 % 2 === 0) ? 1 : 0;
      var frontness = Math.max(0, cy > -2 ? 1 : 0);   // the whole rim carries forward
      var push = pw.toe * P.lobe * lobe * frontness;
      row2.push(M.v(base[0] + sidev[0] * px2 + upn[0] * py2 + fwd[0] * push,
                    base[1] + sidev[1] * px2 + upn[1] * py2 + fwd[1] * push,
                    base[2] + sidev[2] * px2 + upn[2] * py2 + fwd[2] * push));
    }
    rings.push(row2);
  }

  /* the toe pole */
  var tip = M.v(toe[0] + fwd[0] * pw.toe * 0.45,
                toe[1] + fwd[1] * pw.toe * 0.45,
                toe[2] + fwd[2] * pw.toe * 0.45);

  stitch(M, [loop].concat(rings), tip);
}

/* the minimal rotation carrying `a` onto `b`, as a function */
function rotateOnto(a, b) {
  var v = cross(a, b), c = dot(a, b);
  var s2 = dot(v, v);
  if (s2 < 1e-12) return function (p) { return c > 0 ? p : mul(p, -1); };
  var k = (1 - c) / s2;
  return function (p) {
    var vp = cross(v, p);
    return add(add(p, vp), mul(cross(v, vp), k));
  };
}

/* Bands of quads between consecutive rings, then a fan to the pole. */
function stitch(M, rings, pole) {
  var N = rings[0].length;
  for (var r = 0; r < rings.length - 1; r++) {
    for (var k = 0; k < N; k++) {
      var k2 = (k + 1) % N;
      M.q(rings[r][k], rings[r][k2], rings[r + 1][k2], rings[r + 1][k]);
    }
  }
  if (pole !== undefined && pole !== null) {
    var last = rings[rings.length - 1];
    for (var k3 = 0; k3 < N; k3++) M.t(last[k3], last[(k3 + 1) % N], pole);
  }
}

/* ============================================================
   AN EAR — the same socket-and-tube, three rings and a pole.
   ============================================================ */
function buildEar(M, loop) {
  var fr = loopFrame(M, loop);
  var N = loop.length;
  var ang = loop.map(function (vi) {
    var d = sub(M.V[vi], fr.c);
    return Math.atan2(dot(d, fr.e2), dot(d, fr.e1));
  });
  var outv = fr.n;
  var rings = [];
  for (var m = 0; m < EAR.rad.length; m++) {
    var t = (m + 1) / (EAR.rad.length + 0.25);
    var c = [fr.c[0] + outv[0] * EAR.out * t,
             fr.c[1] + outv[1] * EAR.out * t,
             fr.c[2] + outv[2] * EAR.out * t + EAR.back * t];
    var row = [];
    for (var i = 0; i < N; i++) {
      row.push(M.v(c[0] + fr.e1[0] * Math.cos(ang[i]) * EAR.rad[m][0] + fr.e2[0] * Math.sin(ang[i]) * EAR.rad[m][1],
                   c[1] + fr.e1[1] * Math.cos(ang[i]) * EAR.rad[m][0] + fr.e2[1] * Math.sin(ang[i]) * EAR.rad[m][1],
                   c[2] + fr.e1[2] * Math.cos(ang[i]) * EAR.rad[m][0] + fr.e2[2] * Math.sin(ang[i]) * EAR.rad[m][1]));
    }
    rings.push(row);
  }
  var last = [fr.c[0] + outv[0] * EAR.out, fr.c[1] + outv[1] * EAR.out, fr.c[2] + outv[2] * EAR.out + EAR.back];
  var tip = M.v(last[0], last[1], last[2]);
  stitch(M, [loop].concat(rings), tip);
}

/* ============================================================
   AN EYE — a loose quad sphere. There must be exactly two of these and
   nothing else loose on the animal, because `bake-otter.js` takes the
   second and third largest components and paints them black.
   ============================================================ */
function buildEye(M, centre, r) {
  var rings = [], i, j;
  for (i = 1; i <= EYE.rings; i++) {
    var ph = Math.PI * i / (EYE.rings + 1);
    var row = [];
    for (j = 0; j < EYE.seg; j++) {
      var th = 2 * Math.PI * j / EYE.seg;
      row.push(M.v(centre[0] + r * Math.sin(ph) * Math.cos(th),
                   centre[1] + r * Math.cos(ph),
                   centre[2] + r * Math.sin(ph) * Math.sin(th)));
    }
    rings.push(row);
  }
  var top = M.v(centre[0], centre[1] + r, centre[2]);
  var bot = M.v(centre[0], centre[1] - r, centre[2]);
  for (i = 0; i < rings.length - 1; i++) {
    for (j = 0; j < EYE.seg; j++) {
      var j2 = (j + 1) % EYE.seg;
      M.q(rings[i][j], rings[i][j2], rings[i + 1][j2], rings[i + 1][j]);
    }
  }
  for (j = 0; j < EYE.seg; j++) M.t(top, rings[0][(j + 1) % EYE.seg], rings[0][j]);
  var lastR = rings[rings.length - 1];
  for (j = 0; j < EYE.seg; j++) M.t(lastR[j], lastR[(j + 1) % EYE.seg], bot);
}

/* ------------------------------------------------------------
   MIRROR EVERYTHING ADDED SINCE (v0, f0) ACROSS THE CENTRE PLANE.

   Vertices from v0 onward get a reflected twin; the faces from f0
   onward are re-emitted against those twins, reversed. Anything the
   part borrowed from the BODY — its socket loop — is not duplicated;
   it is remapped onto the body's own mirrored socket, matched by
   position rather than by index, so the two socket loops do not have to
   agree about which corner they start at.
   ------------------------------------------------------------ */
function reflect(M, v0, f0, srcLoop, dstLoop) {
  var map = {}, i;
  for (i = 0; i < srcLoop.length; i++) {
    var m = [-M.V[srcLoop[i]][0], M.V[srcLoop[i]][1], M.V[srcLoop[i]][2]];
    var best = -1, bd = Infinity;
    for (var j = 0; j < dstLoop.length; j++) {
      var d = Math.hypot(M.V[dstLoop[j]][0] - m[0], M.V[dstLoop[j]][1] - m[1], M.V[dstLoop[j]][2] - m[2]);
      if (d < bd) { bd = d; best = dstLoop[j]; }
    }
    if (bd > 1e-6) throw new Error('socket loops are not mirror images: gap ' + bd.toFixed(6));
    map[srcLoop[i]] = best;
  }
  var n = M.V.length;
  for (i = v0; i < n; i++) map[i] = M.v(-M.V[i][0], M.V[i][1], M.V[i][2]);
  var fn = M.F.length;
  for (i = f0; i < fn; i++) {
    M.F.push(M.F[i].map(function (a) { return map[a]; }).reverse());
  }
}

/* Where the eye's bead sits: the skull's own surface at EYE.theta,
   pushed back under it by a fraction of the bead's radius. The outward
   direction is the ellipse's normal at that point, (s/a^2, u/b^2), so
   the sink is along the skin rather than along the radius — on a
   section that is deeper than it is wide those are not the same, and
   the second one buries the eye on one axis and floats it on the
   other. */
function eyeCentre() {
  var f = EYE.f;
  var a = crAt(BODY, 1, f), b = crAt(BODY, 2, f);
  var cu = crAt(BODY, 3, f), sh = crAt(BODY, 4, f);
  var p = ringPoint(EYE.theta * NR / (2 * Math.PI), a, b, sh, 0);
  var n = norm([p[0] / (a * a), p[1] / (b * b), 0]);
  return [p[0] - n[0] * EYE.r * EYE.sink,
          cu + p[1] - n[1] * EYE.r * EYE.sink,
          f];
}

/* ============================================================
   BUILD
   ============================================================ */
function nearestRing(ringF, f) {
  var best = 0, bd = Infinity;
  for (var i = 0; i < ringF.length; i++) {
    var d = Math.abs(ringF[i] - f);
    if (d < bd) { bd = d; best = i; }
  }
  return best;
}

function main() {
  var M = new Mesh();

  /* Rings sit exactly on the typed stations, plus two extra inserted at
     each socket so a socket is never cut across a station where the
     profile is changing fast. */
  var ringF = BODY.map(function (r) { return r[0]; });
  [LIMB.fore.ring, LIMB.hind.ring, EAR.ring].forEach(function (f) {
    if (ringF.indexOf(f) < 0) ringF.push(f);
  });
  ringF.sort(function (a, b) { return a - b; });

  var grid = buildBody(M, ringF);
  var holes = {};

  /* ---- the sockets, cut before anything is stitched ----
     Both sides are cut here; only the RIGHT one is ever built. */
  var jobs = [];
  ['fore', 'hind'].forEach(function (which) {
    var L = LIMB[which];
    var r0 = nearestRing(ringF, L.ring) - Math.floor(L.nr / 2);
    r0 = Math.max(0, Math.min(ringF.length - 1 - L.nr, r0));
    jobs.push({ kind: 'limb', spec: L,
                right: socket(grid, r0, L.slot, L.nr, L.nk, holes),
                left:  socket(grid, r0, NR - L.slot - L.nk, L.nr, L.nk, holes) });
  });
  (function () {
    var r0 = nearestRing(ringF, EAR.ring) - Math.floor(EAR.nr / 2);
    jobs.push({ kind: 'ear',
                right: socket(grid, r0, EAR.slot, EAR.nr, EAR.nk, holes),
                left:  socket(grid, r0, NR - EAR.slot - EAR.nk, EAR.nr, EAR.nk, holes) });
  })();

  /* the body's own quads, minus the holes */
  for (var r = 0; r < grid.length - 1; r++) {
    for (var k = 0; k < NR; k++) {
      if (holes[r + ':' + k]) continue;
      var k2 = (k + 1) % NR;
      M.q(grid[r][k], grid[r][k2], grid[r + 1][k2], grid[r + 1][k]);
    }
  }
  /* and the two poles */
  var tailTip = M.v(0, TAIL_POLE[1], TAIL_POLE[0]);
  var noseTip = M.v(0, NOSE_POLE[1], NOSE_POLE[0]);
  for (var k4 = 0; k4 < NR; k4++) {
    M.t(grid[0][(k4 + 1) % NR], grid[0][k4], tailTip);
    M.t(grid[grid.length - 1][k4], grid[grid.length - 1][(k4 + 1) % NR], noseTip);
  }

  /* ---- the limbs and the ears ----
     BUILT ONCE AND REFLECTED, never built twice. `loopFrame` derives
     its in-plane axes from the socket's own winding, and a mirrored
     socket winds the other way round — so building the left limb by
     re-running the builder with the side flipped gives a limb that is
     ROTATED rather than reflected. Measured on the first pass: 330
     vertices with no mirror partner and a body 0.24 units wider on one
     side than the other. Reflecting the finished part cannot do that.

     Reflection reverses handedness, so the copied faces are wound the
     other way and have to be reversed. `orient` would not catch it —
     it works per COMPONENT, and these are all one shell. */
  jobs.forEach(function (j) {
    var v0 = M.V.length, f0 = M.F.length;
    if (j.kind === 'limb') buildLimb(M, j.right, j.spec);
    else buildEar(M, j.right);
    reflect(M, v0, f0, j.right, j.left);
  });

  /* the eyes, last, so they are the smallest thing added. Their centre
     is derived from the skull's own section at that station — see EYE. */
  var e0 = M.V.length, ef0 = M.F.length;
  buildEye(M, eyeCentre(), EYE.r);
  reflect(M, e0, ef0, [], []);

  var dropped = compact(M);
  var flipped = orient(M);
  write(M);
  report(M, dropped, flipped);
}

/* ------------------------------------------------------------
   DROP THE VERTICES NOTHING USES.

   A socket two rings deep and three slots wide has INTERIOR vertices —
   the ones the removed quads were the only users of. Eight of them, two
   per limb. They are harmless in an OBJ and not harmless here: the bake
   weights, un-bends and emits every vertex it reads, so eight points
   floating inside the shoulders would each get a spine weight and be
   skinned along with the animal, and `check-roundtrip` would carry them
   for ever without ever saying what they were.
   ------------------------------------------------------------ */
function compact(M) {
  var used = new Set();
  M.F.forEach(function (f) { f.forEach(function (i) { used.add(i); }); });
  var map = new Array(M.V.length), V2 = [];
  for (var i = 0; i < M.V.length; i++) {
    if (used.has(i)) { map[i] = V2.length; V2.push(M.V[i]); }
  }
  var dropped = M.V.length - V2.length;
  M.V = V2;
  M.F = M.F.map(function (f) { return f.map(function (i) { return map[i]; }); });
  return dropped;
}

/* ------------------------------------------------------------
   ORIENT EVERY COMPONENT OUTWARD.

   `flatShading` takes its normals from the winding, so a face wound the
   wrong way is lit from the inside and reads as a hole in the animal.
   Getting the winding right by hand across a body tube, four limbs
   stitched into it at four different angles, two ears and two spheres
   is exactly the kind of bookkeeping that is wrong once and invisible
   until a render — so it is not done by hand.

   Each component here is a CLOSED surface (the manifold check above
   proves it), and a closed surface's signed volume is positive if and
   only if it is wound outward. So: measure it, and reverse the
   component if it comes out negative. One test, no special cases, and
   it stays right when the PARAMS move.
   ------------------------------------------------------------ */
function orient(M) {
  var par = M.V.map(function (_, i) { return i; });
  function find(a) { while (par[a] !== a) { par[a] = par[par[a]]; a = par[a]; } return a; }
  M.F.forEach(function (f) {
    for (var j = 1; j < f.length; j++) { var a = find(f[0]), b = find(f[j]); if (a !== b) par[b] = a; }
  });
  var vol = {};
  M.F.forEach(function (f) {
    var r = find(f[0]);
    for (var j = 2; j < f.length; j++) {
      var a = M.V[f[0]], b = M.V[f[j - 1]], c = M.V[f[j]];
      vol[r] = (vol[r] || 0) + dot(a, cross(b, c)) / 6;
    }
  });
  var flipped = 0;
  M.F = M.F.map(function (f) {
    if (vol[find(f[0])] < 0) { flipped++; return f.slice().reverse(); }
    return f;
  });
  return flipped;
}

function write(M) {
  var out = [
    '# Asian small-clawed otter (Aonyx cinereus)',
    '# GENERATED by tools/make-otter-obj.js - do not hand-edit, change the',
    '# PARAMS block in that file and run it again.',
    '# +Z nose, +Y up, +X side; feet near y = 0; ' + M.V.length + ' verts, ' + M.F.length + ' faces.',
    'o AonyxOtter'
  ];
  for (var i = 0; i < M.V.length; i++) {
    var v = M.V[i];
    out.push('v ' + v[0].toFixed(4) + ' ' + v[1].toFixed(4) + ' ' + v[2].toFixed(4));
  }
  out.push('usemtl skin');
  for (var j = 0; j < M.F.length; j++) {
    out.push('f ' + M.F[j].map(function (a) { return a + 1; }).join(' '));
  }
  fs.writeFileSync(OUT, out.join('\n') + '\n');
}

/* ------------------------------------------------------------
   The generator checks its own output, because every one of these has
   already been a bug in this project once:

     COMPONENTS   exactly three, and the two small ones are the eyes
     WINDING      flat shading takes its normals from the winding, so a
                  face wound the wrong way is lit from inside
     NON-MANIFOLD an edge shared by other than two faces is a hole or a
                  fold, and the un-bend projects onto whatever it finds
     LIMB WINDOWS the bake's crude `inLimb` mask is typed in these
                  units; if the legs miss it they drag the centreline
                  down and every landmark moves
   ------------------------------------------------------------ */
function report(M, dropped, flipped) {
  console.log('wrote ' + path.relative(path.join(__dirname, '..'), OUT));
  console.log('  ' + M.V.length + ' verts, ' + M.F.length + ' faces (' +
              M.F.filter(function (f) { return f.length === 4; }).length + ' quads, ' +
              M.F.filter(function (f) { return f.length === 3; }).length + ' tris)' +
              '   [dropped ' + dropped + ' socket interiors, reversed ' + flipped + ' faces]');

  /* components */
  var par = M.V.map(function (_, i) { return i; });
  function find(a) { while (par[a] !== a) { par[a] = par[par[a]]; a = par[a]; } return a; }
  M.F.forEach(function (f) {
    for (var j = 1; j < f.length; j++) { var a = find(f[0]), b = find(f[j]); if (a !== b) par[b] = a; }
  });
  var buck = {};
  M.V.forEach(function (_, i) { var r = find(i); (buck[r] = buck[r] || []).push(i); });
  var comps = Object.keys(buck).map(function (k) { return buck[k]; })
                    .sort(function (a, b) { return b.length - a.length; });
  console.log('  components: ' + comps.map(function (c) { return c.length; }).join(', ') +
              (comps.length === 3 ? '   OK (shell + 2 eyes)' : '   *** must be exactly 3'));

  /* manifold: every edge used exactly twice */
  var edge = {}, bad = 0;
  M.F.forEach(function (f) {
    for (var i = 0; i < f.length; i++) {
      var a = f[i], b = f[(i + 1) % f.length];
      var key = Math.min(a, b) + '_' + Math.max(a, b);
      edge[key] = (edge[key] || 0) + 1;
    }
  });
  Object.keys(edge).forEach(function (k) { if (edge[k] !== 2) bad++; });
  console.log('  edges shared by other than two faces: ' + bad + (bad ? '   *** non-manifold' : '   OK'));

  /* WINDING, per component, by signed volume — the same test `orient`
     applies, asked again after the fact because `reflect` runs later
     and reverses faces of its own. A component that comes out negative
     is wound inward and will be lit from inside under `flatShading`. */
  var vol = {};
  M.F.forEach(function (f) {
    var r = find(f[0]);
    for (var j = 2; j < f.length; j++) {
      vol[r] = (vol[r] || 0) + dot(M.V[f[0]], cross(M.V[f[j - 1]], M.V[f[j]])) / 6;
    }
  });
  var neg = Object.keys(vol).filter(function (k) { return vol[k] <= 0; }).length;
  console.log('  component volumes: ' + Object.keys(vol).map(function (k) { return vol[k].toFixed(1); }).join(', ') +
              (neg ? '   *** ' + neg + ' wound inward' : '   OK (all outward)'));

  /* SYMMETRY. Not cosmetic: `fitLimbs` fits the left and right limbs
     independently, and `otters.js` drives them from one gait phase — a
     limb pair that is not a mirror pair makes the animal walk with a
     limp that no gait constant can take out. */
  var worst = 0, unmatched = 0;
  var byF = {};
  M.V.forEach(function (v, i) { var k = v[2].toFixed(3); (byF[k] = byF[k] || []).push(i); });
  M.V.forEach(function (v) {
    var cand = byF[v[2].toFixed(3)] || [], bd = Infinity;
    for (var i = 0; i < cand.length; i++) {
      var w = M.V[cand[i]];
      var d = Math.hypot(w[0] + v[0], w[1] - v[1]);
      if (d < bd) bd = d;
    }
    if (bd > worst) worst = bd;
    if (bd > 1e-4) unmatched++;
  });
  console.log('  vertices with no mirror twin: ' + unmatched + ' (worst gap ' + worst.toFixed(6) + ')' +
              (unmatched ? '   *** not symmetric' : '   OK'));

  /* NEAR-DEGENERATE EDGES, because they are invisible and they poison
     a gate. `check-stretch` divides deformed length by REST length, so
     one edge twenty times shorter than its neighbours reports a
     spectacular stretch ratio while nothing on screen moves — 16.9x at
     `catch` with the p99 sitting at 1.64. They also make the two facets
     sharing them shade off a normal that is numerical noise. Ratio was
     40x before the tip rings came out and the limb angles were spread;
     under about 12x the shortest edge is a real edge. */
  var seenE = {}, len = [];
  M.F.forEach(function (f) {
    for (var i = 0; i < f.length; i++) {
      var a = f[i], b = f[(i + 1) % f.length];
      var key = Math.min(a, b) + '_' + Math.max(a, b);
      if (seenE[key]) continue;
      seenE[key] = 1;
      len.push(Math.hypot(M.V[a][0] - M.V[b][0], M.V[a][1] - M.V[b][1], M.V[a][2] - M.V[b][2]));
    }
  });
  len.sort(function (a, b) { return a - b; });
  var ratio = len[len.length >> 1] / len[0];
  console.log('  shortest edge ' + len[0].toFixed(4) + ' against a median of ' +
              len[len.length >> 1].toFixed(3) + ' — ' + ratio.toFixed(1) + 'x' +
              (ratio > 12 ? '   *** near-degenerate' : '   OK'));

  /* the bake's own limb mask, applied here */
  var fore = 0, hind = 0, low = 0;
  M.V.forEach(function (v) {
    /* v is (side, up, forward); inLimb sees (forward, up, side) */
    if (v[1] < 2.6 && Math.abs(v[0]) > 0.8) {
      low++;
      if (v[2] > 2.4 && v[2] < 7.4) fore++;
      if (v[2] > -6.0 && v[2] < -1.6) hind++;
    }
  });
  console.log('  inLimb() would mark ' + (fore + hind) + ' verts (fore ' + fore + ', hind ' + hind +
              ') of ' + low + ' low-and-off-centre' +
              (fore > 20 && hind > 20 ? '   OK' : '   *** limbs are outside the mask windows'));

  /* extent */
  var mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
  M.V.forEach(function (v) { for (var k = 0; k < 3; k++) { if (v[k] < mn[k]) mn[k] = v[k]; if (v[k] > mx[k]) mx[k] = v[k]; } });
  console.log('  extent  side ' + mn[0].toFixed(2) + '..' + mx[0].toFixed(2) +
              '   up ' + mn[1].toFixed(2) + '..' + mx[1].toFixed(2) +
              '   fwd ' + mn[2].toFixed(2) + '..' + mx[2].toFixed(2) +
              '   (nose to tail ' + (mx[2] - mn[2]).toFixed(2) + ', was 31.87)');
}

main();
