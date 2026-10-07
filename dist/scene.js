import * as THREE from 'three';
import { RoundedBoxGeometry } from './vendor/RoundedBoxGeometry.js';
import { getShapeState, shapeNames, smoothstep } from './shape-cycle.js';

const host = document.querySelector('#scene');
const renderer = new THREE.WebGLRenderer({ antialias:true, alpha:true, powerPreference:'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.setClearColor(0xffffff,0);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
host.appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(32,1,.1,100);
camera.position.set(0,0,9.7);

// A photographic light tent: bright softboxes and dark cards reflected in foil.
const studio = new THREE.Scene();
studio.background = new THREE.Color('#c8cbd2');
const card = (x,y,z,w,h,color,intensity,rx=0,ry=0) => {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide}));
  m.material.color.multiplyScalar(intensity);
  m.position.set(x,y,z); m.rotation.set(rx,ry,0); studio.add(m);
};
card(-4,2,3,3,7,'#ffffff',5,0,.6);
card(4,1,2,1.2,8,'#ffffff',7,0,-.7);
card(0,5,0,7,4,'#ffffff',4,Math.PI/2);
card(0,0,6,1.6,7,'#15171c',1);
card(-5,-1,-2,4,7,'#393848',1,0,Math.PI/2);
card(3,-2,-4,5,5,'#e0d9f5',1.2);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(studio,.055).texture;
pmrem.dispose();
scene.add(new THREE.HemisphereLight(0xffffff,0xa6a9bd,2));
const light = new THREE.DirectionalLight(0xffffff,3);
light.position.set(-3,5,6); scene.add(light);

