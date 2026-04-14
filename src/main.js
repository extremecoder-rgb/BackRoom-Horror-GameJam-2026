import * as THREE from 'three';
import { createRenderer } from './game/renderer.js';
import { setupAtmosphere } from './environment/lighting.js';
import { PostProcessor } from './environment/post-processing.js';
import { AudioEngine } from './audio/AudioEngine.js';
import lobbyUI from './ui/lobby.js';
import { Backrooms } from './environment/Backrooms.js';

/**
 * BACKROOMS - Level 0: The Lobby
 * 
 * HOW TO WIN: Find the key, then find the exit door and press E to escape!
 * HOW TO LOSE: Get caught by the ghost OR sanity drops to 0!
 */

let renderer, scene, camera, postProcessor, ghost, audioEngine, flashlight, torchPoint, backrooms;
let lastTime = 0;
let gameActive = false;
let gameWon = false;
let localPlayer = { position: new THREE.Vector3(), sanity: 100, alive: true };
let hud = null;
let gates = [];
window.gameGates = gates;
let entered = false;
let hasKey = false;
let keyItem = null;
let exitDoor = null;
const raycaster = new THREE.Raycaster();
const interactionDistance = 8;

// Controls
const keys = {};
let yaw = 0, pitch = 0, pointerLocked = false;
const WALK_SPEED = 8;
const SPRINT_SPEED = 14;

// Reusable collision objects to avoid memory leaks
const playerBox = new THREE.Box3();
const wallBox = new THREE.Box3();

async function init() {
  const canvas = document.getElementById('game-canvas');
  if (!canvas) return;
  
  renderer = createRenderer(canvas);
  scene = new THREE.Scene();
  setupAtmosphere(scene);
  
  audioEngine = new AudioEngine();
  
  // Build Backrooms Level 0
  backrooms = new Backrooms(scene);
  gates = [];
  window.gameGates = gates; 
  
  // Strong ambient light to ensure walls are visible
  const ambient = new THREE.AmbientLight(0xffffcc, 0.8);
  scene.add(ambient);
  
  // Add more area lights for better coverage (grid pattern)
  const areaLightPositions = [
    [0, 3.3, 0], [40, 3.3, 40], [-40, 3.3, 40], [40, 3.3, -40],
    [-40, 3.3, -40], [0, 3.3, 40], [40, 3.3, 0], [-40, 3.3, 0],
    [0, 3.3, -40], [60, 3.3, 0], [-60, 3.3, 0], [0, 3.3, 60],
    [0, 3.3, -60], [20, 3.3, 20], [-20, 3.3, -20], [20, 3.3, -20]
  ];
  areaLightPositions.forEach(pos => {
    const light = new THREE.PointLight(0xFFFDD0, 3, 40, 1);
    light.position.set(pos[0], pos[1], pos[2]);
    scene.add(light);
  });

  console.log('Backrooms Level 0 ready');

  // ─── CAMERA ───
  // Camera at eye-level (1.7m), inside the maze
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 500);
  camera.position.set(4, 1.7, 4);
  scene.add(camera);

  // Flashlight attached to camera
  flashlight = new THREE.SpotLight(0xffffff, 50, 60, Math.PI / 4, 0.4);
  camera.add(flashlight);
  camera.add(flashlight.target);
  flashlight.target.position.set(0, 0, -1);
  
  // Close-range torch glow
  torchPoint = new THREE.PointLight(0xffffee, 3, 8);
  camera.add(torchPoint);

  // ─── GHOST (THE ENTITY) ───
  // Ghost starts far away from player for fair gameplay
  const { Ghost } = await import('./ghost/Ghost.js');
  ghost = new Ghost(scene);
  // Ghost spawns at (-32, 1.5, 32)
  ghost.position.set(-32, 1.5, 32);
  ghost.setAudio(audioEngine);
  ghost.onKill = () => {
    gameActive = false;
    document.exitPointerLock();
    if (audioEngine) audioEngine.playGhostScream();
    showDeathScreen();
  };

  // ─── KEY ITEM ───
  // Key at center area (in clear zone)
  const keyGeo = new THREE.BoxGeometry(0.4, 0.15, 0.1);
  const keyMat = new THREE.MeshStandardMaterial({ 
    color: 0xFFD700,
    emissive: 0xFFD700,
    emissiveIntensity: 0.8
  });
  keyItem = new THREE.Mesh(keyGeo, keyMat);
  // Key at (8, 8) - inside maze near player start
  keyItem.position.set(88, 0.5, 88);
  keyItem.userData.isKey = true;
  scene.add(keyItem);
  
  // Key glow
  const keyLight = new THREE.PointLight(0xFFD700, 2, 10);
  keyLight.position.set(88, 1, 88);
  scene.add(keyLight);

  // ─── EXIT DOOR ───
  // Exit far from key at (-32, -32)
  const doorGeo = new THREE.BoxGeometry(2.5, 3.5, 0.3);
  const doorMat = new THREE.MeshStandardMaterial({ 
    color: 0x224422,
    emissive: 0x00ff00,
    emissiveIntensity: 0.3
  });
  exitDoor = new THREE.Mesh(doorGeo, doorMat);
  exitDoor.position.set(50, 1.75, 50);
  exitDoor.userData.isExit = true;
  scene.add(exitDoor);

  // Exit sign
  const exitSignGeo = new THREE.PlaneGeometry(2, 0.8);
  const exitSignMat = new THREE.MeshBasicMaterial({ color: 0x00FF00 });
  const exitSign = new THREE.Mesh(exitSignGeo, exitSignMat);
  exitSign.position.set(50, 3.5, 50);
  exitDoor.userData.sign = exitSign;
  scene.add(exitSign);
  
  // Exit glow
  const exitLight = new THREE.PointLight(0x00ff00, 3, 15);
  exitLight.position.set(50, 2, 50);
  scene.add(exitLight);

  // Post-processing (subtle) - wrapped in try-catch to prevent crashes
  try {
    postProcessor = new PostProcessor(renderer, scene, camera);
  } catch (e) {
    console.warn('Post-processing failed to initialize, using fallback renderer:', e);
    postProcessor = null;
  }
  createHUD();
  setupControls(canvas);
  
  // Handle resize
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    if (postProcessor) postProcessor.resize(window.innerWidth, window.innerHeight);
  });
  
  lastTime = performance.now();
  requestAnimationFrame(animate);
  showStartScreen();
}

