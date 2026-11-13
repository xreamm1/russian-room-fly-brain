import { Brain } from './brain-core.js';
const CDN = 'https://cdn.jsdelivr.net/gh/xreamm1/russian-room-fly-brain@brain-v1/ public/brain/'.replace('/ public','/public');
const MIRROR = 'https://xreamm1.github.io/russian-room-fly-brain/brain/';
let rates = {}, brain, timer;
async function fetchFile(base, file, descriptor) {
  const response = await fetch(base+file, {signal:AbortSignal.timeout(45000)});
  if (!response.ok) throw new Error(`${response.status}: ${file}`);
  const compressed = await response.arrayBuffer();
  if (descriptor) {
    const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256',compressed))].map(b=>b.toString(16).padStart(2,'0')).join('');
    if (hash !== descriptor.sha256 || compressed.byteLength !== descriptor.bytes) throw new Error(`Integrity: ${file}`);
  }
  return new Response(new Blob([compressed]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
}
async function load(base) {
  const response = await fetch(base+'manifest.json', {signal:AbortSignal.timeout(30000)});
  if (!response.ok) throw new Error(`Manifest: ${response.status}`);
  const m = await response.json();
  if(m.format!==1 || m.neurons!==138639 || m.edges!==15091983) throw new Error('Unsupported connectome');
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
  brain = new Brain(m,offsets,targets,weights);
  postMessage({type:'ready',neurons:m.neurons,edges:m.edges,source:base});
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
    for(const base of [CDN,MIRROR]) {
      try { await load(base); return; }
      catch(error) { postMessage({type:'source-error',source:base,message:error.message}); }
    }
    postMessage({type:'error',message:'Не удалось загрузить коннектом. Проверьте сеть и повторите.'});
  }
};
