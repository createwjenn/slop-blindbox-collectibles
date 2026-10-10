import {createWorldAnimator} from './world-animation.js';
import {worldInput} from './world-input.js';
import {groundAt,stepCharacter,stepSwimmingCharacter} from './world-movement.js?v=water-1';
import {worldConfig} from './world-config.js?v=tree-garden-6';
import {createWorldWater} from './world-water.js';
import * as THREE from 'three';
import {SplatMesh,SparkRenderer} from './vendor/spark.module.js';
import {GLTFLoader} from './vendor/GLTFLoader.js';
const names={'niu-lai':'Niu Lai','strawberlina':'Strawberlina','bananito':'Bananito','tung-tung-tung':'Tung Tung Tung','tralalero-tralala':'Tralalero Tralala','ballerina-capuccina':'Ballerina Capuccina','chill-guy':'Chill Guy','secret-capybara-toilet':'Secret Capybara Toilet'};
const requested=new URLSearchParams(location.search).get('character'),slug=Object.hasOwn(names,requested)?requested:'niu-lai';
const config=worldConfig(slug);
const canvas=document.querySelector('canvas'),loading=document.querySelector('#loading'),progress=document.querySelector('#progress');
function closeWorld(){if(parent!==window)parent.postMessage({type:'slop-world-close'},location.origin);else location.href='./';}
document.querySelector('#back').onclick=closeWorld;document.querySelector('#cancel').onclick=closeWorld;
document.querySelector('#label').textContent=names[slug];
const detailButton=document.querySelector('#detail');
detailButton.hidden=!matchMedia('(pointer:fine)').matches;
const highDetail=new URLSearchParams(location.search).get('detail')==='high';
detailButton.textContent=highDetail?'Faster view':'High detail';
detailButton.onclick=()=>{const url=new URL(location.href);url.searchParams.set('detail',highDetail?'standard':'high');location.href=url;};
const keys=new Set();let ready=false,drag=null,yaw=0,orbit=0,pitch=.23,distance=config.cameraDistance;
let navigation,avatar,shadow,spawn,animator,water;
let immersion=0,elapsed=0;const waterClip=new THREE.Plane(new THREE.Vector3(0,1,0),0);
const player=new THREE.Group(),position=new THREE.Vector3(),desired=new THREE.Vector3(),look=new THREE.Vector3();
let renderer,scene,camera,splats,spark;
const cameraRay=new THREE.Raycaster();let lastCameraProbe=0,cameraClearance=Infinity;
function ground(x,z){return groundAt(navigation,x,z);}
function reset(){if(!ready)return;position.copy(spawn);player.position.copy(spawn);immersion=0;yaw=navigation.spawnYaw??0;orbit=0;pitch=.23;distance=config.cameraDistance;updateCamera(1);}
document.querySelector('#reset').onclick=reset;
const controls=new Set(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowLeft','ArrowDown','ArrowRight']);
addEventListener('keydown',event=>{if(controls.has(event.code)){event.preventDefault();keys.add(event.code);}if(event.code==='KeyR')reset();if(event.code==='Escape')closeWorld();});
addEventListener('keyup',event=>keys.delete(event.code));
addEventListener('blur',()=>{keys.clear();drag=null;});
document.addEventListener('visibilitychange',()=>keys.clear());
canvas.addEventListener('pointerdown',e=>{canvas.focus();drag={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener('pointermove',e=>{if(drag?.id!==e.pointerId)return;orbit-=(e.clientX-drag.x)*.005;pitch=THREE.MathUtils.clamp(pitch+(e.clientY-drag.y)*.004,-.12,1.05);drag.x=e.clientX;drag.y=e.clientY;});
for(const name of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(name,()=>drag=null);
canvas.addEventListener('wheel',e=>{e.preventDefault();distance=THREE.MathUtils.clamp(distance*Math.exp(e.deltaY*.001),.8,4);},{passive:false});
for(const button of document.querySelectorAll('[data-key]')){
 button.onpointerdown=e=>{e.preventDefault();keys.add(button.dataset.key);button.setPointerCapture(e.pointerId);};
 for(const name of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(name,()=>keys.delete(button.dataset.key));
}
function updateCamera(dt){
 const heading=yaw+orbit;
 look.copy(position);look.y+=.38;
 desired.set(Math.sin(heading)*distance*Math.cos(pitch),distance*Math.sin(pitch)+.24,Math.cos(heading)*distance*Math.cos(pitch)).add(look);
 if(config.swimming)desired.y=Math.max(desired.y,navigation.waterLevel+.12);
 const floor=ground(desired.x,desired.z);if(floor!==undefined)desired.y=Math.max(desired.y,floor+.18);
 // Keep the follow camera in front of nearby splat surfaces where possible.
 if(performance.now()-lastCameraProbe>140){
  lastCameraProbe=performance.now();scene.updateMatrixWorld(true);
  const direction=desired.clone().sub(look),length=direction.length();
  cameraRay.set(look,direction.normalize());cameraRay.near=.2;cameraRay.far=length;
  const hit=cameraRay.intersectObject(splats,false)[0];
  cameraClearance=hit?Math.max(.65,hit.distance-.12):Infinity;
 }
 const offset=desired.clone().sub(look);if(offset.length()>cameraClearance)desired.copy(look).add(offset.setLength(cameraClearance));
 camera.position.lerp(desired,Math.min(1,dt*9));camera.lookAt(look);
}
function move(dt){
 const input=worldInput(keys);
 orbit+=input.cameraYaw*1.3*dt;
 pitch=THREE.MathUtils.clamp(pitch+input.cameraPitch*.8*dt,-.12,1.05);
 const step=(config.swimming?stepSwimmingCharacter:stepCharacter)(navigation,position,yaw,input.forward,input.turn,dt,1.3);
 yaw=step.yaw;position.set(step.x,step.y,step.z);
 elapsed+=dt;immersion=THREE.MathUtils.lerp(immersion,step.immersion??0,Math.min(1,dt*7));
 player.position.x=position.x;player.position.z=position.z;player.position.y=config.swimming?THREE.MathUtils.lerp(player.position.y,position.y,Math.min(1,dt*9)):position.y;player.rotation.y=yaw+Math.PI;
 avatar.position.y=immersion*Math.sin(elapsed*2.4)*.014;avatar.rotation.z=immersion*Math.sin(elapsed*2)*.035;
 animator.update(input.running&&immersion<.3,dt*(1-immersion*.65));
 if(water){waterClip.constant=-(navigation.waterLevel-.035)+(1-immersion)*3;water.update(elapsed,position,immersion,step.moved);}
 shadow.visible=immersion<.15;
 shadow.position.set(position.x,position.y+.008,position.z);
 updateCamera(dt);
}
async function init(){
 renderer=new THREE.WebGLRenderer({canvas,antialias:false});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
 renderer.localClippingEnabled=true;renderer.outputColorSpace=THREE.SRGBColorSpace;scene=new THREE.Scene();scene.background=new THREE.Color('#a5c5d7');camera=new THREE.PerspectiveCamera(65,innerWidth/innerHeight,.03,180);
 spark=new SparkRenderer({renderer});scene.add(spark);
 splats=new SplatMesh({url:matchMedia('(pointer:fine)').matches&&new URLSearchParams(location.search).get('detail')==='high'?`${config.assets}/ceramic.spz`:`${config.assets}/ceramic-500k.spz`,onProgress:e=>{if(e.total)progress.textContent=`Loading your world… ${Math.round(e.loaded/e.total*100)}%`;}});splats.quaternion.set(1,0,0,0);scene.add(splats);
 const [gltf,nav]=await Promise.all([new GLTFLoader().loadAsync(`./assets/world-characters/${slug}.glb`),fetch(`${config.assets}/navigation.json`).then(r=>{if(!r.ok)throw Error('Navigation could not load');return r.json();}),splats.initialized]);
 navigation=nav;if(config.swimming)water=createWorldWater(scene,nav);
 avatar=new THREE.Group();const object=gltf.scene;avatar.add(object);
 animator=createWorldAnimator(object,gltf.animations);object.updateMatrixWorld(true);
 object.traverse(node=>{if(node.isSkinnedMesh){node.computeBoundingBox();node.frustumCulled=false;}});
 if(config.swimming)object.traverse(node=>{if(node.isMesh)for(const material of Array.isArray(node.material)?node.material:[node.material]){material.clippingPlanes=[waterClip];material.needsUpdate=true;}});
 const box=new THREE.Box3().setFromObject(object),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
 object.position.sub(center);object.position.y+=size.y/2;avatar.scale.setScalar(.62/Math.max(size.y,size.x*.85));player.add(avatar);scene.add(player);
 scene.add(new THREE.HemisphereLight('#fff5dd','#657652',2));const light=new THREE.DirectionalLight('#fff3d5',2.2);light.position.set(-2,5,3);scene.add(light);
 const shadowCanvas=document.createElement('canvas');shadowCanvas.width=128;shadowCanvas.height=128;const ctx=shadowCanvas.getContext('2d'),gradient=ctx.createRadialGradient(64,64,2,64,64,64);gradient.addColorStop(0,'rgba(0,0,0,.32)');gradient.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);
 shadow=new THREE.Mesh(new THREE.PlaneGeometry(.58,.45),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(shadowCanvas),transparent:true,depthWrite:false}));shadow.rotation.x=-Math.PI/2;scene.add(shadow);
 // Choose the closest supported patch to the original Marble camera origin.
 const candidates=Object.entries(nav.ground).map(([key,y])=>{const [x,z]=key.split(',').map(Number);return new THREE.Vector3((x+.5)*nav.cell,y,(z+.5)*nav.cell);}).filter(p=>Math.abs(p.y+.6)<.3).sort((a,b)=>a.x*a.x+a.z*a.z-(b.x*b.x+b.z*b.z));
 if(!nav.spawn&&!candidates.length)throw Error('No walkable ground found');spawn=nav.spawn?new THREE.Vector3(...nav.spawn):candidates[0];
 function resize(){renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();}addEventListener('resize',resize);resize();
 ready=true;reset();let last=performance.now();
 renderer.setAnimationLoop(now=>{const dt=Math.min(.04,(now-last)/1000);last=now;if(document.hidden)return;move(dt);renderer.render(scene,camera);});
 loading.hidden=true;canvas.focus();
}
init().catch(error=>{console.error('World loading failed',error);progress.textContent='The world couldn’t load. Return to your collectible and try again.';});
addEventListener('pagehide',()=>{keys.clear();animator?.dispose();water?.dispose();renderer?.setAnimationLoop(null);splats?.dispose();spark?.dispose();renderer?.dispose();});
