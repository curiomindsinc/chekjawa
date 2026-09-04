/* ============================================================
   bake-otter.js — turns `reference/otter/Otter.obj` into `js/ottermesh.js`.

     node tools/bake-otter.js

   WHY THERE IS A BAKE STEP AT ALL. Every other body on this shore is
   built by `facet.js` at load time out of sweeps and blades, and ships
   no asset. The otter is the one animal built from a real mesh, and
   the sim still must not fetch a file at runtime — so the mesh is
   converted ONCE, here, into a plain script that declares arrays. Run
   this again whenever the OBJ or the palette changes; nothing else
   reads the OBJ.

   WHAT THE OBJ IS. 1027 vertices, 1000 quads, one welded shell plus
   two loose 37-vertex blobs that are the EYES. Quad-dominant and clean
   (889 vertices at valence 4). No `.mtl` ships with it and there is no
   texture, so every colour here comes from §43's palette, which was
   sampled off the OTHER reference's texture. Axes are +Z nose, +Y up,
   +X side; this file rewrites them to the shore's convention, +X nose.

   THE THREE THINGS THIS FILE HAS TO GET RIGHT

   1. UN-POSING. The OBJ is modelled STANDING: head carried high, back
      arched, tail sloping down to touch the ground. The sim's rest
      frame is a straight animal along +X whose centreline does all the
      bending, so the model's own pose has to come OUT before the rig
      can put a different one in. Leave it in and the otter swims with
      a permanent standing arch.

      It is un-bent properly rather than sheared: the centreline is
      measured off the surface, each vertex is expressed in the local
      frame at its nearest point on that curve, and re-emitted against
      a straight axis at the same arc length. A shear would keep the
      cross-sections tilted.

   2. WEIGHTS, NOT CUTS. The limbs are welded to the torso. Rather than
      slice them off and cap the sockets, every vertex is weighted —
      to the spine at its own `s`, or to one of eight limb bones —
      and the weights blend across each socket. Nothing is ever cut, so
      the surface stays closed and there is no seam anywhere on the
      animal. This is the whole reason the mesh is skinned rather than
      chopped into rigid links.

   3. THE PROFILE STILL HAS TO BE EXPORTED. otters.js hangs the whisker
      fan on the skin with `onSkin`, which asks `halfW(s)`/`halfH(s)`
      where the surface is. §43 learned that the hard way — a typed
      radius buried the whole face the moment the head changed shape —
      so the profile is measured HERE, off the real mesh, and shipped
      with it.
   ============================================================ */
'use strict';

var fs = require('fs');
var path = require('path');

var ROOT = path.join(__dirname, '..');
/* THE ANIMAL IS `AonyxOtter.obj` NOW, and it is generated rather than
   downloaded — `tools/make-otter-obj.js` writes it out of a PARAMS
   block. `Otter.obj`, the smooth-coated reference this file was
   originally written against, is still in the same folder and still
   bakes: `OTTER_OBJ=Otter.obj node tools/bake-otter.js` puts the old
   animal back, which is what every before/after render in this section
   was made with. Every gate honours the same variable. */
var OBJ = path.join(ROOT, 'reference', 'otter', process.env.OTTER_OBJ || 'AonyxOtter.obj');
var OUT = path.join(ROOT, 'js', 'ottermesh.js');

/* ---------- 1. read the OBJ ----------
   Coordinates are rewritten on the way in: the file is +Z nose / +Y up
   / +X side, and everything downstream wants +X nose / +Y up / +Z side.
   Quads are kept as quads until the triangulation step, because the
   quad grid is what makes the ring structure readable. */
function readObj(file) {
  var V = [], Q = [];
  var lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  for (var i = 0; i < lines.length; i++) {
    var l = lines[i];
    if (l.charCodeAt(0) === 118 && l[1] === ' ') {          // 'v '
      var p = l.split(/\s+/);
      V.push([+p[3], +p[2], +p[1]]);
    } else if (l.charCodeAt(0) === 102 && l[1] === ' ') {   // 'f '
      Q.push(l.trim().split(/\s+/).slice(1).map(function (t) {
        return +t.split('/')[0] - 1;
      }));
    }
  }
  return { V: V, Q: Q };
}

/* ---------- 2. split the shell from the eyes ----------
   Union-find over the faces. The big component is the animal; the two
   37-vertex components are its eyes, and having them loose is the one
   piece of luck in this file — they can be coloured black and weighted
   to the skull without any cutting. */
function components(V, Q) {
  var par = V.map(function (_, i) { return i; });
  function find(a) { while (par[a] !== a) { par[a] = par[par[a]]; a = par[a]; } return a; }
  for (var i = 0; i < Q.length; i++) {
    for (var j = 1; j < Q[i].length; j++) {
      var a = find(Q[i][0]), b = find(Q[i][j]);
      if (a !== b) par[b] = a;
    }
  }
  var bucket = {};
  for (var k = 0; k < V.length; k++) {
    var r = find(k);
    (bucket[r] = bucket[r] || []).push(k);
  }
  return Object.keys(bucket).map(function (k) { return bucket[k]; })
    .sort(function (a, b) { return b.length - a.length; });
}

/* ---------- 3. the limb mask ----------
   Only used to KEEP LIMBS OUT OF THE CENTRELINE MEASUREMENT — a leg
   hanging under the chest would drag the body's mid-height down. It is
   deliberately crude and deliberately not a cut: the real limb
   assignment is by distance to a bone, further down. */
function inLimb(v) {
  var fore = v[0] > 2.4 && v[0] < 7.4;
  var hind = v[0] > -6.0 && v[0] < -1.6;
  return (fore || hind) && v[1] < 2.6 && Math.abs(v[2]) > 0.8;
}

/* ---------- 4. exact cross-sections ----------
   The mesh is RING-BUILT — vertices cluster at a few dozen stations
   along its length — so slicing the vertex cloud into slabs gives a
   profile full of holes and false narrow points. The SURFACE has no
   such gaps, so every section here is a real plane-triangle
   intersection. This is the measurement §43's house rule is about. */
function section(V, T, x, skip) {
  /* `skip` is a Set of VERTEX INDICES, not a predicate on positions.
     It has to be, because the same set is used before and after the
     un-pose and `inLimb`'s windows only make sense in the OBJ's own
     frame. Indices survive the un-pose; coordinates do not. */
  var pts = [];
  for (var t = 0; t < T.length; t++) {
    var f = T[t];
    if (skip && (skip.has(f[0]) || skip.has(f[1]) || skip.has(f[2]))) continue;
    var p0 = V[f[0]], p1 = V[f[1]], p2 = V[f[2]];
    var p = [p0, p1, p2];
    for (var e = 0; e < 3; e++) {
      var a = p[e], b = p[(e + 1) % 3];
      var da = a[0] - x, db = b[0] - x;
      if ((da < 0 && db < 0) || (da > 0 && db > 0) || da === db) continue;
      var u = da / (da - db);
      pts.push([a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u]);
    }
  }
  return pts;
}

function sectionStats(pts) {
  if (pts.length < 6) return null;
  var ylo = Infinity, yhi = -Infinity, w = 0;
  for (var i = 0; i < pts.length; i++) {
    if (pts[i][0] < ylo) ylo = pts[i][0];
    if (pts[i][0] > yhi) yhi = pts[i][0];
    var az = Math.abs(pts[i][1]);
    if (az > w) w = az;
  }
  return { halfW: w, halfH: (yhi - ylo) / 2, midY: (yhi + ylo) / 2 };
}

/* The later stages are exported too — function declarations hoist, so
   naming them here is fine — because a probe that has to re-implement
   the un-bend to ask a question about it is a probe that answers a
   question about itself. */
module.exports = { readObj: readObj, components: components, section: section, tailSet: tailSet,
                   sectionStats: sectionStats, inLimb: inLimb, OBJ: OBJ, OUT: OUT,
                   centreline: centreline, unbend: unbend, buildProfile: buildProfile,
                   profAt: profAt, fitLimbs: fitLimbs, landmarks: landmarks };

