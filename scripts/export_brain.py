"""Export the local FlyWire 783 connectivity without pruning or changing weights."""
import argparse, gzip, hashlib, json, sys
from pathlib import Path
import numpy as np
import pandas as pd

parser = argparse.ArgumentParser()
parser.add_argument('source', type=Path)
parser.add_argument('--output', type=Path, default=Path('public/brain'))
args = parser.parse_args()
out = args.output
out.mkdir(parents=True, exist_ok=True)
source = args.source
conn = pd.read_parquet(source / 'data/2025_Connectivity_783.parquet')
ids = pd.read_csv(source / 'data/2025_Completeness_783.csv', index_col=0).index
n = len(ids)
pre = conn['Presynaptic_Index'].to_numpy()
order = np.argsort(pre, kind='stable')
pre = pre[order]
post = conn['Postsynaptic_Index'].to_numpy()[order].astype('<u4')
weights = conn['Excitatory x Connectivity'].to_numpy()[order]
assert weights.min() >= -32768 and weights.max() <= 32767
weights = weights.astype('<i2')
assert pre.min() >= 0 and pre.max() < n and post.max() < n
offsets = np.r_[0, np.cumsum(np.bincount(pre, minlength=n))].astype('<u4')
files = []
def save(name, raw):
    data = gzip.compress(raw, compresslevel=9, mtime=0)
    (out / name).write_bytes(data)
    assert len(data) < 20_000_000
    entry = dict(file=name, bytes=len(data), rawBytes=len(raw), sha256=hashlib.sha256(data).hexdigest())
    files.append(entry)
    return entry
save('offsets.bin.gz', offsets.tobytes())
shards = []
for start in range(0, len(post), 1_000_000):
    end = min(start + 1_000_000, len(post))
    entry = save(f'edges-{len(shards):02}.bin.gz', post[start:end].tobytes() + weights[start:end].tobytes())
    shards.append(dict(**entry, start=start, count=end-start))
save('neuron-ids.json.gz', json.dumps([str(i) for i in ids]).encode())
sys.path.insert(0, str(source / 'code'))
from benchmark import EXPERIMENTS
sugar = [ids.get_loc(i) for i in EXPERIMENTS['sugar']['neu_exc'] if i in ids]
# These are engineering interfaces, not anatomical sensory classifications.
strength = np.bincount(pre, weights=np.maximum(weights, 0), minlength=n)
selected = [int(i) for i in np.argsort(-strength) if i not in sugar][:120]
inputs = dict(zip(['lightLeft','lightRight','danger','odorLeft','odorRight'], np.array(selected).reshape(5,24).tolist()))
inputs['sugar'] = list(map(int, sugar))
used = set(selected + sugar)
outputs = {}
for key, pool in inputs.items():
    scores = np.zeros(n)
    for i in pool:
        a, b = offsets[i:i+2]
        np.add.at(scores, post[a:b], np.maximum(weights[a:b], 0))
    targets = [int(i) for i in np.argsort(-scores) if i not in used and scores[i] > 0][:32]
    assert len(targets) == 32
    outputs[key] = targets
    used.update(targets)
manifest = dict(format=1, neurons=n, edges=len(post), materialization=783,
    encoding='little-endian: uint32 offsets; per shard uint32 posts then int16 signed weights',
    offsets=files[0], shards=shards, neuronIds=files[-1], inputs=inputs, outputs=outputs,
    params=dict(dt=0.1, tauMem=20, tauSyn=5, delay=1.8, refractory=2.2, rest=-52, threshold=-45, scale=0.275, poissonWeight=250),
    sourceSha256=hashlib.sha256((source/'data/2025_Connectivity_783.parquet').read_bytes()).hexdigest(),
    notes='Full unpruned connectivity. Sugar GRNs from benchmark.py. Other inputs and all readouts are synthetic interfaces; not identified photoreceptors, ORNs or flight motor neurons. Browser LIF port, not a validated biological flight controller.')
(out/'manifest.json').write_text(json.dumps(manifest, indent=2), encoding='utf-8')
print(json.dumps(dict(neurons=n, edges=len(post), compressedBytes=sum(f['bytes'] for f in files), files=len(files))))
