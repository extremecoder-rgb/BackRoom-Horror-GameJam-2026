import * as THREE from 'three';
import { createRenderer } from './game/renderer.js';
import { MapGenerator } from './environment/map-generator.js';
import { setupAtmosphere, createMoonlight, createCandles } from './environment/lighting.js';
import { PostProcessor } from './environment/post-processing.js';
import networkClient from './network/client.js';
import lobbyUI from './ui/lobby.js';

/**
 * SPECTRA - Browser-based Multiplayer Horror Investigation
 * Entry point with game loop
 */

// Global state
let renderer, scene, camera, postProcessor;
let mapGenerator;
let candles = [];
let lastTime = 0;

// Initialize game
async function init() {
  // Create renderer first
  const canvas = document.getElementById('game-canvas');
  if (!canvas) {
    console.error('Canvas not found!');
    return;
  }
  renderer = createRenderer(canvas);

  // Create scene
  scene = new THREE.Scene();
  
  // Setup atmosphere (fog, ambient light)
  setupAtmosphere(scene);
  
  // Generate procedural map
  mapGenerator = new MapGenerator('spectra');
  const mapData = mapGenerator.generate();
  mapGenerator.render(scene);
  
  // Add moonlight through windows
  const windowPositions = [
    { pos: new THREE.Vector3(-0.5, 3, 5), target: new THREE.Vector3(0, 0, 5) },
    { pos: new THREE.Vector3(-0.5, 3, 10), target: new THREE.Vector3(0, 0, 10) },
    { pos: new THREE.Vector3(-0.5, 7, 5), target: new THREE.Vector3(0, 4, 5) }
  ];
  for (const wp of windowPositions) {
    const moonlight = createMoonlight(wp.pos, wp.target);
    if (moonlight) scene.add(moonlight);
  }
  
  // Add flickering candles
  candles = createCandles(mapData, scene, 8);
  
  // Setup camera
  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  camera.position.set(5, 5.6, 5); // Start in ground floor

  // Setup post-processing
  postProcessor = new PostProcessor(renderer, scene, camera);
  
  // Handle resize
  window.addEventListener('resize', onWindowResize);
  
  // Initialize lobby UI
  lobbyUI.init();
  
  // Start animation loop
  animate();
  
  console.log('SPECTRA initialized');
}

// Handle window resize
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  if (postProcessor) {
    postProcessor.resize(window.innerWidth, window.innerHeight);
  }
}

// Animation loop
function animate(time) {
  requestAnimationFrame(animate);
  
  const deltaTime = (time - lastTime) / 1000;
  lastTime = time;
  const dt = Math.min(deltaTime, 0.1); // Cap at 100ms
  
  // Update candle flickering
  for (const candle of candles) {
    candle.update(dt);
  }
  
  // Update post-processing
  if (postProcessor) {
    postProcessor.update(deltaTime);
    postProcessor.render();
  } else {
    renderer.render(scene, camera);
  }
}

// Start the game when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}