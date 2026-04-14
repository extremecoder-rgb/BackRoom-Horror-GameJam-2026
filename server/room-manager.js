import { v4 as uuidv4 } from 'uuid';

/**
 * Room Manager - Handles room creation, joining, and player management
 */
class RoomManager {
  constructor() {
    this.rooms = new Map(); // code -> Room
  }
  
  /**
   * Generate a unique 6-digit room code
   */
  generateCode() {
    let code;
    do {
      code = Math.floor(100000 + Math.random() * 900000).toString();
    } while (this.rooms.has(code));
    return code;
  }
  
  /**
   * Create a new room
   */
  createRoom(hostWs, hostName = 'Host') {
    const code = this.generateCode();
    const room = {
      code,
      host: null, // Host player
      players: new Map(), // id -> {id, name, ws, ready, position}
      gameState: null,
      started: false,
      createdAt: Date.now()
    };
    
    // Create host player
    const hostPlayer = {
      id: uuidv4(),
      name: hostName,
      ws: hostWs,
      ready: false,
      position: { x: 0, y: 1.6, z: 0 },
      rotation: 0
    };
    
    room.host = hostPlayer;
    room.players.set(hostPlayer.id, hostPlayer);
    this.rooms.set(code, room);
    
    console.log(`Room created: ${code} by ${hostName}`);
    
    return { code, playerId: hostPlayer.id, room };
  }
  
  /**
   * Join an existing room
   */
  joinRoom(ws, code, playerName = 'Player') {
    const room = this.rooms.get(code);
    
    if (!room) {
      return { success: false, error: 'Room not found' };
    }
    
    if (room.players.size >= 4) {
      return { success: false, error: 'Room is full' };
    }
    
    if (room.started) {
      return { success: false, error: 'Game already started' };
    }
    
    const player = {
      id: uuidv4(),
      name: playerName,
      ws: ws,
      ready: false,
      position: { x: 0, y: 1.6, z: 0 },
      rotation: 0
    };
    
    room.players.set(player.id, player);
    
    console.log(`Player ${playerName} joined room ${code}`);
    
    return { success: true, code, playerId: player.id, room };
  }
  
  /**
   * Leave a room
   */
  leaveRoom(ws) {
    for (const [code, room] of this.rooms) {
      for (const [playerId, player] of room.players) {
        if (player.ws === ws) {
          room.players.delete(playerId);
          
          // If host left, close room
          if (room.host && playerId === room.host.id) {
            this.closeRoom(code);
            return { code, playerId, roomClosed: true };
          }
          
          // If room empty, delete it
          if (room.players.size === 0) {
            this.rooms.delete(code);
            return { code, playerId, roomClosed: true };
          }
          
          console.log(`Player ${player.name} left room ${code}`);
          
          return { code, playerId, roomClosed: false };
        }
      }
    }
    
    return { code: null, playerId: null, roomClosed: false };
  }
  
  /**
   * Close a room
   */
  closeRoom(code) {
    const room = this.rooms.get(code);
    if (room) {
      // Notify all players
      for (const player of room.players.values()) {
        try {
          player.ws.send(JSON.stringify({
            type: 'room_closed',
            data: { reason: 'Host left the room' }
          }));
        } catch (e) {
          // Ignore send errors
        }
      }
      
      this.rooms.delete(code);
      console.log(`Room closed: ${code}`);
    }
  }
  
  /**
   * Broadcast message to all players in a room
   */
  broadcast(code, message, excludeWs = null) {
    const room = this.rooms.get(code);
    if (!room) return;
    
    const msgString = typeof message === 'string' 
      ? message 
      : JSON.stringify(message);
    
    for (const player of room.players.values()) {
      if (player.ws !== excludeWs) {
        try {
          player.ws.send(msgString);
        } catch (e) {
          console.error('Broadcast error:', e);
        }
      }
    }
  }
  
  /**
   * Get room state for lobby display
   */
  getRoomState(code) {
    const room = this.rooms.get(code);
    if (!room) return null;
    
    return {
      code: room.code,
      players: Array.from(room.players.values()).map(p => ({
        id: p.id,
        name: p.name,
        ready: p.ready,
        isHost: room.host && p.id === room.host.id
      })),
      started: room.started,
      playerCount: room.players.size
    };
  }
  
  /**
   * Set player ready status
   */
  setPlayerReady(code, playerId, ready) {
    const room = this.rooms.get(code);
    if (!room) return null;
    
    const player = room.players.get(playerId);
    if (!player) return null;
    
    player.ready = ready;
    
    console.log(`Player ready: ${player.name} = ${ready} for room ${code}`);
    
    // Broadcast ready status
    this.broadcast(code, {
      type: 'player_ready',
      data: { playerId, name: player.name, ready }
    });
    
    return player;
  }
  
  /**
   * Check if all players are ready
   */
  allReady(code) {
    const room = this.rooms.get(code);
    if (!room) return false;
    
    if (room.players.size < 1) return false;
    
    for (const player of room.players.values()) {
      if (!player.ready) return false;
    }
    
    return true;
  }
  
  /**
   * Start game in a room
   */
  startGame(code) {
    const room = this.rooms.get(code);
    if (!room) return { success: false, error: 'Room not found' };
    
    if (!this.allReady(code)) {
      return { success: false, error: 'Not all players ready' };
    }
    
    room.started = true;
    
    // Broadcast game start
    this.broadcast(code, {
      type: 'game_start',
      data: {
        roomCode: code,
        players: Array.from(room.players.values()).map(p => ({
          id: p.id,
          name: p.name,
          position: p.position,
          rotation: p.rotation
        }))
      }
    });
    
    console.log(`Game started in room ${code}`);
    
    return { success: true, room };
  }
  
  /**
   * Update player position
   */
  updatePlayerPosition(code, playerId, position, rotation) {
    const room = this.rooms.get(code);
    if (!room) return;
    
    const player = room.players.get(playerId);
    if (player) {
      player.position = position;
      player.rotation = rotation;
    }
  }
  
  /**
   * Get all rooms (for debugging)
   */
  getAllRooms() {
    return Array.from(this.rooms.keys());
  }
}

export default RoomManager;