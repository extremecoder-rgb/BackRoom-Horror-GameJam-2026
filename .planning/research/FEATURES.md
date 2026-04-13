# Feature Research

**Domain:** Browser-based co-op horror investigation games
**Researched:** 2026-04-13
**Confidence:** HIGH

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|------------|------------|-------|
| 1-4 player online co-op | Phasmophobia established 4-player as standard; solo play feels incomplete without multiplayer option | MEDIUM | WebSocket server required; real-time position/state sync |
| First-person exploration | Core to horror immersion; walking simulator style | LOW | Three.js FP controls + flashlight |
| Ghost entity with behavior | Without supernatural entity, it's just exploration | MEDIUM | State machine with hunt/chill/manifest states |
| Evidence collection system | Core gameplay loop: find evidence → identify ghost → escape | HIGH | Multiple evidence types, journal UI, validation logic |
| Win/lose conditions | No tension without stakes; identify ghost or die trying | LOW | Clear contract: identify ghost type, exit alive |
| Haunted environment | Must feel haunted; atmospheric effects | MEDIUM | Lighting, sound, object movement, temperature drops |
| Death consequences | No fear without risk | LOW |sanity, injury, death on capture |
| Ghost type variety (5+) | Replayability requires variety | MEDIUM | 6 types in PROJECT.md is sufficient for v1 |
| Equipment/tools | Players expect ghost-hunting gear | MEDIUM | EMF, thermometer, spirit box equivalents |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valuable.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Pure procedural generation | Zero assets → instant load, <500KB bundle | HIGH | All geometry, audio synthesized; key differentiator |
| AI-powered ghost dialogue | Context-aware responses vs pre-scripted | MEDIUM | GLM API integration; fallback to pre-written |
| Browser-only, no install | Play instantly; share link to start | LOW | Cross-platform by default |
| Procedural audio engine | Web Audio API synthesis, no audio files | HIGH | Footsteps, whispers, equipment sounds |
| WebSocket-optimized sync | Lightweight networking for browser | MEDIUM | Position interpolation, delta compression |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Real-time voice chat | "Phasmophobia has it" | Browser VoIP complexity, latency issues, browser policy restrictions | Turn-based ghost interactions (player asks, ghost answers via text/voice synthesis) |
| External 3D models | "More realistic" | Breaks <500KB constraint, asset loading breaks instant load | Procedural boxes/cylinders with lighting tricks |
| Photorealistic graphics | "More immersive" | Asset-heavy, performance varies | Emphasize atmosphere via audio/lighting; horror from uncertainty |
| Mobile app | "Play anywhere" | Significant dev effort, breaks browser-only constraint | Responsive web design for mobile browsers |
| PvP modes | "More replayability" | Turns co-op into competitive; scope creep | Focus on co-op for v1 |
| Large map variety | "More content" | Each map = significant procedural generation time | One strong map first; add more post-validation |

## Feature Dependencies

```
Multiplayer Sync (WebSocket)
    └──requires──> Player State Management
                       └──requires──> Ghost Behavior State Machine
                                              └──requires──> Evidence Collection

AI Ghost Dialogue (GLM API)
    └──requires──> Evidence System (knows what player found)

Procedural Audio
    └──requires──> Player Position (footsteps)
    └──requires──> Ghost State (hunt music, manifest sounds)

Procedural Map Generation
    └──requires──> Win/Lose Conditions (valid spawn positions, exit points)
```

### Dependency Notes

- **Multiplayer sync requires Player State Management:** Can't sync if no centralized state; need authoritative server for ghost/players
- **Evidence System enables AI Dialogue:** Ghost can reference what evidence players have found
- **Ghost Behavior State Machine requires Evidence Collection:** Evidence is player's window into ghost behavior (间接 learned through investigation)
- **Procedural Audio requires Player Position/Ghost State:** Audio should respond to game events
- **Procedural Map requires Win/Lose:** Need valid spawn points and exit locations built into generation

## MVP Definition

### Launch With (v1)

Minimum viable product — what's needed to validate the concept.

- [ ] 1-4 player WebSocket co-op — validates core co-op experience
- [ ] Procedural haunted house map — validates procedural generation
- [ ] First-person controls + flashlight — validates core gameplay
- [ ] Ghost with basic state machine (wander, hunt, chase) — validates entity
- [ ] 3 evidence types + journal UI — validates investigation loop
- [ ] Win/lose conditions — validates stakes
- [ ] Procedural audio (basic) — validates audio engine
- [ ] 3 ghost types — validates variety without over-building

### Add After Validation (v1.x)

Features to add once core is working.

- [ ] GLM API dialogue integration — trigger: evidence collection working
- [ ] Additional evidence types (up to 6) — trigger: players understand system
- [ ] Additional ghost types (up to 6 total) — trigger: variety requested
- [ ] Difficulty settings — trigger: replayabilty feedback
- [ ] Score/leaderboard — trigger: competitive feedback

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] More maps/locations — trigger: map replayability exhausted
- [ ] VR support — trigger: browser VR capability demand
- [ ] Cursed possessions — trigger: depth requested
- [ ] Daily challenges — trigger: engagement metrics
- [ ] Progression system (unlocks, leveling) — trigger: retention data

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Multiplayer co-op | HIGH | MEDIUM | P1 |
| First-person controls | HIGH | LOW | P1 |
| Ghost entity + behavior | HIGH | MEDIUM | P1 |
| Evidence collection + journal | HIGH | HIGH | P1 |
| Win/lose conditions | HIGH | LOW | P1 |
| Haunted environment | HIGH | MEDIUM | P1 |
| Procedural map (1 map) | MEDIUM | HIGH | P1 |
| Pure procedural (<500KB) | HIGH | HIGH | P1 |
| Procedural audio | MEDIUM | HIGH | P2 |
| AI dialogue (GLM) | MEDIUM | MEDIUM | P2 |
| 6 ghost types | MEDIUM | LOW | P1 |
| WebSocket optimization | MEDIUM | MEDIUM | P1 |
| Multiple evidence types | MEDIUM | MEDIUM | P2 |
| Difficulty settings | LOW | LOW | P3 |
| More maps | MEDIUM | HIGH | P3 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

## Competitor Feature Analysis

| Feature | Phasmophobia | Demonologist | Unhaunter | Our Approach |
|---------|--------------|--------------|-----------|--------------|
| Player count | 1-4 | 1-4 | 1 (2D) | 1-4 (align with standard) |
| Evidence types | 3-4 per ghost | Curated set | 8 | 3 (MVP), expand to 6 |
| Ghost count | 20+ | 10+ | 44 profiles | 3 (MVP), 6 total |
| Maps | 10+ | Curated | 1 | 1 procedural (v1) |
| Voice chat | Yes (deep) | Yes | No | Turn-based only |
| Asset model | Heavy (GB) | Medium | Light (download) | Zero (procedural) |
| Load time | Several minutes | Minutes | Seconds | Instant (<1s) |
| Bundle size | ~2GB | ~2GB | ~100MB | <500KB |
| Platform | Native | Native | Native + browser | Browser only |
| AI dialogue | Voice recognition | Scripted | No | GLM API (v1) |

## Sources

- Phasmophobia (Kinetic Games) — Steam, official site
- Demonologist (Clock Wizard Games) — Steam
- Unhaunter — browser version available
- Ancraophobia — browser-based multiplayer
- GameSpot "Best Multiplayer Horror Games 2025"
- Player feedback from co-op horror communities

---

*Feature research for: Browser-based co-op horror investigation games*
*Researched: 2026-04-13*