import { enterWorld } from './enter-world.js?v=1';
import { showWallpaper } from './wallpaper.js?v=center-6';
import { renderSocialReach } from './social-reach.js?v=1';
import * as THREE from 'three';
import { GLTFLoader } from './vendor/GLTFLoader.js';
export const collectibles=[
 {name:'Niu Lai',slug:'niu-lai'},
 {name:'Strawberlina',slug:'strawberlina'},
 {name:'Bananito',slug:'bananito'},
 {name:'Tung Tung Tung',slug:'tung-tung-tung'},
 {name:'Tralalero Tralala',slug:'tralalero-tralala'},
 {name:'Ballerina Capuccina',slug:'ballerina-capuccina'},
 {name:'Chill Guy',slug:'chill-guy'},
 {name:'Secret Capybara Toilet',slug:'secret-capybara-toilet'}
];
const descriptions=[
 'A cow-inspired member of the Slop crew, Niu Lai brings barnyard charm to the collection. Gentle and a little goofy, this little companion takes life at an easy pace.',
 'Strawberlina brings a strawberry twist to Slop’s surreal character collection. Sweet, spirited, and a little dramatic, she loves being the center of attention.',
 'Bananito is Slop’s playful banana character, inspired by the absurd food mashups of internet meme culture. Bouncy and mischievous, he turns every moment into a joke.',
 'Inspired by the Indonesian Tung Tung Tung Sahur meme and its rhythmic wake-up call, this wooden character carries a big presence. He is persistent, theatrical, and impossible to ignore.',
 'Tralalero Tralala comes from the Italian brainrot meme wave: a surreal shark in sneakers. Bold and restless, he brings cheeky, larger-than-life energy to the crew.',
 'Inspired by the Italian brainrot ballerina with a cappuccino-cup head, Ballerina Capuccina blends coffee culture with ballet. Graceful and delightfully dramatic, she treats every entrance like a performance.',
 'Chill Guy originates from artist Phillip Banks’s laid-back dog character, which became an internet meme. Unbothered and quietly confident, he takes everything in stride.',
 'Slop’s secret collectible gives the absurd world of Skibidi Toilet a capybara twist. Calm, curious, and completely unfazed, this rare little oddball takes the chaos in stride.'
];
export const SPIN_LIMIT=100*Math.PI/180;
export const clampSpin=value=>Math.max(-SPIN_LIMIT,Math.min(SPIN_LIMIT,value));
export function createLuckyDraw(model,host,camera){
 const holder=new THREE.Group();holder.visible=false;model.add(holder);
 let loadPromise=null,entry=null,fit=1,finalScale=1,announced=false,indexChosen=0;
 let drag=null,yaw=0,displayYaw=0,layout=0;
 const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
 const details=document.createElement('section');details.className='draw-details';details.hidden=true;
 details.innerHTML='<h2>Congrats! You got<strong></strong></h2><p class="draw-social-reach"></p><p class="draw-description"></p><div class="draw-actions"><button type="button" data-action="wallpaper">Get wallpaper</button><button type="button" data-action="world">Enter world</button></div>';details.setAttribute('aria-live','polite');document.querySelector('main').append(details);
 details.querySelector('[data-action=wallpaper]').addEventListener('click',()=>{
  const source=holder.userData.normalized?.children[0];
  if(entry&&source)showWallpaper(entry);
 });
 details.querySelector('[data-action=world]').addEventListener('click',()=>{if(entry&&announced)enterWorld(entry);});
 function hit(event){
  const rect=host.getBoundingClientRect();pointer.set((event.clientX-rect.left)/rect.width*2-1,1-(event.clientY-rect.top)/rect.height*2);
  raycaster.setFromCamera(pointer,camera);return raycaster.intersectObject(holder,true)[0];
 }
 host.addEventListener('pointerdown',event=>{
  if(!announced||event.button!==0||!hit(event))return;
  drag={id:event.pointerId,x:event.clientX};host.setPointerCapture(event.pointerId);host.style.cursor='grabbing';
 });
 host.addEventListener('pointermove',event=>{
  if(drag?.id!==event.pointerId)return;
  yaw=clampSpin(yaw+(event.clientX-drag.x)*.009);drag.x=event.clientX;
 });
 const release=event=>{if(drag?.id===event.pointerId){drag=null;if(host.hasPointerCapture(event.pointerId))host.releasePointerCapture(event.pointerId);}};
 host.addEventListener('pointerup',release);host.addEventListener('pointercancel',release);host.addEventListener('lostpointercapture',()=>{drag=null;});
 addEventListener('blur',()=>{drag=null;});
 host.addEventListener('keydown',event=>{
  if(!announced||!['ArrowLeft','ArrowRight','Home'].includes(event.key))return;
  event.preventDefault();event.stopImmediatePropagation();
  yaw=event.key==='Home'?0:clampSpin(yaw+(event.key==='ArrowLeft'?-.15:.15));
 });
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 return {
  load(index){
   if(loadPromise)return loadPromise;
   entry=collectibles[index];indexChosen=index;
   loadPromise=new GLTFLoader().loadAsync(`./assets/collectibles/${entry.slug}.glb`).then(gltf=>{
    const object=gltf.scene;
    const bounds=new THREE.Box3().setFromObject(object),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
    object.position.sub(center);
    const normalized=new THREE.Group();normalized.add(object);holder.add(normalized);
    // Fit within the actual container, including depth, so nothing pokes out.
    fit=Math.min(.46/size.x,.62/size.y,.32/size.z);
    finalScale=.74/Math.max(size.x,size.y,size.z);
    normalized.scale.setScalar(fit);
    holder.userData.normalized=normalized;
    holder.position.y=-.40+size.y*fit/2;
    holder.userData.restY=holder.position.y;
    object.traverse(mesh=>{if(mesh.isMesh){mesh.castShadow=true;mesh.receiveShadow=true;}});
    holder.visible=true;
   });
   return loadPromise;
  },
  whenReady(){return loadPromise||Promise.reject(new Error('No collectible selected'));},
  isRevealed(){return announced;},
  isDragging(){return !!drag;},
  intersect(ray){return ray.intersectObject(holder,true)[0]||null;},
  layoutOffset(){
   const h=2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*camera.position.z;
   const ease=THREE.MathUtils.smootherstep(layout,0,1);
   return innerWidth>700?new THREE.Vector3(-h*camera.aspect*.19*ease,0,0):new THREE.Vector3(0,h*.13*ease,0);
  },
  update(progress,time,dt=.016){
   if(!holder.userData.normalized)return;
   const rise=THREE.MathUtils.smootherstep(progress,.32,.92);
   holder.userData.normalized.scale.setScalar(THREE.MathUtils.lerp(fit,finalScale,rise));
   holder.position.y=THREE.MathUtils.lerp(holder.userData.restY,0,rise)+(reduced.matches?0:Math.sin(time*.8)*.012*rise);
   displayYaw+=(yaw-displayYaw)*(1-Math.exp(-dt*18));
   holder.rotation.y=THREE.MathUtils.lerp(0,Math.PI/4,rise)+displayYaw;
   if(progress===1){layout=Math.min(1,layout+dt/.75);host.dataset.spinDegrees=THREE.MathUtils.radToDeg(displayYaw).toFixed(1);}
   if(progress===1&&!announced){
    announced=true;
    details.querySelector('h2 strong').textContent=entry.name;
    renderSocialReach(details.querySelector('.draw-social-reach'),entry.slug);
    details.querySelector('.draw-description').textContent=descriptions[indexChosen];details.hidden=false;
    requestAnimationFrame(()=>details.classList.add('visible'));
    host.setAttribute('aria-label',`Your lucky draw: ${entry.name}. Drag to rotate up to 100 degrees each way. Left and right arrow keys rotate; Home resets.`);
    window.dispatchEvent(new CustomEvent('slop-collectible-revealed',{detail:{name:entry.name,secret:entry.slug==='secret-capybara-toilet'}}));
   }
  }
 };
}
