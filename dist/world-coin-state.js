// Place collectibles only on terrain reachable from this world's starting point.
export function createCoinState(nav,spawn,swimming=false){
 const key=(x,z)=>`${x},${z}`,cell=nav.cell;
 const start=[Math.floor(spawn.x/cell),Math.floor(spawn.z/cell)];
 const queue=[start],seen=new Set([key(...start)]),coins=[];
 const base=h=>swimming?Math.max(h,nav.waterLevel-.30):h;
 for(let i=0;i<queue.length;i++){
  const [x,z]=queue[i],h=nav.ground[key(x,z)];
  if(h===undefined)continue;
  const point={x:(x+.5)*cell,y:base(h)+.32,z:(z+.5)*cell,collected:false};
  if(Math.hypot(point.x-spawn.x,point.z-spawn.z)>.38&&coins.length<32&&coins.every(c=>Math.hypot(c.x-point.x,c.z-point.z)>.58))coins.push(point);
  for(const [dx,dz] of [[0,-1],[1,0],[-1,0],[0,1]]){
   const next=key(x+dx,z+dz),nh=nav.ground[next];
   if(!seen.has(next)&&nh!==undefined&&Math.abs(base(nh)-base(h))<.22){seen.add(next);queue.push([x+dx,z+dz]);}
  }
 }
 let score=0;
 return {coins,get score(){return score;},collect(position,jumpHeight=0){
  const hits=[];
  for(const coin of coins)if(!coin.collected&&Math.hypot(coin.x-position.x,coin.z-position.z)<.25&&Math.abs(coin.y-(position.y+jumpHeight+.3))<.5){coin.collected=true;score+=10;hits.push(coin);}
  return hits;
 }};
}
