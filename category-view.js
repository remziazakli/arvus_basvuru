const reduce=matchMedia('(prefers-reduced-motion: reduce)');
const movie=document.querySelector('video');
if(movie){
  const button=document.querySelector('#media-toggle');
  const status=document.querySelector('#media-status');
  let userPaused=reduce.matches,onscreen=true;
  function sync(){button.textContent=movie.paused?'Animasyonu oynat ▷':'Animasyonu durdur Ⅱ';button.setAttribute('aria-pressed',String(!movie.paused));}
  async function play(){try{await movie.play();status.textContent='Konsept animasyonu · sessiz';}catch{status.textContent='Başlatmak için oynat düğmesine bas.';}sync();}
  button.addEventListener('click',()=>{if(movie.paused){userPaused=false;play();}else{userPaused=true;movie.pause();sync();}});
  movie.addEventListener('play',sync);movie.addEventListener('pause',sync);
  movie.addEventListener('error',()=>{status.textContent='Video açılamadı. Başvuruya devam edebilirsin.';button.disabled=true;});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)movie.pause();else if(!userPaused&&onscreen)play();});
  new IntersectionObserver(entries=>{onscreen=entries[0].isIntersecting;if(!onscreen)movie.pause();else if(!userPaused&&!document.hidden)play();}).observe(movie);
  reduce.addEventListener('change',e=>{if(e.matches){userPaused=true;movie.pause();}});
  if(!userPaused)play();else sync();
}
const modelHost=document.querySelector('#category-model');
if(modelHost){
  try{
    const T=await import('./vendor/three.module.js');
    const {buildAircraft}=await import('./aircraft.js');
    const m=buildAircraft(T),scene=new T.Scene();scene.add(m.aircraft);
    scene.add(new T.HemisphereLight(0xe5edff,0x15243d,3));
    const key=new T.DirectionalLight(0xffe7db,4);key.position.set(-5,8,-4);scene.add(key);
    const rim=new T.DirectionalLight(0x9cc2ff,3);rim.position.set(4,3,6);scene.add(rim);
    const renderer=new T.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.5;
    modelHost.append(renderer.domElement);document.querySelector('#model-fallback').hidden=true;
    const camera=new T.PerspectiveCamera(37,1,.1,100);camera.position.set(8,6,-10);camera.lookAt(0,0,0);
    const motion=document.querySelector('#media-toggle'),explode=document.querySelector('#explode-model');
    let paused=reduce.matches,target=0,amount=0,clock=0,last=0,frame=0,visible=true;
    function pose(){const s=amount;m.aircraft.rotation.y=-.25+Math.sin(clock*.14)*.23;
      m.wings.forEach((wing,i)=>wing.position.set((i?1:-1)*s*.9,s*.55,0));
      m.flaps.forEach((part,i)=>part.position.set((i?1:-1)*s*.9,s*.9,s*.22));
      m.fins.forEach((part,i)=>part.position.set((i?1:-1)*s*.2,s*1.1,s*.2));
      m.canopy.position.y=s*1.25;m.fuselage.position.y=-s*.16;m.gear.position.y=-s*.45;m.motor.position.z=2.98+s*.7;m.electronics.position.y=s*.60;m.antenna.position.y=s*.95;m.cameraGroup.position.y=-s*.5;m.propeller.rotation.z=clock*4;renderer.render(scene,camera);
    }
    function loop(t){frame=0;if(document.hidden||!visible)return;const dt=Math.min(.05,(t-last)/1000||0);last=t;if(!paused)clock+=dt;amount+= (target-amount)*.085;if(Math.abs(target-amount)<.001)amount=target;pose();if(!paused||amount!==target)frame=requestAnimationFrame(loop);}
    function request(){if(!frame&&visible&&!document.hidden)frame=requestAnimationFrame(loop);}
    function sync(){motion.textContent=paused?'Hareketi aç ▷':'Hareketi durdur Ⅱ';motion.setAttribute('aria-pressed',String(!paused));}
    motion.addEventListener('click',()=>{paused=!paused;sync();request();});
    explode.addEventListener('click',()=>{target=target?0:1;explode.textContent=target?'Parçaları birleştir':'Parçaları keşfet';explode.setAttribute('aria-pressed',String(!!target));if(reduce.matches||paused){amount=target;pose();}else request();});
    reduce.addEventListener('change',e=>{if(e.matches){paused=true;amount=target;sync();request();}});
    new ResizeObserver(()=>{renderer.setSize(modelHost.clientWidth,modelHost.clientHeight);camera.aspect=modelHost.clientWidth/modelHost.clientHeight;camera.updateProjectionMatrix();pose();}).observe(modelHost);
    new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)request();else if(frame){cancelAnimationFrame(frame);frame=0;}}).observe(modelHost);
    document.addEventListener('visibilitychange',()=>{if(document.hidden&&frame){cancelAnimationFrame(frame);frame=0;}else request();});
    renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();if(frame)cancelAnimationFrame(frame);frame=0;visible=false;document.querySelector('#model-fallback').hidden=false;document.querySelector('#model-fallback').textContent='3D görünüm durdu. Başvuruya devam edebilirsin.';motion.disabled=true;explode.disabled=true;});
    sync();request();
  }catch(error){document.querySelector('#model-fallback').textContent='3D görünüm açılamadı. Başvuruya aşağıdaki düğmeden devam edebilirsin.';document.querySelectorAll('.model-actions button').forEach(b=>b.disabled=true);console.warn(error);}
}
