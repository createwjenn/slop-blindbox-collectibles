import { playSound } from './sound-effects.js?v=4';
import * as THREE from 'three';
import { updateAscii } from './ascii-background.js?v=meadow-shimmer-2';

// A real-time meadow: sculpted terrain, individual wind-blown blades and a
// procedural atmospheric sky. All detail is generated locally, without images.
const canvas=document.querySelector('#landscape-background');
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
let renderer,scene,camera,grass,terrain,target,postScene,postCamera,time=0,lastFrame=0;
const strokes=Array.from({length:8},()=>new THREE.Vector4(-10,-10,0,0));
let strokeIndex=0;
const viewport=new THREE.Vector2(innerWidth,innerHeight);
const cloudCursor=new THREE.Vector4(.5,.7,0,0);
const cloudResolution=new THREE.Vector2();
const pointer=new THREE.Vector2();
let pointerInside=false,visibleAmount=0,unboxingAmount=0,grassTried=false,skyTried=false;
const grassHint=document.querySelector('#grass-tap-hint'),skyHint=document.querySelector('#sky-tap-hint');
const hover=new THREE.Vector4(-10,-10,0,0);
addEventListener('pointerout',e=>{if(!e.relatedTarget)pointerInside=false;});
addEventListener('blur',()=>{pointerInside=false;});
addEventListener('pointermove',e=>{pointerInside=e.pointerType!=='touch';pointer.set(e.clientX/innerWidth-.5,e.clientY/innerHeight-.5);hover.set(e.clientX/innerWidth,1-e.clientY/innerHeight,1,0);strokes[strokeIndex++%8].set(e.clientX/innerWidth,1-e.clientY/innerHeight,1,0);},{passive:true});
const heightAt=(x,z)=>-1.1+7.8*Math.exp(-((x+22)**2/700+(z+38)**2/460))+5.6*Math.exp(-((x-27)**2/580+(z+57)**2/520))+.25*Math.sin(x*.09+z*.07);
// Broad variations follow the hillside slope, with a soft cloud shadow in the valley.
function meadowShade(x,z){
 const dx=(heightAt(x+.5,z)-heightAt(x-.5,z));
 const dz=(heightAt(x,z+.5)-heightAt(x,z-.5));
 const slope=THREE.MathUtils.clamp((-.72*dx-.38*dz+.42)/Math.sqrt(1+dx*dx+dz*dz),0,1);
 const cloud=Math.exp(-((x+8)**2/170+(z+29)**2/160));
 return THREE.MathUtils.clamp(.35+slope*.85-cloud*.25+.06*Math.sin(x*.2+z*.13),.23,1.1);
}
let seed=15937;
const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
function initialize(){
 renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'low-power'});
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
 renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
 scene=new THREE.Scene();scene.fog=new THREE.FogExp2('#afc6ad',.006);
 camera=new THREE.PerspectiveCamera(48,1,.1,240);
 camera.position.set(0,3.8,12);camera.lookAt(0,3,-30);
 scene.add(new THREE.HemisphereLight('#c4dded','#364423',1.25));
 const sun=new THREE.DirectionalLight('#fff0d2',2.7);sun.position.set(-30,35,-15);scene.add(sun);
 const sky=new THREE.Mesh(new THREE.SphereGeometry(190,32,20),new THREE.ShaderMaterial({
  side:THREE.BackSide,depthWrite:false,fog:false,
  uniforms:{ascent:{value:0},time:{value:0},cloudCursor:{value:cloudCursor},cloudResolution:{value:cloudResolution},cloudTrail:{value:strokes}},
  vertexShader:`varying vec3 ray;void main(){ray=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader:`varying vec3 ray;uniform float time;uniform float ascent;
  uniform vec4 cloudCursor;uniform vec4 cloudTrail[8];uniform vec2 cloudResolution;
  float hash(vec3 p){p=fract(p*.3183099+vec3(.1,.2,.3));p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
  float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
  float fbm(vec3 p){float n=0.,a=.5;for(int i=0;i<5;i++){n+=noise(p)*a;p=p*2.03+13.2;a*=.5;}return n;}
  float puff(vec3 p,vec3 center,vec3 radii){vec3 r=(p-center)/radii;return exp(-dot(r,r)*1.65);}
  float cloudDensity(vec3 p){
   float body=puff(p,vec3(-36.,23.,-85.),vec3(30.,11.,20.));
   body=max(body,puff(p,vec3(-44.,34.,-86.),vec3(17.,20.,18.)));
   body=max(body,puff(p,vec3(-23.,29.,-80.),vec3(15.,15.,17.)));
   body=max(body,puff(p,vec3(-61.,25.,-90.),vec3(14.,12.,16.)));
   body=max(body,puff(p,vec3(42.,25.,-108.),vec3(35.,12.,23.)));
   body=max(body,puff(p,vec3(39.,39.,-112.),vec3(20.,24.,21.)));
   body=max(body,puff(p,vec3(65.,32.,-106.),vec3(18.,18.,19.)));
   body=max(body,puff(p,vec3(17.,30.,-108.),vec3(15.,14.,18.)));
   body=max(body,puff(p,vec3(0.,28.,-185.),vec3(42.,20.,23.)));
   if(body<.10)return 0.;
   float detail=noise(p*.24)*.7+noise(p*.51)*.3;
   return smoothstep(.19,.62,body+detail*.17-.08);
  }
  void main(){vec3 d=normalize(ray);float h=max(d.y,0.);vec3 color=mix(vec3(.22,.54,.75),vec3(.015,.19,.40),pow(h,.42));
   // A soft displacement pushes the cloud volume out of the cursor's path.
   // Sample backward through that displacement to keep the edges pillowy.
   vec2 screen=gl_FragCoord.xy/cloudResolution;
   vec2 aspect=vec2(cloudResolution.x/cloudResolution.y,1.);
   vec2 delta=(screen-cloudCursor.xy)*aspect;
   float influence=exp(-dot(delta,delta)/.017)*cloudCursor.z;
   vec2 displacement=normalize(delta+vec2(.0001))*influence;
   float clearing=influence;
   for(int j=0;j<8;j++){
    vec2 wake=(screen-cloudTrail[j].xy)*aspect;
    float softness=exp(-dot(wake,wake)/.013)*cloudTrail[j].z*.2;
    displacement+=normalize(wake+vec2(.0001))*softness;
    clearing=max(clearing,softness);
   }
   float squish=1.+.12*sin(time*1.6+delta.y*18.);
   d=normalize(d-vec3(displacement*.052*squish,0.));
   // March through a cloud layer: dense sunlit tops and soft blue undersides.
   if(d.y>.035){
    float stepSize=46./(d.y*48.);
    float jitter=fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453);
    float distance=(10.-3.8)/d.y;
    vec4 accumulated=vec4(0.);
    for(int i=0;i<48;i++){
     vec3 q=vec3(0.,3.8,12.)+d*(distance+(float(i)+jitter)*stepSize);
     q.x+=time*.22;
     float density=cloudDensity(q)*(1.-min(.42,clearing*.35));
     if(density<.001)continue;
     float alpha=1.-exp(-density*stepSize*.32);
     float lightDensity=cloudDensity(q+vec3(-4.,6.,2.));
     float sunlight=clamp(.15+.55*exp(-lightDensity*3.)+.3*smoothstep(15.,42.,q.y),0.,1.);
     vec3 lit=mix(vec3(.24,.34,.48),vec3(1.16,1.12,1.03),sunlight);
     lit+=vec3(.1,.1,.09)*smoothstep(20.,48.,q.y);
     accumulated.rgb+=(1.-accumulated.a)*alpha*lit;
     accumulated.a+=(1.-accumulated.a)*alpha;
     if(accumulated.a>.985)break;
    }
    color=color*(1.-accumulated.a)+accumulated.rgb;
   }
   if(ascent>0.){
    vec3 blue=mix(vec3(.095,.31,.65),vec3(.022,.10,.38),pow(max(d.y,0.),.7));
    vec2 uv=d.xz/(max(d.y,.04)+.45);
    uv.x+=time*.004;
    float warp=fbm(vec3(uv*2.,2.4));
    vec2 flow=vec2(uv.x+warp*.8,uv.y+sin(uv.x*2.2)*.3+warp*.4);
    float sheet=fbm(vec3(flow*vec2(3.,3.8),6.));
    float filaments=fbm(vec3(flow*vec2(11.,13.),1.));
    float veil=smoothstep(.43,.7,sheet)*(.65+filaments*.45);
    vec3 cirrus=mix(blue,vec3(.95,.98,1.),veil*.8);
    color=mix(color,cirrus,ascent);
   }
   gl_FragColor=vec4(color,1.);#include <tonemapping_fragment>
   #include <colorspace_fragment>
  }`.replace('1.);#include','1.);\n#include')
 }));scene.add(sky);scene.userData.sky=sky;
 const textureCanvas=document.createElement('canvas');textureCanvas.width=1024;textureCanvas.height=1024;
 const ctx=textureCanvas.getContext('2d');ctx.fillStyle='#708143';ctx.fillRect(0,0,1024,1024);
 for(let i=0;i<100000;i++){const x=random()*1024,y=random()*1024;ctx.strokeStyle=['#94a260','#677b42','#b0b57b','#82924e'][i%4];ctx.globalAlpha=.2+random()*.5;ctx.lineWidth=.4+random();ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+(random()-.5)*7,y-2-random()*9);ctx.stroke();}
 const texture=new THREE.CanvasTexture(textureCanvas);texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(18,18);texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
 const geometry=new THREE.PlaneGeometry(180,170,180,170);geometry.rotateX(-Math.PI/2);geometry.translate(0,0,-65);
 const pos=geometry.attributes.position;for(let i=0;i<pos.count;i++)pos.setY(i,heightAt(pos.getX(i),pos.getZ(i)));geometry.computeVertexNormals();
 const terrainColors=[];for(let i=0;i<pos.count;i++){const shade=meadowShade(pos.getX(i),pos.getZ(i));terrainColors.push(shade*.91,shade,shade*.8);}
 geometry.setAttribute('color',new THREE.Float32BufferAttribute(terrainColors,3));
 terrain=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({map:texture,color:'#bdca8e',vertexColors:true,roughness:1}));scene.add(terrain);
 // Tapered, bent ribbons catch the warm sunlight on both sides.
 const blade=new THREE.PlaneGeometry(1,1,1,4);blade.translate(0,.5,0);
 const bp=blade.attributes.position;for(let i=0;i<bp.count;i++){const y=bp.getY(i);bp.setX(i,bp.getX(i)*(1-y*.97));bp.setZ(i,y*y*.24);}blade.computeVertexNormals();
 const material=new THREE.MeshStandardMaterial({color:'#b9c982',roughness:.92,side:THREE.DoubleSide});
 material.onBeforeCompile=shader=>{shader.uniforms.meadowTime={value:0};shader.uniforms.brushStrokes={value:strokes};shader.uniforms.hoverBreeze={value:hover};shader.uniforms.brushViewport={value:viewport};material.userData.shader=shader;shader.vertexShader='uniform float meadowTime; uniform vec4 brushStrokes[8]; uniform vec4 hoverBreeze; uniform vec2 brushViewport;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
  float gust=sin(instanceMatrix[3].x*.24+instanceMatrix[3].z*.18+meadowTime*1.3);
  vec4 rootClip=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(0.,0.,0.,1.);
  vec2 screen=rootClip.xy/rootClip.w*.5+.5;
  vec2 hoverDelta=(screen-hoverBreeze.xy)*brushViewport;
  float breeze=exp(-dot(hoverDelta,hoverDelta)/10000.)*hoverBreeze.z;
  vec2 push=vec2(.22+sin(meadowTime*2.1)*.12,.12*cos(meadowTime*1.7))*breeze;
  for(int i=0;i<8;i++){
   vec2 delta=(screen-brushStrokes[i].xy)*brushViewport;
   float influence=exp(-dot(delta,delta)/8500.)*brushStrokes[i].z;
   push+=normalize(delta+vec2(.1))*influence*.22;
  }
  float bend=position.y*position.y;
  transformed.x+=bend*(gust*.10+push.x)/max(length(instanceMatrix[0].xyz),.01);
  transformed.z+=bend*(sin(meadowTime+instanceMatrix[3].x*.2)*.08+push.y*.9);`);};
 const count=innerWidth<650?110000:330000;grass=new THREE.InstancedMesh(blade,material,count);
 const dummy=new THREE.Object3D(),color=new THREE.Color();
 for(let i=0;i<count;i++){const near=i<count*.88;const x=(random()-.5)*(near?55:150),z=12-random()*(near?55:135);dummy.position.set(x,heightAt(x,z)-.025,z);dummy.rotation.set(0,random()*Math.PI*2,0);const size=.24+random()*.42;dummy.scale.set(.018+random()*.03,size,1);dummy.updateMatrix();grass.setMatrixAt(i,dummy.matrix);color.setHSL(.19+random()*.045,.26+random()*.2,.39+random()*.18);color.multiplyScalar(meadowShade(x,z));grass.setColorAt(i,color);}
 grass.frustumCulled=false;scene.add(grass);
 target=new THREE.WebGLRenderTarget(1,1);
 postScene=new THREE.Scene();postCamera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
 postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),new THREE.ShaderMaterial({
  depthTest:false,depthWrite:false,uniforms:{image:{value:target.texture}},
  vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`,
  fragmentShader:`uniform sampler2D image;varying vec2 vUv;
  float bayer(vec2 p){p=mod(floor(p),2.);return mod(p.x+2.*p.y,4.);}
  void main(){vec3 c=texture2D(image,vUv).rgb;
   vec2 p=floor(gl_FragCoord.xy/1.25);
   float threshold=(4.*bayer(p)+bayer(floor(p*.5)))/16.-.5;
   c=floor(c*27.+threshold+.5)/27.;
   float weave=sin((p.x+p.y)*2.094)*.018;
   gl_FragColor=vec4(max(c+weave,0.),1.);
   #include <tonemapping_fragment>
   #include <colorspace_fragment>
  }`
 })));
 resize();
}
function resize(){if(!renderer)return;renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();viewport.set(innerWidth,innerHeight);cloudResolution.set(innerWidth*renderer.getPixelRatio(),innerHeight*renderer.getPixelRatio());target.setSize(Math.round(innerWidth*renderer.getPixelRatio()),Math.round(innerHeight*renderer.getPixelRatio()));}
addEventListener('resize',resize);
export function updateLandscape(dt,amount,unboxing=0){
 unboxingAmount=unboxing;
 visibleAmount=amount;
 if(grassHint)grassHint.hidden=grassTried||amount<.96||unboxing>0;
 if(skyHint)skyHint.hidden=skyTried||amount<.96||unboxing>0;
 const cloudEase=1-Math.exp(-dt*5);
 if(pointerInside){cloudCursor.x+=(hover.x-cloudCursor.x)*cloudEase;cloudCursor.y+=(hover.y-cloudCursor.y)*cloudEase;}
 cloudCursor.z+=((pointerInside?1:0)-cloudCursor.z)*(1-Math.exp(-dt*(pointerInside?2.4:.9)));
 hover.z=pointerInside?1:Math.max(0,hover.z-dt*2);
 updateAscii(dt,amount);
 for(const stroke of strokes)stroke.z=Math.max(0,stroke.z-dt*.65);
 if(amount<.001){atmosphere.style.opacity='0';return;}
 if(!renderer)initialize();
 time+=dt;if(time-lastFrame<1/30)return;lastFrame=time;
 const animatedTime=reducedMotion.matches?0:time;
 if(grass.material.userData.shader)grass.material.userData.shader.uniforms.meadowTime.value=animatedTime;
 scene.userData.sky.material.uniforms.time.value=animatedTime;
 scene.userData.sky.material.uniforms.ascent.value=THREE.MathUtils.smoothstep(unboxing,.2,.85);
 const targetX=reducedMotion.matches?0:pointer.x*.7;
 camera.position.x+=(targetX-camera.position.x)*.04;camera.lookAt(camera.position.x*.3,3+THREE.MathUtils.smootherstep(unboxing,.2,1)*36+(reducedMotion.matches?0:pointer.y*.12),-30);
 updateFlowers(animatedTime);
 updateBirds();
 renderer.setRenderTarget(target);renderer.render(scene,camera);renderer.setRenderTarget(null);renderer.render(postScene,postCamera);
 groundFigures(amount);
 groundCanvas.style.opacity=String(1-THREE.MathUtils.smoothstep(unboxing,.18,.62));
}

// A transparent foreground stitches the independently draggable collectibles
// into the meadow with feathered contact shade and wispy grass at their feet.
const atmosphere=document.querySelector('#meadow-atmosphere');
const groundCanvas=document.querySelector('#meadow-grounding');
const groundContext=groundCanvas.getContext('2d');
const grainCanvas=document.querySelector('#meadow-grain');
function resizeAtmosphere(){
 groundCanvas.width=innerWidth;groundCanvas.height=innerHeight;
 grainCanvas.width=innerWidth;grainCanvas.height=innerHeight;
 const g=grainCanvas.getContext('2d'),tile=document.createElement('canvas');tile.width=256;tile.height=256;
 const c=tile.getContext('2d'),pixels=c.createImageData(256,256);
 for(let i=0;i<pixels.data.length;i+=4){const v=Math.floor(random()*255);pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=v;pixels.data[i+3]=255;}
 c.putImageData(pixels,0,0);g.fillStyle=g.createPattern(tile,'repeat');g.fillRect(0,0,innerWidth,innerHeight);
}
addEventListener('resize',resizeAtmosphere);resizeAtmosphere();
function groundFigures(amount){
 const opacity=THREE.MathUtils.smoothstep(amount,.75,1);atmosphere.style.opacity=String(opacity);
 if(opacity===0)return;
 const ctx=groundContext;ctx.clearRect(0,0,innerWidth,innerHeight);
 const bases=Array.from(document.querySelectorAll('.collectible-view')).map(view=>{
  const r=view.getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height*.84,width:r.width*.76};
 });
 bases.push({x:innerWidth/2,y:innerHeight/2+innerHeight*.143,width:innerWidth*.12});
 for(const base of bases){
  const {x,y,width}=base;
  ctx.save();ctx.translate(x,y-2);ctx.scale(width*.72,Math.max(7,width*.14));
  const shadow=ctx.createRadialGradient(0,0,0,0,0,1);shadow.addColorStop(0,'rgba(35,48,20,.28)');shadow.addColorStop(.45,'rgba(42,57,26,.13)');shadow.addColorStop(1,'rgba(42,57,26,0)');ctx.fillStyle=shadow;ctx.fillRect(-1,-1,2,2);ctx.restore();
  // Seed per patch so grass stays rooted while a soft breeze bends the tips.
  let s=381;const rand=()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};
  for(let i=0;i<720;i++){
   const offset=(rand()-.5)*width*1.9;
   const fade=Math.pow(Math.max(0,1-Math.abs(offset)/(width*.95)),.55);
   const depth=rand();
   const px=x+offset,py=y+10+depth*44;
   const length=(20+rand()*27)*fade;
   const bend=(rand()-.5)*10+(reducedMotion.matches?0:Math.sin(time*1.2+i*.3)*2);
   ctx.strokeStyle=['#354725','#526438','#293c20','#657745'][i%4];ctx.globalAlpha=fade*.85*Math.pow(1-depth,1.3);
   ctx.lineWidth=.7+rand()*.85;ctx.beginPath();ctx.moveTo(px,py);ctx.quadraticCurveTo(px+bend*.2,py-length*.6,px+bend,py-length);ctx.stroke();
  }
 }
 ctx.globalAlpha=1;
}

// Small real 3D flowers stay rooted in the terrain and share its depth buffer.
const flowers=[];
const plantingRay=new THREE.Raycaster();
let plantingGesture=null;
addEventListener('pointerdown',event=>{
 if(unboxingAmount>0||event.button!==0||visibleAmount<.95||event.slopModelHit||event.target.closest('button,.collectible-card'))return;
 plantingGesture={id:event.pointerId,x:event.clientX,y:event.clientY,scroll:scrollY};
});
addEventListener('pointercancel',()=>{plantingGesture=null;});
addEventListener('pointerup',event=>{
 const down=plantingGesture;plantingGesture=null;
 if(!down||down.id!==event.pointerId||Math.hypot(event.clientX-down.x,event.clientY-down.y)>8||Math.abs(scrollY-down.scroll)>5||!terrain)return;
 plantingRay.setFromCamera(new THREE.Vector2(event.clientX/innerWidth*2-1,1-event.clientY/innerHeight*2),camera);
 const hit=plantingRay.intersectObject(terrain,false)[0];
 if(hit)plantFlower(hit.point);
 else launchBirds(plantingRay.ray);
});
const petalGeometry=new THREE.SphereGeometry(1,8,5);
const stemGeometry=new THREE.CylinderGeometry(.007,.01,.22,5);
const flowerMaterials={
 stem:new THREE.MeshStandardMaterial({color:'#496828',roughness:1}),
 white:new THREE.MeshStandardMaterial({color:'#fff9e9',roughness:.8}),
 yellow:new THREE.MeshStandardMaterial({color:'#f7cf38',roughness:.9}),
 gold:new THREE.MeshStandardMaterial({color:'#edb824',roughness:.9}),
 center:new THREE.MeshStandardMaterial({color:'#56351e',roughness:1})
};
function plantFlower(point){
 grassTried=true;if(grassHint)grassHint.hidden=true;
 playSound('flower',.1);
 const type=['daisy','dandelion','sunflower'][Math.floor(Math.random()*3)];
 const flower=new THREE.Group();flower.position.copy(point);flower.userData.type=type;
 const stem=new THREE.Mesh(stemGeometry,flowerMaterials.stem);flower.add(stem);
 const height=.65+Math.random()*.22;
 const leaves=[];for(let i=0;i<2;i++){const leaf=new THREE.Mesh(petalGeometry,flowerMaterials.stem);leaf.scale.set(.085,.018,.035);leaf.rotation.z=i===0?.45:-.45;leaf.position.x=i===0?.065:-.065;flower.add(leaf);leaves.push(leaf);}
 const head=new THREE.Group();head.position.y=.235;head.rotation.x=.3;head.rotation.y=Math.random()*Math.PI*2;flower.add(head);
 const count=type==='dandelion'?32:type==='daisy'?12:16;
 const petals=new THREE.InstancedMesh(petalGeometry,flowerMaterials[type==='daisy'?'white':type==='sunflower'?'gold':'yellow'],count);
 const dummy=new THREE.Object3D();
 for(let i=0;i<count;i++){
  const angle=i/count*Math.PI*2;
  if(type==='dandelion'){
   const elevation=Math.asin(1-2*(i+.5)/count),a=i*2.39996;
   dummy.position.set(Math.cos(a)*Math.cos(elevation)*.058,Math.sin(elevation)*.045,Math.sin(a)*Math.cos(elevation)*.058);
   dummy.scale.set(.015,.025,.014);dummy.rotation.set(0,a,elevation);
  }else{
   dummy.position.set(Math.sin(angle)*.064,0,Math.cos(angle)*.064);
   dummy.rotation.set(0,angle,0);dummy.scale.set(.018,.01,type==='sunflower'?.052:.043);
  }
  dummy.updateMatrix();petals.setMatrixAt(i,dummy.matrix);
 }
 head.add(petals);
 const center=new THREE.Mesh(petalGeometry,flowerMaterials[type==='sunflower'?'center':'yellow']);center.scale.set(.037,.023,.037);head.add(center);
 scene.add(flower);flowers.push({flower,stem,head,leaves,height,born:time,phase:Math.random()*6.28});
 // Keep the patch inexpensive during long planting sessions.
 if(flowers.length>180){const oldest=flowers.shift();scene.remove(oldest.flower);oldest.flower.traverse(o=>{if(o.isInstancedMesh)o.dispose();});}
 canvas.dataset.flowers=String(flowers.length);canvas.dataset.lastFlower=type;
}
const flowerScreen=new THREE.Vector3();
function updateFlowers(animatedTime){
 for(const {flower,stem,head,leaves,height,born,phase} of flowers){
  const growth=reducedMotion.matches?1:THREE.MathUtils.smoothstep(time-born,0,.55);
  const bloom=reducedMotion.matches?1:THREE.MathUtils.smoothstep(time-born,.12,.7);
  const stemHeight=.015+height*growth;
  stem.scale.set(1.5,stemHeight/.22,1.5);stem.position.y=stemHeight/2;
  head.position.y=stemHeight;head.scale.setScalar(.08+bloom*2.3);
  leaves.forEach((leaf,i)=>{leaf.position.y=stemHeight*(.3+i*.22);leaf.visible=growth>.15;});
  flowerScreen.copy(flower.position).project(camera);
  const distance=Math.hypot((flowerScreen.x*.5+.5-hover.x)*innerWidth,(flowerScreen.y*.5+.5-hover.y)*innerHeight);
  const breeze=Math.exp(-distance*distance/10000.)*hover.z;
  flower.rotation.z=Math.sin(animatedTime*1.8+phase)*(.035+breeze*.16);
  head.rotation.z=Math.sin(animatedTime*2+phase)*(.035+breeze*.1);
 }
}

// Small silhouetted birds launch from the clicked camera ray, then fan out
// into the distance. Shared geometry keeps repeated flocks lightweight.
const birds=[];
const birdMaterial=new THREE.MeshBasicMaterial({color:'#263c4b',side:THREE.DoubleSide});
const birdBodyGeometry=new THREE.SphereGeometry(1,8,5);
const birdWingGeometry=new THREE.BufferGeometry();
birdWingGeometry.setAttribute('position',new THREE.Float32BufferAttribute([
 0,0,0, .66,0,.10, .31,0,.26,
 0,0,0, .31,0,.26, 0,0,.15
],3));
birdWingGeometry.computeVertexNormals();
function launchBirds(ray){
 skyTried=true;if(skyHint)skyHint.hidden=true;
 playSound('birds',.25);
 const origin=ray.at(48,new THREE.Vector3());
 const count=4+Math.floor(Math.random()*3),direction=Math.random()<.5?-1:1;
 for(let i=0;i<count;i++){
  const bird=new THREE.Group();bird.position.copy(origin);
  const body=new THREE.Mesh(birdBodyGeometry,birdMaterial);body.scale.set(.065,.065,.24);bird.add(body);
  const left=new THREE.Mesh(birdWingGeometry,birdMaterial),right=new THREE.Mesh(birdWingGeometry,birdMaterial);left.scale.x=-1;bird.add(left,right);
  const size=.65+Math.random()*.35;bird.scale.setScalar(size);
  const velocity=new THREE.Vector3(direction*(1.8+Math.random()*2)+(i-count/2)*.7,1.3+Math.random()*1.6,-3.5-Math.random()*3);
  bird.rotation.y=Math.atan2(-velocity.x,-velocity.z);
  scene.add(bird);birds.push({bird,left,right,origin:origin.clone(),velocity,born:time+i*.07,phase:Math.random()*6.28});
 }
 while(birds.length>90)scene.remove(birds.shift().bird);
 canvas.dataset.birds=String(birds.length);
}
function updateBirds(){
 for(let i=birds.length-1;i>=0;i--){
  const item=birds[i],age=time-item.born;
  if(age>9){scene.remove(item.bird);birds.splice(i,1);continue;}
  item.bird.visible=age>=0;if(age<0)continue;
  const t=reducedMotion.matches?age*.7:age;
  item.bird.position.copy(item.origin).addScaledVector(item.velocity,t);
  item.bird.position.y+=Math.sin(t*.9+item.phase)*Math.min(t,.6)*.35;
  const flap=reducedMotion.matches?.15:Math.sin(age*12+item.phase)*.72;
  item.left.rotation.z=-flap;item.right.rotation.z=flap;
  item.bird.rotation.z=Math.sin(t*1.1+item.phase)*.09;
  const fade=THREE.MathUtils.smoothstep(age,7,9);
  item.bird.scale.setScalar((.75+Math.sin(item.phase)*.15)*(1-fade));
 }
 canvas.dataset.birds=String(birds.length);
}
