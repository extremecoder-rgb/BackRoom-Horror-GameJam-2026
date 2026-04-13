import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

/**
 * FirstPersonControls - WASD movement with PointerLockControls
 */
export class FirstPersonControls {
  constructor(camera, domElement) {
    this.camera = camera;
    this.domElement = domElement;
    
    // Pointer lock controls
    this.controls = new PointerLockControls(camera, domElement);
    
    // Movement parameters
    this.velocity = new THREE.Vector3();
    this.direction = new THREE.Vector3();
    this.walkSpeed = 25;
    this.runSpeed = 50;
    this.friction = 4;
    this.speed = this.walkSpeed;
    
    // Key states
    this.keys = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      sprint: false
    };
    
    // State
    this.isLocked = false;
    this.isMoving = false;
    
    // Camera bob
    this.bobTime = 0;
    this.bobSpeed = 10;
    this.bobAmount = 0.06;
    this.baseHeight = 1.6;
    
    this.setupEventListeners();
  }
  
  /**
   * Setup keyboard events
   */
  setupEventListeners() {
    document.addEventListener('keydown', (e) => this.onKeyDown(e));
    document.addEventListener('keyup', (e) => this.onKeyUp(e));
    
    // Pointer lock events
    this.controls.addEventListener('lock', () => {
      this.isLocked = true;
    });
    this.controls.addEventListener('unlock', () => {
      this.isLocked = false;
    });
  }
  
  /**
   * Handle key down
   */
  onKeyDown(event) {
    switch (event.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.keys.forward = true;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.keys.left = true;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.keys.backward = true;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.keys.right = true;
        break;
      case 'ShiftLeft':
        this.keys.sprint = true;
        this.speed = this.runSpeed;
        break;
      case 'KeyF':
      case 'KeyT':
      case 'KeyE':
      case 'Tab':
      case 'KeyG':
        // Handled elsewhere
        break;
    }
  }
  
  /**
   * Handle key up
   */
  onKeyUp(event) {
    switch (event.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.keys.forward = false;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.keys.left = false;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.keys.backward = false;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.keys.right = false;
        break;
      case 'ShiftLeft':
        this.keys.sprint = false;
        this.speed = this.walkSpeed;
        break;
    }
  }
  
  /**
   * Lock pointer
   */
  lock() {
    this.controls.lock();
  }
  
  /**
   * Unlock pointer
   */
  unlock() {
    this.controls.unlock();
  }
  
  /**
   * Get forward direction (horizontal only)
   */
  getForwardVector() {
    const vector = new THREE.Vector3();
    this.camera.getWorldDirection(vector);
    vector.y = 0;
    vector.normalize();
    return vector;
  }
  
  /**
   * Get right direction
   */
  getRightVector() {
    const vector = new THREE.Vector3();
    this.camera.getWorldDirection(vector);
    vector.y = 0;
    vector.normalize();
    vector.cross(this.camera.up);
    return vector;
  }
  
  /**
   * Update movement
   */
  update(deltaTime) {
    if (!this.isLocked) {
      this.velocity.set(0, 0, 0);
      return;
    }
    
    // Check if moving
    this.isMoving = this.keys.forward || this.keys.backward || this.keys.left || this.keys.right;
    
    // Get movement directions
    const forward = this.getForwardVector();
    const right = this.getRightVector();
    
    // Clear direction
    this.direction.set(0, 0, 0);
    
    // Apply input
    if (this.keys.forward) this.direction.add(forward);
    if (this.keys.backward) this.direction.sub(forward);
    if (this.keys.right) this.direction.add(right);
    if (this.keys.left) this.direction.sub(right);
    
    // Normalize if diagonal
    if (this.direction.length() > 0) {
      this.direction.normalize();
    }
    
    // Apply acceleration
    if (this.isMoving) {
      // Accelerate in direction
      this.velocity.addScaledVector(this.direction, this.speed * deltaTime);
    }
    
    // Apply friction/damping
    const damping = Math.exp(-this.friction * deltaTime) - 1;
    this.velocity.addScaledVector(this.velocity, damping);
    
    // Clamp velocity
    const maxSpeed = this.speed;
    if (this.velocity.length() > maxSpeed * deltaTime) {
      this.velocity.setLength(maxSpeed * deltaTime);
    }
    
    // Update camera bob
    if (this.isMoving && this.isLocked) {
      this.bobTime += deltaTime * this.bobSpeed * (this.keys.sprint ? 1.5 : 1);
      const bobOffset = Math.sin(this.bobTime) * this.bobAmount;
      this.camera.position.y = this.baseHeight + bobOffset;
    } else {
      // Return to base height
      this.camera.position.y = this.baseHeight;
      this.bobTime = 0;
    }
    
    // Get movement delta for collision checking
    return this.velocity.clone();
  }
  
  /**
   * Apply approved movement
   */
  applyMovement(movement) {
    this.controls.moveRight(movement.x);
    this.controls.moveForward(-movement.z);
  }
  
  /**
   * Check if locked
   */
  isPointerLocked() {
    return this.isLocked;
  }
}