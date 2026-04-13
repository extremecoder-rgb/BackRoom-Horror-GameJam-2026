import * as THREE from 'three';

/**
 * Create the Three.js scene with atmospheric horror setup
 */
export function createScene() {
  const scene = new THREE.Scene();
  
  // Horror atmosphere - dense black fog
  scene.fog = new THREE.FogExp2(0x000000, 0.035);
  scene.background = new THREE.Color(0x000000);
  
  // Ambient light - near-black blue tint for eerie atmosphere
  const ambientLight = new THREE.AmbientLight(0x0a0a1a, 0.15);
  scene.add(ambientLight);
  
  // Create test floor
  const floorGeometry = new THREE.PlaneGeometry(20, 20);
  const floorMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x1a1a1a,
    roughness: 0.9,
    metalness: 0.1
  });
  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
  
  // Add test cube for visual verification
  const cubeGeometry = new THREE.BoxGeometry(1, 1, 1);
  const cubeMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x333333,
    roughness: 0.5,
    metalness: 0.5
  });
  const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
  cube.position.set(0, 0.5, -3);
  cube.castShadow = true;
  scene.add(cube);
  
  // Add test walls for depth
  const wallGeometry = new THREE.PlaneGeometry(20, 4);
  const wallMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x222222,
    roughness: 0.9
  });
  
  const backWall = new THREE.Mesh(wallGeometry, wallMaterial);
  backWall.position.set(0, 2, -10);
  scene.add(backWall);
  
  const leftWall = new THREE.Mesh(wallGeometry, wallMaterial);
  leftWall.position.set(-10, 2, 0);
  leftWall.rotation.y = Math.PI / 2;
  scene.add(leftWall);
  
  const rightWall = new THREE.Mesh(wallGeometry, wallMaterial);
  rightWall.position.set(10, 2, 0);
  rightWall.rotation.y = -Math.PI / 2;
  scene.add(rightWall);
  
  return scene;
}