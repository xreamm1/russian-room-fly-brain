# Муха / Комната № 783

Live: https://xreamm1.github.io/russian-room-fly-brain/

Three.js room with the original **138,639 neurons and 15,091,983 signed directed edges** from the supplied FlyWire783 project. No pruned/dummy graph or prerecorded neural chart. Original synaptic targets and weights were checked against the source parquet.

## Active integration

The browser loads the complete connectivity from immutable CDN data and applies the official FAFB783 anatomical annotation profile. The original weights are unchanged. The previous high-degree synthetic pools and trained ridge decoder have been removed from the runtime.

| Input / readout | Actually matched cells | Current use |
|---|---:|---|
| R1–6 | 7,932 | Bilateral scalar light input |
| ORN_DM1 | 68 | Virtual food-odor input |
| LC4 + LPLC2 | 314 | Experimental looming/threat projection-neuron injection |
| LPLC4 | 110 | Experimental approaching-surface projection-neuron injection |
| Source sugar GRNs | 21 | 200 Hz gustatory input on contact |
| DNg02 family | 25: 13 left, 12 right | Measured flight-related descending output |
| DNp07 + DNp10 | 4 | Measured leg-extension-related descending output |
| DNp01 | 2 | Escape-related output telemetry |
| DNa02 | 2 | Walking-related steering telemetry; never reused as wing motors |

Profile: `public/brain/anatomy-783.json`. Every index/root-ID pair is checked against the original completeness CSV, and sensory and descending output sets must be disjoint. The profile's SHA-256 is pinned in the compiled worker. Official annotations are pinned to revision `a83b2776d60d5764cef36b927f5f9679c16c47a2`; annotation and original CSV hashes are recorded. Only neurons actually present in the supplied graph are included.

**These are anatomical assignments, not validated stimulus encoders.** The eye uses two scalar light rates, not the full Flyvis retina. Looming injection bypasses early vision. ORN_DM1 is a chosen food-odor channel, not a claim that dry sugar releases an odor. The button explicitly distinguishes virtual food odor from sugar contact. Stimuli do not directly stimulate any descending readout.

Primary sources:

