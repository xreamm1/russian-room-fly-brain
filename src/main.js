import * as T from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createRoom } from './room.js';
import { decodeBody } from './body-adapter.js';
import { createBodyState, stepBody, ROOM_SOLIDS } from './body-physics.js';
import { sensoryRates } from './anatomical-sensors.js';
import { MuJoCoBody } from './mujoco-client.js';
import './style.css';

document.querySelector('#app').innerHTML=`
<main>
  <div id="viewport" aria-label="Интерактивная трёхмерная комната"></div>
  <header><div class="live"><i></i> ЖИВОЙ ЭКСПЕРИМЕНТ</div><button class="about-button" id="about-open" aria-label="О модели">i</button></header>
  <aside class="monitor"><div class="panel-title"><span>МОЗГ / ONLINE</span><span class="tag" id="brain-tag">ЗАГРУЗКА</span></div><div id="load-status" role="status">Подключение к CDN…</div><div class="progress"><div id="progress-fill"></div></div><div class="numbers"><div><strong>138 639</strong><span>нейронов</span></div><div><strong>15,09 млн</strong><span>направленных связей</span></div></div><div class="chart-heading"><span>АКТИВНОСТЬ НЕЙРОНОВ</span><span id="spike-count">— спайков</span></div><canvas id="chart" width="540" height="140" aria-label="График настоящих спайков нейросети"></canvas><div class="legend"><span><i></i> весь коннектом</span><span id="sim-time">0 мс</span></div><div class="motor-grid"><span>Тяга <b id="thrust-value">—</b></span><span>Поворот <b id="turn-value">—</b></span></div><div class="anatomy-status" id="anatomy-status">Разметка v783 · ожидает загрузки</div><div class="neuron-rates" id="neuron-rates">DNg02 — / — Гц</div><div class="physics-status" id="physics-status">Тело: приближённая физика</div><div id="behavior" class="behavior">Ожидает мозг</div><div class="time-scale" id="time-scale">LIF · шаг 0,1 мс · Web Worker</div></aside>
  <div id="fly-label" class="fly-label"><span></span>D. MELANOGASTER</div>
  <section class="controls" aria-label="Управление экспериментом"><div class="controls-caption"><span class="control-dot"></span> ИЗМЕНИТЕ СРЕДУ</div><div class="control-buttons"><button id="light" aria-pressed="true"><span class="button-symbol">☼</span><span>Люстра<span class="button-sub" id="light-state">Включена</span></span><span class="toggle on" id="light-toggle"></span></button><button id="bait" aria-pressed="false"><span class="button-symbol">◇</span><span>Положить приманку<span class="button-sub">Сахар + виртуальный пищевой запах</span></span><span class="control-plus" id="bait-mark">+</span></button><button id="camera" aria-pressed="false"><span class="button-symbol">◎</span><span>Камера<span class="button-sub" id="camera-state">Общий вид</span></span><span class="control-plus">↗</span></button></div><p class="hint">Проведите курсором рядом с мухой — она почувствует угрозу. <span>Перетаскивайте сцену, чтобы осмотреть комнату.</span></p></section>
  <footer><span>FLYWIRE 783 <span class="footer-sep">/</span> ПОЛНЫЙ КОННЕКТОМ</span><span class="model-note">Размеченные нейроны · экспериментальная связь с телом <button id="details">О модели ↗</button></span><span id="fps">— FPS</span></footer>
  <dialog id="about"><button id="about-close" aria-label="Закрыть">×</button><div class="eyebrow">ЧТО ЗДЕСЬ НАСТОЯЩЕЕ</div><h2>Мозг — из данных.<br>Комната — эксперимент.</h2><p>Загружаются все <b>138 639 нейронов и 15 091 983 связи</b> из вашего проекта: FlyWire, материализация 783. Знаки и целочисленные веса сохранены без прореживания. Контрольные суммы SHA-256 проверяются в браузере.</p><p>В отдельном Web Worker работает численный LIF-порт: шаг 0,1 мс, задержка синапса 1,8 мс, рефрактерность 2,2 мс. График показывает вычисленные спайки. Скорость нейросимуляции зависит от устройства и показана отдельно от FPS.</p><p><b>Подключена официальная разметка FAFB 783.</b> Свет поступает в 7 932 R1–6; виртуальный пищевой запах — в 68 ORN_DM1; угроза — в LC4/LPLC2, приближение поверхности — в LPLC4. Это грубые экспериментальные преобразователи стимулов, а не подключённая модель сетчатки Flyvis. Сахар активирует 21 GRN из исходного проекта только при контакте.</p><p>Считываются настоящие спайки 25 DNg02, четырёх DNp07/DNp10, двух DNp01 и двух DNa02. DNa02 показываются как ходьбовые выходы и не используются для полёта. Старый ridge-декодер удалён. DNg02 регулируют уже идущий полёт и сами по себе не являются командой взлёта. DNp07/DNp10 участвуют в разгибании ног, но не задают торможение.</p><p><b>Моторное соответствие остаётся исследовательским.</b> Частоты DNg02 преобразуются в условные силы крыльев; это явно обозначенная гипотеза, не полная карта нервной цепочки и мышц. При нулевом моторном выходе полёт не добавляется автоматически. Локально доступна настоящая физика Flybody/MuJoCo без обученных RL-политик и готовых маршрутов. GitHub Pages не запускает Python: там работает приближённое тело. BANC/FANC и веса Flyvis не считаются подключёнными без отдельной регистрации клеток и моторной валидации.</p><p><a href="https://github.com/xreamm1/russian-room-fly-brain" target="_blank" rel="noreferrer">Код, данные и описание метода ↗</a></p></dialog>
</main>`;