function createHUD() {
  hud = document.createElement('div');
  hud.className = 'horror-hud';
  hud.style.display = 'none';
  hud.innerHTML = `
    <!-- LARGER SIMPLER MINIMAP -->
    <div style="position:absolute;top:20px;left:20px;width:200px;height:200px;background:rgba(0,0,0,0.8);border:3px solid #333;border-radius:10px;">
      <canvas id="minimap" width="200" height="200"></canvas>
    </div>
    
    <!-- DIRECTION ARROW (simple!) -->
    <div id="direction-hint" style="position:absolute;top:230px;left:20px;color:#0f0;font-size:14px;background:rgba(0,0,0,0.7);padding:5px 10px;border-radius:5px;">
      ➡️ HEAD TO EXIT
    </div>
    
    <!-- DISTANCE TO EXIT (BIG!) -->
    <div id="exit-distance" style="position:absolute;top:20px;left:230px;color:#0f0;font-size:28px;background:rgba(0,0,0,0.7);padding:10px 15px;border-radius:5px;border:2px solid #0f0;">
      EXIT: <span id="exit-dist">???</span>m
    </div>
    
    <!-- DISTANCE TO KEY -->
    <div id="key-distance" style="position:absolute;top:70px;left:230px;color:#ffd700;font-size:20px;background:rgba(0,0,0,0.7);padding:8px 12px;border-radius:5px;">
      KEY: <span id="key-dist">???</span>m
    </div>
    
    <!-- DISTANCE TO GHOST -->
    <div id="ghost-distance" style="position:absolute;top:115px;left:230px;color:#f00;font-size:20px;background:rgba(0,0,0,0.7);padding:8px 12px;border-radius:5px;">
      👻 <span id="ghost-dist">???</span>m
    </div>
    
    <!-- SANITY -->
    <div id="hud-sanity-container" style="position:absolute;top:170px;left:230px;color:#0f0;font-size:22px;background:rgba(0,0,0,0.7);padding:8px 12px;border-radius:5px;">
      SANITY: <span id="hud-sanity">100</span>%
    </div>
    
    <!-- OBJECTIVE -->
    <div id="objective-container" style="position:absolute;top:210px;left:230px;color:#ffd700;font-size:16px;">
      <div id="key-status">🔒 FIND KEY FIRST</div>
    </div>
    
    <!-- INTERACTION PROMPT -->
    <div id="interaction-prompt" style="position:absolute;top:60%;left:50%;translate(-50%, -50%);color:#fff;font-size:24px;background:rgba(0,0,0,0.9);padding:15px 30px;display:none;border:3px solid #fff;border-radius:10px;font-weight:bold;">
      [E] INTERACT
    </div>
    
    <!-- TORCH STATUS -->
    <div id="torch-indicator" style="position:absolute;top:250px;left:230px;color:#ff0;font-size:16px;background:rgba(0,0,0,0.7);padding:8px 12px;border-radius:5px;">
      🔦 ON
    </div>
    
    <!-- CONTROLS HINT -->
    <div style="position:absolute;bottom:20px;left:50%;translate(-50%, -50%);color:#fff;text-align:center;font-size:14px;background:rgba(0,0,0,0.8);padding:10px 20px;border-radius:5px;">
      WASD move • SHIFT run • F light • E interact
    </div>
  `;
  document.body.appendChild(hud);
}

