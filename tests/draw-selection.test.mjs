import assert from 'node:assert/strict';
import {drawOdds,transitionOdds,pickDraw} from '../dist/draw-selection.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-12,`${a} != ${b}`);
near(drawOdds.reduce((a,b)=>a+b,0),1);
for(let previous=0;previous<8;previous++){
 const row=transitionOdds(previous);near(row.reduce((a,b)=>a+b,0),1);assert.equal(row[previous],0);
 for(let sample=0;sample<1000;sample++)assert.notEqual(pickDraw(previous,sample/1000),previous);
}
for(let next=0;next<8;next++)near(drawOdds.reduce((sum,p,prev)=>sum+p*transitionOdds(prev)[next],0),drawOdds[next]);
assert.equal(pickDraw(null,0),0);assert.equal(pickDraw(null,.999999),7);
console.log('PASS: complete odds, no repeats, and preserved long-run distribution');
