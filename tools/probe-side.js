/* fore/hind paw z (body-local side) over a walk — is the stance symmetric? */
const { sandbox, THREE, scene, world, gobies, otters } = require('./sim.js');
const M = sandbox.OtterMesh;
const PAW=[[],[],[],[]];
for(let i=0;i<M.nVert;i++) if(M.limb[i]>=0&&M.bone[i]===2&&M.w[i]>0.9) PAW[M.limb[i]].push(i);
const slotOf=new Int32Array(M.nVert).fill(-1);
for(let i=0;i<M.nTri*3;i++) if(slotOf[M.tri[i]]<0) slotOf[M.tri[i]]=i;
const grp=scene.getObjectByName('otters');
const meshes=grp.children.filter(c=>c.isMesh&&!c.isInstancedMesh);
function pawLocal(oi,l){
  const pos=meshes[oi].geometry.attributes.position;
  let ax=0,ay=0,az=0;
  for(const vi of PAW[l]){const s=slotOf[vi];ax+=pos.getX(s);ay+=pos.getY(s);az+=pos.getZ(s);}
  const n=PAW[l].length||1; return [ax/n,ay/n,az/n];
}
let t=0,dt=1/60,n=0;
const acc=[[],[],[],[]];
for(let i=0;i<60*2000;i++){
  t+=dt; world.update(dt,t); gobies.update(dt,t); otters.update(dt,t);
  for(let oi=0;oi<otters.otters.length;oi++){
    const o=otters.otters[oi];
    if(o.state!=='walk'||!o.vis) continue;
    for(let l=0;l<4;l++) acc[l].push(pawLocal(oi,l));
    n++;
  }
  if(n>3000) break;
}
const NAME=['fore-R','fore-L','hind-R','hind-L'];
acc.forEach((a,l)=>{
  const z=a.map(p=>p[2]).sort((x,y)=>x-y), x=a.map(p=>p[0]).sort((p,q)=>p-q);
  const Q=(arr,p)=>arr[Math.floor(p*arr.length)];
  console.log(NAME[l]+'  z med '+Q(z,.5).toFixed(4)+'  min '+z[0].toFixed(4)+'  max '+z[z.length-1].toFixed(4)+
              '   |  x med '+Q(x,.5).toFixed(4));
});
console.log('frames',n);
console.log('rest-pose paw z:', [0,1,2,3].map(l=>{
  let s=0; for(const vi of PAW[l]) s+=M.oz[vi]; return (s/PAW[l].length).toFixed(4);
}).join('  '));
