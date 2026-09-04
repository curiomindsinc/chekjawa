/* roundtrip.js — rebuild the rest pose from ottermesh.js alone and compare
   it to the un-bent mesh the bake started from. If the skinning
   parameterisation is right this is zero; anything else is a bug that
   would show up as a deformed animal and be blamed on the rig.

   WHAT THIS MEASURES NOW. The runtime blends MOTIONS, not places: every
   influence acts on ONE rest position, and that position is `s`/`oy`/`oz`
   — the un-posed animal, straight along +X — for every vertex, limbs
   included. There is no second parameterisation to disagree with it, so
   the whole of the rest pose rests on those three numbers, and this asks
   the only question left worth asking of them: do they reproduce the OBJ.

   It is still split three ways by how much limb a vertex carries. That
   split says nothing about the reconstruction any more — it is the same
   arithmetic in all three — but it is what tells you WHERE an error is
   if one ever appears.

   A GATE MUST STAY IN STEP WITH ITS SUBJECT. This file once reported
   0.11 body units of error on every limb vertex because the bake had
   moved to a two-bone blend and the gate had not: the data was right and
   the gate was stale, which is worse than no gate, because it points at
   the wrong file. The second half below exists for the same reason — it
   checks the thing the runtime actually does. */
global.window = global;
require(require('path').join(__dirname,'..','js','ottermesh.js'));
var M = global.OtterMesh;

var fs = require('fs');
var B = require('./bake-otter.js');

/* re-derive U exactly as the bake does, by re-running its own steps */
var src = B.readObj(B.OBJ), V = src.V, Q = src.Q;
var comps = B.components(V, Q), shell = new Set(comps[0]);
var T = [];
for (var i = 0; i < Q.length; i++) for (var j = 2; j < Q[i].length; j++) T.push([Q[i][0], Q[i][j - 1], Q[i][j]]);
var Tshell = T.filter(function (f) { return shell.has(f[0]); });
var skip = new Set();
for (i = 0; i < V.length; i++) if (B.inLimb(V[i])) skip.add(i);

/* the bake does not export centreline/unbend, so recompile it with them exposed */
var Module = require('module');
var s2 = fs.readFileSync(require('path').join(__dirname,'bake-otter.js'), 'utf8')
  .replace('if (require.main === module) main();',
           'module.exports._d={centreline:centreline,unbend:unbend,buildProfile:buildProfile};');
var m2 = new Module('rt'); m2._compile(s2, require('path').join(__dirname,'rt.js'));
var D = m2.exports._d;
var C = D.centreline(V, Tshell, skip);
var U = D.unbend(V, C);
/* the bake reshapes the tail root after unbending; a gate that skipped it
   would report the reshape as error and point at the wrong file. */
B.tailSet(U, skip);

/* the same scale and origin the bake used */
var xNose = -Infinity, xTip = Infinity;
for (i = 0; i < U.length; i++) { if (U[i][0] > xNose) xNose = U[i][0]; if (U[i][0] < xTip) xTip = U[i][0]; }
var span = xNose - xTip;
var K = (M.X_NOSE - M.X_TIP) / span;                 // body units per unbent unit
var ORIG = xTip - M.X_TIP / K;                       // unbent x of body-local x = 0

var errS = [], errL = [], errB = [];
for (i = 0; i < M.nVert; i++) {
  var px = M.X_TIP + (M.X_NOSE - M.X_TIP) * M.s[i], py = M.oy[i], pz = M.oz[i];
  /* the truth, in body units */
  var tx = (U[i][0] - ORIG) * K, ty = U[i][1] * K, tz = U[i][2] * K;
  var e = Math.hypot(px - tx, py - ty, pz - tz);
  var w = M.w[i];
  if (w <= 0.001) errS.push(e); else if (w >= 0.999) errL.push(e); else errB.push(e);
}
function stat(a, n) {
  if (!a.length) return n + ': none';
  a = a.slice().sort(function (x, y) { return x - y; });
  var q = function (p) { return a[Math.min(a.length - 1, Math.floor(p * a.length))]; };
  return n + ': n=' + a.length + '  med=' + q(0.5).toFixed(6) + '  p95=' + q(0.95).toFixed(6) + '  max=' + q(0.9999).toFixed(6);
}
console.log('rest-pose round trip, error in BODY UNITS (torso = 1):');
console.log('  ' + stat(errS, 'pure spine  '));
console.log('  ' + stat(errL, 'pure limb   '));
console.log('  ' + stat(errB, 'blended     '));

