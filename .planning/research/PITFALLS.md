# Pitfalls Research

**Domain:** Browser-based 3D Multiplayer Horror Game
**Researched:** 2026-04-13
**Confidence:** MEDIUM

## Critical Pitfalls

### Pitfall 1: WebGL Context Loss During Long Sessions

**What goes wrong:**
Browser tabs running WebGL can lose their rendering context after backgrounding, memory pressure, or GPU resets. The game appears frozen or crashes entirely.

**Why it happens:**
WebGL contexts are not guaranteed to persist. Chrome aggressively reclaims GPU memory from background tabs. Mobile browsers are especially prone to this.

**How to avoid:**
- Implement context loss detection via `renderer.context.canvas.addEventListener('webglcontextlost', ...)`
- Maintain a scene serialization snapshot every 30 seconds to enable fast recovery
- Use `renderer.resetState()` after context restoration

**Warning signs:**
- Game freezes when switching tabs
- Console shows `CONTEXT_LOST_WEBGL` errors
- Textures fail to load after tab reactivation

**Phase to address:**
Foundation Phase - Core infrastructure

---

### Pitfall 2: WebSocket Latency Desync in Multiplayer

**What goes wrong:**
Players see different ghost positions, evidence placements, or player locations. Game state diverges between clients causing confusion or unfair gameplay.

**Why it happens:**
TCP guarantees ordered delivery but introduces head-of-line blocking. A single delayed packet blocks subsequent packets. Network latency varies between players (50-300ms typical).

**How to avoid:**
- Use authoritative server architecture with server-side ghost state
- Implement client-side prediction for local player movement only
- Use interpolation (100-200ms buffer) for other players and ghost positions
- Send delta updates instead of full snapshots
- Timestamp all state updates with server tick numbers

**Warning signs:**
- Players report seeing ghost in different locations
- Evidence appears/disappears inconsistently
- Movement feels "rubbery" or snaps incorrectly

**Phase to address:**
Foundation Phase - Multiplayer Infrastructure

---

### Pitfall 3: Memory Leaks in Three.js Render Loop

**What goes wrong:**
Browser tab crashes after 10-15 minutes of gameplay. Memory usage grows unboundedly as new geometries, materials, and textures are created without cleanup.

**Why it happens:**
- Creating new Geometries/Materials in the render loop
- Not disposing resources when removing objects
- Shadow map accumulation
- Event listener accumulation

**How to avoid:**
- Set `matrixAutoUpdate = false` for static objects
- Reuse geometries and materials instead of creating new ones
- Always call `.dispose()` on geometries, materials, textures when removing
- Use object pooling for frequently created/destroyed objects (evidence, particles)
- Monitor memory via `renderer.info.memory`

**Warning signs:**
- Memory profiler shows continuous growth
- FPS drops over time
- Browser warns about high memory usage

**Phase to address:**
Foundation Phase - Performance optimization

---

### Pitfall 4: Procedural Map Generation Creates Unplayable Layouts

**What goes wrong:**
Generated haunted house has rooms that cannot be reached, dead ends blocking objectives, or impossible escape routes.

**Why it happens:**
Random generation algorithms don't validate connectivity. Rooms placed randomly without path validation. No guarantee that all objectives are reachable.

**How to avoid:**
- Use graph-based room placement with connectivity validation
- Implement flood-fill after generation to verify all rooms reachable
- Ensure minimum 2 paths to critical locations (evidence spawn, exit)
- Place objectives only after connectivity is confirmed
- Use seeded generation for consistency with reproducible seeds

**Warning signs:**
- Players get stuck in unreachable areas
- Cannot find/escape after collecting evidence
- Some rooms never get visited (isolated)

**Phase to address:**
Foundation Phase - Map Generation

---

### Pitfall 5: Audio Context Suspended on User Interaction Required

**What goes wrong:**
No audio plays after game start. Horror atmosphere is completely broken. Audio fails silently or throws errors.

**Why it happens:**
Browsers require user gesture (click/tap) before AudioContext can resume. Many games initialize audio too early or in ways that violate browser autoplay policies.

**How to avoid:**
- Initialize AudioContext only after user clicks "Start Game" button
- Call `audioContext.resume()` on the button click handler
- Store user gesture reference for any re-initialization needs
- Handle suspended state gracefully - don't crash, just don't play

**Warning signs:**
- Console shows "The AudioContext was not allowed to start"
- No audio on first load
- Audio works after refreshing page

**Phase to address:**
Foundation Phase - Audio System

---

### Pitfall 6: Shadow Maps Break on First Frame

**What goes wrong:**
Shadows fail to render correctly on initial frame, causing visual glitches or missing shadows. Only appears on first load.

**Why it happens:**
Three.js PMREMGenerator conflicts with shadow map texture allocation on first render when using environment maps with shadows enabled. Mobile GPUs enforce strict GL spec compliance.

