import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { GhostType, GhostEvidence, getRandomGhostType } from './types/GhostTypes.js';

// --- GHOST HORROR MATERIAL ---
const GhostMaterial = {
  create(originalTexture = null) {
    return new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      uniforms: {
        time: { value: 0 },
        opacity: { value: 0.9 },
        distortion: { value: 0.1 },
        glowColor: { value: new THREE.Color(0.2, 0.0, 0.0) },
        tDiffuse: { value: originalTexture },
        hasTexture: { value: originalTexture ? 1.0 : 0.0 }
      },
      vertexShader: `
        uniform float time;
        uniform float distortion;
        varying vec2 vUv;
        varying vec3 vNormal;
        
        void main() {
          vUv = uv;
          vNormal = normalize(normalMatrix * normal);
          
          vec3 pos = position;
          // Glitchy vertex displacement
          float noise = sin(pos.y * 10.0 + time * 5.0) * cos(pos.x * 10.0 + time * 3.0);
          pos += normal * noise * distortion;
          
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform float opacity;
        uniform vec3 glowColor;
        uniform sampler2D tDiffuse;
        uniform float hasTexture;
        varying vec2 vUv;
        varying vec3 vNormal;
        
        void main() {
          vec4 texColor = hasTexture > 0.5 ? texture2D(tDiffuse, vUv) : vec4(0.1, 0.1, 0.1, 1.0);
          
          // Fresnel rim lighting
          float rim = 1.0 - max(0.0, dot(vNormal, vec3(0.0, 0.0, 1.0)));
          rim = pow(rim, 3.0);
          
          // Glitch scanlines
          float scanline = step(0.95, sin(vUv.y * 100.0 - time * 10.0)) * 0.2;
          
          vec3 finalColor = texColor.rgb * 0.5 + glowColor * rim * 2.0;
          finalColor += vec3(scanline);
          
          float alpha = opacity * (0.6 + rim * 0.4);
          // Flicker-out
          if (sin(time * 30.0) > 0.98) alpha *= 0.1;
          
          gl_FragColor = vec4(finalColor, alpha);
        }
      `
    });
  }
};

export class Ghost {
  constructor(scene, collisionWalls = []) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.collisionWalls = collisionWalls;
    
    // Ghost identity
    this.type = getRandomGhostType();
    this.evidence = GhostEvidence[this.type];
    
    // Position & movement
    this.position = new THREE.Vector3(20, 0, 20);
    this.velocity = new THREE.Vector3();
    this.roamTarget = new THREE.Vector3();
    this.lastPosition = new THREE.Vector3();
    this.smoothPosition = new THREE.Vector3(20, 0, 20);
    
    // Player tracking for prediction
    this.playerVelocity = new THREE.Vector3();
    this.lastPlayerPos = new THREE.Vector3();
    this.predictedPlayerPos = new THREE.Vector3();
    
    // State machine
    this.state = 'Dormant';
    this.prevState = 'Dormant';
    this.stateTimer = 0;
    this.huntTimer = 0;
    this.totalTime = 0;
    
    // Target
    this.targetPlayer = null;
    this.lastKnownPlayerPos = new THREE.Vector3();
    this.canSeePlayer = false;
    this.distToPlayer = Infinity;
    
    // Aggression
    this.aggression = 0;
    this.huntCount = 0;
    this.killCount = 0;
    
    // Visuals
    this.model = null;
    this.mixer = null;
    this.animations = {};
    this.currentAction = null;
    this.meshes = [];
    this.ghostMaterials = [];
    this.originalMaterials = new Map();
    
    // Effects
    this.auraLight = null;
    this.eyeLights = [];
    this.trailPoints = [];
    
    // Audio
    this.audioEngine = null;
    this.lastSoundTime = 0;
    this.chaseAudioStarted = false;
    
    this.losRaycaster = new THREE.Raycaster();
    this.losRaycaster.far = 60;
    
    this.loadMonsterModel();
    this.createMonsterEffects();
    
