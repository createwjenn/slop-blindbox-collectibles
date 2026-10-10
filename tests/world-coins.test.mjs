import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../dist/world-coin-state.js',import.meta.url),'utf8');
const {createCoinState}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const folders=['world-niu-lai','world-strawberlina','world','world-tung-v2','world-tralalero','world-ballerina','world-chill-guy','world-capybara'];
for(const folder of folders){
 const nav=JSON.parse(await readFile(new URL(`../dist/assets/${folder}/navigation.json`,import.meta.url),'utf8'));
 let spawn=nav.spawn;
 if(!spawn){const a=Object.entries(nav.ground).map(([k,y])=>{let[x,z]=k.split(',').map(Number);return[(x+.5)*nav.cell,y,(z+.5)*nav.cell];}).filter(p=>Math.abs(p[1]+.6)<.3).sort((a,b)=>a[0]**2+a[2]**2-b[0]**2-b[2]**2);spawn=a[0];}
 const state=createCoinState(nav,{x:spawn[0],y:spawn[1],z:spawn[2]},folder==='world-tralalero');
 assert.ok(state.coins.length>0,folder+' has reachable coins');
 const coin=state.coins[0];assert.equal(state.collect({x:coin.x,y:coin.y+4,z:coin.z}).length,0,'no distant vertical pickup');
 assert.equal(state.collect({x:coin.x,y:coin.y-.3,z:coin.z}).length,1);assert.equal(state.score,10);
 assert.equal(state.collect({x:coin.x,y:coin.y-.3,z:coin.z}).length,0,'cannot collect twice');
 for(const c of state.coins)state.collect({x:c.x,y:c.y-.3,z:c.z});assert.equal(state.score,state.coins.length*10);
 console.log(folder,state.coins.length,'coins: PASS');
}
const isolated={cell:1,ground:{'0,0':0,'2,0':0,'0,1':3}};
assert.equal(createCoinState(isolated,{x:.5,y:0,z:.5}).coins.length,0,'disconnected and unclimbable surfaces excluded');
