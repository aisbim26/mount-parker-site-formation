import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {createTrees} from './trees.js';
import {applyProjectMaterials} from './materials.js';
const host=document.querySelector('#viewport'),status=document.querySelector('#status');
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.setClearColor(0,0);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;host.append(renderer.domElement);
const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(42,1,.2,5000),controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.minDistance=8;controls.maxDistance=1700;controls.maxPolarAngle=Math.PI*.49;
scene.add(new THREE.HemisphereLight(0xeaf3ff,0x9e9a81,2.4));const sun=new THREE.DirectionalLight(0xffffff,2.2);sun.position.set(-180,400,260);scene.add(sun);
const layers={},loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);let loaded=0;
let activeView='mount', buildingMeshes=[], projectAnchors=[], visibilityDirty=true, lastVisibility=0;
const buildingToggle=document.querySelector('[data-layer="buildings"]'),autoHide=document.querySelector('#auto-hide');
function showBuildings(show){buildingToggle.checked=show;if(layers.buildings)layers.buildings.visible=show;visibilityDirty=true;}
function preset(kind){
 activeView=kind;controls.autoRotate=false;document.querySelector('#rotate').setAttribute('aria-pressed','false');
 if(kind==='area'){
  controls.target.set(0,95,0);const aspect=host.clientWidth/host.clientHeight,angle=Math.min(42*Math.PI/180,2*Math.atan(Math.tan(21*Math.PI/180)*aspect)),distance=420/Math.sin(angle/2)*1.05;
  camera.position.copy(new THREE.Vector3(.55,.62,.72).normalize().multiplyScalar(distance).add(controls.target));showBuildings(true);
 }else{
  const target=kind==='kings'?new THREE.Vector3(-28,15,-68):new THREE.Vector3(-12,20,16);
  const offset=kind==='kings'?new THREE.Vector3(57,27,-41):new THREE.Vector3(95,68,-8);
  const aspect=host.clientWidth/host.clientHeight;offset.multiplyScalar(Math.max(1,1.15/aspect));
  controls.target.copy(target);camera.position.copy(target).add(offset);visibilityDirty=true;
 }
 controls.update();visibilityDirty=true;
 document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===kind)));
}
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>preset(b.dataset.view));
document.querySelector('#reset').onclick=()=>preset(activeView);
document.querySelector('#rotate').onclick=e=>{controls.autoRotate=!controls.autoRotate;e.target.setAttribute('aria-pressed',controls.autoRotate)};
document.querySelectorAll('[data-layer]').forEach(el=>el.onchange=()=>{if(layers[el.dataset.layer])layers[el.dataset.layer].visible=el.checked;visibilityDirty=true;});
autoHide.onchange=()=>{visibilityDirty=true;updateBuildingVisibility();};
controls.addEventListener('change',()=>{visibilityDirty=true;});
const sightRay=new THREE.Raycaster(),screenPoint=new THREE.Vector3(),direction=new THREE.Vector3(),boxHit=new THREE.Vector3();
function prepareVisibility(){
 scene.updateMatrixWorld(true);
 layers.buildings.traverse(m=>{if(m.isMesh)buildingMeshes.push({mesh:m,box:new THREE.Box3().setFromObject(m)});});
 const down=new THREE.Raycaster();
 for(let x=-62;x<=28;x+=15)for(let z=-100;z<=80;z+=15){
  down.set(new THREE.Vector3(x,600,z),new THREE.Vector3(0,-1,0));
  const hit=down.intersectObject(layers.project,true)[0];if(hit)projectAnchors.push(hit.point.clone());
 }
 visibilityDirty=true;
}
function updateBuildingVisibility(){
 if(!layers.buildings)return;
 for(const b of buildingMeshes)b.mesh.visible=true;host.dataset.hiddenBuildings="0";
 if(!buildingToggle.checked||!autoHide.checked||!layers.project?.visible)return;
 camera.updateMatrixWorld();const hidden=new Set();
 for(const point of projectAnchors){
  screenPoint.copy(point).project(camera);
  if(Math.abs(screenPoint.x)>1||Math.abs(screenPoint.y)>1||screenPoint.z< -1||screenPoint.z>1)continue;
  const distance=camera.position.distanceTo(point);direction.subVectors(point,camera.position).normalize();sightRay.set(camera.position,direction);sightRay.far=distance-.25;
  for(const b of buildingMeshes){
   if(hidden.has(b.mesh))continue;
   if(!sightRay.ray.intersectBox(b.box,boxHit)||camera.position.distanceTo(boxHit)>=distance-.25)continue;
   if(sightRay.intersectObject(b.mesh,false).length)hidden.add(b.mesh);
  }
 }
 for(const mesh of hidden)mesh.visible=false;
 host.dataset.hiddenBuildings=String(hidden.size);
}
preset('mount');
const tasks=['project','terrain','buildings','context'].map(async name=>{const gltf=await loader.loadAsync('./'+name+'.glb?v=20261005h');if(name==='project')applyProjectMaterials(gltf.scene);layers[name]=gltf.scene;scene.add(gltf.scene);gltf.scene.visible=document.querySelector(`[data-layer="${name}"]`).checked;status.textContent=`Loading model… ${++loaded}/5 layers`;});
tasks.push(fetch('./trees.json?v=20261005h').then(r=>{if(!r.ok)throw Error('Tree data unavailable');return r.json()}).then(data=>{layers.trees=createTrees(data);scene.add(layers.trees);layers.trees.visible=document.querySelector('[data-layer="trees"]').checked;loaded++;}));
Promise.all(tasks).then(()=>{prepareVisibility();status.textContent='Model ready · Terrain alignment for review';host.dataset.ready='true';}).catch(e=>{status.textContent='Unable to load model: '+e.message;host.dataset.ready='error';console.error(e)});
new ResizeObserver(()=>{const {width,height}=host.getBoundingClientRect();renderer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();}).observe(host);
let frames=0;renderer.setAnimationLoop(()=>{controls.update();if(visibilityDirty&&performance.now()-lastVisibility>180){updateBuildingVisibility();visibilityDirty=false;lastVisibility=performance.now();}renderer.render(scene,camera);if(++frames%90===0)document.querySelector('#diagnostics').textContent=`${renderer.info.render.calls} draws · ${Math.round(renderer.info.render.triangles/1000)}k triangles`;document.querySelector('#north').style.transform=`rotate(${controls.getAzimuthalAngle()}rad)`;});
