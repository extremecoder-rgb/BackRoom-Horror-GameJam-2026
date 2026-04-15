import * as THREE from 'three';
import { createRenderer } from './game/renderer.js';
import { setupAtmosphere } from './environment/lighting.js';
import { PostProcessor } from './environment/post-processing.js';
import { AudioEngine } from './audio/AudioEngine.js';
import { Backrooms } from './environment/Backrooms.js';
import lobbyUI from './ui/lobby.js';
import networkClient from './network/client.js';

/**
 * ═══════════════════════════════════════════════════
 *   BACKROOMS — Level 0: The Lobby
 * ═══════════════════════════════════════════════════
 * 
 * HOW TO WIN:
 *   1. Find the GOLDEN KEY
 *   2. Find the EXIT DOOR 
 *   3. Press E to ESCAPE
 * 
 * HOW TO LOSE:
 *   - Ghost catches you = DEAD
 *   - Sanity drops to 0 = INSANE
 * 
 * MECHANICS:
 *   - Stamina system (can't sprint forever)
 *   - Ghost gets more aggressive over time
 *   - Proximity-based horror effects
 *   - Hiding mechanics (crouch behind walls)
 *   - Lights flicker when ghost is near
 * ═══════════════════════════════════════════════════
 */

// ─── GLOBALS ─────────────────────────────────────────
let renderer, scene, camera, postProcessor, ghost, audioEngine, flashlight, torchPoint, backrooms;
let lastTime = 0;
let gameActive = false;
let gameWon = false;
let gamePaused = false;
let gameStartTime = 0;

// Player
let localPlayer = { 
  position: new THREE.Vector3(4, 1.7, 4), 
  sanity: 100, 
  alive: true,
  stamina: 100,
  isSprinting: false,
  isCrouching: false,
  footstepTimer: 0,
  isGhost: false,
  role: null
};

// Multiplayer state
let mpGameState = null;
let myPlayerId = window.myPlayerId || null;

// HUD
let hud = null;

// Interactive objects
let gates = [];
window.gameGates = gates;
let hasKey = false;
let keyItem = null;
let keyLight = null;
let exitDoor = null;
let exitGlow = null;

// Controls
const keys = {};
let yaw = 0, pitch = 0, pointerLocked = false;
const WALK_SPEED = 8;
const SPRINT_SPEED = 14;
const CROUCH_SPEED = 3;
const EYE_HEIGHT = 1.7;
const CROUCH_HEIGHT = 1.0;
let currentHeight = EYE_HEIGHT;

// Stamina
const STAMINA_DRAIN = 20;    // per second while sprinting
const STAMINA_REGEN = 12;    // per second while not sprinting
const STAMINA_MIN_TO_SPRINT = 10;

// Collision
const raycaster = new THREE.Raycaster();
const interactionDistance = 5;
const playerBox = new THREE.Box3();
const wallBox = new THREE.Box3();

// Flickering lights
let sceneLights = [];
let lightFlickerTimer = 0;
let isLightFlickering = false;

// ═══════════════════════════════════════════════════
//  INITIALIZATION
// ═══════════════════════════════════════════════════

