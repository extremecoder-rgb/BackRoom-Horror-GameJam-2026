import * as THREE from 'three';

/**
 * Flashlight - Player flashlight with SpotLight
 */
export class Flashlight {
  constructor(camera) {
    this.camera = camera;
    this.isOn = false;
    this.battery = 100;
    this.batteryDrain = 0.5; // per second
    this.baseIntensity = 3;
    this.flickerIntensity = 0;
    this.flickerThreshold = 3; // Distance to ghost for flicker
    
    this.createLight();
  }
  
  /**
   * Create flashlight SpotLight
   */
  createLight() {
    // SpotLight for flashlight
    this.light = new THREE.SpotLight(0xffffee, 0, 15, Math.PI / 7, 0.3, 1);
    this.light.castShadow = true;
    this.light.shadow.mapSize.width = 1024;
    this.light.shadow.mapSize.height = 1024;
    this.light.shadow.camera.near = 0.1;
    this.light.shadow.camera.far = 15;
    
    // Add to camera (so it follows player's view)
    this.light.position.set(0.2, -0.1, 0);
    this.camera.add(this.light);
    
    // Target (pointed forward)
    this.target = new THREE.Object3D();
    this.target.position.set(0, 0, -5);
    this.camera.add(this.target);
    this.light.target = this.target;
  }
  
  /**
   * Toggle flashlight
   */
  toggle() {
    this.isOn = !this.isOn;
    this.light.intensity = this.isOn ? this.baseIntensity : 0;
    return this.isOn;
  }
  
  /**
   * Update each frame
   */
  update(deltaTime, ghostPosition = null) {
    if (!this.isOn) return;
    
    // Drain battery
    this.battery -= this.batteryDrain * deltaTime;
    
    if (this.battery <= 0) {
      this.battery = 0;
      this.isOn = false;
      this.light.intensity = 0;
      return;
    }
    
    // Check for flicker (ghost proximity)
    if (ghostPosition) {
      const dist = this.camera.position.distanceTo(ghostPosition);
      
      if (dist < this.flickerThreshold) {
        // Flicker effect
        const flicker = Math.random();
        this.light.intensity = flicker > 0.5 ? this.baseIntensity : 0;
      } else {
        this.light.intensity = this.baseIntensity;
      }
    }
  }
  
  /**
   * Get battery level
   */
  getBattery() {
    return this.battery;
  }
  
  /**
   * Check if on
   */
  isOn() {
    return this.isOn;
  }
  
  /**
   * Recharge battery
   */
  recharge(amount = 50) {
    this.battery = Math.min(100, this.battery + amount);
  }
}