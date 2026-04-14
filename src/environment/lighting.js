import * as THREE from 'three';

/**
 * Backrooms Level 0 - Atmosphere Setup
 * Bright, sickly fluorescent lighting with no fog
 */
export function setupAtmosphere(scene) {
  scene.fog = null;
  // Use a muted yellow-beige background (visible but not overwhelming)
  scene.background = new THREE.Color(0xACA67E);
}