const stage=document.querySelector('main');
const button=document.querySelector('.create-button');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let active=false,elapsed=0;
export function isUnboxing(){return active;}
button.addEventListener('click',()=>{
 if(active)return;
 active=true;stage.classList.add('unboxing');stage.dataset.state='unboxing-transition';
 button.disabled=true;button.inert=true;
 document.body.style.overflowY='hidden';
 window.dispatchEvent(new CustomEvent('slop-unboxing'));
});
export function updateUnboxing(dt){
 if(!active)return 0;
 elapsed+=dt;
 const progress=reduced.matches?1:Math.min(1,elapsed/2.8);
 if(progress===1){if(!stage.classList.contains('box-shaking')&&!stage.classList.contains('hand-opening'))stage.dataset.state='unboxing';stage.classList.add('unboxing-ready');}
 drawFlightClouds(progress);
 return progress;
}

const prompt=document.createElement('div');
prompt.className='unbox-prompt';prompt.setAttribute('role','status');
prompt.innerHTML='<span>CLICK TO UNBOX</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v17m-6-6 6 6 6-6"/></svg>';
stage.append(prompt);
const cloudBack=document.createElement('canvas'),cloudFront=document.createElement('canvas');
cloudBack.className='unboxing-clouds cloud-bed';cloudFront.className='unboxing-clouds cloud-mist';
cloudBack.setAttribute('aria-hidden','true');cloudFront.setAttribute('aria-hidden','true');stage.append(cloudBack,cloudFront);
const back=cloudBack.getContext('2d'),front=cloudFront.getContext('2d');
let boxTop=innerHeight*.21,boxBottom=innerHeight*.81;
export function setUnboxingBounds(top,bottom){
 boxTop=top;boxBottom=bottom;
 prompt.style.top=`${Math.max(24,boxTop-78)}px`;
}
// Each visit gets its own cloud shapes and eddies; nothing is tiled in rows.
// Fractal density textures form cloudy volumes instead of stroked curves.
function cloudNoise(x,y,seed){
 const ix=Math.floor(x),iy=Math.floor(y);let fx=x-ix,fy=y-iy;
 fx=fx*fx*(3-2*fx);fy=fy*fy*(3-2*fy);
 const hash=(a,b)=>{let n=Math.imul(a,374761393)^Math.imul(b,668265263)^seed;n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295;};
 const a=hash(ix,iy),b=hash(ix+1,iy),c=hash(ix,iy+1),d=hash(ix+1,iy+1);
 return (a+(b-a)*fx)*(1-fy)+(c+(d-c)*fx)*fy;
}
function cloudFbm(x,y,seed){let value=0,amp=.54;for(let i=0;i<5;i++){value+=cloudNoise(x,y,seed+i*73)*amp;x=x*2.07+7.1;y=y*2.03+3.7;amp*=.48;}return value;}
const cloudSprites=Array.from({length:9},()=>{
 const sprite=document.createElement('canvas');sprite.width=384;sprite.height=384;
 const ctx=sprite.getContext('2d'),pixels=ctx.createImageData(384,384);
 const seed=Math.floor(Math.random()*1000000);
 const lobes=Array.from({length:6},()=>({x:(Math.random()-.5)*.65,y:(Math.random()-.5)*.45,rx:.2+Math.random()*.2,ry:.18+Math.random()*.2}));
 for(let y=0;y<384;y++)for(let x=0;x<384;x++){
  const u=x/384*2-1,v=y/384*2-1;
  const n=cloudFbm(u*4+10,v*4+10,seed);
  const wx=u+(n-.5)*.28,wy=v+(cloudNoise(u*3+8,v*3+8,seed+9)-.5)*.22;
  let body=0;
  for(const l of lobes){const dx=(wx-l.x)/l.rx,dy=(wy-l.y)/l.ry;body=Math.max(body,Math.exp(-(dx*dx+dy*dy)*1.2));}
  const density=Math.max(0,body+(n-.52)*.6-.16);
  const edge=Math.max(0,Math.min(1,(1-Math.max(Math.abs(u),Math.abs(v)))*8));
  const alpha=(1-Math.exp(-density*5))*edge;
  const light=Math.max(0,Math.min(1,.73-v*.2+(n-.5)*.28));
  const i=(y*384+x)*4;
  pixels.data[i]=205+light*50;pixels.data[i+1]=222+light*33;pixels.data[i+2]=237+light*18;pixels.data[i+3]=alpha*255;
 }
 ctx.putImageData(pixels,0,0);return sprite;
});
const cloudClusters=Array.from({length:18},(_,i)=>({
 angle:i*2.39996+Math.random()*.6,
 radius:i<5?Math.random()*.13:.17+Math.random()*.45,
 size:.3+Math.random()*.26,
 lift:(Math.random()-.5)*.17,
 phase:Math.random()*Math.PI*2,
 speed:.025+Math.random()*.025,
 sprite:i%cloudSprites.length
}));
const flightWisps=Array.from({length:18},(_,i)=>({
 start:Math.random()*.55,angle:Math.random()*Math.PI*2,
 radius:.12+Math.random()*.38,size:.22+Math.random()*.26,sprite:i%9
}));
function resizeClouds(){for(const c of [cloudBack,cloudFront]){c.width=innerWidth;c.height=innerHeight;}}
addEventListener('resize',resizeClouds);resizeClouds();
function drawPuff(ctx,sprite,x,y,size,alpha,rotation=0){
 ctx.save();ctx.translate(x,y);ctx.rotate(rotation);ctx.globalAlpha=alpha;
 ctx.drawImage(cloudSprites[sprite],-size/2,-size/2,size,size);ctx.restore();
}
function drawFlightClouds(progress){
 const w=innerWidth,h=innerHeight,unit=Math.min(w,h*1.65);
 back.clearRect(0,0,w,h);front.clearRect(0,0,w,h);
 if(progress===0)return;
 const settle=Math.max(0,Math.min(1,(progress-.45)/.55));
 const motion=reduced.matches?0:elapsed;
 for(const c of cloudClusters){
  const angle=c.angle+motion*c.speed;
  const radius=c.radius*unit;
  const x=w/2+Math.cos(angle)*radius;
  const y=boxBottom+48+Math.sin(angle)*radius*.46+c.lift*h+(1-settle)*h*.4;
  const size=c.size*unit*(1+Math.sin(motion*.23+c.phase)*.07);
  drawPuff(back,c.sprite,x,y,size,settle*.65,Math.sin(angle)*.22);
  // A few low, wispy curls overlap the base without veiling the box face.
  if(c.radius<.22)drawPuff(front,c.sprite,x,Math.max(boxBottom+size*.28,y+45),size*.82,settle*.3,angle*.12);
 }
 if(!reduced.matches&&progress<1){
  for(const c of flightWisps){
   const phase=(progress-c.start)/.45;
   if(phase<0||phase>1)continue;
   const angle=c.angle+phase*2.6;
   const radius=c.radius*unit*(1-phase*.4);
   const x=w/2+Math.cos(angle)*radius;
   const y=-h*.18+phase*h*1.5+Math.sin(angle)*radius*.48;
   drawPuff(front,c.sprite,x,y,c.size*unit,Math.sin(phase*Math.PI)*.62,angle*.28);
  }
 }
}
