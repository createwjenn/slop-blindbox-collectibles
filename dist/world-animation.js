import * as THREE from 'three';
export function inPlaceClip(clip,hips){
 const copy=clip.clone();
 for(const track of copy.tracks){
  if(!/hips\.position$/i.test(track.name))continue;
  // Keep the vertical gait, but let navigation own horizontal displacement.
  for(let i=0;i<track.values.length;i+=3){track.values[i]=hips.x;track.values[i+2]=hips.z;}
 }
 return copy;
}
export function createWorldAnimator(object,clips){
 let hips;object.traverse(node=>{if(node.isBone&&/hips$/i.test(node.name))hips=node.position.clone();});
 const walk=clips.find(clip=>/walk/i.test(clip.name)),run=clips.find(clip=>/run/i.test(clip.name));
 if(!walk||!run||!hips)throw new Error('The world character needs walk, run and hip animation data.');
 const mixer=new THREE.AnimationMixer(object);
 const actions={walk:mixer.clipAction(inPlaceClip(walk,hips)),run:mixer.clipAction(inPlaceClip(run,hips))};
 let state='walk';actions.walk.play();mixer.update(0);
 return {
  update(running,dt){
   const next=running?'run':'walk';
   if(next!==state){const old=actions[state];actions[next].reset().setEffectiveTimeScale(1).setEffectiveWeight(1).play();old.crossFadeTo(actions[next],.2,false);state=next;}
   mixer.update(dt);
  },
  dispose(){mixer.stopAllAction();mixer.uncacheRoot(object);},
  get state(){return state;}
 };
}
