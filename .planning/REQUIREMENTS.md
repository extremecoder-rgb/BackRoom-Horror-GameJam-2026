# Requirements: SPECTRA

**Defined:** 2026-04-13
**Core Value:** A fully procedural horror experience — all visuals and audio synthesized from code, achieving instant loading and sub-500KB bundle size.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Foundation

- [ ] **FOUND-01**: Project uses Vite with instant HMR dev server
- [ ] **FOUND-02**: Package.json configured with three, ws dependencies
- [ ] **FOUND-03**: vite.config.js with WebSocket proxy
- [ ] **FOUND-04**: index.html with canvas + overlay (no loading screens)
- [ ] **FOUND-05**: style.css with minimal styling
- [ ] **FOUND-06**: .env file for GLM API key configuration
- [ ] **FOUND-07**: README.md with setup instructions

### Map System

- [ ] **MAP-01**: Procedural Victorian haunted house map (attic, ground floor, basement)
- [ ] **MAP-02**: Procedural plaster wall textures (canvas-generated)
- [ ] **MAP-03**: Procedural wood floor textures (stripe-based)
- [ ] **MAP-04**: Interactive doors with rotation animation
- [ ] **MAP-05**: Windows with volumetric moonlight (SpotLight cones)
- [ ] **MAP-06**: Basic furniture (boxes, cylinders for tables, chairs, beds)
- [ ] **MAP-07**: Candle props with flickering point lights
- [ ] **MAP-08**: Fog atmosphere (FogExp2, density 0.035)
- [ ] **MAP-09**: Ambient light (near-black blue tint)
- [ ] **MAP-10**: Moonlight from windows
- [ ] **MAP-11**: RenderPass for scene rendering
- [ ] **MAP-12**: UnrealBloomPass for light bloom
- [ ] **MAP-13**: Custom vignette + film grain + chromatic aberration shaders
- [ ] **MAP-14**: Screen flicker effect for ghost events

### Player System

- [ ] **PLAY-01**: First-person controls (WASD movement)
- [ ] **PLAY-02**: PointerLockControls for mouse look
- [ ] **PLAY-03**: Velocity-based movement with inertia/friction
- [ ] **PLAY-04**: Raycaster collision detection
- [ ] **PLAY-05**: Camera bob while walking
- [ ] **PLAY-06**: Flashlight toggle (F key)
- [ ] **PLAY-07**: Flashlight SpotLight with shadows
- [ ] **PLAY-08**: Flashlight battery mechanic
- [ ] **PLAY-09**: Flashlight flicker when ghost near
- [ ] **PLAY-10**: Sanity system (starts 100%, decreases in darkness)
- [ ] **PLAY-11**: Sanity visual effects (hallucinations, distortion)
- [ ] **PLAY-12**: Sprint mechanic (SHIFT, drains sanity)
- [ ] **PLAY-13**: Interact system (E key for doors, objects)
- [ ] **PLAY-14**: Chat system (T key)
- [ ] **PLAY-15**: Journal overlay (TAB key)

### Ghost System

- [ ] **GHOST-01**: Ghost entity with procedural geometry
- [ ] **GHOST-02**: Ghost distortion shader
- [ ] **GHOST-03**: Ghost particle trail (cold breath)
- [ ] **GHOST-04**: Ghost glowing eyes
- [ ] **GHOST-05**: Ghost flickering visibility
- [ ] **GHOST-06**: 6 ghost types (Phantom, Banshee, Revenant, Shade, Poltergeist, Wraith)
- [ ] **GHOST-07**: Ghost evidence combinations per type
- [ ] **GHOST-08**: Ghost behavior state machine (Idle, Roaming, Stalking, Interacting, PreHunt, Hunting, Fleeing, Cooldown)
- [ ] **GHOST-09**: Ghost room designation
- [ ] **GHOST-10**: Ghost hunt mechanic (visible chase)
- [ ] **GHOST-11**: Hide mechanic during hunt

### Evidence System

- [ ] **EVID-01**: EMF Spike evidence detection
- [ ] **EVID-02**: Cold Spot evidence detection
- [ ] **EVID-03**: Ghost Orbs evidence (camera night vision)
- [ ] **EVID-04**: Whispers evidence (directional audio)
- [ ] **EVID-05**: UV Prints evidence detection
- [ ] **EVID-06**: Ghost Writing evidence (book placement)
- [ ] **EVID-07**: EMF Reader tool
- [ ] **EVID-08**: Thermometer tool
- [ ] **EVID-09**: UV Light tool mode
- [ ] **EVID-10**: Video Camera with night vision
- [ ] **EVID-11**: Spirit Book item
- [ ] **EVID-12**: Crucifix item
- [ ] **EVID-13**: Smudge Stick item
- [ ] **EVID-14**: Tool cycling (number keys 1-7)
- [ ] **EVID-15**: Journal with ghost type filtering
- [ ] **EVID-16**: Evidence checkboxes

### Networking

- [ ] **NET-01**: WebSocket server (Node.js)
- [ ] **NET-02**: Room creation system
- [ ] **NET-03**: Room code display
- [ ] **NET-04**: Max 4 players per room
- [ ] **NET-05**: Player state sync (20hz)
- [ ] **NET-06**: Ghost state sync (server authoritative)
- [ ] **NET-07**: Binary WebSocket messages
- [ ] **NET-08**: JSON messages for game events
- [ ] **NET-09**: Client-side prediction
- [ ] **NET-10**: Lobby system
- [ ] **NET-11**: Ready up system
- [ ] **NET-12**: Game start flow

