import * as THREE from 'three';
import { GhostType, GhostEvidence, getRandomGhostType } from './types/GhostTypes.js';

/**
 * Ghost distortion shader
 */
const GhostShader = {
  uniforms: {
    time: { value: 0 },
    opacity: { value: 0.8 },
    distortionAmount: { value: 0.1 },
    flicker: { value: 0 }
  },
  vertexShader: `
    uniform float time;
    uniform float distortionAmount;
    varying vec2 vUv;
    varying float vDistortion;
    
    void main() {
      vUv = uv;
      
      // Vertex displacement for distortion
      vec3 pos = position;
      float wave = sin(pos.y * 5.0 + time * 2.0) * distortionAmount;
      wave += sin(pos.x * 3.0 + time * 1.5) * distortionAmount * 0.5;
      pos.x += wave;
      pos.z += wave * 0.5;
      
      vDistortion = wave;
      
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  fragmentShader: `
    uniform float time;
    uniform float opacity;
    uniform float flicker;
    varying vec2 vUv;
    varying float vDistortion;
    
    void main() {
      // Base ghost color (pale blue-white)
      vec3 color = vec3(0.8, 0.85, 0.95);
      
      // Add subtle variation
      float noise = sin(vUv.x * 20.0 + time) * 0.1;
      color += noise;
      
      // Edge fade
      float edge = 1.0 - smoothstep(0.3, 0.5, abs(vUv.x - 0.5));
      edge *= 1.0 - smoothstep(0.3, 0.5, abs(vUv.y - 0.5));
      
      // Apply flicker
      float alpha = opacity * edge * (1.0 - flicker * 0.5 * sin(time * 15.0));
      alpha = max(0.0, alpha);
      
      gl_FragColor = vec4(color, alpha);
    }
  `
};

/**
 * Ghost entity
 */
export class Ghost {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    
    // Ghost type
    this.type = getRandomGhostType();
    this.evidence = GhostEvidence[this.type];
    
    // State
    this.position = new THREE.Vector3(8, 5.6, 8);
    this.state = 'Idle';
    this.visible = false;
    this.targetPlayer = null;
    
    // Behavior timers
    this.stateTimer = 0;
    this.huntTimer = 0;
    
    // Create mesh
    this.createMesh();
    
    // Add to scene
    this.scene.add(this.group);
  }
  
  /**
   * Create ghost procedural mesh
   */
  createMesh() {
    // Body (elongated sphere)
    const bodyGeom = new THREE.SphereGeometry(0.4, 16, 16);
    bodyGeom.scale(1, 2.5, 1);
    
    this.bodyMaterial = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(GhostShader.uniforms),
      vertexShader: GhostShader.vertexShader,
      fragmentShader: GhostShader.fragmentShader,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    
    this.body = new THREE.Mesh(bodyGeom, this.bodyMaterial);
    this.group.add(this.body);
    
    // Head (smaller sphere)
    const headGeom = new THREE.SphereGeometry(0.25, 12, 12);
    const head = new THREE.Mesh(headGeom, this.bodyMaterial);
    head.position.y = 1.1;
    this.group.add(head);
    
    // Create eyes
    this.createEyes();
    
    // Create particle trail
    this.createParticles();
  }
  
  /**
   * Create glowing eyes
   */
  createEyes() {
    const eyeGeom = new THREE.SphereGeometry(0.03, 8, 8);
    const eyeMat = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      transparent: true,
      opacity: 0
    });
    
    this.leftEye = new THREE.Mesh(eyeGeom, eyeMat.clone());
    this.leftEye.position.set(-0.08, 1.15, 0.2);
    this.group.add(this.leftEye);
    
    this.rightEye = new THREE.Mesh(eyeGeom, eyeMat.clone());
    this.rightEye.position.set(0.08, 1.15, 0.2);
    this.group.add(this.rightEye);
  }
  
  /**
   * Create cold breath particles
   */
  createParticles() {
    const particleCount = 50;
    const positions = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 0.5;
      positions[i * 3 + 1] = Math.random() * 1.5;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 0.5;
    }
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const material = new THREE.PointsMaterial({
      color: 0xaaddff,
      size: 0.05,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    
    this.particles = new THREE.Points(geometry, material);
    this.group.add(this.particles);
  }
  
  /**
   * Update each frame
   */
  update(deltaTime, players = []) {
    this.stateTimer += deltaTime;
    
    // Update shader uniforms
    this.bodyMaterial.uniforms.time.value += deltaTime;
    
    // Update visibility (flickering when roaming/stalking)
    if (this.state === 'Roaming' || this.state === 'Stalking') {
      this.visible = Math.random() < 0.05; // Brief glimpses
      this.bodyMaterial.uniforms.opacity.value = this.visible ? 0.6 : 0;
      this.bodyMaterial.uniforms.flicker.value = this.visible ? 0.3 : 0;
    } else if (this.state === 'Hunting') {
      this.visible = true;
      this.bodyMaterial.uniforms.opacity.value = 0.8;
      this.bodyMaterial.uniforms.flicker.value = 0.1;
    } else if (this.state === 'PreHunt') {
      // Flicker intensifies
      this.bodyMaterial.uniforms.opacity.value = 0.4 + Math.sin(this.stateTimer * 10) * 0.3;
      this.bodyMaterial.uniforms.flicker.value = 0.5;
    } else if (this.state === 'Idle') {
      this.visible = false;
      this.bodyMaterial.uniforms.opacity.value = 0;
    }
    
    // Eye visibility
    this.leftEye.material.opacity = this.visible ? 0.9 : 0;
    this.rightEye.material.opacity = this.visible ? 0.9 : 0;
    
    // Particle update
    if (this.particles && this.visible) {
      const positions = this.particles.geometry.attributes.position.array;
      for (let i = 0; i < positions.length; i += 3) {
        positions[i + 1] += deltaTime * 0.5;
        if (positions[i + 1] > 1.5) {
          positions[i + 1] = 0;
          positions[i] = (Math.random() - 0.5) * 0.5;
          positions[i + 2] = (Math.random() - 0.5) * 0.5;
        }
      }
      this.particles.geometry.attributes.position.needsUpdate = true;
    }
    
    // State machine
    this.updateState(deltaTime, players);
    
    // Update position
    this.group.position.copy(this.position);
  }
  
  /**
   * Ghost state machine
   */
  updateState(deltaTime, players) {
    // Find alive player nearest to ghost
    let nearestPlayer = null;
    let nearestDist = Infinity;
    
    for (const player of players) {
      if (!player.alive) continue;
      const dist = this.position.distanceTo(player.position);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestPlayer = player;
      }
    }
    
    switch (this.state) {
      case 'Idle':
        // Random chance to start roaming
        if (Math.random() < 0.01) {
          this.state = 'Roaming';
          this.stateTimer = 0;
        }
        // Move to random position
        this.moveRandomly(deltaTime);
        break;
        
      case 'Roaming':
        this.moveRandomly(deltaTime);
        // Chance to stalk nearby player
        if (nearestPlayer && nearestDist < 10) {
          this.state = 'Stalking';
          this.stateTimer = 0;
        }
        // Return to idle
        if (this.stateTimer > 10 && Math.random() < 0.02) {
          this.state = 'Idle';
          this.stateTimer = 0;
        }
        break;
        
      case 'Stalking':
        // Follow player
        if (nearestPlayer) {
          this.moveToward(nearestPlayer.position, deltaTime * 0.3);
        }
        // Start hunt if sanity is low and unlucky
        if (nearestPlayer && nearestPlayer.sanity < 50 && Math.random() < 0.005) {
          this.state = 'PreHunt';
          this.stateTimer = 0;
          this.targetPlayer = nearestPlayer;
        }
        break;
        
      case 'PreHunt':
        // 5 second warning with flickering
        this.huntTimer += deltaTime;
        if (this.huntTimer >= 5) {
          this.state = 'Hunting';
          this.stateTimer = 0;
          this.huntTimer = 0;
        }
        break;
        
      case 'Hunting':
        // Chase target
        if (this.targetPlayer && this.targetPlayer.alive) {
          const speed = this.type === 'Revenant' ? 0.15 : 0.06;
          this.moveToward(this.targetPlayer.position, deltaTime * speed);
          
          // Check catch
          if (nearestDist < 0.8) {
            this.targetPlayer.alive = false;
            this.state = 'Cooldown';
            this.stateTimer = 0;
          }
        }
        // End hunt
        if (this.stateTimer > 15 || !this.targetPlayer?.alive) {
          this.state = 'Cooldown';
          this.stateTimer = 0;
        }
        break;
        
      case 'Cooldown':
        // 30 second recovery
        if (this.stateTimer > 30) {
          this.state = 'Idle';
          this.stateTimer = 0;
        }
        break;
    }
  }
  
  /**
   * Move toward target position
   */
  moveToward(target, speed) {
    const dir = target.clone().sub(this.position);
    dir.y = 0;
    if (dir.length() > 0.5) {
      dir.normalize().multiplyScalar(speed);
      this.position.add(dir);
    }
  }
  
  /**
   * Move randomly
   */
  moveRandomly(deltaTime) {
    if (!this.targetPos || Math.random() < 0.01) {
      this.targetPos = new THREE.Vector3(
        2 + Math.random() * 20,
        5.6,
        2 + Math.random() * 20
      );
    }
    this.moveToward(this.targetPos, deltaTime * 0.5);
  }
  
  /**
   * Get position
   */
  getPosition() {
    return this.position;
  }
  
  /**
   * Get state
   */
  getState() {
    return this.state;
  }
}