import * as THREE from 'three';
export function createWorldWater(scene,navigation){
 const positions=[],cell=navigation.cell,level=navigation.waterLevel;
 const maskCanvas=document.createElement('canvas');maskCanvas.width=512;maskCanvas.height=512;
 const ctx=maskCanvas.getContext('2d'),bounds={x:-5,z:-5,width:7,height:9};
 ctx.fillStyle='white';
 for(const [key,height] of Object.entries(navigation.ground)){
  if(height>=level)continue;
  const [i,j]=key.split(',').map(Number),x=i*cell,z=j*cell;
  ctx.fillRect((x-bounds.x)/bounds.width*512,(z-bounds.z)/bounds.height*512,cell/bounds.width*512+1,cell/bounds.height*512+1);
 }
 const softened=document.createElement('canvas');softened.width=512;softened.height=512;
 const soft=softened.getContext('2d');soft.filter='blur(7px)';soft.drawImage(maskCanvas,0,0);
 const mask=new THREE.CanvasTexture(softened);mask.flipY=false;
 const {x,z,width:w,height:h}=bounds;
 positions.push(x,level,z,x,level,z+h,x+w,level,z,x+w,level,z,x,level,z+h,x+w,level,z+h);
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,uniforms:{time:{value:0},mask:{value:mask}},
  vertexShader:'varying vec3 point; void main(){point=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:'uniform float time; uniform sampler2D mask; varying vec3 point; void main(){float edge=texture2D(mask,(point.xz+vec2(5.))/vec2(7.,9.)).a;if(edge<.02)discard;float wave=sin(point.x*19.+time*1.3+sin(point.z*9.))*sin(point.z*16.-time*.9);float shine=pow(max(0.,wave),12.);vec3 color=mix(vec3(.07,.42,.48),vec3(.65,.95,.93),shine*.65);gl_FragColor=vec4(color,(.22+shine*.2)*edge);}'
 });
 const mesh=new THREE.Mesh(geometry,material);mesh.renderOrder=2;scene.add(mesh);
 const rings=Array.from({length:3},()=>{const ring=new THREE.Mesh(new THREE.RingGeometry(.16,.175,48),new THREE.MeshBasicMaterial({color:0xb4eeec,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.renderOrder=3;scene.add(ring);return ring;});
 return {
  update(time,position,immersion,moving){material.uniforms.time.value=time;for(let i=0;i<rings.length;i++){const phase=(time*(moving?.85:.4)+i/3)%1,ring=rings[i];ring.position.set(position.x,level+.006,position.z);ring.scale.setScalar(1+phase*2.5);ring.material.opacity=immersion*(1-phase)*(moving?.35:.18);}},
  dispose(){geometry.dispose();material.dispose();mask.dispose();for(const ring of rings){ring.geometry.dispose();ring.material.dispose();}}
 };
}