    this.scene.add(this.group);
    this.group.visible = false;
    this.pickRoamTarget();
  }
  
  setAudio(audio) { this.audioEngine = audio; }
  setCollisionWalls(walls) { this.collisionWalls = walls; }
  
  async loadMonsterModel() {
    const loader = new GLTFLoader();
    
    try {
      console.log('🔥 Loading Elite Monster model...');
      const gltf = await loader.loadAsync('/a_monster_for_animation.glb');
      this.model = gltf.scene;
      
      // HEIGHT INCREASE: Make it 3.2 meters tall (ceiling-scraping horror)
      const box = new THREE.Box3().setFromObject(this.model);
      const size = new THREE.Vector3();
      box.getSize(size);
      const targetHeight = 3.2; 
      const scale = targetHeight / (size.y || 1);
      
      this.model.scale.set(scale, scale, scale);
      this.model.position.y = 0;
      
      // Animations
      if (gltf.animations && gltf.animations.length > 0) {
        this.mixer = new THREE.AnimationMixer(this.model);
        gltf.animations.forEach(clip => {
          const name = clip.name.toLowerCase();
          this.animations[name] = this.mixer.clipAction(clip);
        });
        this.playAnimation('idle');
      }
      
      // APPLY GHOST SHADER
      this.model.traverse(child => {
        if (child.isMesh) {
          this.meshes.push(child);
          this.originalMaterials.set(child, child.material);
          
          // Create custom horror material with original texture if present
          const ghostMat = GhostMaterial.create(child.material ? child.material.map : null);
          child.material = ghostMat;
          this.ghostMaterials.push(ghostMat);
          
          child.castShadow = true;
          child.visible = true;
        }
      });
      
      this.group.add(this.model);
      console.log('✅ Monster Entity Ready At Height:', targetHeight);
      
    } catch (e) {
      console.warn('❌ Monster GLB failed. Falling back to procedural.', e);
      this.createProceduralMonster();
    }
  }
  
  // ═══════════════════════════════════════════════════════
  //  ANIMATION SYSTEM
  // ═══════════════════════════════════════════════════════
  
  playAnimation(name, fadeTime = 0.3) {
    let action = this.animations[name];
    if (!action) {
      for (const [key, act] of Object.entries(this.animations)) {
        if (key.includes(name)) { action = act; break; }
      }
    }
    if (!action && Object.keys(this.animations).length > 0) {
      action = Object.values(this.animations)[0];
    }
    
    if (!action) return;
    if (this.currentAction === action) return;
    
    if (this.currentAction) this.currentAction.fadeOut(fadeTime);
    action.reset().fadeIn(fadeTime).play();
    this.currentAction = action;
  }
  
  setAnimationSpeed(speed) {
    if (this.currentAction) this.currentAction.timeScale = speed;
  }
  
  createProceduralMonster() {
    const darkMat = new THREE.MeshStandardMaterial({
      color: 0x222222,
      emissive: 0x331111,
      emissiveIntensity: 0.8,
      roughness: 0.8,
      side: THREE.DoubleSide
    });
    
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.4, 3.0, 6), darkMat);
    body.position.y = 1.5;
    this.group.add(body);
    
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 8), darkMat);
    head.position.y = 3.2;
    this.group.add(head);
    
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), eyeMat);
    eyeL.position.set(-0.15, 3.3, 0.35);
    this.group.add(eyeL);
    
    const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), eyeMat);
    eyeR.position.set(0.15, 3.3, 0.35);
    this.group.add(eyeR);
    
    this.eyeLights = [eyeL, eyeR];
    
    // Spindly limbs for the fallback
    const leftArm = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2, 4), darkMat);
    leftArm.position.set(-0.5, 2, 0);
    this.group.add(leftArm);
    const rightArm = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2, 4), darkMat);
    rightArm.position.set(0.5, 2, 0);
    this.group.add(rightArm);
    
    this._proceduralParts = { body, head, leftEye: eyeL, rightEye: eyeR, leftArm, rightArm };
  }
  
  // ═══════════════════════════════════════════════════════
  //  MONSTER EFFECTS — Aura, lights, particles
  // ═══════════════════════════════════════════════════════
  
  createMonsterEffects() {
    // Eerie red aura light
    this.auraLight = new THREE.PointLight(0xff1100, 0, 12);
    this.auraLight.position.y = 1.5;
    this.group.add(this.auraLight);
    
    // Cold blue particles around the monster
    const count = 30;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 2;
      positions[i * 3 + 1] = Math.random() * 3;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 2;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xff3300,
      size: 0.05,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.particles = new THREE.Points(geo, mat);
    this.group.add(this.particles);
    
    // Trail system
    this.trailGeo = new THREE.BufferGeometry();
    const trailPos = new Float32Array(30 * 3);
    this.trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPos, 3));
    const trailMat = new THREE.PointsMaterial({
      color: 0x330000,
      size: 0.12,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.trail = new THREE.Points(this.trailGeo, trailMat);
    this.scene.add(this.trail);
  }
  
  // ═══════════════════════════════════════════════════════
  //  LINE OF SIGHT — Can the monster see the player?
  // ═══════════════════════════════════════════════════════
  
  checkLineOfSight(playerPos) {
    if (!playerPos) return false;
    
    const ghostEye = this.position.clone();
    ghostEye.y = 1.5;
    const playerEye = playerPos.clone();
    playerEye.y = 1.7;
    
    const dir = playerEye.clone().sub(ghostEye).normalize();
    const dist = ghostEye.distanceTo(playerEye);
    
    this.losRaycaster.set(ghostEye, dir);
    this.losRaycaster.far = dist;
    
    if (this.collisionWalls.length === 0) return dist < 50;
    
    const meshes = this.collisionWalls.map(w => w.mesh || w);
    const intersects = this.losRaycaster.intersectObjects(meshes, false);
    return intersects.length === 0;
  }
  
  // ═══════════════════════════════════════════════════════
  //  PATHFINDING — Weighted pursuit with wall avoidance
  //  Uses multi-ray steering to navigate corridors
  // ═══════════════════════════════════════════════════════
  
  getSteeringDirection(targetPos) {
    const dir = targetPos.clone().sub(this.position);
    dir.y = 0;
    if (dir.lengthSq() < 0.01) return new THREE.Vector3();
    dir.normalize();
    
    const meshes = this.collisionWalls.map(w => w.mesh || w);
    if (meshes.length === 0) return dir;
    
    const checkDist = 2.5;
    const ghostEye = this.position.clone();
    ghostEye.y = 1.0;
    
    // Cast multiple rays for better navigation
    const angles = [0, -0.4, 0.4, -0.8, 0.8]; // Forward + angled
    let bestDir = null;
    let bestScore = -Infinity;
    
    for (const angle of angles) {
      const testDir = dir.clone();
      // Rotate around Y axis
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const rx = testDir.x * cos - testDir.z * sin;
      const rz = testDir.x * sin + testDir.z * cos;
      testDir.set(rx, 0, rz).normalize();
      
      this.losRaycaster.set(ghostEye, testDir);
      this.losRaycaster.far = checkDist;
      const hits = this.losRaycaster.intersectObjects(meshes, false);
      
      const clearDist = hits.length > 0 ? hits[0].distance : checkDist;
      
      // Score: prefer directions closer to target AND with more clearance
      const alignScore = testDir.dot(dir); // How aligned with target direction
      const clearScore = clearDist / checkDist; // How much clearance
      const score = alignScore * 0.6 + clearScore * 0.4;
      
      if (score > bestScore) {
        bestScore = score;
        bestDir = testDir;
      }
    }
    
    return bestDir || dir;
  }
  
  moveToward(target, speed, deltaTime) {
    const dir = this.getSteeringDirection(target);
    if (dir.lengthSq() < 0.001) return;
    
    // Smooth velocity for natural movement
    this.velocity.lerp(dir.normalize().multiplyScalar(speed), 0.1);
    
    const movement = this.velocity.clone().multiplyScalar(deltaTime);
    const nextPos = this.position.clone().add(movement);
    nextPos.y = 0;
    
    // Collision check with raycast
    const meshes = this.collisionWalls.map(w => w.mesh || w);
    if (meshes.length > 0) {
      const moveDir = movement.clone().normalize();
      if (moveDir.lengthSq() > 0.01) {
        this.losRaycaster.set(
          new THREE.Vector3(this.position.x, 1.0, this.position.z),
          moveDir
        );
        this.losRaycaster.far = 0.8;
        const hits = this.losRaycaster.intersectObjects(meshes, false);
        
        if (hits.length > 0 && hits[0].distance < 0.6) {
          // Blocked! Try sliding along the wall
          const slideX = this.position.clone();
          slideX.x += movement.x;
          
          this.losRaycaster.set(
            new THREE.Vector3(this.position.x, 1.0, this.position.z),
            new THREE.Vector3(Math.sign(movement.x) || 1, 0, 0)
          );
          this.losRaycaster.far = Math.abs(movement.x) + 0.5;
          const hitsX = this.losRaycaster.intersectObjects(meshes, false);
          if (hitsX.length === 0 || hitsX[0].distance > 0.5) {
            this.position.x = slideX.x;
          }
          
          const slideZ = this.position.clone();
          slideZ.z += movement.z;
          
          this.losRaycaster.set(
            new THREE.Vector3(this.position.x, 1.0, this.position.z),
            new THREE.Vector3(0, 0, Math.sign(movement.z) || 1)
          );
          this.losRaycaster.far = Math.abs(movement.z) + 0.5;
          const hitsZ = this.losRaycaster.intersectObjects(meshes, false);
          if (hitsZ.length === 0 || hitsZ[0].distance > 0.5) {
            this.position.z = slideZ.z;
          }
          
          return;
        }
      }
    }
    
    this.position.copy(nextPos);
  }
  
  moveRandomly(speed, deltaTime) {
    if (this.position.distanceTo(this.roamTarget) < 3.0) {
      this.pickRoamTarget();
    }
    this.moveToward(this.roamTarget, speed, deltaTime);
  }
  
  pickRoamTarget() {
    this.roamTarget.set(
      (Math.random() - 0.5) * 80,
      0,
      (Math.random() - 0.5) * 80
    );
  }
  
  // ═══════════════════════════════════════════════════════
  //  PLAYER PREDICTION — Intercept where the player WILL BE
  // ═══════════════════════════════════════════════════════
  
  predictPlayerPosition(player, lookAhead = 1.5) {
    // Calculate player velocity from position delta
    const currentPos = player.position.clone();
    this.playerVelocity.copy(currentPos).sub(this.lastPlayerPos);
    this.lastPlayerPos.copy(currentPos);
    
    // Predict where the player will be in lookAhead seconds
    this.predictedPlayerPos.copy(currentPos).add(
      this.playerVelocity.clone().multiplyScalar(lookAhead * 60) // 60fps assumed
    );
    
    return this.predictedPlayerPos;
  }
  
  // ═══════════════════════════════════════════════════════
  //  MAIN UPDATE — Called every frame
  // ═══════════════════════════════════════════════════════
  
  update(deltaTime, players = []) {
    this.totalTime += deltaTime;
    this.stateTimer += deltaTime;
    this.lastSoundTime += deltaTime;
    
    // Aggression increases over time (game gets harder fast!)
    this.aggression = Math.min(1.0, this.totalTime / 180); // Full aggression at 3 min
    
    // Find nearest alive player
    let nearestPlayer = null;
    let nearestDist = Infinity;
    for (const p of players) {
      if (!p.alive) continue;
      const d = this.position.distanceTo(p.position);
      if (d < nearestDist) {
        nearestDist = d;
        nearestPlayer = p;
      }
    }
    this.distToPlayer = nearestDist;
    
    // Check LOS
    if (nearestPlayer) {
      this.canSeePlayer = this.checkLineOfSight(nearestPlayer.position);
      if (this.canSeePlayer) {
        this.lastKnownPlayerPos.copy(nearestPlayer.position);
      }
    }
    
    // Run state machine
    this.updateStateMachine(deltaTime, nearestPlayer, nearestDist);
    
    // Update animation mixer
    if (this.mixer) {
      this.mixer.update(deltaTime);
    }
    
    // Animate procedural parts if no model
    if (this._proceduralParts) {
      this.animateProceduralParts(deltaTime);
    }
    
    // Update effects
    this.updateEffects(deltaTime);
    
    // Update shader materials
    this.ghostMaterials.forEach(mat => {
      if (mat.uniforms) {
        mat.uniforms.time.value = this.totalTime;
        // Increase distortion during chase
        const chaseDistort = (this.state === 'Hunting' || this.state === 'Frenzy') ? 0.25 : 0.1;
        mat.uniforms.distortion.value = chaseDistort + Math.sin(this.totalTime * 3) * 0.05;
      }
    });
    
    // Smooth position update
    this.smoothPosition.lerp(this.position, 0.2);
    
    // Apply position to group
    if (this.state === 'Hunting' || this.state === 'Frenzy' || this.state === 'Jumpscare') {
      const jitter = new THREE.Vector3(
        (Math.random() - 0.5) * 0.06,
        0,
        (Math.random() - 0.5) * 0.06
      );
      this.group.position.set(
        this.smoothPosition.x + jitter.x, 0, this.smoothPosition.z + jitter.z
      );
    } else {
      this.group.position.set(this.smoothPosition.x, 0, this.smoothPosition.z);
    }
    
    // Face the player
    if (nearestPlayer && this.state !== 'Dormant' && this.state !== 'Cooldown') {
      const lookTarget = new THREE.Vector3(nearestPlayer.position.x, 0, nearestPlayer.position.z);
      this.group.lookAt(lookTarget);
    }
    
    // Visibility — monster is ALWAYS visible when not dormant/cooldown
    this.group.visible = (this.state !== 'Dormant');
    
    // Proximity-based sanity drain
    if (nearestPlayer && nearestDist < 15 && this.state !== 'Dormant' && this.state !== 'Cooldown') {
      const drainRate = this.state === 'Hunting' || this.state === 'Frenzy' 
        ? 8 : (this.state === 'Stalking' ? 2 : 0.5);
      const proximityMult = 1 - (nearestDist / 15);
      if (nearestPlayer.sanity !== undefined) {
        nearestPlayer.sanity -= drainRate * proximityMult * deltaTime;
      }
    }
    
    // Proximity callback
    if (nearestPlayer && nearestDist < 20 && this.onNearPlayer) {
      this.onNearPlayer(nearestDist, this.state);
    }
    
    // Audio
    this.updateAudio(nearestDist);
  }
  
  // ═══════════════════════════════════════════════════════
  //  STATE MACHINE — The brain of the monster
  // ═══════════════════════════════════════════════════════
  
  updateStateMachine(deltaTime, player, dist) {
    const gracePeriod = Math.max(5 - this.aggression * 3, 2); // Faster spawn
    const huntDuration = 30 + this.aggression * 20;
    const cooldownDuration = 2.0; // Minimal rest
    
    // Speeds — monster is now LETHAL
    const roamSpeed = 3.5 + this.aggression * 2.0;
    const stalkSpeed = 5.0 + this.aggression * 3.0;
    const huntSpeed = 11.0 + this.aggression * 5.0;  // 11-16 (Player sprint is ~14)
    const frenzySpeed = 13.0 + this.aggression * 6.0;
    
    switch (this.state) {
      
      // ═══ DORMANT: Grace period ═══
      case 'Dormant':
        this.group.visible = false;
        
        if (this.stateTimer > gracePeriod) {
          this.changeState('Roaming');
        }
        break;
      
      // ═══ ROAMING: Relentless Tracker ═══
      case 'Roaming':
        this.playAnimation('walk');
        this.setAnimationSpeed(1.4);
        
        if (player && player.alive) {
          // No more random wandering. Always move toward the player!
          this.moveToward(player.position, roamSpeed, deltaTime);
          
          // Fast hunt trigger
          if (dist < 18 || (this.canSeePlayer && dist < 35)) {
            this.targetPlayer = player;
            this.changeState('Hunting');
            if (this.onHuntStart) this.onHuntStart();
          }
        }
        break;
      
      // ═══ STALKING: Closing in on the player ═══
      case 'Stalking':
        this.playAnimation('walk');
        this.setAnimationSpeed(1.2);
        
        if (player && player.alive) {
          // Move toward last known position
          this.moveToward(this.lastKnownPlayerPos, stalkSpeed, deltaTime);
          
          // Close enough? START THE HUNT!
          if (dist < 12 && this.canSeePlayer && this.stateTimer > 3) {
            this.targetPlayer = player;
            this.changeState('Hunting');
            if (this.onHuntStart) this.onHuntStart();
          }
        }
        
        // Lost the player
        if (!player || (dist > 30 && this.stateTimer > 8)) {
          this.changeState('Roaming');
        }
        break;
      
      // ═══ HUNTING: OMNISCIENT CHASE — RUN OR DIE ═══
      case 'Hunting':
        this.playAnimation('run');
        this.setAnimationSpeed(1.8 + this.aggression);
        
        if (this.targetPlayer && this.targetPlayer.alive) {
          // Relentless pursuit: track the EXACT position even through walls
          const target = this.canSeePlayer 
            ? this.predictPlayerPosition(this.targetPlayer, 1.2 + this.aggression) 
            : this.targetPlayer.position;
          
          this.moveToward(target, huntSpeed, deltaTime);
          
          // LETHAL CATCH
          if (dist < 2.0) {
            this.targetPlayer.alive = false;
            this.changeState('Jumpscare');
            if (this.onKill) this.onKill();
          }
        }
        
        // Relentless: No more duration timer shortening. Stay aggressive!
        if (this.stateTimer > huntDuration * 1.5) {
          this.changeState('Cooldown');
          if (this.onHuntEnd) this.onHuntEnd();
        }
        break;
      
      // ═══ FRENZY: Low sanity = monster goes BERSERK ═══
      case 'Frenzy':
        this.playAnimation('run');
        this.setAnimationSpeed(2.0);
        
        if (this.targetPlayer && this.targetPlayer.alive) {
          // Direct pursuit at maximum speed — no mercy
          this.moveToward(this.targetPlayer.position, frenzySpeed, deltaTime);
          
          // CATCH
          if (dist < 2.0) {
            this.targetPlayer.alive = false;
            this.changeState('Jumpscare');
            if (this.onKill) this.onKill();
          }
        }
        
        if (this.stateTimer > huntDuration * 1.5) {
          this.changeState('Cooldown');
          if (this.onHuntEnd) this.onHuntEnd();
        }
        break;
      
      // ═══ JUMPSCARE: Got you! ═══
      case 'Jumpscare':
        this.playAnimation('idle');
        
        if (this.targetPlayer) {
          this.moveToward(this.targetPlayer.position, 15, deltaTime);
        }
        
        if (this.stateTimer > 2.0) {
          this.changeState('Cooldown');
        }
        break;
      
      // ═══ COOLDOWN: Extremely brief pause ═══
      case 'Cooldown':
        this.playAnimation('walk');
        this.setAnimationSpeed(0.6);
        
        if (this.stateTimer > 2.0) { // Only 2 seconds of rest
          this.huntCount++;
          this.changeState('Roaming');
        }
        break;
    }
  }
  
  changeState(newState) {
    this.prevState = this.state;
    this.state = newState;
    this.stateTimer = 0;
    
    console.log(`Monster state: ${this.prevState} → ${newState}`);
    
    if (this.audioEngine) {
      switch (newState) {
        case 'Stalking':
          this.audioEngine.playGhostGrowl?.();
          break;
        case 'Hunting':
          this.audioEngine.playGhostScream?.();
          this.chaseAudioStarted = false;
          break;
        case 'Frenzy':
          this.audioEngine.playGhostScream?.();
          break;
        case 'Jumpscare':
          this.audioEngine.playJumpscare?.();
          break;
      }
    }
  }
  
  // ═══════════════════════════════════════════════════════
  //  EFFECTS UPDATE
  // ═══════════════════════════════════════════════════════
  
  updateEffects(deltaTime) {
    // Aura light
    if (this.auraLight) {
      switch (this.state) {
        case 'Hunting':
        case 'Frenzy':
          this.auraLight.intensity = 15 + Math.sin(this.totalTime * 15) * 8;
          this.auraLight.color.setHex(0xff0000);
          this.auraLight.distance = 25;
          break;
        case 'Stalking':
          this.auraLight.intensity = 4.0;
          this.auraLight.color.setHex(0xaa0000);
          this.auraLight.distance = 15;
          break;
        case 'Roaming':
          this.auraLight.intensity = 1.2 + Math.sin(this.totalTime * 2) * 0.5;
          this.auraLight.color.setHex(0x660000);
          this.auraLight.distance = 10;
          break;
        default:
          this.auraLight.intensity = 0;
      }
    }
    
    // Particles
    if (this.particles && this.state !== 'Dormant') {
      const pos = this.particles.geometry.attributes.position.array;
      for (let i = 0; i < pos.length; i += 3) {
        pos[i + 1] += deltaTime * (0.4 + Math.sin(this.totalTime + i) * 0.3);
        pos[i] += Math.sin(this.totalTime * 2 + i) * deltaTime * 0.3;
        pos[i + 2] += Math.cos(this.totalTime * 1.5 + i) * deltaTime * 0.3;
        if (pos[i + 1] > 3.5) {
          pos[i] = (Math.random() - 0.5) * 2;
          pos[i + 1] = 0;
          pos[i + 2] = (Math.random() - 0.5) * 2;
        }
      }
      this.particles.geometry.attributes.position.needsUpdate = true;
      
      // Particles more intense when hunting
      this.particles.material.opacity = this.state === 'Hunting' || this.state === 'Frenzy' ? 0.6 : 0.3;
      this.particles.material.color.setHex(
        this.state === 'Frenzy' ? 0xff0000 : 
        this.state === 'Hunting' ? 0xff3300 : 0x551100
      );
    }
    
    // Trail
    if (this.trail) {
      this.trailPoints.unshift(this.position.clone());
      if (this.trailPoints.length > 30) this.trailPoints.pop();
      
      const trailPos = this.trailGeo.attributes.position.array;
      for (let i = 0; i < 30; i++) {
        if (i < this.trailPoints.length) {
          trailPos[i * 3] = this.trailPoints[i].x;
          trailPos[i * 3 + 1] = 0.1;
          trailPos[i * 3 + 2] = this.trailPoints[i].z;
        }
      }
      this.trailGeo.attributes.position.needsUpdate = true;
      this.trail.material.opacity = (this.state === 'Hunting' || this.state === 'Frenzy') ? 0.2 : 0;
    }
  }
  
  // ═══════════════════════════════════════════════════════
  //  PROCEDURAL ANIMATION (fallback body parts)
  // ═══════════════════════════════════════════════════════
  
  animateProceduralParts(deltaTime) {
    if (!this._proceduralParts) return;
    const p = this._proceduralParts;
    const t = this.totalTime;
    const hunting = this.state === 'Hunting' || this.state === 'Frenzy';
    const speed = hunting ? 12 : 3;
    const sway = hunting ? 0.3 : 0.06;
    
    // Head twitching
    if (p.head) {
      p.head.rotation.z = Math.sin(t * speed * 0.7) * sway;
      p.head.rotation.x = Math.sin(t * speed * 0.3) * sway * 0.5;
      if (Math.random() < 0.008) p.head.rotation.z += (Math.random() - 0.5) * 0.8;
    }
    
    // Arms reaching when hunting
    if (p.leftArm) {
      const reach = hunting ? -1.0 : 0;
      p.leftArm.rotation.x = reach + Math.sin(t * speed + 1) * sway * 2;
    }
    if (p.rightArm) {
      const reach = hunting ? -1.0 : 0;
      p.rightArm.rotation.x = reach + Math.sin(t * speed + 3) * sway * 2;
    }
    
    // Running legs
    if (p.leftLeg) p.leftLeg.rotation.x = Math.sin(t * speed) * (hunting ? 0.6 : 0.03);
    if (p.rightLeg) p.rightLeg.rotation.x = -Math.sin(t * speed) * (hunting ? 0.6 : 0.03);
    
    // Eye glow
    [p.leftEye, p.rightEye].forEach((eye, i) => {
      if (eye && eye.material) {
        const pulse = Math.sin(t * 3 + i) * 0.3 + 0.7;
        eye.material.opacity = pulse;
        eye.material.color.setHex(hunting ? 0xff0000 : 0xff2200);
      }
    });
  }
  
  // ═══════════════════════════════════════════════════════
  //  AUDIO
  // ═══════════════════════════════════════════════════════
  
  updateAudio(dist) {
    if (!this.audioEngine || !this.audioEngine.initialized) return;
    
    // Heartbeat when monster is near
    if (dist < 20 && this.state !== 'Dormant' && this.state !== 'Cooldown') {
      if (this.lastSoundTime > (dist < 10 ? 0.5 : 1.5)) {
        this.audioEngine.playHeartbeat?.(Math.max(0, 100 - (20 - dist) * 5));
        this.lastSoundTime = 0;
      }
    }
    
    // Whispers when stalking
    if (this.state === 'Stalking' && dist < 12 && Math.random() < 0.003) {
      this.audioEngine.playWhisper?.(this.position);
    }
    
    // Chase breathing
    if ((this.state === 'Hunting' || this.state === 'Frenzy') && !this.chaseAudioStarted) {
      this.audioEngine.playGhostBreathing?.();
      this.chaseAudioStarted = true;
    }
  }
  
  // ═══════════════════════════════════════════════════════
  //  GETTERS
  // ═══════════════════════════════════════════════════════
  
  getPosition() { return this.position; }
  getState() { return this.state; }
  getDistanceToPlayer() { return this.distToPlayer; }
  getAggression() { return this.aggression; }
  isHunting() { return this.state === 'Hunting' || this.state === 'Frenzy'; }
  isVisible() { return this.state !== 'Dormant'; }
}