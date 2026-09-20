const story = document.querySelector('.flight-story');
const stage = document.querySelector('.flight-sticky');
const host = document.querySelector('#flight-canvas');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const motionButton = document.querySelector('#motion-toggle');
let paused = reducedMotion.matches, progress = 0, currentChapter = -1, visible = true;
let renderScene = () => {};
let visualProgress = 0, frozenProgress = 0;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
function setChapter(index) {
  if (index === currentChapter) return;
  currentChapter = index;
  stage.dataset.activeChapter=String(index);
  document.querySelectorAll('[data-activity]').forEach(panel=>{panel.hidden=Number(panel.dataset.activity)!==index;});
  document.querySelectorAll('.chapter').forEach((el, i) => {
    el.classList.toggle('is-current', i === index);
    el.inert = i !== index;
    el.setAttribute('aria-hidden', String(i !== index));
  });
  document.querySelectorAll('[data-scene]').forEach((el, i) => {
    el.classList.toggle('current', i === index);
    if (i === index) el.setAttribute('aria-current', 'step'); else el.removeAttribute('aria-current');
  });
  const label = document.querySelector('#part-label');
  label.hidden = index === 0 || document.body.classList.contains('scene-unavailable');
  document.querySelector('#part-name').textContent = ['', 'GÖRÜNTÜ / KAMERA', 'SİNYAL / AVİYONİK', 'YAPI / KANAT'][index];
}
function updateScroll() {
  progress = clamp(-story.getBoundingClientRect().top / Math.max(1, story.offsetHeight - stage.offsetHeight));
  setChapter(progress < .20 ? 0 : progress < .47 ? 1 : progress < .74 ? 2 : 3);
  document.querySelector('#story-progress').style.width = `${progress * 100}%`;
  renderScene();
}
function updateMotion() {
  if (paused) frozenProgress = visualProgress;
  motionButton.setAttribute('aria-pressed', String(paused));
  motionButton.textContent = paused ? 'Hareketi aç ▷' : 'Hareketi durdur Ⅱ';
  document.body.classList.toggle('motion-paused', paused);
  renderScene();
}
motionButton.addEventListener('click', () => { paused = !paused; updateMotion(); });
reducedMotion.addEventListener('change', e => { paused = e.matches; updateMotion(); });
document.querySelectorAll('[data-scene]').forEach(button => button.addEventListener('click', () => {
  const position = [0, .30, .57, .85][Number(button.dataset.scene)];
  const top = scrollY + story.getBoundingClientRect().top + position * (story.offsetHeight - stage.offsetHeight);
  window.scrollTo({top, behavior: reducedMotion.matches || paused ? 'instant' : 'smooth'});
}));
document.querySelectorAll('.choose-category').forEach(button => button.addEventListener('click', () => {
  const radio = document.querySelector(`[name="category"][value="${button.dataset.category}"]`);
  radio.checked = true;
  window.dispatchEvent(new CustomEvent('arvus-category-selected', {detail: button.dataset.category}));
  document.querySelector('#application').scrollIntoView({behavior: reducedMotion.matches ? 'instant' : 'smooth'});
}));
addEventListener('scroll', updateScroll, {passive: true});
addEventListener('resize', updateScroll);
updateMotion(); updateScroll();

