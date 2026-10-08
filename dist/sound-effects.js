// Procedural foley: no downloads or microphone access. Web Audio is unlocked
// by the first click/tap/key press, as required by browser autoplay rules.
let context,master,noiseBuffer;
const lastPlayed=new Map();
function unlock(){
 try{
  if(!context){context=new (window.AudioContext||window.webkitAudioContext)();master=context.createGain();master.gain.value=.42;const limiter=context.createDynamicsCompressor();limiter.threshold.value=-12;limiter.ratio.value=8;master.connect(limiter);limiter.connect(context.destination);}
  if(context.state==='suspended')context.resume().catch(()=>{});
 }catch{}
}
for(const event of ['pointerdown','keydown'])addEventListener(event,unlock,{capture:true,passive:true});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&context?.state==='running')context.suspend().catch(()=>{});});
function noise(){
 if(!noiseBuffer){noiseBuffer=context.createBuffer(1,context.sampleRate*3,context.sampleRate);const d=noiseBuffer.getChannelData(0);let brown=0;for(let i=0;i<d.length;i++){const white=Math.random()*2-1;brown=(brown+.035*white)/1.035;d[i]=white*.62+brown*3;}}
 return noiseBuffer;
}
function rustle(at,duration,volume,frequency,q=1,flutter=0){
 const source=context.createBufferSource();source.buffer=noise();
 const filter=context.createBiquadFilter();filter.type='bandpass';filter.frequency.setValueAtTime(frequency,at);filter.frequency.exponentialRampToValueAtTime(frequency*.55,at+duration);filter.Q.value=q;
 const gain=context.createGain();const curve=new Float32Array(80);
 for(let i=0;i<curve.length;i++){const t=i/(curve.length-1);curve[i]=volume*Math.pow(Math.sin(Math.PI*t),.8)*(1-flutter+flutter*Math.abs(Math.sin(t*95)));}
 gain.gain.setValueCurveAtTime(curve,at,duration);
 source.connect(filter);filter.connect(gain);gain.connect(master);
 source.start(at,Math.random()*.3,duration);source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};
}
function tone(at,duration,start,end,volume,type='sine'){
 const oscillator=context.createOscillator(),gain=context.createGain();oscillator.type=type;
 oscillator.frequency.setValueAtTime(start,at);oscillator.frequency.exponentialRampToValueAtTime(end,at+duration);
 gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(volume,at+.012);gain.gain.exponentialRampToValueAtTime(.0001,at+duration);
 oscillator.connect(gain);gain.connect(master);oscillator.start(at);oscillator.stop(at+duration+.01);oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};
}
export function playSound(kind,cooldown=0,intensity=1){
 if(!context||context.state!=='running'||document.hidden)return;
 const now=context.currentTime;
 if(now-(lastPlayed.get(kind)??-100)<cooldown)return;
 lastPlayed.set(kind,now);const at=now+.008;
 switch(kind){
  case 'shake': {
   // A papery shell rustle with a soft loose-object knock at each reversal.
   const level=Math.max(0,Math.min(1,intensity));
   rustle(at,.075,.20*level,900+Math.random()*650,.65,.55);
   tone(at,.065,155+Math.random()*45,75,.065*level,'triangle');
   rustle(at+.022,.045,.085*level,2400+Math.random()*800,1.8,.4);
   break;
  }
  case 'brush':rustle(at,.16,.14,1700+Math.random()*900,.55,.2);break;
  case 'tear':rustle(at,.29,.22,2300,.7,.65);rustle(at+.02,.10,.07,700,1,.8);break;
  case 'hover':tone(at,.18,490,730,.035);tone(at+.035,.21,980,1100,.015);break;
  case 'flower':tone(at,.23,1318.5,1324,.025);tone(at+.04,.18,2093,2100,.018);tone(at+.075,.13,2637,2644,.009);break;
  case 'grass':rustle(at,.3,.25,1100,.5,.65);tone(at,.1,115,65,.035);break;
  case 'birds':for(let i=0;i<5;i++){const t=at+i*.13+Math.random()*.04;const pitch=2200+Math.random()*1100;tone(t,.10,pitch,pitch*1.5,.035);tone(t+.06,.12,pitch*1.5,pitch*.85,.02);}break;
  case 'swoosh':rustle(at,.85,.27,850,.4,.08);rustle(at+.18,.5,.12,2100,.45,.1);break;
  case 'sparkle':for(let i=0;i<7;i++){const note=[1046.5,1318.5,1568,2093,2637,3136,4186][i];tone(at+i*.075,.62,note,note*1.001,.035);tone(at+i*.075,.33,note*2,note*2,.008);}break;
 }
}
addEventListener('slop-unboxing',()=>playSound('swoosh',1));
addEventListener('slop-collectible-revealed',()=>playSound('sparkle',1));
