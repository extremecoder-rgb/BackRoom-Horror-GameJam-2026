import * as THREE from 'three';
import { createScene } from './game/scene.js';
import { createRenderer } from './game/renderer.js';

/**
 * SPECTRA - Browser-based Multiplayer Horror Investigation
 * Entry point with game loop
 */

// Scene setup
const scene = createScene();
const canvas = document.getElementById('game-canvas');
const renderer = createRenderer(canvas);

// Camera setup - first person perspective
const camera = new THREE.PerspectiveCamera(
  75, // FOV
  window.innerWidth / window.innerHeight, // aspect
  0.1, // near
  100 // far
);
camera.position.set(0, 1.6, 3); // Player height

// Handle window resize
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', onWindowResize);

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}

// Start the game
animate();

console.log('SPECTRA initialized');