function showStartScreen() {
  const startScreen = document.createElement('div');
  startScreen.id = 'start-screen';
  startScreen.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:#0a0a05;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:9999;font-family:Arial,sans-serif;overflow:auto;padding:20px;';
  
  const sectionStyle = 'background:rgba(30,30,20,0.9);padding:25px;border-radius:10px;border:1px solid #444;margin:10px;min-width:280px;';
  const titleStyle = 'color:#FFD700;font-size:22px;margin:0 0 15px 0;border-bottom:1px solid #444;padding-bottom:10px;';
  const itemStyle = 'padding:8px 0;font-size:15px;border-bottom:1px solid #222;';
  
  startScreen.innerHTML = `
    <div style="text-align:center;margin-bottom:20px;">
      <h1 style="font-size:3.5rem;color:#ACA67E;margin:0;">BACKROOMS</h1>
      <h2 style="font-size:1.5rem;color:#888;margin:10px 0 0 0;">Level 0: The Lobby</h2>
    </div>
    
    <div style="display:flex;flex-wrap:wrap;justify-content:center;max-width:900px;">
      <!-- CONTROLS SECTION -->
      <div style="${sectionStyle}">
        <h3 style="${titleStyle}">🎮 CONTROLS</h3>
        <div style="${itemStyle}"><b>W A S D</b> - Move around</div>
        <div style="${itemStyle}"><b>SHIFT</b> - Sprint (hold)</div>
        <div style="${itemStyle}"><b>F</b> - Toggle Flashlight</div>
        <div style="${itemStyle}"><b>E</b> - Interact / Pick up</div>
        <div style="${itemStyle}"><b>Mouse</b> - Look around</div>
        <div style="${itemStyle}"><b>Click</b> - Lock mouse</div>
      </div>
      
      <!-- OBJECTIVE SECTION -->
      <div style="${sectionStyle}">
        <h3 style="${titleStyle}">🎯 OBJECTIVE</h3>
        <div style="${itemStyle}">🔑 Find the <b>GOLDEN KEY</b></div>
        <div style="${itemStyle}">🚪 Go to <b>EXIT DOOR</b></div>
        <div style="${itemStyle}">⏰ Press <b>E</b> to <b>ESCAPE!</b></div>
        <div style="${itemStyle}color:#888;font-style:italic;">Find the key, then find the exit!</div>
      </div>
      
      <!-- RULES SECTION -->
      <div style="${sectionStyle}">
        <h3 style="${titleStyle}color:#ff6666;">⚠️ RULES</h3>
        <div style="${itemStyle}color:#ffaa00;">🔦 Keep flashlight <b>ON</b></div>
        <div style="${itemStyle}color:#ffaa00;">👻 Avoid the <b>GHOST</b></div>
        <div style="${itemStyle}color:#ff6666;">💀 Sanity = 0 → <b>INSANE</b></div>
        <div style="${itemStyle}color:#ff6666;">☠️ Ghost catches → <b>DEAD</b></div>
      </div>
    </div>
    
    <button id="start-btn" style="padding:20px 60px;margin-top:30px;cursor:pointer;font-size:1.5rem;background:#ACA67E;border:none;border-radius:5px;color:#000;font-weight:bold;transition:0.2s;">▶ START GAME</button>
    
    <p style="margin-top:20px;color:#666;font-size:14px;">
      Click on game screen to lock mouse • Press ESC to unlock
    </p>
  `;
  
  document.body.appendChild(startScreen);
  
  // Add click handler
  document.getElementById('start-btn').onclick = startGame;
}

