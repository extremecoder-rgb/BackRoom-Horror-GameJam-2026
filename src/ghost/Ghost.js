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
      // Base entity color (Bacteria/Wire stalker style - dark, sickly)
      vec3 color = vec3(0.05, 0.1, 0.05);
      
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
    
    // State - spawn near player (but invisible) so it can chase!
    this.position = new THREE.Vector3(20, 1.5, 20);
    this.state = 'Idle';
    this.visible = false;
    this.targetPlayer = null;
    this.roamTarget = new THREE.Vector3(-32, 1.5, 32);
    this.evidenceCount = 0;
    this.favoriteRoom = null;
    this.stateTimer = 0; // Give player a grace period
    
    // Behavior timers
    this.stateTimer = 0;
    this.huntTimer = 0;
    this.lastSoundTimer = 0;
    
    // Model state
    this.model = null;
    this.meshes = [];
    
    // Audio reference
    this.audioEngine = null;
    
    // Create mesh
    this.createMesh();
    
    // Add to scene
    this.scene.add(this.group);
  }
  
  /**
   * Set audio engine for sound effects
   */
  setAudio(audio) {
    this.audioEngine = audio;
  }
  
  /**
   * Create scary zombie-like ghost using basic geometry
   */
  createMesh() {
    // Main body - tall and thin like zombie
    const bodyGeo = new THREE.CylinderGeometry(0.3, 0.4, 1.8, 8);
    this.bodyMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x2a2a2a, // Dark gray/greenish skin
      roughness: 0.9,
      metalness: 0.1
    });
    this.body = new THREE.Mesh(bodyGeo, this.bodyMaterial);
    this.body.position.y = 0.9;
    this.group.add(this.body);
    this.meshes.push(this.body);
    
    // Head - slightly deformed
    const headGeo = new THREE.SphereGeometry(0.35, 8, 8);
    const headMat = new THREE.MeshStandardMaterial({ 
      color: 0x3a3a3a,
      roughness: 0.9
    });
    this.head = new THREE.Mesh(headGeo, headMat);
    this.head.position.y = 2.1;
    this.head.scale.set(1, 1.1, 1);
    this.group.add(this.head);
    this.meshes.push(this.head);
    
    // Eyes - glowing red (scary!)
    const eyeGeo = new THREE.SphereGeometry(0.08, 8, 8);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.12, 2.15, 0.3);
    this.group.add(leftEye);
    
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.12, 2.15, 0.3);
    this.group.add(rightEye);
    
    // Arms - long zombie arms
    const armGeo = new THREE.CylinderGeometry(0.08, 0.1, 1.2, 6);
    const armMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a });
    
    this.leftArm = new THREE.Mesh(armGeo, armMat);
    this.leftArm.position.set(-0.5, 1.3, 0);
    this.leftArm.rotation.z = 0.3;
    this.group.add(this.leftArm);
    
    this.rightArm = new THREE.Mesh(armGeo, armMat);
    this.rightArm.position.set(0.5, 1.3, 0);
    this.rightArm.rotation.z = -0.3;
    this.group.add(this.rightArm);
    
    // Legs
    const legGeo = new THREE.CylinderGeometry(0.12, 0.15, 1, 6);
    
    this.leftLeg = new THREE.Mesh(legGeo, armMat);
    this.leftLeg.position.set(-0.2, 0.5, 0);
    this.group.add(this.leftLeg);
    
    this.rightLeg = new THREE.Mesh(legGeo, armMat);
    this.rightLeg.position.set(0.2, 0.5, 0);
    this.group.add(this.rightLeg);
    
    // Particles for creepy effect
    this.createParticles();
  }
  
  /**
   * Animate zombie ghost limbs
   */
  animateLimbs(deltaTime, isRunning) {
    if (!this.body) return;
    
    // Zombie swaying animation
    const swaySpeed = isRunning ? 10 : 3;
    const swayAmount = isRunning ? 0.15 : 0.05;
    
    if (this.head) {
      this.head.rotation.z = Math.sin(Date.now() / 200) * swayAmount;
    }
    if (this.leftArm) {
      this.leftArm.rotation.x = Math.sin(Date.now() / 300) * swayAmount * 2;
    }
    if (this.rightArm) {
      this.rightArm.rotation.x = -Math.sin(Date.now() / 300) * swayAmount * 2;
    }
    if (this.leftLeg) {
      this.leftLeg.rotation.x = isRunning ? Math.sin(Date.now() / 100) * 0.3 : 0;
    }
    if (this.rightLeg) {
      this.rightLeg.rotation.x = isRunning ? -Math.sin(Date.now() / 100) * 0.3 : 0;
    }
  }

  createProceduralFallback() {
    // Body (elongated sphere)
    const bodyGeom = new THREE.SphereGeometry(0.4, 16, 16);
    bodyGeom.scale(1, 2.5, 1);
    this.body = new THREE.Mesh(bodyGeom, this.bodyMaterial);
    this.group.add(this.body);
    this.meshes.push(this.body);
  }
  
  /**
   * Create cold breath particles
   */
  createParticles() {
    // Reduced from 50 to 20 particles for performance
    const particleCount = 20;
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
    this.lastSoundTimer += deltaTime;
    
    // Animate zombie limbs
    const isRunning = this.state === 'Hunting' || this.state === 'Jumpscare';
    this.animateLimbs(deltaTime, isRunning);
    
    // Update shader uniforms (only if using procedural shader material)
    if (this.bodyMaterial && this.bodyMaterial.uniforms && this.bodyMaterial.uniforms.time) {
      this.bodyMaterial.uniforms.time.value += deltaTime;
    }
    
    // Play ghost sounds only during hunt (not while stalking!)
    if (this.audioEngine && this.state === 'Hunting' && this.stateTimer < 0.5) {
      this.audioEngine.playGhostScream();
    }
    
    // Update visibility based on state and distance to player
    let opacity = 0;
    let flickerValue = 0;
    
    // Calculate distance to player for visibility logic
    let distToPlayer = Infinity;
    if (players.length > 0) {
      distToPlayer = this.position.distanceTo(players[0].position);
    }

    if (this.state === 'Idle' || this.state === 'Cooldown') {
      this.visible = false;
      opacity = 0;
    } else if (this.state === 'Roaming') {
      // Brief glimpse when roaming
      this.visible = distToPlayer < 6 && Math.random() < 0.02;
      opacity = 0.2;
    } else if (this.state === 'Chasing') {
      // Visible and scary when chasing!
      this.visible = true;
      opacity = 0.9;
      flickerValue = 0.3;
    }

    // Update shader uniforms if using procedural material
    if (this.bodyMaterial && this.bodyMaterial.uniforms) {
      if (this.bodyMaterial.uniforms.opacity) {
        this.bodyMaterial.uniforms.opacity.value = opacity;
      }
      if (this.bodyMaterial.uniforms.flicker) {
        this.bodyMaterial.uniforms.flicker.value = flickerValue;
      }
    }

    // Apply opacity to model meshes
    this.meshes.forEach(m => {
        if (m.material) {
            m.material.opacity = opacity;
        }
    });
    
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
    
    // Update position with jitter if hunting, keep at ground level
    this.position.y = 1.5; // Always on ground level
    if (this.state === 'Hunting') {
      const jitter = (Math.random() - 0.5) * 0.05;
      this.group.position.set(
        this.position.x + jitter,
        this.position.y,
        this.position.z + jitter
      );
    } else {
      this.group.position.copy(this.position);
    }
    
    // Face the player when chasing
    if (players.length > 0 && this.state === 'Chasing') {
      this.group.lookAt(players[0].position.x, this.position.y, players[0].position.z);
      // If using GLB model, we might need to offset the rotation if it's facing sideways
      if (this.model) {
          this.model.rotation.y = Math.PI; // Adjust base orientation of GLB
      }
    }

    // Haunting logic: Randomly interact with nearby doors/gates
    if (this.state === 'Hunting' && Math.random() < 0.02) {
        this.triggerNearbyHaunts();
    }
    
    // Animate wires
    if (this.wiresGroup) {
        this.wiresGroup.children.forEach((w, i) => {
            w.rotation.x += Math.sin(this.stateTimer * 5 + i) * 0.05;
            w.rotation.z += Math.cos(this.stateTimer * 4 + i) * 0.05;
        });
    }
  }

  triggerNearbyHaunts() {
      // We'll need a way to access the 'gates' array from main.js or pass it in
      // For now, we'll emit an event or used a shared global if available
      if (window.gameGates) {
          window.gameGates.forEach(gate => {
              if (this.position.distanceTo(gate.position) < 10) {
                  if (Math.random() < 0.3) {
                      gate.rotation.y += (Math.random() < 0.5 ? 1 : -1) * Math.PI / 2;
                  }
              }
          });
      }
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
    
    // Subtle sanity drain when ghost is very close (but not hunting) - creates fear without being too harsh
    if (nearestPlayer && nearestDist < 3 && this.state !== 'Hunting' && this.state !== 'Jumpscare') {
      nearestPlayer.sanity -= deltaTime * 1;
    }
    
this.stateTimer += deltaTime;
    const gracePeriod = 5; // Start chasing after 5 seconds
    
    switch (this.state) {
      case 'Idle':
        this.visible = false;
        // Wait grace period, then directly chase!
        if (this.stateTimer > gracePeriod && nearestPlayer) {
          this.state = 'Chasing';
          this.stateTimer = 0;
        }
        break;

      case 'Chasing':
        // ALWAYS run after player!
        this.visible = true;
        if (nearestPlayer && nearestPlayer.alive) {
          // Chase speed: 7 m/s (player walk=8, can be outrun with SHIFT!)
          const chaseSpeed = 7.0;
          this.moveToward(nearestPlayer.position, chaseSpeed, deltaTime);
          
          // Sanity drain when ghost is near
          if (nearestPlayer.sanity && nearestDist < 5) {
            nearestPlayer.sanity -= deltaTime * 3;
          }
          
          // Catch player!
          if (nearestDist < 1.2) {
            nearestPlayer.alive = false;
            this.visible = true;
            if (this.onKill) this.onKill();
          }
        }
        
        // If player gets too far, briefly give up then restart
        if (!nearestPlayer || nearestDist > 40) {
          this.state = 'Idle';
          this.stateTimer = 0;
        }
        break;
        
      case 'Roaming':
        this.visible = false;
        this.moveRandomly(3.0, deltaTime);
        if (nearestPlayer && nearestDist < 15) {
          this.state = 'Stalking';
          this.stateTimer = 0;
        }
        break;

      case 'Stalking':
        // Follow player slowly (1.8 m/s - almost walk speed)
        if (nearestPlayer) {
          this.moveToward(nearestPlayer.position, 1.8, deltaTime);
        }
        // Start hunt if: very close (< 3m) 
        if (nearestPlayer && nearestDist < 3) {
          this.state = 'PreHunt';
          this.stateTimer = 0;
          this.targetPlayer = nearestPlayer;
        }
        // Keep following until very far
        if (!nearestPlayer || nearestDist > 35) {
          this.state = 'Idle';
          this.stateTimer = 0;
        }
        break;
        
      case 'PreHunt':
        // 4 second warning with heavy flickering (SCARY!)
        this.visible = true;
        this.huntTimer += deltaTime;
        if (this.huntTimer >= 4) {
          this.state = 'Hunting';
          this.stateTimer = 0;
          this.huntTimer = 0;
        }
        break;
        
      case 'Hunting':
        this.visible = true;
        // Chase at walking pace (player walk=8, can outrun with SHIFT sprint=14!)
        if (this.targetPlayer && this.targetPlayer.alive) {
          const ghostSpeed = 7.0; // Slower than player walk 8, can outrun!
          this.moveToward(this.targetPlayer.position, ghostSpeed, deltaTime);
          
          // Heavy sanity drain during hunt
          if (this.targetPlayer.sanity) {
            this.targetPlayer.sanity -= deltaTime * 4;
          }
          
          // Check catch
          const distToTarget = this.position.distanceTo(this.targetPlayer.position);
          if (distToTarget < 1.2) {
            this.targetPlayer.alive = false;
            this.state = 'Jumpscare';
            this.stateTimer = 0;
            if (this.onKill) this.onKill();
          }
        }
        // End hunt after 25 seconds
        if (this.stateTimer > 20 || !this.targetPlayer?.alive) {
          this.state = 'Cooldown';
          this.stateTimer = 0;
        }
        break;
        
      case 'Jumpscare':
        // Sudden close-up - fast rush effect
        this.visible = true;
        if (this.bodyMaterial && this.bodyMaterial.uniforms) {
          if (this.bodyMaterial.uniforms.opacity) this.bodyMaterial.uniforms.opacity.value = 1.0;
          if (this.bodyMaterial.uniforms.flicker) this.bodyMaterial.uniforms.flicker.value = 1.0;
        }
        // Fast rush toward player
        if (this.targetPlayer?.alive) {
          this.moveToward(this.targetPlayer.position, 12, deltaTime);
        }
        if (this.stateTimer > 2) {
          this.state = 'Cooldown';
          this.stateTimer = 0;
        }
        break;
        
      case 'Cooldown':
        this.visible = false;
        // 15 second recovery
        if (this.stateTimer > 15) {
          this.state = 'Roaming';
          this.stateTimer = 0;
        }
        break;
    }
  }
  
  /**
   * Move toward target position
   * @param {Vector3} target - Target position
   * @param {number} speed - Speed in units per second
   * @param {number} deltaTime - Time since last frame
   */
  moveToward(target, speed, deltaTime) {
    const dir = target.clone().sub(this.position);
    dir.y = 0;
    const distance = dir.length();
    if (distance > 0.1) {
      dir.normalize();
      this.position.add(dir.multiplyScalar(speed * deltaTime));
    }
  }
  
  /**
   * Move randomly
   */
  moveRandomly(speed, deltaTime) {
    const driftSpeed = speed || 3.0;
    
    // Choose new target if reached
    if (this.position.distanceTo(this.roamTarget) < 2.0) {
      this.roamTarget.set(
        (Math.random() - 0.5) * 80,
        1.5,
        (Math.random() - 0.5) * 80
      );
    }
    
    this.moveToward(this.roamTarget, driftSpeed, deltaTime);
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