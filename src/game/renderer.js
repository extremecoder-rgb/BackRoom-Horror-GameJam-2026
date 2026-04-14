import * as THREE from 'three';

/**
 * Create the WebGL renderer
 */
export function createRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({ 
    canvas: canvas,
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance'
  });
  
  // Shadows OFF for performance (hundreds of lights)
  renderer.shadowMap.enabled = false;
  
  // Use LinearToneMapping with high exposure for bright fluorescent look
  renderer.toneMapping = THREE.LinearToneMapping;
  renderer.toneMappingExposure = 1.5;
  
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  
  // Handle WebGL context loss to prevent black screen
  renderer.domElement.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    console.warn('WebGL context lost - attempting recovery...');
  });
  
  renderer.domElement.addEventListener('webglcontextrestored', () => {
    console.log('WebGL context restored');
  });
  
  return renderer;
}