// Subtle pearlescent gradients are printed beneath the reflective laminate.
const surface = document.createElement('canvas'); surface.width=1024; surface.height=1024;
const ctx = surface.getContext('2d');
ctx.fillStyle='#cbd0d9'; ctx.fillRect(0,0,1024,1024);
const gradient=ctx.createLinearGradient(0,1024,1024,0);
[[0,'#b8d8d1'],[.2,'#d1c5e3'],[.38,'#bbc7e0'],[.55,'#e3d7cf'],[.72,'#c2ddd7'],[.87,'#c1c8e1'],[1,'#d9c7dc']].forEach(([p,c])=>gradient.addColorStop(p,c));
ctx.fillStyle=gradient; ctx.fillRect(0,0,1024,1024);
const map = new THREE.CanvasTexture(surface); map.colorSpace=THREE.SRGBColorSpace;
// Alpha compositing lets the actual page title show through the foil shell.
const foil = new THREE.MeshPhysicalMaterial({map,metalness:.72,roughness:.19,clearcoat:1,clearcoatRoughness:.075,iridescence:.7,iridescenceIOR:1.35,iridescenceThicknessRange:[180,420],envMapIntensity:1.25,transparent:true,opacity:.62,depthWrite:false});
const edgeFoil = foil.clone(); edgeFoil.roughness=.17; edgeFoil.opacity=.78;
const box = new THREE.Group(); scene.add(box);
box.scale.setScalar(.87);
// The same surface changes from folded packaging into a smooth organic form.
// Uniform face subdivisions keep the organic target smooth across the whole shell.
const bodyGeometry = new THREE.BoxGeometry(2.35,2.82,1.92,48,48,48);
const innerHalf=new THREE.Vector3(1.175-.028,1.41-.028,.96-.028);
for(let i=0;i<bodyGeometry.attributes.position.count;i++) {
 const original=new THREE.Vector3().fromBufferAttribute(bodyGeometry.attributes.position,i);
 const nearest=original.clone().clamp(innerHalf.clone().negate(),innerHalf);
 const normal=original.sub(nearest).normalize();
 const rounded=nearest.addScaledVector(normal,.028);
 bodyGeometry.attributes.position.setXYZ(i,rounded.x,rounded.y,rounded.z);
 bodyGeometry.attributes.normal.setXYZ(i,normal.x,normal.y,normal.z);
}
const organicPositions = new Float32Array(bodyGeometry.attributes.position.count*3);
const organicNormals = new Float32Array(organicPositions.length);
function organicPoint(direction) {
 const {x,y,z}=direction;
 const radius=1+.19*Math.sin(3*y+1)*Math.cos(3*x-.5)+.13*Math.sin(4*z+2*x)+.08*Math.cos(5*x-2*y);
 return new THREE.Vector3(x*radius*1.22+.1*y*y,y*radius*1.33,z*radius*1.12);
}
const direction=new THREE.Vector3(),axis=new THREE.Vector3(),tangent=new THREE.Vector3(),bitangent=new THREE.Vector3();
for(let i=0;i<bodyGeometry.attributes.position.count;i++) {
 direction.fromBufferAttribute(bodyGeometry.attributes.position,i).divide(new THREE.Vector3(1.175,1.41,.96)).normalize();
 const p=organicPoint(direction);
 axis.set(0,Math.abs(direction.y)<.9?1:0,Math.abs(direction.y)<.9?0:1);
 tangent.crossVectors(axis,direction).normalize(); bitangent.crossVectors(direction,tangent).normalize();
 const du=organicPoint(direction.clone().addScaledVector(tangent,.001).normalize()).sub(p);
 const dv=organicPoint(direction.clone().addScaledVector(bitangent,.001).normalize()).sub(p);
 const normal=du.cross(dv).normalize();
 p.toArray(organicPositions,i*3); normal.toArray(organicNormals,i*3);
}
bodyGeometry.morphAttributes.position=[new THREE.Float32BufferAttribute(organicPositions,3)];
bodyGeometry.morphAttributes.normal=[new THREE.Float32BufferAttribute(organicNormals,3)];
// Ray/surface intersections give every target the exact same vertex topology.
const pyramidSlope=1.25/2.85;
const pyramidPlanes=[new THREE.Vector3(1,pyramidSlope,0),new THREE.Vector3(-1,pyramidSlope,0),new THREE.Vector3(0,pyramidSlope,1),new THREE.Vector3(0,pyramidSlope,-1)];
function pyramidPoint(d) {
 let distance=d.y<-.000001 ? -1.35/d.y : Infinity;
 for(const plane of pyramidPlanes) {
  const dot=d.dot(plane);
  if(dot>0) distance=Math.min(distance,1.5*pyramidSlope/dot);
 }
 return d.clone().multiplyScalar(distance);
}
function cylinderPoint(d) {
 const radial=Math.hypot(d.x,d.z);
 const side=radial>.000001 ? 1.12/radial : Infinity;
 const cap=Math.abs(d.y)>.000001 ? 1.36/Math.abs(d.y) : Infinity;
 return d.clone().multiplyScalar(Math.min(side,cap));
}
for(const targetPoint of [pyramidPoint,cylinderPoint]) {
 const positions=new Float32Array(organicPositions.length);
 const normals=new Float32Array(organicNormals.length);
 for(let i=0;i<bodyGeometry.attributes.position.count;i++) {
  direction.fromBufferAttribute(bodyGeometry.attributes.position,i).divide(new THREE.Vector3(1.175,1.41,.96)).normalize();
  const point=targetPoint(direction);
  axis.set(0,Math.abs(direction.y)<.9?1:0,Math.abs(direction.y)<.9?0:1);
  tangent.crossVectors(axis,direction).normalize();bitangent.crossVectors(direction,tangent).normalize();
  // Blend normals only along narrow rims to keep reflective edges clean.
  const normal=new THREE.Vector3();
  if(targetPoint===pyramidPoint) {
   normal.y=-smoothstep(1-(point.y+1.35)/.06);
   for(const plane of pyramidPlanes) {
    const weight=smoothstep(1-(1.5*pyramidSlope-point.dot(plane))/.06);
    normal.addScaledVector(plane.clone().normalize(),weight);
   }
  } else {
   normal.y=Math.sign(point.y)*smoothstep(1-(1.36-Math.abs(point.y))/.08);
   const radius=Math.hypot(point.x,point.z);
   const weight=smoothstep(1-(1.12-radius)/.08);
   if(radius>0) { normal.x=point.x/radius*weight;normal.z=point.z/radius*weight; }
  }
  point.toArray(positions,i*3);normal.normalize().toArray(normals,i*3);
 }
 bodyGeometry.morphAttributes.position.push(new THREE.Float32BufferAttribute(positions,3));
 bodyGeometry.morphAttributes.normal.push(new THREE.Float32BufferAttribute(normals,3));
}
const body = new THREE.Mesh(bodyGeometry,foil);
box.add(body);
// Real lid construction and fine folded seams.
const seamMat=new THREE.MeshStandardMaterial({color:'#666574',metalness:.75,roughness:.36});
const seam=new THREE.Mesh(new RoundedBoxGeometry(2.353,.018,1.925,2,.006),seamMat);
seam.position.y=1.275; box.add(seam);
const lid=new THREE.Mesh(new RoundedBoxGeometry(2.368,.14,1.937,4,.025),edgeFoil);
lid.position.y=1.353; box.add(lid);
const bottom=new THREE.Mesh(new RoundedBoxGeometry(2.35,.018,1.922,2,.006),edgeFoil);
bottom.position.y=-1.38; box.add(bottom);

