// Each character can receive an independent landscape without changing the others.
const worlds={
 'tralalero-tralala':{assets:'./assets/world-tralalero',swimming:true,cameraDistance:1.2},
 'niu-lai':{assets:'./assets/world-niu-lai',swimming:false,cameraDistance:1.2}
};
export function worldConfig(slug){
 return worlds[slug]??{assets:'./assets/world',swimming:false,cameraDistance:2.1};
}
