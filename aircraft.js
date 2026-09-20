// Visual interpretation of the user's four CAD screenshots; not a dimensional CAD reconstruction.
export function buildAircraft(THREE) {
  const aircraft = new THREE.Group(); aircraft.name = 'ARVUS — görsel referans modeli';
  const material=(color,metalness=.35,roughness=.36)=>new THREE.MeshStandardMaterial({color,metalness,roughness});
  const burgundy=material(0x731914,.35,.33), hatchRed=material(0x8b2621,.30,.36);
  const dark=material(0x121820,.25,.52), silver=material(0xa3abb4,.7,.3), pcb=material(0x183e43), gold=material(0xb79555,.7);
  const glass=new THREE.MeshPhysicalMaterial({color:0x091c2e,metalness:.45,roughness:.12,clearcoat:1});
  const mesh=(geometry,mat,parent,pos=[0,0,0])=>{const m=new THREE.Mesh(geometry,mat);m.position.set(...pos);parent.add(m);return m;};
  const box=(size,mat,parent,pos)=>mesh(new THREE.BoxGeometry(...size),mat,parent,pos);
  const sphere=(size,mat,parent,pos)=>{const m=mesh(new THREE.SphereGeometry(1,32,20),mat,parent,pos);m.scale.set(...size);return m;};
  function plate(points,thickness,mat,parent,y=0){
    const s=new THREE.Shape();points.forEach(([x,z],i)=>i?s.lineTo(x,z):s.moveTo(x,z));s.closePath();
    const geo=new THREE.ExtrudeGeometry(s,{depth:thickness,bevelEnabled:true,bevelSegments:3,bevelSize:.022,bevelThickness:.022});geo.rotateX(Math.PI/2);
    return mesh(geo,mat,parent,[0,y,0]);
  }
  function rod(start,end,r,mat,parent){const a=new THREE.Vector3(...start),b=new THREE.Vector3(...end);const m=mesh(new THREE.CylinderGeometry(r,r,a.distanceTo(b),12),mat,parent);m.position.copy(a).add(b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),b.sub(a).normalize());return m;}
  const part=name=>{const g=new THREE.Group();g.name=name;aircraft.add(g);return g;};
  const fuselage=part('Gövde');
  const profile=[[0,-3.5],[.10,-3.27],[.24,-2.93],[.35,-2.45],[.41,-1.8],[.43,-1],[.44,0],[.41,1],[.33,2],[.25,2.65],[.19,2.9],[0,2.97]].map(([r,z])=>new THREE.Vector2(r,z));
  const hullGeo=new THREE.LatheGeometry(profile,64);hullGeo.rotateX(Math.PI/2);
  const hull=mesh(hullGeo,burgundy,fuselage);hull.scale.y=.88;
  // The reference has a solid removable red upper cover, rather than a glass cockpit.
  const canopy=part('Üst gövde kapağı');
  sphere([.36,.11,1.16],hatchRed,canopy,[0,.337,-.50]);
  const seam=new THREE.EllipseCurve(0,0,.34,1.1,0,Math.PI*2,false,0).getPoints(80).map(v=>new THREE.Vector3(v.x,.365,v.y-.50));
  canopy.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(seam),new THREE.LineBasicMaterial({color:0x2c0d0c})));
  const switchBase=mesh(new THREE.CylinderGeometry(.09,.09,.025,24),dark,canopy,[0,.467,.1]);
  mesh(new THREE.CylinderGeometry(.047,.047,.055,24),hatchRed,canopy,[0,.505,.1]);
  const wings=[],flaps=[];
  [-1,1].forEach(side=>{
    const wing=part(side<0?'Sol ana kanat':'Sağ ana kanat');wings.push(wing);
    // Swept, broad delta-like planform read from the top-view reference.
    plate([[.30,-.66],[1.06,.15],[4.10,1.65],[4.10,2.65],[.31,2.55]].map(([x,z])=>[x*side,z]),.095,burgundy,wing,.055);
    const flap=part(side<0?'Sol kanat kontrol yüzeyi':'Sağ kanat kontrol yüzeyi');flaps.push(flap);
    plate([[1.16,2.29],[4.08,2.43],[4.08,2.68],[1.16,2.56]].map(([x,z])=>[x*side,z]),.039,hatchRed,flap,.106);
    const seamPts=[[side*1.16,.13,2.29],[side*4.08,.13,2.43]].map(p=>new THREE.Vector3(...p));
    flap.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(seamPts),new THREE.LineBasicMaterial({color:0x3a0f0c})));
    // Small forward horizontal surfaces visible in the supplied top and perspective views.
    plate([[.30,-2.03],[1.18,-1.73],[1.19,-1.42],[.32,-1.48]].map(([x,z])=>[x*side,z]),.057,burgundy,fuselage,.065);
  });
  const fins=[];
  [-1,1].forEach(side=>{
    const fin=part(side<0?'Sol dikey kuyruk':'Sağ dikey kuyruk');fins.push(fin);
    const shape=new THREE.Shape();shape.moveTo(.69,0);shape.lineTo(1.73,1.40);shape.lineTo(2.18,1.49);shape.lineTo(2.43,0);shape.closePath();
    const geo=new THREE.ExtrudeGeometry(shape,{depth:.055,bevelEnabled:true,bevelSize:.018,bevelThickness:.016,bevelSegments:2});geo.rotateY(-Math.PI/2);
    mesh(geo,burgundy,fin,[side*.76+.027,.09,0]);
    rod([side*.76,.17,2.13],[side*.76,1.38,2.14],.008,dark,fin);
  });
  const gear=part('İniş takımı');
  const wheel=(x,y,z,r)=>{
    const tire=mesh(new THREE.CylinderGeometry(r,r,.12,28),dark,gear,[x,y,z]);tire.rotation.z=Math.PI/2;
    const hub=mesh(new THREE.CylinderGeometry(r*.37,r*.37,.126,20),silver,gear,[x,y,z]);hub.rotation.z=Math.PI/2;
  };
  rod([0,-.30,-1.99],[0,-.85,-2.0],.035,silver,gear);rod([0,-.85,-2.0],[0,-1.01,-1.90],.03,silver,gear);wheel(0,-1.03,-1.90,.18);
  [-1,1].forEach(side=>{rod([side*.17,-.23,1.26],[side*.78,-.42,1.26],.036,silver,gear);rod([side*.78,-.42,1.26],[side*1.04,-1.0,1.26],.033,silver,gear);wheel(side*1.04,-1.05,1.26,.215);});
  const cameraGroup=part('Temsili görüntüleme modülü');
  box([.23,.14,.3],dark,cameraGroup,[0,-.39,-1.0]);
  const lens=mesh(new THREE.CylinderGeometry(.085,.085,.06,24),glass,cameraGroup,[0,-.49,-1.02]);
  const electronics=part('Temsili aviyonik');
  box([.55,.055,.90],pcb,electronics,[0,.15,-.45]);
  box([.27,.08,.30],dark,electronics,[0,.22,-.52]);
  for(let i=0;i<8;i++){box([.32,.025,.018],silver,electronics,[0,.27,-.63+i*.031]);for(const side of [-1,1])box([.045,.022,.04],gold,electronics,[side*.23,.19,-.8+i*.1]);}
  const antenna=part('Temsili haberleşme kartı');
  box([.32,.045,.36],pcb,antenna,[0,.15,.67]);box([.18,.08,.2],silver,antenna,[0,.22,.67]);
  rod([0,.22,.75],[0,.51,.75],.02,dark,antenna);
  const motor=part('Arka motor ve pervane');motor.position.z=2.98;
  const motorCase=mesh(new THREE.CylinderGeometry(.17,.17,.23,32),silver,motor,[0,0,.04]);motorCase.rotation.x=Math.PI/2;
  const propeller=new THREE.Group();propeller.name='İtici pervane';motor.add(propeller);
  [-1,1].forEach(side=>{const blade=sphere([.086,.65,.025],dark,propeller,[0,side*.56,.21]);blade.rotation.z=side*.13;});
  const hub=mesh(new THREE.ConeGeometry(.10,.14,24),dark,motor,[0,0,.26]);hub.rotation.x=Math.PI/2;
  return {aircraft,fuselage,canopy,wings,flaps,fins,gear,cameraGroup,electronics,antenna,motor,propeller};
}