const fold=new THREE.Mesh(new THREE.BoxGeometry(.006,2.48,.004),seamMat);
fold.position.set(-1.08,-.04,-.963); box.add(fold);
const packagingDetails=[lid,bottom,seam,fold];
seamMat.transparent=true; seamMat.depthWrite=false;

// A transparent radial shadow grounds the object without tinting the white page.
const shadowCanvas=document.createElement('canvas'); shadowCanvas.width=128; shadowCanvas.height=128;
const sc=shadowCanvas.getContext('2d'); const sg=sc.createRadialGradient(64,64,1,64,64,64);
sg.addColorStop(0,'rgba(30,25,45,.19)');sg.addColorStop(.35,'rgba(30,25,45,.10)');sg.addColorStop(1,'rgba(30,25,45,0)');
sc.fillStyle=sg;sc.fillRect(0,0,128,128);
const shadow=new THREE.Mesh(new THREE.PlaneGeometry(4.2,.72),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(shadowCanvas),transparent:true,depthWrite:false}));
shadow.scale.setScalar(.87);
shadow.position.set(0,-1.75,-.7);scene.add(shadow);
box.rotation.set(.12,-.42,-.09);
const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)');
let elapsed=0,visibleTime=0,previous=performance.now();
function resize(){
 const w=host.clientWidth,h=host.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;
 camera.position.z= Math.max(9.2,6.25/camera.aspect);
 camera.updateProjectionMatrix();
}
addEventListener('resize',resize);resize();
renderer.setAnimationLoop((now)=>{
 const dt=Math.max(0,(now-previous)/1000);previous=now;
 if(!document.hidden) { visibleTime+=dt; if(!reduceMotion.matches) elapsed+=Math.min(dt,.05); }
 const {weights,from,to,blend}=getShapeState(visibleTime,reduceMotion.matches);
 body.morphTargetInfluences[0]=weights[1];
 body.morphTargetInfluences[1]=weights[2];
 body.morphTargetInfluences[2]=weights[3];
 const detailOpacity=1-smoothstep((1-weights[0])/.45);
 edgeFoil.opacity=.78*detailOpacity; seamMat.opacity=detailOpacity;
 packagingDetails.forEach(detail=>{detail.visible=detailOpacity>.001;});
 const shape=blend===0?shapeNames[from]:blend===1?shapeNames[to]:'morphing';
 if(host.dataset.shape!==shape) {
  host.dataset.shape=shape;
  host.setAttribute('aria-label',shape==='morphing'?'Translucent holographic sculpture morphing between shapes':`Translucent holographic ${shapeNames[blend===1?to:from]}`);
 }
 box.rotation.y=-.42+elapsed*.035;
 box.rotation.x=.12+Math.sin(elapsed*.14)*.04;
 box.rotation.z=-.09+Math.sin(elapsed*.11)*.025;
 box.position.y=Math.sin(elapsed*.3)*.035;
 renderer.render(scene,camera);
});
