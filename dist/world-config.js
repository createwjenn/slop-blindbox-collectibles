// Each character can receive an independent landscape without changing the others.
const worlds={
 'secret-capybara-toilet':{assets:'./assets/world-capybara',swimming:false,cameraDistance:1.2},
 'chill-guy':{assets:'./assets/world-chill-guy',swimming:false,cameraDistance:1.5},
 'ballerina-capuccina':{assets:'./assets/world-ballerina',swimming:false,cameraDistance:1.2},
 'tung-tung-tung':{assets:'./assets/world-tung-v2',swimming:false,cameraDistance:.9},
 'tralalero-tralala':{assets:'./assets/world-tralalero',swimming:true,cameraDistance:1.2},
 'niu-lai':{assets:'./assets/world-niu-lai',swimming:false,cameraDistance:1.2}
};
export function worldConfig(slug){
 return worlds[slug]??{assets:'./assets/world',swimming:false,cameraDistance:2.1};
}
