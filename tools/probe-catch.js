/* probe-catch.js — is the eating otter on its back, and is its head out of the water?

   Everything else in tools/ looks at the animal in BODY-LOCAL space, which is
   exactly the space in which "belly up" and "head above water" cannot be asked.
   This one composes mBody and asks the questions in world metres against
   world.waterAt(). Run it after touching CATCH_ROLL, ATT.catch or AIM_CURL. */
const { sandbox, THREE, scene, world, gobies, otters } = require('./sim.js');
const SAMPLES = Number(process.env.SAMPLES || 40);
/* Only settled frames. `catch` is eased into over POSE_RATE/AIM_RATE, so the
   first second of the hold is the animal still arriving from `dive` and it
   reads as an otter a metre and a half under the water. */
const SETTLE = Number(process.env.SETTLE || 1.2);

let t = 0; const dt = 1 / 30; let cur = -1, held = 0;
const grp0 = () => scene.getObjectByName('otters');
const rows = [];
const v = new THREE.Vector3(), M = new THREE.Matrix4();

for (let i = 0; i < 30 * 8000 && rows.length < SAMPLES; i++) {
  t += dt; world.update(dt, t); gobies.update(dt, t); otters.update(dt, t);
  const k = otters.otters.findIndex(o => o.vis && o.state === 'catch');
  if (k < 0) { cur = -1; held = 0; continue; }
  if (k === cur) held += dt; else { cur = k; held = 0; }
  if (held < SETTLE) continue;
  const o = otters.otters[k];
  const surf = world.waterAt(o.x, o.z);
  if (surf === null) continue;
  const sc = sandbox.OtterMesh.S * o.size;
  const eul = new THREE.Euler(o.att[3], o.yaw - Math.PI * 0.5, -o.att[0], 'YXZ');
  const mBody = new THREE.Matrix4().compose(new THREE.Vector3(o.x, o.y, o.z),
    new THREE.Quaternion().setFromEuler(eul), new THREE.Vector3(sc, sc, sc));

  const grp = grp0();
  const meshes = grp.children.filter(c => c.isMesh && !c.isInstancedMesh);
  const pos = meshes[k].geometry.attributes.position;

  /* body-local x runs tail(-) to nose(+). The muzzle is the last stretch. */
  let noseX = -1e9;
  for (let j = 0; j < pos.count; j++) if (pos.getX(j) > noseX) noseX = pos.getX(j);
  let headMin = 1e9, headMax = -1e9, noseY = 0, bodyMin = 1e9, bodyMax = -1e9;
  /* belly-up test: the CHEST normal. body-local -y is the belly; where does
     that direction point in the world? +1 = belly straight up. */
  const belly = new THREE.Vector3(0, -1, 0).applyQuaternion(
    new THREE.Quaternion().setFromEuler(eul)).y;
  for (let j = 0; j < pos.count; j++) {
    const lx = pos.getX(j);
    v.set(lx, pos.getY(j), pos.getZ(j)).applyMatrix4(mBody);
    if (v.y < bodyMin) bodyMin = v.y;
    if (v.y > bodyMax) bodyMax = v.y;
    if (lx > noseX - 0.28) {            // the head, roughly muzzle to behind the eye
      if (v.y < headMin) headMin = v.y;
      if (v.y > headMax) headMax = v.y;
    }
    if (lx > noseX - 0.03) noseY = v.y;
  }
  /* the fish, if it is drawn: the second instanced part, one per animal */
  const inst = grp.children.filter(c => c.isInstancedMesh);
  let fishY = null;
  if (inst[1]) {
    inst[1].getMatrixAt(k, M);
    if (Math.abs(M.elements[0]) + Math.abs(M.elements[5]) + Math.abs(M.elements[10]) > 1e-6)
      fishY = M.elements[13];
  }
  rows.push({ belly: belly, surf: surf,
    nose: noseY - surf, headTop: headMax - surf, headBot: headMin - surf,
    top: bodyMax - surf, bot: bodyMin - surf,
    fish: fishY === null ? null : fishY - surf });
}

if (!rows.length) { console.log('never reached catch'); process.exit(1); }
function stat(f) {
  const a = rows.map(f).filter(x => x !== null).sort((p, q) => p - q);
  if (!a.length) return '   (none)';
  const med = a[a.length >> 1];
  return (med >= 0 ? ' ' : '') + med.toFixed(3) + '  [' +
    a[0].toFixed(3) + ' .. ' + a[a.length - 1].toFixed(3) + ']';
}
console.log('catch samples: ' + rows.length);
console.log('  belly-up      ' + stat(r => r.belly) + '   (+1 = belly straight up, -1 = belly down)');
console.log('  METRES ABOVE THE WATER — median [min .. max]');
console.log('  nose          ' + stat(r => r.nose));
console.log('  head top      ' + stat(r => r.headTop));
console.log('  head bottom   ' + stat(r => r.headBot));
console.log('  body top      ' + stat(r => r.top));
console.log('  body bottom   ' + stat(r => r.bot));
console.log('  fish          ' + stat(r => r.fish));
