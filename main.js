import * as THREE from 'three';
import {OrbitControls} from './OrbitControls.js';
import {GLTFLoader} from './GLTFLoader.js';
import {MeshoptDecoder} from './meshopt_decoder.module.js';
import {createTrees} from './trees.js';
import {applyProjectMaterials} from './materials.js';
const host=document.querySelector('#viewport'),status=document.querySelector('#status');
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.setClearColor(0,0);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;host.append(renderer.domElement);
const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(42,1,.2,5000),controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.minDistance=8;controls.maxDistance=1700;controls.maxPolarAngle=Math.PI*.49;
scene.add(new THREE.HemisphereLight(0xeaf3ff,0x9e9a81,2.4));const sun=new THREE.DirectionalLight(0xffffff,2.2);sun.position.set(-180,400,260);scene.add(sun);
const layers={},loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);let loaded=0;
function preset(kind){controls.target.set(-25,30,20);if(kind==='area'){controls.target.set(0,95,0);const aspect=host.clientWidth/host.clientHeight,angle=Math.min(42*Math.PI/180,2*Math.atan(Math.tan(21*Math.PI/180)*aspect)),distance=420/Math.sin(angle/2)*1.05;camera.position.copy(new THREE.Vector3(.55,.62,.72).normalize().multiplyScalar(distance).add(controls.target));}else if(kind==='plan')camera.position.set(-25,560,20.1);else camera.position.set(120,250,180);controls.update();}
preset('site');document.querySelector('#site').onclick=()=>preset('site');document.querySelector('#area').onclick=()=>preset('area');document.querySelector('#plan').onclick=()=>preset('plan');document.querySelector('#reset').onclick=()=>preset('site');document.querySelector('#rotate').onclick=e=>{controls.autoRotate=!controls.autoRotate;e.target.setAttribute('aria-pressed',controls.autoRotate)};
document.querySelectorAll('[data-layer]').forEach(el=>el.onchange=()=>{if(layers[el.dataset.layer])layers[el.dataset.layer].visible=el.checked;});
const tasks=['project','terrain','buildings','context'].map(async name=>{const gltf=await loader.loadAsync('./'+name+'.glb?v=8');if(name==='project')applyProjectMaterials(gltf.scene);layers[name]=gltf.scene;scene.add(gltf.scene);gltf.scene.visible=document.querySelector(`[data-layer="${name}"]`).checked;status.textContent=`Loading model… ${++loaded}/5 layers`;});
tasks.push(fetch('./trees.json').then(r=>{if(!r.ok)throw Error('Tree data unavailable');return r.json()}).then(data=>{layers.trees=createTrees(data);scene.add(layers.trees);layers.trees.visible=document.querySelector('[data-layer="trees"]').checked;loaded++;}));
Promise.all(tasks).then(()=>{status.textContent='Model ready · Terrain alignment for review';host.dataset.ready='true';}).catch(e=>{status.textContent='Unable to load model: '+e.message;host.dataset.ready='error';console.error(e)});
new ResizeObserver(()=>{const {width,height}=host.getBoundingClientRect();renderer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();}).observe(host);
let frames=0;renderer.setAnimationLoop(()=>{controls.update();renderer.render(scene,camera);if(++frames%90===0)document.querySelector('#diagnostics').textContent=`${renderer.info.render.calls} draws · ${Math.round(renderer.info.render.triangles/1000)}k triangles`;document.querySelector('#north').style.transform=`rotate(${controls.getAzimuthalAngle()}rad)`;});
