import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
import {Brain} from '../src/brain-core.js';
const m=JSON.parse(readFileSync('public/brain/manifest.json'));
function raw(file){const b=gunzipSync(readFileSync('public/brain/'+file));return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);}
const offsets=new Uint32Array(raw(m.offsets.file)),targets=new Uint32Array(m.edges),weights=new Int16Array(m.edges);
for(const s of m.shards){const b=raw(s.file);targets.set(new Uint32Array(b,0,s.count),s.start);weights.set(new Int16Array(b,s.count*4,s.count),s.start);}
const anatomy=JSON.parse(readFileSync('public/brain/anatomy-783.json'));
m.inputs=anatomy.inputs;m.outputs=anatomy.outputs;
for(const [name,rates] of Object.entries({silent:{},retina:{retinaLeft:20,retinaRight:20},loom:{loomLeft:150,loomRight:150},food:{odorLeft:100,odorRight:100,sugar:200}})){
  const b=new Brain(m,offsets,targets,weights),start=performance.now();let total=0,last;
  for(let i=0;i<10;i++){last=b.run(rates,100);total+=last.total;}
  if(name==='silent')assert.equal(total,0);else assert.ok(total>0);
  console.log(name,JSON.stringify({spikes:total,Hz:last.filteredHz,computeMs:Math.round(performance.now()-start)}));
}
// Afferents may spike but no descending cell can respond with every synapse removed.
const disconnected=new Brain(m,offsets,targets,new Int16Array(m.edges));
const r=disconnected.run({retinaLeft:100,retinaRight:100,loomLeft:200,loomRight:200},1000);
assert.ok(r.total>0);assert.ok(Object.values(r.spikes).every(n=>n===0));
console.log('PASS: stimuli enter sensory cells; descending outputs require connectivity; no motor injection.');