async function init() {
  const canvas = document.getElementById('game-canvas');
  if (!canvas) return;
  
  renderer = createRenderer(canvas);
  scene = new THREE.Scene();
  setupAtmosphere(scene);
  
  audioEngine = new AudioEngine();
  
  // ─── BUILD WORLD ───
  backrooms = new Backrooms(scene);
  
  // Update dependencies when model loads
  backrooms.onLoaded = () => {
    if (keyItem) {
        // Find a suitable position in the new model if needed
        // For now, we'll keep the positions but we could detect "floor" meshes
    }
  };
  
  gates = [];
  window.gameGates = gates;
  
  // Main ambient light (warm fluorescent)
  const ambient = new THREE.AmbientLight(0xffffcc, 0.6);
  scene.add(ambient);
  
  // Grid of ceiling lights
  const lightPositions = [
    [0, 3.3, 0], [40, 3.3, 40], [-40, 3.3, 40], [40, 3.3, -40],
    [-40, 3.3, -40], [0, 3.3, 40], [40, 3.3, 0], [-40, 3.3, 0],
    [0, 3.3, -40], [60, 3.3, 0], [-60, 3.3, 0], [0, 3.3, 60],
    [0, 3.3, -60], [20, 3.3, 20], [-20, 3.3, -20], [20, 3.3, -20]
  ];
  lightPositions.forEach(pos => {
    const light = new THREE.PointLight(0xFFFDD0, 3, 40, 1);
    light.position.set(pos[0], pos[1], pos[2]);
    scene.add(light);
    sceneLights.push(light);
  });
  
  // ─── CAMERA ───
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 800);
  camera.position.set(5, EYE_HEIGHT, 5); // Start at a slight offset
  scene.add(camera);
  
  // Flashlight
  flashlight = new THREE.SpotLight(0xffffff, 50, 60, Math.PI / 4, 0.4);
  camera.add(flashlight);
  camera.add(flashlight.target);
  flashlight.target.position.set(0, 0, -1);
  
  // Torch glow
  torchPoint = new THREE.PointLight(0xffffee, 3, 8);
  camera.add(torchPoint);
  
  // ─── GHOST ───
  const { Ghost } = await import('./ghost/Ghost.js');
  // Initialize with whatever walls are currently available (might be empty)
  ghost = new Ghost(scene, backrooms.getCollisionObjects());
  ghost.position.set(-30, 0, 30); // Start far away to avoid clipping
  ghost.setAudio(audioEngine);
  
  // Ghost kill callback
  ghost.onKill = () => {
    gameActive = false;
    document.exitPointerLock();
    if (audioEngine) audioEngine.playJumpscare();
    if (postProcessor) postProcessor.triggerJumpscare();
    setTimeout(() => showDeathScreen(), 800);
  };
  
  // Hunt start/end callbacks
  ghost.onHuntStart = () => {
    if (audioEngine) {
      audioEngine.startChaseMusic();
      audioEngine.playGhostBreathing();
      audioEngine.playManiacalLaugh(); // 😈 NEW HAUNTING SOUND
    }
    if (postProcessor) postProcessor.setHuntMode(true);
  };
  
  ghost.onHuntEnd = () => {
    if (audioEngine) {
      audioEngine.stopChaseMusic();
      audioEngine.stopGhostBreathing();
    }
    if (postProcessor) postProcessor.setHuntMode(false);
  };
  
  // Proximity callback
  ghost.onNearPlayer = (dist, state) => {
    if (postProcessor) {
      const proximity = 1 - Math.min(1, dist / 15);
      postProcessor.setGhostProximity(proximity);
    }
  };
  
  // ─── KEY ITEM ───
  const keyGeo = new THREE.BoxGeometry(0.4, 0.15, 0.1);
  const keyMat = new THREE.MeshStandardMaterial({ 
    color: 0xFFD700,
    emissive: 0xFFD700,
    emissiveIntensity: 0.8
  });
  keyItem = new THREE.Mesh(keyGeo, keyMat);
  // Place key in a more interesting location
  keyItem.position.set(50, 0.5, -30);
  keyItem.userData.isKey = true;
  scene.add(keyItem);
  
  keyLight = new THREE.PointLight(0xFFD700, 2, 10);
  keyLight.position.set(50, 1, -30);
  scene.add(keyLight);
  
  // Key bobbing animation
  keyItem.userData.baseY = 0.5;
  
  // ─── EXIT DOOR ───
  const doorGeo = new THREE.BoxGeometry(2.5, 3.5, 0.3);
  const doorMat = new THREE.MeshStandardMaterial({ 
    color: 0x224422,
    emissive: 0x00ff00,
    emissiveIntensity: 0.3
  });
  exitDoor = new THREE.Mesh(doorGeo, doorMat);
  exitDoor.position.set(-50, 1.75, -50);
  exitDoor.userData.isExit = true;
  scene.add(exitDoor);
  
  // Exit sign
  const exitSignGeo = new THREE.PlaneGeometry(2, 0.8);
  const exitSignMat = new THREE.MeshBasicMaterial({ color: 0x00FF00 });
  const exitSign = new THREE.Mesh(exitSignGeo, exitSignMat);
  exitSign.position.set(-50, 3.5, -50);
  exitDoor.userData.sign = exitSign;
  scene.add(exitSign);
  
  exitGlow = new THREE.PointLight(0x00ff00, 3, 15);
  exitGlow.position.set(-50, 2, -50);
  scene.add(exitGlow);
  
  // ─── POST-PROCESSING ───
  try {
    postProcessor = new PostProcessor(renderer, scene, camera);
  } catch (e) {
    console.warn('Post-processing failed:', e);
    postProcessor = null;
  }
  
  createHUD();
  setupControls(canvas);
  setupNetworkIntegration();
  
  // Initialize lobby (show multiplayer room menu)
  lobbyUI.init();
  
  // ─── FINAL INITIALIZATION ───
  const spawnEverything = () => {
    if (!backrooms.isLoaded) return;
    
    console.log('🎲 Randomizing entity positions on floor meshes...');
    
    const ghostPos = backrooms.getRandomPosition();
    if (ghost) {
      ghost.position.copy(ghostPos);
      ghost.setCollisionWalls(backrooms.getCollisionObjects());
    }
    
    const keyPos = backrooms.getRandomPosition();
    if (keyItem) {
      keyItem.position.copy(keyPos);
      keyItem.position.y = 0.5;
      if (keyLight) {
        keyLight.position.copy(keyPos);
        keyLight.position.y = 1.0;
      }
    }
    
    const exitPos = backrooms.getRandomPosition();
    if (exitDoor) {
      exitDoor.position.copy(exitPos);
      exitDoor.position.y = 1.75;
      if (exitGlow) {
        exitGlow.position.copy(exitPos);
        exitGlow.position.y = 2.0;
      }
      if (exitDoor.userData.sign) {
        exitDoor.userData.sign.position.copy(exitPos);
        exitDoor.userData.sign.position.y = 3.5;
      }
    }
  };

  if (backrooms.isLoaded) {
    spawnEverything();
  } else {
    backrooms.onLoaded = spawnEverything;
  }

  // Resize handler
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    if (postProcessor) postProcessor.resize(window.innerWidth, window.innerHeight);
  });
  
  // Expose globals for debugging
  window.resumeGame = resumeGame;
  window.goToMenu = goToMenu;
  
  lastTime = performance.now();
  requestAnimationFrame(animate);
}

// ═══════════════════════════════════════════════════
//  HUD
// ═══════════════════════════════════════════════════

