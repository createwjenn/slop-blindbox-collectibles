// Live, pointer-driven silver halftones. No image, video, or silhouette source.
const canvas=document.querySelector('#ascii-background');
const ctx=canvas.getContext('2d',{alpha:true});
const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)');
let width=0,height=0,ratio=1,time=0,lastFrame=0,visibility=0;
const trail=[];
let previous=null;
const stamps=Array.from({length:16},(_,level)=>{
 const sprite=document.createElement('canvas');sprite.width=32;sprite.height=32;
 const c=sprite.getContext('2d'),power=level/15;
 c.fillStyle=level>11?'#91acb7':level>6?'#789da9':'#698f9c';
 c.shadowBlur=0;
 c.textAlign='center';c.textBaseline='middle';
 c.font=`${7+power*5}px monospace`;
 const glyph=level<4?'.':level<7?':':level<10?'+':level<13?'*':'o';
 c.fillText(glyph,16,16);
 // Tiny hot cores keep the brightest cells close to silver halftone dots.
 if(level>12){c.beginPath();c.arc(16,16,1.3,0,Math.PI*2);c.fill();}
 return sprite;
});
function resize(){
 width=innerWidth;height=innerHeight;ratio=Math.min(devicePixelRatio,1.5);
 canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);
 ctx.setTransform(ratio,0,0,ratio,0,0);ctx.clearRect(0,0,width,height);
}
addEventListener('resize',resize);resize();
function addPoint(x,y){
 const radius=Math.min(190,Math.max(100,width*.16));
 trail.push({x,y,age:0,radius});
 if(trail.length>36) trail.shift();
}
addEventListener('pointermove',event=>{
 if(visibility<.01){previous=null;return;}
 const current={x:event.clientX,y:event.clientY};
 if(previous){
  const distance=Math.hypot(current.x-previous.x,current.y-previous.y);
  const count=Math.min(8,Math.max(1,Math.ceil(distance/24)));
  for(let i=1;i<=count;i++) addPoint(previous.x+(current.x-previous.x)*i/count,previous.y+(current.y-previous.y)*i/count);
 }else addPoint(current.x,current.y);
 previous=current;
},{passive:true});
addEventListener('pointerout',event=>{if(!event.relatedTarget) previous=null;},{passive:true});
addEventListener('blur',()=>{previous=null;});
export function updateAscii(dt,amount){
 visibility=amount;canvas.style.opacity=String(amount*.2);time+=dt;
 for(let i=trail.length-1;i>=0;i--){trail[i].age+=dt;if(trail[i].age>3)trail.splice(i,1);}
 if(amount<.001){trail.length=0;previous=null;return;}
 if(time-lastFrame<1/30) return;
 lastFrame=time;
 ctx.clearRect(0,0,width,height);
 if(!trail.length) return;
 const step=width<600?10:12;
 // Evaluate a flowing ribbon around recent pointer samples on a fixed text grid.
 const points=trail.map(p=>({...p,strength:Math.pow(1-p.age/3,2)}));
 const minX=Math.max(0,Math.min(...points.map(p=>p.x-p.radius*1.6)));
 const maxX=Math.min(width,Math.max(...points.map(p=>p.x+p.radius*1.6)));
 const minY=Math.max(0,Math.min(...points.map(p=>p.y-p.radius*1.6)));
 const maxY=Math.min(height,Math.max(...points.map(p=>p.y+p.radius*1.6)));
 for(let y=Math.floor(minY/step)*step;y<maxY;y+=step){
  for(let x=Math.floor(minX/step)*step;x<maxX;x+=step){
   let field=0;
   for(const p of points){
    const dx=(x-p.x)/p.radius,dy=(y-p.y)/p.radius;
    const d=dx*dx+dy*dy;
    if(d>2.6)continue;
    field=Math.max(field,Math.exp(-d*2.5)*p.strength);
   }
   if(field<.018)continue;
   const drift=reduceMotion.matches?0:time*.55;
   const ripple=.58+.42*Math.sin(x*.019+y*.014+Math.sin(y*.023-drift)*2.5+drift);
   const energy=Math.min(1,field*(.42+ripple*.95));
   const level=Math.min(15,Math.floor(energy*18));
   if(level<1)continue;
   ctx.globalAlpha=Math.min(1,energy*2.2);
   ctx.drawImage(stamps[level],x-16,y-16);
  }
 }
 ctx.globalAlpha=1;
}
