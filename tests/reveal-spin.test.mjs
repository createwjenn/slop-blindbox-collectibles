import {readFileSync} from 'node:fs';import assert from 'node:assert/strict';
const source=readFileSync(new URL('../dist/lucky-draw.js',import.meta.url),'utf8');
const code=source.slice(source.indexOf('export const SPIN_LIMIT'),source.indexOf('export function createLuckyDraw')).replaceAll('export ','');
const {limit,clamp}=new Function(code+'return {limit:SPIN_LIMIT,clamp:clampSpin};')();
assert.equal(limit,100*Math.PI/180);assert.equal(clamp(999),limit);assert.equal(clamp(-999),-limit);assert.equal(clamp(.2),.2);
console.log('PASS: spin clamps at ±100 degrees and preserves in-range rotation');
