---
phase: 01-foundation
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - package.json
  - vite.config.js
  - index.html
  - style.css
  - .env
  - README.md
  - src/main.js
  - src/game/scene.js
  - src/game/renderer.js
  - src/network/client.js
autonomous: true
requirements:
  - FOUND-01
  - FOUND-02
  - FOUND-03
  - FOUND-04
  - FOUND-05
  - FOUND-06
  - FOUND-07
must_haves:
  truths:
    - "Developers can run npm run dev and access game in browser with instant HMR"
    - "Project has Three.js scene setup rendering a test scene"
    - "WebSocket client can connect to development server"
  artifacts:
    - path: "package.json"
      provides: "Dependencies and scripts"
      contains: "three, ws, vite"
    - path: "vite.config.js"
      provides: "Vite config with WebSocket proxy"
      contains: "proxy.*ws"
    - path: "src/main.js"
      provides: "Entry point with Three.js setup"
      contains: "THREE, animate"
    - path: "src/game/scene.js"
      provides: "Three.js scene creation"
      contains: "createScene"
    - path: "src/network/client.js"
      provides: "WebSocket client wrapper"
      contains: "WebSocket, send"
  key_links:
    - from: "src/main.js"
      to: "src/game/scene.js"
      via: "import"
      pattern: "import.*scene"
    - from: "vite.config.js"
      to: "localhost:3000"
      via: "proxy config"
      pattern: "proxy.*ws.*3000"
---

<objective>
Configure project build system with Vite, Three.js, and basic WebSocket client setup.

Purpose: Establish development infrastructure enabling instant HMR and WebSocket connection testing.
Output: Running dev server with test scene, client can connect to WebSocket.
</objective>

<execution_context>
@C:\game\.planning\phases\01-foundation\01-RESEARCH.md
</execution_context>

<context>
@.planning\PROJECT.md
@.planning\REQUIREMENTS.md
@.planning\ROADMAP.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Initialize Vite project with dependencies</name>
  <files>package.json, vite.config.js</files>
  <action>
    Create package.json with:
    - name: "spectra"
    - type: "module" (for ES modules)
    - scripts: "dev": "vite", "build": "vite build"
    - dependencies: "three": "^0.183.0", "ws": "^8.20.0", "uuid": "^11.0.0", "dotenv": "^16.4.0"
    - devDependencies: "vite": "^8.0.0"
    
    Create vite.config.js with:
    - defineConfig export
    - server.proxy: "/ws" -> "ws://localhost:3000" with ws: true
    - optimizeDeps.include: ["three"]
  </action>
  <verify>Run `npm install` succeeds without errors</verify>
  <done>package.json has three, ws, vite dependencies; vite.config.js has WebSocket proxy</done>
</task>

<task type="auto">
  <name>Task 2: Create index.html and minimal styling</name>
  <files>index.html, style.css</files>
  <action>
    Create index.html with:
    - HTML5 doctype, lang: "en"
    - meta charset, viewport
    - title: "SPECTRA"
    - link to style.css
    - div#app containing canvas container
    - No loading screens per project constraint
    
    Create style.css with:
    - Reset: margin 0, padding 0, box-sizing border-box
    - html, body: height 100%, overflow hidden, background #000
    - canvas container: absolute full viewport
  </action>
  <verify>index.html loads without console errors</verify>
  <done>index.html has canvas container, style.css provides full-screen canvas</done>
</task>

<task type="auto">
  <name>Task 3: Set up Three.js scene and renderer</name>
  <files>src/main.js, src/game/scene.js, src/game/renderer.js</files>
  <action>
    Create src/game/scene.js:
    - createScene() returns THREE.Scene with fog (FogExp2, density 0.035)
    - Add ambient light (0x111122, intensity 0.3)
    - Add test floor (PlaneGeometry, MeshStandardMaterial gray)
    - Add test cube (BoxGeometry, MeshStandardMaterial) for visual verification
    
    Create src/game/renderer.js:
    - createRenderer() returns THREE.WebGLRenderer with antialias, alpha false
    - Set shadowMap enabled, PCFSoftShadowMap
    - Set toneMapping: ACESFilmicToneMapping
    
    Create src/main.js:
    - Import THREE, createScene, createRenderer
    - Create scene, renderer, PerspectiveCamera (75 FOV)
    - Handle window resize
    - Animation loop with requestAnimationFrame
    - Render scene each frame
  </action>
  <verify>npm run dev shows test scene in browser at localhost:5173</verify>
  <done>Three.js renders test scene with floor and cube, responsive to window resize</done>
</task>

<task type="auto">
  <name>Task 4: Create WebSocket client wrapper</name>
  <files>src/network/client.js</files>
  <action>
    Create src/network/client.js:
    - class NetworkClient with connect(url), send(message), on(event, callback)
    - connect() creates WebSocket to /ws (Vite proxy)
    - Handle binaryType = 'arraybuffer'
    - Handle onopen, onclose, onerror, onmessage events
    - Queue messages if not connected, send on reconnect
    - Export default NetworkClient
  </action>
  <verify>WebSocket connects to ws://localhost:3000 when server running</verify>
  <done>NetworkClient can connect, send, and receive messages</done>