**How to avoid:**
- Perform a warmup render without shadows before first real render
- Or trigger PMREMGenerator caching before enabling shadows
- Use workaround: `renderer.shadowMap.enabled = false; render(); renderer.shadowMap.enabled = true;`

**Warning signs:**
- Shadows missing or glitched on first frame only
- Works after refresh
- Mobile devices show GL_INVALID_OPERATION errors

**Phase to address:**
Foundation Phase - Rendering Setup

---

### Pitfall 7: Client-Side Prediction Causes Player Drift

**What goes wrong:**
Local player position drifts from server-authoritative position. When server correction arrives, player snaps to unexpected location.

**Why it happens:**
Local prediction applies input immediately without waiting for server validation. High latency or packet loss amplifies divergence. Stopping movement is especially problematic.

**How to avoid:**
- Implement reconciliation: store client input history, compare server position to predicted, smooth corrections
- Use "dead zone" for position corrections under 5cm
- For stopping: ensure server confirms stop before final position
- Clamp corrections to reasonable bounds

**Warning signs:**
- Player character slides after releasing movement keys
- Occasional teleportation during movement
- Different players see different positions

**Phase to address:**
Foundation Phase - Multiplayer Infrastructure

---

### Pitfall 8: Procedural Horror Becomes Repetitive Too Quickly

**What goes wrong:**
Generated rooms, ghost behaviors, and audio feel samey. Players notice patterns within 2-3 runs. Replayability tanks.

**Why it happens:**
- Limited procedural variation (same room types with minor tweaks)
- Ghost behavior too deterministic
- Audio lacks sufficient randomization
- No targeted randomization - only chaos

**How to avoid:**
- Use constrained procedural generation with designer-defined variation buckets
- Implement ghost behavior variation based on player actions, not pure randomness
- Create layered procedural audio with multiple variation parameters
- Limit "rare" events appropriately (rarer = more impactful)
- Test by generating 100 maps and manually checking diversity

**Warning signs:**
- Players predict room layouts
- Ghost behavior feels scripted despite randomization
- Audio loops become noticeable

**Phase to address:**
Foundation Phase - Procedural Systems

---

### Pitfall 9: Network State Synchronization Race Conditions

**What goes wrong:**
Player picks up evidence but another player sees it still on ground. Ghost state differs between clients causing different win/lose outcomes.

**Why it happens:**
- No atomic state transitions
- Server processes updates out of order
- No conflict resolution for simultaneous actions
- Client predicts incorrectly

**How to avoid:**
- Use server-authoritative pick-up system with confirmation
- Implement optimistic locking with conflict resolution
- Queue state changes and apply in tick order
- Broadcast state deltas, not absolute values

**Warning signs:**
- Evidence disappears and reappears
- Players argue about who collected evidence
- Win condition triggers differently for different players

**Phase to address:**
Foundation Phase - Multiplayer Infrastructure

---

### Pitfall 10: Flashlight Performance Kills FPS on Low-End Devices

**What goes wrong:**
Spotlight with shadow mapping on mobile/older devices drops FPS from 60 to 10. Game becomes unplayable.

**Why it happens:**
Real-time shadows are GPU-intensive. Multiple shadow-casting lights. High shadow map resolution. No shadow cascade optimization.

**How to avoid:**
- Limit to single flashlight with shadows
- Use low shadow map resolution (512x512) for mobile
- Disable shadows when player is alone (optional setting)
- Use "fake" shadow approaches: projected texture with no real shadow mapping
- Implement dynamic quality scaling based on FPS detection

**Warning signs:**
- FPS drops below 30 when flashlight is on
- Mobile devices overheating
- Players with integrated graphics report poor performance

