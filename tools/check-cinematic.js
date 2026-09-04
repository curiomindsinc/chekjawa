/* check-cinematic.js — drive the whole film headlessly and report what
   each shot actually got.

   Same method as tools/sim.js: load the page's scripts into the vm
   sandbox and step the update functions by hand. requestAnimationFrame
   is a no-op in the harness, so nothing runs unless this file runs it —
   which is the point, because the tour has to be checked at a fixed
   step rather than at whatever frame rate a browser happens to give.

   What it is looking for, per shot:
     - the caption that actually showed (the polling beats pick their own)
     - the tide, so the shot-to-tide plan can be verified rather than assumed
     - the romp's state, so the arrival/haul/leave beats are known to fire
     - world.underwater, so the grade is known to come on in the hunt shot
     - the camera position, so no shot is pointed at the origin or the sky

   Run:  node tools/check-cinematic.js
*/
const { sandbox, load } = require('./harness.js');
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');

/* ---- DOM enough for the overlay ---- */
function el() {
  return {
    textContent: '', value: '', style: {},
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    addEventListener() {}, appendChild() {}, querySelectorAll() { return []; },
    dataset: {}
  };
}
const nodes = {};
function node(id) { return (nodes[id] = nodes[id] || el()); }
sandbox.document.getElementById = function (id) { return node(id); };
sandbox.document.querySelector = function (s) { return node(s); };
sandbox.document.querySelectorAll = function () { return { forEach() {} }; };
sandbox.document.body = el();

/* ---- load everything the tour touches ---- */
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const srcs = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1]);
const skip = new Set(['js/tideui.js', 'js/ui.js', 'js/foodweb.js', 'js/sound.js',
                      'js/intro.js', 'js/main.js']);
for (const s of srcs) {
  if (skip.has(s)) continue;
  try { load(s); } catch (e) { console.log('LOAD FAIL', s, e.message); }
}

const THREE = sandbox.THREE;
const scene = new THREE.Scene();
const world = sandbox.World.build(scene);

const crabs = sandbox.Crabs.spawn(scene, world);
const egrets = sandbox.Egrets.spawn(scene, world, { crabs: crabs.crabs });
const swimmingcrabs = sandbox.SwimmingCrabs.spawn(scene, world);
const sandstars = sandbox.SandStars.spawn(scene, world);
const penshells = sandbox.PenShells.spawn(scene, world, { sandstars: sandstars.stars });
const gobies = sandbox.Gobies.spawn(scene, world, { egrets: egrets.birds });
const otters = sandbox.Otters.spawn(scene, world, { gobies: gobies });
const octopuses = sandbox.Octopuses.spawn(scene, world, {
  swimmingcrabs: swimmingcrabs.crabs, penshells: penshells.shells, otters: otters.otters
});

const camera = new THREE.PerspectiveCamera(55, 16 / 9, 0.1, 900);
const dom = { addEventListener() {} };
const rig = new sandbox.CameraRig(camera, dom);
rig.boundX = world.simArea.halfX + 26;
rig.boundZ = 88;
rig.groundAt = world.heightAt;   // as main.js does — the camera's terrain clamp

sandbox.Cinematic.init({
  rig, camera, world,
  pops: { otters, octopuses, egrets, gobies, crabs }
});

/* ---- run it ---- */
const DT = 1 / 30;
let t = 0;
rig.update(0);          // main.js does this too — see its comment
sandbox.Cinematic.start();

let lastShot = -1, seen = [];
let cur = null;
const inkFrames = { n: 0 }, catchFrames = { n: 0 }, diveFrames = { n: 0 };
let maxUnder = 0, rompStates = {};
let worstClr = Infinity, worstTclr = Infinity;

for (let i = 0; i < 200 / DT && sandbox.Cinematic.isActive(); i++) {
  t += DT;
  world.update(DT, t, camera);
  crabs.update(DT, t);
  egrets.update(DT, t);
  swimmingcrabs.update(DT);
  sandstars.update(DT, t);
  penshells.update(DT, t);
  gobies.update(DT);
  otters.update(DT, t);
  octopuses.update(DT);
  sandbox.Cinematic.update(DT);
  rig.update(DT);

  const d = sandbox.Cinematic.debug();
  if (d.shot !== lastShot) {
    if (cur) seen.push(cur);
    lastShot = d.shot;
    cur = { shot: d.shot, caps: {}, tide0: d.tide.toFixed(2), romp: {},
            under: 0, camY: [Infinity, -Infinity] };
  }
  cur.caps[d.cap] = (cur.caps[d.cap] || 0) + 1;
  cur.romp[d.romp] = (cur.romp[d.romp] || 0) + 1;
  cur.tide1 = d.tide.toFixed(2);
  if (d.underwater > cur.under) cur.under = d.underwater;
  if (camera.position.y < cur.camY[0]) cur.camY[0] = camera.position.y;
  if (camera.position.y > cur.camY[1]) cur.camY[1] = camera.position.y;

  /* THE TWO CLEARANCES. Negative on either means the shot is inside the
     shore: `clr` is the camera under the terrain (you see the underside
     of the beach), `tclr` is the LOOK-AT under it, which is the one that
     actually causes it — a camera orbiting a buried point swings below
     the ground on its way round. Both must stay positive all film. */
  const clr = camera.position.y - world.heightAt(camera.position.x, camera.position.z);
  const tclr = rig.target.y - world.heightAt(rig.target.x, rig.target.z);
  if (cur.clr === undefined || clr < cur.clr) cur.clr = clr;
  if (cur.tclr === undefined || tclr < cur.tclr) cur.tclr = tclr;
  if (clr < worstClr) worstClr = clr;
  if (tclr < worstTclr) worstTclr = tclr;

  if (d.underwater > maxUnder) maxUnder = d.underwater;
  rompStates[d.romp] = (rompStates[d.romp] || 0) + 1;
  if (octopuses.inkAt()) inkFrames.n++;
  for (const o of otters.otters) {
    if (!o.vis) continue;
    if (o.state === 'catch') catchFrames.n++;
    if (o.state === 'dive') diveFrames.n++;
  }
}
if (cur) seen.push(cur);

console.log('ran', t.toFixed(1), 's · still active:', sandbox.Cinematic.isActive());
console.log('');
for (const s of seen) {
  const caps = Object.keys(s.caps).map(c => `${c}(${(s.caps[c] * DT).toFixed(0)}s)`).join(' + ');
  console.log(
    String(s.shot).padStart(2) + '  tide ' + s.tide0 + '→' + s.tide1 +
    '  camY ' + s.camY[0].toFixed(1) + '-' + s.camY[1].toFixed(1) +
    '  uw ' + s.under.toFixed(2) +
    '  clear ' + s.clr.toFixed(1) + '/' + s.tclr.toFixed(1) +
    '  romp ' + Object.keys(s.romp).join('/') +
    '\n    ' + caps);
}
console.log('');
console.log('romp state frames :', rompStates);
console.log('dive frames       :', diveFrames.n);
console.log('catch frames      :', catchFrames.n);
console.log('ink-visible frames:', inkFrames.n);
console.log('max underwater    :', maxUnder.toFixed(2));
console.log('worst clearance   : cam ' + worstClr.toFixed(2) + ' m, look-at ' + worstTclr.toFixed(2) + ' m  (both must be > 0)');