</task>

<task type="auto">
  <name>Task 5: Create .env and README</name>
  <files>.env, README.md</files>
  <action>
    Create .env with:
    - GLM_API_KEY=your-api-key-here
    - Comments explaining configuration
    
    Create README.md with:
    - Project name and one-line description
    - Prerequisites (Node.js 18+)
    - Installation: npm install
    - Running dev server: npm run dev
    - Running WebSocket server: npm run server
    - Controls: WASD to move, mouse to look
    - WebSocket server port: 3000
  </action>
  <verify>.env and README.md exist with correct content</verify>
  <done>.env has GLM_API_KEY, README has setup instructions</done>
</task>

</tasks>

<verification>
- Run `npm install` - should complete without errors
- Run `npm run dev` - Vite starts on port 5173
- Open browser - test scene renders (floor + cube)
- WebSocket proxy configured at /ws -> localhost:3000
</verification>

<success_criteria>
- [ ] npm run dev starts Vite with instant HMR
- [ ] Three.js scene renders test objects
- [ ] WebSocket client can connect to development server
- [ ] All FOUND-01 to FOUND-07 requirements addressed
</success_criteria>

<output>
After completion, create `.planning/phases/01-foundation/{phase}-01-SUMMARY.md`
</output>

---

phase: 01-foundation
plan: 02
type: execute
wave: 2
depends_on:
  - 01
files_modified:
  - server/index.js
  - server/room-manager.js
  - server/game-state.js
  - src/network/protocol.js
  - src/ui/lobby.js
  - package.json
autonomous: true
requirements:
  - NET-01
  - NET-02
  - NET-03
  - NET-04
  - NET-05
  - NET-06
  - NET-07
  - NET-08
  - NET-09
  - NET-10
  - NET-11
  - NET-12
must_haves:
  truths:
    - "Up to 4 players can join a room via 6-digit code and see each other in lobby"
    - "Server correctly manages room state and synchronizes players at 20hz"
    - "Game starts only when all players ready up"
    - "Binary and JSON message handling works for all network events"
  artifacts:
    - path: "server/index.js"
      provides: "WebSocket server with room management"
      contains: "WebSocketServer, on connection"
    - path: "server/room-manager.js"
      provides: "Room creation, join, player management"
      contains: "createRoom, joinRoom, broadcast"
    - path: "server/game-state.js"
      provides: "Server-authoritative game state"
      contains: "GameState, tick, players"
    - path: "src/network/protocol.js"
      provides: "Message serialization (binary/JSON)"
      contains: "serializePosition, deserializePosition"
    - path: "src/ui/lobby.js"
      provides: "Lobby UI management"
      contains: "createLobby, updatePlayerList"
  key_links:
    - from: "server/index.js"
      to: "server/room-manager.js"
      via: "require"
      pattern: "require.*room-manager"
    - from: "server/room-manager.js"
      to: "server/game-state.js"
      via: "new GameState"
      pattern: "new GameState"
---

<objective>
Build WebSocket server with room management, lobby system, and player state synchronization.

Purpose: Enable 1-4 player cooperative multiplayer with room codes, ready-up, and game start flow.
Output: Working lobby where players can create/join rooms, ready up, and start game.
</objective>

<execution_context>
@C:\game\.planning\phases\01-foundation\01-RESEARCH.md

Patterns:
- Binary messages (ArrayBuffer + DataView) for position updates
- JSON for game events (create_room, join_room, ready, etc.)
- Client-side prediction with server reconciliation
- 20Hz tick rate for state synchronization
</execution_context>

<context>
@.planning/phases/01-foundation/01-01-SUMMARY.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create WebSocket server with room management</name>
  <files>server/index.js, server/room-manager.js</files>
  <action>
    Create server/room-manager.js:
    - class RoomManager with rooms Map (code -> Room)
    - generateCode() creates 6-digit code, checks uniqueness
    - createRoom(hostWs) returns code, adds host to players
    - joinRoom(ws, code) returns success (max 4 players)
    - leaveRoom(ws) removes player, deletes room if empty
    - broadcast(roomCode, message, excludeWs) sends to all players
    - getRoomState(code) returns room info for lobby
    
    Create server/index.js:
    - HTTP server on port 3000
    - WebSocketServer attached to HTTP
    - On connection: assign player ID, wait for join/create
    - Message handler: parse JSON, route by type
    - Types: create_room, join_room, leave_room, get_rooms
    - On close: handleDisconnect via roomManager
    - Log connection/disconnection
  </action>
  <verify>WebSocket server starts, accepts connections on port 3000</verify>
  <done>WebSocket server running, can create and join rooms with 6-digit codes</done>
</task>

