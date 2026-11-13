"""Join pinned official FAFB783 annotations to the original neuron row order."""
import csv, gzip, hashlib, json, sys
from pathlib import Path

source=Path(sys.argv[1]); annotation=Path('.cache/flywire-783-annotations.tsv')
revision='a83b2776d60d5764cef36b927f5f9679c16c47a2'
assert hashlib.sha256(annotation.read_bytes()).hexdigest()=='b214970b55d2fbe0853bba536fdcb9e28730f4eb7ab06f600491df795da683cd'
with (source/'data/2025_Completeness_783.csv').open() as f:
    ids=[r[0] for r in list(csv.reader(f))[1:]]
indices={root:i for i,root in enumerate(ids)}
assert len(indices)==138639
with annotation.open(encoding='utf-8') as f:
    rows=[r for r in csv.DictReader(f,delimiter='\t') if r['root_id'] in indices]
def pool(types,side=None,prefix=False):
    result=[]
    for r in rows:
        match=any(r['cell_type'].startswith(t) if prefix else r['cell_type']==t for t in types)
        if match and (side is None or r['side']==side):
            result.append(dict(index=indices[r['root_id']],rootId=r['root_id'],type=r['cell_type'],side=r['side']))
    result.sort(key=lambda n:n['index'])
    assert len({r['index'] for r in result})==len(result)
    return result
groups={}
for side in ['left','right']:
    groups['retina'+side.title()]=pool(['R1-6'],side)
    groups['loom'+side.title()]=pool(['LC4','LPLC2'],side)
    groups['landingVisual'+side.title()]=pool(['LPLC4'],side)
    groups['odor'+side.title()]=pool(['ORN_DM1'],side)
    groups['flight'+side.title()]=pool(['DNg02_'],side,prefix=True)
    groups['walk'+side.title()]=pool(['DNa02'],side)
groups['landing']=pool(['DNp07','DNp10'])
groups['escape']=pool(['DNp01'])
sys.path.insert(0,str(source/'code'))
from benchmark import EXPERIMENTS
groups['sugar']=[dict(index=indices[str(i)],rootId=str(i),type='source sugar GRN',side='unknown') for i in EXPERIMENTS['sugar']['neu_exc'] if str(i) in indices]
for k,rs in groups.items():
    assert rs,f'Empty anatomical group: {k}'
inputs={k:[r['index'] for r in rs] for k,rs in groups.items() if k.startswith(('retina','loom','landingVisual','odor')) or k=='sugar'}
outputs={k:[r['index'] for r in groups[k]] for k in ['flightLeft','flightRight','landing','escape','walkLeft','walkRight']}
assert not set(sum(inputs.values(),[]))&set(sum(outputs.values(),[]))
profile=dict(format=1,neurons=len(ids),revision=revision,
 annotationSource=f'https://raw.githubusercontent.com/flyconnectome/flywire_annotations/{revision}/supplemental_files/Supplemental_file1_neuron_annotations.tsv',
 annotationSha256=hashlib.sha256(annotation.read_bytes()).hexdigest(),
 completenessSha256=hashlib.sha256((source/'data/2025_Completeness_783.csv').read_bytes()).hexdigest(),
 inputs=inputs,outputs=outputs,groups=groups,
 notes='Anatomically identified cells. Bilateral scalar retina/odor and projection-neuron looming injection are experimental encoders, not Flyvis or a validated sensory response model. DNg02 modulates ongoing flight; it is not a takeoff command. DNp07/10 govern leg extension, not automatic braking. DNa02 is reported separately for walking. No motor neuron to muscle map is inferred.')
Path('public/brain/anatomy-783.json').write_text(json.dumps(profile,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
Path('src/anatomy-integrity.json').write_text(json.dumps(dict(sha256=hashlib.sha256(Path('public/brain/anatomy-783.json').read_bytes()).hexdigest(),revision=revision,neurons=len(ids)),indent=2)+'\n')
print(json.dumps({k:len(v) for k,v in groups.items()},indent=2))