/* ============================================================
   AND THE SECOND HALF: THE SKINNING ITSELF, AT REST.

   Blending motions has one property everything else depends on — a
   bone that has not moved contributes NOTHING. Rebuild each bone's
   rest frame from the emitted joints, compose it with its own inverse,
   blend the twelve of them by the emitted weights, and apply the result
   to the rest position. It has to come back unchanged.

   This is not a tautology. It fails the moment the runtime and the bake
   disagree about how a bone frame is built — which axis is the least
   aligned one, which way the cross products go, what order the joints
   are in — and that disagreement is invisible in the rest pose of the
   MESH while being fatal in every posed frame.
   ============================================================ */
function frame(a, b) {
  var ex = b[0] - a[0], ey = b[1] - a[1], ez = b[2] - a[2];
  var L = Math.hypot(ex, ey, ez) || 1;
  var xa = [ex / L, ey / L, ez / L];
  /* the world axis this bone points at LEAST — the same choice both the
     bake and otters.js make, and derived rather than shipped so they
     cannot drift apart */
  var qx = Math.abs(xa[0]), qy = Math.abs(xa[1]), qz = Math.abs(xa[2]);
  var tmp = (qx <= qy && qx <= qz) ? [1, 0, 0] : (qy <= qz ? [0, 1, 0] : [0, 0, 1]);
  var za = [xa[1] * tmp[2] - xa[2] * tmp[1], xa[2] * tmp[0] - xa[0] * tmp[2], xa[0] * tmp[1] - xa[1] * tmp[0]];
  var zl = Math.hypot(za[0], za[1], za[2]) || 1;
  za = [za[0] / zl, za[1] / zl, za[2] / zl];
  var ya = [za[1] * xa[2] - za[2] * xa[1], za[2] * xa[0] - za[0] * xa[2], za[0] * xa[1] - za[1] * xa[0]];
  return { o: a, xa: xa, ya: ya, za: za };
}
var FR = [];
M.limbs.forEach(function (L) {
  FR.push(frame(L.hip, L.knee), frame(L.knee, L.ankle), frame(L.ankle, L.toe));
});
function quatOf(f) {
  var Xx = f.xa[0], Xy = f.xa[1], Xz = f.xa[2];
  var Yx = f.ya[0], Yy = f.ya[1], Yz = f.ya[2];
  var Zx = f.za[0], Zy = f.za[1], Zz = f.za[2];
  var tr = Xx + Yy + Zz, s;
  if (tr > 0) { s = Math.sqrt(tr + 1) * 2; return [(Yz - Zy) / s, (Zx - Xz) / s, (Xy - Yx) / s, 0.25 * s]; }
  if (Xx > Yy && Xx > Zz) { s = Math.sqrt(1 + Xx - Yy - Zz) * 2; return [0.25 * s, (Yx + Xy) / s, (Zx + Xz) / s, (Yz - Zy) / s]; }
  if (Yy > Zz) { s = Math.sqrt(1 + Yy - Xx - Zz) * 2; return [(Yx + Xy) / s, 0.25 * s, (Zy + Yz) / s, (Zx - Xz) / s]; }
  s = Math.sqrt(1 + Zz - Xx - Yy) * 2; return [(Zx + Xz) / s, (Zy + Yz) / s, 0.25 * s, (Xy - Yx) / s];
}
/* rest composed with its own inverse: the identity, if the two agree */
var DQ = FR.map(function (f) {
  var a = quatOf(f), c = [-a[0], -a[1], -a[2], a[3]];
  var qx = a[3] * c[0] + a[0] * c[3] + a[1] * c[2] - a[2] * c[1];
  var qy = a[3] * c[1] + a[1] * c[3] + a[2] * c[0] - a[0] * c[2];
  var qz = a[3] * c[2] + a[2] * c[3] + a[0] * c[1] - a[1] * c[0];
  var qw = a[3] * c[3] - a[0] * c[0] - a[1] * c[1] - a[2] * c[2];
  /* the translation the same composition leaves behind */
  var o = f.o;
  var tx2 = 2 * (qy * o[2] - qz * o[1]), ty2 = 2 * (qz * o[0] - qx * o[2]), tz2 = 2 * (qx * o[1] - qy * o[0]);
  var rx = o[0] + qw * tx2 + qy * tz2 - qz * ty2;
  var ry = o[1] + qw * ty2 + qz * tx2 - qx * tz2;
  var rz = o[2] + qw * tz2 + qx * ty2 - qy * tx2;
  var tx = o[0] - rx, ty = o[1] - ry, tz = o[2] - rz;
  return { q: [qx, qy, qz, qw], e: [
    0.5 * ( tx * qw + ty * qz - tz * qy),
    0.5 * ( ty * qw + tz * qx - tx * qz),
    0.5 * ( tz * qw + tx * qy - ty * qx),
    0.5 * (-tx * qx - ty * qy - tz * qz)] };
});
var N = M.nbs, ident = 0;
for (i = 0; i < M.nVert; i++) {
  var w2 = M.w[i];
  var q0 = [0, 0, 0, 1 - w2], qe = [0, 0, 0, 0];
  for (var sl = 0; sl < N; sl++) {
    var g = M.bwt[i * N + sl];
    if (g <= 0) break;
    var d = DQ[M.bidx[i * N + sl]];
    if (d.q[3] < 0) g = -g;
    for (var k = 0; k < 4; k++) { q0[k] += d.q[k] * g; qe[k] += d.e[k] * g; }
  }
  var n = Math.hypot(q0[0], q0[1], q0[2], q0[3]);
  if (n < 1e-8) { ident = Infinity; break; }
  n = 1 / n;
  for (k = 0; k < 4; k++) { q0[k] *= n; qe[k] *= n; }
  var vx = M.X_TIP + (M.X_NOSE - M.X_TIP) * M.s[i], vy = M.oy[i], vz = M.oz[i];
  var ax2 = 2 * (q0[1] * vz - q0[2] * vy), ay2 = 2 * (q0[2] * vx - q0[0] * vz), az2 = 2 * (q0[0] * vy - q0[1] * vx);
  var ox = vx + q0[3] * ax2 + q0[1] * az2 - q0[2] * ay2;
  var oy2 = vy + q0[3] * ay2 + q0[2] * ax2 - q0[0] * az2;
  var oz2 = vz + q0[3] * az2 + q0[0] * ay2 - q0[1] * ax2;
  ox += 2 * (q0[3] * qe[0] - qe[3] * q0[0] + q0[1] * qe[2] - q0[2] * qe[1]);
  oy2 += 2 * (q0[3] * qe[1] - qe[3] * q0[1] + q0[2] * qe[0] - q0[0] * qe[2]);
  oz2 += 2 * (q0[3] * qe[2] - qe[3] * q0[2] + q0[0] * qe[1] - q0[1] * qe[0]);
  ident = Math.max(ident, Math.hypot(ox - vx, oy2 - vy, oz2 - vz));
}
console.log('un-moved bones move nothing: worst vertex off by ' + ident.toFixed(9) + ' body units');

