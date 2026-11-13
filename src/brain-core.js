// Event delivery uses all original signed edges. Only neurons ever reached need updates.
export class Brain {
  constructor(manifest, offsets, targets, weights, seed = 12345) {
    this.m = manifest; this.offsets = offsets; this.targets = targets; this.weights = weights;
    const n = manifest.neurons;
    this.v = new Float32Array(n).fill(-52); this.g = new Float32Array(n);
    this.until = new Int32Array(n); this.active = []; this.touched = new Uint8Array(n);
    this.tick = 0; this.seed = seed; this.delay = Array.from({length: 19}, () => []);
    this.totalSpikes = 0;
    this.filteredHz = {};
  }
  random() { let x = this.seed; x ^= x << 13; x ^= x >>> 17; x ^= x << 5; this.seed = x; return (x >>> 0) / 4294967296; }
  activate(i) { if(!this.touched[i]) { this.touched[i]=1; this.active.push(i); } }
  run(rates, steps = 100) {
    const p = this.m.params, counts = new Uint32Array(this.m.neurons), decay=Math.exp(-p.dt/p.tauSyn); let total = 0;
    for (let step = 0; step < steps; step++, this.tick++) {
      const due = this.delay[this.tick % 19];
      for (const pre of due) for (let e = this.offsets[pre]; e < this.offsets[pre+1]; e++) {
        const post = this.targets[e];
        if (this.tick >= this.until[post]) { this.g[post] += this.weights[e] * p.scale; this.activate(post); }
      }
      due.length = 0;
      for (const [key, pool] of Object.entries(this.m.inputs)) {
        const probability = Math.min(1000, Math.max(0, rates[key] || 0)) * p.dt / 1000;
        for (const i of pool) if (this.random() < probability) {
          this.v[i] += p.scale * p.poissonWeight; this.activate(i);
        }
      }
      for (const i of this.active) {
        if (this.tick < this.until[i]) continue;
        this.v[i] += p.dt / p.tauMem * (p.rest - this.v[i] + this.g[i]);
        this.g[i] *= decay;
        if (this.v[i] > p.threshold) {
          this.v[i] = p.rest; this.g[i] = 0; this.until[i] = this.tick + Math.round(p.refractory / p.dt);
          this.delay[(this.tick + Math.round(p.delay/p.dt)) % 19].push(i);
          counts[i]++; total++;
        }
      }
    }
    const outputs = {}, spikes = {}, ratesHz={};
    for (const [key, pool] of Object.entries(this.m.outputs)) {
      spikes[key] = pool.reduce((sum,i) => sum + counts[i], 0);
      ratesHz[key]=spikes[key]*1000/(pool.length*steps*p.dt);
      const alpha=1-Math.exp(-steps*p.dt/50);
      this.filteredHz[key]=(this.filteredHz[key]||0)*(1-alpha)+ratesHz[key]*alpha;
      const response=pool.reduce((sum,i) => sum + Math.max(0, this.v[i]-p.rest)/7 + counts[i]*2, 0) / pool.length;
      outputs[key] = response / (2 + response);
    }
    this.totalSpikes += total;
    return {outputs, spikes, ratesHz, filteredHz:{...this.filteredHz}, total, totalSpikes:this.totalSpikes, simMs:this.tick*p.dt, active:this.active.length};
  }
}
