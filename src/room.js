import * as T from 'three';

function texture(draw, size=512) {
  const canvas=document.createElement('canvas'); canvas.width=canvas.height=size;
  draw(canvas.getContext('2d'),size);
  const map=new T.CanvasTexture(canvas); map.colorSpace=T.SRGBColorSpace;
  map.wrapS=map.wrapT=T.RepeatWrapping; map.anisotropy=8; return map;
}
const mat=(color,extra={})=>new T.MeshStandardMaterial({color,roughness:.8,...extra});
export function createRoom(scene) {
  const room=new T.Group(); scene.add(room);
  function box(w,h,d,x,y,z,material,parent=room) {
    const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),material); mesh.position.set(x,y,z);
    mesh.castShadow=true; mesh.receiveShadow=true; parent.add(mesh); return mesh;
  }
  function sphere(r,x,y,z,material,parent=room,scale=[1,1,1]) {
    const mesh=new T.Mesh(new T.SphereGeometry(r,24,16),material); mesh.position.set(x,y,z);mesh.scale.set(...scale);mesh.castShadow=true;parent.add(mesh);return mesh;
  }
  function cylinder(rt,rb,h,x,y,z,material,parent=room) {
    const mesh=new T.Mesh(new T.CylinderGeometry(rt,rb,h,32),material);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
  }
  const wood=texture((c,s)=>{ c.fillStyle='#795038';c.fillRect(0,0,s,s);for(let i=0;i<1400;i++){const y=Math.random()*s;c.strokeStyle=`rgba(34,16,7,${Math.random()*.18})`;c.beginPath();c.moveTo(0,y);c.bezierCurveTo(s*.3,y+Math.random()*12,s*.8,y-5,s,y+2);c.stroke();}for(let y=0;y<s;y+=64){c.fillStyle='#382a22';c.fillRect(0,y,s,2);c.fillRect((y%128?170:350),y,2,64);}});
  wood.repeat.set(3,3);
  const wallpaper=texture((c,s)=>{c.fillStyle='#c6bf9e';c.fillRect(0,0,s,s);for(let x=0;x<s;x+=64)for(let y=0;y<s;y+=96){c.strokeStyle='#9b9d7f';c.lineWidth=2;c.beginPath();c.moveTo(x+32,y+5);c.bezierCurveTo(x+2,y+28,x+10,y+57,x+32,y+86);c.bezierCurveTo(x+53,y+57,x+62,y+28,x+32,y+5);c.stroke();for(let a=0;a<6;a++){c.save();c.translate(x+32,y+42);c.rotate(a*Math.PI/3);c.fillStyle='#a5a588';c.beginPath();c.ellipse(0,8,3,9,0,0,Math.PI*2);c.fill();c.restore();}}});
  wallpaper.repeat.set(3,1.5);
  const rug=texture((c,s)=>{c.fillStyle='#732e2c';c.fillRect(0,0,s,s);const colors=['#cfa67b','#412b27','#b2674c','#d4b98b'];for(let b=0;b<6;b++){c.strokeStyle=colors[b%4];c.lineWidth=4;c.strokeRect(12+b*9,12+b*9,s-24-b*18,s-24-b*18);}function diamond(x,y,r,col){c.fillStyle=col;c.beginPath();c.moveTo(x,y-r);c.lineTo(x+r,y);c.lineTo(x,y+r);c.lineTo(x-r,y);c.closePath();c.fill();}for(let x=85;x<450;x+=57)for(let y=85;y<450;y+=57){diamond(x,y,20,'#b77453');diamond(x,y,13,'#392c28');diamond(x,y,5,'#d8bb83');}diamond(256,256,142,'#b17d52');diamond(256,256,127,'#3b3530');diamond(256,256,110,'#813c32');diamond(256,256,74,'#d0a16d');diamond(256,256,60,'#463c30');for(let i=0;i<8000;i++){c.fillStyle='rgba(240,210,160,.08)';c.fillRect(Math.random()*s,Math.random()*s,1,3);}});
  const floorMat=mat('#fff',{map:wood}), wallMat=mat('#fff',{map:wallpaper});
  const darkwood=mat('#593c29'), cream=mat('#e1d8bd'), brass=mat('#9c7944',{metalness:.7,roughness:.35});
  box(7,.16,6,0,-.12,0,floorMat);
  box(7,3.5,.12,0,1.7,-3,wallMat);
  // A real opening in the left wall, rather than an opaque window painted on it.
  box(.12,3.5,.9,-3.5,1.7,-2.55,wallMat);box(.12,3.5,2,-3.5,1.7,2,wallMat);
  box(.12,.85,3.1,-3.5,.37,-.55,wallMat);box(.12,.55,3.1,-3.5,3.17,-.55,wallMat);
  box(7,.12,.1,0,.06,-2.9,darkwood);box(.1,.12,6,-3.4,.06,0,darkwood);
  box(7,.16,.18,0,3.38,-2.9,cream);box(.18,.16,6,-3.4,3.38,0,cream);
  const sky=mat('#bbd6ce',{emissive:'#aacbc9',emissiveIntensity:.65});
  box(.04,2.05,2.85,-3.55,1.91,-.55,sky);
  for(const z of [-1.98,.88])box(.15,2.14,.09,-3.42,1.9,z,cream);
  for(const y of [.86,2.96])box(.15,.09,2.95,-3.42,y,-.55,cream);
  box(.18,2.1,.075,-3.4,1.9,-.55,cream);box(.18,.06,2.9,-3.4,2.25,-.55,cream);
  box(.5,.09,3.3,-3.25,.82,-.55,cream);
  // Translucent pleated tulle, leaving the centre open to daylight.
  const curtain=mat('#faf3da',{transparent:true,opacity:.28,side:T.DoubleSide,depthWrite:false});
  for(const side of [-1,1])for(let i=0;i<13;i++){
    const z=-.55+side*(.68+i*.055);const panel=box(.035,2.5,.068,-3.03+Math.sin(i*1.5)*.055,1.83,z,curtain); panel.castShadow=false;
  }
  cylinder(.025,.025,3.25,-3.04,3.12,-.55,brass).rotation.x=Math.PI/2;
  for(let i=0;i<12;i++){
    const z=-1.65+i*.19;box(.25,.52,.12,-3.1,.4,z,cream);sphere(.065,-3.1,.66,z,cream);sphere(.065,-3.1,.14,z,cream);
  }
  for(const y of [.24,.56]){const pipe=cylinder(.035,.035,2.7,-3.13,y,-.55,cream);pipe.rotation.x=Math.PI/2;}
  // Walnut sofa and the unmistakable carpet on the wall.
  box(3.25,.17,.98,-.65,.36,-2.25,darkwood);
  const upholstery=mat('#6b7664');
  box(3,.38,.9,-.65,.62,-2.18,upholstery);box(3.15,.7,.2,-.65,1.01,-2.67,upholstery);
  for(const x of [-2.3,1])box(.16,.55,1.05,x,.72,-2.22,darkwood);
  for(const x of [-1.95,.65])for(const z of [-2.52,-1.88])box(.09,.25,.09,x,.18,z,darkwood);
  for(let i=0;i<3;i++)box(.95,.04,.8,-1.65+i,.84,-2.17,mat('#7d856c'));
  const wallRug=new T.Mesh(new T.PlaneGeometry(3.7,1.65),mat('#fff',{map:rug}));wallRug.position.set(-.3,2.25,-2.91);room.add(wallRug);
  const floorRug=new T.Mesh(new T.PlaneGeometry(3.15,2.3),mat('#fff',{map:rug}));floorRug.rotation.x=-Math.PI/2;floorRug.position.set(-.25,.012,.35);floorRug.receiveShadow=true;room.add(floorRug);
  // Sideboard, a tiny television and books.
  box(.85,1.1,1.45,2.9,.6,-1.95,darkwood);box(.9,.08,1.5,2.9,1.2,-1.95,mat('#946b46'));
  for(const z of [-2.3,-1.6])box(.03,.85,.62,2.46,.63,z,mat('#775038'));
  box(.55,.48,.68,2.83,1.48,-1.98,mat('#403e34'));box(.04,.35,.49,2.54,1.49,-1.98,mat('#526459',{metalness:.3,roughness:.2}));
  for(let i=0;i<5;i++)box(.36,.045,.3,2.9,1.25+i*.045,-.98,mat(['#b9a783','#596c63','#904a38'][i%3]));
  // Tea table, glass in a podstakannik and enamel kettle.
  const table=new T.Group();table.position.set(1.55,0,.7);room.add(table);
  box(1.65,.11,1.05,0,1.05,0,mat('#b28d60'),table);
  for(const x of [-.67,.67])for(const z of [-.37,.37])box(.075,1,.075,x,.5,z,darkwood,table);
  const cloth=box(.65,.014,1.07,-.25,1.115,0,mat('#d9d3b9'),table);
  const kettle=mat('#b9d5c5',{metalness:.3,roughness:.28});sphere(.2,-.32,1.32,-.1,kettle,table,[1,1.1,1]);
  cylinder(.14,.18,.06,-.32,1.5,-.1,kettle,table);sphere(.035,-.32,1.55,-.1,darkwood,table);
  const spout=cylinder(.04,.065,.25,-.1,1.38,-.1,kettle,table);spout.rotation.z=-.9;
  const handle=new T.Mesh(new T.TorusGeometry(.17,.025,10,32,Math.PI),darkwood);handle.position.set(-.32,1.48,-.1);table.add(handle);
  cylinder(.085,.07,.19,.32,1.22,.15,mat('#d8e5cf',{transparent:true,opacity:.4,metalness:.15,roughness:.1}),table);
  cylinder(.072,.063,.095,.32,1.19,.15,mat('#75401d'),table);cylinder(.09,.075,.07,.32,1.15,.15,brass,table);
  const glassHandle=new T.Mesh(new T.TorusGeometry(.055,.012,8,20),brass);glassHandle.position.set(.42,1.2,.15);table.add(glassHandle);
  cylinder(.13,.13,.015,.38,1.12,-.28,cream,table);
  const sugar=new T.Group();table.add(sugar);sugar.visible=false;
  for(let i=0;i<5;i++){const cube=box(.045,.045,.045,.2+(i%3)*.055,1.14,-.3+Math.floor(i/3)*.055,mat('#fff5d9'),sugar);cube.rotation.y=i*.7;}
  // Stool beside the table.
  cylinder(.3,.3,.09,1.55,.61,1.6,darkwood);for(const x of [1.37,1.73])for(const z of [1.42,1.78])box(.05,.55,.05,x,.29,z,darkwood);
  // Warm five-arm chandelier, cutaway ceiling rail above.
  cylinder(.026,.026,.7,0,3,0,brass);sphere(.12,0,2.65,0,brass);
  const bulbs=[];
  for(let i=0;i<5;i++){
    const a=i/5*Math.PI*2,x=Math.cos(a)*.6,z=Math.sin(a)*.6;
    const arm=cylinder(.025,.025,.62,x/2,2.61,z/2,brass);arm.rotation.z=Math.PI/2;arm.rotation.y=-a;
    cylinder(.19,.11,.22,x,2.65,z,cream);bulbs.push(sphere(.075,x,2.8,z,mat('#ffdc91',{emissive:'#ffc368',emissiveIntensity:1.5})));
  }
  const lamp=new T.PointLight('#ffd28a',30,8,2);lamp.position.set(0,2.5,0);lamp.castShadow=true;lamp.shadow.mapSize.set(512,512);scene.add(lamp);
  const daylight=new T.DirectionalLight('#fff0cd',3.6);daylight.position.set(-6,7,1);daylight.castShadow=true;daylight.shadow.mapSize.set(2048,2048);daylight.shadow.camera.left=-6;daylight.shadow.camera.right=6;daylight.shadow.camera.top=6;daylight.shadow.camera.bottom=-6;daylight.shadow.normalBias=.025;scene.add(daylight);
  scene.add(new T.HemisphereLight('#d4e1d7','#605041',2.1));
  // Floating dust catches the light from the window.
  const dustGeo=new T.BufferGeometry(),dustPos=new Float32Array(150*3);for(let i=0;i<150;i++){dustPos[i*3]=Math.random()*5-3;dustPos[i*3+1]=Math.random()*3;dustPos[i*3+2]=Math.random()*5-2.5;}
  dustGeo.setAttribute('position',new T.BufferAttribute(dustPos,3));const dust=new T.Points(dustGeo,new T.PointsMaterial({color:'#fff3cd',size:.012,transparent:true,opacity:.5}));room.add(dust);
  // Fly geometry is enlarged for legibility; the body remains distinct from the locator.
  const fly=new T.Group();scene.add(fly);const black=mat('#272c26',{metalness:.2}),eye=mat('#8c392b',{metalness:.3,roughness:.35});
  sphere(.052,0,0,0,black,fly,[.8,.85,1.6]);sphere(.038,0,.01,-.083,black,fly);sphere(.025,-.025,.02,-.1,eye,fly);sphere(.025,.025,.02,-.1,eye,fly);
  const wings=[];
  for(const side of [-1,1]){
    const wing=sphere(.065,side*.075,.025,-.008,mat('#cbded3',{transparent:true,opacity:.55,metalness:.1,roughness:.15,side:T.DoubleSide}),fly,[1.1,.06,1.8]);wing.rotation.y=side*.4;wings.push(wing);
    for(let i=0;i<3;i++){const leg=cylinder(.003,.003,.10,side*.043,-.042,-.04+i*.04,black,fly);leg.rotation.z=side*.65;}
  }
  const locator=new T.Mesh(new T.RingGeometry(.16,.17,48),new T.MeshBasicMaterial({color:'#d8e594',transparent:true,opacity:.65,side:T.DoubleSide,depthTest:false}));fly.add(locator);
  return {fly,wings,locator,sugar,dust,setLight(on){lamp.intensity=on?30:0;bulbs.forEach(b=>b.material.emissiveIntensity=on?1.5:0);}};
}