/* ============================================================
   5. THE CENTRELINE, AND UN-POSING AGAINST IT

   Measured off the surface rather than off the vertex cloud, then
   smoothed. Vertices are projected onto the POLYLINE, not onto the
   nearest sample: snapping to samples lets two adjacent vertices land
   on different ones and tears a foot open along the seam between them.
   ============================================================ */
function centreline(V, T, skip) {
  var xlo = Infinity, xhi = -Infinity, i;
  for (i = 0; i < V.length; i++) {
    if (V[i][0] < xlo) xlo = V[i][0];
    if (V[i][0] > xhi) xhi = V[i][0];
  }
  var N = 160, step = (xhi - xlo) / N, raw = [];
  for (i = 0; i <= N; i++) {
    var x = Math.min(xhi - 1e-4, Math.max(xlo + 1e-4, xlo + i * step));
    var st = sectionStats(section(V, T, x, skip));
    if (st) raw.push({ x: x, y: st.midY });
  }
  var K = 5, sm = raw.map(function (g, j) {
    var s = 0, n = 0;
    for (var m = Math.max(0, j - K); m <= Math.min(raw.length - 1, j + K); m++) { s += raw[m].y; n++; }
    return { x: g.x, y: s / n };
  });
  var arc = [0];
  for (i = 1; i < sm.length; i++) {
    arc.push(arc[i - 1] + Math.hypot(sm[i].x - sm[i - 1].x, sm[i].y - sm[i - 1].y));
  }
  return { sm: sm, arc: arc };
}

function unbend(V, C) {
  var sm = C.sm, arc = C.arc;
  function tang(i) {
    var a = sm[Math.max(0, i - 1)], b = sm[Math.min(sm.length - 1, i + 1)];
    var dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1;
    return [dx / L, dy / L];
  }
  return V.map(function (v) {
    var best = null, bd = Infinity;
    for (var i = 0; i < sm.length - 1; i++) {
      var ax = sm[i].x, ay = sm[i].y, ex = sm[i + 1].x - ax, ey = sm[i + 1].y - ay;
      var L2 = ex * ex + ey * ey || 1;
      var u = ((v[0] - ax) * ex + (v[1] - ay) * ey) / L2;
      if (u < 0) u = 0; if (u > 1) u = 1;
      var px = ax + ex * u, py = ay + ey * u;
      var d = (v[0] - px) * (v[0] - px) + (v[1] - py) * (v[1] - py);
      if (d < bd) { bd = d; best = { i: i, px: px, py: py, s: arc[i] + u * Math.hypot(ex, ey) }; }
    }
    var t = tang(best.i), dx = v[0] - best.px, dy = v[1] - best.py;
    return [best.s + (dx * t[0] + dy * t[1]), -dx * t[1] + dy * t[0], v[2]];
  });
}

/* ============================================================
   6. LANDMARKS

   The sim's body unit is the TORSO — rump to shoulder — and its
   body-local x has 0 AT THE SHOULDER (otters.js: xAt(S_SHOULDER) is 0
   by construction). Getting this wrong is easy and expensive: measuring
   the torso hip-to-hip instead of rump-to-shoulder makes the animal
   look 30% longer than it is and sends you re-scaling `S` for no
   reason.

   Each landmark is read off the profile rather than picked by eye:

     shoulder   where the deep chest ends — the peak of halfH
     neck end   the base of the skull — where halfH has fallen to 70%
     rump       where the hip bulge stops and the tail's monotone
                taper begins
   ============================================================ */
function landmarks(prof) {
  /* WIDTH, NOT DEPTH, FINDS THESE. The obvious rule — "the shoulder is
     where the chest is deepest" — is wrong on this animal: `halfH` is
     nearly flat from the hips to the ribs (2.95 to 3.49 across the
     whole torso) and its true maximum is at the WAIST OF THE BACK, a
     third of the way down the body. Reading the shoulder off it puts
     the front of the animal in the middle of it, and since the torso
     is the body unit, every proportion downstream then comes out wrong
     by 40%.

     `halfW` has real features instead, and they are the anatomy:

       global max            the HIPS — this animal is widest across
                             its haunches, not amidships
       first local min
       forward of that       the NECK, the narrowest place between the
                             head and the body
       local max forward
       of the neck           the SKULL, the cheek and ear swell

     So the shoulder is the neck's own waist and the neck end is the
     back of the skull, both found rather than typed. */
  var i, n = prof.length;
  /* a little smoothing first, or a single noisy section invents a
     minimum that is not there */
  var w = [];
  for (i = 0; i < n; i++) {
    var s = 0, c = 0;
    for (var j = Math.max(0, i - 2); j <= Math.min(n - 1, i + 2); j++) { s += prof[j].halfW; c++; }
    w.push(s / c);
  }

  var iWide = 0, wMax = -Infinity;
  for (i = 0; i < n; i++) if (w[i] > wMax) { wMax = w[i]; iWide = i; }

  /* the rump: walk BACK from the hips until the bulge has given up a
     seventh of itself. Everything behind that is tail. */
  var iRump = iWide;
  for (i = iWide; i >= 0; i--) if (w[i] < wMax * 0.86) { iRump = i; break; }

  /* THE SKULL IS FOUND FROM THE NOSE, BACKWARDS, and the neck only
     then. Hunting forward from the hips for "the first local minimum"
     finds the ABDOMINAL waist between haunch and ribcage — a real
     feature, 2.45 wide, and not the one wanted. The neck is 1.70. The
     head end has no such ambiguity: width climbs from nothing at the
     nose to the cheek-and-ear swell and then drops into the neck, so
     the first crest walking back from the tip IS the skull. */
  var iSkull = n - 1;
  for (i = n - 3; i > iWide; i--) {
    if (w[i] < w[i + 1]) { iSkull = i + 1; break; }
  }
  /* and the neck is simply the narrowest place between that skull and
     the hips */
  var iNeckW = iSkull, nw = Infinity;
  for (i = iWide; i <= iSkull; i++) if (w[i] < nw) { nw = w[i]; iNeckW = i; }

  return { shoulder: prof[iNeckW].x, neckEnd: prof[iSkull].x,
           rump: prof[iRump].x, widest: prof[iWide].x, wMax: wMax };
}

/* ============================================================
   7. THE LIMBS — BONES FITTED, VERTICES WEIGHTED, NOTHING CUT

   Four limbs, three bones each: hip->knee, knee->ankle, ankle->toe.
   That is exactly the chain otters.js's IK already solves for, so the
   rig does not change shape — only the numbers it is solved against.

   The bones are FITTED, by walking each limb's own vertex cloud down
   in height bands and taking the mean of each band. The hind limb's
   hock shows up in that trace as a real V — back to the knee, forward
   again to the ankle — which is the shape §42 hand-signed with
   `rx = fore ? -1 : 1`, now measured instead of asserted.

   WEIGHTS BLEND ACROSS THE SOCKET rather than switching at it. A hard
   assignment tears the shoulder open the moment a leg swings; a
   smoothstep over the last third of the body's own depth lets the skin
   there follow both and stretch. This is the one thing a rigid-link
   cut cannot do at all.
   ============================================================ */
