# Project Research Summary

**Project:** SPECTRA - Browser-based 3D Multiplayer Horror Game
**Domain:** Browser-based co-op horror investigation games
**Researched:** 2026-04-13
**Confidence:** HIGH

## Executive Summary

SPECTRA is a browser-based 1-4 player co-op horror investigation game using pure procedural generation to achieve a sub-500KB bundle with instant load times — a stark contrast to the multi-gigabyte installs of competitors like Phasmophobia. The recommended approach combines Three.js for WebGL rendering, Node.js with WebSocket (ws) for real-time multiplayer, and the Web Audio API for procedurally synthesized audio. This architecture eliminates all external assets while maintaining the atmospheric horror that defines the genre.

The core challenge is balancing zero-external-assets constraints with the immersive horror experience players expect. Research indicates this is achievable through server-authoritative multiplayer with client-side prediction, a state-machine-driven ghost AI, and a constrained procedural generation system. The primary risks are WebGL context loss during extended sessions, network latency causing player desync, and memory leaks from Three.js resource management. These must be addressed in the Foundation phase to ensure a playable v1.

## Key Findings

### Recommended Stack

**Core technologies:**

- **Three.js r183** — 3D rendering with modular ES module exports for tree-shaking; industry standard for WebGL with excellent documentation
- **Vite 8.x** — Development server and bundler with sub-100ms HMR and 6-31% smaller bundles than webpack
- **Node.js 20.x LTS** — WebSocket server runtime with event-driven I/O ideal for real-time multiplayer
- **Web Audio API (native)** — Zero-asset procedural audio synthesis via oscillators, filters, and noise buffers
- **ws 8.20.x** — Minimal-overhead WebSocket library (58M weekly downloads) for client-server communication
- **simplex-noise 4.x + alea 1.0.x** — Seeded procedural generation with deterministic reproducibility

**Bundle estimate:** ~250-400KB (well within 500KB budget)

### Expected Features

**Must have (table stakes):**

- 1-4 player online co-op via WebSocket — validates core co-op experience
- First-person controls with flashlight — core to horror immersion
- Ghost entity with state machine (wander, hunt, chase) — the supernatural threat
- Evidence collection system (3 types + journal UI) — core investigation loop
- Win/lose conditions — clear stakes for tension
- Haunted environment (lighting, audio, object movement) — atmospheric horror
- 3 ghost types (expandable to 6) — sufficient variety for v1 launch

**Should have (competitive differentiators):**

- Pure procedural generation — key differentiator; zero assets = instant load
- AI-powered ghost dialogue via GLM API — contextual responses vs scripted
- Procedural audio engine — Web Audio API synthesis for footsteps, ghost sounds, ambience
- WebSocket-optimized state sync — delta compression for bandwidth efficiency

**Defer (v2+):**

- VR support — browser VR capability demand not validated
- More maps/locations — focus on one strong procedural map first
- Progression system — retention data needed before adding unlocks
- Cursed possessions — depth requested by users, not core to v1

### Architecture Approach

The recommended architecture uses server-authoritative state with client-side prediction for movement, room-based session management for multiplayer grouping, and event-driven ghost behavior via state machine. The project structure separates client (browser) and server (Node.js) with shared type definitions.

**Major components:**

1. **Client Rendering (Three.js)** — Scene graph, camera, procedural meshes, lighting; no frameworks, direct Three.js setup
2. **Server Gateway (ws)** — Connection handling, room management, message routing; isolated from game logic
3. **Ghost AI (Server)** — Behavior state machine with 6 ghost type definitions; server-authoritative entity state
4. **Network Layer** — WebSocket client wrapper with delta compression and interpolation
5. **Audio Engine** — Web Audio API synthesis with oscillators, filters, and procedural noise generation

### Critical Pitfalls

1. **WebGL Context Loss** — Browser tabs lose rendering context after backgrounding or memory pressure; requires context loss detection and scene serialization for recovery
2. **WebSocket Latency Desync** — Players see different ghost positions or evidence states; requires authoritative server with interpolation and delta updates
3. **Memory Leaks in Three.js** — Unbounded memory growth from creating geometries/materials in render loop; requires proper disposal and object pooling
4. **Procedural Map Unplayable Layouts** — Generated maps with unreachable rooms or blocked objectives; requires connectivity validation via flood-fill
5. **Audio Context Suspended** — Browsers require user gesture before AudioContext can resume; must initialize only after "Start Game" click

## Implications for Roadmap

Based on research, the recommended phase structure addresses the architectural build order dependencies while mitigating critical pitfalls early.

### Phase 1: Foundation — Core Infrastructure
**Rationale:** Cannot build anything without the shared types, server gateway, and client engine foundation. Also addresses critical pitfalls that would block all subsequent work.

**Delivers:**
- shared/types (message schemas, game constants)
- Server gateway with WebSocket connection handling
- Basic client rendering setup (scene, camera, renderer)
- Project structure with build configuration

**Addresses Pitfalls:**
- WebGL context loss recovery system
- Audio context initialization on user gesture
- Shadow map first-frame workaround
- Network reconnection with exponential backoff

