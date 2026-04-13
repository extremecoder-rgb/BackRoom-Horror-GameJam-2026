# Roadmap: SPECTRA

## Overview

A browser-based 1-4 player cooperative horror investigation game built entirely with procedural generation — no external assets. The journey moves from foundational build infrastructure through environmental generation, player first-person mechanics, ghost AI behavior, evidence collection systems, procedural audio, GLM-powered dialogue, and finally integrated UI with win/lose conditions. Each phase delivers a coherent capability that enables the next.

## Phases

- [ ] **Phase 1: Foundation** - Build system, WebSocket server, lobby infrastructure
- [ ] **Phase 2: Environment** - Procedural map generation, atmospheric rendering
- [ ] **Phase 3: Player** - First-person controls, flashlight, sanity system
- [ ] **Phase 4: Ghost** - Ghost entity, behavior state machine, 6 types
- [ ] **Phase 5: Evidence** - Detection tools, journal, win/lose conditions
- [ ] **Phase 6: Audio** - Procedural audio synthesis, spatial sound
- [ ] **Phase 7: AI Dialogue** - GLM API integration, contextual ghost responses
- [ ] **Phase 8: UI & Polish** - All overlays, victory conditions, scoring

## Phase Details

### Phase 1: Foundation
**Goal**: Build system and WebSocket multiplayer infrastructure operational
**Depends on**: Nothing (first phase)
**Requirements**: FOUND-01, FOUND-02, FOUND-03, FOUND-04, FOUND-05, FOUND-06, FOUND-07, NET-01, NET-02, NET-03, NET-04, NET-05, NET-06, NET-07, NET-08, NET-09, NET-10, NET-11, NET-12
**Success Criteria** (what must be TRUE):
  1. Developers can run `npm run dev` and access game in browser with instant HMR
  2. Up to 4 players can join a room via 6-digit code and see each other in lobby
  3. Server correctly manages room state and synchronizes players at 20hz
  4. Game starts only when all players ready up
  5. Binary and JSON message handling works for all network events
**Plans**: 2 plans

Plans:
- [x] 01-01-PLAN.md: Configure Vite, Three.js, ws, project structure
- [ ] 01-02-PLAN.md: Build WebSocket server, room system, lobby

### Phase 2: Environment
**Goal**: Procedurally generated Victorian haunted house with atmospheric rendering
**Depends on**: Phase 1
**Requirements**: MAP-01, MAP-02, MAP-03, MAP-04, MAP-05, MAP-06, MAP-07, MAP-08, MAP-09, MAP-10, MAP-11, MAP-12, MAP-13, MAP-14, FX-01, FX-02, FX-03, FX-04, FX-05, FX-06, FX-07, FX-08, FX-09, FX-10, FX-11, FX-12
**Success Criteria** (what must be TRUE):
  1. Game loads into a random Victorian house with attic, ground floor, and basement
  2. Player sees atmospheric fog, moonlight through windows, flickering candles
  3. Screen effects (vignette, film grain, chromatic aberration) render correctly
  4. Ghost events trigger screen flicker, static, blood drips
  5. Doors open/close with rotation animation, furniture blocks movement
**Plans**: 2 plans

Plans:
- [x] 02-01-PLAN.md: Procedural map generation, textures, lighting
- [x] 02-02-PLAN.md: Post-processing effects, props, atmosphere

### Phase 3: Player
**Goal**: First-person movement with flashlight, sanity system, and interaction
**Depends on**: Phase 2
**Requirements**: PLAY-01, PLAY-02, PLAY-03, PLAY-04, PLAY-05, PLAY-06, PLAY-07, PLAY-08, PLAY-09, PLAY-10, PLAY-11, PLAY-12, PLAY-13, PLAY-14, PLAY-15
**Success Criteria** (what must be TRUE):
  1. Player can move with WASD, look with mouse (pointer lock), sprint with SHIFT
  2. Player can toggle flashlight with F key, battery drains and flickers near ghost
  3. Sanity decreases in darkness, causes hallucinations and distortion at low levels
  4. Player can interact with doors (E), open chat (T), view journal (TAB)
  5. Camera bobs while walking, flashlight casts shadows
**Plans**: 2 plans

Plans:
- [ ] 03-01: First-person controls, collision detection
- [ ] 03-02: Flashlight, sanity system, interactions