function createHUD() {
  hud = document.createElement('div');
  hud.className = 'horror-hud';
  hud.style.display = 'none';
  hud.innerHTML = `
    <!-- MINIMAP -->
    <div id="minimap-container" style="position:absolute;top:20px;left:20px;width:180px;height:180px;background:rgba(0,0,0,0.85);border:2px solid #333;border-radius:8px;overflow:hidden;">
      <canvas id="minimap" width="180" height="180"></canvas>
    </div>
    
    <!-- STATS PANEL -->
    <div id="stats-panel" style="position:absolute;top:20px;left:210px;display:flex;flex-direction:column;gap:6px;">
      
      <!-- SANITY BAR -->
      <div style="background:rgba(0,0,0,0.8);padding:8px 14px;border-radius:6px;border:1px solid #333;min-width:180px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
          <span style="color:#aaa;font-size:12px;">🧠 SANITY</span>
          <span id="hud-sanity" style="color:#0f0;font-size:14px;font-weight:bold;">100%</span>
        </div>
        <div style="background:#111;height:6px;border-radius:3px;overflow:hidden;">
          <div id="sanity-bar" style="background:linear-gradient(90deg,#0f0,#0a0);height:100%;width:100%;transition:width 0.3s;border-radius:3px;"></div>
        </div>
      </div>
      
      <!-- STAMINA BAR -->
      <div style="background:rgba(0,0,0,0.8);padding:8px 14px;border-radius:6px;border:1px solid #333;min-width:180px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
          <span style="color:#aaa;font-size:12px;">⚡ STAMINA</span>
          <span id="hud-stamina" style="color:#ffaa00;font-size:14px;font-weight:bold;">100%</span>
        </div>
        <div style="background:#111;height:6px;border-radius:3px;overflow:hidden;">
          <div id="stamina-bar" style="background:linear-gradient(90deg,#ffaa00,#ff8800);height:100%;width:100%;transition:width 0.3s;border-radius:3px;"></div>
        </div>
      </div>
      
      <!-- GHOST STATUS -->
      <div id="ghost-status" style="background:rgba(0,0,0,0.8);padding:8px 14px;border-radius:6px;border:1px solid #333;min-width:180px;">
        <span style="font-size:12px;color:#888;">👻 ENTITY: </span>
        <span id="ghost-state" style="font-size:12px;color:#666;">DORMANT</span>
      </div>
      
      <!-- OBJECTIVE -->
      <div style="background:rgba(0,0,0,0.8);padding:8px 14px;border-radius:6px;border:1px solid #ffd700;">
        <div id="key-status" style="color:#ffd700;font-size:13px;font-weight:bold;">WAITING FOR GAME</div>
      </div>
      
      <!-- TORCH -->
      <div id="torch-indicator" style="background:rgba(0,0,0,0.8);padding:6px 14px;border-radius:6px;border:1px solid #333;color:#ff0;font-size:12px;">
        🔦 FLASHLIGHT: ON
      </div>
    </div>
    
    <!-- DISTANCE INDICATORS (bottom-left) -->
    <div id="distance-panel" style="position:absolute;bottom:60px;left:20px;display:flex;gap:10px;">
      <div id="key-dist-box" style="background:rgba(0,0,0,0.8);padding:8px 14px;border-radius:6px;border:1px solid #ffd700;color:#ffd700;font-size:14px;">
        🔑 <span id="key-dist">???</span>m
      </div>
      <div style="background:rgba(0,0,0,0.8);padding:8px 14px;border-radius:6px;border:1px solid #0f0;color:#0f0;font-size:14px;">
        🚪 <span id="exit-dist">???</span>m
      </div>
      <div style="background:rgba(0,0,0,0.8);padding:8px 14px;border-radius:6px;border:1px solid #f00;color:#f00;font-size:14px;">
        👻 <span id="ghost-dist">???</span>m
      </div>
    </div>
    
    <!-- INTERACTION PROMPT -->
    <div id="interaction-prompt" style="position:absolute;top:55%;left:50%;transform:translate(-50%,-50%);color:#fff;font-size:22px;background:rgba(0,0,0,0.9);padding:12px 28px;display:none;border:2px solid #fff;border-radius:8px;font-weight:bold;letter-spacing:2px;">
      [E] INTERACT
    </div>
    
    <!-- GHOST WARNING -->
    <div id="ghost-warning" style="position:absolute;top:15%;left:50%;transform:translateX(-50%);color:#ff0000;font-size:28px;font-weight:bold;display:none;text-shadow:0 0 20px #ff0000;animation:warningPulse 0.5s infinite;letter-spacing:4px;">
      ⚠ ENTITY HUNTING ⚠
    </div>
    
    <!-- CONTROLS HINT -->
    <div style="position:absolute;bottom:16px;left:50%;transform:translateX(-50%);color:rgba(255,255,255,0.5);text-align:center;font-size:12px;background:rgba(0,0,0,0.6);padding:6px 16px;border-radius:4px;">
      WASD move • SHIFT sprint • C crouch • F flashlight • E interact
    </div>
    
    <!-- CROSSHAIR -->
    <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:4px;height:4px;background:rgba(255,255,255,0.4);border-radius:50%;pointer-events:none;"></div>
  `;
  document.body.appendChild(hud);
}

// ═══════════════════════════════════════════════════
//  CONTROLS
// ═══════════════════════════════════════════════════

function setupControls(canvas) {
  window.addEventListener('keydown', e => {
    keys[e.code] = true;
  });
  window.addEventListener('keyup', e => {
    keys[e.code] = false;
  });
  
  canvas.addEventListener('click', () => {
    if (gameActive && !gamePaused) {
      canvas.requestPointerLock();
    }
    if (!audioEngine.initialized) {
      audioEngine.init().then(() => {
        audioEngine.playFluorescentHum();
        audioEngine.playAmbientDrone();
      });
    }
  });
  
  document.addEventListener('pointerlockchange', () => {
    pointerLocked = !!document.pointerLockElement;
  });
  
  document.addEventListener('mousemove', e => {
    if (!pointerLocked || !gameActive || gamePaused) return;
    yaw -= e.movementX * 0.002;
    pitch -= e.movementY * 0.002;
    pitch = Math.max(-1.2, Math.min(1.2, pitch));
  });
  
  window.addEventListener('keydown', e => {
    if (e.code === 'KeyE' && gameActive && !gamePaused) checkInteraction();
    if (e.code === 'KeyF' && gameActive && !gamePaused) toggleFlashlight();
    if (e.code === 'KeyC' && gameActive && !gamePaused) toggleCrouch();
    if (e.code === 'Escape' && gameActive && !gameWon) togglePause();
    
    // PvP Ghost: Hunt activation (H key for ghost player)
    if (e.code === 'KeyH' && gameActive && !gamePaused && localPlayer.isGhost) {
      sendHuntAction(true);
    }
  });
  
  window.addEventListener('keyup', e => {
    // End hunt when H is released
    if (e.code === 'KeyH' && localPlayer.isGhost) {
      sendHuntAction(false);
    }
  });
}

// ═══════════════════════════════════════════════════
//  INTERACTION
// ═══════════════════════════════════════════════════

function checkInteraction() {
  if (gameWon || !gameActive) return;
  
  // Key pickup
  if (!hasKey && keyItem) {
    const keyDist = camera.position.distanceTo(keyItem.position);
    if (keyDist < 3.5) {
      hasKey = true;
      scene.remove(keyItem);
      if (keyLight) scene.remove(keyLight);
      keyItem = null;
      
      // Visual feedback on door
      if (exitDoor) {
        exitDoor.material.color.setHex(0x00FF00);
        exitDoor.material.emissive.setHex(0x00FF00);
        exitDoor.material.emissiveIntensity = 0.5;
        if (exitDoor.userData.sign) {
          exitDoor.userData.sign.material.color.setHex(0xFFDD00);
        }
      }
      
      // HUD update
      const keyStatus = document.getElementById('key-status');
      if (keyStatus) {
        keyStatus.innerHTML = '🔓 KEY FOUND! FIND THE EXIT!';
        keyStatus.style.color = '#0f0';
      }
      const keyDistBox = document.getElementById('key-dist-box');
      if (keyDistBox) keyDistBox.style.display = 'none';
      return;
    }
  }
  
  // Exit door
  if (exitDoor && hasKey) {
    const doorDist = camera.position.distanceTo(exitDoor.position);
    if (doorDist < 4.5) {
      winGame();
      return;
    }
  }
  
  // Gates/doors
  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
  const intersects = raycaster.intersectObjects(gates, true);
  if (intersects.length > 0 && intersects[0].distance < interactionDistance) {
    const obj = intersects[0].object;
    let target = obj;
    while (target.parent && !target.userData.isGate) target = target.parent;
    target.rotation.y += Math.PI / 2;
    if (audioEngine) audioEngine.playDoorCreak();
  }
}