const $=id=>document.getElementById(id);
const scene=new T.Scene();scene.background=new T.Color('#b8b9a6');scene.fog=new T.Fog('#b8b9a6',16,35);
const viewport=$('viewport');
let renderer;
try { renderer=new T.WebGLRenderer({antialias:true,powerPreference:'high-performance'}); }
catch { $('load-status').textContent='WebGL недоступен в этом браузере.';throw new Error('WebGL unavailable'); }
renderer.setPixelRatio(Math.min(devicePixelRatio,1.8));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;
renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;viewport.append(renderer.domElement);
const camera=new T.PerspectiveCamera(42,1,.025,60);camera.position.set(8.8,6.1,10.5);
const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(-.15,1.1,0);controls.enableDamping=true;controls.maxPolarAngle=Math.PI/2-.04;controls.minDistance=5;controls.maxDistance=17;controls.maxAzimuthAngle=Math.PI*.48;controls.minAzimuthAngle=-.1;controls.enablePan=false;
const room=createRoom(scene);room.fly.position.set(-.45,1.5,.5);
const body=createBodyState(room.fly.position);
const mujoco=new MuJoCoBody(scene,status=>$('physics-status').textContent=status);
const floor=new T.Mesh(new T.PlaneGeometry(200,200),new T.MeshStandardMaterial({color:'#a8ac98',roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.y=-.22;floor.receiveShadow=true;scene.add(floor);
const worker=new Worker(new URL('./brain.worker.js',import.meta.url),{type:'module'});
let ready=false, light=true,bait=false,fpv=false,activity=null,outputs={},danger=0,lastStimulus=0;
let yaw=0,speed=0,landed=false,last=performance.now(),sensorTime=0,frames=0,fpsStart=last;
const cursor=new T.Vector2(10,10),projected=new T.Vector3();
const history=Array(110).fill(0);let smoothed={flightLeft:0,flightRight:0,landing:0,escape:0,walkLeft:0,walkRight:0};
const debug={ready:false,activity:null,rates:{},position:[],fps:0,source:null,errors:[]};window.__flyDebug=debug;
worker.onmessage=({data})=>{
  if(data.type==='loading'){$('progress-fill').style.width=`${data.progress*100}%`;$('load-status').textContent=`Загрузка связей · ${Math.round(data.progress*100)}%`;}
  if(data.type==='source-error'){debug.errors.push(data);console.warn('Brain CDN source failed',data);$('load-status').textContent='Пробуем зеркало GitHub Pages…';}
  if(data.type==='error'){$('load-status').textContent=data.message;$('brain-tag').textContent='ОШИБКА';$('brain-tag').classList.add('error');const retry=document.createElement('button');retry.textContent='Повторить загрузку';retry.onclick=()=>location.reload();$('load-status').append(retry);}
  if(data.type==='ready'){ready=true;debug.ready=true;debug.source=data.source;$('brain-tag').textContent='ПОДКЛЮЧЁН';$('brain-tag').classList.add('ready');$('load-status').textContent=(data.source.includes('127.0.0.1')||data.source.includes('localhost'))?'Локальное зеркало · SHA-256 проверен':(data.cached?'Кэш CDN · SHA-256 проверен':(data.source.includes('jsdelivr')?'jsDelivr CDN · SHA-256 проверен':'GitHub Pages CDN · SHA-256 проверен'));$('progress-fill').style.width='100%';document.querySelector('.monitor').classList.add('loaded');$('anatomy-status').textContent='Официальная разметка FAFB 783';debug.anatomy=data.anatomy;}
  if(data.type==='activity'){
    activity=data;debug.activity=data;outputs=data.outputs;
    smoothed=data.filteredHz;
    mujoco.drive(smoothed,10);
    history.push(data.total);history.shift();drawChart();
    $('spike-count').textContent=`${data.total.toLocaleString('ru')} / 10 мс`;$('sim-time').textContent=`${Math.round(data.simMs).toLocaleString('ru')} мс`;
    $('time-scale').textContent=`Нейровремя ×${data.ratio.toFixed(2)} · расчёт ${Math.round(data.computeMs)} мс`;
  }
};
worker.onerror=error=>{debug.errors.push(String(error.message));$('load-status').textContent='Ошибка нейросимуляции. Обновите страницу.';};
worker.postMessage({type:'load'});
function drawChart(){const c=$('chart'),ctx=c.getContext('2d'),w=c.width,h=c.height;ctx.clearRect(0,0,w,h);ctx.strokeStyle='rgba(219,228,201,.08)';ctx.lineWidth=1;for(let y=20;y<h;y+=35){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}const max=Math.max(20,...history)*1.2;ctx.beginPath();history.forEach((v,i)=>{const x=i/(history.length-1)*w,y=h-10-v/max*(h-25);i?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.strokeStyle='#d0de98';ctx.lineWidth=2;ctx.stroke();ctx.lineTo(w,h);ctx.lineTo(0,h);ctx.closePath();const gradient=ctx.createLinearGradient(0,0,0,h);gradient.addColorStop(0,'rgba(208,222,152,.25)');gradient.addColorStop(1,'rgba(208,222,152,0)');ctx.fillStyle=gradient;ctx.fill();}
drawChart();
function stimulus(message){$('behavior').textContent=message;lastStimulus=performance.now();}
$('light').onclick=()=>{light=!light;room.setLight(light);$('light').setAttribute('aria-pressed',light);$('light-toggle').classList.toggle('on',light);$('light-state').textContent=light?'Включена':'Выключена';stimulus(light?'Световой стимул включён':'Световой стимул ослаблен');};
$('bait').onclick=()=>{bait=!bait;room.sugar.visible=bait;$('bait').setAttribute('aria-pressed',bait);$('bait').classList.toggle('selected',bait);$('bait-mark').textContent=bait?'✓':'+';stimulus(bait?'Пищевой запах → ORN_DM1; сахар при контакте':'Приманка убрана');};
let savedPosition=camera.position.clone(),savedTarget=controls.target.clone();
$('camera').onclick=()=>{fpv=!fpv;$('camera').setAttribute('aria-pressed',fpv);$('camera-state').textContent=fpv?'Глазами мухи':'Общий вид';controls.enabled=!fpv;room.fly.visible=!fpv;$('fly-label').hidden=fpv;document.body.classList.toggle('fpv',fpv);if(fpv){savedPosition.copy(camera.position);savedTarget.copy(controls.target);}else{camera.position.copy(savedPosition);controls.target.copy(savedTarget);camera.fov=42;camera.updateProjectionMatrix();}};
for(const id of ['about-open','details'])$(id).onclick=()=>$('about').showModal();$('about-close').onclick=()=>$('about').close();$('about').onclick=event=>{if(event.target===$('about'))$('about').close();};
renderer.domElement.addEventListener('pointermove',event=>{const r=renderer.domElement.getBoundingClientRect();cursor.set((event.clientX-r.left)/r.width*2-1,-(event.clientY-r.top)/r.height*2+1);});
renderer.domElement.addEventListener('pointerleave',()=>cursor.set(10,10));
function resize(){const w=viewport.clientWidth,h=viewport.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();}new ResizeObserver(resize).observe(viewport);resize();
const baitPoint=new T.Vector3(1.9,1.19,.42),windowPoint=new T.Vector3(-3.25,1.8,-.55),lampPoint=new T.Vector3(0,2.5,0);
function bearing(point){const delta=point.clone().sub(room.fly.position);return Math.atan2(Math.sin(Math.atan2(delta.x,-delta.z)-yaw),Math.cos(Math.atan2(delta.x,-delta.z)-yaw));}
function sensors(){
  projected.copy(room.fly.position).project(camera);
  const proximity=Math.hypot((cursor.x-projected.x)*camera.aspect,cursor.y-projected.y);
  danger=Math.max(danger*.85,!fpv&&projected.z<1?T.MathUtils.clamp(1-proximity/.18,0,1):0);
  const odor=bait?Math.exp(-room.fly.position.distanceTo(baitPoint)/3):0;
  const odorAngle=bearing(baitPoint),lightAngle=bearing(light?lampPoint:windowPoint);
  const direction=new T.Vector3(Math.sin(yaw),0,-Math.cos(yaw));
  const ray=new T.Ray(room.fly.position,direction);let nearest=Infinity;
  for(const solid of ROOM_SOLIDS){const hit=ray.intersectBox(new T.Box3(new T.Vector3(...solid.min),new T.Vector3(...solid.max)),new T.Vector3());if(hit)nearest=Math.min(nearest,hit.distanceTo(room.fly.position));}
  const landingLoom=speed>.02?T.MathUtils.clamp((.5-nearest)/.5,0,1):0;
  const rates=sensoryRates({light,lightAngle,odor,odorAngle,threat:danger,landingLoom,contactSugar:bait&&room.fly.position.distanceTo(baitPoint)<.24});
  debug.rates=rates;worker.postMessage({type:'sensors',rates});
}
function animate(now){
  const dt=Math.min((now-last)/1000,.04);last=now;frames++;
  if(now-fpsStart>1000){debug.fps=Math.round(frames*1000/(now-fpsStart));$('fps').textContent=`${debug.fps} FPS`;frames=0;fpsStart=now;}
  if(now-sensorTime>75){sensors();sensorTime=now;}
  const decoded=decodeBody(smoothed),{thrust}=decoded;
  // The body receives only decoded neural readouts. Environment affects the brain via sensors().
  const turn=decoded.turn;
  const pos=room.fly.position;
  room.fly.visible=!fpv&&!mujoco.everConnected;mujoco.group.visible=!fpv;
  if(ready&&mujoco.state){
    pos.set(...mujoco.state.position);yaw=mujoco.state.yaw;speed=mujoco.state.speed;
    landed=mujoco.state.contact!==null&&speed<.025;mujoco.render();
  } else if(ready&&!mujoco.everConnected){
    stepBody(body,decoded,dt);
    yaw=body.yaw;speed=body.speed;
    landed=body.contact!==null&&Math.hypot(body.velocity.x,body.velocity.y,body.velocity.z)<.025;
  }
  room.fly.rotation.set(landed?0:Math.min(.18,speed*.2),yaw,landed?0:-turn*.12);
  room.wings.forEach((wing,i)=>wing.rotation.z=(i?1:-1)*(landed?.12:Math.sin(now*.09)*.55*Math.min(1,thrust*3)));
  room.locator.quaternion.copy(room.fly.quaternion).invert().multiply(camera.quaternion);
  room.dust.rotation.y=now*.000006;
  if(fpv){const forward=new T.Vector3(Math.sin(yaw),.05,-Math.cos(yaw));camera.position.copy(pos).addScaledVector(forward,.16);camera.lookAt(pos.clone().addScaledVector(forward,2));camera.fov=78;camera.updateProjectionMatrix();}else controls.update();
  projected.copy(pos).project(camera);const rect=viewport.getBoundingClientRect();$('fly-label').style.left=`${(projected.x*.5+.5)*rect.width+18}px`;$('fly-label').style.top=`${(-projected.y*.5+.5)*rect.height-18}px`;$('fly-label').style.opacity=projected.z<1?'1':'0';
  $('neuron-rates').textContent=`DNg02 ${smoothed.flightLeft.toFixed(1)} / ${smoothed.flightRight.toFixed(1)} Гц · DNp07/10 ${smoothed.landing.toFixed(1)}`;
  $('thrust-value').textContent=`${Math.round(thrust*100)}%`;$('turn-value').textContent=`${turn>=0?'+':''}${turn.toFixed(2)}`;
  const contact=mujoco.state?.contact??body.contact?.name??null;
  if(now-lastStimulus>2000)$('behavior').textContent=!ready?'Ожидает мозг':landed?`Контакт · ${contact.toLowerCase()}`:`Движение · ${speed.toFixed(2)} м/с`;
  document.querySelector('.monitor').dataset.telemetry=JSON.stringify({ready,simMs:activity?.simMs??0,position:pos.toArray(),speed,landed,contact,channels:decoded.channels,rates:debug.rates,engine:mujoco.everConnected?'MuJoCo/Flybody':'browser approximation',bodyTime:mujoco.state?.time??null});
  debug.position=pos.toArray();debug.thrust=thrust;debug.turn=turn;debug.landed=landed;debug.light=light;debug.bait=bait;debug.fpv=fpv;
  renderer.render(scene,camera);
}
renderer.setAnimationLoop(animate);
document.addEventListener('visibilitychange',()=>{if(document.hidden)worker.postMessage({type:'sensors',rates:{}});});