function startGame() {
  const startScreen = document.getElementById('start-screen');
  if (startScreen) startScreen.remove();
  if (hud) hud.style.display = 'block';
  gameActive = true;
  if (ghost) ghost.state = 'Roaming';
}

function setupControls(canvas) {
  window.addEventListener('keydown', e => keys[e.code] = true);
  window.addEventListener('keyup', e => keys[e.code] = false);
  canvas.addEventListener('click', () => { 
    if(gameActive) canvas.requestPointerLock(); 
    if(!audioEngine.initialized) {
        audioEngine.init().then(() => {
            audioEngine.playFluorescentHum();
        });
    }
  });
  document.addEventListener('pointerlockchange', () => pointerLocked = !!document.pointerLockElement);
  document.addEventListener('mousemove', e => {
    if (!pointerLocked || !gameActive) return;
    yaw -= e.movementX * 0.002;
    pitch -= e.movementY * 0.002;
    pitch = Math.max(-1.2, Math.min(1.2, pitch));
  });
  
  window.addEventListener('keydown', e => {
    if (e.code === 'KeyE' && gameActive) checkInteraction();
    if (e.code === 'KeyF' && gameActive) toggleFlashlight();
    if (e.code === 'Escape' && gameActive && !gameWon) showPauseMenu();
  });
}

function checkInteraction() {
  if (gameWon || !gameActive) return;
  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
  
  // Check for key pickup
  if (!hasKey && keyItem) {
    const keyDist = camera.position.distanceTo(keyItem.position);
    if (keyDist < 3.5) {
      hasKey = true;
      scene.remove(keyItem);
      keyItem = null;
      // Update door to show it's now unlocked
      if (exitDoor) {
        exitDoor.material.color.setHex(0x00FF00); // Bright green
        exitDoor.material.emissive.setHex(0x00FF00);
        exitDoor.material.emissiveIntensity = 0.5;
        if (exitDoor.userData.sign) {
          exitDoor.userData.sign.material.color.setHex(0xFFDD00); // Yellow for "ready"
        }
      }
      // Update HUD
      const keyStatus = document.getElementById('key-status');
      if (keyStatus) {
        keyStatus.innerHTML = '🔓 KEY FOUND! FIND THE EXIT!';
        keyStatus.style.color = '#0f0';
      }
      return;
    }
  }
  
  // Check for exit door interaction
  if (exitDoor && hasKey) {
    const doorDist = camera.position.distanceTo(exitDoor.position);
    if (doorDist < 4.5) {
      winGame();
      return;
    }
  }
  
  // Check for gates/doors
  const intersects = raycaster.intersectObjects(gates, true);
  if (intersects.length > 0 && intersects[0].distance < interactionDistance) {
    const obj = intersects[0].object;
    let target = obj;
    while (target.parent && !target.userData.isGate) target = target.parent;
    target.rotation.y += Math.PI / 2;
    if (audioEngine) audioEngine.playDoorCreak();
  }
}

