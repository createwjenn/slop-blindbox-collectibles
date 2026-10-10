import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../dist/world-jump.js',import.meta.url),'utf8');
const {createJump}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
for(const fps of [30,60,120]){
 const jump=createJump();assert.equal(jump.start(),true);assert.equal(jump.start(),false);
 let peak=0;for(let i=0;i<fps;i++){peak=Math.max(peak,jump.update(1/fps));if(i===Math.floor(fps/4))assert.equal(jump.start(),false,'no midair jump');}
 assert.ok(peak>.43&&peak<.45,'consistent jump height');assert.equal(jump.height,0,'lands without sinking');assert.equal(jump.start(),true,'can jump after landing');jump.update(.02);jump.reset();assert.equal(jump.height,0);
}
console.log('PASS: takeoff, no double jump, consistent arc, landing and reset');
