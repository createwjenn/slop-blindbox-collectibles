import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const elements=new Map();
function element(){return {hidden:false,disabled:false,dataset:{},classList:{add(){},remove(){}},setAttribute(){},append(){},getContext(){return {clearRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},arc(){},fill(){}}},querySelector(selector){if(!elements.has(selector))elements.set(selector,element());return elements.get(selector);}};}
let requests=0;
const stage=element(),panel=element();
const source=readFileSync(new URL('../dist/hand-unboxing.js',import.meta.url),'utf8').replace(/^import .*\n/,'').replaceAll('export ','').replaceAll('import.meta.url',"'https://example.test/hand-unboxing.js'");
const context=vm.createContext({document:{querySelector:()=>stage,createElement:()=>panel,addEventListener(){}},navigator:{mediaDevices:{getUserMedia(){requests++;return new Promise(()=>{});}}},window:{dispatchEvent(){}},CustomEvent:class {},addEventListener(){},playSound(){},clearTimeout(){},clearInterval(){},performance:{now:()=>0},URL});
vm.runInContext(source,context);
vm.runInContext('offerHandUnboxing();offerHandUnboxing()',context);
assert.equal(requests,1,'camera starts automatically, without a button or duplicate requests');
function hand(curled){const points=Array.from({length:21},()=>({x:0,y:0,z:0}));for(const base of [5,9,13,17]){const x=base/10;points[base]={x,y:0,z:0};points[base+1]={x,y:1,z:0};points[base+2]={x,y:curled?.55:2,z:0};points[base+3]={x,y:curled?.1:3,z:0};}return points;}
context.openHand=hand(false);context.closedHand=hand(true);
vm.runInContext('for(let i=0;i<5;i++)receiveHand(openHand);for(let i=0;i<3;i++)receiveHand(closedHand);',context);
assert.equal(stage.dataset.state,'opening');
vm.runInContext('receiveHand(openHand);receiveHand(null);',context);
assert.ok(vm.runInContext('updateHandUnboxing(1.5)',context)>.42,'body tear continues after the hand disappears');
assert.equal(vm.runInContext('updateHandUnboxing(1.5)',context),1,'one closure completes the whole box');
assert.equal(stage.dataset.state,'opened');
assert.equal(elements.get('[data-camera]').hidden,true,'no camera button remains after opening');
console.log('PASS: automatic camera request and complete opening after one closure, then hand loss');
