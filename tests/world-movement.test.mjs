import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../dist/world-movement.js',import.meta.url),'utf8');
const {stepCharacter}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const navigation=JSON.parse(await readFile(new URL('../dist/assets/world/navigation.json',import.meta.url)));
let p={x:.09,y:-.6,z:.09},yaw=0;
for(let i=0;i<60;i++){const s=stepCharacter(navigation,p,yaw,1,0,1/60);p=s;yaw=s.yaw;}
assert.ok(p.z<-.65,'forward moves through supported ground');
const stopped=stepCharacter({cell:1,ground:{}},p,0,1,0,.04);
assert.equal(stopped.moved,false,'cannot walk off unsupported terrain');
const wall=stepCharacter({cell:1,ground:{'0,0':5}},{x:.1,y:0,z:.5},0,1,0,.04);
assert.equal(wall.moved,false,'cannot climb abrupt walls');
assert.ok(stepCharacter(navigation,p,0,0,1,.02).yaw>0,'left turn');
assert.ok(stepCharacter(navigation,p,0,0,-1,.02).yaw<0,'right turn');
console.log('PASS: forward travel, unsupported ground, abrupt walls, and left/right turning');
