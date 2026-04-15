import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import RoomManager from './room-manager.js';
import GameState from './game-state.js';

// Load environment variables
import 'dotenv/config';

const PORT = process.env.WS_PORT || 3000;

// Create HTTP server
const server = createServer((req, res) => {
  // Simple health check endpoint
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', rooms: roomManager.getAllRooms() }));
  } else {
    res.writeHead(404);
    res.end();
  }
});

// Create WebSocket server
const wss = new WebSocketServer({ server });

// Room and game state management
const roomManager = new RoomManager();
const gameStates = new Map(); // roomCode -> GameState
const clientRooms = new Map(); // ws -> roomCode

// Game tick interval (20Hz)
const TICK_RATE = 50; // ms
let gameInterval = null;

// Connection handler
wss.on('connection', (ws, req) => {
  const clientIp = req.socket.remoteAddress;
  console.log(`Client connected: ${clientIp}`);
  
  // Send welcome message
  ws.send(JSON.stringify({
    type: 'welcome',
    data: { message: 'Connected to SPECTRA server' }
  }));
  
  // Message handler
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      handleMessage(ws, message);
    } catch (error) {
      console.error('Failed to parse message:', error);
    }
  });
  
  // Close handler
  ws.on('close', () => {
    handleDisconnect(ws);
  });
  
  // Error handler
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// Handle incoming messages
function handleMessage(ws, message) {
  const { type, data } = message;
  
  switch (type) {
    case 'create_room':
      handleCreateRoom(ws, data);
      break;
      
    case 'join_room':
      handleJoinRoom(ws, data);
      break;
      
    case 'leave_room':
      handleLeaveRoom(ws);
      break;
      
    case 'ready':
      handleReady(ws, data);
      break;
      
    case 'start':
      handleStart(ws);
      break;
      
    case 'position':
      handlePosition(ws, data);
      break;
      
    case 'chat':
      handleChat(ws, data);
      break;
      
    case 'start_hunt':
      handleStartHunt(ws);
      break;
      
    case 'end_hunt':
      handleEndHunt(ws);
      break;
      
    default:
      console.log(`Unknown message type: ${type}`);
  }
}

// Create room
function handleCreateRoom(ws, data) {
  const { name } = data || {};
  const result = roomManager.createRoom(ws, name || 'Host');
  
  if (result.code) {
    // Track client room
    clientRooms.set(ws, result.code);
    
    // Send room info to creator
    ws.send(JSON.stringify({
      type: 'room_created',
      data: {
        code: result.code,
        playerId: result.playerId
      }
    }));
    
    console.log(`Room created: ${result.code}`);
  }
}

// Join room
function handleJoinRoom(ws, data) {
  const { code, name } = data;
  const result = roomManager.joinRoom(ws, code, name || 'Player');
  
  if (result.success) {
    // Track client room
    clientRooms.set(ws, code);
    
    // Send room info to new player
    ws.send(JSON.stringify({
      type: 'room_joined',
      data: {
        code: result.code,
        playerId: result.playerId,
        roomState: roomManager.getRoomState(code)
      }
    }));
    
    // Notify other players
    roomManager.broadcast(code, {
      type: 'player_joined',
      data: { playerId: result.playerId, name: name || 'Player' }
    }, ws);
    
    console.log(`Player joined room: ${code}`);
  } else {
    // Send error
    ws.send(JSON.stringify({
      type: 'error',
      data: { message: result.error }
    }));
  }
}

// Leave room
function handleLeaveRoom(ws) {
  const result = roomManager.leaveRoom(ws);
  
  if (result.code) {
    clientRooms.delete(ws);
    
    // Notify remaining players
    roomManager.broadcast(result.code, {
      type: 'player_left',
      data: { playerId: result.playerId }
    });
    
    // Clean up game state if needed
    if (result.roomClosed) {
      gameStates.delete(result.code);
    }
  }
}

// Handle disconnect
function handleDisconnect(ws) {
  const result = roomManager.leaveRoom(ws);
  
  if (result.code) {
    clientRooms.delete(ws);
    
    // Notify remaining players
    roomManager.broadcast(result.code, {
      type: 'player_left',
      data: { playerId: result.playerId }
    });
    
    // Clean up game state
    if (result.roomClosed) {
      gameStates.delete(result.code);
      
      // Stop game loop if this was the last room
      if (gameStates.size === 0) {
        stopGameLoop();
      }
    }
  }
  
  console.log('Client disconnected');
}

