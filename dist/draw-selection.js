// Approved odds: preserve the secret's 1/16 marginal chance and
// share the remainder equally across seven regular figures.
export const drawOdds=Array.from({length:8},(_,i)=>i===7?1/16:15/112);
export function transitionOdds(previous){
 if(!Number.isInteger(previous)||previous<0||previous>7)return [...drawOdds];
 if(previous===7)return [...Array(7).fill(1/7),0];
 // This no-repeat transition preserves drawOdds as its stationary distribution.
 return Array.from({length:8},(_,i)=>i===previous?0:i===7?1/15:7/45);
}
export function pickDraw(previous,random){
 const probabilities=transitionOdds(previous);let cumulative=0;
 for(let i=0;i<probabilities.length;i++){cumulative+=probabilities[i];if(random<cumulative)return i;}
 return probabilities.findLastIndex(p=>p>0);
}
const key='slop-last-claimed-figurine-v1';
export function selectLuckyDraw(){
 let previous=null;
 try{const saved=sessionStorage.getItem(key);if(saved!==null)previous=Number(saved);}catch{}
 const value=new Uint32Array(1);crypto.getRandomValues(value);
 const selected=pickDraw(previous,value[0]/4294967296);
 try{sessionStorage.setItem(key,String(selected));}catch{}
 return selected;
}
