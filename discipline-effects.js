// Illustrative visualizations only: no live sensing, classifications or RF measurements.
export function buildDisciplineEffects(THREE, scene) {
  const ai = new THREE.Group(), ew = new THREE.Group();
  ai.name='Temsili görüntü analizi';ew.name='Temsili RF yayılımı';scene.add(ai,ew);
  const lineMaterial=(color,opacity)=>new THREE.LineBasicMaterial({color,transparent:true,opacity,depthWrite:false});
  const line=(points,material,parent)=>{const l=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points.map(p=>new THREE.Vector3(...p))),material);parent.add(l);return l;};
  const cyan=lineMaterial(0x68e4ee,.6),faint=lineMaterial(0x53c8df,.18);
  const fieldY=-2.1,centerZ=-1.15;
  const plane=new THREE.Mesh(new THREE.PlaneGeometry(3.8,2.8),new THREE.MeshBasicMaterial({color:0x2c9fc4,transparent:true,opacity:.055,side:THREE.DoubleSide,depthWrite:false}));plane.rotation.x=-Math.PI/2;plane.position.set(0,fieldY,centerZ);ai.add(plane);
  for(let i=0;i<=8;i++){const x=-1.9+i*3.8/8;line([[x,fieldY,centerZ-1.4],[x,fieldY,centerZ+1.4]],faint,ai);}
  for(let i=0;i<=6;i++){const z=centerZ-1.4+i*2.8/6;line([[-1.9,fieldY,z],[1.9,fieldY,z]],faint,ai);}
  line([[-1.9,fieldY,centerZ-1.4],[1.9,fieldY,centerZ-1.4],[1.9,fieldY,centerZ+1.4],[-1.9,fieldY,centerZ+1.4],[-1.9,fieldY,centerZ-1.4]],cyan,ai);
  const rays=new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position',new THREE.BufferAttribute(new Float32Array(24),3)),lineMaterial(0x67dcea,.20));ai.add(rays);
  const scan=line([[-1.9,fieldY+.014,centerZ],[1.9,fieldY+.014,centerZ]],lineMaterial(0x99fbff,.85),ai);
  const targets=[];
  [[-.95,centerZ-.55,.50],[.7,centerZ+.40,.63]].forEach(([x,z,size])=>{
    const group=new THREE.Group();group.position.set(x,fieldY+.025,z);ai.add(group);
    for(const sx of [-1,1])for(const sz of [-1,1])line([[sx*size*.5,0,sz*(size*.5-.16)],[sx*size*.5,0,sz*size*.5],[sx*(size*.5-.16),0,sz*size*.5]],cyan,group);
    const center=new THREE.Mesh(new THREE.CircleGeometry(.055,12),new THREE.MeshBasicMaterial({color:0x90ecf0,side:THREE.DoubleSide}));center.rotation.x=-Math.PI/2;group.add(center);targets.push({group,x,z});
  });
  const rings=[];
  for(let i=0;i<4;i++){
    const mat=new THREE.MeshBasicMaterial({color:i%2?0x8dbaff:0xeab778,transparent:true,opacity:.3,depthWrite:false});
    const ring=new THREE.Mesh(new THREE.TorusGeometry(1,.013,6,96),mat);ring.rotation.x=Math.PI/2;ew.add(ring);rings.push(ring);
  }
  const antennaGlow=new THREE.Mesh(new THREE.SphereGeometry(.07,16,10),new THREE.MeshBasicMaterial({color:0xffce91}));ew.add(antennaGlow);
  const arc=line(Array.from({length:100},(_,i)=>{const a=i/99*Math.PI*1.75;return [Math.cos(a)*2.4,Math.sin(a)*2.4,0];}),lineMaterial(0xe7bc87,.15),ew);
  const corners=[[-1.9,fieldY,centerZ-1.4],[1.9,fieldY,centerZ-1.4],[1.9,fieldY,centerZ+1.4],[-1.9,fieldY,centerZ+1.4]];
  function update({chapter,time,cameraOrigin,antennaOrigin}){
    ai.visible=chapter===1;ew.visible=chapter===2;
    if(ai.visible){
      const a=rays.geometry.attributes.position;
      corners.forEach((point,i)=>{a.setXYZ(i*2,...cameraOrigin.toArray());a.setXYZ(i*2+1,...point);});a.needsUpdate=true;rays.geometry.computeBoundingSphere();
      scan.position.z=Math.sin(time*.8)*1.32;
      targets.forEach(({group,x,z},i)=>{group.position.x=x+Math.sin(time*.45+i)*.14;group.position.z=z+Math.cos(time*.4+i)*.12;});
    }
    if(ew.visible){
      rings.forEach((ring,i)=>{const phase=(time*.20+i*.25)%1;const radius=.26+phase*2.5;ring.position.copy(antennaOrigin);ring.scale.setScalar(radius);ring.material.opacity=.48*(1-phase);});
      antennaGlow.position.copy(antennaOrigin);arc.position.copy(antennaOrigin);arc.rotation.y=time*.24;
    }
  }
  ai.visible=false;ew.visible=false;
  return {update,ai,ew,rings,scan,targets};
}
