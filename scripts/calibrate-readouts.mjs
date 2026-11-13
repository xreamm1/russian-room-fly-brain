// Fit only the external decoder; the original connectome weights never change.
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {Brain} from '../src/brain-core.js';
const m=JSON.parse(readFileSync('public/brain/manifest.json'));
const keys=Object.keys(m.inputs);
function raw(file){const b=gunzipSync(readFileSync('public/brain/'+file));return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);}
const offsets=new Uint32Array(raw(m.offsets.file)),targets=new Uint32Array(m.edges),weights=new Int16Array(m.edges);
for(const s of m.shards){const b=raw(s.file);targets.set(new Uint32Array(b,0,s.count),s.start);weights.set(new Int16Array(b,s.count*4,s.count),s.start);}
const conditions=[...keys.map(k=>({[k]:200})),...keys.map(k=>({[k]:80})),
  {lightLeft:150,lightRight:150},{lightLeft:60,lightRight:60},
  {lightLeft:150,lightRight:80,danger:250},{lightLeft:80,lightRight:150,danger:250},
  {lightLeft:150,lightRight:120,odorLeft:160,odorRight:80},
  {lightLeft:120,lightRight:150,odorLeft:80,odorRight:160},
  {lightLeft:150,lightRight:150,sugar:200}];
const x=[],y=[];
for(let c=0;c<conditions.length;c++){
  const b=new Brain(m,offsets,targets,weights,12345+c),features=keys.map(()=>0);
  for(let j=0;j<10;j++){
    const result=b.run(conditions[c],100);
    if(j>=4)keys.forEach((k,i)=>features[i]+=result.outputs[k]/6);
  }
  x.push(features);y.push(keys.map(k=>(conditions[c][k]||0)/300));
  console.log('Calibration',c+1,'/',conditions.length);
}
function solve(a,b){a=a.map((row,i)=>[...row,b[i]]);const n=a.length;for(let i=0;i<n;i++){let best=i;for(let j=i+1;j<n;j++)if(Math.abs(a[j][i])>Math.abs(a[best][i]))best=j;[a[i],a[best]]=[a[best],a[i]];const pivot=a[i][i];if(Math.abs(pivot)<1e-12)throw Error('Singular readout calibration');for(let k=i;k<=n;k++)a[i][k]/=pivot;for(let j=0;j<n;j++)if(j!==i){const f=a[j][i];for(let k=i;k<=n;k++)a[j][k]-=f*a[i][k];}}return a.map(row=>row[n]);}
const n=keys.length,xtx=Array.from({length:n},(_,i)=>Array.from({length:n},(_,j)=>x.reduce((sum,row)=>sum+row[i]*row[j],0)+(i===j?.003:0)));
const decoder=keys.map((_,out)=>solve(xtx,keys.map((_,i)=>x.reduce((sum,row,c)=>sum+row[i]*y[c][out],0))));
const model={keys,decoder,method:'ridge linear readout from actual full-connectome responses; no intercept, original weights unchanged',conditions:conditions.length,neuralMsPerCondition:100,seed:12345};
let error=0;for(let c=0;c<x.length;c++)for(let i=0;i<n;i++){const estimate=Math.max(0,decoder[i].reduce((sum,w,j)=>sum+w*x[c][j],0));error+=(estimate-y[c][i])**2;}model.trainingRMSE=Math.sqrt(error/(x.length*n));
writeFileSync('src/readout-calibration.json',JSON.stringify(model,null,2)+'\n');console.log('Calibration complete',model.trainingRMSE);
