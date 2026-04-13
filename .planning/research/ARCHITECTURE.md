# Architecture Research

**Domain:** Browser-based 3D Multiplayer Horror Game
**Researched:** 2026-04-13
**Confidence:** HIGH

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      Client (Browser)                        │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   UI Layer  │  │  Game Loop  │  │  Rendering  │         │
│  │  (HTML/CSS) │  │  (Update)   │  │ (Three.js)  │         │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘         │
│         │                │                │                  │
├─────────┴────────────────┴────────────────┴──────────────────┤
│                    State Management                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │  Game State │  │ Player State│  │ Ghost State │         │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘         │
│         │                │                │                  │
├─────────┴────────────────┴────────────────┴──────────────────┤
│                    Network Layer                              │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │              WebSocket Client (Socket.IO)               │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ WebSocket
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Server (Node.js)                        │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   Gateway   │  │ Game Logic  │  │   Session   │         │
│  │  (Socket.IO)│  │   (Rules)   │  │  (Rooms)    │         │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘         │
│         │                │                │                  │
├─────────┴────────────────┴────────────────┴──────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   Ghost AI  │  │  Evidence   │  │    GLM      │         │
│  │  (State)    │  │  Tracker    │  │   API       │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| **Rendering (Three.js)** | Scene graph, camera, meshes, lighting, materials | Direct Three.js scene setup, no framework |
| **Game Loop** | Frame timing, delta updates, fixed physics step | requestAnimationFrame with accumulator |
| **UI Layer** | HUD, menus, journal, evidence display | Vanilla HTML/CSS overlaid on canvas |
| **Network Client** | WebSocket connection, message serialization | Socket.IO client with event emitters |
| **State Management** | Player positions, ghost state, evidence, game phase | Plain JS objects with change detection |
| **Gateway (Server)** | Connection handling, room management, message routing | Socket.IO namespace/rooms |
| **Game Logic Server** | Rule enforcement, win/lose conditions, state authority | Server-authoritative event handlers |
| **Ghost AI** | Behavior state machine, detection, hunting | State pattern with 6 ghost types |
| **GLM API Handler** | Ghost dialogue generation, context building | REST calls with fallback responses |
| **Audio Engine** | Procedural sound synthesis | Web Audio API oscillators/filters |

## Recommended Project Structure

```
spectra/
├── client/                      # Browser application
│   ├── public/
│   │   ├── index.html           # Entry point
│   │   └── style.css            # UI styles
│   ├── src/
│   │   ├── main.ts              # App initialization
│   │   ├── engine/
│   │   │   ├── render/         # Three.js setup
│   │   │   │   ├── scene.ts     # Scene, camera, renderer
│   │   │   │   ├── lighting.ts  # Procedural lights
│   │   │   │   └── materials.ts # Procedural materials
│   │   │   ├── physics/        # Collision detection
│   │   │   └── loop.ts          # Game loop (update/render)
│   │   ├── game/
│   │   │   ├── player.ts        # Player controller
│   │   │   ├── ghost.ts         # Ghost entity (client prediction)
│   │   │   ├── world.ts         # Procedural map generation
│   │   │   ├── evidence.ts      # Evidence collection
│   │   │   └── journal.ts       # UI journal state
│   │   ├── audio/
│   │   │   └── engine.ts        # Web Audio synthesis
│   │   ├── network/
│   │   │   ├── client.ts        # Socket.IO wrapper
│   │   │   └── messages.ts      # Message definitions
│   │   └── ui/
│   │       ├── hud.ts          # Health, sanity display
│   │       ├── journal.ts      # Evidence journal UI
│   │       └── menu.ts         # Main/lobby menus
│   └── package.json
│
├── server/                      # Node.js backend
│   ├── src/
│   │   ├── index.ts             # Entry point, server start
│   │   ├── gateway/
│   │   │   ├── socket.ts        # Socket.IO setup
│   │   │   ├── rooms.ts         # Session management
│   │   │   └── handlers.ts      # Event handlers
│   │   ├── game/
│   │   │   ├── state.ts         # Server game state
│   │   │   ├── rules.ts         # Win/lose conditions
│   │   │   └── sync.ts          # State broadcast
│   │   ├── ghost/
│   │   │   ├── types.ts         # 6 ghost type definitions
│   │   │   ├── behavior.ts      # State machine
│   │   │   └── hunt.ts          # Hunting logic
│   │   ├── evidence/
│   │   │   └── tracker.ts       # Evidence collection logic
│   │   ├── api/
│   │   │   └── glm.ts           # GLM API client
│   │   └── types/
│   │       └── index.ts         # Shared type definitions
│   └── package.json
│
└── shared/                      # Shared between client/server
    └── types/
        └── index.ts             # Message schemas, game constants
```

