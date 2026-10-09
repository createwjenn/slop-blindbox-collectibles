export function groundAt(navigation,x,z){
 return navigation.ground[`${Math.floor(x/navigation.cell)},${Math.floor(z/navigation.cell)}`];
}
export function stepCharacter(navigation,position,yaw,forward,turn,dt,speed=.85){
 dt=Math.max(0,Math.min(.04,dt));yaw+=turn*1.7*dt;
 const x=position.x-Math.sin(yaw)*forward*speed*dt,z=position.z-Math.cos(yaw)*forward*speed*dt;
 const y=groundAt(navigation,x,z);
 const moved=!!forward&&y!==undefined&&Math.abs(y-position.y)<.22;
 return {x:moved?x:position.x,y:moved?y:position.y,z:moved?z:position.z,yaw,moved};
}
export function waterDepth(navigation,x,z){
 const floor=groundAt(navigation,x,z);
 return floor===undefined||navigation.waterLevel===undefined?0:Math.max(0,navigation.waterLevel-floor);
}
export function stepSwimmingCharacter(navigation,position,yaw,forward,turn,dt,speed=1.3){
 dt=Math.max(0,Math.min(.04,dt));yaw+=turn*1.7*dt;
 const depth=waterDepth(navigation,position.x,position.z);
 const pace=speed*(depth>.06?.58:1);
 const x=position.x-Math.sin(yaw)*forward*pace*dt,z=position.z-Math.cos(yaw)*forward*pace*dt;
 const floor=groundAt(navigation,x,z),oldFloor=groundAt(navigation,position.x,position.z);
 const level=navigation.waterLevel,swimBase=level-.30;
 const target=floor===undefined?undefined:Math.max(floor,swimBase);
 // Floating over deep terrain is safe; exits must still be a climbable bank.
 const oldBase=Math.max(oldFloor??position.y,swimBase);
 const moved=!!forward&&target!==undefined&&target-oldBase<(depth>.06?.42:.22)&&oldBase-target<.46;
 const px=moved?x:position.x,pz=moved?z:position.z;
 const y=moved?target:oldBase;
 return {x:px,y,z:pz,yaw,moved,immersion:Math.min(1,waterDepth(navigation,px,pz)/.30)};
}