try {
  const THREE = await import('./vendor/three.module.js');
  const renderer = new THREE.WebGLRenderer({alpha: true, antialias: true, powerPreference: 'low-power'});
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.55;
  host.append(renderer.domElement);
  document.querySelector('#scene-loading').hidden = true;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, .1, 100);
  camera.position.set(8.6, 7.8, -11.6); camera.lookAt(0, 0, 0);
  scene.add(new THREE.HemisphereLight(0xcde2ff, 0x0b1831, 2.8));
  const key = new THREE.DirectionalLight(0xffe9de, 4); key.position.set(-5, 9, -4); scene.add(key);
  const rim = new THREE.DirectionalLight(0x8daeff, 3); rim.position.set(4, 3, 5); scene.add(rim);
  const front = new THREE.DirectionalLight(0xb2cfff, 1.3); front.position.set(2, -2, -8); scene.add(front);
  const {buildAircraft} = await import('./aircraft.js');
  const {aircraft,fuselage,canopy,wings,flaps,fins,gear,cameraGroup,electronics,antenna,motor,propeller} = buildAircraft(THREE);
  scene.add(aircraft);
  const {buildDisciplineEffects}=await import('./discipline-effects.js');
  const discipline=buildDisciplineEffects(THREE,scene);
  const cameraOrigin=new THREE.Vector3(),antennaOrigin=new THREE.Vector3();
  const spectrumBars=[...document.querySelectorAll('.spectrum-bar')];
  const visionScan=document.querySelector('.vision-scan');
  const tracks=[...document.querySelectorAll('.tracking-box')];
  const spectrumSweep=document.querySelector('.spectrum-sweep');
  let effectTime=0;
  // Circular construction guides support the exploded assembly, not flight data.
  const guideMaterial = new THREE.LineBasicMaterial({color:0x416b9c,transparent:true,opacity:.20});
  const guideGroup=new THREE.Group();scene.add(guideGroup);guideGroup.position.y=-1.6;
  [3.4,4.7].forEach(radius=>{const points=[];for(let i=0;i<=100;i++){const a=i/100*Math.PI*2;points.push(new THREE.Vector3(Math.cos(a)*radius,0,Math.sin(a)*radius));}guideGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),guideMaterial));});
  let frame=0, smoothProgress=progress, lastTime=0, spin=0;
  const initialRot = -.3;
  const ease = t => t*t*(3-2*t);
  function updateModel(time=0) {
    const dt=Math.min(.05,(time-lastTime)/1000||0);lastTime=time;
    const p=paused ? frozenProgress : smoothProgress; visualProgress=p;
    const explode=ease(clamp((p-.1)/.36));
    const assemble=1-ease(clamp((p-.78)/.21));
    const spread=explode*assemble;
    aircraft.rotation.set(.05,initialRot+p*.68, -.025 + (paused ? 0 : Math.sin(time*.00032)*.018));
    aircraft.position.y=paused ? 0 : Math.sin(time*.00065)*.045;
    wings[0].position.set(-spread*.95,spread*.74,0);wings[1].position.set(spread*.95,spread*.74,0);
    wings[0].rotation.z=spread*.035;wings[1].rotation.z=-spread*.035;
    canopy.position.y=spread*1.58;fuselage.position.y=-spread*.20;
    fins[0].position.set(-spread*.20,spread*1.35,spread*.28);
    fins[1].position.set(spread*.20,spread*1.35,spread*.28);
    flaps[0].position.set(-spread*.95,spread*1.12,spread*.28);
    flaps[1].position.set(spread*.95,spread*1.12,spread*.28);
    gear.position.y=-spread*.62;
    motor.position.z=2.98+spread*.8;
    electronics.position.set(spread*.10,spread*.78,0);
    antenna.position.set(spread*.45,spread*1.14,spread*.45);
    cameraGroup.position.set(-spread*.10,-spread*.91,-spread*.45);
    if(!paused)spin+=dt*5;propeller.rotation.z=spin;
    guideMaterial.opacity=.08+spread*.15;
    if(!paused)effectTime+=dt;
    aircraft.updateMatrixWorld(true);
    cameraGroup.localToWorld(cameraOrigin.set(0,-.49,-1.02));
    antenna.localToWorld(antennaOrigin.set(0,.51,.75));
    discipline.update({chapter:currentChapter,time:effectTime,cameraOrigin,antennaOrigin});
    if(currentChapter===1){
      visionScan.style.top=`${8+(Math.sin(effectTime*.8)+1)*40}%`;
      tracks.forEach((track,i)=>{track.style.transform=`translate(${Math.sin(effectTime*.6+i)*8}px,${Math.cos(effectTime*.4+i)*5}px)`;});
    }
    if(currentChapter===2){
      const sweep=(effectTime*.13)%1;spectrumSweep.style.left=`${sweep*100}%`;
      spectrumBars.forEach((bar,i)=>{const x=i/(spectrumBars.length-1);const peak=Math.exp(-Math.pow((x-sweep)/.10,2));const second=Math.exp(-Math.pow((x-.73)/.07,2));bar.style.height=`${10+peak*68+second*23+Math.sin(i*2+effectTime)*4}%`;});
    }
    renderer.render(scene,camera);
  }
  function loop(time){frame=0;if(!visible||document.hidden)return;smoothProgress+= (progress-smoothProgress)*.10;updateModel(time);if(!paused)frame=requestAnimationFrame(loop);}
  renderScene=()=>{if(!visible||document.hidden)return;if(paused){smoothProgress=progress;updateModel(lastTime);}else if(!frame)frame=requestAnimationFrame(loop);};
  function resize(){const width=host.clientWidth,height=host.clientHeight;renderer.setSize(width,height);camera.aspect=width/height;camera.fov=width<650?40:34;camera.updateProjectionMatrix();renderScene();}
  new ResizeObserver(resize).observe(host);
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)renderScene();else if(frame){cancelAnimationFrame(frame);frame=0;}},{threshold:0}).observe(story);
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&frame){cancelAnimationFrame(frame);frame=0;}else renderScene();});
  renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();if(frame)cancelAnimationFrame(frame);frame=0;paused=true;document.querySelector('#scene-loading').hidden=false;document.querySelector('#scene-loading').textContent='3D görünüm durdu. Başvuruya aşağıdan devam edebilirsin.';motionButton.disabled=true;});
  resize(); renderScene();
} catch(error) {
  document.body.classList.add('scene-unavailable');
  document.querySelector('#scene-loading').textContent='3D görünüm bu tarayıcıda açılamadı. Alanları keşfedebilir ve başvuruya devam edebilirsin.';
  document.querySelector('#part-label').hidden=true;
  motionButton.hidden=true;
  console.warn('ARVUS 3D scene unavailable:', error);
}
