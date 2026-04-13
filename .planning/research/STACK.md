# Stack Research

**Domain:** Browser-based 3D Multiplayer Horror Game
**Researched:** 2026-04-13
**Confidence:** HIGH

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Three.js | r183 (latest) | 3D rendering, procedural geometry | Industry standard for WebGL; modular exports enable tree-shaking; ES module support |
| Vite | 8.x | Development server & bundler | Sub-100ms HMR; Rolldown-based bundling produces smallest bundles (6-31% smaller than webpack); native ESM |
| Node.js | 20.x LTS | WebSocket server runtime | Event-driven I/O ideal for real-time; native WebSocket support via ws |
| Web Audio API | Native | Procedural audio synthesis | Zero external assets; complete control over oscillators, filters, noise; runs on dedicated audio thread |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| ws | 8.20.x | WebSocket server | When raw performance matters; minimal overhead; 58M weekly downloads |
| simplex-noise | 4.0.x | Procedural generation | Terrain, textures, ambient variation; tree-shakeable; ~2KB gzipped |
| alea | 1.0.x | Seeded PRNG | Deterministic procedural generation; works with simplex-noise |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Vite | Dev server + bundler | Use `--target=es2020` for modern browser support |
| size-limit | Bundle monitoring | Enforce 500KB budget; CI integration |

## Installation

```bash
# Core
npm install three@latest vite@latest ws@latest

# Supporting
npm install simplex-noise@4.0.3 alea@1.0.2

# Dev dependencies
npm install -D size-limit
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Three.js (r183) | OGL / TWGL | Only if extreme bundle minimalism required; Three.js has better ecosystem |
| Vite 8.x | Webpack 5 | Only if complex plugin ecosystem needed; Vite is faster and produces smaller bundles |
| ws (8.x) | Socket.io 4.x | When you need rooms, namespaces, auto-reconnect out of box |
| ws (8.x) | uWebSockets.js | Only when handling 10K+ concurrent connections; steeper learning curve |
| ws (8.x) | Colyseus | When you need authoritative server, state sync, matchmaking built-in |
| Native Web Audio API | Tone.js | Only when rapid prototyping; adds ~30KB bundle overhead |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| GLTFLoader / external models | Violates zero external assets requirement | Procedural BoxGeometry, CylinderGeometry |
| Audio files (.mp3, .wav) | Violates zero external assets requirement | Web Audio API oscillators + noise buffers |
| Socket.io (client bundle) | Adds ~50KB to client; overkill for simple co-op | ws (native WebSocket in browser) |
| Cannon.js / Ammo.js physics | Adds 100KB+; overkill for simple collision | Custom AABB collision for box-based geometry |
| TextureLoader / external images | Violates zero external assets requirement | Shader-based colors, vertex colors |
| mixamo-character GLB | External asset | Simple procedural geometry for ghost entity |

## Stack Patterns by Variant

**If targeting mobile (< 4GB RAM):**
- Use THREE.InstancedMesh for all repeated geometry
- Implement vertex-shader LOD culling
- Disable real-time shadows; use baked vertex lighting

**If needing state sync (authoritative server):**
- Consider Colyseus instead of raw ws
- Delta-compressed serialization reduces bandwidth 90%

**If procedural audio complexity grows:**
- Use AudioWorklet for off-main-thread processing
- Avoid setInterval for timing; use Web Audio API clock

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| three@r183 | Vite 8.x | ES module import maps |
| three@r183 | ws 8.x | No native relation |
| simplex-noise 4.x | alea 1.0.x | Seeded generation pattern |
| Node.js 20.x | ws 8.x | Full support |

## Zero External Assets Pattern

The key to achieving zero external assets with sub-500KB bundle:

1. **Geometry**: All primitives via `THREE.BoxGeometry`, `THREE.CylinderGeometry`, `THREE.BufferGeometry` with procedural vertices
2. **Materials**: `THREE.MeshStandardMaterial` with vertex colors; avoid texture maps
3. **Audio**: 
   - White noise via `AudioContext.createBuffer` filled with `Math.random() * 2 - 1`
   - Filtered noise (bandpass/lowpass) for rain, wind, static
   - Oscillators (sine/sawtooth/square) with ADSR envelopes for ghost sounds
   - FM synthesis for evolving tones
4. **Lighting**: PointLight (flashlight), ambient light; avoid HDR environment maps
5. **Build**: Import only needed Three.js modules: `import { Scene, PerspectiveCamera, WebGLRenderer, BoxGeometry } from 'three'`

**Bundle estimate**:
- Three.js core (only imported modules): ~150-250KB
- Application code: ~50-100KB
- Supporting libs (simplex-noise, ws client): ~30KB
- **Total: ~250-400KB** (within 500KB budget)

## Sources

- threejs.org — r183 release, ES module documentation
- npmjs.com/package/ws — Version 8.20.0 (2026-03-21)
- npmjs.com/package/simplex-noise — Version 4.0.3 (2024-07-26)
- pkgpulse.com/blog/best-websocket-libraries-nodejs-2026 — ws vs Socket.io vs uWebSockets benchmarks
- piehost.com/websocket/best-websocket-libraries-benchmarks — Performance comparison
- dev.to/hexshift — Web Audio API procedural synthesis tutorials
- hushwork.app/blog/web-audio-api-procedural-ambient-sounds — Noise buffer architecture
- discourse.threejs.org — InstancedMesh performance patterns

---
*Stack research for: Browser-based 3D Multiplayer Horror Game*
*Researched: 2026-04-13*