function fitLimbs(U, prof, profAt) {
  /* limb windows, in unbent x. Found by scanning for vertices that hang
     below the body's underside: two lobes, one per pair. */
  var lobes = [], i;
  var xhi = 0;
  for (i = 0; i < U.length; i++) if (U[i][0] > xhi) xhi = U[i][0];
  /* HOW FAR BELOW THE UNDERSIDE IS "BELOW THE UNDERSIDE".

     0.98 was too close to the surface to be safe, and the reason is
     structural rather than a matter of taste. `halfH` comes off
     `buildProfile`, which takes the 98th and 2nd percentiles of the
     section rather than its extremes — so the real underside always
     sits a little BELOW the half-height this is compared against, and
     the lowest off-centre vertex of a perfectly ordinary body ring
     lands within a percent or two of the line. Whether it crosses is
     then decided by the ring count and the section's exponent, which
     is to say by nothing.

     It did not bite on `Otter.obj`; it bit immediately on the
     generated one, where two vertices on the rump at ratio -0.991
     joined the hind lobe, dragged its window 1.7 units aft, and fitted
     a hind hip at x = -1.068 body units — behind the animal.

     1.06 has margin on both sides: the strays measure -0.99, and the
     shallowest vertex that is really on a limb measures -1.28. */
  var UNDER = 1.06;
  var below = [];
  for (i = 0; i < U.length; i++) {
    var hh = profAt(prof, U[i][0], 'halfH');
    if (U[i][1] < -hh * UNDER && Math.abs(U[i][2]) > 0.6) below.push(U[i][0]);
  }
  below.sort(function (a, b) { return a - b; });
  /* split the sorted x's wherever there is a gap wider than 2 units */
  var run = [below[0]];
  for (i = 1; i < below.length; i++) {
    if (below[i] - below[i - 1] > 2.0) { lobes.push(run); run = []; }
    run.push(below[i]);
  }
  lobes.push(run);
  lobes = lobes.filter(function (r) { return r.length > 20; })
               .sort(function (a, b) { return b.length - a.length; }).slice(0, 2)
               .sort(function (a, b) { return a[0] - b[0]; });      // hind first (lower x)
  var win = lobes.map(function (r) { return [r[0] - 0.8, r[r.length - 1] + 0.8]; });
  /* THE WINDOWS ARE THE THING THAT GOES WRONG. Everything below fits
     inside them, so a window that has swallowed the tail or half the
     belly produces a limb chain that is wrong in a way that looks like
     a skinning bug. Printed in unbent units, before the body unit
     exists to state them in. */
  console.log('\nlimb lobes (unbent units): ' + lobes.map(function (r, i) {
    return '[' + r[0].toFixed(2) + '..' + r[r.length - 1].toFixed(2) + '] n=' + r.length;
  }).join('  ') + '   of ' + below.length + ' vertices under the underside');

  var limbs = [];
  /* otters.js limb order is [fore-R, fore-L, hind-R, hind-L] */
  var order = [[1, 1], [1, -1], [0, 1], [0, -1]];   // [window index, side]
  for (var L = 0; L < 4; L++) {
    var w = win[order[L][0]], side = order[L][1];
    var cloud = [];
    for (i = 0; i < U.length; i++) {
      var v = U[i];
      if (v[0] < w[0] || v[0] > w[1]) continue;
      if (v[2] * side < 0.4) continue;
      if (v[1] > -profAt(prof, v[0], 'halfH') * 0.75) continue;
      cloud.push(v);
    }
    var ylo = Infinity, yhi = -Infinity;
    for (i = 0; i < cloud.length; i++) {
      if (cloud[i][1] < ylo) ylo = cloud[i][1];
      if (cloud[i][1] > yhi) yhi = cloud[i][1];
    }
    /* trace: mean (x,z) per height band, top to bottom */
    var NB = 10, trace = [];
    for (var b = 0; b < NB; b++) {
      var a0 = yhi - (yhi - ylo) * (b + 1) / NB, a1 = yhi - (yhi - ylo) * b / NB;
      var sel = cloud.filter(function (v) { return v[1] > a0 && v[1] <= a1; });
      if (sel.length < 2) { trace.push(null); continue; }
      var mx = 0, mz = 0, my = 0;
      for (i = 0; i < sel.length; i++) { mx += sel[i][0]; mz += Math.abs(sel[i][2]); my += sel[i][1]; }
      trace.push([mx / sel.length, my / sel.length, side * mz / sel.length]);
    }
    trace = trace.filter(Boolean);
    /* four joints out of the trace: top, the band where the x-slope
       reverses (the hock / the elbow), the flat where the foot starts,
       and the toe — the furthest-forward vertex at the very bottom */
    var hip = trace[0], toeBand = cloud.filter(function (v) { return v[1] < ylo + (yhi - ylo) * 0.18; });
    var toeX = -Infinity, toeZ = 0, toeY = 0;
    for (i = 0; i < toeBand.length; i++) {
      if (toeBand[i][0] > toeX) { toeX = toeBand[i][0]; toeY = toeBand[i][1]; toeZ = toeBand[i][2]; }
    }
    var iK = 1, bend = -Infinity;
    for (i = 1; i < trace.length - 1; i++) {
      var d = Math.abs((trace[i + 1][0] - trace[i][0]) - (trace[i][0] - trace[i - 1][0]));
      if (d > bend) { bend = d; iK = i; }
    }
    var knee = trace[iK];
    var iA = Math.min(trace.length - 1, Math.max(iK + 1, Math.round(trace.length * 0.80)));
    var ankle = trace[iA];
    limbs.push({ hip: hip, knee: knee, ankle: ankle, toe: [toeX, toeY, toeZ],
                 win: w, side: side, n: cloud.length, ylo: ylo, yhi: yhi });
  }
  return limbs;
}

/* ============================================================
   8. PROFILE, WEIGHTS, COLOUR, AND THE FILE ITSELF
   ============================================================ */
/* ============================================================
   WHERE THE TAIL LEAVES THE BODY.

   `unbend` straightens the animal onto its own fitted centreline, and
   that is right for everything except the tail, because on this model
   the tail is not a continuation of the spine — it DROOPS. Standing,
   Otter.obj's tail hangs almost to the ground behind the hind feet;
   unbending lifts it onto the axis, and what comes out is a single
   smooth cone running from mid-torso to the tip with no rump in it at
   all. Measured: the fitted half-height falls 0.288 -> 0.016 in an
   almost straight line over that whole length.

   That is why the tail read as sprouting from the BACK. There is
   nothing behind the hips for it to leave from, so the eye takes the
   topline running out to the tip as the back — and the only thing left
   marking the rear is the hind legs hanging underneath, which is the
   same mass that read as a big belly.

   Two edits put it back, both to the REST SHAPE so every state gets
   them and no pose has to know:

   SET THE TAIL LOW. The tail is lowered by TAIL_DROP, ramped in across
   the root band, so the back curves down into it instead of running
   straight out. A translation, not a rotation — the tail stays
   straight and it is the JUNCTION that moves, which is what was wrong.

   CARRY THE RUMP AFT. The cross-section through the root band is
   widened, most in the middle of it, so the body holds its girth
   behind the hips and the tail leaves a thick base rather than a
   point.

   Both are facts about the animal, so they live here and not in ATT.
   `att[2]`'s droop still rides on top, as it did.

   SCALE-FREE ON PURPOSE. This runs before the limb fit, so the body
   unit does not exist yet; TAIL_DROP is a fraction of the animal's own
   nose-to-tip length, which does. `unbend` leaves the centreline on
   y = 0, so the girth scales about the centreline by construction.

   RETUNED FOR THE GENERATED ANIMAL, and one of the two knobs is now
   zero. These numbers were corrections for `Otter.obj`, whose tail
   dragged on the floor and whose rump the un-bend flattened into a
   cone; `AonyxOtter.obj` is modelled with a level tail and a rump whose
   girth is typed straight into the BODY table, so there is nothing left
   for RUMP_HOLD to put back and adding 40% girth on top of a rump that
   already has it just makes a hump. TAIL_DROP survives, smaller,
   because it is the one thing the generator CANNOT do: model the tail
   low and `centreline` measures the droop as part of the spine, and
   `unbend` takes straight back out again what was just put in. A set
   that has to survive the un-bend has to be applied after it.

   For the old mesh the values were 0.050 and 0.40; `OTTER_OBJ=Otter.obj`
   bakes it with these, which is wrong for it, and that is the honest
   trade — one animal is being kept bakeable, not kept tuned. */
