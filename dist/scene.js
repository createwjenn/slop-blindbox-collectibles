import { playSound } from './sound-effects.js?v=4';
import * as THREE from 'three';
import { createLuckyDraw } from './lucky-draw.js?v=character-links-15';
import { selectLuckyDraw } from './draw-selection.js?v=1';
import { offerHandUnboxing, updateHandUnboxing } from './hand-unboxing.js?v=hand-instructions-7';
import { createBoxTear } from './box-tear.js?v=1';
import { isUnboxing, updateUnboxing, setUnboxingBounds } from './unboxing.js?v=prompt-10';
import { createGallery } from './gallery.js?v=sound-10';
import { updateLandscape } from './landscape.js?v=tap-hints-16';
import { unlockUnwrap, updateUnwrap, isUnwrapUnlocked } from './unwrap.js?v=sound-once-8';
import { GLTFLoader } from './vendor/GLTFLoader.js';

const host = document.querySelector('#scene');
const renderer = new THREE.WebGLRenderer({ antialias:true, alpha:true, powerPreference:'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.setClearColor(0xffffff,0);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.VSMShadowMap;
host.appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(32,1,.1,100);
camera.position.set(0,0,9.7);

// A photographic light tent: bright softboxes and dark cards reflected in foil.
const studio = new THREE.Scene();
studio.background = new THREE.Color('#b8bcc5');
const card = (x,y,z,w,h,color,intensity,rx=0,ry=0) => {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide}));
  m.material.color.multiplyScalar(intensity);
  m.position.set(x,y,z); m.rotation.set(rx,ry,0); studio.add(m);
};
card(-4,2,3,3,7,'#fff7ec',3,0,.6);
card(4,1,2,1.2,8,'#e7efff',2,0,-.7);
card(0,5,0,7,4,'#ffffff',2.5,Math.PI/2);
card(0,0,6,1.6,7,'#15171c',1);
card(-5,-1,-2,4,7,'#393848',1,0,Math.PI/2);
card(3,-2,-4,5,5,'#e0d9f5',1.2);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(studio,.12).texture;
scene.environmentIntensity=.65;
pmrem.dispose();
// Warm window light, restrained cool fill, and a soft rim preserve depth.
scene.add(new THREE.HemisphereLight(0xf4f7ff,0x81766b,.8));
const light = new THREE.DirectionalLight(0xfff1df,3.2);
light.position.set(-3.5,6,5); light.target.position.set(0,-.2,0);
light.castShadow=true;
light.shadow.mapSize.set(512,512);
light.shadow.radius=36;light.shadow.blurSamples=32;
Object.assign(light.shadow.camera,{left:-3.5,right:3.5,top:3.5,bottom:-3.5,near:.5,far:18});
light.shadow.bias=-.0002;light.shadow.normalBias=.018;
scene.add(light,light.target);
const fill=new THREE.DirectionalLight(0xdce8ff,.65);
fill.position.set(4,2,3);scene.add(fill);
const rim=new THREE.DirectionalLight(0xffffff,1.1);
rim.position.set(2,4,-4);scene.add(rim);

