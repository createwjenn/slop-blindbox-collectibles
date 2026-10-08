export function worldInput(keys){
 return {
  forward:Number(keys.has('ArrowUp'))-Number(keys.has('ArrowDown')),
  turn:Number(keys.has('ArrowLeft'))-Number(keys.has('ArrowRight')),
  cameraYaw:Number(keys.has('KeyA'))-Number(keys.has('KeyD')),
  cameraPitch:Number(keys.has('KeyS'))-Number(keys.has('KeyW')),
  running:['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].some(key=>keys.has(key))
 };
}
