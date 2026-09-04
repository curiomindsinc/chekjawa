/* gait2.js — §43's gait checks, re-pointed at the skinned body.
   The paw is no longer an instanced part with a matrix; it is a patch
   of skin. So the paw's world position is the centroid of the vertices
   bound to that limb's third bone, put through the body matrix. */
const { sandbox, THREE, scene, world, gobies, otters } = require('./sim.js');
const M = sandbox.OtterMesh;

/* which vertices are which paw */
const PAW = [[], [], [], []];
for (let i = 0; i < M.nVert; i++)
  if (M.limb[i] >= 0 && M.bone[i] === 2 && M.w[i] > 0.9) PAW[M.limb[i]].push(i);
console.log('paw vertex counts', PAW.map(p => p.length).join('/'));
/* first non-indexed slot for each vertex, so the deformed buffer can be read */
const slotOf = new Int32Array(M.nVert).fill(-1);
for (let i = 0; i < M.nTri * 3; i++) if (slotOf[M.tri[i]] < 0) slotOf[M.tri[i]] = i;

const grp = scene.getObjectByName('otters');
const meshes = grp.children.filter(c => c.isMesh && !c.isInstancedMesh);
const mB = new THREE.Matrix4(), eul = new THREE.Euler(), q = new THREE.Quaternion(), v = new THREE.Vector3();
function pawWorld(oi, o, l) {
  const sc = M.S * o.size;
  eul.set(o.att[3], o.yaw - Math.PI * 0.5, -o.att[0], 'YXZ');
  mB.compose(new THREE.Vector3(o.x, o.y, o.z), q.setFromEuler(eul), new THREE.Vector3(sc, sc, sc));
  const pos = meshes[oi].geometry.attributes.position;
  let ax = 0, ay = 0, az = 0;
  for (const vi of PAW[l]) { const s = slotOf[vi]; ax += pos.getX(s); ay += pos.getY(s); az += pos.getZ(s); }
  const n = PAW[l].length || 1;
  v.set(ax / n, ay / n, az / n).applyMatrix4(mB);
  return { x: v.x, y: v.y, z: v.z };
}

/* SIXTY, NOT TWENTY. At 20 Hz and 2.75 m/s a whole gait cycle is under
   four samples and the swing is one of them, so every measure of how
   SMOOTHLY a foot moves reads as noise - the median second difference
   came out at 14 cm on a gait with nothing wrong with it. The screen
   runs at 60; measure what the screen shows. */
let dt = 1 / 60, t = 0;
const stance = [], replant = [], sink = [], jump = [];
let corrective = 0; const gPrev = new Map();
let prev = [], prev2 = [], walkFrames = 0;
for (let i = 0; i < 60 * 2000; i++) {
  t += dt; world.update(dt, t); gobies.update(dt, t); otters.update(dt, t);
  const now = [];
  for (let oi = 0; oi < otters.otters.length; oi++) {
    const o = otters.otters[oi];
    const rec = { state: o.state, plant: o.plant.map(p => p ? { x: p.x, z: p.z } : null), paw: [] };
    for (let l = 0; l < 4; l++) {
      const key = oi + ':' + l, was = gPrev.get(key);
      if (o.gOff && was !== undefined && Math.abs(o.gOff[l] - was) > 1e-6) corrective++;
      gPrev.set(key, o.gOff ? o.gOff[l] : 0);
    }
    if (o.state === 'walk' && o.vis) {
      for (let l = 0; l < 4; l++) rec.paw.push(pawWorld(oi, o, l));
      walkFrames++;
      for (let l = 0; l < 4; l++) {
        const f = rec.paw[l];
        sink.push(f.y - world.heightAt(f.x, f.z));
        const pv = prev[oi], pv2 = prev2[oi];
        if (pv && pv.state === 'walk' && pv.paw.length) {
          const d = Math.hypot(f.x - pv.paw[l].x, f.z - pv.paw[l].z);
          /* EVERY frame, planted or not. The old measure only looked
             at frames where a plant existed both sides, which is
             blind to the failure it was built to catch the moment the
             fix for that failure lifts the foot instead of dropping
             the plant: the jump moves into a frame the filter throws
             away. A foot that teleports teleports in world metres,
             so that is what is measured, in every phase.

             Not the distance travelled: a swinging foot legitimately
             covers 13 cm in a frame and that number cannot tell a
             step from a jump. The SECOND difference can - it is what
             is left after any smooth motion, however fast, is taken
             out, and a teleport is the only thing that survives it. */
          if (pv2 && pv2.state === 'walk' && pv2.paw.length) {
            const g = pv2.paw[l];
            jump.push(Math.hypot(f.x - 2*pv.paw[l].x + g.x, f.z - 2*pv.paw[l].z + g.z));
          }
          if (pv.plant[l] && rec.plant[l]) {
            const same = Math.abs(pv.plant[l].x - rec.plant[l].x) < 1e-9 && Math.abs(pv.plant[l].z - rec.plant[l].z) < 1e-9;
            if (same) stance.push(d); else replant.push(d);
          }
        }
      }
    }
    now.push(rec);
  }
  prev2 = prev; prev = now;
  if (walkFrames > 6000) break;
}
function stat(a, n, sc) {
  sc = sc || 1;
  if (!a.length) return n + ': none';
  a = a.slice().sort((x, y) => x - y);
  const Q = p => a[Math.min(a.length - 1, Math.floor(p * a.length))];
  return `${n}: n=${a.length} med=${(Q(.5)*sc).toFixed(3)} p95=${(Q(.95)*sc).toFixed(3)} p999=${(Q(.999)*sc).toFixed(3)}`;
}
console.log('walk frames', walkFrames, ' corrective steps taken:', corrective);
console.log(stat(stance, 'true-stance paw scrub per frame (cm)', 100));
console.log(stat(replant, 're-plant step (cm)', 100), ' replants/stance =', (replant.length / Math.max(1, stance.length)).toFixed(3));
jump.sort((a,b)=>a-b);
console.log(stat(jump, 'paw discontinuity, ANY phase (cm)', 100) + '  max=' + (100*jump[jump.length-1]).toFixed(3));
console.log(stat(sink, 'paw clearance above sand (cm)', 100));
console.log('frac paws >2cm below sand:', (sink.filter(x => x < -0.02).length / Math.max(1,sink.length)).toFixed(4),
            ' >5cm below:', (sink.filter(x => x < -0.05).length / Math.max(1,sink.length)).toFixed(4));