### AI Dialogue

- [ ] **AI-01**: GLM API integration
- [ ] **AI-02**: Ghost system prompt
- [ ] **AI-03**: Context-aware responses
- [ ] **AI-04**: Fallback response pool
- [ ] **AI-05**: Player name incorporation

### Audio System

- [ ] **AUDIO-01**: Procedural footsteps
- [ ] **AUDIO-02**: Heartbeat sound (low sanity)
- [ ] **AUDIO-03**: Ambient drone
- [ ] **AUDIO-04**: Whisper sounds
- [ ] **AUDIO-05**: Door creak sounds
- [ ] **AUDIO-06**: Static/Radio sounds
- [ ] **AUDIO-07**: Thunder sounds
- [ ] **AUDIO-08**: Ghost scream
- [ ] **AUDIO-09**: Writing sounds
- [ ] **AUDIO-10**: Music box sound
- [ ] **AUDIO-11**: Spatial audio (PannerNode)
- [ ] **AUDIO-12**: HRTF panning
- [ ] **AUDIO-13**: Distance attenuation

### Effects

- [ ] **FX-01**: Cold breath particles
- [ ] **FX-02**: Dust motes
- [ ] **FX-03**: Ghost trail particles
- [ ] **FX-04**: EMF sparks
- [ ] **FX-05**: Vignette shader
- [ ] **FX-06**: Film grain shader
- [ ] **FX-07**: Chromatic aberration shader
- [ ] **FX-08**: Screen flicker shader
- [ ] **FX-09**: Static disruption effect
- [ ] **FX-10**: Blood drip effect
- [ ] **FX-11**: Lightning flash effect
- [ ] **FX-12**: Frost creep on screen edges

### UI System

- [ ] **UI-01**: Splash screen ("Click to Enter")
- [ ] **UI-02**: Lobby screen
- [ ] **UI-03**: Room code display
- [ ] **UI-04**: Player list
- [ ] **UI-05**: HUD elements
- [ ] **UI-06**: Sanity meter display
- [ ] **UI-07**: Battery meter display
- [ ] **UI-08**: Tool bar display
- [ ] **UI-09**: Evidence display
- [ ] **UI-10**: Chat overlay
- [ ] **UI-11**: Journal overlay
- [ ] **UI-12**: Death screen
- [ ] **UI-13**: Victory screen
- [ ] **UI-14**: Game over screen
- [ ] **UI-15**: Crosshair

### Win/Lose

- [ ] **WIN-01**: Evidence collection requirement (2+ types)
- [ ] **WIN-02**: Guess ghost type modal (G key)
- [ ] **WIN-03**: Ghost type selection
- [ ] **WIN-04**: Exit door unlock
- [ ] **WIN-05**: All players escape condition
- [ ] **WIN-06**: Victory screen with stats
- [ ] **WIN-07**: Ghost catch player during hunt
- [ ] **WIN-08**: Player death mechanic
- [ ] **WIN-09**: Spectator mode for dead players
- [ ] **WIN-10**: All dead = game over
- [ ] **WIN-11**: Scoring system
- [ ] **WIN-12**: Restart option

## v2 Requirements

### Advanced Features

- **ADV-01**: More ghost types (additional beyond 6)
- **ADV-02**: Difficulty settings
- **ADV-03**: Additional evidence types
- **ADV-04**: More maps (procedural variation)
- **ADV-05**: Leaderboards

### Mobile

- **MOB-01**: Mobile web support
- **MOB-02**: Touch controls

### Social

- **SOC-01**: Steam integration
- **SOC-02**: Friend lists
- **SOC-03**: Spectator mode UI

## Out of Scope

| Feature | Reason |
|---------|--------|
| External 3D models | All geometry is procedural boxes/cylinders |
| External audio files | All sounds synthesized via Web Audio API |
| Mobile native app | Browser-only for v1 |
| Real-time voice chat | Turn-based ghost responses only |
| Photorealistic graphics | Stylized procedural aesthetic |
| PvP mode | Co-op only for v1 |
| DLC/expansions | Defer to v2+ |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| FOUND-01 - FOUND-07 | Phase 1 | Pending |
| MAP-01 - MAP-14 | Phase 2 | Pending |
| PLAY-01 - PLAY-15 | Phase 3 | Pending |
| GHOST-01 - GHOST-11 | Phase 4 | Pending |
| EVID-01 - EVID-16 | Phase 5 | Pending |
| NET-01 - NET-12 | Phase 6 | Pending |
| AI-01 - AI-05 | Phase 7 | Pending |
| AUDIO-01 - AUDIO-13 | Phase 8 | Pending |
| FX-01 - FX-12 | Phase 9 | Pending |
| UI-01 - UI-15 | Phase 10 | Pending |
| WIN-01 - WIN-12 | Phase 11 | Pending |

**Coverage:**
- v1 requirements: 107 total
- Mapped to phases: 107
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-13*
*Last updated: 2026-04-13 after initial definition*