var TAIL_ROOT = 0.26;      // s at and below which the tail is wholly tail
var RUMP_END  = 0.46;      // s at and above which the rump is untouched
var TAIL_DROP = 0.022;     // of nose-to-tip length (~0.06 body units)
var RUMP_HOLD = 0.00;      // the BODY table carries the rump now

/* LIMBS ARE NOT PART OF THIS. The root band runs from s 0.28 to 0.44
   and the hind hip sits at 0.41, so the band unavoidably overlaps the
   legs; scaling a leg vertex about the body centreline lengthens the
   leg and drops the foot, and the first attempt did exactly that - the
   hind quarters came out as one collapsed lump. The tail is a fact
   about the TORSO. */
function tailSet(U, skip) {
  var xTip = Infinity, xNose = -Infinity, i;
  for (i = 0; i < U.length; i++) {
    if (U[i][0] < xTip) xTip = U[i][0];
    if (U[i][0] > xNose) xNose = U[i][0];
  }
  var span = xNose - xTip, drop = TAIL_DROP * span;
  for (i = 0; i < U.length; i++) {
    if (skip && skip.has(i)) continue;
    var t = (RUMP_END - (U[i][0] - xTip) / span) / (RUMP_END - TAIL_ROOT);
    if (t <= 0) continue;
    if (t > 1) t = 1;
    /* girth first, about the centreline; then the set, which moves it */
    var sn = Math.sin(Math.PI * t), g = 1 + RUMP_HOLD * sn * sn;
    U[i][1] *= g;
    U[i][2] *= g;
    U[i][1] -= drop * (t * t * (3 - 2 * t));
  }
  return U;
}

function buildProfile(U, T, skip) {
  var xlo = Infinity, xhi = -Infinity, i;
  for (i = 0; i < U.length; i++) {
    if (U[i][0] < xlo) xlo = U[i][0];
    if (U[i][0] > xhi) xhi = U[i][0];
  }
  var N = 128, prof = [];
  for (i = 0; i <= N; i++) {
    var x = Math.min(xhi - 1e-4, Math.max(xlo + 1e-4, xlo + (xhi - xlo) * i / N));
    var pts = section(U, T, x, skip);
    if (!pts.length) continue;
    var ys = pts.map(function (p) { return p[0]; }).sort(function (a, b) { return a - b; });
    var zs = pts.map(function (p) { return Math.abs(p[1]); }).sort(function (a, b) { return a - b; });
    /* the 96th percentile, not the max: a toe poking sideways is not
       the body's half-width */
    var q = function (a, p) { return a[Math.min(a.length - 1, Math.floor(p * a.length))]; };
    prof.push({ x: x, halfW: q(zs, 0.96), halfH: (q(ys, 0.98) - q(ys, 0.02)) / 2,
                top: q(ys, 0.98), bot: q(ys, 0.02) });
  }
  return prof;
}

function profAt(prof, x, key) {
  if (x <= prof[0].x) return prof[0][key];
  if (x >= prof[prof.length - 1].x) return prof[prof.length - 1][key];
  for (var i = 1; i < prof.length; i++) {
    if (prof[i].x >= x) {
      var a = prof[i - 1], b = prof[i], u = (x - a.x) / (b.x - a.x || 1);
      return a[key] + (b[key] - a[key]) * u;
    }
  }
  return prof[prof.length - 1][key];
}

/* the same hash and the same pick otterbody.js uses, so a baked facet
   and a swept one draw from the palette the same way */
function hash(a, b, seed) {
  var n = Math.sin(a * 127.1 + b * 311.7 + seed * 74.7) * 43758.5453;
  return n - Math.floor(n);
}
function pick(arr, i) { return arr[Math.floor(hash(i, 7, 3) * arr.length) % arr.length]; }

/* §43's palette, sampled off the GLB's texture through its UVs. The OBJ
   ships no `.mtl` and no texture at all, so this is the only source of
   colour on the animal and it is carried over unchanged. */
var COAT   = [0x5e3d2a, 0x66452f, 0x563628, 0x6b4a33];
var GUARD  = [0x462c1e, 0x3d2619];
var BELLY  = [0x6a4832, 0x714f38];
var THROAT = [0xb0a196, 0xbcada1, 0xa89a8f];
var NOSE   = [0x241a14, 0x1d1510];
var EYEC   = [0x0d0a08, 0x000000];
var WEB    = [0x33221a, 0x2b1c15];

function faceColour(s, u, isLimb, limbT, isEye, i) {
  if (isEye) return pick(EYEC, i);
  if (isLimb) {
    /* the paw is near-black and the boundary sits partway up the limb,
       not at the ankle — §43's reading of the reference's own paws */
    if (limbT > 0.55) return pick(WEB, i);
    return hash(i, 23, 13) > 0.78 ? pick(GUARD, i) : pick(COAT, i);
  }
  /* BOTH OF THESE ARE FRACTIONS OF THE WHOLE ANIMAL, so both moved
     when the animal did. 0.972 was the last 2.8% of a 2.83-body-unit
     smooth-coated otter — a nose pad on a long muzzle; on the generated
     one's short blunt muzzle the same fraction painted the entire front
     of the face black. And the bib at u < 0.30 climbed the side of the
     jaw rather than sitting under it. */
  if (s > 0.984) return pick(NOSE, i);
  if (s > 0.79 && u < 0.26) return pick(THROAT, i);
  if (u < 0.17) return pick(BELLY, i);
  return hash(i, 11, 3) > 0.78 ? pick(GUARD, i) : pick(COAT, i);
}

/* a bone's rest frame, built exactly the way otters.js's `put` builds
   it at runtime — same axis, same fallback — so a vertex baked in it
   lands back where it started. */
function boneFrame(a, b) {
  var ex = b[0] - a[0], ey = b[1] - a[1], ez = b[2] - a[2];
  var L = Math.hypot(ex, ey, ez) || 1;
  var xa = [ex / L, ey / L, ez / L];
  /* THE REFERENCE AXIS IS THE ONE THE BONE POINTS AT LEAST, and it is
     chosen from the bone's REST direction so the runtime can choose the
     same one without being told. The obvious rule — 'use world up
     unless the bone is nearly vertical' — has a threshold in it, and a
     leg that swings across that threshold flips its frame and twists a
     quarter turn in one frame. Least-aligned has no threshold to
     cross: a bone would have to rotate 90 degrees from rest to make
     this reference degenerate, and none of them do. */
  var ax = Math.abs(xa[0]), ay = Math.abs(xa[1]), az = Math.abs(xa[2]);
  var tmp = (ax <= ay && ax <= az) ? [1, 0, 0] : (ay <= az ? [0, 1, 0] : [0, 0, 1]);
  var za = [xa[1] * tmp[2] - xa[2] * tmp[1], xa[2] * tmp[0] - xa[0] * tmp[2], xa[0] * tmp[1] - xa[1] * tmp[0]];
  var zl = Math.hypot(za[0], za[1], za[2]) || 1;
  za = [za[0] / zl, za[1] / zl, za[2] / zl];
  var ya = [za[1] * xa[2] - za[2] * xa[1], za[2] * xa[0] - za[0] * xa[2], za[0] * xa[1] - za[1] * xa[0]];
  return { o: a, xa: xa, ya: ya, za: za, len: L };
}
function intoFrame(f, v) {
  var dx = v[0] - f.o[0], dy = v[1] - f.o[1], dz = v[2] - f.o[2];
  return [dx * f.xa[0] + dy * f.xa[1] + dz * f.xa[2],
          dx * f.ya[0] + dy * f.ya[1] + dz * f.ya[2],
          dx * f.za[0] + dy * f.za[1] + dz * f.za[2]];
}

/* ============================================================
   9. MAIN
   ============================================================ */
