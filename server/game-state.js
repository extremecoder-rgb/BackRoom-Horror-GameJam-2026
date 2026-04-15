import { v4 as uuidv4 } from 'uuid';

/**
 * Server-Authoritative Game State
 * Manages the game world, ghost player role, and synchronization
 * Ghost is played by a human player (PvP mode)
 */
class GameState {
  constructor() {
    this.tick = 0;
    this.players = new Map(); // id -> Player
    this.ghostPlayerId = null; // ID of player who is the ghost
    this.started = false;
    this.gameResult = null; // 'victory' | 'defeat'
    this.huntActive = false;
    this.huntTimer = 0;
    this.huntCooldown = 0;
    this.gracePeriod = 60; // 3 seconds grace period before catch is possible
  }
  
  /**
   * Initialize game for a room (PvP Ghost mode)
   */
  initialize(roomCode, playerData) {
    this.roomCode = roomCode;
    this.tick = 0;
    this.started = true;
    this.gameResult = null;
    this.huntActive = false;
    this.huntTimer = 0;
    this.huntCooldown = 0;
    
    // Set up players
    this.players.clear();
    const playerArray = Array.from(playerData);
    
    if (playerArray.length >= 1) {
      // Use pre-assigned roles if they exist, otherwise fallback to first player
      const ghostPlayer = playerArray.find(p => p.isGhost) || playerArray[0];
      this.ghostPlayerId = ghostPlayer.id;
      
      console.log(`>>> Ghost role assigned to: ${ghostPlayer.name} (ID: ${ghostPlayer.id})`);
    }
    
    for (const p of playerArray) {
      const isGhost = p.id === this.ghostPlayerId;
      // Ghost starts far from survivor (opposite corners)
      const startPos = isGhost 
        ? { x: -40, y: 1.6, z: -40 }  // Ghost in corner
        : { x: 40, y: 1.6, z: 40 }; // Survivor in opposite corner
      
      console.log(`[GameState] Player ${p.name} (${p.id}) isGhost=${isGhost}, starting at`, startPos);
      
      this.players.set(p.id, {
        id: p.id,
        name: p.name,
        role: isGhost ? 'ghost' : 'survivor',
        position: startPos,  // Force spawn positions far apart
        rotation: p.rotation || 0,
        alive: true,
        isGhost: isGhost
      });
    }
    
    console.log(`Game initialized for room ${roomCode} in PvP Ghost mode`);
  }
  
  /**
   * Get the player data for a specific ID
   */
  getPlayer(id) {
    return this.players.get(id);
  }
  
  /**
   * Update player position from client
   */
  updatePlayer(id, position, rotation) {
    const player = this.players.get(id);
    if (player && player.alive) {
      player.position = position;
      player.rotation = rotation;
    }
  }
  
  /**
   * Get the survivor (non-ghost player)
   */
  getSurvivor() {
    for (const player of this.players.values()) {
      if (!player.isGhost && player.alive) {
        return player;
      }
    }
    return null;
  }
  
  /**
   * Get the ghost player
   */
  getGhostPlayer() {
    for (const player of this.players.values()) {
      if (player.isGhost) {
        return player;
      }
    }
    return null;
  }
  
  /**
   * Update game state tick (called by server game loop)
   * This handles hunt mechanics - ghost player chases survivor
   */
  updateTick() {
    if (!this.started || this.gameResult) return;
    
    this.tick++;
    
    // Handle hunt cooldown
    if (this.huntCooldown > 0) {
      this.huntCooldown--;
      if (this.huntCooldown <= 0) {
        this.huntActive = false;
      }
      return;
    }
    
    // Ghost player can trigger hunt manually (handled by client input)
    // Check for collision between ghost and survivor
    const ghost = this.getGhostPlayer();
    const survivor = this.getSurvivor();
    
    // Grace period - can't catch immediately after game starts
    if (this.gracePeriod > 0) {
      this.gracePeriod--;
      return;
    }
    
    if (ghost && survivor && ghost.alive && survivor.alive) {
      const dx = ghost.position.x - survivor.position.x;
      const dz = ghost.position.z - survivor.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      
      // Ghost catches survivor on contact (distance < 1.2 units)
      if (dist < 1.2) {
        survivor.alive = false;
        this.gameResult = 'ghost_wins';
        console.log(`Ghost caught the survivor! Ghost wins!`);
      }
    }
  }
  
  /**
   * Ghost player starts a hunt (temporary speed boost)
   */
  startHunt() {
    if (this.huntActive || this.gameResult) return;
    
    const ghost = this.getGhostPlayer();
    if (ghost && ghost.alive) {
      this.huntActive = true;
      this.huntTimer = 10 * 20; // 10 seconds
      console.log(`Hunt started! Ghost has 10s of enhanced speed!`);
    }
  }
  
  /**
   * End hunt early
   */
  endHunt() {
    this.huntActive = false;
    this.huntCooldown = 15 * 20; // 15 second cooldown
    console.log(`Hunt ended. Cooldown: 15s`);
  }
  
  /**
   * Serialize state for broadcast to all players
   */
  serialize() {
    const ghost = this.getGhostPlayer();
    const survivor = this.getSurvivor();
    
    return {
      tick: this.tick,
      gracePeriod: this.gracePeriod,
      huntActive: this.huntActive,
      huntTimer: this.huntTimer,
      huntCooldown: this.huntCooldown,
      result: this.gameResult,
      players: Array.from(this.players.values()).map(p => ({
        id: p.id,
        name: p.name,
        role: p.role,
        isGhost: p.isGhost,
        position: p.position,
        rotation: p.rotation,
        alive: p.alive
      }))
    };
  }
  
  /**
   * Serialize state for ghost player (shows survivor position)
   */
  serializeForGhost(playerId) {
    const data = this.serialize();
    // Ghost sees everything
    return data;
  }
  
  /**
   * Serialize state for survivor (hides ghost position unless close)
   */
  serializeForSurvivor(playerId) {
    const ghost = this.getGhostPlayer();
    const survivor = this.getSurvivor();
    
    const players = Array.from(this.players.values()).map(p => {
      if (p.isGhost && survivor) {
        // Show ghost position only if close (within 8 units)
        const dx = ghost.position.x - survivor.position.x;
        const dz = ghost.position.z - survivor.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        
        if (dist > 8) {
          // Ghost is far - hide exact position
          return {
            id: p.id,
            name: p.name,
            role: 'unknown',
            isGhost: true,
            position: { x: 0, y: 0, z: 0 }, // Hidden
            rotation: 0,
            alive: p.alive,
            visible: false
          };
        }
      }
      
      return {
        id: p.id,
        name: p.name,
        role: p.role,
        isGhost: p.isGhost,
        position: p.position,
        rotation: p.rotation,
        alive: p.alive,
        visible: true
      };
    });
    
    return {
      tick: this.tick,
      gracePeriod: this.gracePeriod,
      huntActive: this.huntActive,
      huntTimer: this.huntTimer,
      huntCooldown: this.huntCooldown,
      result: this.gracePeriod > 0 ? null : this.gameResult,  // Don't send result during grace
      players: players
    };
  }
}

export default GameState;