# Муха / Комната № 783

Interactive Three.js room with the **entire local FlyWire 783 connectivity** running in a browser Web Worker. No Python server, GPU requirement or local filesystem dependency for visitors.

**Live:** https://xreamm1.github.io/russian-room-fly-brain/

## What is simulated

138,639 neurons, 15,091,983 directed edges, original signed integer `Excitatory x Connectivity` weights. No pruning, no dummy graph, no prerecorded activity. Source: `2025_Completeness_783.csv` and `2025_Connectivity_783.parquet` from the supplied fly-brain project. `main.py` dispatches benchmark runners; `code/run_pytorch.py` implements sparse recurrent LIF, and `code/paper-phil-drosophila/model.py` contains the Brian2 reference.

The browser port uses resting/reset potential −52 mV, threshold −45 mV, membrane time constant 20 ms, synapse time constant 5 ms, weight scaling .275, dt .1 ms, delay 1.8 ms and refractory period 2.2 ms. Event delivery traverses original outgoing edges; membrane and synaptic states are computed for every reached neuron. The port uses explicit membrane integration and exponential synaptic decay, with refractory state freezing, and is **not validated as numerically equivalent** to either reference backend. The original code contains differing refractory details between backends. Neural time is slower than wall time and the measured ratio is shown in the HUD. Rendering runs separately.

## Scientific limits: sensory and motor interfaces

The supplied completeness table only has IDs and `Completed`, not anatomical cell classes. Consequently:

- Light-left, light-right, threat, odor-left and odor-right are **synthetic injection pools**, selected deterministically from high positive outgoing weight strength (24 neurons each). They are not identified photoreceptors, danger neurons or olfactory receptor neurons.
- The 21 sugar GRN IDs come from the source `benchmark.py` experiment. They are activated at 200 Hz on close sugar contact. This is a gustatory stimulus; sugar is not treated as a scientifically validated airborne odor.
- Motor readouts are 32 disjoint downstream targets per input, selected by positive summed connectivity. They are not known flight motor neurons. The source has P9 forward-*walking* IDs, which are not reused as flight neurons.
- Readout membrane depolarization and actual spikes power an **engineering body adapter**. A ridge decoder fitted to 19 full-connectome stimulation experiments separates overlapping readout channels (`scripts/calibrate-readouts.mjs`, reproducible seeds, training RMSE stored in JSON). It is an external numerical decoder, not a learned biological flight circuit; held-out behavioral generalization is not established. The original connectome is never trained or altered.
- **Autonomy:** `decodeBody(readouts)` accepts only neural readout activity. No bait position, cursor, light toggle, elapsed route timer or environment gates enter the motor path. The world affects the brain only through sensor rates. Independent decoded wing drives determine forward speed and yaw. Approximate body physics integrates lift, gravity and drag: there is no altitude target or minimum hovering height. Sphere/AABB contacts with the floor, furniture and boundaries remove inward velocity instead of reflecting the heading. Supported bodies rest under static contact friction until neural lift exceeds weight. There are no scripted routes, landing timers, scheduled escapes, direct attraction to the sugar/window or guaranteed sugar landings. Bait may or may not be reached. These are engineering contact/force approximations, not a validated muscle, leg or aerodynamic model; the brain model alone is insufficient to reproduce real fly behavior.
- One world unit is one metre, body integration uses wall time, and speed is displayed in m/s. The engineering calibration targets the order of magnitude of measured Drosophila flight (roughly .35 m/s cruising, higher during escapes; max adapter envelope 1.2 m/s), not the speed of a housefly or an individual fly's measured flight. See Card & Dickinson (2008), https://doi.org/10.1242/jeb.012682 , and Rohrseitz & Fry (2012), https://pmc.ncbi.nlm.nih.gov/articles/PMC3481592/ . Numerical neural time remains slower than wall time; no real-time biological equivalence is claimed.
- The fly is enlarged for visibility. The camera shows a conventional perspective view, not a compound-eye optics simulation.

The graph and activity are real computations over supplied data; biological flight, consciousness, learning and a scientifically validated behavioral reconstruction are not claimed.

## CDN and integrity

Immutable data version: `brain-v1` (never moved). Primary manifest:

https://cdn.jsdelivr.net/gh/xreamm1/russian-room-fly-brain@brain-v1/public/brain/manifest.json

Files `offsets.bin.gz`, `edges-00.bin.gz` through `edges-15.bin.gz`, and `neuron-ids.json.gz` are listed with compressed/raw byte counts and SHA-256 in that manifest. All original weights fit signed int16 without quantization. Posts and offsets are little-endian uint32. Each edge shard contains all posts first, then all weights, with its exact start/count in the manifest. Neuron IDs are strings to avoid JavaScript 64-bit integer loss.

Browser fetching is CORS-enabled HTTPS. It checks SHA-256 before decompression. Verified immutable CDN responses are cached for later offline use. If jsDelivr is unavailable it retries the **remote** GitHub Pages mirror at `https://xreamm1.github.io/russian-room-fly-brain/brain/`. Only in localhost development, it can additionally load the same verified exported data from the local web server after both cloud sources fail; the UI identifies that local source. There is no dummy model fallback. Network or integrity failures are shown explicitly. The 16 shards are below the jsDelivr 20 MB file limit; compressed data total is about 50.4 MB. Runtime edge arrays use about 91 MB, plus browser/model state; a desktop browser is recommended. Offline reopening of the hosted app shell is not guaranteed; the running app and cached brain data can continue without a network.

## Development and deployment

Node 22+: `npm ci`, `npm run dev`. Production: `npm test`, `npm run build`. GitHub Actions deploys `dist/` to Pages on pushes to `main`.

To re-export from an authorized local source: install numpy, pandas and pyarrow; run `python scripts/export_brain.py <source-directory>`. Publish a **new immutable data tag** and update the worker URL when changing brain data. Tests verify exported sizes, checksums, targets, offsets, delay, inhibition, refractory behavior and reproducible stimulation.

Room: patterned wallpaper, left window with translucent tulle, cast-iron radiator, wall and floor carpets, sofa, walnut sideboard, kettle, tea glass and warm five-arm chandelier. Controls toggle light, sugar, and room/fly cameras. Cursor proximity injects the threat stimulus.

## Provenance and licensing

Application and numerical port: GPL-2.0-only; see LICENSE, preserved from the supplied project. The upstream model credits Shiu et al., *A leaky integrate-and-fire computational model based on the connectome of the entire adult Drosophila brain reveals insights into sensorimotor processing*: https://doi.org/10.1038/s41586-024-07763-9 . FlyWire dataset attribution and original data rights remain with their respective authors; this project does not claim a new license over third-party connectivity data. Source parquet SHA-256 is recorded in the manifest. The export does not include osu_mania, personal settings, learned memory, compiled executables, benchmarks, caches or virtual environments.
