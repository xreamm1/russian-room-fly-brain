import * as T from 'three';
export class MuJoCoBody {
  constructor(scene,onStatus) {
    this.state=null;this.connected=false;this.everConnected=false;this.busy=false;this.pendingMs=0;this.parts=new Map();this.group=new T.Group();scene.add(this.group);
    if(!['localhost','127.0.0.1'].includes(location.hostname)){onStatus('Тело: приближённое · Python недоступен на Pages');return;}
    this.socket=new WebSocket(`${location.protocol==='https:'?'wss':'ws'}://${location.host}${import.meta.env.BASE_URL}api/body`);
    onStatus('Подключение Flybody / MuJoCo…');
    this.socket.onmessage=({data})=>{
      const message=JSON.parse(data);
      if(message.type==='model'){
        this.connected=true;this.everConnected=true;this.model=message;
        const scale=.35; // cm dimensions -> metres with 35x visual enlargement
        for(const p of message.parts){
          let g;const [x,y,z]=p.size;
          if(p.type===3)g=new T.CapsuleGeometry(x*scale,2*y*scale,3,8);
          else if(p.type===5)g=new T.CylinderGeometry(x*scale,x*scale,2*y*scale,10);
          else if(p.type===6)g=new T.BoxGeometry(2*x*scale,2*z*scale,2*y*scale);
          else {g=new T.SphereGeometry(1,12,8);}
          const wing=p.type===4;
          const mesh=new T.Mesh(g,new T.MeshStandardMaterial({color:wing?'#c5d2be':'#353b2d',transparent:wing,opacity:wing?.35:1,roughness:.65}));
          if(p.type===2)mesh.scale.setScalar(x*scale);
          if(p.type===4)mesh.scale.set(x*scale,z*scale,y*scale);
          mesh.castShadow=true;this.group.add(mesh);this.parts.set(p.id,mesh);
        }
        onStatus(`Flybody / MuJoCo · ${message.nbody} тел · моторная связь пробная`);
      }
      if(message.type==='state'){this.state=message;this.busy=false;}
      if(message.type==='error'){this.connected=false;onStatus('Ошибка MuJoCo: '+message.message);}
    };
    this.socket.onerror=()=>onStatus('MuJoCo недоступен · работает приближённое тело');
    this.socket.onclose=()=>{this.connected=false;onStatus(this.everConnected?'MuJoCo отключён · тело остановлено':'MuJoCo недоступен · приближённое тело');};
  }
  drive(ratesHz,neuralMs=10) {
    if(!this.connected)return;
    this.pendingMs+=neuralMs;
    if(this.busy||this.socket.readyState!==WebSocket.OPEN)return;
    const ms=Math.min(50,this.pendingMs);this.pendingMs-=ms;this.busy=true;
    this.socket.send(JSON.stringify({neuralMs:ms,flightLeft:ratesHz.flightLeft||0,flightRight:ratesHz.flightRight||0,landing:ratesHz.landing||0}));
  }
  render() {
    if(!this.state)return;
    const root=new T.Vector3(...this.state.position),transform=new T.Matrix4().makeRotationX(-Math.PI/2),inverse=transform.clone().invert();
    for(const part of this.state.parts){
      const mesh=this.parts.get(part.id);if(!mesh)continue;
      mesh.position.set(...part.p).sub(root).multiplyScalar(35).add(root);mesh.position.y+=.045;
      const m=new T.Matrix4().set(...part.q[0],0,...part.q[1],0,...part.q[2],0,0,0,0,1);
      m.premultiply(transform).multiply(inverse);mesh.quaternion.setFromRotationMatrix(m);
    }
  }
}