function winGame() {
  gameWon = true;
  gameActive = false;
  document.exitPointerLock();
  showWinScreen();
}

function showWinScreen() {
  const w = document.createElement('div');
  w.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:#020;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:10000;font-family:Arial,sans-serif;';
  w.innerHTML = '<h1 style="font-size:5rem;color:#00ff00;">ESCAPED!</h1><p>You found the exit and escaped the Backrooms!</p><button onclick="location.reload()" style="padding:15px 30px;margin:10px;cursor:pointer;font-size:1.2rem;background:#00aa00;color:#fff;border:none;border-radius:5px;">PLAY AGAIN</button><button onclick="goToMenu()" style="padding:15px 30px;margin:10px;cursor:pointer;font-size:1.2rem;background:#444;color:#fff;border:none;border-radius:5px;">MAIN MENU</button>';
  document.body.appendChild(w);
}

function toggleFlashlight() {
    if (!flashlight) return;
    flashlight.visible = !flashlight.visible;
    if (torchPoint) torchPoint.visible = flashlight.visible;
    
    const indicator = document.getElementById('torch-indicator');
    if (indicator) {
        indicator.textContent = flashlight.visible ? '🔦 ON' : '🔦 OFF';
        indicator.style.color = flashlight.visible ? '#ff0' : '#888';
    }
}

function animate(time) {
  requestAnimationFrame(animate);
  const dt = Math.min((time - lastTime) / 1000, 0.1);
  lastTime = time;

  if (gameActive && localPlayer.alive) {
    // Camera rotation
    camera.quaternion.setFromEuler(new THREE.Euler(pitch, yaw, 0, 'YXZ'));
    
    // Movement
    const dir = new THREE.Vector3(0,0,0);
    if(keys.KeyW) dir.z -= 1; 
    if(keys.KeyS) dir.z += 1;
    if(keys.KeyA) dir.x -= 1; 
    if(keys.KeyD) dir.x += 1;
    
    if(dir.lengthSq() > 0) {
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0));
      dir.applyQuaternion(q).normalize();
      
      const speed = (keys.ShiftLeft ? SPRINT_SPEED : WALK_SPEED) * dt;
      const nextPos = camera.position.clone().add(dir.clone().multiplyScalar(speed));
      
      // Keep at eye level
      nextPos.y = 1.7;
      
      // Collision with walls
      let collision = false;
      if (backrooms && backrooms.walls) {
          playerBox.setFromCenterAndSize(nextPos, new THREE.Vector3(0.6, 1.6, 0.6));
          for (const wall of backrooms.walls) {
              wallBox.setFromObject(wall);
              if (wallBox.intersectsBox(playerBox)) {
                  collision = true;
                  break;
              }
          }
      }
      
      if (!collision) {
          camera.position.copy(nextPos);
      }
    }
    localPlayer.position.copy(camera.position);
    
    // Sanity drain when flashlight is off (make it fair - player has time to react)
    if (!flashlight || !flashlight.visible) {
        localPlayer.sanity -= dt * 0.3;
    }
    
    // Show proximity prompts
    updateProximityPrompts();
    
    // Update minimap
    updateMinimap();
    
    // Entry trigger - activate ghost once player enters
    if (!entered) { 
        entered = true;
        if (ghost) {
            ghost.state = 'Roaming'; 
        }
    }

    // Ghost update
    if (ghost) {
        ghost.update(dt, [localPlayer]);
        
        // Subtle flicker when ghost is chasing
        if (ghost.state === 'Chasing' && postProcessor) {
            postProcessor.triggerFlicker(0.3);
            if (flashlight && Math.random() < 0.08) {
                flashlight.intensity = Math.random() < 0.3 ? 5 : 50;
            }
        } else if (flashlight) {
            flashlight.intensity = flashlight.visible ? 50 : 0;
        }
    }
    
    const sanityEl = document.getElementById('hud-sanity');
    if (sanityEl) sanityEl.textContent = Math.max(0, Math.round(localPlayer.sanity));
    
    // Sanity check - die if sanity reaches 0 (go crazy from fear!)
    if (localPlayer.sanity <= 0 && localPlayer.alive) {
        localPlayer.alive = false;
        localPlayer.sanity = 0;
        showSanityDeath();
    }
  }

  // Render with fallback if postProcessor fails
  try {
    if (postProcessor) {
      postProcessor.update(dt);
      postProcessor.render();
    } else {
      renderer.render(scene, camera);
    }
  } catch (e) {
    console.error('Render failed:', e);
    renderer.render(scene, camera);
  }
}

