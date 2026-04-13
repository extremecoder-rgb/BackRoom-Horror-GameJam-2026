# Phase 1: Foundation - Research

**Researched:** 2026-04-13
**Domain:** Build system and WebSocket multiplayer infrastructure
**Confidence:** HIGH

## Summary

Phase 1 establishes the foundational infrastructure for SPECTRA: Vite dev server with instant HMR, Three.js rendering setup, and WebSocket multiplayer with room management. The phase delivers 19 requirements spanning project configuration (FOUND-01 to FOUND-07) and networking (NET-01 to NET-12). Key technical decisions include using Vite 8.x for bundling, ws 8.20.x for WebSocket server, and implementing client-side prediction with server reconciliation for responsive multiplayer gameplay. The architecture follows server-authoritative model with 20Hz state synchronization, 6-digit room codes, and max 4 players per room.

**Primary recommendation:** Use Vite 8.x with vanilla JavaScript (not TypeScript for v1 to reduce complexity), ws 8.20.x for WebSocket server, implement binary messages for position updates and JSON for game events, and apply client-side prediction with reconciliation for smooth multiplayer experience.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vite | 8.x | Development server & bundler | Sub-100ms HMR, Rolldown-based bundling produces 6-31% smaller bundles than webpack |
| Three.js | r183 (latest) | 3D rendering | Industry standard for WebGL; modular exports enable tree-shaking |
| ws | 8.20.x | WebSocket client/server | 166.9M weekly downloads, minimal overhead, protocol-compliant |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| uuid | 11.x | Room code generation | Generate unique 6-digit room codes |
| dotenv | 16.x | Environment variables | Load GLM API key from .env |

### Installation

```bash
# Core dependencies
npm install three ws uuid dotenv

# Dev dependencies
npm install -D vite
```

## Architecture Patterns

### Recommended Project Structure

```
spectra/
├── index.html              # Entry HTML with canvas
├── style.css               # Minimal styling
├── vite.config.js          # Vite config with WebSocket proxy
├── package.json            # Dependencies
├── .env                    # API keys (GLM)
├── src/
│   ├── main.js             # Entry point, Three.js setup
│   ├── network/
│   │   ├── client.js       # WebSocket client wrapper
│   │   └── protocol.js     # Message serialization
│   ├── game/
│   │   ├── scene.js        # Three.js scene setup
│   │   ├── camera.js       # First-person camera
│   │   └── renderer.js     # WebGL renderer
│   └── ui/
│       └── lobby.js        # Lobby UI management
├── server/
│   ├── index.js            # WebSocket server entry
│   ├── room-manager.js     # Room management logic
│   └── game-state.js       # Authoritative game state
└── public/                 # Static assets (empty for v1)
```

### Pattern 1: Vite + Three.js Setup

**What:** Standard Vite project with Three.js imported as ES module

**When to use:** Initial project setup for instant HMR development

**Example:**
```javascript
// src/main.js
import * as THREE from 'three';
import { createScene } from './game/scene.js';
import { createRenderer } from './game/renderer.js';

const scene = createScene();
const renderer = createRenderer();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}
animate();
```

