import { v4 as uuidv4 } from 'uuid';

/**
 * Server-Authoritative Game State
 * Manages the game world, ghost, and synchronization
 */
class GameState {
  constructor() {
    this.tick = 0;
    this.players = new Map(); // id -> Player
    this.ghost = null;
    this.started = false;
    this.evidence = []; // Collected evidence
    this.ghostType = null;
    this.ghostRoom = null;
    this.gameResult = null; // 'victory' | 'defeat'
  }
  
  /**
   * Initialize game for a room
   */
  initialize(roomCode, playerData) {
    this.roomCode = roomCode;
    this.tick = 0;
    this.started = true;
    this.evidence = [];
    this.gameResult = null;
    
    // Set up players
    this.players.clear();
    for (const p of playerData) {
      this.players.set(p.id, {
        id: p.id,
        name: p.name,
        position: p.position || { x: 0, y: 1.6, z: 0 },
        rotation: p.rotation || 0,
        alive: true,
        sanity: 100,
        battery: 100,
        currentTool: null
      });
    }
    
    // Initialize ghost
    this.initializeGhost();
    
    console.log(`Game initialized for room ${roomCode}`);
  }
  
  /**
   * Initialize the ghost
   */
  initializeGhost() {
    // Random ghost type
    const ghostTypes = [
      'Phantom', 'Banshee', 'Revenant', 
      'Shade', 'Poltergeist', 'Wraith'
    ];
    this.ghostType = ghostTypes[Math.floor(Math.random() * ghostTypes.length)];
    
    // Ghost starting position (random room)
    const ghostRooms = [
      { x: -8, y: 1.6, z: -8 }, // Attic
      { x: 0, y: 1.6, z: -8 }, // Living room
      { x: 8, y: 1.6, z: 0 },  // Kitchen
      { x: 0, y: 1.6, z: 8 }   // Basement
    ];
    const startRoom = ghostRooms[Math.floor(Math.random() * ghostRooms.length)];
    
    this.ghost = {
      id: 'ghost',
      type: this.ghostType,
      position: { x: startRoom.x, y: startRoom.y, z: startRoom.z },
      targetPosition: { x: startRoom.x, y: startRoom.y, z: startRoom.z },
      state: 'Idle', // Idle, Roaming, Stalking, Interacting, PreHunt, Hunting, Fleeing, Cooldown
      visible: false,
      targetPlayer: null,
      huntTimer: 0,
      cooldownTimer: 0
    };
    
    this.ghostRoom = startRoom;
    
    console.log(`Ghost initialized: ${this.ghostType} at`, startRoom);
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
   * Update ghost behavior (server authoritative)
   */
  updateGhost() {
    if (!this.ghost || !this.started) return;
    
    // Ghost state machine
    switch (this.ghost.state) {
      case 'Idle':
        // Random chance to start roaming
        if (Math.random() < 0.02) {
          this.ghost.state = 'Roaming';
        }
        break;
        
      case 'Roaming':
        // Move towards random position
        this.moveGhostTowardRandom();
        // Chance to return to idle
        if (Math.random() < 0.05) {
          this.ghost.state = 'Idle';
        }
        break;
        
      case 'Stalking':
        // Follow isolated player
        const target = this.findIsolatedPlayer();
        if (target) {
          this.ghost.targetPlayer = target;
          this.moveGhostToward(target.position);
        }
        break;
        
      case 'PreHunt':
        // 5 second warning
        this.ghost.huntTimer++;
        if (this.ghost.huntTimer >= 5 * 20) { // 5 seconds at 20Hz
          this.ghost.state = 'Hunting';
          this.ghost.huntTimer = 0;
        }
        break;
        
      case 'Hunting':
        // Chase target player
        if (this.ghost.targetPlayer) {
          const player = this.players.get(this.ghost.targetPlayer);
          if (player && player.alive) {
            this.moveGhostToward(player.position);
          }
        }
        // Random chance to end hunt
        if (Math.random() < 0.01) {
          this.ghost.state = 'Cooldown';
          this.ghost.cooldownTimer = 0;
        }
        break;
        
      case 'Cooldown':
        // Post-hunt recovery
        this.ghost.cooldownTimer++;
        if (this.ghost.cooldownTimer >= 30 * 20) { // 30 seconds
          this.ghost.state = 'Idle';
          this.ghost.cooldownTimer = 0;
        }
        break;
        
      case 'Fleeing':
        // Ghost disappears when looked at
        this.ghost.state = 'Idle';
        break;
    }
    
    // Check for ghost catching player
    if (this.ghost.state === 'Hunting') {
      this.checkHuntCollision();
    }
    
    // Update ghost visibility for evidence
    this.updateGhostVisibility();
  }
  
  /**
   * Move ghost toward target position
   */
  moveGhostToward(target) {
    const dx = target.x - this.ghost.position.x;
    const dz = target.z - this.ghost.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    
    if (dist > 0.5) {
      const speed = this.ghost.state === 'Hunting' ? 0.1 : 0.02;
      this.ghost.position.x += (dx / dist) * speed;
      this.ghost.position.z += (dz / dist) * speed;
    }
  }
  
  /**
   * Move ghost toward random position
   */
  moveGhostTowardRandom() {
    if (!this.ghost.targetPosition || 
        Math.abs(this.ghost.position.x - this.ghost.targetPosition.x) < 1 &&
        Math.abs(this.ghost.position.z - this.ghost.targetPosition.z) < 1) {
      // New random position
      this.ghost.targetPosition = {
        x: -10 + Math.random() * 20,
        y: 1.6,
        z: -10 + Math.random() * 20
      };
    }
    this.moveGhostToward(this.ghost.targetPosition);
  }
  
  /**
   * Find isolated player for stalking
   */
  findIsolatedPlayer() {
    let isolated = null;
    let minDist = Infinity;
    
    for (const player of this.players.values()) {
      if (!player.alive) continue;
      
      // Check distance to other players
      let nearestDist = Infinity;
      for (const other of this.players.values()) {
        if (other.id === player.id || !other.alive) continue;
        
        const dx = player.position.x - other.position.x;
        const dz = player.position.z - other.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        nearestDist = Math.min(nearestDist, dist);
      }
      
      if (nearestDist > minDist) {
        minDist = nearestDist;
        isolated = player;
      }
    }
    
    return isolated;
  }
  
  /**
   * Check if ghost catches player during hunt
   */
  checkHuntCollision() {
    if (!this.ghost.targetPlayer) return;
    
    const player = this.players.get(this.ghost.targetPlayer);
    if (!player || !player.alive) return;
    
    const dx = this.ghost.position.x - player.position.x;
    const dz = this.ghost.position.z - player.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    
    if (dist < 1.0) {
      // Player caught!
      player.alive = false;
      player.sanity = 0;
      
      // Check for game over
      let aliveCount = 0;
      for (const p of this.players.values()) {
        if (p.alive) aliveCount++;
      }
      
      if (aliveCount === 0) {
        this.gameResult = 'defeat';
      }
    }
  }
  
  /**
   * Update ghost visibility for evidence spawning
   */
  updateGhostVisibility() {
    // Random flicker when roaming/stalking
    if (this.ghost.state === 'Roaming' || this.ghost.state === 'Stalking') {
      this.ghost.visible = Math.random() < 0.1;
    } else {
      this.ghost.visible = false;
    }
  }
  
  /**
   * Start hunt (called when conditions met)
   */
  startHunt() {
    if (this.ghost.state === 'Idle' || this.ghost.state === 'Roaming') {
      this.ghost.state = 'PreHunt';
      this.ghost.huntTimer = 0;
    }
  }
  
  /**
   * Add evidence
   */
  addEvidence(evidenceType) {
    if (!this.evidence.includes(evidenceType)) {
      this.evidence.push(evidenceType);
    }
  }
  
  /**
   * Check if evidence matches ghost type
   */
  checkVictory(guessedType) {
    if (guessedType === this.ghostType) {
      // Evidence collected must match
      const requiredEvidence = this.getEvidenceForType(this.ghostType);
      const hasEvidence = requiredEvidence.every(e => this.evidence.includes(e));
      
      if (hasEvidence) {
        this.gameResult = 'victory';
        return true;
      }
    }
    return false;
  }
  
  /**
   * Get required evidence for ghost type
   */
  getEvidenceForType(ghostType) {
    const evidenceMap = {
      'Phantom': ['EMF', 'Cold Spot', 'Ghost Orbs'],
      'Banshee': ['Cold Spot', 'Whispers', 'UV Prints'],
      'Revenant': ['EMF', 'Whispers', 'Ghost Writing'],
      'Shade': ['Cold Spot', 'Ghost Orbs', 'Ghost Writing'],
      'Poltergeist': ['UV Prints', 'Whispers', 'Ghost Orbs'],
      'Wraith': ['EMF', 'UV Prints', 'Cold Spot']
    };
    return evidenceMap[ghostType] || [];
  }
  
  /**
   * Serialize state for broadcast
   */
  serialize() {
    return {
      tick: this.tick,
      players: Array.from(this.players.values()).map(p => ({
        id: p.id,
        name: p.name,
        position: p.position,
        rotation: p.rotation,
        alive: p.alive,
        sanity: p.sanity,
        battery: p.battery
      })),
      ghost: this.ghost ? {
        position: this.ghost.position,
        state: this.ghost.state,
        visible: this.ghost.visible,
        type: this.ghostType
      } : null,
      evidence: this.evidence,
      result: this.gameResult
    };
  }
}

export default GameState;