function updateProximityPrompts() {
  if (gameWon || !gameActive) return;
  
  const prompt = document.getElementById('interaction-prompt');
  if (!prompt) return;
  
  let showPrompt = false;
  let promptText = '';
  
  // Check for key proximity
  if (!hasKey && keyItem) {
    const keyDist = camera.position.distanceTo(keyItem.position);
    if (keyDist < 3) {
      showPrompt = true;
      promptText = '[E] TAKE KEY';
    }
  }
  
  // Check for exit proximity
  if (hasKey && exitDoor) {
    const doorDist = camera.position.distanceTo(exitDoor.position);
    if (doorDist < 4) {
      showPrompt = true;
      promptText = '[E] ESCAPE!';
    }
  }
  
  if (showPrompt) {
    prompt.textContent = promptText;
    prompt.style.display = 'block';
  } else {
    prompt.style.display = 'none';
  }
}

function updateMinimap() {
  const canvas = document.getElementById('minimap');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  
  // Clear - simple dark background
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, 200, 200);
  
  // Map scale - zoom in more (world: -100 to 100 fits in 200px)
  const scale = 1.0;
  const offset = 100;
  
  const toMinimap = (val) => val * scale + offset;
  
  // Draw PLAYER (blue) - always in center!
  const px = toMinimap(camera.position.x);
  const py = toMinimap(camera.position.z);
  const cx = 100; // center of minimap
  const cy = 100;
  
  // Everything relative to player!
  // EXIT (green square)
  if (exitDoor) {
    const ex = cx + (exitDoor.position.x - camera.position.x);
    const ey = cy + (exitDoor.position.z - camera.position.z);
    ctx.fillStyle = hasKey ? '#00ff00' : '#004400';
    ctx.fillRect(ex - 6, ey - 6, 12, 12);
  }
  
  // KEY (gold circle)
  if (!hasKey && keyItem) {
    const kx = cx + (keyItem.position.x - camera.position.x);
    const ky = cy + (keyItem.position.z - camera.position.z);
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(kx, ky, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  
  // GHOST (red circle)
  if (ghost) {
    const gx = cx + (ghost.position.x - camera.position.x);
    const gy = cy + (ghost.position.z - camera.position.z);
    const dist = camera.position.distanceTo(ghost.position);
    const size = dist < 20 ? 8 : 4;
    ctx.fillStyle = dist < 15 ? '#ff0000' : '#660000';
    ctx.beginPath();
    ctx.arc(gx, gy, size, 0, Math.PI * 2);
    ctx.fill();
  }
  
  // PLAYER in center (blue)
  ctx.fillStyle = '#0088ff';
  ctx.beginPath();
  ctx.arc(cx, cy, 5, 0, Math.PI * 2);
  ctx.fill();
  
  // Player direction line
  ctx.strokeStyle = '#0088ff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.sin(yaw) * 10, cy + Math.cos(yaw) * 10);
  ctx.stroke();
  
  // Update distance text
  const exitDist = document.getElementById('exit-dist');
  const keyDist = document.getElementById('key-dist');
  const ghostDist = document.getElementById('ghost-dist');
  const keyStatus = document.getElementById('key-status');
  const exitDistance = document.getElementById('exit-distance');
  
  if (exitDoor && exitDist) {
    const d = Math.round(camera.position.distanceTo(exitDoor.position));
    exitDist.textContent = hasKey ? d + ' ⬅️' : 'LOCKED';
    exitDistance.style.borderColor = hasKey ? '#0f0' : '#444';
  }
  
  if (!hasKey && keyItem && keyDist) {
    keyDist.textContent = Math.round(camera.position.distanceTo(keyItem.position));
  } else if (keyDist) {
    keyDist.textContent = '✓ GOT';
  }
  
  if (ghost && ghostDist) {
    const d = Math.round(camera.position.distanceTo(ghost.position));
    ghostDist.textContent = d < 20 ? 'RUN!' : d;
    ghostDist.parentElement.style.color = d < 15 ? '#ff0000' : '#f00';
  }
  
  if (keyStatus) {
    if (hasKey) {
      keyStatus.innerHTML = '✅ KEY FOUND!';
      keyStatus.style.color = '#0f0';
    }
  }
}

function showDeathScreen() {
  const d = document.createElement('div');
  d.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:#200;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:10000;font-family:Arial,sans-serif;';
  d.innerHTML = '<h1 style="font-size:5rem;color:#aa0000;">CAUGHT!</h1><p>The entity found you.</p><button onclick="location.reload()" style="padding:15px 30px;margin:10px;cursor:pointer;font-size:1.2rem;background:#aa0000;color:#fff;border:none;border-radius:5px;">TRY AGAIN</button><button onclick="goToMenu()" style="padding:15px 30px;margin:10px;cursor:pointer;font-size:1.2rem;background:#444;color:#fff;border:none;border-radius:5px;">MAIN MENU</button>';
  document.body.appendChild(d);
}

function showSanityDeath() {
  gameActive = false;
  document.exitPointerLock();
  const d = document.createElement('div');
  d.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:#111;color:#888;display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:10000;font-family:Arial,sans-serif;';
  d.innerHTML = '<h1 style="font-size:4rem;color:#444;">INSANITY</h1><p>You lost your mind in the Backrooms...</p><p style="font-size:14px;color:#666;">Keep your flashlight on and find the exit quickly!</p><button onclick="location.reload()" style="padding:15px 30px;margin:10px;cursor:pointer;font-size:1.2rem;background:#444;color:#fff;border:none;border-radius:5px;">TRY AGAIN</button><button onclick="goToMenu()" style="padding:15px 30px;margin:10px;cursor:pointer;font-size:1.2rem;background:#444;color:#fff;border:none;border-radius:5px;">MAIN MENU</button>';
  document.body.appendChild(d);
}

function goToMenu() {
  location.reload();
}

let pauseMenuShown = false;
function showPauseMenu() {
  if (pauseMenuShown) return;
  pauseMenuShown = true;
  
  // Unlock mouse first
  document.exitPointerLock();
  
  const p = document.createElement('div');
  p.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:9999;font-family:Arial,sans-serif;';
  p.innerHTML = `
    <h1 style="font-size:3rem;color:#ACA67E;">PAUSED</h1>
    <button onclick="resumeGame()" style="padding:15px 40px;margin:10px;cursor:pointer;font-size:1.2rem;background:#ACA67E;color:#000;border:none;border-radius:5px;font-weight:bold;">RESUME</button>
    <button onclick="location.reload()" style="padding:15px 40px;margin:10px;cursor:pointer;font-size:1.2rem;background:#444;color:#fff;border:none;border-radius:5px;">RESTART</button>
    <button onclick="goToMenu()" style="padding:15px 40px;margin:10px;cursor:pointer;font-size:1.2rem;background:#222;color:#888;border:none;border-radius:5px;">MAIN MENU</button>
  `;
  p.id = 'pause-menu';
  document.body.appendChild(p);
  
  // Close on click anywhere
  p.onclick = resumeGame;
}

function resumeGame() {
  const p = document.getElementById('pause-menu');
  if (p) p.remove();
  pauseMenuShown = false;
  
  // Re-lock mouse
  const canvas = document.getElementById('game-canvas');
  if (canvas && gameActive && !gameWon) {
    canvas.requestPointerLock();
  }
  
  // Resume ghost activity
  if (ghost && !entered) {
    ghost.state = 'Roaming';
  }
}

document.addEventListener('DOMContentLoaded', init);