function main() {
  var src = readObj(OBJ);
  var V = src.V, Q = src.Q;
  var comps = components(V, Q);
  var shell = new Set(comps[0]);
  var eyeSets = [new Set(comps[1] || []), new Set(comps[2] || [])];
  var isEye = function (i) { return eyeSets[0].has(i) || eyeSets[1].has(i); };

  /* ---- triangulate, REVERSING THE WINDING ----
     `readObj` rewrites (x, y, z) as (z, y, x) to get the shore's +X-nose
     frame. Swapping two axes is a REFLECTION, not a rotation — its
     matrix has determinant -1 — so every triangle that comes through it
     is wound the other way round. Fanning the quads in source order
     then emits an animal whose faces all point INTO it.

     `MeshLambertMaterial` defaults to `THREE.FrontSide`, so the near
     surface of every otter was being culled and what you saw through it
     was the inside of the far surface: the pale belly, viewed from
     above. That is the whole of "the otters look like they are swimming
     on their back" — §46 spent a section measuring the roll (0.998
     dorsal-up, so not a roll) and then blamed the water tint. It was
     neither. Baked signed volume measured -0.196 on the generated
     animal and -0.282 on `Otter.obj`, which has had it since §44.

     Reversing the fan compensates the reflection exactly and moves no
     vertex. Nothing upstream cares: `section`, `centreline` and
     `buildProfile` all use these triangles for plane intersections,
     which are orientation-blind. */
  var T = [], i, j;
  for (i = 0; i < Q.length; i++) for (j = 2; j < Q[i].length; j++) T.push([Q[i][0], Q[i][j], Q[i][j - 1]]);
  var Tshell = T.filter(function (f) { return shell.has(f[0]); });
  console.log('read  ' + V.length + ' verts, ' + Q.length + ' quads -> ' + T.length + ' tris');
  console.log('      shell ' + comps[0].length + ', eyes ' + (comps[1] || []).length + '+' + (comps[2] || []).length);

  /* ---- un-pose ---- */
  /* the crude OBJ-space limb guess, as VERTEX INDICES so it survives
     the un-pose and can keep four legs out of both measurements */
  var skip = new Set();
  for (i = 0; i < V.length; i++) if (inLimb(V[i])) skip.add(i);
  var C = centreline(V, Tshell, skip);
  var U = unbend(V, C);
  console.log('unbent: arc length ' + C.arc[C.arc.length - 1].toFixed(2) +
              ' against a straight span of ' + (C.sm[C.sm.length - 1].x - C.sm[0].x).toFixed(2));

  /* ---- profile and landmarks, in unbent space ---- */
  var prof = buildProfile(U, T, skip);
  var LM = landmarks(prof);
  var xNose = -Infinity, xTip = Infinity;
  for (i = 0; i < U.length; i++) {
    if (U[i][0] > xNose) xNose = U[i][0];
    if (U[i][0] < xTip) xTip = U[i][0];
  }
  /* ---- limbs, fitted BEFORE the scale, because they set it ---- */
  var limbs = fitLimbs(U, prof, profAt);

  /* THE BODY UNIT IS THE TORSO, AND THE TORSO IS TWO JOINTS.

     `landmarks` finds a rump and a skull reliably. It does not find a
     usable SHOULDER on this mesh, and the reason is worth keeping: the
     neck's waist is obvious in the OBJ's own frame only because a
     world-vertical plane cuts a steeply-raised neck obliquely. Section
     the animal perpendicular to its OWN axis, which is what the
     un-posed profile does, and the waist almost disappears — 1.63
     against 2.01 a third of the way back, a dip of a fifth where the
     old reference had a third. A landmark that shallow moves several
     per cent under any change of smoothing, and it was setting the
     scale of the entire animal.

     So the torso is measured between the two things that ARE sharp:
     the RUMP, where the hip bulge gives way to the tail's monotone
     taper, and the SHOULDER JOINT itself, fitted from the forelimb's
     own vertex cloud. That is also what "torso" means anatomically,
     rather than a width feature that happens to sit near it. */
  var SHOULDER = (limbs[0].hip[0] + limbs[1].hip[0]) / 2;
  var TORSO = SHOULDER - LM.rump;
  var K = 1 / TORSO;                                  // unbent units -> body units
  console.log('\nlandmarks (unbent units):');
  console.log('  tail tip  ' + xTip.toFixed(2) + '   rump ' + LM.rump.toFixed(2) +
              '   shoulder joint ' + SHOULDER.toFixed(2) + '   skull ' + LM.neckEnd.toFixed(2) +
              '   nose ' + xNose.toFixed(2));
  console.log('  TORSO = ' + TORSO.toFixed(2) + '  widest ' + LM.widest.toFixed(2) + ' at halfW ' + LM.wMax.toFixed(2));
  var say = function (n, v, was) {
    var pad = n; while (pad.length < 10) pad += ' ';
    console.log('   ' + pad + (v * K).toFixed(4).padStart(8) + '     (was ' + was + ')');
  };
  console.log('\nin BODY UNITS (torso = 1, x = 0 at the shoulder joint):');
  say('TAIL_L', LM.rump - xTip, '1.02');
  say('TORSO_L', TORSO, '1.00');
  say('HEAD_L', xNose - LM.neckEnd, '0.28');
  say('TOTAL_L', xNose - xTip, '2.50');
  say('BODY_R', LM.wMax, '0.238');
  say('X_TIP', xTip - SHOULDER, '-2.02');
  say('X_NOSE', xNose - SHOULDER, '0.46');
  /* the animal must come out the size it already was, or every metre
     that has been tuned against it — HAUL_R, TAKE_R, the romp's own
     spacing — quietly means something else */
  console.log('\n   S should become ' + (0.70 * 2.50 / ((xNose - xTip) * K)).toFixed(4) +
              '  (from 0.70) to hold nose-to-tail at ' + (2.50 * 0.70).toFixed(2) + ' m');

  var LAB = ['fore-R', 'fore-L', 'hind-R', 'hind-L'];
  console.log('\nlimb bones (body units, x relative to the shoulder joint):');
  for (i = 0; i < 4; i++) {
    var L = limbs[i];
    var f = function (p) {
      return '(' + ((p[0] - SHOULDER) * K).toFixed(3) + ',' + (p[1] * K).toFixed(3) + ',' + (p[2] * K).toFixed(3) + ')';
    };
    var d = function (a, b) { return (Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) * K).toFixed(3); };
    var lab = LAB[i]; while (lab.length < 7) lab += ' ';
    console.log('  ' + lab + ' n=' + String(L.n) +
                '  hip' + f(L.hip) + ' knee' + f(L.knee) + ' ankle' + f(L.ankle) + ' toe' + f(L.toe));
    console.log('          upper ' + d(L.hip, L.knee) + '  lower ' + d(L.knee, L.ankle) + '  foot ' + d(L.ankle, L.toe) +
                '   window ' + ((L.win[0] - SHOULDER) * K).toFixed(3) + '..' + ((L.win[1] - SHOULDER) * K).toFixed(3) +
                '  cloud y ' + (L.ylo * K).toFixed(3) + '..' + (L.yhi * K).toFixed(3));
  }

  /* THE TAIL'S OWN SET, PUT BACK — see tailSet.

     AFTER the centreline, the profile and the limb fit, and that
     ordering is the whole of it. Run before them, the fit sees a body
     that has already moved: the fitted joints slide with it, the
     weights follow the joints, and 66 more vertices end up owned by a
     limb. The hind quarters came out as one collapsed lump and the
     tail as a flat blade. A shape edit belongs after everything that
     MEASURES the shape, or it stops being a shape edit. */
  tailSet(U, skip);

  /* ---- per-vertex rig data ---- */
  /* ============================================================
     WHO OWNS THIS VERTEX — AND, MORE TO THE POINT, HOW SMOOTHLY
     OWNERSHIP CHANGES BETWEEN NEIGHBOURS.

     What this used to do, and why it tore. Every vertex was given a
     limb weight and a pair of bones, and each of those three decisions
     was a TEST with a side to be on:

         if (v[2] * side < 0.2) continue;        <- a plane through the
                                                    body: a vertex just
                                                    inside it followed a
                                                    leg, its neighbour
                                                    just outside did not
         if (v[0] < win[0] - 1.0) continue;      <- the same, along x
         bmix = min(1, d2/(d1+d2) * 1.6)         <- a vertex nearer bone
                                                    A was ENTIRELY A

     A test like that puts adjacent vertices under completely different
     rigid motions. Measured on the emitted mesh, 262 edges — 8.7% —
     joined two vertices whose influences differed by more than half.
     Those are exactly the edges that stretched: 143 of them past twice
     their rest length while swimming, the worst at 8x, and the median
     edge at 1.003 the whole time. The skin was never wrong. The
     BOUNDARY was, and it was a hard boundary in three separate places.

     Dual-quaternion blending does not fix this and cannot: it makes a
     vertex ride the arc instead of cutting across it, but two adjacent
     vertices told to follow different bones still go different ways.
     What is needed is for the weights themselves to be continuous.

     So: every test becomes a ramp, every bone gets a share rather than
     a place in a ranking, and then the whole field is diffused over the
     mesh graph until nothing changes fast. A vertex keeps a list of
     influences that sums to one — the spine, plus up to four bones —
     and its neighbour's list is nearly the same list.

     THE CORE IS PINNED. Smoothing left to itself walks weight off the
     paw and onto the spine, and a paw that half-follows the body sinks
     through the sand — which is the one thing check-gait.js is there to
     catch. A vertex INSIDE a leg's own girth is held at full limb
     weight through every pass; only the socket band is free to move.
     ============================================================ */
  var NBS = 6;                                  // bone slots kept per vertex
  var frames = limbs.map(function (L) {
    return [boneFrame(L.hip, L.knee), boneFrame(L.knee, L.ankle), boneFrame(L.ankle, L.toe)];
  });
  var span = xNose - xTip;

  function sstep(t) { return t <= 0 ? 0 : (t >= 1 ? 1 : t * t * (3 - 2 * t)); }

  var RIN = 0.85, ROUT = 3.4;        // unbent units: leg girth, and the belly
  var SIDE_IN = 0.20, SIDE_OUT = -0.80;   // the old hard side cut, given a ramp
  var WIN_PAD = 1.0, WIN_SOFT = 1.2;      // and the old hard x window
  /* How wide each hand-over is. All three were chosen by measurement,
     not taste: bake, then tools/check-stretch.js in every state.
       SHARE_P        high is nearly a ranking and tears at a joint;
                      low turns the leg to mush and a thigh vertex
                      ends up half-following the paw, which shows up
                      as a planted foot that scrubs. 12 puts the scrub
                      back where it was before any of this (0.076 cm a
                      frame) for 0.24% more stretched edges at swim.
       SOCKET_PASSES  how far the socket band is spread into the body.
                      8 is the floor of the curve; 16 starts costing
                      more at the knee than it wins at the hip.
       SPLIT_PASSES   the split starts continuous, so it needs almost
                      none - 2 only takes the gradient off the fold at
                      the elbow. */
  var SHARE_P = 12, SHARE_EPS = 0.05;
  var SOCKET_PASSES = 8;
  var SPLIT_PASSES = 2;

  /* The raw field, in two halves that are smoothed differently.

     TL[i][l]  how much of vertex i belongs to limb l at all - the
               SOCKET. This is the half that used to be a test, and the
               half that has to be diffused.
     SH[i][l*3+k]  given that it belongs to limb l, which of the limb's
               three bones - the SPLIT. This one is already continuous:
               it comes from a distance kernel with no side to be on. */
  function rawInfluence(v, TL, SH, off) {
    var tot = 0;
    for (var l = 0; l < 4; l++) {
      var L2 = limbs[l];
      var gz = sstep((v[2] * L2.side - SIDE_OUT) / (SIDE_IN - SIDE_OUT));
      if (gz <= 0) continue;
      var gx = sstep((v[0] - (L2.win[0] - WIN_PAD - WIN_SOFT)) / WIN_SOFT) *
               sstep(((L2.win[1] + WIN_PAD + WIN_SOFT) - v[0]) / WIN_SOFT);
      if (gx <= 0) continue;
      /* THE SOCKET IS A DISTANCE, NOT A HEIGHT. A hip socket wraps
         AROUND the leg, so a vertical cut left skin on the flank beside
         a shoulder at weight zero while skin an inch below it sat at
         one. Distance to the limb's own bone chain is isotropic: a
         socket blends in every direction at once. */
      var d = [0, 0, 0], dch = Infinity;
      for (var kb = 0; kb < 3; kb++) {
        var fq = frames[l][kb], lq = intoFrame(fq, v);
        var al = Math.max(0, Math.min(fq.len, lq[0]));
        d[kb] = Math.sqrt((lq[0] - al) * (lq[0] - al) + lq[1] * lq[1] + lq[2] * lq[2]);
        if (d[kb] < dch) dch = d[kb];
      }
      var t = sstep(1 - (dch - RIN) / (ROUT - RIN)) * gz * gx;
      if (t <= 0) continue;
      /* WHICH BONE, by distance to each bone in turn - not to the
         nearest one. A ranking has a side to be on; a share does not.

         Arc length along the chain was tried and is wrong on this
         animal: the forelimb DOUBLES BACK at the elbow - 0.16 of
         scapula going backwards over 0.29 of forearm coming forward -
         so two vertices either side of the fold project to arc
         positions a long way apart and the split tore exactly where it
         was supposed to blend.

         The width of the hand-over is set by SHARE_P: high is nearly a
         ranking, low turns the leg to mush by letting a thigh vertex
         listen to the paw. */
      var sh = [0, 0, 0], ssum = 0;
      for (kb = 0; kb < 3; kb++) { sh[kb] = 1 / Math.pow(d[kb] + SHARE_EPS, SHARE_P); ssum += sh[kb]; }
      for (kb = 0; kb < 3; kb++) SH[off * 12 + l * 3 + kb] = sh[kb] / ssum;
      TL[off * 4 + l] = t;
      tot += t;
    }
    if (tot > 1) for (var k = 0; k < 4; k++) TL[off * 4 + k] /= tot;
  }


  var TL = new Float64Array(U.length * 4), SH = new Float64Array(U.length * 12);
  var s = [], oy = [], oz = [];
  for (i = 0; i < U.length; i++) {
    var v = U[i];
    s.push((v[0] - xTip) / span);
    oy.push(v[1] * K);
    oz.push(v[2] * K);
    rawInfluence(v, TL, SH, i);
  }

  /* ---- diffuse the SOCKET over the mesh graph ---- */
  var ADJ = [];
  for (i = 0; i < U.length; i++) ADJ.push([]);
  (function () {
    var seen = new Set();
    for (var t2 = 0; t2 < T.length; t2++) {
      var f3 = T[t2];
      for (var e2 = 0; e2 < 3; e2++) {
        var p = f3[e2], q = f3[(e2 + 1) % 3];
        if (p === q) continue;
        var kk = p < q ? p + '_' + q : q + '_' + p;
        if (seen.has(kk)) continue;
        seen.add(kk);
        ADJ[p].push(q); ADJ[q].push(p);
      }
    }
  })();
  /* THE CORE IS PINNED. A vertex inside a leg's own girth already
     belongs entirely to that leg; letting diffusion bleed spine weight
     into it walks the paw off the ankle, and a paw that half-follows
     the body sinks through the sand - which is the one thing
     check-gait.js exists to catch. Only the socket band is free. */
  var core = new Uint8Array(U.length);
  for (i = 0; i < U.length; i++) {
    var tt = TL[i * 4] + TL[i * 4 + 1] + TL[i * 4 + 2] + TL[i * 4 + 3];
    core[i] = tt > 0.999 ? 1 : 0;
  }
  var LAM = 0.5, PASSES = SOCKET_PASSES;
  for (var it = 0; it < PASSES; it++) {
    var nxt = new Float64Array(TL.length);
    for (i = 0; i < U.length; i++) {
      var nb = ADJ[i], i4 = i * 4;
      if (!nb.length) { for (var k = 0; k < 4; k++) nxt[i4 + k] = TL[i4 + k]; continue; }
      var tot = 0;
      for (k = 0; k < 4; k++) {
        var m = 0;
        for (var j2 = 0; j2 < nb.length; j2++) m += TL[nb[j2] * 4 + k];
        var val = TL[i4 + k] + LAM * (m / nb.length - TL[i4 + k]);
        nxt[i4 + k] = val; tot += val;
      }
      /* a vertex can never be more than wholly claimed, and a core
         vertex is never less */
      if (tot > 1 || (core[i] && tot > 0)) for (k = 0; k < 4; k++) nxt[i4 + k] /= tot;
    }
    TL = nxt;
  }

  /* ---- and the SPLIT, less: it starts continuous, it only needs the
     gradient taken off it where two bones hand over ---- */
  for (it = 0; it < SPLIT_PASSES; it++) {
    var nxt2 = new Float64Array(SH.length);
    for (i = 0; i < U.length; i++) {
      var nb2 = ADJ[i], i12 = i * 12;
      if (!nb2.length) { for (k = 0; k < 12; k++) nxt2[i12 + k] = SH[i12 + k]; continue; }
      for (var l2 = 0; l2 < 4; l2++) {
        var row = 0;
        for (k = 0; k < 3; k++) {
          var mm = 0;
          for (var j3 = 0; j3 < nb2.length; j3++) mm += SH[nb2[j3] * 12 + l2 * 3 + k];
          var vv = SH[i12 + l2 * 3 + k] + LAM * (mm / nb2.length - SH[i12 + l2 * 3 + k]);
          nxt2[i12 + l2 * 3 + k] = vv; row += vv;
        }
        if (row > 0) for (k = 0; k < 3; k++) nxt2[i12 + l2 * 3 + k] /= row;
      }
    }
    SH = nxt2;
  }

  /* how sharply does a vertex deep inside a leg still belong to ONE
     bone? Mush here is a leg that bends like a rope. */
  var sharp = 0, sharpN = 0;
  for (i = 0; i < U.length; i++) {
    if (!core[i]) continue;
    var bl = -1, bv = -1;
    for (k = 0; k < 4; k++) if (TL[i * 4 + k] > bv) { bv = TL[i * 4 + k]; bl = k; }
    var mx = 0;
    for (k = 0; k < 3; k++) mx = Math.max(mx, SH[i * 12 + bl * 3 + k]);
    sharp += mx; sharpN++;
  }

  /* ---- put the two halves back together ---- */
  var INF = [];
  for (i = 0; i < U.length; i++) {
    var g = new Float64Array(13), tot2 = 0;
    for (k = 0; k < 4; k++) {
      var tl = TL[i * 4 + k];
      if (tl <= 0) continue;
      tot2 += tl;
      for (var kb2 = 0; kb2 < 3; kb2++) g[1 + k * 3 + kb2] = tl * SH[i * 12 + k * 3 + kb2];
    }
    g[0] = Math.max(0, 1 - tot2);
    INF.push(g);
  }

  /* ---- compress: the spine, plus the four strongest bones ---- */
  var wt = [], lb = [], bi = [], bidx = [], bwt = [];
  var droppedMax = 0, slotsMax = 0;
  for (i = 0; i < U.length; i++) {
    var g = INF[i], ord = [];
    for (k = 1; k < 13; k++) if (g[k] > 1e-4) ord.push(k - 1);
    ord.sort(function (p, q) { return g[q + 1] - g[p + 1]; });
    if (ord.length > slotsMax) slotsMax = ord.length;
    var drop = 0;
    for (k = NBS; k < ord.length; k++) drop += g[ord[k] + 1];
    if (drop > droppedMax) droppedMax = drop;
    ord = ord.slice(0, NBS);
    var sum = 0;
    for (k = 0; k < NBS; k++) {
      var have = k < ord.length;
      bidx.push(have ? ord[k] : -1);
      bwt.push(have ? g[ord[k] + 1] : 0);
      if (have) sum += g[ord[k] + 1];
    }
    /* whatever fell off the end goes back to the SPINE, not to the
       bones that stayed: it was weight the vertex was only faintly
       given, and handing it to a survivor would move the vertex. */
    wt.push(sum);
    lb.push(ord.length ? (ord[0] / 3) | 0 : -1);
    bi.push(ord.length ? ord[0] % 3 : 0);
  }

  /* ---- how smooth did it come out? this is the number that predicts
     the stretch, so it is printed every bake ---- */
  var seam = [], seamBad = 0;
  (function () {
    var seen = new Set();
    for (var t2 = 0; t2 < T.length; t2++) {
      var f3 = T[t2];
      for (var e2 = 0; e2 < 3; e2++) {
        var p = f3[e2], q = f3[(e2 + 1) % 3];
        if (p === q) continue;
        var kk = p < q ? p + '_' + q : q + '_' + p;
        if (seen.has(kk)) continue;
        seen.add(kk);
        var dd = 0;
        for (var k2 = 0; k2 < 13; k2++) dd += Math.abs(INF[p][k2] - INF[q][k2]);
        dd /= 2;
        seam.push(dd);
        if (dd > 0.5) seamBad++;
      }
    }
  })();
  seam.sort(function (a, b) { return a - b; });
  var nLimbVerts = 0, nFull = 0;
  for (i = 0; i < wt.length; i++) { if (wt[i] > 0.001) nLimbVerts++; if (wt[i] > 0.999) nFull++; }
  console.log('\nweights: ' + nLimbVerts + ' vertices touch a limb, ' + nFull + ' of them fully; ' +
              (U.length - nLimbVerts) + ' are pure spine');
  console.log('  bones per vertex: worst ' + slotsMax + ', kept ' + NBS +
              '; largest weight dropped off the end ' + droppedMax.toFixed(4));
  console.log('  seam (per-edge influence difference, 0 = neighbours agree): med=' +
              seam[(seam.length * 0.5) | 0].toFixed(3) + '  p99=' + seam[(seam.length * 0.99) | 0].toFixed(3) +
              '  max=' + seam[seam.length - 1].toFixed(3));
  console.log('  core sharpness (1 = a leg vertex follows one bone): ' + (sharp / sharpN).toFixed(3));
  console.log('  edges whose two ends differ by more than half: ' + seamBad +
              ' (' + (100 * seamBad / seam.length).toFixed(2) + '%)');

  /* ---- per-triangle colour ---- */
  var table = [], tabIdx = {}, colIdx = [];
  for (i = 0; i < T.length; i++) {
    var f2 = T[i];
    var cx = (U[f2[0]][0] + U[f2[1]][0] + U[f2[2]][0]) / 3;
    var cy = (U[f2[0]][1] + U[f2[1]][1] + U[f2[2]][1]) / 3;
    var ss = (cx - xTip) / span;
    var hh2 = profAt(prof, cx, 'halfH') || 1;
    var uu = (cy + hh2) / (2 * hh2);
    if (uu < 0) uu = 0; if (uu > 1) uu = 1;
    var lw = (wt[f2[0]] + wt[f2[1]] + wt[f2[2]]) / 3;
    var lt = 0;
    if (lw > 0.5 && lb[f2[0]] >= 0) lt = (bi[f2[0]] + 1) / 3;
    var hex = faceColour(ss, uu, lw > 0.5, lt, isEye(f2[0]), i);
    if (!(hex in tabIdx)) { tabIdx[hex] = table.length; table.push(hex); }
    colIdx.push(tabIdx[hex]);
  }
  console.log('colours: ' + table.length + ' distinct across ' + T.length + ' facets');

  /* ---- WHICH WAY DO THE FACES POINT ----
     A closed surface's signed volume is positive if and only if it is
     wound outward. `otters.js` draws this with `flatShading` on a
     material that defaults to `THREE.FrontSide`, so an inward-wound
     animal has its near surface culled and shows you the inside of its
     far surface instead — which, from above, is the pale belly.

     THIS IS ASKED OF THE TRIANGLES BEING WRITTEN, not of the OBJ,
     because the defect it catches is created between the two: readObj's
     (x,y,z)->(z,y,x) is a reflection and reverses all of them.

     Measured in unbent units rather than body units: the emission is a
     uniform positive scale and a translation away, and neither can
     change the sign. It went unnoticed from §44 to §47 because nothing
     looked — `check-roundtrip` and `check-stretch` measure vertices and
     edges, which are orientation-blind, and `render-otter.js` does no
     backface culling, so every render ever made of this animal drew a
     surface the browser was throwing away. */
  var vol = 0;
  for (i = 0; i < T.length; i++) {
    var g0 = U[T[i][0]], g1 = U[T[i][1]], g2 = U[T[i][2]];
    vol += (g0[0] * (g1[1] * g2[2] - g1[2] * g2[1])
          - g0[1] * (g1[0] * g2[2] - g1[2] * g2[0])
          + g0[2] * (g1[0] * g2[1] - g1[1] * g2[0])) / 6;
  }
  console.log('winding: signed volume ' + vol.toFixed(2) +
              (vol > 0 ? '   OK (faces point outward)'
                       : '   *** INWARD - FrontSide culling will hide the animal'));

  /* ---- profile ramp for onSkin, in sim units ---- */
  var ramp = [];
  for (i = 0; i < prof.length; i += 2) {
    ramp.push([+((prof[i].x - xTip) / span).toFixed(4),
               +(prof[i].halfW * K).toFixed(4),
               +(prof[i].halfH * K).toFixed(4)]);
  }

  var n4 = function (a) { return a.map(function (v) { return +v.toFixed(4); }); };
  var out = [];
  out.push('/* ottermesh.js - GENERATED by tools/bake-otter.js from');
  out.push('   reference/otter/Otter.obj. Do not hand-edit: re-run the bake.');
  out.push('');
  out.push('   ' + U.length + ' vertices, ' + T.length + ' facets. The rest pose is UN-POSED:');
  out.push('   the model\'s own standing arch has been taken out, so this is a');
  out.push('   straight animal along +X and otters.js\'s centreline does all the');
  out.push('   bending. Units are BODY UNITS (torso = 1), x = 0 at the shoulder.');
  out.push('');
  out.push('   Every vertex sits on the spine - s along it, oy/oz off it - and');
  out.push('   that alone reproduces the un-posed animal exactly, limbs included.');
  out.push('   On top of it each vertex carries a list of INFLUENCES that sums to');
  out.push('   one: what is left over for the spine, plus up to ' + NBS + ' bones with a');
  out.push('   weight each. The list changes smoothly from a vertex to its');
  out.push('   neighbour - that is the whole point of it, and what stops a socket');
  out.push('   tearing when a leg swings a long way from where it was modelled. */');
  out.push('window.OtterMesh = {');
  out.push('  nVert: ' + U.length + ', nTri: ' + T.length + ',');
  out.push('  s: [' + n4(s).join(',') + '],');
  out.push('  oy: [' + n4(oy).join(',') + '],');
  out.push('  oz: [' + n4(oz).join(',') + '],');
  out.push('  /* total weight on bones; 1 - w is the spine\'s share */');
  out.push('  w: [' + n4(wt).join(',') + '],');
  out.push('  /* the loudest voice, for diagnostics and the colour pass */');
  out.push('  limb: [' + lb.join(',') + '],');
  out.push('  bone: [' + bi.join(',') + '],');
  out.push('  /* ' + NBS + ' slots per vertex: global bone 0..11 (-1 unused) and its weight */');
  out.push('  nbs: ' + NBS + ',');
  out.push('  bidx: [' + bidx.join(',') + '],');
  out.push('  bwt: [' + n4(bwt).join(',') + '],');
  out.push('  tri: [' + T.map(function (f) { return f.join(','); }).join(',') + '],');
  out.push('  cTab: [' + table.map(function (h) { return '0x' + h.toString(16); }).join(',') + '],');
  out.push('  cIdx: [' + colIdx.join(',') + '],');
  out.push('  /* [s, halfW, halfH] - the measured surface, for onSkin */');
  out.push('  prof: ' + JSON.stringify(ramp) + ',');
  out.push('  /* landmarks, in body units, x relative to the shoulder */');
  out.push('  X_TIP: ' + ((xTip - SHOULDER) * K).toFixed(4) + ', X_NOSE: ' + ((xNose - SHOULDER) * K).toFixed(4) + ',');
  out.push('  S_RUMP: ' + ((LM.rump - xTip) / span).toFixed(4) +
           ', S_SHOULDER: ' + ((SHOULDER - xTip) / span).toFixed(4) +
           ', S_NECK_END: ' + ((LM.neckEnd - xTip) / span).toFixed(4) + ',');
  out.push('  BODY_R: ' + (LM.wMax * K).toFixed(4) + ',');
  /* ---- THE TWO RIDE HEIGHTS, ASKED OF THE ANIMAL ----
     otters.js stood at a typed WALK_LIFT = 0.52 and lay at a typed
     HAUL_LIFT = 0.24, and the comment beside them said they were
     "measured off the mesh rather than chosen" — which was true when
     they were written and stopped being true the moment the mesh
     changed. A number that describes a SURFACE has to be asked of the
     surface every time, which is §43's rule and the reason the profile
     is shipped at all. So they are emitted here.

     TOE_DROP is how far the lowest toe hangs below the body axis: stand
     the animal any lower and its feet go through the sand, any higher
     and the walk's IK cannot reach the ground it is standing on. The
     generated animal measures 0.476 against the old mesh's 0.520, which
     is the small-clawed otter's shorter leg and nothing else.

     BELLY_DROP is the deepest part of the TORSO, limbs excluded — what
     a hauled animal is lying on. */
  var toeDrop = 0;
  for (i = 0; i < 4; i++) if (-limbs[i].toe[1] * K > toeDrop) toeDrop = -limbs[i].toe[1] * K;
  var sRump = (LM.rump - xTip) / span, sSh = (SHOULDER - xTip) / span, bellyDrop = 0;
  for (i = 0; i < U.length; i++) {
    if (s[i] < sRump || s[i] > sSh) continue;      // the torso, not the tail or the neck
    if (wt[i] > 0.5) continue;                     // and not anything a limb owns
    if (-oy[i] > bellyDrop) bellyDrop = -oy[i];
  }
  out.push('  /* how far the toes and the belly hang below the body axis */');
  out.push('  TOE_DROP: ' + toeDrop.toFixed(4) + ', BELLY_DROP: ' + bellyDrop.toFixed(4) + ',');
  out.push('  /* the scale that holds nose-to-tail where it already was */');
  out.push('  S: ' + (0.70 * 2.50 / ((xNose - xTip) * K)).toFixed(4) + ',');
  out.push('  /* fitted limb joints, [fore-R, fore-L, hind-R, hind-L] */');
  out.push('  limbs: [');
  for (i = 0; i < 4; i++) {
    var Lb = limbs[i];
    var p = function (q) {
      return '[' + ((q[0] - SHOULDER) * K).toFixed(4) + ',' + (q[1] * K).toFixed(4) + ',' + (q[2] * K).toFixed(4) + ']';
    };
    out.push('    { hip: ' + p(Lb.hip) + ', knee: ' + p(Lb.knee) +
             ', ankle: ' + p(Lb.ankle) + ', toe: ' + p(Lb.toe) + ' }' + (i < 3 ? ',' : ''));
  }
  out.push('  ]');
  out.push('};');
  fs.writeFileSync(OUT, out.join('\n') + '\n');
  var kb = (fs.statSync(OUT).size / 1024).toFixed(0);
  console.log('\nwrote ' + path.relative(ROOT, OUT) + '  (' + kb + ' KB)');
}

if (require.main === module) main();