### Structure Rationale

- **client/src/engine/:** Rendering and game loop — pure Three.js, no framework overhead
- **client/src/game/:** Domain logic — player, ghost, world generation (procedural)
- **client/src/network/:** Single socket client wrapper, isolates WebSocket complexity
- **server/src/gateway/:** Connection handling, keeps socket logic separate from game logic
- **server/src/ghost/:** AI behavior isolated — state machine easy to test/modify
- **shared/types/:** Single source of truth for message formats and constants

## Architectural Patterns

### Pattern 1: Server-Authoritative Game State

**What:** Server holds canonical game state; clients render snapshots and send inputs
**When to use:** Competitive or cheating-sensitive gameplay; co-op with shared objectives
**Trade-offs:** Higher latency to process, but prevents desync and cheating

**Example:**
```typescript
// Client sends input intent
socket.emit('playerMove', { direction: 'forward', delta: 0.016 });

// Server validates and updates authoritative state
gameState.players[playerId].position += direction * delta;

// Server broadcasts authoritative snapshot
socket.to(roomId).emit('stateUpdate', gameState);
```

### Pattern 2: Client-Side Prediction

**What:** Client predicts movement locally while server confirms
**When to use:** Real-time action where latency would feel unresponsive
**Trade-offs:** Adds complexity; prediction errors require reconciliation

**Example:**
```typescript
// Client predicts immediately
const predictedPosition = currentPosition.clone();
predictedPosition.add(input.direction.multiplyScalar(delta));
updatePlayerMesh(predictedPosition);

// Server confirms or corrects
socket.on('stateUpdate', (serverState) => {
  if (distance(predictedPosition, serverState.player.position) > threshold) {
    // Reconciliation: snap to server state
    updatePlayerMesh(serverState.player.position);
  }
});
```

### Pattern 3: Room-Based Session Management

**What:** Each game instance is a room; players join/leave rooms
**When to use:** Matchmaking, private games, session isolation
**Trade-offs:** Need room lifecycle management; but simplifies state cleanup

**Example:**
```typescript
// Server: create room with settings
const room = io.of('/game').to(roomId);
room.gameState = createGameState(options);

// Client: join room
socket.emit('joinRoom', { roomId, playerName });
```

### Pattern 4: Event-Driven Ghost Behavior

**What:** Ghost AI uses state machine with events triggering state transitions
**When to use:** Entity behavior that varies by type and game phase
**Trade-offs:** Clear state transitions, but 6 types means 6 behavior sets to tune

**Example:**
```typescript
// Ghost states: IDLE, HAUNT, HUNT, KILL
const transitions = {
  IDLE: { timeout: 30000, evidenceTrigger: 'EMF' },
  HAUNT: { playerNearby: 5, evidenceTrigger: 'SPIRIT_BOX' },
  HUNT: { sanityBelow: 30, duration: 15000 },
};
```

### Pattern 5: Procedural Generation with Seed

**What:** Map and audio generated from deterministic seeds
**When to use:** Replayability, no external assets requirement
**Trade-offs:** Seed must sync across clients; procedural art limited

**Example:**
```typescript
function generateRoom(seed: number, roomType: string): Room {
  const rng = createRNG(seed);
  return {
    doors: rng.shuffle(availableDoors).slice(0, rng.int(1, 3)),
    furniture: rng.sample(furniturePool, rng.int(2, 6)),
    lighting: rng.choice(lightingTypes),
  };
}
```

## Data Flow

### Player Movement Flow