Source: [threejs.org official docs](https://threejs.org/manual/en/installation.html)

### Pattern 2: WebSocket Server with Room Management

**What:** Node.js WebSocket server using ws library with Map-based room tracking

**When to use:** Multiplayer game server requiring room-based player grouping

**Example:**
```javascript
// server/index.js
const { WebSocketServer } = require('ws');
const http = require('http');
const RoomManager = require('./room-manager');

const server = http.createServer();
const wss = new WebSocketServer({ server });
const roomManager = new RoomManager();

wss.on('connection', (ws) => {
    ws.on('message', (data) => {
        const message = JSON.parse(data);
        
        switch (message.type) {
            case 'create_room':
                const roomCode = roomManager.createRoom(ws);
                ws.send(JSON.stringify({ type: 'room_created', code: roomCode }));
                break;
                
            case 'join_room':
                const success = roomManager.joinRoom(ws, message.code);
                if (success) {
                    broadcastRoomState(message.code);
                } else {
                    ws.send(JSON.stringify({ type: 'error', message: 'Room full or invalid' }));
                }
                break;
        }
    });
    
    ws.on('close', () => {
        roomManager.handleDisconnect(ws);
    });
});

server.listen(3000, () => {
    console.log('WebSocket server running on port 3000');
});
```

Source: [ws npm package](https://www.npmjs.com/package/ws)

### Pattern 3: Binary Message Protocol

**What:** Using ArrayBuffer with DataView for efficient position/state sync

**When to use:** High-frequency updates (player positions at 20Hz) where JSON overhead matters

**Example:**
```javascript
// Client - sending position as binary
function sendPosition(ws, x, y, z, rotation) {
    const buffer = new ArrayBuffer(16);
    const view = new DataView(buffer);
    view.setUint8(0, 0x01);  // Message type: position
    view.setFloat32(1, x, true);
    view.setFloat32(5, y, true);
    view.setFloat32(9, z, true);
    view.setFloat32(13, rotation, true);
    ws.send(buffer);
}

// Client - receiving binary
ws.binaryType = 'arraybuffer';
ws.onmessage = (event) => {
    if (event.data instanceof ArrayBuffer) {
        const view = new DataView(event.data);
        const type = view.getUint8(0);
        if (type === 0x01) {
            const x = view.getFloat32(1, true);
            const y = view.getFloat32(5, true);
            const z = view.getFloat32(9, true);
            updateOtherPlayer(x, y, z);
        }
    } else {
        const message = JSON.parse(event.data);
        handleJSONMessage(message);
    }
};
```

Source: [MDN WebSocket binaryType](https://developer.mozilla.org/docs/Web/API/WebSocket/binaryType)

### Pattern 4: Client-Side Prediction with Server Reconciliation

**What:** Immediate local movement prediction with server state correction for responsive multiplayer

**When to use:** Real-time player movement where network latency would cause input lag

**Implementation:**
```javascript
// Client prediction state
const predictionBuffer = [];
let currentTick = 0;

// Client - predict movement immediately
function handleInput(input) {
    currentTick++;
    input.tick = currentTick;
    predictionBuffer.push(input);
    
    // Immediately apply prediction
    const predictedState = simulateMovement(input);
    applyState(predictedState);
    
    // Send to server
    ws.send(JSON.stringify({ type: 'input', ...input }));
}

// Client - reconcile with server
function handleServerState(state) {
    const savedTick = state.tick;
    const predictedInput = predictionBuffer.find(i => i.tick === savedTick);
    
    if (predictedInput) {
        const reconciledState = simulateMovement(predictedInput);
        if (distance(reconciledState, state.position) > 0.1) {
            // Snap to server state and replay buffered inputs
            applyState(state.position);
            const subsequentInputs = predictionBuffer.filter(i => i.tick > savedTick);
            subsequentInputs.forEach(input => applyMovement(input));
        }
    }
    
    // Keep inputs server hasn't acknowledged
    const keptInputs = predictionBuffer.filter(i => i.tick > savedTick);
    predictionBuffer.length = 0;
    predictionBuffer.push(...keptInputs);
}
```

Source: [Gabriel Gambetta - Client-Side Prediction and Server Reconciliation](https://www.gabrielgambetta.com/fpm2.html)

### Pattern 5: Vite WebSocket Proxy

**What:** Configure Vite to proxy WebSocket connections to development server

**When to use:** Development - avoid CORS and mixed content issues

**Example:**
```javascript
// vite.config.js
export default defineConfig({
    server: {
        proxy: {
            '/ws': {
                target: 'ws://localhost:3000',
                ws: true
            }
        }
    }
});
```

Source: [Vite proxy documentation](https://vitejs.dev/config/server-options.html#server-proxy)

### Anti-Patterns to Avoid

- **Using Socket.io for client bundle:** Adds ~50KB overhead; use native WebSocket API instead
- **Storing room state in client:** Must be server-authoritative to prevent desync
- **Sending full state every frame:** Use delta compression or binary for position updates
- **Blocking on network:** Always predict locally; never wait for server response

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Room code generation | Custom 6-digit algorithm | uuid with substring or random six-digit generator | Ensures uniqueness, no collisions |
| WebSocket reconnection | Custom exponential backoff | ws handles close, implement reconnection on client | Well-tested, handles edge cases |
| Binary serialization | Custom binary format | DataView with ArrayBuffer | Native, fast, typed arrays |
| Movement physics | Custom physics engine | Simple velocity-based with collision | Deterministic for prediction, no physics library overhead |

**Key insight:** The key to responsive multiplayer is client-side prediction. Without it, every player input waits for a round-trip to the server, causing 50-200ms input lag. Server reconciliation ensures clients stay in sync while prediction provides immediate feedback.

## Common Pitfalls

### Pitfall 1: WebSocket Connection Drops

**What goes wrong:** Players disconnect during gameplay due to network instability

**Why it happens:** Mobile networks, sleep mode, WiFi roaming cause connections to drop

**How to avoid:** Implement exponential backoff reconnection with message replay

**Warning signs:** Players report "being kicked" frequently, especially on mobile

### Pitfall 2: Room Code Collision

**What goes wrong:** Two rooms get the same 6-digit code

**Why it happens:** Using Math.random() without collision checking

**How to avoid:** Check code doesn't exist before creating room, regenerate if collision

**Warning signs:** Players can't join rooms, "room not found" errors

### Pitfall 3: Server State Divergence

**What goes wrong:** Client prediction diverges from server authoritative state

**Why it happens:** Non-deterministic movement (floating point errors, different deltaTime)

**How to avoid:** Use fixed timestep for physics, serialize deltaTime in inputs

**Warning signs:** Players "teleport" occasionally, rubber-banding effect

### Pitfall 4: Memory Leaks in Game Loop

**What goes wrong:** Memory grows unbounded during gameplay

**Why it happens:** Creating new objects in render loop (vectors, materials, geometries)

**How to avoid:** Object pooling, reuse Three.js objects, dispose geometries/materials on cleanup

**Warning signs:** Increasing memory usage over time, eventual browser crash

## Code Examples

### Room Manager (Server)

```javascript
// server/room-manager.js
class RoomManager {
    constructor() {
        this.rooms = new Map();  // code -> { players: Map, state: GameState }
    }
    
    generateCode() {
        let code;
        do {
            code = Math.floor(100000 + Math.random() * 900000).toString();
        } while (this.rooms.has(code));
        return code;
    }
    
    createRoom(hostWs) {
        const code = this.generateCode();
        const room = {
            code,
            players: new Map(),
            gameState: null,
            createdAt: Date.now()
        };
        room.players.set(hostWs, { id: this.generatePlayerId(), ready: false });
        this.rooms.set(code, room);
        return code;
    }
    
    joinRoom(ws, code) {
        const room = this.rooms.get(code);
        if (!room || room.players.size >= 4) return false;
        
        room.players.set(ws, { id: this.generatePlayerId(), ready: false });
        return true;
    }
    
    broadcast(roomCode, message, excludeWs = null) {
        const room = this.rooms.get(roomCode);
        if (!room) return;
        
        const data = JSON.stringify(message);
        room.players.forEach((player, ws) => {
            if (ws !== excludeWs && ws.readyState === 1) {
                ws.send(data);
            }
        });
    }
}
```

### Game State Sync (20Hz Server Loop)

```javascript
// server/game-loop.js
const TICK_RATE = 20;  // 20Hz
const TICK_INTERVAL = 1000 / TICK_RATE;

setInterval(() => {
    rooms.forEach((room, code) => {
        if (room.gameState && room.gameState.started) {
            // Update ghost state (server authoritative)
            updateGhost(room.gameState);
            
            // Broadcast game state to all players
            room.players.forEach((player, ws) => {
                const state = {
                    type: 'game_state',
                    tick: room.tick++,
                    players: serializePlayers(room.players),
                    ghost: serializeGhost(room.gameState.ghost)
                };
                ws.send(JSON.stringify(state));
            });
        }
    });
}, TICK_INTERVAL);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| HTTP polling | WebSocket persistent connection | HTML5 (2011) | Real-time, bidirectional |
| Socket.io raw websockets | ws library (minimal overhead) | 2020+ | 50KB smaller bundle |
| Full state JSON sync | Binary position + JSON events | Modern multiplayer | 70% bandwidth reduction |
| Server-authoritative only | Client-side prediction + reconciliation | Fast-paced games (2000s) | Responsive gameplay |
| 10Hz server tick | 20Hz tick rate | Modern standards | Smoother interpolation |

**Deprecated/outdated:**
- Socket.io: Adds unnecessary overhead for simple room-based multiplayer
- XMLHttpRequest polling: Replaced by WebSocket for real-time
- Long polling fallback: Not needed for modern browsers

## Open Questions

1. **Should we use TypeScript for v1?**
   - What we know: TypeScript adds setup complexity, type safety helps with network protocol
   - What's unclear: Whether complexity payoff is worth it for 2-person team
   - Recommendation: Start with vanilla JS, migrate if types become painful

2. **How to handle ghost state synchronization?**
   - What we know: Server-authoritative ghost prevents cheating
   - What's unclear: How often to sync ghost position to clients (20Hz? 10Hz?)
   - Recommendation: Sync at same 20Hz as players, interpolate on client

3. **Should we use a messagepack library for binary?**
   - What we know: JSON is ~30% larger than MessagePack
   - What's unclear: Whether complexity adds value for ~4 players
   - Recommendation: Use raw DataView for positions, JSON for events

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| FOUND-01 | Project uses Vite with instant HMR dev server | Vite 8.x standard setup, documented in STACK.md |
| FOUND-02 | Package.json configured with three, ws dependencies | Core libraries identified in standard stack |
| FOUND-03 | vite.config.js with WebSocket proxy | Proxy pattern documented in Architecture Patterns |
| FOUND-04 | index.html with canvas + overlay (no loading screens) | Standard Three.js setup pattern |
| FOUND-05 | style.css with minimal styling | Basic CSS for overlay UI |
| FOUND-06 | .env file for GLM API key configuration | dotenv pattern for environment variables |
| FOUND-07 | README.md with setup instructions | Standard project documentation |
| NET-01 | WebSocket server (Node.js) | ws library, room manager pattern |
| NET-02 | Room creation system | generateCode() in RoomManager |
| NET-03 | Room code display | Broadcast room info to clients |
| NET-04 | Max 4 players per room | Size check in joinRoom |
| NET-05 | Player state sync (20hz) | Game loop with 20Hz interval |
| NET-06 | Ghost state sync (server authoritative) | Ghost updated on server, broadcast to clients |
| NET-07 | Binary WebSocket messages | ArrayBuffer + DataView pattern |
| NET-08 | JSON messages for game events | Switch between binary/JSON by message type |
| NET-09 | Client-side prediction | Prediction + reconciliation pattern |
| NET-10 | Lobby system | Room state management, player list |
| NET-11 | Ready up system | Player ready flag in room state |
| NET-12 | Game start flow | All players ready check, start game state |

## Sources

### Primary (HIGH confidence)
- [threejs.org](https://threejs.org/manual/en/installation.html) - Official Three.js installation guide
- [npmjs.com/package/ws](https://www.npmjs.com/package/ws) - ws library v8.20.0 documentation
- [Vite official docs](https://vitejs.dev/) - Vite configuration and proxy setup
- [MDN WebSocket binaryType](https://developer.mozilla.org/docs/Web/API/WebSocket/binaryType) - Binary message handling

### Secondary (MEDIUM confidence)
- [Gabriel Gambetta - Client-Side Prediction](https://www.gabrielgambetta.com/fpm2.html) - Prediction and reconciliation patterns
- [WebSocket Room Management - OneUptime](https://oneuptime.com/blog/post/2026-01-24-websocket-room-channel-management/view) - Room patterns
- [ws library benchmarks](https://pkgpulse.com/blog/best-websocket-libraries-nodejs-2026) - ws vs alternatives

### Tertiary (LOW confidence)
- [Vite Three.js template - doinel1a](https://github.com/doinel1a/vite-three-js) - Boilerplate reference
- [WebSocket scaling patterns](https://webcoderspeed.com/blog/scaling-websocket-scale-2026) - Multi-server considerations (v2)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Vite, Three.js, ws are industry standard with extensive documentation
- Architecture: HIGH - Server-authoritative multiplayer well-documented via Source Engine networking
- Pitfalls: MEDIUM - Identified common issues; some require implementation validation

**Research date:** 2026-04-13
**Valid until:** 2026-05-13 (30 days - stable stack)