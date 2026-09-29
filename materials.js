import * as THREE from 'three';
function texture(kind){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const ctx=canvas.getContext('2d'),pixels=ctx.createImageData(256,256);let seed=kind==='soil'?216:839826;
 const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
 const base=kind==='footpath'?[112,116,117]:kind==='asphalt'?[155,158,158]:kind==='soil'?[177,161,128]:kind==='slope'?[180,178,165]:[183,187,187];
 for(let y=0;y<256;y++)for(let x=0;x<256;x++){const i=(y*256+x)*4;let n=(rand()-.5)*(kind==='asphalt'?25:19);if(kind==='soil')n+=7*Math.sin(x*.17)*Math.sin(y*.09);if(kind==='slope')n+=5*Math.sin(x*.19)+3*Math.cos(x*.47+y*.008);for(let c=0;c<3;c++)pixels.data[i+c]=base[c]+n;pixels.data[i+3]=255;}ctx.putImageData(pixels,0,0);
 const t=new THREE.CanvasTexture(canvas);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.colorSpace=THREE.SRGBColorSpace;return t;
}
function make(kind){const t=texture(kind),m=new THREE.MeshStandardMaterial({color:0xffffff,roughness:kind==='asphalt'?1:.94,side:THREE.DoubleSide});
 m.onBeforeCompile=shader=>{shader.uniforms.surfaceTexture={value:t};shader.uniforms.surfaceScale={value:kind==='asphalt'?1.2:kind==='soil'?.4:.3};
 shader.vertexShader='varying vec3 surfacePosition;\nvarying vec3 surfaceNormal;\n'+shader.vertexShader;
 shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nsurfacePosition=position;surfaceNormal=normal;');
 shader.fragmentShader='uniform sampler2D surfaceTexture;\nuniform float surfaceScale;\nvarying vec3 surfacePosition;\nvarying vec3 surfaceNormal;\n'+shader.fragmentShader;
 shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`vec3 w=pow(abs(normalize(surfaceNormal)),vec3(4.));w/=max(w.x+w.y+w.z,.001);vec3 p=surfacePosition*surfaceScale;vec3 paint=texture2D(surfaceTexture,p.yz).rgb*w.x+texture2D(surfaceTexture,p.xz).rgb*w.y+texture2D(surfaceTexture,p.xy).rgb*w.z;diffuseColor.rgb*=paint;`);
 };m.customProgramCacheKey=()=>kind;return m;}
const materials=Object.fromEntries(['asphalt','footpath','soil','slope','structure'].map(k=>[k,make(k)]));
export function applyProjectMaterials(root){root.traverse(o=>{if(!o.isMesh)return;o.geometry.computeVertexNormals();let kind=/633793|635871/.test(o.name)?'footpath':o.userData.surface;if(!kind)kind=/TFP.RCS|Footpath|Toposolid.Road/.test(o.name)?'asphalt':/628674/.test(o.name)?'slope':/Toposolid.Mount.Parker/.test(o.name)?'soil':'structure';o.material=materials[kind]||materials.structure;});}
