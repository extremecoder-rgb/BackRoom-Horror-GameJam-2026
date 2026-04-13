import * as THREE from 'three';

/**
 * SanitySystem - Player sanity with horror effects
 */
export class SanitySystem {
  constructor(player) {
    this.player = player;
    this.sanity = 100;
    this.maxSanity = 100;
    
    // Decay rates
    this.baseDecayRate = 0.5; // per second in darkness
    this.ghostDecayRate = 2; // per second near ghost
    this.lightRecoveryRate = 1; // per second in light
    
    // Thresholds
    this.hallucinationThreshold = 75; // Start seeing things
    this.distortionThreshold = 50; // Screen distortion
    this.glitchThreshold = 25; // Full glitch effects
    
    // Current state
    this.inDarkness = true;
    this.nearGhost = false;
    
    // Effects intensity (0-1)
    this.effectIntensity = 0;
  }
  
  /**
   * Update sanity each frame
   */
  update(deltaTime, ambientLight = 0.15, ghostPosition = null, isSprinting = false) {
    // Determine decay/recovery rate
    let rate = 0;
    
    // Check if in darkness
    this.inDarkness = ambientLight < 0.2;
    
    // Check if near ghost
    this.nearGhost = false;
    if (ghostPosition) {
      const dist = this.player.position.distanceTo(ghostPosition);
      this.nearGhost = dist < 5;
    }
    
    // Calculate rate
    if (this.inDarkness) {
      rate = -this.baseDecayRate;
    }
    
    if (this.nearGhost) {
      rate -= this.ghostDecayRate;
    }
    
    if (isSprinting) {
      rate -= 0.5; // Sprint drains sanity
    }
    
    // Apply rate
    this.sanity = Math.max(0, Math.min(this.maxSanity, this.sanity + rate * deltaTime));
    
    // Calculate effect intensity
    this.calculateEffectIntensity();
    
    return this.sanity;
  }
  
  /**
   * Calculate visual effect intensity based on sanity
   */
  calculateEffectIntensity() {
    if (this.sanity >= this.glitchThreshold) {
      this.effectIntensity = 0;
    } else if (this.sanity >= this.distortionThreshold) {
      this.effectIntensity = (this.distortionThreshold - this.sanity) / (this.distortionThreshold - this.glitchThreshold) * 0.3;
    } else if (this.sanity >= this.hallucinationThreshold) {
      this.effectIntensity = (this.hallucinationThreshold - this.sanity) / (this.hallucinationThreshold - this.distortionThreshold) * 0.6;
    } else {
      this.effectIntensity = 1.0;
    }
  }
  
  /**
   * Get sanity level
   */
  getSanity() {
    return this.sanity;
  }
  
  /**
   * Check if sanity is low enough for effects
   */
  hasEffects() {
    return this.effectIntensity > 0;
  }
  
  /**
   * Get effect intensity
   */
  getEffectIntensity() {
    return this.effectIntensity;
  }
  
  /**
   * Take sanity damage (from ghost, events)
   */
  takeDamage(amount) {
    this.sanity = Math.max(0, this.sanity - amount);
    this.calculateEffectIntensity();
  }
  
  /**
   * Recover sanity
   */
  recover(amount) {
    this.sanity = Math.min(this.maxSanity, this.sanity + amount);
    this.calculateEffectIntensity();
  }
  
  /**
   * Get current state for effects rendering
   */
  getState() {
    return {
      sanity: this.sanity,
      effectIntensity: this.effectIntensity,
      hallucinating: this.sanity < this.hallucinationThreshold,
      distorting: this.sanity < this.distortionThreshold,
      glitching: this.sanity < this.glitchThreshold
    };
  }
}