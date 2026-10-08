import { playSound } from './sound-effects.js?v=4';
const stage=document.querySelector('main');
const panel=document.createElement('section');panel.className='hand-unboxing';panel.hidden=true;
panel.setAttribute('aria-label','Open your blind box');
panel.innerHTML=`<p id="hand-status" class="hand-message" role="status"></p><div class="hand-preview" hidden aria-label="Live hand camera preview"><video autoplay playsinline muted></video><canvas width="320" height="240"></canvas><p class="camera-prompt" role="status">Raise your hand</p></div><div class="hand-actions"><button class="create-button" type="button" data-camera aria-describedby="hand-status">Open with hand</button></div>`;
stage.append(panel);
const message=panel.querySelector('.hand-message'),video=panel.querySelector('video'),preview=panel.querySelector('.hand-preview'),overlay=panel.querySelector('canvas'),ctx=overlay.getContext('2d');
const cameraButton=panel.querySelector('[data-camera]');
const cameraPrompt=panel.querySelector('.camera-prompt');
let tearCue=0;
let worker=null,stream=null,session=0,enabled=false,busy=false,lastFrame=-1,frameTimer=null,timeout=null;
let openFrames=0,armed=false,curlFrames=0,progress=0,running=false,completed=false,lastHand=0;
const clamp=v=>Math.max(0,Math.min(1,v));
export function fingerCurl(points){
 if(!points||points.length!==21)return 0;
 const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,(a.z||0)-(b.z||0));
 let total=0;
 for(const base of [5,9,13,17]){
  const m=points[base],p=points[base+1],tip=points[base+3];
  const length=distance(m,p)+distance(p,points[base+2])+distance(points[base+2],tip);
  total+=clamp((.91-distance(m,tip)/Math.max(.001,length))/.5);
 }
 return total/4;
}
export function offerHandUnboxing(){
 if(enabled)return;enabled=true;panel.hidden=false;stage.classList.add('hand-opening');stage.dataset.state='hand-ready';
}
function stopCamera(){
 session++;clearTimeout(timeout);clearInterval(frameTimer);frameTimer=null;
 stream?.getTracks().forEach(track=>track.stop());stream=null;
 video.srcObject=null;worker?.terminate();worker=null;busy=false;
 preview.hidden=true;cameraButton.hidden=completed;cameraButton.disabled=false;panel.dataset.curl='0';
 openFrames=0;armed=false;curlFrames=0;
}
function failCamera(text){stopCamera();message.textContent=text;cameraButton.title=text;}
cameraButton.onclick=async()=>{
 if(completed)return;
 stopCamera();cameraButton.removeAttribute('title');const token=session;cameraButton.disabled=true;message.textContent='Allow camera access to begin…';
 try{
  if(!navigator.mediaDevices?.getUserMedia)throw new Error('unavailable');
  const media=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:'user',width:{ideal:640},height:{ideal:480}}});
  if(token!==session){media.getTracks().forEach(t=>t.stop());return;}
  stream=media;video.srcObject=media;await video.play();
  if(token!==session){media.getTracks().forEach(t=>t.stop());return;}
  media.getVideoTracks()[0].onended=()=>{if(token===session)failCamera('Camera disconnected. Click Open with hand to retry.');};
  preview.hidden=false;cameraButton.hidden=true;cameraPrompt.textContent='Raise your hand';message.textContent='Loading hand tracking…';
  worker=new Worker(new URL('./hand-worker.js',import.meta.url));
  timeout=setTimeout(()=>failCamera('Hand tracking could not load. Click Open with hand to retry.'),30000);
  worker.onerror=()=>failCamera('Hand tracking is unavailable. Click Open with hand to retry.');
  worker.onmessage=({data})=>{
   if(token!==session)return;
   if(data.type==='ready'){
    clearTimeout(timeout);message.textContent='Show your open palm to the camera.';
    frameTimer=setInterval(async()=>{
     if(busy||video.readyState<2||video.currentTime===lastFrame||document.hidden)return;
     busy=true;lastFrame=video.currentTime;
     try{const frame=await createImageBitmap(video);if(token!==session){frame.close();return;}worker.postMessage({type:'frame',frame,time:performance.now()},[frame]);}catch{busy=false;failCamera('Camera interrupted. Click Open with hand to retry.');}
    },80);
   }else if(data.type==='landmarks'){busy=false;receiveHand(data.points,data.world);}
   else if(data.type==='error')failCamera('Hand tracking could not start. Click Open with hand to retry.');
  };
  worker.postMessage({type:'init'});
 }catch(error){if(token===session)failCamera(error.name==='NotAllowedError'?'Camera access was declined. Allow camera access, then try Open with hand again.':'No camera available. Allow camera access, then try Open with hand again.');}
};
function receiveHand(points,world){
 ctx.clearRect(0,0,320,240);
 if(!points){cameraPrompt.textContent='Raise your hand';if(!running){message.textContent='Bring your whole hand into view.';openFrames=0;armed=false;curlFrames=0;}return;}
 lastHand=performance.now();cameraPrompt.textContent='Close your palm to tear';
 ctx.fillStyle='#d92b32';ctx.strokeStyle='#ffffffaa';ctx.lineWidth=2;
 for(const base of [1,5,9,13,17]){ctx.beginPath();ctx.moveTo((1-points[0].x)*320,points[0].y*240);for(let j=base;j<base+4;j++)ctx.lineTo((1-points[j].x)*320,points[j].y*240);ctx.stroke();}
 for(const p of points){ctx.beginPath();ctx.arc((1-p.x)*320,p.y*240,3,0,Math.PI*2);ctx.fill();}
 const curl=fingerCurl(world||points);
 if(!armed){openFrames=curl<.22?openFrames+1:0;if(openFrames>=5){armed=true;message.textContent='Curl your fingers to pull the lid off.';}}
 else if(!running){curlFrames=curl>.55?curlFrames+1:0;if(curlFrames>=3)beginOpening();}
 // Holding a curl drives the second stage; a lost hand pauses the pull.
 panel.dataset.curl=String(curl);
}
function beginOpening(){
 if(running||completed)return;
 running=true;cameraButton.hidden=true;
 message.textContent='Keep your fingers curled to tear it open.';
 playSound('tear');tearCue=0;
 stage.dataset.state='opening';window.dispatchEvent(new CustomEvent('slop-tear-start'));
}
export function updateHandUnboxing(dt){
 if(!running)return progress;
 const canPull=armed&&performance.now()-lastHand<500&&Number(panel.dataset.curl)>.42;
 // The lid completes its initial tear; the body then follows the held curl.
 if(progress<.42||canPull)progress=Math.min(1,progress+dt/2.7);
 const milestones=[.16,.34,.49,.66,.83];
 while(tearCue<milestones.length&&progress>=milestones[tearCue]){playSound('tear',.12);tearCue++;}
 if(progress>=.42&&!canPull)message.textContent='Curl your fingers again to tear the box apart.';
 else if(progress>.42)message.textContent='The box is tearing open…';
 if(progress===1){running=false;completed=true;stopCamera();message.textContent='Box opened';stage.dataset.state='opened';}
 return progress;
}
addEventListener('pagehide',stopCamera);
document.addEventListener('visibilitychange',()=>{if(document.hidden&&stream){stopCamera();message.textContent='Camera paused while this tab was hidden.';}});
addEventListener('keydown',event=>{if(event.key==='Escape'&&stream){stopCamera();message.textContent='Camera stopped.';}});

addEventListener('slop-collectible-revealed',event=>{message.textContent=`Your lucky draw: ${event.detail.name}`;});