**Research Flags:** Standard patterns — Three.js and WebSocket well-documented

### Phase 2: Foundation — Multiplayer & Game Logic
**Rationale:** Game loop and multiplayer infrastructure are prerequisites for all gameplay features. This phase enables testing the core co-op experience.

**Delivers:**
- Server game state management (authoritative)
- Player movement with client-side prediction
- Ghost state machine (basic states)
- Room-based session management
- Win/lose condition logic

**Addresses Pitfalls:**
- WebSocket latency desync via interpolation
- Client-side prediction drift via reconciliation
- Network race conditions via optimistic locking

**Research Flags:** Need validation — prediction/reconciliation tuning during implementation

### Phase 3: Foundation — Procedural Systems
**Rationale:** Procedural generation is the key differentiator. Must be working before gameplay features can use it.

**Delivers:**
- Procedural map generation with seed
- Procedural audio engine (footsteps, ambience, ghost sounds)
- Ghost behavior variation per type
- Evidence spawn system with connectivity validation

**Addresses Pitfalls:**
- Procedural map unplayable layouts (flood-fill validation)
- Procedural horror repetitive (variation buckets)
- Memory leaks (object pooling for procedural objects)

**Research Flags:** Need validation — generate 100+ maps to verify diversity

### Phase 4: MVP — Core Gameplay
**Rationale:** All infrastructure ready. This phase delivers the actual game experience for initial testing.

**Delivers:**
- 1-4 player co-op gameplay
- 3 evidence types + journal UI
- First-person controls + flashlight
- Ghost hunt/chill/manifest states
- 3 ghost types
- Win/lose conditions

**Research Flags:** Standard patterns — Phasmophobia-style gameplay well-understood

### Phase 5: MVP — Polish & Differentiators
**Rationale:** Infrastructure complete, core gameplay tested. Add differentiating features that require the foundation to be solid.

**Delivers:**
- GLM API dialogue integration
- Additional evidence types (up to 6)
- Additional ghost types (up to 6)
- Difficulty settings
- Score/leaderboard basics

**Research Flags:** Need research — GLM API integration specifics

### Phase Ordering Rationale

- **Foundation phases first:** Build order from ARCHITECTURE.md (shared/types → gateway → game → ghost → engine → network → game → ui → audio) ensures each layer has what it depends on
- **Pitfalls addressed early:** WebGL, memory, and audio issues would block all testing — fix in Foundation Phase 1
- **Multiplayer before gameplay:** Cannot test core gameplay loop without working co-op — Phase 2 enables Phase 4
- **Procedural before content:** Need generation working before building gameplay that uses it — Phase 3 enables Phase 4
- **Polish after core working:** Differentiators (GLM dialogue, variety) assume core loop functions — Phase 5 after Phase 4

### Research Flags

**Phases needing deeper research during planning:**
- **Phase 2 (Multiplayer):** Prediction/reconciliation parameters need tuning; no single right answer
- **Phase 3 (Procedural):** Variation bucket design requires playtesting to validate
- **Phase 5 (GLM Integration):** API specifics, rate limits, fallback quality

**Phases with standard patterns (skip research):**
- **Phase 1:** Three.js, WebSocket, Node.js — well-documented, no research needed
- **Phase 4:** Core gameplay patterns from Phasmophobia/Demonologist understood

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Three.js/WebSocket/Node.js — industry standard, extensive documentation |
| Features | HIGH | Phasmophobia/Demonologist established genre standards; competitor analysis validates |
| Architecture | HIGH | Server-authoritative multiplayer well-understood; Source Engine networking article reference |
| Pitfalls | MEDIUM | Many pitfalls identified from Three.js community; some (prediction drift, procedural variety) require implementation validation |

**Overall confidence:** HIGH

### Gaps to Address

- **Procedural variation testing:** Need to generate 100+ maps and manually review diversity before Phase 3 completes
- **GLM API fallback quality:** Pre-written response bank needs writing before Phase 5 — no research can replace this
- **Mobile performance tuning:** Flashlight/shadow performance on mobile requires device testing; may need dynamic quality scaling
- **Ghost behavior tuning:** 6 ghost types with distinct behaviors need extensive playtesting to balance

## Sources

### Primary (HIGH confidence)
- threejs.org — r183 release, ES module documentation
- npmjs.com/package/ws — Version 8.20.0 (2026-03-21)
- Phasmophobia (Kinetic Games) — Steam, established genre standard
- Valve Source Multiplayer Networking — authoritative multiplayer architecture

### Secondary (MEDIUM confidence)
- Game Development Stack Exchange — WebSocket multiplayer discussions
- Three.js GitHub issues — context loss, shadow mapping workarounds
- Reddit r/proceduralgeneration — variation patterns

### Tertiary (LOW confidence)
- Game Wisdom articles on horror pacing — inference for ghost behavior design
- Player feedback from co-op horror communities — qualitative, needs validation

---
*Research completed: 2026-04-13*
*Ready for roadmap: yes*