function toggleFlashlight() {
  if (!flashlight) return;
  flashlight.visible = !flashlight.visible;
  if (torchPoint) torchPoint.visible = flashlight.visible;
  
  const indicator = document.getElementById('torch-indicator');
  if (indicator) {
    indicator.textContent = flashlight.visible ? '🔦 FLASHLIGHT: ON' : '🔦 FLASHLIGHT: OFF';
    indicator.style.color = flashlight.visible ? '#ff0' : '#555';
    indicator.style.borderColor = flashlight.visible ? '#333' : '#550000';
  }
}

function toggleCrouch() {
  localPlayer.isCrouching = !localPlayer.isCrouching;
}

// ═══════════════════════════════════════════════════
//  NETWORK INTEGRATION (PvP Ghost)
// ═══════════════════════════════════════════════════

function setupNetworkIntegration() {
  if (typeof networkClient === 'undefined') return;
  
  networkClient.on('game_start', (data) => {
    console.log('[Multiplayer] Game starting, data:', data);
    window.mpGameState = data;
    
    if (data.players) {
      // Find my player by matching with window.myPlayerId
      const myId = window.myPlayerId || this.playerId;
      const me = data.players.find(p => p.id === myId);
      console.log('[Multiplayer] My ID:', myId, 'Looking in players:', data.players.map(p => p.id));
      
      if (me) {
        localPlayer.isGhost = me.isGhost;
        localPlayer.role = me.role;
        console.log('[Multiplayer] I am:', me.role);
        
        // Set starting position based on role (far apart)
        if (me.isGhost) {
          camera.position.set(-40, EYE_HEIGHT, -40);
          if (ghost) ghost.position.set(-40, 0, -40);
        } else {
          camera.position.set(40, EYE_HEIGHT, 40);
          if (ghost) ghost.position.set(-40, 0, -40); // Ghost starts far away
        }
        
        // Show ghost model
        if (ghost) {
          ghost.visible = true;
          ghost.group.visible = true;
          scene.add(ghost.group);
        }
        
        // Update HUD
        const keyStatus = document.getElementById('key-status');
        if (keyStatus) {
          if (localPlayer.isGhost) {
            keyStatus.innerHTML = '💀 CATCH THE SURVIVOR';
            keyStatus.style.color = '#ff0000';
            keyStatus.parentElement.style.borderColor = '#ff0000';
          } else {
            keyStatus.innerHTML = '🔒 FIND THE KEY';
            keyStatus.style.color = '#ffd700';
            keyStatus.parentElement.style.borderColor = '#ffd700';
          }
        }
        
        // Start game logic
        if (hud) hud.style.display = 'block';
        gameActive = true;
        gameStartTime = performance.now();
        if (ghost) ghost.state = 'Dormant';
      } else {
        console.log('[Multiplayer] WARNING: Could not find my player!');
      }
    }
    
    // Initialize game state
    mpGameState = data;
  });
  
  networkClient.on('game_state', (state) => {
    mpGameState = state;
    console.log('[Multiplayer] game_state tick:', state.tick, 'result:', state.result, 'grace:', state.gracePeriod);
    
    // Update ghost/survivor positions based on received state
    if (ghost && state.players) {
      for (const p of state.players) {
        console.log('[Multiplayer] Player pos:', p.name, p.isGhost ? 'GHOST' : 'SURVIVOR', 'at', p.position);
        if (p.isGhost) {
          ghost.position.set(p.position.x, p.position.y, p.position.z);
        }
      }
    }
    
    if (state.result && state.gracePeriod <= 0) {
      console.log('[Multiplayer] GAME OVER, result:', state.result);
      handleMpGameResult(state.result);
    }
  });
  
  networkClient.on('hunt_started', (data) => {
    console.log('[Multiplayer] Hunt started!');
    if (audioEngine) audioEngine.startChaseMusic();
    if (postProcessor) postProcessor.setHuntMode(true);
  });
  
  networkClient.on('hunt_ended', (data) => {
    console.log('[Multiplayer] Hunt ended');
    if (audioEngine) audioEngine.stopChaseMusic();
    if (postProcessor) postProcessor.setHuntMode(false);
  });
}

function sendPositionToServer() {
  if (!networkClient || !networkClient.isConnected()) return;
  
  networkClient.send({
    type: 'position',
    data: {
      position: { x: camera.position.x, y: camera.position.y, z: camera.position.z },
      rotation: yaw
    }
  });
}

function sendHuntAction(start) {
  if (!networkClient || !networkClient.isConnected()) return;
  
  if (start) {
    networkClient.send({ type: 'start_hunt', data: {} });
  } else {
    networkClient.send({ type: 'end_hunt', data: {} });
  }
}

function handleMpGameResult(result) {
  gameActive = false;
  document.exitPointerLock();
  const iWon = (result === 'ghost_wins' && localPlayer.isGhost) || (result === 'survivor_wins' && !localPlayer.isGhost);
  console.log('[Multiplayer] Game result:', result, 'I am ghost:', localPlayer.isGhost, 'I won:', iWon);
  showGameOver(iWon, localPlayer.isGhost ? 'GHOST' : 'SURVIVOR');
}

function showGameOver(isWin, myRole) {
  const title = isWin ? (myRole === 'GHOST' ? 'VICTORY!' : 'ESCAPED!') : (myRole === 'GHOST' ? 'DEFEAT!' : 'CAUGHT!');
  const color = isWin ? '#00ff00' : '#ff0000';
  const msg = isWin 
    ? (myRole === 'GHOST' ? 'You caught the survivor!' : 'You escaped the ghost!')
    : (myRole === 'GHOST' ? 'The survivor escaped!' : 'The ghost caught you!');
  
  const div = document.createElement('div');
  div.style.cssText = `
    position:fixed;top:0;left:0;width:100%;height:100%;
    background:linear-gradient(180deg,#000100,#110000,#000100);
    color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;
    z-index:10000;font-family:'Courier New',monospace;
  `;
  div.innerHTML = `
    <h1 style="font-size:5rem;color:${color};text-shadow:0 0 40px ${color};letter-spacing:8px;margin:0;">${title}</h1>
    <p style="color:#666;margin:15px 0;font-size:18px;">${msg}</p>
    <p style="color:#333;font-size:14px;">Playing as: ${myRole}</p>
    <div style="display:flex;gap:15px;margin-top:25px;">
      <button onclick="location.reload()" style="padding:15px 35px;cursor:pointer;font-size:1.1rem;background:${color};color:#000;border:none;border-radius:6px;font-family:'Courier New',monospace;letter-spacing:2px;">PLAY AGAIN</button>
      <button onclick="window.goToMenu()" style="padding:15px 35px;cursor:pointer;font-size:1.1rem;background:#333;color:#888;border:none;border-radius:6px;font-family:'Courier New',monospace;">MAIN MENU</button>
    </div>
  `;
  document.body.appendChild(div);
}

