import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {Brain} from '../src/brain-core.js';
import {decodeBody} from '../src/body-adapter.js';
import {createBodyState,stepBody} from '../src/body-physics.js';
const params={dt:.1,tauMem:20,tauSyn:5,delay:1.8,refractory:2.2,rest:-52,threshold:-45,scale:.275,poissonWeight:250};
test('Autonomous body receives only neural activity, never environment or routes',()=>{const zero=decodeBody({});assert.equal(zero.thrust,0);assert.equal(zero.targetSpeed,0);assert.equal(zero.turn,0);assert.equal('targetHeight' in zero,false);const o={lightLeft:.5,lightRight:.6,danger:.8,odorLeft:.6,odorRight:.5};assert.deepEqual(decodeBody(o,{light:true,bait:true,danger:1}),decodeBody(o,{light:false,bait:false,danger:0}));const result=decodeBody(o);assert.ok(result.targetSpeed>=0&&result.targetSpeed<=1.2);assert.ok(Number.isFinite(result.turn));});
const floor=[{name:'Floor',min:[-10,-1,-10],max:[10,0,10]}];
test('Low neural lift lands on the floor and rests without a landing timer',()=>{const b=createBodyState();const m={thrust:.15,turn:.8,targetSpeed:.3};for(let i=0;i<600;i++)stepBody(b,m,1/120,floor);assert.ok(Math.abs(b.position.y-.06)<1e-8);assert.equal(b.contact.name,'Floor');const p={...b.position},yaw=b.yaw;for(let i=0;i<300;i++)stepBody(b,m,1/120,floor);assert.deepEqual(b.position,p);assert.equal(b.yaw,yaw);assert.equal(b.speed,0);});
test('Higher neural lift takes off from the contacted surface',()=>{const b=createBodyState({x:0,y:.06,z:0});stepBody(b,{thrust:0,turn:0,targetSpeed:0},1/120,floor);for(let i=0;i<120;i++)stepBody(b,{thrust:.5,turn:0,targetSpeed:.3},1/120,floor);assert.ok(b.position.y>.4);assert.equal(b.contact,null);});
test('Collision lands on a table but never teleports a fly up from below it',()=>{const table=[{name:'Table',min:[-1,1,-1],max:[1,1.1,1]}];const a=createBodyState({x:0,y:1.5,z:0});for(let i=0;i<240;i++)stepBody(a,{thrust:0,turn:0,targetSpeed:0},1/120,table);assert.ok(Math.abs(a.position.y-1.16)<1e-8);const b=createBodyState({x:0,y:.5,z:0});stepBody(b,{thrust:.327,turn:0,targetSpeed:0},1/120,table);assert.ok(b.position.y<.6);});
test('Wall collision removes inward velocity without reflecting the heading',()=>{const wall=[{name:'Wall',min:[.5,-5,-5],max:[1,5,5]}],b=createBodyState({x:.43,y:1,z:0});b.yaw=Math.PI/2;for(let i=0;i<240;i++)stepBody(b,{thrust:.327,turn:0,targetSpeed:.5},1/120,wall);assert.ok(b.position.x<=.44+1e-8);assert.equal(b.yaw,Math.PI/2);});
function tiny(weight=1000){return new Brain({neurons:2,params,inputs:{light:[0]},outputs:{motor:[1]}},new Uint32Array([0,1,1]),new Uint32Array([1]),new Int16Array([weight]),42);}
test('No stimulus produces no spontaneous spikes or fictitious motor output',()=>{const b=tiny(),r=b.run({},1000);assert.equal(r.total,0);assert.equal(r.outputs.motor,0);assert.deepEqual([...b.v],[-52,-52]);});
test('Delayed signed connectivity causes real downstream spikes',()=>{const b=tiny();b.v[0]=0;b.activate(0);b.run({},18);assert.equal(b.g[1],0);const r=b.run({},100);assert.ok(r.spikes.motor>0);assert.ok(r.outputs.motor>0);});
test('Inhibitory sign is preserved',()=>{const b=tiny(-1000);b.v[0]=0;b.activate(0);const r=b.run({},50);assert.equal(r.spikes.motor,0);assert.ok(b.v[1]<-52);});
test('Poisson input is reproducible with a seed and changes the network',()=>{const a=tiny(),b=tiny();const x=a.run({light:500},1000),y=b.run({light:500},1000);assert.deepEqual(x,y);assert.ok(x.total>0);assert.ok(x.spikes.motor>0);});
test('Refractory interval prevents immediate respiking',()=>{const b=tiny();b.v[0]=0;b.activate(0);assert.equal(b.run({},1).total,1);b.v[0]=0;assert.equal(b.run({},21).total,0);assert.equal(b.run({},1).total,1);});
test('All exported shards pass integrity, size, range and offset checks',()=>{
  const m=JSON.parse(readFileSync('public/brain/manifest.json'));assert.equal(m.neurons,138639);assert.equal(m.edges,15091983);
  function raw(d){const bytes=readFileSync('public/brain/'+d.file);assert.equal(bytes.length,d.bytes);assert.ok(bytes.length<20_000_000);assert.equal(createHash('sha256').update(bytes).digest('hex'),d.sha256);const data=gunzipSync(bytes);assert.equal(data.length,d.rawBytes);return data;}
  const o=raw(m.offsets);assert.equal(o.readUInt32LE(0),0);assert.equal(o.readUInt32LE(m.neurons*4),m.edges);for(let i=1;i<=m.neurons;i++)assert.ok(o.readUInt32LE(i*4)>=o.readUInt32LE((i-1)*4));
  let total=0;for(const s of m.shards){assert.equal(s.start,total);const d=raw(s);assert.equal(d.length,s.count*6);for(let i=0;i<s.count;i++)if(d.readUInt32LE(i*4)>=m.neurons)assert.fail('invalid target');total+=s.count;}assert.equal(total,m.edges);assert.equal(JSON.parse(raw(m.neuronIds)).length,m.neurons);
});