**Phase to address:**
Foundation Phase - Performance optimization

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Use JSON for network messages | Easy to implement, debug | Large message sizes, slow parsing | Never for game state (use binary) |
| Full state snapshot each update | Simple sync logic | Bandwidth waste, sync delays | Only for < 4 players with low state |
| Single global audio graph | Simple audio routing | Can't easily vary audio per-player | Only for non-positional audio |
| Generate map at game start | No runtime overhead | Long initial load time | Only if generation < 500ms |
| No object pooling | Simpler code | GC stutters, memory fragmentation | Only for very low object count games |
| Client-side physics | Reduced server CPU | Easy to cheat, desync | Never for competitive/co-op |
| Random ghost spawn | Simple implementation | Unbalanced difficulty | Only with player-adaptive behavior |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| GLM API | Sending full conversation history | Send only last 3-4 exchanges for context |
| GLM API | No fallback for API failure | Pre-written response bank as backup |
| WebSocket | No reconnection logic | Implement exponential backoff with max retries |
| WebSocket | Sending too frequently | Throttle to 20-30 updates/sec max |
| WebSocket | Large JSON payloads | Use binary encoding or message packing |
| Browser Audio | Context suspended on load | Resume only after user gesture |
| Three.js | Using Geometry instead of BufferGeometry | Always use BufferGeometry for performance |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Too many draw calls | FPS drops below 60 | Merge static geometry, use InstancedMesh | > 100 objects in scene |
| Unoptimized shadows | Massive FPS drop on mobile | Limit shadow resolution, single light | Mobile devices, integrated GPUs |
| Creating objects in render loop | Memory growth, GC stutters | Object pooling, reuse geometries | After 5+ minutes of play |
| Large texture loading | Loading hitches | Compress textures, load async with progress | On map transitions |
| Too many audio nodes | Audio stuttering | Limit concurrent sounds, use node reuse | When many events trigger simultaneously |
| Complex ghost AI per frame | CPU spike | Use tick-based AI updates, not per-frame | When ghost enters hunting mode |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Client-authoritative game state | Players cheat by modifying client state | Server validates all actions, authoritative physics |
| No input validation on server | Speed hacking, teleportation | Validate speed, position changes per tick |
| Exposing server logic in client | Reverse engineering, cheat creation | Keep game logic server-side, client only renders |
| WebSocket message injection | Arbitrary code execution via eval | Parse messages strictly, no eval() |
| No rate limiting | DoS via message flood | Implement message throttling per connection |
| Storing API keys in client code | Credential theft | Server-side API calls only, keys in server config |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No loading indicator for procedural generation | User thinks game crashed | Show generation progress with seed/room count |
| Flashlight dies without warning | Frustrating sudden death | Audio cue before battery dies, gradual dimming |
| Ghost appears without audio cue | Unfair scare, player feels cheated | Always have ambient audio change before manifestation |
| No way to communicate with team | Isolated gameplay | Simple ping system or pre-set signals |
| Game crashes on network disconnect | Lost progress | Auto-reconnect with state recovery |
| Controls not explained | Player confused at start | Interactive tutorial in safe starting room |
| Evidence collection too obscure | Frustrating trial-and-error | Proximity indicator, highlight effect |

---

## "Looks Done But Isn't" Checklist

- [ ] **Multiplayer sync:** Often missing reconciliation logic — verify ghost position matches across all clients
- [ ] **Audio:** Often missing gain node cleanup — verify no audio nodes accumulate over session
- [ ] **Shadows:** Often missing first-frame workaround — verify shadows work on cold load
- [ ] **Procedural maps:** Often missing connectivity validation — verify all rooms reachable via flood-fill test
- [ ] **Reconnection:** Often missing state recovery — verify players can rejoin mid-game
- [ ] **Memory cleanup:** Often missing dispose calls — verify memory stable over 10-minute session
- [ ] **Ghost AI:** Often missing behavior variation — verify ghost acts differently per type
- [ ] **Escape condition:** Often missing synchronized win state — verify all clients see same outcome
- [ ] **Mobile performance:** Often missing quality scaling — verify playable on mid-range mobile

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| WebGL context loss | MEDIUM | Save scene state periodically, restore on context restore event |
| Map generation failure | LOW | Regenerate with new seed, show "unlucky generation" message |
| Audio context suspended | LOW | Detect suspension, prompt user to click to resume |
| Network desync | HIGH | Implement full state resync from server on detection |
| Memory leak crash | HIGH | Add automatic resource cleanup timer, restart scene if critical |
| Ghost AI stuck | LOW | Add despawn/respawn logic if ghost stays in same position too long |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Context loss | Foundation - Core | Test tab backgrounding, verify restoration |
| Latency desync | Foundation - Multiplayer | Test with high-latency simulation, verify sync |
| Memory leaks | Foundation - Performance | Run 15-minute session, monitor memory |
| Unplayable maps | Foundation - Map Gen | Generate 50 maps, verify connectivity |
| Audio context | Foundation - Audio | Test cold load, verify audio works after click |
| Shadow first-frame | Foundation - Rendering | Test first load, verify shadows appear |
| Prediction drift | Foundation - Multiplayer | Test movement, verify no rubber-banding |
| Repetitive ProcGen | Foundation - ProcGen | Generate 100 variations, manual review |
| Race conditions | Foundation - Multiplayer | Test simultaneous actions, verify consistency |
| Flashlight perf | Foundation - Performance | Test on mobile, verify 30+ FPS |

---

## Sources

- Three.js official documentation and common issues
- Valve Source Multiplayer Networking article
- Game Development Stack Exchange discussions on WebSocket multiplayer
- Gamasutra/Game Developer articles on procedural generation pitfalls
- Reddit r/proceduralgeneration community discussions
- Web Audio API specification and browser quirks documentation
- Three.js GitHub issues (shadow mapping, context loss)
- Game Wisdom articles on horror game pacing and roguelike design

---
*Pitfalls research for: SPECTRA - Browser-based 3D Multiplayer Horror Game*
*Researched: 2026-04-13*