// ═══════════════════════════════════════════════════
//  WIN / LOSE
// ═══════════════════════════════════════════════════

function winGame() {
  gameWon = true;
  gameActive = false;
  document.exitPointerLock();
  
  const elapsed = Math.round((performance.now() - gameStartTime) / 1000);
  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  
  showWinScreen(mins, secs);
}

function showWinScreen(mins, secs) {
  const w = document.createElement('div');
  w.style.cssText = `
    position:fixed;top:0;left:0;width:100%;height:100%;
    background:linear-gradient(180deg,#001a00,#002200,#001a00);
    color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;
    z-index:10000;font-family:'Courier New',monospace;
  `;
  w.innerHTML = `
    <h1 style="font-size:5rem;color:#00ff00;text-shadow:0 0 40px #00ff00;letter-spacing:8px;margin:0;">ESCAPED</h1>
    <p style="color:#0a0;margin:15px 0;font-size:18px;">You found the exit and escaped Level 0</p>
    <p style="color:#0a0;font-size:14px;">Time: ${mins}m ${secs}s</p>
    <div style="display:flex;gap:15px;margin-top:25px;">
      <button onclick="location.reload()" style="padding:15px 35px;cursor:pointer;font-size:1.1rem;background:#00aa00;color:#fff;border:none;border-radius:6px;font-family:'Courier New',monospace;letter-spacing:2px;">PLAY AGAIN</button>
      <button onclick="window.goToMenu()" style="padding:15px 35px;cursor:pointer;font-size:1.1rem;background:#333;color:#888;border:none;border-radius:6px;font-family:'Courier New',monospace;">MAIN MENU</button>
    </div>
  `;
  document.body.appendChild(w);
}

function showDeathScreen() {
  const d = document.createElement('div');
  d.style.cssText = `
    position:fixed;top:0;left:0;width:100%;height:100%;
    background:#000;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;
    z-index:10000;font-family:'Courier New',monospace;
    animation:deathFadeIn 0.5s ease-out;
  `;
  d.innerHTML = `
    <div style="color:#ff0000;font-size:6rem;margin-bottom:10px;text-shadow:0 0 60px #ff0000;animation:deathPulse 1s infinite;">☠</div>
    <h1 style="font-size:3.5rem;color:#880000;letter-spacing:6px;margin:0;">CAUGHT</h1>
    <p style="color:#440000;margin:15px 0;font-size:16px;">The entity found you.</p>
    <p style="color:#333;font-size:13px;margin-bottom:25px;">You cannot escape what you cannot see.</p>
    <div style="display:flex;gap:15px;">
      <button onclick="location.reload()" style="padding:15px 35px;cursor:pointer;font-size:1.1rem;background:#880000;color:#fff;border:none;border-radius:6px;font-family:'Courier New',monospace;letter-spacing:2px;">TRY AGAIN</button>
      <button onclick="window.goToMenu()" style="padding:15px 35px;cursor:pointer;font-size:1.1rem;background:#222;color:#666;border:none;border-radius:6px;font-family:'Courier New',monospace;">MAIN MENU</button>
    </div>
  `;
  document.body.appendChild(d);
}

function showSanityDeath() {
  gameActive = false;
  document.exitPointerLock();
  
  const d = document.createElement('div');
  d.style.cssText = `
    position:fixed;top:0;left:0;width:100%;height:100%;
    background:#0a0a0a;color:#888;display:flex;flex-direction:column;align-items:center;justify-content:center;
    z-index:10000;font-family:'Courier New',monospace;
  `;
  d.innerHTML = `
    <h1 style="font-size:4rem;color:#333;letter-spacing:8px;margin:0;">INSANITY</h1>
    <p style="color:#555;margin:15px 0;">You lost your mind in the Backrooms...</p>
    <p style="font-size:12px;color:#444;">Keep your flashlight on. Find the exit quickly.</p>
    <div style="display:flex;gap:15px;margin-top:25px;">
      <button onclick="location.reload()" style="padding:15px 35px;cursor:pointer;font-size:1.1rem;background:#333;color:#aaa;border:none;border-radius:6px;font-family:'Courier New',monospace;">TRY AGAIN</button>
      <button onclick="window.goToMenu()" style="padding:15px 35px;cursor:pointer;font-size:1.1rem;background:#222;color:#555;border:none;border-radius:6px;font-family:'Courier New',monospace;">MAIN MENU</button>
    </div>
  `;
  document.body.appendChild(d);
}

// ═══════════════════════════════════════════════════
//  PAUSE
// ═══════════════════════════════════════════════════

let pauseMenuShown = false;

function togglePause() {
  if (pauseMenuShown) {
    resumeGame();
  } else {
    showPauseMenu();
  }
}

function showPauseMenu() {
  if (pauseMenuShown) return;
  pauseMenuShown = true;
  gamePaused = true;
  document.exitPointerLock();
  
  const p = document.createElement('div');
  p.id = 'pause-menu';
  p.style.cssText = `
    position:fixed;top:0;left:0;width:100%;height:100%;
    background:rgba(0,0,0,0.9);color:#fff;display:flex;flex-direction:column;
    align-items:center;justify-content:center;z-index:9999;font-family:'Courier New',monospace;
  `;
  p.innerHTML = `
    <h1 style="font-size:3rem;color:#ACA67E;letter-spacing:6px;">PAUSED</h1>
    <div style="display:flex;flex-direction:column;gap:12px;margin-top:25px;">
      <button onclick="window.resumeGame()" style="padding:15px 50px;cursor:pointer;font-size:1.1rem;background:#ACA67E;color:#000;border:none;border-radius:6px;font-weight:bold;font-family:'Courier New',monospace;">RESUME</button>
      <button onclick="location.reload()" style="padding:15px 50px;cursor:pointer;font-size:1.1rem;background:#444;color:#fff;border:none;border-radius:6px;font-family:'Courier New',monospace;">RESTART</button>
      <button onclick="window.goToMenu()" style="padding:15px 50px;cursor:pointer;font-size:1.1rem;background:#222;color:#888;border:none;border-radius:6px;font-family:'Courier New',monospace;">QUIT</button>
    </div>
  `;
  document.body.appendChild(p);
}

