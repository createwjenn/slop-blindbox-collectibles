import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const source=readFileSync(new URL('../dist/hand-unboxing.js',import.meta.url),'utf8');
const functionSource=source.slice(source.indexOf('export function fingerCurl'),source.indexOf('export function offerHandUnboxing')).replace('export ','');
const score=new Function('const clamp=v=>Math.max(0,Math.min(1,v));'+functionSource+'return fingerCurl;')();
function hand(curled){
 const points=Array.from({length:21},()=>({x:0,y:0,z:0}));
 for(const base of [5,9,13,17]){
  const x=base/10;
  points[base]={x,y:0,z:0};points[base+1]={x,y:1,z:0};
  points[base+2]={x:x+(curled?.15:0),y:curled?.55:2,z:0};
  points[base+3]={x:x+(curled?.1:0),y:curled?.1:3,z:0};
 }
 return points;
}
assert.equal(score(null),0);
assert.ok(score(hand(false))<.22,'open hand arms tracking');
assert.ok(score(hand(true))>.55,'curled fingers trigger opening');
const rotated=hand(true).map(p=>({x:p.y*2+10,y:-p.x*2+4,z:0}));
assert.ok(Math.abs(score(rotated)-score(hand(true)))<1e-9,'curl is invariant to hand size and rotation');
console.log('PASS: open, curled, missing, and transformed hands');
