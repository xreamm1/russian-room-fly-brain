import { Brain } from './brain-core.js';
import anatomyIntegrity from './anatomy-integrity.json' with {type:'json'};
const CDN = 'https://cdn.jsdelivr.net/gh/xreamm1/russian-room-fly-brain@brain-v1/public/brain/';
const MIRROR = 'https://xreamm1.github.io/russian-room-fly-brain/brain/';
let rates = {}, brain, timer, cache, cachedFiles=0;
async function cachedFetch(url) {
  cache??=await caches.open('fly-connectome-brain-v1');
  const existing=await cache.match(url);
  if(existing){cachedFiles++;return existing;}
  return fetch(url,{signal:AbortSignal.timeout(20000)});
}
async function fetchFile(base, file, descriptor) {
  const response = await cachedFetch(base+file);
  if (!response.ok) throw new Error(`${response.status}: ${file}`);
  const compressed = await response.arrayBuffer();
  if (descriptor) {
    const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256',compressed))].map(b=>b.toString(16).padStart(2,'0')).join('');
    if (hash !== descriptor.sha256 || compressed.byteLength !== descriptor.bytes) { await cache.delete(base+file);throw new Error(`Integrity: ${file}`); }
  }
  try { await cache.put(base+file,new Response(compressed)); } catch { /* Storage quota must not block simulation. */ }
  return new Response(new Blob([compressed]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
}
async function load(base) {
  const response = await cachedFetch(base+'manifest.json');
  if (!response.ok) throw new Error(`Manifest: ${response.status}`);
  const m = await response.json();
  if(m.format!==1 || m.neurons!==138639 || m.edges!==15091983) throw new Error('Unsupported connectome');
  try { await cache.put(base+'manifest.json',new Response(JSON.stringify(m))); } catch { /* Optional offline cache. */ }
  const targets = new Uint32Array(m.edges), weights = new Int16Array(m.edges);
  const offsets = new Uint32Array(await fetchFile(base,m.offsets.file,m.offsets));
  if(offsets.length!==m.neurons+1 || offsets[m.neurons]!==m.edges) throw new Error('Invalid offsets');
  for (let i=0;i<m.shards.length;i++) {
    const s = m.shards[i], buffer = await fetchFile(base,s.file,s);
    if(buffer.byteLength!==s.count*6) throw new Error('Invalid shard');
    targets.set(new Uint32Array(buffer,0,s.count),s.start);
    weights.set(new Int16Array(buffer,s.count*4,s.count),s.start);
    postMessage({type:'loading',progress:(i+1)/m.shards.length,source:base});
  }
  for(let i=0;i<m.edges;i++) if(targets[i]>=m.neurons) throw new Error('Invalid target');
  const anatomyResponse=await fetch(new URL(import.meta.env.BASE_URL+'brain/anatomy-783.json',location.origin));
  if(!anatomyResponse.ok)throw new Error('Anatomical profile unavailable');
  const anatomyBytes=await anatomyResponse.arrayBuffer();
  const anatomyHash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',anatomyBytes))].map(b=>b.toString(16).padStart(2,'0')).join('');
  if(anatomyHash!==anatomyIntegrity.sha256)throw new Error('Anatomical profile integrity mismatch');
  const anatomy=JSON.parse(new TextDecoder().decode(anatomyBytes));
  if(anatomy.neurons!==m.neurons||anatomy.format!==1)throw new Error('Incompatible anatomical profile');
  for(const pools of [anatomy.inputs,anatomy.outputs])for(const pool of Object.values(pools)){
    if(!pool.length||pool.some(i=>!Number.isInteger(i)||i<0||i>=m.neurons))throw new Error('Invalid anatomical indices');
  }
  m.inputs=anatomy.inputs;m.outputs=anatomy.outputs;
  brain = new Brain(m,offsets,targets,weights);
  postMessage({type:'ready',neurons:m.neurons,edges:m.edges,source:base,cached:cachedFiles>0,anatomy:{revision:anatomy.revision,counts:Object.fromEntries(Object.entries(anatomy.groups).map(([k,v])=>[k,v.length]))}});
  let last = performance.now();
  const loop = () => {
    const start = performance.now(), result = brain.run(rates,100), elapsed = performance.now()-last;
    last=performance.now();
    postMessage({type:'activity',...result,computeMs:performance.now()-start,ratio:10/elapsed});
    timer = setTimeout(loop,Math.max(10,80-(performance.now()-start)));
  };
  loop();
}
onmessage = async ({data}) => {
  if(data.type==='sensors') rates=data.rates;
  if(data.type==='load') {
    clearTimeout(timer);
    const sources=[CDN,MIRROR];
    if(['127.0.0.1','localhost'].includes(location.hostname))sources.push(new URL(import.meta.env.BASE_URL+'brain/',location.origin).href);
    for(const base of sources) {
      try { await load(base); return; }
      catch(error) { postMessage({type:'source-error',source:base,message:error.message}); }
    }
    postMessage({type:'error',message:'Не удалось загрузить коннектом. Проверьте сеть и повторите.'});
  }
};