- [Official v783 annotations](https://github.com/flyconnectome/flywire_annotations)
- [DNg02 flight-power modulation](https://pmc.ncbi.nlm.nih.gov/articles/PMC9206711/)
- [DNg02 is not a takeoff command](https://pmc.ncbi.nlm.nih.gov/articles/PMC10939832/)
- [DNp07/DNp10 and landing leg extension](https://pmc.ncbi.nlm.nih.gov/articles/PMC7444277/)

## Body engines and scientific boundary

**Localhost:** a separate Python process runs actual [Flybody](https://github.com/TuragaLab/flybody) in MuJoCo: 69 compiled rigid bodies, 65 actuators, centimetre/gram/second upstream units, real contacts with room surfaces, and wing fluid geometries. Browser rendering uses enlarged collision geometries at their computed poses. Brain/body exchange is via a same-origin Vite WebSocket proxy. Each 10 ms neural batch advances 10 ms body time; it is slower than wall time and the neural-time ratio remains visible. The Python process accepts only the two local development origins and binds to 127.0.0.1.

**GitHub Pages:** Python cannot run on static hosting. The published page runs the same anatomically annotated brain with the explicitly labelled approximate JavaScript body. A disconnected native body freezes instead of silently switching engines.

**The biological motor hierarchy is not complete.** DNg02 activity is sent through a plainly documented experimental rate-to-actuator proxy. This is not a VNC motor-neuron-to-muscle reconstruction. DNg02 modulates ongoing flight; it is not itself a takeoff command. DNp07/10 controls leg extension, not automatic navigation or braking. The native adapter currently applies bounded wing torque offsets and front-coxa extension offsets, not a reconstructed muscle circuit. No RL policy, prerecorded movement, wingbeat template, CPG, forced takeoff, target route, or automatic odor-to-motor steering is loaded.

Consequently, **the fly may remain at rest**. In the tested uniform-light experiment the DNg02 readouts were zero. No substitute flight is manufactured. This is a connected experimental sensor–connectome–body platform, not a claim to have reproduced an entire living fly.

The following researched components are **not claimed as integrated**:

- BANC/FANC: different specimens/ID spaces; joining requires explicit registration and a validated motor/muscle transformation. No graph was silently appended to FAFB783.
- Flyvis: pretrained lattice/model indices are not individual FAFB783 root IDs; retinal registration and a compatible Python environment are still needed.
- Trained Flybody policies: deliberately absent because they would replace the requested original neural motor control.
- FlyMimic: the available muscle model covers one front leg, not the whole flight system.

## Connectivity, numerical model and CDN

Primary immutable manifest:
https://cdn.jsdelivr.net/gh/xreamm1/russian-room-fly-brain@brain-v1/public/brain/manifest.json

It lists `offsets.bin.gz`, `edges-00.bin.gz` through `edges-15.bin.gz`, and `neuron-ids.json.gz`, including byte counts and SHA-256. All original weights fit int16 without quantization; targets/offsets are little-endian uint32; IDs are strings. About 50.4 MB compressed, 91 MB runtime edge arrays. The old immutable manifest's sensory metadata is historical: active inputs/readouts are replaced by the verified anatomical profile before creating the network.

Each edge shard contains all target indices followed by all signed weights. Files are below jsDelivr's 20 MB individual-file limit. CORS-enabled HTTPS responses are integrity checked before decompression and cached for reuse. Remote fallback is the GitHub Pages `/brain/` mirror. Localhost can additionally use the identical local HTTP export after cloud failures; its source is shown explicitly.

The numerical LIF port uses dt .1 ms, resting/reset −52 mV, threshold −45 mV, membrane time constant20 ms, synapse time constant5 ms, delay1.8 ms, refractory2.2 ms and synaptic scale .275. Explicit membrane integration and exponential conductance decay have not been scientifically validated for equivalence to the original Brian2/PyTorch backends. Recorded Hz is computed from actual spikes and pool size; a 50 ms neural-time EMA stabilizes descending telemetry.

## Running and verification

Frontend: Node22+, `npm ci`, `npm run dev`; local URL `http://127.0.0.1:5173/russian-room-fly-brain/`. Production: `npm test`, `npm run build`. GitHub Actions publishes `dist/` on pushes to main.

Native body: `scripts/setup-body.ps1` creates a separate Python3.10 environment using `backend/requirements.lock`. `scripts/start-local.ps1` launches both local services in hidden windows. The source fly-brain venv is never changed. Tested native versions and the Flybody commit are pinned; no TensorFlow/Acme/RL stack is installed.

Checks:

- `npm test`: anatomical index/root-ID parity, no descending injection, named readout-only motor proxy, exact spike-rate calculation, LIF delay/inhibition/refractory behavior, body contact mechanics, export checksums and sizes.
- `npm run test:brain`: full-network sensory trials and a zero-synapse negative control. Observed LC4/LPLC2 stimulation activated DNp01 and DNp07/10; disconnecting every edge eliminated all descending spikes while injected sensory cells still fired. Retina stimulation did not produce DNg02 spikes in the tested configuration.
- `.venv-body/Scripts/python.exe -m unittest backend.test_smoke -v`: real model construction and stepping, zero-neural/zero-control check, explicit actuator offsets and packet validation.
- Real WebSocket through the Vite proxy was checked; unrelated origins were rejected with HTTP403. Browser console was checked for runtime errors.

To rebuild the anatomical join: `python scripts/build-anatomy.py <original-source-folder>` after obtaining the pinned official TSV at `.cache/flywire-783-annotations.tsv`. The script verifies the original annotation hash. `scripts/export_brain.py` exports the original connectivity; immutable data tags must never be moved.

## Attribution and licensing

Original neural model: Shiu et al., [Nature2024](https://doi.org/10.1038/s41586-024-07763-9). Original project GPL2 license is preserved as LICENSE. Anatomical facts are attributed to the official FlyWire annotation source and its linked publications; no ownership of third-party data is claimed. Flybody source is an independently installed Apache2.0 dependency pinned to `d015e9bfe441bd90ae431bac24c55cb74bdbce26`; no external RL policies or GPL3 datasets are redistributed. The native server communicates with the browser by a documented JSON protocol. Upstream licenses/attribution must be retained when redistributing third-party artifacts.

The original Downloads folder, osu_mania, personal settings, learned memory, compiled binaries, benchmark outputs and source virtual environment are not published. Research notes, caches and the new native environment are gitignored.
