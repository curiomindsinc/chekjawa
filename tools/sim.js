const { sandbox, load } = require('./harness.js');
const fs=require('fs'), path=require('path');
const ROOT=require('path').join(__dirname,'..');
// load in index.html order, skipping ui/camera/main
const html = fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
const srcs = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m=>m[1]);
const skip = new Set(['js/camera.js','js/tideui.js','js/ui.js','js/foodweb.js','js/main.js']);
for (const s of srcs){ if (skip.has(s)) continue; try{ load(s); }catch(e){ console.log('LOAD FAIL',s,e.message); } }
const THREE = sandbox.THREE;
const scene = new THREE.Scene();
const world = sandbox.World.build(scene);
const gobies = sandbox.Gobies.spawn(scene, world);
const otters = sandbox.Otters.spawn(scene, world, { gobies: gobies });
module.exports = { sandbox, THREE, scene, world, gobies, otters };
if (require.main === module){
  console.log('spawned otters:', otters.otters.length);
  let t=0;
  const dt=1/20;
  const states={};
  for (let i=0;i<20*300;i++){ t+=dt; try{ world.update && world.update(dt,t); }catch(e){}
    try{ gobies.update(dt,t); }catch(e){ console.log('goby update err',e.message); break; }
    try{ otters.update(dt,t); }catch(e){ console.log('OTTER UPDATE ERR',e.message,e.stack); break; }
    for (const o of otters.otters) states[o.state]=(states[o.state]||0)+1;
  }
  console.log('after', t.toFixed(0),'s  state frames:', states);
}
