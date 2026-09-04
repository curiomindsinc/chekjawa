/* render5.js — the skinned otter. Its body geometry is already in
   body-local space (skin() writes body-local; the Mesh carries mBody),
   so a broadside is just the position attribute.
   usage: node render5.js <state> <out.png> [view] [settle]  */
const fs=require('fs'),zlib=require('zlib');
function crc32(b){let c,t=[];for(let n=0;n<256;n++){c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0;}
let crc=0xFFFFFFFF;for(let i=0;i<b.length;i++)crc=t[(crc^b[i])&255]^(crc>>>8);return (crc^0xFFFFFFFF)>>>0;}
function chunk(ty,d){const l=Buffer.alloc(4);l.writeUInt32BE(d.length);const td=Buffer.concat([Buffer.from(ty,'ascii'),d]);
const c=Buffer.alloc(4);c.writeUInt32BE(crc32(td));return Buffer.concat([l,td,c]);}
function writePNG(p,W,H,rgb){const ih=Buffer.alloc(13);ih.writeUInt32BE(W,0);ih.writeUInt32BE(H,4);ih[8]=8;ih[9]=2;
const raw=Buffer.alloc(H*(W*3+1));for(let y=0;y<H;y++){raw[y*(W*3+1)]=0;rgb.copy(raw,y*(W*3+1)+1,y*W*3,(y+1)*W*3);}
fs.writeFileSync(p,Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ih),chunk('IDAT',zlib.deflateSync(raw,{level:9})),chunk('IEND',Buffer.alloc(0))]));}

const { sandbox, THREE, scene, world, gobies, otters } = require('./sim.js');
const WANT=process.argv[2]||'walk', OUT=process.argv[3]||'o.png', VIEW=process.argv[4]||'side';
const SETTLE=Number(process.argv[5]||0);
let t=0;const dt=1/30;let oi=-1,held=0;
for(let i=0;i<30*8000;i++){t+=dt;world.update(dt,t);gobies.update(dt,t);otters.update(dt,t);
 const k=otters.otters.findIndex(o=>o.vis&&o.state===WANT);
 if(k>=0){ if(oi===k)held+=dt; else {oi=k;held=0;} if(held>=SETTLE)break; } else {oi=-1;held=0;}}
if(oi<0){console.log('never reached state '+WANT);process.exit(1);}
const o=otters.otters[oi];
console.log('state',o.state,'flex',o.flex.toFixed(2),'size',o.size.toFixed(2),'t',t.toFixed(0));

const grp=scene.getObjectByName('otters');
/* the skinned bodies are the Meshes; the two instanced parts are whisker(6) and fish(1) */
const meshes=grp.children.filter(c=>c.isMesh&&!c.isInstancedMesh);
const inst=grp.children.filter(c=>c.isInstancedMesh);
console.log('skinned meshes',meshes.length,' instanced parts',inst.length);
const body=meshes[oi];
const S=0.70*0+ (sandbox.OtterMesh.S), sc=S*o.size;
const eul=new THREE.Euler(o.att[3],o.yaw-Math.PI*0.5,-o.att[0],'YXZ');
const mBody=new THREE.Matrix4().compose(new THREE.Vector3(o.x,o.y,o.z),new THREE.Quaternion().setFromEuler(eul),new THREE.Vector3(sc,sc,sc));
const inv=mBody.clone().invert();
/* WORLD=1 — the animal ATTITUDE, drawn against the waterline.
   Everything below this line works in body-local, which is the one space
   in which 'floating on its back with its head out' cannot be asked. So
   compose the body matrix again with the YAW TAKEN OUT (heading is not
   part of the question, and any heading but broadside foreshortens the
   answer) and the water surface moved to y = 0. The roll, the pitch and
   the ride height survive; a grey line is drawn at y = 0. */
const WORLD=!!process.env.WORLD;
const surfW=world.waterAt(o.x,o.z);
const mWorld=new THREE.Matrix4().compose(
  new THREE.Vector3(0,(surfW===null?o.y:o.y-surfW),0),
  new THREE.Quaternion().setFromEuler(new THREE.Euler(o.att[3],0,-o.att[0],'YXZ')),
  new THREE.Vector3(sc,sc,sc));