function resumeGame() {
  const p = document.getElementById('pause-menu');
  if (p) p.remove();
  pauseMenuShown = false;
  gamePaused = false;
  
  const canvas = document.getElementById('game-canvas');
  if (canvas && gameActive && !gameWon) {
    canvas.requestPointerLock();
  }
}

function goToMenu() {
  location.reload();
}

// ═══════════════════════════════════════════════════
//  GAME LOOP
// ═══════════════════════════════════════════════════

function animate(time) {
  requestAnimationFrame(animate);
  const dt = Math.min((time - lastTime) / 1000, 0.1);
  lastTime = time;
  
  if (!gameActive || !localPlayer.alive || gamePaused) {
    // Still render even when paused
    try {
      if (postProcessor) {
        postProcessor.update(dt);
        postProcessor.render();
      } else {
        renderer.render(scene, camera);
      }
    } catch(e) {
      renderer.render(scene, camera);
    }
    return;
  }
  
  // ─── CAMERA ROTATION ───
  camera.quaternion.setFromEuler(new THREE.Euler(pitch, yaw, 0, 'YXZ'));
  
  // ─── GHOST PLAYER THIRD-PERSON CONTROL ───
  // If I'm the ghost player, the ghost model follows my controls
  if (localPlayer.isGhost && ghost) {
    // Ghost uses same movement but in third-person
    const ghostDir = new THREE.Vector3(0, 0, 0);
    if (keys.KeyW) ghostDir.z -= 1;
    if (keys.KeyS) ghostDir.z += 1;
    if (keys.KeyA) ghostDir.x -= 1;
    if (keys.KeyD) ghostDir.x += 1;
    
    if (ghostDir.lengthSq() > 0) {
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0));
      ghostDir.applyQuaternion(q).normalize();
      
      // Ghost moves faster, especially during hunt
      const ghostSpeed = mpGameState?.huntActive ? 12 : 8;
      const nextGhostPos = ghost.position.clone().add(ghostDir.clone().multiplyScalar(ghostSpeed * dt));
      
      // Simple collision check for ghost
      const meshes = backrooms.getWallMeshes();
      if (meshes.length > 0) {
        const raycasterG = new THREE.Raycaster();
        const originG = ghost.position.clone();
        originG.y = 1;
        const moveDirG = ghostDir.clone().normalize();
        raycasterG.set(originG, moveDirG);
        raycasterG.far = 0.8;
        const intersects = raycasterG.intersectObjects(meshes, false);
        if (intersects.length === 0 || intersects[0].distance > 0.8) {
          ghost.position.add(ghostDir.clone().multiplyScalar(ghostSpeed * dt));
        }
      } else {
        ghost.position.add(ghostDir.clone().multiplyScalar(ghostSpeed * dt));
      }
      
      // Face movement direction
      ghost.group.rotation.y = yaw + Math.PI;
    }
    
    // Keep ghost at correct height
    ghost.position.y = 0;
  }
  
  // ─── CROUCHING ───
  const targetH = localPlayer.isCrouching ? CROUCH_HEIGHT : EYE_HEIGHT;
  currentHeight += (targetH - currentHeight) * dt * 10;
  
  // ─── STAMINA ───
  const canSprint = localPlayer.stamina > STAMINA_MIN_TO_SPRINT;
  localPlayer.isSprinting = keys.ShiftLeft && canSprint && !localPlayer.isCrouching;
  
  if (localPlayer.isSprinting) {
    localPlayer.stamina = Math.max(0, localPlayer.stamina - STAMINA_DRAIN * dt);
  } else {
    localPlayer.stamina = Math.min(100, localPlayer.stamina + STAMINA_REGEN * dt);
  }
  
  // ─── MOVEMENT ───
  const dir = new THREE.Vector3(0, 0, 0);
  if (keys.KeyW) dir.z -= 1;
  if (keys.KeyS) dir.z += 1;
  if (keys.KeyA) dir.x -= 1;
  if (keys.KeyD) dir.x += 1;
  
  if (dir.lengthSq() > 0) {
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0));
    dir.applyQuaternion(q).normalize();
    
    let speed;
    if (localPlayer.isCrouching) speed = CROUCH_SPEED;
    else if (localPlayer.isSprinting) speed = SPRINT_SPEED;
    else speed = WALK_SPEED;
    
    const nextPos = camera.position.clone().add(dir.clone().multiplyScalar(speed * dt));
    nextPos.y = currentHeight;
    
    // ─── COLLISION (RAYCASTING) ───
    // We use rays in the direction of movement to check if we can pass.
    let collision = false;
    const meshes = backrooms.getWallMeshes();
    
    if (meshes.length > 0) {
      const raycaster = new THREE.Raycaster();
      const origin = camera.position.clone();
      origin.y = currentHeight * 0.5; // Check at waist height
      
      const moveDir = dir.clone().normalize();
      raycaster.set(origin, moveDir);
      raycaster.far = 1.0; // Check 1 meter ahead
      
      const intersects = raycaster.intersectObjects(meshes, false);
      if (intersects.length > 0 && intersects[0].distance < 0.6) {
        collision = true;
      }
      
      // Also check at foot level
      origin.y = 0.2;
      raycaster.set(origin, moveDir);
      const intersectsFeet = raycaster.intersectObjects(meshes, false);
      if (intersectsFeet.length > 0 && intersectsFeet[0].distance < 0.6) {
        collision = true;
      }
    }
    
    if (!collision) {
      camera.position.add(dir.clone().multiplyScalar(speed * dt));
    } else {
        // Try axis-aligned sliding
        const moveX = new THREE.Vector3(dir.x, 0, 0);
        if (moveX.lengthSq() > 0.01) {
            const rayX = new THREE.Raycaster(camera.position, moveX.normalize(), 0, 0.6);
            if (rayX.intersectObjects(meshes).length === 0) {
                camera.position.x += dir.x * speed * dt;
            }
        }
        
        const moveZ = new THREE.Vector3(0, 0, dir.z);
        if (moveZ.lengthSq() > 0.01) {
            const rayZ = new THREE.Raycaster(camera.position, moveZ.normalize(), 0, 0.6);
            if (rayZ.intersectObjects(meshes).length === 0) {
                camera.position.z += dir.z * speed * dt;
            }
        }
    }
    
    camera.position.y = currentHeight;
    
    // Footstep sounds
    localPlayer.footstepTimer += dt;
    const footstepInterval = localPlayer.isSprinting ? 0.25 : (localPlayer.isCrouching ? 0.7 : 0.4);
    if (localPlayer.footstepTimer >= footstepInterval) {
      localPlayer.footstepTimer = 0;
      if (audioEngine) audioEngine.playFootstep();
    }
  } else {
    camera.position.y = currentHeight;
  }
  
  localPlayer.position.copy(camera.position);
  
  // ─── SEND POSITION TO SERVER (for multiplayer) ───
  // Send position at 10Hz (every 10th frame) to reduce bandwidth
  if (mpGameState && networkClient && networkClient.isConnected()) {
    if (!window.mpPositionTick) window.mpPositionTick = 0;
    window.mpPositionTick++;
    if (window.mpPositionTick >= 2) { // ~20fps / 10 = every 2 frames = 10Hz
      window.mpPositionTick = 0;
      sendPositionToServer();
    }
  }
  
  // ─── SANITY ───
  // Drain when flashlight off
  if (!flashlight || !flashlight.visible) {
    localPlayer.sanity -= dt * 0.5;
  }
  
  // Very slow regen when flashlight is on and ghost is far
  if (flashlight && flashlight.visible && ghost && ghost.distToPlayer > 20) {
    localPlayer.sanity = Math.min(100, localPlayer.sanity + dt * 0.1);
  }
  
  // Sanity death
  if (localPlayer.sanity <= 0 && localPlayer.alive) {
    localPlayer.alive = false;
    localPlayer.sanity = 0;
    showSanityDeath();
  }
  
  // ─── KEY ANIMATION ───
  if (keyItem) {
    keyItem.position.y = keyItem.userData.baseY + Math.sin(time * 0.003) * 0.15;
    keyItem.rotation.y += dt * 1.5;
  }
  
  // ─── INTERACTION PROMPTS ───
  updateProximityPrompts();
  
  // ─── GHOST UPDATE ───
  if (ghost) {
    ghost.update(dt, [localPlayer]);
    
    // Light flickering during ghost events
    updateLightFlicker(dt);
    
    // Flashlight disruption
    if (flashlight && ghost.isHunting()) {
      if (Math.random() < 0.1) {
        flashlight.intensity = Math.random() < 0.3 ? 5 : 50;
      }
    } else if (flashlight) {
      flashlight.intensity = flashlight.visible ? 50 : 0;
    }
    
    // Ghost warning UI
    const warningEl = document.getElementById('ghost-warning');
    if (warningEl) {
      warningEl.style.display = ghost.isHunting() ? 'block' : 'none';
    }
    
    // Ghost state UI
    const stateEl = document.getElementById('ghost-state');
    if (stateEl) {
      const state = ghost.getState();
      stateEl.textContent = state;
      if (state === 'Hunting' || state === 'PreHunt') {
        stateEl.style.color = '#ff0000';
      } else if (state === 'Stalking') {
        stateEl.style.color = '#ffaa00';
      } else if (state === 'Roaming') {
        stateEl.style.color = '#666';
      } else {
        stateEl.style.color = '#444';
      }
    }
  }
  
  // ─── HUD UPDATE ───
  updateHUD();
  updateMinimap();
  
  // ─── POST-PROCESSING ───
  if (postProcessor) {
    postProcessor.setSanity(localPlayer.sanity);
    
    // Ghost proximity effect (smooth)
    if (ghost) {
      const proximity = Math.max(0, 1 - ghost.distToPlayer / 20);
      postProcessor.setGhostProximity(proximity);
    }
    
    postProcessor.update(dt);
    postProcessor.render();
  } else {
    renderer.render(scene, camera);
  }
}