/* and the field the stretch depends on: how fast influence changes
   between neighbours. This is the number that predicts a torn socket. */
var seen = new Set(), worst = 0, bad = 0, nEdge = 0;
function vec(v) {
  var g = new Float64Array(13); g[0] = 1 - M.w[v];
  for (var q3 = 0; q3 < N; q3++) { var ww = M.bwt[v * N + q3]; if (ww > 0) g[1 + M.bidx[v * N + q3]] += ww; }
  return g;
}
var VEC = []; for (i = 0; i < M.nVert; i++) VEC.push(vec(i));
for (var t3 = 0; t3 < M.nTri; t3++) {
  var f3 = [M.tri[t3 * 3], M.tri[t3 * 3 + 1], M.tri[t3 * 3 + 2]];
  for (var e3 = 0; e3 < 3; e3++) {
    var p = f3[e3], q4 = f3[(e3 + 1) % 3];
    if (p === q4) continue;
    var kk = p < q4 ? p + '_' + q4 : q4 + '_' + p;
    if (seen.has(kk)) continue;
    seen.add(kk);
    var dd = 0;
    for (k = 0; k < 13; k++) dd += Math.abs(VEC[p][k] - VEC[q4][k]);
    dd /= 2; nEdge++;
    if (dd > worst) worst = dd;
    if (dd > 0.5) bad++;
  }
}
console.log('neighbours disagree by at most ' + worst.toFixed(3) +
            '; ' + bad + ' of ' + nEdge + ' edges past half');