if(WORLD)console.log('world view: surf',surfW===null?'dry':surfW.toFixed(2),' body axis',(surfW===null?0:o.y-surfW).toFixed(3),'m above it');
const tris=[];const M=new THREE.Matrix4(),v=new THREE.Vector3();
/* body: already body-local */
{
  const pos=body.geometry.attributes.position, col=body.geometry.attributes.color;
  for(let i=0;i<pos.count;i+=3){const P=[],C=[];
    for(let j=0;j<3;j++){P.push([pos.getX(i+j),pos.getY(i+j),pos.getZ(i+j)]);
      C.push([col.getX(i+j),col.getY(i+j),col.getZ(i+j)]);}
    tris.push({P,C,part:'body'});}
}
/* the instanced fittings still need the body inverse */
const PER=[6,1], NAME=['whisker','fish'];
inst.forEach((child,ci)=>{
  const per=PER[ci], nm=NAME[ci];
  const pos=child.geometry.attributes.position, col=child.geometry.attributes.color;
  for(let s=0;s<per;s++){const slot=oi*per+s; if(slot>=child.count)continue;
    child.getMatrixAt(slot,M);
    if(Math.abs(M.elements[0])+Math.abs(M.elements[5])+Math.abs(M.elements[10])<1e-6)continue;
    const mm=inv.clone().multiply(M);
    for(let i=0;i<pos.count;i+=3){const P=[],C=[];let skip=false;
      for(let j=0;j<3;j++){v.set(pos.getX(i+j),pos.getY(i+j),pos.getZ(i+j)).applyMatrix4(mm);
        if(!isFinite(v.x)||Math.abs(v.y)>50)skip=true;P.push([v.x,v.y,v.z]);
        C.push([col.getX(i+j),col.getY(i+j),col.getZ(i+j)]);}
      if(!skip)tris.push({P,C,part:nm});}}
});
const counts={};tris.forEach(t=>counts[t.part]=(counts[t.part]||0)+1);
console.log('tris by part:',JSON.stringify(counts));
let lo=[1e9,1e9,1e9],hi=[-1e9,-1e9,-1e9];
for(const tr of tris)for(const P of tr.P)for(let k=0;k<3;k++){if(P[k]<lo[k])lo[k]=P[k];if(P[k]>hi[k])hi[k]=P[k];}
console.log('bounds x',lo[0].toFixed(2),hi[0].toFixed(2),'y',lo[1].toFixed(2),hi[1].toFixed(2),'z',lo[2].toFixed(2),hi[2].toFixed(2));
const VIEWS={side:P=>[P[0],P[1],-P[2]],top:P=>[P[0],-P[2],-P[1]],front:P=>[P[2],P[1],-P[0]],
 q:P=>{const a=Math.PI*0.20,b=Math.PI*0.11;const x=P[0]*Math.cos(a)+P[2]*Math.sin(a),z=-P[0]*Math.sin(a)+P[2]*Math.cos(a);
   return [x,P[1]*Math.cos(b)+z*Math.sin(b),-(-P[1]*Math.sin(b)+z*Math.cos(b))];}};
if(WORLD){const w=new THREE.Vector3();
  for(const tr of tris)for(const P of tr.P){w.set(P[0],P[1],P[2]).applyMatrix4(mWorld);P[0]=w.x;P[1]=w.y;P[2]=w.z;}}
