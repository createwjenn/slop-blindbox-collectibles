import * as THREE from 'three';
import {createCoinState} from './world-coin-state.js';
const themes={
 'niu-lai':['#d4f591','#57792f','✦','Jade coins'],
 'strawberlina':['#ff7196','#9a203f','♥','Berry coins'],
 'bananito':['#ffe779','#ad7621','★','Banana gold'],
 'tung-tung-tung':['#dfae69','#704320','✦','Amber coins'],
 'tralalero-tralala':['#87edf0','#167a96','≈','Sea coins'],
 'ballerina-capuccina':['#ffdbd4','#ac6c76','✦','Rose gold coins'],
 'chill-guy':['#d7edaa','#638649','✿','Meadow coins'],
 'secret-capybara-toilet':['#ffc6e4','#b76596','✿','Blossom coins']
};
export function createWorldCoins(scene,nav,spawn,slug,swimming){
 const state=createCoinState(nav,spawn,swimming),[color,ink,symbol,label]=themes[slug];
 const hud=document.querySelector('#coins'),score=document.querySelector('#coin-score'),notice=document.querySelector('#coin-notice');
 hud.style.setProperty('--coin-color',color);document.querySelector('#coin-kind').textContent=label;
 const canvas=document.createElement('canvas');canvas.width=128;canvas.height=128;
 const ctx=canvas.getContext('2d');ctx.fillStyle=color;ctx.fillRect(0,0,128,128);ctx.strokeStyle=ink;ctx.lineWidth=5;ctx.beginPath();ctx.arc(64,64,53,0,Math.PI*2);ctx.stroke();ctx.fillStyle=ink;ctx.font='bold 68px Georgia';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(symbol,64,66);
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
 const face=new THREE.MeshStandardMaterial({map:texture,metalness:.35,roughness:.3,emissive:color,emissiveIntensity:.12});
 const rim=new THREE.MeshStandardMaterial({color,metalness:.65,roughness:.25});
 const geometry=new THREE.CylinderGeometry(.095,.095,.025,32),meshes=[];
 for(const coin of state.coins){const group=new THREE.Group(),mesh=new THREE.Mesh(geometry,[rim,face,face]);mesh.rotation.x=Math.PI/2;group.add(mesh);group.position.set(coin.x,coin.y,coin.z);scene.add(group);meshes.push(group);}
 let until=0;
 function renderScore(){score.textContent=`${state.score} pts`;hud.setAttribute('aria-label',`${label}: ${state.score} points, ${state.coins.filter(c=>c.collected).length} of ${state.coins.length} collected`);}
 renderScore();
 return {update(time,position,jumpHeight){
  const hits=state.collect(position,jumpHeight);
  if(hits.length){renderScore();notice.textContent=state.coins.every(c=>c.collected)?'All coins collected!':`+${hits.length*10}`;until=time+1.2;}
  notice.style.opacity=time<until?'1':'0';
  state.coins.forEach((coin,i)=>{const mesh=meshes[i];if(coin.collected){mesh.visible=false;return;}mesh.rotation.y=time*1.7+i;mesh.position.y=coin.y+Math.sin(time*2.5+i)*.035;});
 },dispose(){for(const mesh of meshes)scene.remove(mesh);geometry.dispose();face.dispose();rim.dispose();texture.dispose();}};
}
