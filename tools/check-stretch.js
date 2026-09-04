/* stretch.js — how far the skin is being pulled out of shape, per state.
   For every mesh edge, deformed length / rest length. A skinned surface
   should sit near 1; a socket that is tearing shows up as a handful of
   edges at 3x and more, and WHERE they are says which joint did it. */
const { sandbox, THREE, scene, world, gobies, otters } = require('./sim.js');
const M = sandbox.OtterMesh;
const WANT = process.argv[2] || 'haul';

/* unique edges from the triangle list */
const eset = new Set(), E = [];
for (let t = 0; t < M.nTri; t++) {
  const a = M.tri[t*3], b = M.tri[t*3+1], c = M.tri[t*3+2];
  for (const [p,q] of [[a,b],[b,c],[c,a]]) {
    const k = p < q ? p+'_'+q : q+'_'+p;
    if (!eset.has(k)) { eset.add(k); E.push([p,q]); }
  }
}
/* rest positions, straight from the baked parameterisation */
const rest = [];
for (let i = 0; i < M.nVert; i++)
  rest.push([M.X_TIP + (M.X_NOSE - M.X_TIP) * M.s[i], M.oy[i], M.oz[i]]);
const restLen = E.map(([p,q]) => Math.hypot(rest[p][0]-rest[q][0], rest[p][1]-rest[q][1], rest[p][2]-rest[q][2]));

let t = 0; const dt = 1/30; let oi = -1, held = 0;
for (let i = 0; i < 30*8000; i++) {
  t += dt; world.update(dt,t); gobies.update(dt,t); otters.update(dt,t);
  const k = otters.otters.findIndex(o => o.vis && o.state === WANT);
  if (k >= 0) { if (oi === k) held += dt; else { oi = k; held = 0; } if (held >= 2) break; } else { oi = -1; held = 0; }
}
if (oi < 0) { console.log('never reached ' + WANT); process.exit(1); }
const grp = scene.getObjectByName('otters');
const meshes = grp.children.filter(c => c.isMesh && !c.isInstancedMesh);
const pos = meshes[oi].geometry.attributes.position;
/* the non-indexed buffer holds each vertex many times; take the first */
const cur = new Array(M.nVert).fill(null);
for (let i = 0; i < M.nTri*3; i++) {
  const vi = M.tri[i];
  if (!cur[vi]) cur[vi] = [pos.getX(i), pos.getY(i), pos.getZ(i)];
}
const ratios = [];
for (let e = 0; e < E.length; e++) {
  const [p,q] = E[e];
  if (!cur[p] || !cur[q] || restLen[e] < 1e-6) continue;
  const d = Math.hypot(cur[p][0]-cur[q][0], cur[p][1]-cur[q][1], cur[p][2]-cur[q][2]);
  ratios.push({ r: d / restLen[e], p, q });
}
ratios.sort((a,b) => a.r - b.r);
const q = f => ratios[Math.min(ratios.length-1, Math.floor(f*ratios.length))].r;
console.log(WANT + ':  edges=' + ratios.length +
  '  med=' + q(0.5).toFixed(3) + '  p95=' + q(0.95).toFixed(3) +
  '  p99=' + q(0.99).toFixed(3) + '  max=' + ratios[ratios.length-1].r.toFixed(3));
const bad = ratios.filter(x => x.r > 2.0);
console.log('  edges stretched past 2x: ' + bad.length +
  ' (' + (100*bad.length/ratios.length).toFixed(2) + '%)');
const LAB = ['fore-R','fore-L','hind-R','hind-L'];
const where = {};
for (const x of bad.slice(-40)) {
  const l = M.limb[x.p] >= 0 ? M.limb[x.p] : M.limb[x.q];
  const key = l >= 0 ? LAB[l] + ' bone' + (M.bone[x.p] >= 0 ? M.bone[x.p] : M.bone[x.q]) : 'spine';
  where[key] = (where[key]||0) + 1;
}
if (bad.length) console.log('  worst 40 sit at:', JSON.stringify(where));
