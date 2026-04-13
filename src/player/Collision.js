import * as THREE from 'three';

/**
 * CollisionSystem - Raycaster-based collision detection
 */
export class CollisionSystem {
  constructor(scene) {
    this.scene = scene;
    this.raycaster = new THREE.Raycaster();
    this.colliders = [];
    
    // Collision parameters
    this.playerHeight = 1.6;
    this.playerRadius = 0.3;
    
    // Directions to check
    this.directions = [
      new THREE.Vector3(1, 0, 0),    // Forward
      new THREE.Vector3(-1, 0, 0),   // Backward
      new THREE.Vector3(0, 0, 1),    // Left
      new THREE.Vector3(0, 0, -1),   // Right
      new THREE.Vector3(0.7, 0, 0.7), // Forward-right
      new THREE.Vector3(-0.7, 0, 0.7), // Forward-left
      new THREE.Vector3(0.7, 0, -0.7), // Backward-right
      new THREE.Vector3(-0.7, 0, -0.7) // Backward-left
    ];
  }
  
  /**
   * Update collision geometry (call after map generation)
   */
  updateColliders() {
    this.colliders = [];
    
    // Find all walls and furniture
    this.scene.traverse((object) => {
      if (object.isMesh && object.userData.collidable !== false) {
        // Check if it's a wall/floor (not player, ghost, etc)
        const name = object.userData.name || '';
        if (name.includes('wall') || name.includes('Door') || name.includes('furniture')) {
          this.colliders.push(object);
        }
      }
    });
  }
  
  /**
   * Check collision at position
   */
  checkCollision(position, direction, distance = 0.5) {
    this.raycaster.set(position, direction.clone().normalize());
    this.raycaster.far = distance;
    
    const intersects = this.raycaster.intersectObjects(this.colliders);
    
    if (intersects.length > 0 && intersects[0].distance < distance) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Check collision on move, return adjusted movement
   */
  checkMove(currentPosition, desiredMovement, colliders = null) {
    const targets = colliders || this.colliders;
    if (targets.length === 0) return desiredMovement;
    
    // Try each component separately for sliding
    const result = desiredMovement.clone();
    
    // Check X movement
    if (desiredMovement.x !== 0) {
      const testPos = currentPosition.clone();
      testPos.y = this.playerHeight / 2;
      const testDir = new THREE.Vector3(Math.sign(desiredMovement.x), 0, 0);
      
      this.raycaster.set(testPos, testDir);
      this.raycaster.far = Math.abs(desiredMovement.x) + this.playerRadius;
      
      const intersects = this.raycaster.intersectObjects(targets);
      if (intersects.length > 0 && intersects[0].distance < this.playerRadius + 0.1) {
        result.x = 0;
      }
    }
    
    // Check Z movement
    if (desiredMovement.z !== 0) {
      const testPos = currentPosition.clone();
      testPos.y = this.playerHeight / 2;
      const testDir = new THREE.Vector3(0, 0, Math.sign(desiredMovement.z));
      
      this.raycaster.set(testPos, testDir);
      this.raycaster.far = Math.abs(desiredMovement.z) + this.playerRadius;
      
      const intersects = this.raycaster.intersectObjects(targets);
      if (intersects.length > 0 && intersects[0].distance < this.playerRadius + 0.1) {
        result.z = 0;
      }
    }
    
    return result;
  }
  
  /**
   * Check if can interact with object
   */
  canInteract(position, direction, maxDistance = 2) {
    this.raycaster.set(position, direction.normalize());
    this.raycaster.far = maxDistance;
    
    const intersects = this.raycaster.intersectObjects(this.colliders);
    
    if (intersects.length > 0 && intersects[0].distance < maxDistance) {
      return intersects[0].object;
    }
    
    return null;
  }
}