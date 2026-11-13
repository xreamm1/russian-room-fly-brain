// Approximate body mechanics in metres and seconds; not a validated fly aerodynamics model.
export const ROOM_SOLIDS = [
  {name:'Пол',min:[-3.6,-.2,-3.1],max:[3.6,0,3.1]},
  {name:'Потолок',min:[-3.6,3.4,-3.1],max:[3.6,3.6,3.1]},
  {name:'Стена',min:[-3.6,0,-3.1],max:[3.6,3.4,-2.94]},
  {name:'Окно / стена',min:[-3.6,0,-3],max:[-3.44,3.4,3]},
  {name:'Граница комнаты',min:[3.44,0,-3],max:[3.6,3.4,3]},
  {name:'Граница комнаты',min:[-3.5,0,2.94],max:[3.5,3.4,3.1]},
  {name:'Стол',min:[.725,.995,.175],max:[2.375,1.115,1.225]},
  {name:'Диван',min:[-2.3,.4,-2.67],max:[1,1.36,-2.57]},
  {name:'Диван',min:[-2.3,.36,-2.65],max:[1,.86,-1.7]},
  {name:'Тумба',min:[2.45,0,-2.7],max:[3.35,1.24,-1.2]},
  {name:'Подоконник',min:[-3.5,.775,-2.2],max:[-3,.865,1.1]},
  {name:'Табурет',min:[1.25,.565,1.3],max:[1.85,.655,1.9]},
];
for(const x of [.88,2.22])for(const z of [.33,1.07])ROOM_SOLIDS.push({name:'Ножка стола',min:[x-.04,0,z-.04],max:[x+.04,1,z+.04]});
const axes=['x','y','z'],clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const RADIUS=.06;
function collide(position,velocity,solid) {
  const closest=axes.map((axis,i)=>clamp(position[axis],solid.min[i],solid.max[i]));
  const delta=axes.map((axis,i)=>position[axis]-closest[i]);
  const distance=Math.hypot(...delta);
  if(distance>RADIUS)return null;
  let normal,penetration;
  if(distance>1e-9){normal=delta.map(v=>v/distance);penetration=RADIUS-distance;}
  else {
    let depth=Infinity,axisIndex=0,sign=1;
    axes.forEach((axis,i)=>{for(const side of [-1,1]){const d=side<0?position[axis]-solid.min[i]:solid.max[i]-position[axis];if(d<depth){depth=d;axisIndex=i;sign=side;}}});
    normal=[0,0,0];normal[axisIndex]=sign;penetration=RADIUS+depth;
  }
  axes.forEach((axis,i)=>position[axis]+=normal[i]*penetration);
  const into=axes.reduce((sum,axis,i)=>sum+velocity[axis]*normal[i],0);
  if(into<0)axes.forEach((axis,i)=>velocity[axis]-=into*normal[i]);
  return {name:solid.name,normal};
}
export function createBodyState(position={x:0,y:1.5,z:0}) {
  return {position,velocity:{x:0,y:0,z:0},yaw:0,yawRate:0,contact:null,speed:0};
}
export function stepBody(body,motor,dt,solids=ROOM_SOLIDS) {
  if(!Number.isFinite(dt)||dt<=0)return body;
  const steps=Math.ceil(Math.min(dt,.05)*120),h=Math.min(dt,.05)/steps;
  // At about .33 drive, lift balances weight. Varying output accelerates the body vertically.
  const verticalForce=motor.thrust*30-9.81;
  for(let i=0;i<steps;i++){
    const v=body.velocity,p=body.position;
    const supported=body.contact?.normal[1]>.5&&verticalForce<.2;
    if(supported){v.x=0;v.z=0;body.yawRate=0;}
    else {
      body.yawRate+=(motor.turn-body.yawRate)*(1-Math.exp(-h*12));
      body.yaw+=body.yawRate*h;
      v.x+=(Math.sin(body.yaw)*motor.targetSpeed-v.x)*(1-Math.exp(-h*6));
      v.z+=(-Math.cos(body.yaw)*motor.targetSpeed-v.z)*(1-Math.exp(-h*6));
    }
    v.y=clamp(v.y+(verticalForce-v.y*7)*h,-.85,1.2);
    axes.forEach(axis=>p[axis]+=v[axis]*h);
    body.contact=null;
    for(const solid of solids){
      const contact=collide(p,v,solid);
      if(contact){
        body.contact=contact;
        if(contact.normal[1]>.5&&verticalForce<.2){v.x=0;v.z=0;}
      }
    }
    body.speed=Math.hypot(v.x,v.y,v.z);
  }
  return body;
}