// No imported maps are used until the model is revealed.
const shell = new THREE.MeshPhysicalMaterial({
 color:'#ccd0de', metalness:.58, roughness:.22, clearcoat:1,
 clearcoatRoughness:.09, iridescence:.7, iridescenceIOR:1.35,
 iridescenceThicknessRange:[180,420], envMapIntensity:1.05,
 transparent:true, opacity:.56, depthWrite:false, side:THREE.FrontSide
});
const model = new THREE.Group(); scene.add(model);
const luckyDraw=createLuckyDraw(model,host,camera);
const meshes=[];
const revealUniforms={pinned:{value:0}};
const paintSurfaces=[];
const brushCenter=new THREE.Vector2();
const brushDirection=new THREE.Vector2(1,0);
const previousBrush=new THREE.Vector2();
let hasPreviousBrush=false, paintPending=false;
const brushUniforms={
 objectWorld:{value:new THREE.Matrix4()}, viewProjection:{value:new THREE.Matrix4()},
 center:{value:brushCenter}, direction:{value:brushDirection},
 viewport:{value:new THREE.Vector2()}, radius:{value:60},
 hitPoint:{value:new THREE.Vector3()}, worldRadius:{value:.5},
 cameraPoint:{value:camera.position}
};
// Bake each stroke into the mesh's own UV mask so it stays attached as it turns.
const bakeMaterial=new THREE.ShaderMaterial({
 uniforms:brushUniforms, transparent:true, depthTest:false, depthWrite:false,
 side:THREE.DoubleSide,
 vertexShader:`varying vec3 worldPoint; varying vec3 worldNormal;
 uniform mat4 objectWorld;
 void main(){
  worldPoint=(objectWorld*vec4(position,1.0)).xyz;
  worldNormal=normalize(mat3(objectWorld)*normal);
  gl_Position=vec4(uv*2.0-1.0,0.0,1.0);
 }`,
 fragmentShader:`varying vec3 worldPoint; varying vec3 worldNormal;
 uniform mat4 viewProjection;
 uniform vec2 center,direction,viewport;
 uniform vec3 hitPoint,cameraPoint;
 uniform float radius,worldRadius;
 void main(){
  if(distance(worldPoint,hitPoint)>worldRadius) discard;
  if(dot(normalize(worldNormal),normalize(cameraPoint-worldPoint))<0.12) discard;
  vec4 clip=viewProjection*vec4(worldPoint,1.0);
  vec2 delta=(clip.xy/clip.w*.5+.5)*viewport-center;
  vec2 q=vec2(dot(delta,direction),dot(delta,vec2(-direction.y,direction.x)))/radius;
  // A flat brush: squared ends, uneven bristle lengths, and fine streaks.
  float bristle=sin(q.y*97.0)*.065+sin(q.y*211.0)*.03;
  float tip=0.78+bristle+.08*sin(q.y*19.0);
  float lengthMask=1.0-smoothstep(tip-.13,tip,abs(q.x));
  float widthMask=1.0-smoothstep(.34,.43+.025*sin(q.x*31.0),abs(q.y));
  float grain=.84+.16*sin(q.y*183.0+sin(q.x*6.0));
  float paint=lengthMask*widthMask*grain;
  if(paint<.005) discard;
  gl_FragColor=vec4(vec3(1.0),paint);
 }`
});
const bakeScene=new THREE.Scene(),bakeCamera=new THREE.Camera();
const bakeMesh=new THREE.Mesh(new THREE.BufferGeometry(),bakeMaterial);
bakeMesh.frustumCulled=false;bakeScene.add(bakeMesh);
function paintMaterial(material,isShell,mask) {
 const painted=material.clone();
 painted.transparent=true;painted.depthWrite=!isShell;painted.forceSinglePass=true;
 painted.onBeforeCompile=shader=>{
  Object.assign(shader.uniforms,revealUniforms,{paintMask:{value:mask}});
  shader.vertexShader='varying vec2 paintUv;\n'+shader.vertexShader.replace('#include <uv_vertex>','#include <uv_vertex>\npaintUv=uv;');
  shader.fragmentShader='uniform sampler2D paintMask; uniform float pinned; varying vec2 paintUv;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <alphatest_fragment>',`
   float paint=max(pinned,texture2D(paintMask,paintUv).r);
   diffuseColor.a *= ${isShell?'1.0-paint':'paint'};
   if(diffuseColor.a<0.003) discard;
   #include <alphatest_fragment>`);
 };
 painted.customProgramCacheKey=()=>isShell?'paint-shell-uv-v2':'paint-color-uv-v2';
 return painted;
}
function clearPaint() {
 const target=renderer.getRenderTarget();
 renderer.setClearColor(0x000000,1);
 for(const surface of paintSurfaces){renderer.setRenderTarget(surface.mask);renderer.clear();}
 renderer.setRenderTarget(target);renderer.setClearColor(0xffffff,0);
 hasPreviousBrush=false;paintPending=false;
}
const brushBounds=new THREE.Box3();
function paintStroke(hit) {
 if(!hit || pinned || gesture) {hasPreviousBrush=false;return;}
 unlockUnwrap();
 const delta=brushCenter.clone().sub(previousBrush);
 if(!hasPreviousBrush||delta.lengthSq()>4)playSound('brush',.11);
 if(hasPreviousBrush && delta.lengthSq()>4) brushDirection.copy(delta).normalize();
 previousBrush.copy(brushCenter);hasPreviousBrush=true;
 brushUniforms.viewProjection.value.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);
 brushUniforms.hitPoint.value.copy(hit.point);
 const radius=brushUniforms.radius.value;
 brushUniforms.worldRadius.value=2*hit.distance*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*radius/host.clientHeight*1.25;
 const target=renderer.getRenderTarget(),autoClear=renderer.autoClear;
 renderer.autoClear=false;
 for(const surface of paintSurfaces){
  brushBounds.copy(surface.mesh.geometry.boundingBox).applyMatrix4(surface.mesh.matrixWorld);
  if(brushBounds.distanceToPoint(hit.point)>brushUniforms.worldRadius.value) continue;
  brushUniforms.objectWorld.value.copy(surface.mesh.matrixWorld);
  bakeMesh.geometry=surface.mesh.geometry;
  renderer.setRenderTarget(surface.mask);renderer.render(bakeScene,bakeCamera);
 }
 renderer.setRenderTarget(target);renderer.autoClear=autoClear;
}
let ready=false, pinned=false, hovered=false;
let modelBaseScale=1, touchScroll=null;
const status=document.querySelector('#model-status');
const pointer=new THREE.Vector2(2,2), raycaster=new THREE.Raycaster();
let pointerActive=false, lastHitTest=-Infinity, gesture=null;
let shakeStarted=null,shakeTap=null,lastShakeBeat=-1;
const tearPairs=[];let animateTear=null;
function startBoxShake(){
 if(shakeStarted!==null||document.querySelector('main').dataset.state!=='unboxing')return;
 shakeStarted=performance.now();lastShakeBeat=-1;
 document.querySelector('main').classList.add('box-shaking');
 document.querySelector('main').dataset.state='shaking';
 host.setAttribute('aria-label','Blind box shaking.');
}
host.addEventListener('pointerdown',event=>{
 if(!isUnboxing()||event.button!==0||shakeStarted!==null)return;
 updatePointer(event);
 if(!hitModel()||document.querySelector('main').dataset.state!=='unboxing')return;
 event.slopModelHit=true;
 shakeTap={id:event.pointerId,x:event.clientX,y:event.clientY};
 host.setPointerCapture(event.pointerId);
});
host.addEventListener('pointerup',event=>{
 const tap=shakeTap;shakeTap=null;
 if(!tap||tap.id!==event.pointerId)return;
 if(Math.hypot(event.clientX-tap.x,event.clientY-tap.y)<8)startBoxShake();
 if(host.hasPointerCapture(event.pointerId))host.releasePointerCapture(event.pointerId);
});
host.addEventListener('pointercancel',()=>{shakeTap=null;});
host.addEventListener('lostpointercapture',()=>{shakeTap=null;});
// Horizontal dragging turns between the logo face and the character-list face.
// Three.js calls this yaw (Y rotation); screen-vertical dragging controls pitch.
const tiltLimit=THREE.MathUtils.degToRad(30);
const rotation={yaw:-.55,pitch:.23,roll:0};
function rotateBy(yaw=0,pitch=0,roll=0) {
 rotation.yaw=THREE.MathUtils.clamp(rotation.yaw+yaw,-Math.PI/2,0);
 rotation.pitch=THREE.MathUtils.clamp(rotation.pitch+pitch,-tiltLimit,tiltLimit);
 rotation.roll=THREE.MathUtils.clamp(rotation.roll+roll,-tiltLimit,tiltLimit);
}
function pinColor(value) {
 if(value) unlockUnwrap();
 pinned=value; revealUniforms.pinned.value=value?1:0;
 host.dataset.revealed=String(value);
 host.setAttribute('aria-pressed',String(value));
}
function hitModel() {
 if(!ready || !pointerActive) return false;
 raycaster.setFromCamera(pointer,camera);
 if(luckyDraw.isRevealed())return luckyDraw.intersect(raycaster);
 return raycaster.intersectObjects(meshes,false)[0]||null;
}
function updatePointer(event) {
 const rect=renderer.domElement.getBoundingClientRect();
 const x=event.clientX-rect.left,y=event.clientY-rect.top;
 pointer.set(x/rect.width*2-1,-y/rect.height*2+1);
 brushCenter.set(x,rect.height-y);
 brushUniforms.viewport.value.set(rect.width,rect.height);
 brushUniforms.radius.value=Math.min(70,rect.width*.14);
 paintPending=true;
 pointerActive=true;
}
host.style.touchAction='none';
host.addEventListener('pointermove',event=>{
 if(touchScroll && touchScroll.id===event.pointerId){
  window.scrollBy(0,touchScroll.y-event.clientY);touchScroll.y=event.clientY;return;
 }
 updatePointer(event);
 if(!gesture || gesture.id!==event.pointerId) return;
 if(Math.hypot(event.clientX-gesture.startX,event.clientY-gesture.startY)>5) gesture.dragged=true;
 if(gesture.dragged) {
  const dx=(event.clientX-gesture.x)*.008,dy=(event.clientY-gesture.y)*.008;
  if(event.shiftKey) rotateBy(0,0,dx);
  else rotateBy(dx,dy);
 }
 gesture.x=event.clientX;gesture.y=event.clientY;
});
host.addEventListener('pointerleave',()=>{if(!gesture) {pointerActive=false;hasPreviousBrush=false;paintPending=false;}});
host.addEventListener('pointerdown',event=>{
 if(isUnboxing() || event.button!==0 || gesture) return;
 updatePointer(event);
 if(!hitModel()) {
  if(event.pointerType==='touch' && isUnwrapUnlocked()) touchScroll={id:event.pointerId,y:event.clientY};
  return;
 }
 event.slopModelHit=true;
 gesture={id:event.pointerId,startX:event.clientX,startY:event.clientY,x:event.clientX,y:event.clientY,dragged:false};
 host.setPointerCapture(event.pointerId);
 host.style.cursor='grabbing';
});
host.addEventListener('pointerup',event=>{
 if(touchScroll?.id===event.pointerId) touchScroll=null;
 if(!gesture || gesture.id!==event.pointerId) return;
 if(!gesture.dragged) pinColor(!pinned);
 gesture=null;
 if(host.hasPointerCapture(event.pointerId)) host.releasePointerCapture(event.pointerId);
 if(event.pointerType==='touch') pointerActive=false;
 lastHitTest=-Infinity;
});
function cancelGesture(){touchScroll=null;gesture=null;pointerActive=false;hovered=false;}
host.addEventListener('pointercancel',cancelGesture);
host.addEventListener('lostpointercapture',()=>{gesture=null;});
host.addEventListener('keydown',event=>{
 if(isUnboxing()){if(event.key==='Enter'||event.key===' '){event.preventDefault();startBoxShake();}return;}
 if(event.key==='Enter'||event.key===' ') {event.preventDefault();pinColor(!pinned);}
 if(event.key==='Escape') {pinColor(false);clearPaint();pointerActive=false;}
 if(event.key.startsWith('Arrow')) {
  event.preventDefault();
  if(event.key==='ArrowLeft') event.shiftKey?rotateBy(0,0,-.12):rotateBy(-.12);
  if(event.key==='ArrowRight') event.shiftKey?rotateBy(0,0,.12):rotateBy(.12);
  if(event.key==='ArrowUp') rotateBy(0,-.12);
  if(event.key==='ArrowDown') rotateBy(0,.12);
 }
});
window.addEventListener('blur',cancelGesture);
new GLTFLoader().load('./assets/slop.glb?v=blindbox-2',gltf=>{
 const content=gltf.scene;
 const bounds=new THREE.Box3().setFromObject(content);
 const size=bounds.getSize(new THREE.Vector3());
 const center=bounds.getCenter(new THREE.Vector3());
 const scale=2.7/Math.max(size.x,size.y,size.z);
 content.position.sub(center);
 model.add(content); modelBaseScale=scale; model.scale.setScalar(scale);
 const overlays=[];
 content.traverse(object=>{
  if(!object.isMesh) return;
  const mask=new THREE.WebGLRenderTarget(1024,1024,{depthBuffer:false,stencilBuffer:false});
  object.geometry.computeBoundingBox();
  paintSurfaces.push({mesh:object,mask});
  const overlay=object.clone();
  overlay.material=Array.isArray(object.material)?object.material.map(m=>paintMaterial(m,false,mask.texture)):paintMaterial(object.material,false,mask.texture);
  overlay.renderOrder=2;
  overlay.receiveShadow=true;
  overlays.push([object.parent,overlay]);
  tearPairs.push([object,overlay]);
  object.castShadow=true;object.receiveShadow=true;
  meshes.push(object); object.material=paintMaterial(shell,true,mask.texture);
 });
 for(const [parent,overlay] of overlays) parent.add(overlay);
 clearPaint();
 ready=true; host.dataset.loaded='true'; host.setAttribute('aria-busy','false');
 status.hidden=true;
},event=>{
 if(event.lengthComputable)document.querySelector('#loader-progress').style.width=`${Math.max(5,Math.min(95,event.loaded/event.total*95))}%`;
 if(event.lengthComputable) status.textContent=`Loading collectible… ${Math.round(event.loaded/event.total*100)}%`;
},error=>{
 console.error('Unable to load collectible',error);window.slopLoadFailed?.();
 status.textContent='The collectible could not load. Please refresh to try again.';
 host.setAttribute('aria-busy','false');
});

