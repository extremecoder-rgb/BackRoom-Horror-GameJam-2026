import * as THREE from 'three';
import { FirstPersonControls } from './FirstPersonControls.js';
import { CollisionSystem } from './Collision.js';

/**
 * Player - Main player controller
 */
export class Player {
  constructor(camera, domElement, scene) {
    this.camera = camera;
    this.scene = scene;
    
    // Initialize controls
    this.controls = new FirstPersonControls(camera, domElement);
    this.collision = new CollisionSystem(scene);
    
    // Player state
    this.position = camera.position.clone();
    this.velocity = new THREE.Vector3();
    this.isGrounded = true;
    
    // Health/state
    this.sanity = 100;
    this.battery = 100;
    this.alive = true;
    
    // Callbacks
    this.onMove = null;
    this.onInteract = null;
    this.onDeath = null;
    
    this.setupInputHandlers();
  }
  
  /**
   * Setup input handlers
   */
  setupInputHandlers() {
    document.addEventListener('keydown', (e) => {
      if (!this.controls.isPointerLocked()) return;
      
      switch (e.code) {
        case 'KeyE':
          this.interact();
          break;
        case 'KeyF':
          // Handled by flashlight system
          window.dispatchEvent(new CustomEvent('toggleFlashlight'));
          break;
        case 'KeyT':
          window.dispatchEvent(new CustomEvent('toggleChat'));
          break;
        case 'Tab':
          e.preventDefault();
          window.dispatchEvent(new CustomEvent('toggleJournal'));
          break;
        case 'KeyG':
          window.dispatchEvent(new CustomEvent('showGuessModal'));
          break;
      }
    });
  }
  
  /**
   * Update each frame
   */
  update(deltaTime) {
    if (!this.alive) return;
    
    // Get movement from controls
    const desiredMovement = this.controls.update(deltaTime);
    
    if (desiredMovement && desiredMovement.length() > 0) {
      // Check collision
      const adjustedMovement = this.collision.checkMove(
        this.camera.position,
        desiredMovement
      );
      
      // Apply movement
      this.position.add(adjustedMovement);
      this.controls.applyMovement(adjustedMovement);
      
      // Notify network of position
      if (this.onMove) {
        this.onMove(this.camera.position, this.camera.rotation.y);
      }
    }
    
    // Update position reference
    this.position.copy(this.camera.position);
  }
  
  /**
   * Interact with nearby object
   */
  interact() {
    const direction = this.controls.getForwardVector();
    const obj = this.collision.canInteract(this.camera.position, direction, 2);
    
    if (obj && this.onInteract) {
      this.onInteract(obj);
    }
  }
  
  /**
   * Take damage (sanity loss)
   */
  takeSanityDamage(amount) {
    this.sanity = Math.max(0, this.sanity - amount);
    
    if (this.sanity <= 0) {
      this.die();
    }
  }
  
  /**
   * Die
   */
  die() {
    this.alive = false;
    this.controls.unlock();
    
    if (this.onDeath) {
      this.onDeath();
    }
  }
  
  /**
   * Get camera
   */
  getCamera() {
    return this.camera;
  }
  
  /**
   * Get controls
   */
  getControls() {
    return this.controls;
  }
  
  /**
   * Check if locked
   */
  isActive() {
    return this.controls.isPointerLocked();
  }
  
  /**
   * Lock pointer
   */
  lock() {
    this.controls.lock();
  }
}