// ═══════════════════════════════════════════════════
//  LIGHT FLICKERING
// ═══════════════════════════════════════════════════

function updateLightFlicker(dt) {
  if (!ghost) return;
  
  const ghostState = ghost.getState();
  const dist = ghost.distToPlayer;
  
  // Lights flicker when ghost is near or hunting
  if (ghostState === 'PreHunt' || ghostState === 'Hunting') {
    lightFlickerTimer += dt;
    
    // Rapid random flickering
    if (lightFlickerTimer > 0.08) {
      lightFlickerTimer = 0;
      sceneLights.forEach(light => {
        if (Math.random() < 0.4) {
          light.intensity = Math.random() < 0.3 ? 0 : (Math.random() * 5 + 1);
        }
      });
      if (audioEngine && Math.random() < 0.05) {
        audioEngine.playLightFlicker();
      }
    }
  } else if (ghostState === 'Stalking' && dist < 15) {
    // Subtle flicker when ghost is stalking nearby
    lightFlickerTimer += dt;
    if (lightFlickerTimer > 0.5 && Math.random() < 0.05) {
      lightFlickerTimer = 0;
      const randomLight = sceneLights[Math.floor(Math.random() * sceneLights.length)];
      if (randomLight) {
        const origIntensity = randomLight.intensity;
        randomLight.intensity = 0;
        setTimeout(() => { randomLight.intensity = origIntensity; }, 100 + Math.random() * 200);
      }
    }
  } else {
    // Normal — restore lights
    sceneLights.forEach(light => {
      light.intensity = 3;
    });
  }
}

// ═══════════════════════════════════════════════════
//  HUD UPDATE
// ═══════════════════════════════════════════════════

function updateHUD() {
  // Sanity
  const sanityEl = document.getElementById('hud-sanity');
  const sanityBar = document.getElementById('sanity-bar');
  if (sanityEl) {
    const s = Math.max(0, Math.round(localPlayer.sanity));
    sanityEl.textContent = s + '%';
    sanityEl.style.color = s > 50 ? '#0f0' : (s > 25 ? '#ffaa00' : '#ff0000');
  }
  if (sanityBar) {
    const pct = Math.max(0, localPlayer.sanity);
    sanityBar.style.width = pct + '%';
    if (pct > 50) sanityBar.style.background = 'linear-gradient(90deg,#0f0,#0a0)';
    else if (pct > 25) sanityBar.style.background = 'linear-gradient(90deg,#ffaa00,#ff8800)';
    else sanityBar.style.background = 'linear-gradient(90deg,#ff0000,#880000)';
  }
  
  // Stamina
  const staminaEl = document.getElementById('hud-stamina');
  const staminaBar = document.getElementById('stamina-bar');
  if (staminaEl) {
    staminaEl.textContent = Math.round(localPlayer.stamina) + '%';
    staminaEl.style.color = localPlayer.stamina > 20 ? '#ffaa00' : '#ff4444';
  }
  if (staminaBar) {
    staminaBar.style.width = localPlayer.stamina + '%';
  }
  
  // Distances
  const exitDist = document.getElementById('exit-dist');
  const keyDistEl = document.getElementById('key-dist');
  const ghostDist = document.getElementById('ghost-dist');
  
  if (exitDoor && exitDist) {
    const d = Math.round(camera.position.distanceTo(exitDoor.position));
    exitDist.textContent = hasKey ? d : 'LOCKED';
  }
  
  if (!hasKey && keyItem && keyDistEl) {
    keyDistEl.textContent = Math.round(camera.position.distanceTo(keyItem.position));
  } else if (keyDistEl) {
    keyDistEl.textContent = '✓';
  }
  
  if (ghost && ghostDist) {
    const d = Math.round(ghost.distToPlayer);
    if (d < 10) ghostDist.textContent = '⚠ CLOSE';
    else if (d < 20) ghostDist.textContent = d;
    else ghostDist.textContent = '---';
  }
}

