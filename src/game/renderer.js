import * as THREE from 'three';

/**
 * Create the WebGL renderer with optimized settings for horror atmosphere
 */
export function createRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({ 
    canvas: canvas,
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance'
  });
  
  // Enable shadows for flashlight
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  
  // Tone mapping for cinematic look
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  
  // Set output encoding
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  
  // Set pixel ratio for sharp rendering
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  
  // Set default size
  renderer.setSize(window.innerWidth, window.innerHeight);
  
  return renderer;
}