```
[Player Input (WASD)]
        │
        ▼
[Client: Game Loop] ──predict──> [Local Position]
        │                           │
        │                           ▼
        │                    [Render Frame]
        │
        ▼
[Network: Emit 'playerMove']
        │
        ▼
[Server: Validate Input]
        │
        ▼
[Server: Update Authoritative State]
        │
        ▼
[Server: Broadcast 'stateUpdate']
        │
        ▼
[All Clients: Reconcile & Render]
```

### Ghost Interaction Flow

```
[Ghost AI (Server)]
        │
        ▼
[Emit 'ghostAction' { type, position, evidence }]
        │
        ▼
[All Clients: Play Sound + Show Evidence UI]
        │
        ▼
[Player: Collect Evidence]
        │
        ▼
[Client: Emit 'collectEvidence' { evidenceId }]
        │
        ▼
[Server: Validate & Update Game State]
        │
        ▼
[Server: Check Win Condition]
```

### Key Data Flows

1. **Player Position Sync:** Client sends input → Server validates → Server broadcasts state → Clients interpolate
2. **Ghost State Sync:** Server AI tick → Emit ghost state → Clients render ghost mesh + play audio
3. **Evidence Collection:** Client picks up → Emit collect event → Server tracks → Broadcast to journal UI
4. **Dialogue Request:** Client triggers interaction → Server calls GLM API → Server sends response → Client displays
5. **Win/Lose Condition:** Server checks rules after each evidence/phase → Emit gameOver event → Clients show result

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 1-4 players | Single Node.js instance, in-memory state — no sharding needed |
| 5-20 players | Add Redis for pub/sub if scaling to multiple server instances |
| 20+ players | World partitioning (rooms), interest management (only sync nearby entities) |

### Scaling Priorities

1. **First bottleneck:** Network bandwidth — state snapshot size. *Fix: Delta compression, only send changed fields*
2. **Second bottleneck:** Server CPU (ghost AI tick + physics). *Fix: Reduce tick rate, spatial hashing for collision*

## Anti-Patterns

### Anti-Pattern 1: Trusting Client State

**What people do:** Client sends "I found evidence" directly; server accepts
**Why it's wrong:** Cheating trivial — client can fake any game state
**Do this instead:** Client sends "I interacted with object X at position Y" — server validates and creates evidence

### Anti-Pattern 2: Sending State Every Frame

**What people do:** Emit full game state 60 times per second
**Why it's wrong:** Massive bandwidth, overwhelms client parsing
**Do this instead:** Send delta updates at 10-20Hz, interpolate on client

### Anti-Pattern 3: Tightly Coupling Network to Game Logic

**What people do:** Scattered socket.emit() calls throughout game code
**Why it's wrong:** Hard to test, impossible to swap transport, refactoring painful
**Do this instead:** Network layer abstraction — game code calls `network.send()`, network handles transport

### Anti-Pattern 4: Blocking Audio on Game State

**What people do:** Waiting for server to confirm sound before playing
**Why it's wrong:** Audio latency kills immersion; server round-trip too slow
**Do this instead:** Client plays audio immediately on local triggers; server can correct if needed

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| GLM API | REST POST from server, with fallback | Ghost dialogue generation; fallback for missing API key |
| Browser WebGL | Direct Three.js call | No wrapper needed for this scope |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Engine ↔ Game | Method calls on game object | Loop calls `game.update(delta)` |
| Game ↔ Network | Event emitter pattern | Game emits events, network sends; network delivers to game |
| Server Game ↔ Ghost AI | State machine events | Ghost emits state change, game logic handles |
| UI ↔ Game | Direct method calls | UI reads game state, calls game methods for actions |

## Build Order

Dependencies flow from bottom to top:

```
1. shared/types          ← No dependencies (foundation)
2. server/gateway        ← Uses shared types
3. server/game           ← Uses gateway for state sync
4. server/ghost          ← Uses game state
5. server/api            ← Independent (GLM)
6. client/engine/render  ← No game logic yet
7. client/network        ← Uses shared types
8. client/game           ← Uses engine + network
9. client/ui             ← Uses game state
10. client/audio         ← Independent
```

**Implication:** Cannot fully test multiplayer until steps 1-9 complete; audio can be developed in isolation.

---

*Architecture research for: Browser-based 3D Multiplayer Horror Game*
*Researched: 2026-04-13*