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