### Phase 4: Ghost
**Goal**: Ghost entity with behavior state machine and 6 distinct types
**Depends on**: Phase 3
**Requirements**: GHOST-01, GHOST-02, GHOST-03, GHOST-04, GHOST-05, GHOST-06, GHOST-07, GHOST-08, GHOST-09, GHOST-10, GHOST-11
**Success Criteria** (what must be TRUE):
  1. Ghost appears as glowing entity with distortion shader and particle trail
  2. Ghost cycles through states: Idle → Roaming → Stalking → PreHunt → Hunting → Cooldown
  3. All 6 ghost types (Phantom, Banshee, Revenant, Shade, Poltergeist, Wraith) have distinct behavior
  4. Players can hide from hunting ghost; ghost catches visible players
  5. Each ghost type leaves different evidence combinations (EMF, Cold, Orbs, etc.)
**Plans**: 2 plans

Plans:
- [ ] 04-01: Ghost entity, rendering, behavior state machine
- [ ] 04-02: 6 ghost types, evidence rules, hunt mechanic

### Phase 5: Evidence
**Goal**: Evidence detection tools, journal system, and win/lose conditions
**Depends on**: Phase 4
**Requirements**: EVID-01, EVID-02, EVID-03, EVID-04, EVID-05, EVID-06, EVID-07, EVID-08, EVID-09, EVID-10, EVID-11, EVID-12, EVID-13, EVID-14, EVID-15, EVID-16, WIN-01, WIN-02, WIN-03, WIN-04, WIN-05, WIN-06, WIN-07, WIN-08, WIN-09, WIN-10, WIN-11, WIN-12
**Success Criteria** (what must be TRUE):
  1. Player can cycle tools (1-7 keys) and detect 6 evidence types (EMF, Cold, Orbs, etc.)
  2. Journal shows collected evidence with checkboxes, can filter by ghost type
  3. Player can guess ghost type with G key and selection UI
  4. When ghost guessed correctly, exit door unlocks; all players escaping = victory
  5. Ghost catching player during hunt = death; all dead = game over; spectator mode works
**Plans**: 2 plans

Plans:
- [ ] 05-01: Evidence tools, detection logic, journal UI
- [ ] 05-02: Win/lose conditions, victory screens, scoring

### Phase 6: Audio
**Goal**: Complete procedural audio engine with spatial positioning
**Depends on**: Phase 5
**Requirements**: AUDIO-01, AUDIO-02, AUDIO-03, AUDIO-04, AUDIO-05, AUDIO-06, AUDIO-07, AUDIO-08, AUDIO-09, AUDIO-10, AUDIO-11, AUDIO-12, AUDIO-13
**Success Criteria** (what must be TRUE):
  1. Footsteps play while moving, heartbeat intensifies at low sanity
  2. Ambient drone and whispers play based on location and sanity
  3. Ghost sounds (scream, writing, music box) play spatially positioned
  4. Audio attenuates with distance, uses HRTF panning for directional sound
  5. All sounds synthesized from oscillators/noise, no external files
**Plans**: 1 plan

Plans:
- [ ] 06-01: Procedural audio, spatial positioning, synthesis

### Phase 7: AI Dialogue
**Goal**: GLM-powered ghost dialogue with contextual responses
**Depends on**: Phase 6
**Requirements**: AI-01, AI-02, AI-03, AI-04, AI-05
**Success Criteria** (what must be TRUE):
  1. Ghost responds to player questions via GLM API with context-aware dialogue
  2. Ghost uses player names in responses
  3. Fallback pre-written responses work when API unavailable
  4. Ghost dialogue integrates with ghost behavior states (more talkative when hunting?)
**Plans**: 1 plan

Plans:
- [ ] 07-01: GLM integration, system prompt, fallback pool

### Phase 8: UI & Polish
**Goal**: Complete UI overlays, scoring, and game flow
**Depends on**: Phase 7
**Requirements**: UI-01, UI-02, UI-03, UI-04, UI-05, UI-06, UI-07, UI-08, UI-09, UI-10, UI-11, UI-12, UI-13, UI-14, UI-15
**Success Criteria** (what must be TRUE):
  1. Click-to-start splash screen initializes audio context
  2. Lobby shows room code, player list, ready status
  3. HUD displays sanity, battery, tool bar, crosshair
  4. Chat overlay works with T key
  5. Death, victory, and game over screens display with restart option
**Plans**: 1 plan

Plans:
- [ ] 08-01: All UI screens, overlays, final polish

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 0/2 | Not started | - |
| 2. Environment | 0/2 | Not started | - |
| 3. Player | 0/2 | Not started | - |
| 4. Ghost | 0/2 | Not started | - |
| 5. Evidence | 0/2 | Not started | - |
| 6. Audio | 0/1 | Not started | - |
| 7. AI Dialogue | 0/1 | Not started | - |
| 8. UI & Polish | 0/1 | Not started | - |

---

*Roadmap created: 2026-04-13*
*Phase structure derived from 107 v1 requirements*