const basis=VIEWS[VIEW]||VIEWS.side;
const proj=tris.map(tr=>tr.P.map(basis));
let plo=[1e9,1e9],phi=[-1e9,-1e9];
for(const p of proj)for(const q of p)for(let k=0;k<2;k++){if(q[k]<plo[k])plo[k]=q[k];if(q[k]>phi[k])phi[k]=q[k];}
const W=1000,H=420,pad=20,light=[.3,.6,.75];
const rgb=Buffer.alloc(W*H*3);for(let i=0;i<W*H;i++){rgb[i*3]=244;rgb[i*3+1]=244;rgb[i*3+2]=240;}
const zb=new Float32Array(W*H).fill(Infinity);
const k0=Math.min((W-2*pad)/Math.max(1e-6,phi[0]-plo[0]),(H-2*pad)/Math.max(1e-6,phi[1]-plo[1]));
const ZOOM=Number(process.env.ZOOM||1);
const CX=process.env.CX!==undefined?Number(process.env.CX):(plo[0]+phi[0])/2;
const CY=process.env.CY!==undefined?Number(process.env.CY):(plo[1]+phi[1])/2;
const map=q=>[W/2+(q[0]-CX)*k0*ZOOM,H/2-(q[1]-CY)*k0*ZOOM,q[2]];
const NOCULL=!!process.env.NOCULL;
const PAINT=process.env.PAINT?{whisker:[1,0.3,1],fish:[0.3,1,1]}:null;
for(let ti=0;ti<tris.length;ti++){const tr=tris[ti];const p=proj[ti].map(map);const[a,b,c]=p;
 const ux=b[0]-a[0],uy=b[1]-a[1],uz=b[2]-a[2],wx=c[0]-a[0],wy=c[1]-a[1],wz=c[2]-a[2];
 let nx=uy*wz-uz*wy,ny=uz*wx-ux*wz,nz=ux*wy-uy*wx;const nl=Math.hypot(nx,ny,nz)||1;nx/=nl;ny/=nl;nz/=nl;
 let lam=nx*light[0]+ny*light[1]+nz*light[2];lam=.42+.58*Math.abs(lam);
 const cc=(PAINT&&PAINT[tr.part])||tr.C[0];
 const mnx=Math.max(0,Math.floor(Math.min(a[0],b[0],c[0]))),mxx=Math.min(W-1,Math.ceil(Math.max(a[0],b[0],c[0])));
 const mny=Math.max(0,Math.floor(Math.min(a[1],b[1],c[1]))),mxy=Math.min(H-1,Math.ceil(Math.max(a[1],b[1],c[1])));
 const d=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);if(Math.abs(d)<1e-9)continue;
 /* BACKFACE CULLING, because the browser does it and this did not.
    `d` is twice the triangle's signed area in screen space, so its sign
    IS the winding as seen from the camera — the same test the GPU makes
    for `THREE.FrontSide`, which is what otters.js's material defaults
    to. Without it this rasterizer draws whichever surface is nearest
    and an inside-out animal renders perfectly: the otter was wound
    inward from §44 to §47, every render looked right, and what the
    browser actually showed was the pale belly seen through the back.
    A harness more permissive than the thing it stands in for does not
    just miss bugs, it certifies them. NOCULL=1 to see both sides. */
 if(!NOCULL && d>0)continue;
 for(let y=mny;y<=mxy;y++)for(let x=mnx;x<=mxx;x++){
  const l1=((b[1]-c[1])*(x-c[0])+(c[0]-b[0])*(y-c[1]))/d,l2=((c[1]-a[1])*(x-c[0])+(a[0]-c[0])*(y-c[1]))/d,l3=1-l1-l2;
  if(l1<0||l2<0||l3<0)continue;const z=l1*a[2]+l2*b[2]+l3*c[2];const idx=y*W+x;if(z>=zb[idx])continue;zb[idx]=z;
  rgb[idx*3]=Math.min(255,cc[0]*255*lam);rgb[idx*3+1]=Math.min(255,cc[1]*255*lam);rgb[idx*3+2]=Math.min(255,cc[2]*255*lam);}}
if(WORLD){/* the waterline, after the same projection the animal got */
  const wy=map(basis([0,0,0]))[1];
  if(wy>=0&&wy<H)for(let x=0;x<W;x++)for(let dy=0;dy<2;dy++){const y=Math.round(wy)+dy;
    if(y<0||y>=H)continue;const i=(y*W+x)*3;
    if(zb[y*W+x]===Infinity){rgb[i]=120;rgb[i+1]=160;rgb[i+2]=200;}}}
writePNG(OUT,W,H,rgb);console.log('wrote',OUT);
