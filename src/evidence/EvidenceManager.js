import { GhostEvidence } from '../ghost/types/GhostTypes.js';

/**
 * Evidence Types
 */
export const EvidenceType = {
  EMF: 'EMF',
  COLD: 'Cold Spot',
  ORBS: 'Ghost Orbs',
  WHISPERS: 'Whispers',
  UV: 'UV Prints',
  WRITING: 'Ghost Writing'
};

/**
 * Evidence Manager - Manages evidence detection and spawning
 */
export class EvidenceManager {
  constructor(ghost) {
    this.ghost = ghost;
    this.collectedEvidence = new Set();
    this.possibleEvidence = new Set();
    
    // Evidence locations (randomly chosen when evidence spawns)
    this.evidenceLocations = [];
    
    // Spawn timers
    this.lastSpawnTime = 0;
    this.spawnInterval = 30; // Seconds between evidence spawns
  }
  
  /**
   * Update evidence detection
   */
  update(deltaTime, playerPosition) {
    const ghostPos = this.ghost.getPosition();
    const distance = playerPosition.distanceTo(ghostPos);
    const ghostState = this.ghost.getState();
    
    // Clear last detection
    const currentEvidence = new Set();
    
    // EMF - higher near ghost
    if (distance < 3) {
      const level = Math.ceil((3 - distance) * 2);
      if (level >= 3) currentEvidence.add(EvidenceType.EMF);
    }
    
    // Cold spot - near ghost
    if (distance < 4) {
      currentEvidence.add(EvidenceType.COLD);
    }
    
    // Ghost Orbs - when ghost is visible and idle/roaming
    if (ghostState === 'Roaming' || ghostState === 'Stalking') {
      currentEvidence.add(EvidenceType.ORBS);
    }
    
    // Whispers - near ghost during hunt
    if (distance < 5 && (ghostState === 'Stalking' || ghostState === 'PreHunt')) {
      currentEvidence.add(EvidenceType.WHISPERS);
    }
    
    // UV Prints - randomly in ghost room
    if (Math.random() < 0.01) {
      currentEvidence.add(EvidenceType.UV);
    }
    
    // Writing - place book in ghost room
    // (handled by book interaction)
    
    return currentEvidence;
  }
  
  /**
   * Collect evidence
   */
  collectEvidence(type) {
    if (this.collectedEvidence.has(type)) return false;
    
    this.collectedEvidence.add(type);
    console.log(`Evidence collected: ${type}`);
    
    return true;
  }
  
  /**
   * Get collected evidence
   */
  getCollectedEvidence() {
    return Array.from(this.collectedEvidence);
  }
  
  /**
   * Get possible ghost types from evidence
   */
  getPossibleGhostTypes() {
    const collected = this.getCollectedEvidence();
    
    if (collected.length === 0) {
      return Object.keys(GhostEvidence);
    }
    
    // Filter: keep ghosts that have ALL collected evidence
    return Object.entries(GhostEvidence)
      .filter(([_, required]) => 
        collected.every(e => required.includes(e))
      )
      .map(([type, _]) => type);
  }
  
  /**
   * Check if can make guess
   */
  canGuess() {
    return this.collectedEvidence.size >= 2;
  }
  
  /**
   * Check if guess is correct
   */
  checkGuess(ghostType) {
    const required = GhostEvidence[ghostType];
    if (!required) return false;
    
    // Need at least 2 matching evidence
    const matches = required.filter(e => this.collectedEvidence.has(e));
    return matches.length >= 2;
  }
  
  /**
   * Get evidence locations (for spawning)
   */
  getEvidenceLocations() {
    // Return list of locations based on ghost room
    const ghostPos = this.ghost.getPosition();
    return [
      { position: ghostPos.clone(), type: EvidenceType.EMF },
      { position: ghostPos.clone(), type: EvidenceType.COLD },
      { position: ghostPos.clone(), type: EvidenceType.UV }
    ];
  }
}