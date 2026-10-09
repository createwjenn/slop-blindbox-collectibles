// Each character can receive an independent landscape without changing the others.
export function worldConfig(slug){
 return slug==='tralalero-tralala'
  ? {assets:'./assets/world-tralalero',swimming:true}
  : {assets:'./assets/world',swimming:false};
}
