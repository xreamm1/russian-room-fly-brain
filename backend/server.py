"""Local Flybody/MuJoCo process. No RL policy, trajectory controller or gait generator.

DN->actuator gains are experimental proxies, not an anatomical muscle reconstruction.
Only the local Vite origin may open the WebSocket; bind Uvicorn to 127.0.0.1.
"""
import asyncio
import math
from pathlib import Path
import json
import numpy as np
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from pydantic import BaseModel, ConfigDict, Field
from dm_control import mjcf
from flybody.fruitfly.fruitfly import FruitFly

app=FastAPI()
ALLOWED_ORIGINS={'http://127.0.0.1:5173','http://localhost:5173'}
SOURCE_COMMIT='d015e9bfe441bd90ae431bac24c55cb74bdbce26'

class NeuralPacket(BaseModel):
    model_config=ConfigDict(extra='forbid',allow_inf_nan=False)
    neuralMs:float=Field(ge=.1,le=50)
    flightLeft:float=Field(default=0,ge=0,le=2000)
    flightRight:float=Field(default=0,ge=0,le=2000)
    landing:float=Field(default=0,ge=0,le=2000)

class FlyPhysics:
    def __init__(self):
        self.fly=FruitFly(use_legs=True,use_wings=True,force_actuators=True)
        world=mjcf.RootElement()
        world.option.timestep=.0001
        world.option.gravity=[0,0,-981]  # upstream centimetre/gram/second units
        world.option.density=.00128
        world.option.viscosity=.000185
        world.worldbody.add('geom',name='room_floor',type='plane',size=[400,400,1],friction=[1,.1,.01])
        # The same room surfaces as the browser, expressed in the upstream cm frame.
        solids=json.loads((Path(__file__).parent/'room-solids.json').read_text())
        self.surface_names={'room_floor':'Пол'}
        for i,s in enumerate(solids):
            if s['name']=='Пол':continue
            lo,hi=s['min'],s['max']
            center=[(lo[0]+hi[0])*50,-(lo[2]+hi[2])*50,(lo[1]+hi[1])*50]
            half=[(hi[0]-lo[0])*50,(hi[2]-lo[2])*50,(hi[1]-lo[1])*50]
            world.worldbody.add('geom',name=f'room_{i}',type='box',pos=center,size=half,friction=[1,.1,.01])
            self.surface_names[f'room_{i}']=s['name']
        frame=world.attach(self.fly.mjcf_model);frame.add('freejoint');frame.pos=[-45,-50,150]
        self.physics=mjcf.Physics.from_mjcf_model(world)
        self.actuators={a.name:a for a in self.fly.mjcf_model.find_all('actuator')}
        model=self.physics.model
        self.visible=[i for i in range(model.ngeom) if model.geom_bodyid[i]>1 and model.geom_group[i] in (3,4,5) and int(model.geom_type[i]) in (2,3,4,5,6)]

    def schema(self):
        m=self.physics.model
        return dict(type='model',engine='MuJoCo + Flybody',commit=SOURCE_COMMIT,
            nbody=m.nbody,nq=m.nq,nu=m.nu,
            warning='Direct experimental DN-to-torque proxy. No identified VNC muscle map; no learned policy; no artificial wing oscillator. Flight is not guaranteed.',
            parts=[dict(id=i,type=int(m.geom_type[i]),size=m.geom_size[i].tolist()) for i in self.visible])

    def advance(self,packet):
        controls={};p=self.physics
        p.data.ctrl[:]=0
        # Direct bounded torque offsets only; deliberately no wingbeat template.
        for side,hz in [('left',packet.flightLeft),('right',packet.flightRight)]:
            drive=hz/(hz+50)
            for joint,gain in [('yaw',.25),('roll',.12)]:
                name=f'wing_{joint}_{side}'
                p.bind(self.actuators[name]).ctrl=drive*gain
                controls[name]=drive*gain
        extension=packet.landing/(packet.landing+50)
        for name,a in self.actuators.items():
            if name.startswith('coxa_T1_'):
                p.bind(a).ctrl=extension*.1
                controls[name]=extension*.1
        steps=max(1,round(packet.neuralMs/1000/p.model.opt.timestep))
        p.step(nstep=steps)
        if not np.isfinite(p.data.qpos).all():raise RuntimeError('Non-finite MuJoCo state')
        root=p.bind(self.fly.root_body)
        cm=root.xpos.copy()
        # Native x/y/z -> browser x/z/-y; browser distances are metres.
        position=[cm[0]*.01,cm[2]*.01,-cm[1]*.01]
        quat=root.xquat.tolist()
        w,x,y,z=quat
        forward=[1-2*(y*y+z*z),2*(x*y+w*z),2*(x*z-w*y)]
        yaw=math.atan2(forward[0],forward[1])
        contacts=[]
        for c in p.data.contact:
            for g in [c.geom1,c.geom2]:
                name=p.model.id2name(int(g),'geom')
                if name in self.surface_names:contacts.append(self.surface_names[name])
        return dict(type='state',time=float(p.data.time),position=position,yaw=yaw,
            contacts=int(p.data.ncon),contact=next(iter(contacts),None),speed=float(np.linalg.norm(p.data.qvel[:3])*.01),control=controls,
            parts=[dict(id=i,p=[float(p.data.geom_xpos[i][0]*.01),float(p.data.geom_xpos[i][2]*.01),float(-p.data.geom_xpos[i][1]*.01)],q=p.data.geom_xmat[i].reshape(3,3).tolist()) for i in self.visible])

@app.get('/health')
def health():return {'engine':'MuJoCo/Flybody','sourceCommit':SOURCE_COMMIT,'motorMap':'experimental direct DN proxy','policy':None}

@app.websocket('/body')
async def body_socket(ws:WebSocket):
    if ws.headers.get('origin') not in ALLOWED_ORIGINS:
        await ws.close(code=1008);return
    await ws.accept()
    physics=None
    try:
        physics=await asyncio.to_thread(FlyPhysics)
        await ws.send_json(physics.schema())
        while True:
            packet=NeuralPacket.model_validate_json(await ws.receive_text())
            state=await asyncio.to_thread(physics.advance,packet)
            await ws.send_json(state)
    except WebSocketDisconnect:pass
    except Exception as error:
        await ws.send_json({'type':'error','message':str(error)})
        await ws.close(code=1011)
    finally:
        if physics is not None:physics.physics.free()
