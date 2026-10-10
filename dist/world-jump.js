// Jump height is separate from terrain navigation, so boundaries stay enforced.
export function createJump(){
 let height=0,velocity=0;
 return {
  get height(){return height;},
  start(){if(height>0||velocity>0)return false;velocity=2.3;return true;},
  update(dt){dt=Math.max(0,Math.min(.04,dt));if(height>0||velocity>0){height+=velocity*dt-3*dt*dt;velocity-=6*dt;if(height<=0){height=0;velocity=0;}}return height;},
  reset(){height=0;velocity=0;}
 };
}
