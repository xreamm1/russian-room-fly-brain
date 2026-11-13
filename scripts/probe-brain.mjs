import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
import {Brain} from '../src/brain-core.js';
const m=JSON.parse(readFileSync('public/brain/manifest.json'));
function raw(file){const b=gunzipSync(readFileSync('public/brain/'+file));return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);}
const offsets=new Uint32Array(raw(m.offsets.file)),targets=new Uint32Array(m.edges),weights=new Int16Array(m.edges);
for(const s of m.shards){const b=raw(s.file);targets.set(new Uint32Array(b,0,s.count),s.start);weights.set(new Int16Array(b,s.count*4,s.count),s.start);}
const results={};
for(const stimulus of ['none','lightLeft','lightRight','danger','odorLeft','odorRight','sugar']){
  const b=new Brain(m,offsets,targets,weights),start=performance.now();let counts=0,last;
  for(let k=0;k<10;k++){last=b.run(stimulus==='none'?{}:{[stimulus]:200},100);counts+=last.total;}
  results[stimulus]={spikes:counts,outputs:last.outputs,readoutSpikes:last.spikes,computeMs:Math.round(performance.now()-start),active:last.active};
  if(stimulus==='none')assert.equal(counts,0);else assert.ok(counts>0);
  console.log(stimulus,JSON.stringify(results[stimulus]));
}
for(const s of ['lightLeft','lightRight','danger','odorLeft','odorRight'])assert.ok(results[s].outputs[s]>0,`${s}: downstream response missing`);
assert.notDeepEqual(results.lightLeft.outputs,results.lightRight.outputs);
console.log('PASS: complete network responds to all injection channels; silent control stays silent.');