// A transparent floor receives the real silhouette; a broad contact shadow
// softens its base without introducing a visible floor against the white page.
const ground=new THREE.Mesh(new THREE.PlaneGeometry(30,30),new THREE.ShadowMaterial({color:0x33303a,opacity:.055,depthWrite:false}));
ground.rotation.x=-Math.PI/2;ground.position.y=-1.65;ground.receiveShadow=true;
ground.visible=false;scene.add(ground);
const shadowCanvas=document.createElement('canvas');shadowCanvas.width=256;shadowCanvas.height=256;
const sc=shadowCanvas.getContext('2d'),sg=sc.createRadialGradient(128,128,8,128,128,128);
sg.addColorStop(0,'rgba(32,28,36,.075)');sg.addColorStop(.4,'rgba(32,28,36,.035)');sg.addColorStop(1,'rgba(32,28,36,0)');
sc.fillStyle=sg;sc.fillRect(0,0,256,256);
const shadow=new THREE.Mesh(new THREE.PlaneGeometry(3.4,2.6),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(shadowCanvas),transparent:true,depthWrite:false}));
shadow.rotation.x=-Math.PI/2;shadow.visible=false;scene.add(shadow);
const modelBounds=new THREE.Box3();
const updateGallery=createGallery(studio);
const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)');
let elapsed=0,previous=performance.now(),pageRevealed=false;
function resize(){
 const w=host.clientWidth,h=host.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;
 camera.position.z=Math.max(9.2,6.25/camera.aspect);
 camera.updateProjectionMatrix();
}
addEventListener('resize',resize);resize();
renderer.setAnimationLoop(now=>{
 const dt=Math.min(Math.max(0,(now-previous)/1000),.05);previous=now;
 if(!document.hidden && !reduceMotion.matches && !gesture) elapsed+=dt;
 if(document.body.dataset.worldOpen==='true')return;
 const unboxing=updateUnboxing(dt);
 const unwrap=updateUnwrap(dt,isUnboxing());
 const approach=THREE.MathUtils.smootherstep(unboxing,.12,1);
 updateLandscape(dt,unwrap,unboxing);
 const modelSize=THREE.MathUtils.lerp(1-unwrap*.5,1.12,approach);
 model.scale.setScalar(modelBaseScale*modelSize);
 // Small bounded rocking replaces the previous continuous spin. Rocking fades
 // out at each stop so an aligned face stays aligned and cannot overshoot.
 const pitchRock=Math.sin(elapsed*.14)*.015*(1-Math.abs(rotation.pitch)/tiltLimit);
 const yawRock=Math.sin(elapsed*.18)*.025*Math.sin(rotation.yaw*2);
 const rollRock=Math.sin(elapsed*.11)*.01*(1-Math.abs(rotation.roll)/tiltLimit);
 model.rotation.set(THREE.MathUtils.lerp(rotation.pitch+pitchRock,.07,approach),THREE.MathUtils.lerp(rotation.yaw+yawRock,-Math.PI/4,approach),(rotation.roll+rollRock)*(1-approach));
 model.position.set(0,Math.sin(elapsed*.3)*.035*(1-approach),0);
 if(shakeStarted!==null){
  const age=(now-shakeStarted)/1000;
  if(age>=3){
   shakeStarted=null;document.querySelector('main').classList.remove('box-shaking');
   luckyDraw.whenReady().then(offerHandUnboxing).catch(()=>{status.hidden=false;status.textContent="Your collectible could not load. Please refresh and try again.";});
   host.setAttribute('aria-label','Allow camera access, raise one hand and open your palm, then close it once to open the box.');
  }else{
   const envelope=THREE.MathUtils.smoothstep(age,0,.16)*(1-THREE.MathUtils.smoothstep(age,2.42,3));
   // Trigger at the diagonal swing reversals; never queue a whole sequence,
   // so hidden tabs cannot resume an out-of-sync rattle after the shake ends.
   const beat=Math.floor(age*8.4+.5);
   if(beat!==lastShakeBeat){
    lastShakeBeat=beat;
    if(age<2.88)playSound('shake',0,envelope);
   }
   const strength=envelope*(reduceMotion.matches?.18:1);
   const phase=age*Math.PI*2*4.2;
   const swing=Math.sin(phase)+Math.sin(phase*1.9+.4)*.16;
   model.position.x+=swing*.12*strength;
   model.position.y+=swing*.18*strength;
   model.position.z+=Math.sin(phase+.8)*.035*strength;
   model.rotation.z+=(-.095+Math.sin(phase+.45)*.075)*strength;
   model.rotation.y+=Math.sin(phase-.4)*.045*strength;
   model.rotation.x+=Math.sin(phase+.7)*.025*strength;
  }
 }
 const tearProgress=updateHandUnboxing(dt);
 if(animateTear)animateTear(tearProgress);
 luckyDraw.update(tearProgress,elapsed,dt);
 model.position.add(luckyDraw.layoutOffset());
 model.updateMatrixWorld(true);
 shadow.visible=ready&&unboxing<.3;ground.visible=ready&&unboxing<.3;
 if(ready){
  modelBounds.setFromObject(model);
  if(isUnboxing()&&shakeStarted===null&&!animateTear){
   const top=new THREE.Vector3(0,modelBounds.max.y,0).project(camera);
   const bottom=new THREE.Vector3(0,modelBounds.min.y,0).project(camera);
   setUnboxingBounds((1-top.y)*host.clientHeight/2,(1-bottom.y)*host.clientHeight/2);
  }
  ground.position.y=Math.min(-1.65*modelSize,modelBounds.min.y-.12*modelSize);
  shadow.position.set(0,ground.position.y+.008,0);
  const gap=modelBounds.min.y-ground.position.y;
  shadow.material.opacity=THREE.MathUtils.clamp(1-gap*.9,.45,1);
  shadow.scale.setScalar((1+gap*.2)*modelSize);
 }
 // Test the actual moving mesh silhouette, including when the pointer is still.
 if(now-lastHitTest>35) {
  const hit=hitModel();
  hovered=!!hit;
  if(paintPending && !gesture && !isUnboxing()) {paintStroke(hit);paintPending=false;}
  host.style.cursor=luckyDraw.isDragging()?'grabbing':shakeStarted!==null?'wait':gesture?'grabbing':hovered?(luckyDraw.isRevealed()?'grab':isUnboxing()?'pointer':'grab'):'default';
  host.dataset.hovered=String(hovered);
  lastHitTest=now;
 }

 renderer.render(scene,camera);
 if(ready&&!pageRevealed){
  pageRevealed=true;document.querySelector('#loader-progress').style.width='100%';
  requestAnimationFrame(()=>{document.body.classList.remove('page-loading');document.body.classList.add('page-ready');document.querySelector('main').inert=false;document.querySelector('#page-loader').classList.add('leaving');setTimeout(()=>document.querySelector('#page-loader').remove(),500);});
 }
 updateGallery(dt,unwrap,now,unboxing);
});

addEventListener('slop-unboxing',()=>{luckyDraw.load(selectLuckyDraw()).catch(()=>{});cancelGesture();pinColor(true);unlockUnwrap();host.setAttribute('aria-label','Your blind box, ready to unbox.');});

addEventListener('slop-tear-start',()=>{animateTear=createBoxTear(tearPairs);});