<task type="auto">
  <name>Task 2: Implement player state sync and game loop</name>
  <files>server/game-state.js</files>
  <action>
    Create server/game-state.js:
    - class GameState with:
      - players: Map (id -> {id, x, y, z, rotation, ready, ws})
      - ghost: {x, y, z, state, type}
      - tick: number (increments each update)
      - started: boolean
    - updatePlayer(id, position, rotation)
    - setPlayerReady(id, ready)
    - startGame() when all ready
    - serialize() returns {tick, players, ghost}
    
    Create server game loop (integrate in index.js):
    - setInterval at 50ms (20Hz)
    - For each room with started game:
      - Update ghost state (server authoritative)
      - Serialize and broadcast game state
    - Broadcast includes tick for client-side prediction reconciliation
  </action>
  <verify>Game state broadcasts at 20Hz to connected clients</verify>
  <done>Player positions sync at 20Hz, server-authoritative ghost state</done>
</task>

<task type="auto">
  <name>Task 3: Implement binary/JSON message protocol</name>
  <files>src/network/protocol.js</files>
  <action>
    Create src/network/protocol.js:
    - serializePosition(x, y, z, rotation) returns ArrayBuffer
      - 1 byte: message type (0x01 = position)
      - 4 bytes each: x, y, z, rotation (Float32)
      - Total: 17 bytes
    - deserializePosition(buffer) returns {x, y, z, rotation}
    - serializeGameEvent(type, data) returns JSON string
    - deserializeGameEvent(json) returns object
    - Message types:
      - Binary: position update (0x01)
      - JSON: create_room, join_room, leave_room, ready, start, game_state, error
    - Export: serializePosition, deserializePosition, serializeGameEvent, deserializeGameEvent
  </action>
  <verify>Binary messages parse correctly, JSON messages serialize/deserialize</verify>
  <done>Protocol handles both binary and JSON message types</done>
</task>

<task type="auto">
  <name>Task 4: Implement client-side prediction</name>
  <files>src/network/client.js</files>
  <action>
    Update src/network/client.js:
    - Add predictionBuffer array for pending inputs
    - Add currentTick counter
    - handleInput(input): 
      - Increment tick, add to buffer
      - Apply prediction immediately (simulateMovement)
      - Send input to server
    - handleServerState(state):
      - Find matching input in buffer by tick
      - If position diverges > 0.1 units: snap to server state
      - Replay subsequent buffered inputs
      - Remove acknowledged inputs from buffer
    - Input structure: {tick, type, dx, dy, dt}
    - Movement: velocity-based with fixed dt for determinism
  </action>
  <verify>Local movement feels instant, server corrections minimal</verify>
  <done>Client-side prediction works with server reconciliation</done>
</task>

<task type="auto">
  <name>Task 5: Create lobby UI</name>
  <files>src/ui/lobby.js</files>
  <action>
    Create src/ui/lobby.js:
    - createLobby() returns lobby DOM element
    - showCreateRoom() - button to create room, shows code on success
    - showJoinRoom() - input for code, join button
    - updatePlayerList(players) - shows player names, ready status
    - showRoomCode(code) - displays 6-digit code
    - setReady(ready) - toggles ready status
    - showStartButton(enabled) - host can start when all ready
    - States: menu, creating, joining, lobby, ready, playing
    - CSS classes for lobby states
    
    Create src/ui/lobby.css:
    - Lobby overlay: absolute, centered, dark background
    - Player list: vertical list with ready indicators (green/red)
    - Room code: large monospace font
    - Buttons: styled for horror aesthetic (dark, subtle glow)
  </action>
  <verify>Lobby shows room code, player list updates on join/leave</verify>
  <done>Lobby UI complete with create/join/ready/start flow</done>
</task>

<task type="auto">
  <name>Task 6: Implement ready-up and game start flow</name>
  <files>server/index.js, src/network/client.js</files>
  <action>
    Update server/index.js:
    - Add ready message handler: setPlayerReady(id, ready)
    - Add start message handler: check all ready, call gameState.startGame()
    - Broadcast player_ready when ready status changes
    - Broadcast game_start when game begins
    - Handle edge cases: host leaving, not enough players
    
    Update src/network/client.js:
    - ready(ready) - send ready status to server
    - start() - host sends start (only if all ready)
    - on('game_start') - transition from lobby to game
    - on('player_ready') - update UI with ready status
    
    Integrate with lobby.js:
    - Ready button toggles ready status
    - Start button enabled when all players ready
    - Show "Waiting for players..." if < 2 players
  </action>
  <verify>All players ready enables start, game begins</verify>
  <done>Ready-up system works, game starts when all ready</done>
</task>

</tasks>

<verification>
- Start WebSocket server: npm run server (port 3000)
- Start dev server: npm run dev (port 5173)
- Open 2+ browser tabs, create/join room
- Players appear in lobby with ready status
- All ready -> start button enables -> game begins
- Position updates sync at ~20Hz
</verification>

<success_criteria>
- [ ] 4 players can join same room via 6-digit code
- [ ] Room state manages players at 20Hz
- [ ] Game starts only when all players ready
- [ ] Binary positions + JSON events work
- [ ] Client-side prediction provides responsive movement
- [ ] All NET-01 to NET-12 requirements addressed
</success_criteria>

<output>
After completion, create `.planning/phases/01-foundation/{phase}-02-SUMMARY.md`
</output>