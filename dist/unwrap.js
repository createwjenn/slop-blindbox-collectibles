import { playSound } from './sound-effects.js?v=4';
const stage=document.querySelector('main');
const title=document.querySelector('h1');
const paper=document.querySelector('#paper-sheet');
const tear=document.querySelector('#paper-tear');
const fibers=document.querySelector('#paper-fibers');
const hint=document.querySelector('#scroll-hint');
const claim=document.querySelector('main > .create-button');
const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)');
let unlocked=false,progress=0,lastProgress=-1,revealSoundPlayed=false;
let seed=7341;
const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
const edge=Array.from({length:151},(_,i)=>({x:i/150*1000,y:(random()-.5)*11+Math.sin(i*.41)*5+Math.sin(i*.12)*9}));
export function unlockUnwrap(){
 if(unlocked) return;
 unlocked=true;lastProgress=-1;document.body.classList.add('unwrap-unlocked');
 hint.textContent='Scroll to reveal';
}
export function isUnwrapUnlocked(){return unlocked;}
export function updateUnwrap(dt,forceReveal=false){
 const target=forceReveal?1:unlocked?Math.min(1,Math.max(0,window.scrollY/(innerHeight*1.3))):0;
 progress=reduceMotion.matches?target:progress+(target-progress)*(1-Math.exp(-dt*14));
 if(Math.abs(target-progress)<.0001) progress=target;
 const eased=progress*progress*(3-2*progress);
 if(progress===lastProgress) return eased;
 if(!revealSoundPlayed&&progress>lastProgress+.0001&&progress>.008&&!forceReveal){
  revealSoundPlayed=true;playSound('tear');
 }
 lastProgress=progress;
 // Keep one continuous sheet before scrolling: two shadowed halves can
 // leave an antialiased seam even when their edges overlap.
 if(eased===0){
  paper.setAttribute('d','M-20,-20 H1020 V1020 H-20 Z');
  tear.setAttribute('d','');fibers.setAttribute('d','');
 } else {
 // A rip starts at the top center and travels downward. The two paper
 // halves peel outward, keeping the torn edges on either side of the opening.
 const left=[],right=[];
 for(const point of edge){
  const y=point.x;
  const spread=Math.min(1,Math.max(0,eased*1.7-y/1000*.55));
  const opening=spread*spread*(3-2*spread)*540;
  const irregular=point.y*Math.min(1,opening/14);
  left.push([500+irregular-opening,y,opening]);
  right.push([500+irregular+opening,y,opening]);
 }
 const path=points=>points.map(([x,y],i)=>`${i?'L':'M'}${x.toFixed(2)},${y.toFixed(2)}`).join(' ');
 const leftOutline=left.map(([x,y])=>`L${x+.4},${y}`).join(' ');
 const rightOutline=right.map(([x,y])=>`L${x-.4},${y}`).join(' ');
 paper.setAttribute('d',`M-20,-20 L${left[0][0]+.4},-20 ${leftOutline} L${left.at(-1)[0]+.4},1020 H-20 Z M1020,-20 L${right[0][0]-.4},-20 ${rightOutline} L${right.at(-1)[0]-.4},1020 H1020 Z`);
 const line=path(left.filter(p=>p[2]>.8))+' '+path(right.filter(p=>p[2]>.8));
 tear.setAttribute('d',line.trim());
 fibers.setAttribute('d',line.trim());
 }
 const fade=Math.max(0,1-eased*1.3);
 title.style.transform=`scale(${1-eased*.75})`;
 title.style.opacity=String(fade);
 hint.style.opacity=String(Math.max(0,1-progress*7));
 claim.hidden=eased<.96||forceReveal;
 stage.classList.toggle('dark-stage',eased>.45);
 stage.dataset.unwrapProgress=progress.toFixed(3);
 return eased;
}
// Reloading always returns to the initial unwrapped interaction gate.
if('scrollRestoration' in history) history.scrollRestoration='manual';
window.scrollTo(0,0);
