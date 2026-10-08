import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../dist/world-input.js',import.meta.url),'utf8');
const {worldInput}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
for(const key of ['KeyW','KeyA','KeyS','KeyD']){
 const input=worldInput(new Set([key]));assert.equal(input.forward,0);assert.equal(input.turn,0);assert.equal(input.running,false);assert.ok(input.cameraYaw||input.cameraPitch);
}
for(const key of ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight']){
 const input=worldInput(new Set([key]));assert.equal(input.running,true);assert.equal(input.cameraYaw,0);assert.equal(input.cameraPitch,0);assert.ok(input.forward||input.turn);
}
assert.equal(worldInput(new Set()).running,false);
console.log('PASS: arrows control running/movement; WASD only controls camera; no keys selects walking');
