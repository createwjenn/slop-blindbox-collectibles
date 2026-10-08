import * as THREE from 'three';
// Split complete triangles into a lid and jagged vertical panels. UVs, normals
// and texture materials remain unchanged; the source asset is never edited.
export function createBoxTear(pairs){
 const parts=[],cache=new Map();
 for(const [source,overlay] of pairs){
  let geometries=cache.get(source.geometry);
  if(!geometries){
   const g=source.geometry,p=g.attributes.position,index=g.index;
   const buckets=Array.from({length:9},()=>[]),count=index?index.count:p.count;
   for(let i=0;i<count;i+=3){
    const a=index?index.getX(i):i,b=index?index.getX(i+1):i+1,c=index?index.getX(i+2):i+2;
    const x=(p.getX(a)+p.getX(b)+p.getX(c))/3,y=(p.getY(a)+p.getY(b)+p.getY(c))/3,z=(p.getZ(a)+p.getZ(b)+p.getZ(c))/3;
    const seam=.785+Math.sin(x*85+z*60)*.0025;
    const angle=Math.atan2(z,x)+Math.sin(y*43)*.035;
    const part=y>seam?0:1+Math.floor(((angle+Math.PI*3)%(Math.PI*2))/(Math.PI/4));
    buckets[part].push(a,b,c);
   }
   geometries=buckets.map(indices=>{
    if(!indices.length)return null;
    const piece=new THREE.BufferGeometry();for(const [name,attr] of Object.entries(g.attributes))piece.setAttribute(name,attr);
    piece.setIndex(indices);piece.computeBoundingBox();piece.computeBoundingSphere();return piece;
   });cache.set(g,geometries);
  }
  for(let i=0;i<geometries.length;i++){
   if(!geometries[i])continue;
   const group=new THREE.Group();group.position.copy(source.position);group.quaternion.copy(source.quaternion);group.scale.copy(source.scale);
   for(const original of [source,overlay]){
    const piece=new THREE.Mesh(geometries[i],original.material);piece.renderOrder=original.renderOrder;piece.frustumCulled=false;group.add(piece);
   }
   group.visible=false;source.parent.add(group);parts.push({group,id:i,home:group.position.clone()});
  }
 }
 let started=false;
 return progress=>{
  if(progress<=0)return;
  if(!started){started=true;for(const pair of pairs)for(const m of pair)m.visible=false;}
  const lid=THREE.MathUtils.smootherstep(progress,0,.48),tear=THREE.MathUtils.smootherstep(progress,.32,1);
  for(const {group,id,home} of parts){
   group.visible=progress<1;group.position.copy(home);
   if(id===0){group.position.y+=lid*1.6;group.position.x-=lid*.28;group.rotation.z=-lid*.7;group.rotation.x=lid*.45;}
   else{
    const angle=(id-.5)*Math.PI/4-Math.PI;
    const local=THREE.MathUtils.smootherstep(tear,(id%3)*.05,1);
    group.position.x+=Math.cos(angle)*local*1.6;
    group.position.z+=Math.sin(angle)*local*1.6;
    group.position.y-=local*local*1.5;
    group.rotation.x=Math.sin(angle)*local*.9;group.rotation.z=-Math.cos(angle)*local*.9;
   }
  }
 };
}
