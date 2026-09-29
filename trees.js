import * as THREE from 'three';
import {mergeGeometries} from './BufferGeometryUtils.js';
export function createTrees(data){
 const group=new THREE.Group();group.name='Lightweight trees';
 const lobes=[[0,.14,0,.76,.9,.73],[-.43,-.18,.08,.62,.69,.65],[.43,-.1,-.12,.64,.75,.61]].map(([x,y,z,sx,sy,sz],i)=>{const g=new THREE.IcosahedronGeometry(1,0);g.scale(sx,sy,sz);g.rotateY(i*.8);g.translate(x,y,z);return g;});
 const geometry=mergeGeometries(lobes);for(const g of lobes)g.dispose();
 const crowns=new THREE.InstancedMesh(geometry,new THREE.MeshStandardMaterial({color:0xffffff,roughness:1}),data.instances.length);
 const trunks=new THREE.InstancedMesh(new THREE.CylinderGeometry(.16,.24,1,5,1),new THREE.MeshStandardMaterial({color:0x72604d,roughness:1}),data.instances.length);
 const dummy=new THREE.Object3D(),color=new THREE.Color();
 data.instances.forEach(([x,y,z,height,radius],i)=>{
  const stem=height*.49;dummy.position.set(x,y+stem/2,z);dummy.scale.set(1,stem,1);dummy.rotation.set(0,0,0);dummy.updateMatrix();trunks.setMatrixAt(i,dummy.matrix);
  dummy.position.set(x,y+height*.67,z);dummy.scale.set(radius*.95,height*.34,radius*.88);dummy.rotation.set(0,(i*2.39996)%6.283,((i%7)-3)*.014);dummy.updateMatrix();crowns.setMatrixAt(i,dummy.matrix);color.setHSL(.23+(i%7)*.008,.36+(i%5)*.025,.09+(i%11)*.004);crowns.setColorAt(i,color);
 });
 crowns.instanceMatrix.needsUpdate=true;trunks.instanceMatrix.needsUpdate=true;group.add(trunks,crowns);return group;
}