// Player ready
function handleReady(ws, data) {
  const code = clientRooms.get(ws);
  if (!code) return;
  
  // Find player ID
  let playerId = null;
  const room = roomManager.rooms.get(code);
  if (room) {
    for (const [id, player] of room.players) {
      if (player.ws === ws) {
        playerId = id;
        break;
      }
    }
  }
  
  if (playerId) {
    roomManager.setPlayerReady(code, playerId, data.ready);
    
    // Check if all ready
    if (roomManager.allReady(code)) {
      roomManager.broadcast(code, {
        type: 'all_ready',
        data: { canStart: true }
      });
    }
  }
}

// Start game
function handleStart(ws) {
  const code = clientRooms.get(ws);
  if (!code) return;
  
  const result = roomManager.startGame(code);
  
  if (result.success) {
    // Initialize game state
    const room = roomManager.rooms.get(code);
    const playerData = Array.from(room.players.values()).map(p => ({
      id: p.id,
      name: p.name,
      position: p.position,
      rotation: p.rotation,
      isGhost: p.isGhost,
      role: p.role
    }));
    
    const gameState = new GameState();
    gameState.initialize(code, playerData);
    gameStates.set(code, gameState);
    
    // Start game loop if not running
    startGameLoop();
    
    // Send game state to all players
    roomManager.broadcast(code, {
      type: 'game_start',
      data: gameState.serialize()
    });
    
    console.log(`Game started in room ${code}`);
  }
}

// Handle position updates
function handlePosition(ws, data) {
  const code = clientRooms.get(ws);
  if (!code) return;
  
  const gameState = gameStates.get(code);
  if (!gameState) return;
  
  // Find player ID
  let playerId = null;
  const room = roomManager.rooms.get(code);
  if (room) {
    for (const [id, player] of room.players) {
      if (player.ws === ws) {
        playerId = id;
        break;
      }
    }
  }
  
  if (playerId) {
    gameState.updatePlayer(playerId, data.position, data.rotation);
  }
}

// Handle chat messages
function handleChat(ws, data) {
  const code = clientRooms.get(ws);
  if (!code) return;
  
  // Find player name
  let playerName = 'Unknown';
  const room = roomManager.rooms.get(code);
  if (room) {
    for (const player of room.players.values()) {
      if (player.ws === ws) {
        playerName = player.name;
        break;
      }
    }
  }
  
  // Broadcast chat message
  roomManager.broadcast(code, {
    type: 'chat',
    data: {
      player: playerName,
      message: data.message,
      timestamp: Date.now()
    }
  }, ws);
}

// Ghost player starts hunt (speed boost)
function handleStartHunt(ws) {
  const code = clientRooms.get(ws);
  if (!code) return;
  
  const gameState = gameStates.get(code);
  if (!gameState) return;
  
  // Verify player is the ghost
  const room = roomManager.rooms.get(code);
  let playerId = null;
  if (room) {
    for (const [id, player] of room.players) {
      if (player.ws === ws) {
        playerId = id;
        break;
      }
    }
  }
  
  if (playerId && playerId === gameState.ghostPlayerId) {
    gameState.startHunt();
    roomManager.broadcast(code, {
      type: 'hunt_started',
      data: { timer: gameState.huntTimer }
    });
  }
}

// Ghost player ends hunt early
function handleEndHunt(ws) {
  const code = clientRooms.get(ws);
  if (!code) return;
  
  const gameState = gameStates.get(code);
  if (!gameState) return;
  
  // Verify player is the ghost
  const room = roomManager.rooms.get(code);
  let playerId = null;
  if (room) {
    for (const [id, player] of room.players) {
      if (player.ws === ws) {
        playerId = id;
        break;
      }
    }
  }
  
  if (playerId && playerId === gameState.ghostPlayerId) {
    gameState.endHunt();
    roomManager.broadcast(code, {
      type: 'hunt_ended',
      data: { cooldown: gameState.huntCooldown }
    });
  }
}

// Game loop
function startGameLoop() {
  if (gameInterval) return;
  
  console.log('Starting game loop (20Hz)');
  
  gameInterval = setInterval(() => {
    for (const [code, gameState] of gameStates) {
      if (!gameState.started) continue;
      
      // Update tick (handles hunt collision, timers, etc.)
      gameState.updateTick();
      
      // Broadcast game state to appropriate players
      const room = roomManager.rooms.get(code);
      if (!room) continue;
      
      for (const player of room.players.values()) {
        const state = player.id === gameState.ghostPlayerId 
          ? gameState.serializeForGhost(player.id)
          : gameState.serializeForSurvivor(player.id);
        
        try {
          player.ws.send(JSON.stringify({
            type: 'game_state',
            data: state
          }));
        } catch (e) {
          // Ignore send errors
        }
      }
    }
  }, TICK_RATE);
}

function stopGameLoop() {
  if (gameInterval) {
    clearInterval(gameInterval);
    gameInterval = null;
    console.log('Game loop stopped');
  }
}

// Start server
server.listen(PORT, () => {
  console.log(`SPECTRA WebSocket server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});