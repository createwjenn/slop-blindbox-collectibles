import { playSound } from './sound-effects.js?v=4';
import * as THREE from 'three';
import { GLTFLoader } from './vendor/GLTFLoader.js';
const entries=[
 ['Niu Lai','niu-lai'],['Strawberlina','strawberlina'],['Bananito','bananito'],
 ['Tung Tung Tung','tung-tung-tung'],['Tralalero Tralala','tralalero-tralala'],
 ['Ballerina Capuccina','ballerina-capuccina'],['Chill Guy','chill-guy'],
 ['Secret Capybara Toilet','secret-capybara-toilet']
];
export function createGallery(studio){
 const gallery=document.querySelector('#collectible-gallery');
 const grid=gallery.querySelector('.collectible-grid');
 const cards=entries.map(([name,slug],i)=>{
  const card=document.createElement('article');card.className='collectible-card';
  card.innerHTML=`<div class="collectible-view" tabindex="0" role="img" aria-label="${name}, 3D collectible. Drag horizontally or use left and right arrows to rotate."><span class="collectible-loading" aria-label="Loading ${name}"></span></div>`;
  if(i===7){
   card.classList.add('secret-collectible');
   card.querySelector('.collectible-view').setAttribute('aria-label','Secret collectible, blurred mystery figure.');
   card.querySelector('.collectible-loading').setAttribute('aria-label','Loading secret collectible');
   const cover=document.createElement('span');cover.className='secret-cover';
   cover.setAttribute('aria-hidden','true');cover.innerHTML='<span>?</span>';
   card.querySelector('.collectible-view').append(cover);
  }
  grid.append(card);
  const view=card.querySelector('.collectible-view');
  const scene=new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xf4f7ff,0x77717d,1.5));
  const key=new THREE.DirectionalLight(0xfff3e5,3.5);key.position.set(-3,5,5);scene.add(key);
  const fill=new THREE.DirectionalLight(0xe3edff,1.8);fill.position.set(4,2,3);scene.add(fill);
  const rim=new THREE.DirectionalLight(0xffffff,2);rim.position.set(2,3,-4);scene.add(rim);
  const camera=new THREE.PerspectiveCamera(32,1,.01,100);camera.position.set(0,.1,5.6);camera.lookAt(0,0,0);
  const pivot=new THREE.Group();scene.add(pivot);
  const item={card,index:i,view,scene,camera,pivot,slug,yaw:0,lift:0,hovered:false,drag:null,loaded:false};
  view.addEventListener('pointerenter',()=>{item.hovered=true;if(!gallery.inert)playSound('hover',.12);});
  view.addEventListener('pointerleave',()=>{item.hovered=false;});
  view.addEventListener('focus',()=>{item.focused=true;if(!gallery.inert)playSound('hover',.12);});
  view.addEventListener('blur',()=>{item.focused=false;});
  view.addEventListener('pointerdown',e=>{if(e.button!==0)return;item.drag={id:e.pointerId,x:e.clientX};view.setPointerCapture(e.pointerId);view.style.cursor='grabbing';});
  view.addEventListener('pointermove',e=>{if(item.drag?.id===e.pointerId){item.yaw+=(e.clientX-item.drag.x)*.012;item.drag.x=e.clientX;}});
  const release=()=>{item.drag=null;view.style.cursor='grab';};
  view.addEventListener('pointerup',release);view.addEventListener('pointercancel',release);view.addEventListener('lostpointercapture',release);
  view.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();item.yaw+=e.key==='ArrowLeft'?-.15:.15;}});
  return item;
 });
 const burialPlane=new THREE.Plane(new THREE.Vector3(0,1,0),1.0);
 let renderer=null,environment=null,started=false,elapsed=0,previousWidth=0,previousHeight=0,last=0;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 async function load(item){
  const label=item.view.querySelector('.collectible-loading');
  try{
   const gltf=await new GLTFLoader().loadAsync(`./assets/collectibles/${item.slug}.glb`);
   const content=gltf.scene;
   if(item.index===7){
    // A single unlit gray material conceals all colors and surface details.
    const silhouette=new THREE.MeshBasicMaterial({color:0x8d9299});
    content.traverse(object=>{if(object.isMesh)object.material=silhouette;});
   }
   content.traverse(o=>{if(o.isMesh){for(const m of (Array.isArray(o.material)?o.material:[o.material]))m.clippingPlanes=[burialPlane];}});
   const bounds=new THREE.Box3().setFromObject(content);
   const size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
   content.position.sub(center);const normalized=new THREE.Group();normalized.add(content);
   normalized.scale.setScalar(2.15/Math.max(size.x,size.y,size.z));item.pivot.add(normalized);
   item.loaded=true;item.view.dataset.loaded='true';label.remove();
  }catch(error){
   console.error(`Could not load ${item.slug}`,error);
   label.textContent='Could not load. ';const retry=document.createElement('button');retry.textContent='Retry';
   retry.onclick=e=>{e.stopPropagation();label.textContent='Loading…';load(item);};label.append(retry);
  }
 }
 async function start(){
  started=true;
  renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'high-performance'});
  renderer.localClippingEnabled=true;
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setClearColor(0,0);
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
  renderer.domElement.className='gallery-canvas';renderer.domElement.setAttribute('aria-hidden','true');
  gallery.prepend(renderer.domElement);
  const pmrem=new THREE.PMREMGenerator(renderer);environment=pmrem.fromScene(studio,.15).texture;pmrem.dispose();
  cards.forEach(item=>{item.scene.environment=environment;item.scene.environmentIntensity=.6;});
  // Bound concurrent downloads and texture uploads on mobile hardware.
  let next=0;
  await Promise.all([0,1].map(async()=>{while(next<cards.length)await load(cards[next++]);}));
  gallery.dataset.loaded='true';
 }
 return function update(dt,unwrap,now,unboxing=0){
  if(unwrap>.02&&!started)start();
  const sink=THREE.MathUtils.smootherstep(unboxing,0,.48);
  burialPlane.constant=unboxing>0?1.0:100;
  const opacity=THREE.MathUtils.smoothstep(unwrap,.75,1)*(1-THREE.MathUtils.smoothstep(sink,.75,1));
  gallery.style.opacity=String(opacity);gallery.style.visibility=opacity>0?'visible':'hidden';
  gallery.inert=opacity<.95||unboxing>0;
  if(!renderer||opacity===0||document.hidden)return;
  if(!reduced.matches)elapsed+=dt;
  if(now-last<1000/30)return;last=now;
  const w=innerWidth,h=innerHeight;
  if(previousWidth!==w||previousHeight!==h){renderer.setSize(w,h);previousWidth=w;previousHeight=h;}
  renderer.setScissorTest(false);renderer.setViewport(0,0,w,h);renderer.clear();renderer.setScissorTest(true);
  // One horizontal lineup: four figures, the half-size box, four figures.
  const narrow=w<650;
  const centerGap=w*(narrow?.19:.095);
  const outerMargin=w*.018;
  const sideSpace=w/2-centerGap-outerMargin;
  const cellWidth=sideSpace/4;
  const cardWidth=cellWidth*.96;
  const viewHeight=Math.min(h*.28,Math.max(65,cardWidth*1.5));
  for(const item of cards){
   const onLeft=item.index<4;
   const position=item.index%4;
   const x=onLeft?outerMargin+(position+.5)*cellWidth:w/2+centerGap+(position+.5)*cellWidth;
   item.card.style.width=`${cardWidth}px`;
   item.card.style.left=`${x}px`;
   item.card.style.top=`${h/2}px`;
   item.view.style.height=`${viewHeight}px`;
   if(!item.loaded)continue;
   const rect=item.view.getBoundingClientRect();
   if(rect.bottom<0||rect.top>h||rect.right<0||rect.left>w)continue;
   item.camera.aspect=rect.width/rect.height;
   item.camera.position.z=Math.max(4.5,3.4/item.camera.aspect);item.camera.updateProjectionMatrix();
   item.pivot.rotation.y=item.yaw+(reduced.matches?0:Math.sin(elapsed*.4)*.08);
   const liftTarget=(item.hovered||item.focused)&&unboxing===0?.24:0;
   item.lift=reduced.matches?liftTarget:THREE.MathUtils.lerp(item.lift,liftTarget,.18);
   item.pivot.position.y=(reduced.matches?0:Math.sin(elapsed*.75)*.025)+item.lift-sink*2.9;
   if(item.index===7)item.view.querySelector('.secret-cover').style.transform=`translateY(${-item.lift*viewHeight/3}px)`;
   if(item.index===7)item.view.querySelector('.secret-cover').style.opacity=String(1-sink);
   renderer.setViewport(rect.left,h-rect.bottom,rect.width,rect.height);
   renderer.setScissor(Math.max(0,rect.left),Math.max(0,h-rect.bottom),Math.min(w,rect.right)-Math.max(0,rect.left),Math.min(h,rect.bottom)-Math.max(0,rect.top));
   renderer.render(item.scene,item.camera);
  }
  renderer.setScissorTest(false);
 };
}