function updateProximityPrompts() {
  if (gameWon || !gameActive) return;
  
  const prompt = document.getElementById('interaction-prompt');
  if (!prompt) return;
  
  let showPrompt = false;
  let promptText = '';
  
  if (!hasKey && keyItem) {
    const d = camera.position.distanceTo(keyItem.position);
    if (d < 3) { showPrompt = true; promptText = '[E] TAKE KEY'; }
  }
  
  if (hasKey && exitDoor) {
    const d = camera.position.distanceTo(exitDoor.position);
    if (d < 4) { showPrompt = true; promptText = '[E] ESCAPE!'; }
  }
  
  prompt.style.display = showPrompt ? 'block' : 'none';
  prompt.textContent = promptText;
}

// ═══════════════════════════════════════════════════
//  MINIMAP
// ═══════════════════════════════════════════════════

function updateMinimap() {
  const canvas = document.getElementById('minimap');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx || !backrooms || !backrooms.isLoaded) return;
  
  const now = Date.now();
  
  // ─── BACKGROUND & TECH GRID ───
  ctx.fillStyle = '#050505';
  ctx.fillRect(0, 0, 180, 180);
  
  // Grid lines
  ctx.strokeStyle = '#111';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 180; i += 20) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 180); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(180, i); ctx.stroke();
  }
  
  const cx = 90;
  const cy = 90;
  const scale = 0.8;
  
  // ─── RADAR SWEEP EFFECT ───
  const sweepAngle = (now * 0.0025) % (Math.PI * 2);
  const grad = ctx.createConicGradient(sweepAngle, cx, cy);
  grad.addColorStop(0, 'rgba(0, 255, 0, 0.15)');
  grad.addColorStop(0.1, 'rgba(0, 255, 0, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath(); ctx.arc(cx, cy, 85, 0, Math.PI * 2); ctx.fill();

  // Helper for professional markers
  const drawMarker = (worldX, worldZ, color, iconType) => {
    let dx = (worldX - camera.position.x) * scale;
    let dy = (worldZ - camera.position.z) * scale;
    const limit = 82;
    const dist = Math.sqrt(dx*dx + dy*dy);
    const isOff = dist > limit;
    
    if (isOff) {
      dx *= limit / dist;
      dy *= limit / dist;
    }
    
    const mx = cx + dx;
    const my = cy + dy;
    
    ctx.save();
    ctx.translate(mx, my);
    
    // Draw Marker
    ctx.fillStyle = color;
    ctx.shadowBlur = isOff ? 4 : 10;
    ctx.shadowColor = color;
    
    if (isOff) {
      // Directional arrow pointer
      ctx.rotate(Math.atan2(dy, dx));
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-10, -5);
      ctx.lineTo(-10, 5);
      ctx.fill();
    } else {
      // Proximity icon
      ctx.beginPath();
      if (iconType === 'ghost') {
        ctx.arc(0, 0, 6, 0, 7); // Skull-ish
      } else if (iconType === 'key') {
        ctx.rect(-4, -4, 8, 8); // Square key
      } else {
        ctx.rect(-6, -6, 12, 12); // Door
      }
      ctx.fill();
    }
    ctx.restore();
    return { mx, my, isOff };
  };

  // 1. Draw Walls (Subtle)
  ctx.fillStyle = '#222';
  backrooms.getWallMeshes().forEach(mesh => {
     const mx = cx + (mesh.position.x - camera.position.x) * scale;
     const my = cy + (mesh.position.z - camera.position.z) * scale;
     if (mx > 5 && mx < 175 && my > 5 && my < 175) {
       ctx.fillRect(mx - 2, my - 2, 4, 4);
     }
  });

  // 2. FOV Cone
  ctx.fillStyle = 'rgba(0, 255, 255, 0.08)';
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.sin(yaw - 0.4) * 60, cy + Math.cos(yaw - 0.4) * 60);
  ctx.lineTo(cx + Math.sin(yaw + 0.4) * 60, cy + Math.cos(yaw + 0.4) * 60);
  ctx.fill();
  
  // 3. EXIT Marker
  if (exitDoor) {
    drawMarker(exitDoor.position.x, exitDoor.position.z, hasKey ? '#0f0' : '#113311', 'door');
  }
  
  // 4. KEY Marker
  if (!hasKey && keyItem) {
    drawMarker(keyItem.position.x, keyItem.position.z, '#FFD700', 'key');
  }
  
  // 5. GHOST Marker
  if (ghost) {
    const pulse = Math.sin(now * 0.01) * 0.4 + 0.6;
    const isHunting = ghost.state === 'Hunting' || ghost.state === 'Frenzy';
    const ghostColor = isHunting ? `rgba(255, 0, 0, ${pulse})` : `rgba(255, 50, 50, 0.6)`;
    const m = drawMarker(ghost.position.x, ghost.position.z, ghostColor, 'ghost');
    
    if (isHunting && !m.isOff) {
      ctx.strokeStyle = '#f00';
      ctx.setLineDash([2, 4]);
      ctx.beginPath(); ctx.arc(m.mx, m.my, 15 + Math.sin(now*0.02)*5, 0, 7); ctx.stroke();
      ctx.setLineDash([]);
    }
  }
  
  // 6. PLAYER (Center)
  ctx.fillStyle = '#00f2ff';
  ctx.shadowBlur = 15; ctx.shadowColor = '#00f2ff';
  ctx.beginPath(); ctx.arc(cx, cy, 4, 0, 7); ctx.fill();
  ctx.restore();
  
  // Scanlines overlay
  ctx.fillStyle = 'rgba(0,0,0,0.1)';
  for (let i = 0; i < 180; i += 4) {
    ctx.fillRect(0, i, 180, 1);
  }
  
  // HUD Border
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 2;
  ctx.strokeRect(0, 0, 180, 180);
}

// ═══════════════════════════════════════════════════
//  BOOT
// ═══════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', init);