import * as THREE from 'three';

/**
 * Seeded PRNG
 */
function alea(...seeds) {
  let s0 = 0, s1 = 0, s2 = 0, c = 1;
  const mash = data => {
    data = String(data);
    for (let i = 0; i < data.length; i++) {
      s0 ^= mash_128(data.charCodeAt(i));
      s1 ^= mash_128(data.charCodeAt(i));
      s2 ^= mash_128(data.charCodeAt(i));
    }
  };
  const mash_128 = x => {
    x = Math.imul(x, 0x5D6CE79B);
    x ^= x >>> 16;
    x = Math.imul(x + x, 0x5D6CE79B);
    return x;
  };
  for (let i = 0; i < seeds.length; i++) {
    s0 ^= seeds[i] >>> 0;
    s1 ^= seeds[i] >>> 0;
    s2 ^= seeds[i] >>> 0;
  }
  
  return function() {
    s0 = s0 >>> 0; s1 = s1 >>> 0; s2 = s2 >>> 0;
    const t = (s0 + s1 + s2) >>> 0;
    s0 = s0 >>> 0; s1 = s1 >>> 0; s2 = s2 >>> 0;
    s2 = (s2 + 1) >>> 0;
    return ((t + c) / 4294967296) >>> 0;
  };
}

/**
 * Setup atmospheric fog and ambient lighting
 */
export function setupAtmosphere(scene) {
  // Exponential fog for horror atmosphere
  scene.fog = new THREE.FogExp2(0x050508, 0.035);
  scene.background = new THREE.Color(0x020204);
  
  // Very dim ambient light with blue tint
  const ambient = new THREE.AmbientLight(0x0a0a1a, 0.15);
  scene.add(ambient);
  
  // Small directional for basic visibility
  const fillLight = new THREE.DirectionalLight(0x101020, 0.05);
  fillLight.position.set(0, 10, 0);
  scene.add(fillLight);
  
  return { fog: scene.fog, ambient };
}

/**
 * Create moonlight through window
 */
export function createMoonlight(position, targetPosition) {
  const group = new THREE.Group();
  
  // SpotLight for actual illumination
  const light = new THREE.SpotLight(0x4466aa, 3, 20, Math.PI / 6, 0.3, 1);
  light.position.copy(position);
  light.target.position.copy(targetPosition || new THREE.Vector3(position.x, 0, position.z));
  light.castShadow = false; // Performance - only flashlight casts shadows
  group.add(light);
  group.add(light.target);
  
  // Volumetric cone effect (simplified - transparent cone)
  const coneGeom = new THREE.ConeGeometry(1.5, 8, 16, 1, true);
  const coneMat = new THREE.MeshBasicMaterial({
    color: 0x4466aa,
    transparent: true,
    opacity: 0.05,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const cone = new THREE.Mesh(coneGeom, coneMat);
  cone.position.copy(position);
  cone.position.y -= 4;
  cone.rotation.x = Math.PI;
  group.add(cone);
  
  group.userData = { light, cone };
  
  return group;
}

/**
 * Candle class with flickering light
 */
export class Candle {
  constructor(x, y, z, seed = 'candle') {
    this.position = new THREE.Vector3(x, y, z);
    this.baseIntensity = 1.5;
    this.flickerSpeed = 8 + Math.random() * 7;
    this.flickerAmount = 0.3;
    this.time = Math.random() * 100;
    this.rng = alea((seed + x + z).split('').map(c => c.charCodeAt(0)));
    
    this.group = new THREE.Group();
    this.createMesh();
    this.createLight();
  }
  
  /**
   * Create candle mesh
   */
  createMesh() {
    // Candle body
    const bodyGeom = new THREE.CylinderGeometry(0.05, 0.06, 0.4, 8);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xe8e0d0,
      roughness: 0.8
    });
    const body = new THREE.Mesh(bodyGeom, bodyMat);
    body.position.y = 0.2;
    this.group.add(body);
    
    // Flame (simplified)
    const flameGeom = new THREE.ConeGeometry(0.03, 0.15, 6);
    const flameMat = new THREE.MeshBasicMaterial({
      color: 0xffaa33,
      transparent: true,
      opacity: 0.9
    });
    this.flame = new THREE.Mesh(flameGeom, flameMat);
    this.flame.position.y = 0.5;
    this.group.add(this.flame);
    
    // Holder
    const holderGeom = new THREE.CylinderGeometry(0.08, 0.1, 0.05, 8);
    const holderMat = new THREE.MeshStandardMaterial({
      color: 0x2a2520,
      metalness: 0.8,
      roughness: 0.3
    });
    const holder = new THREE.Mesh(holderGeom, holderMat);
    this.group.add(holder);
    
    this.group.position.copy(this.position);
  }
  
  /**
   * Create point light
   */
  createLight() {
    this.light = new THREE.PointLight(0xff8844, this.baseIntensity, 8, 2);
    this.light.position.copy(this.position);
    this.light.position.y += 0.5;
    this.group.add(this.light);
  }
  
  /**
   * Update flickering
   */
  update(deltaTime) {
    this.time += deltaTime * this.flickerSpeed;
    
    // Flicker pattern - combination of sine waves
    const flicker = 
      Math.sin(this.time * 2.1) * 0.3 +
      Math.sin(this.time * 5.3) * 0.2 +
      Math.sin(this.time * 13.7) * 0.1 +
      (this.rng() - 0.5) * 0.1;
    
    const intensity = this.baseIntensity + flicker * this.flickerAmount;
    this.light.intensity = Math.max(0.5, intensity);
    
    // Flame visual flicker
    if (this.flame) {
      this.flame.scale.y = 0.9 + flicker * 0.2;
      this.flame.scale.x = 1 + flicker * 0.1;
    }
  }
  
  /**
   * Get group for adding to scene
   */
  getGroup() {
    return this.group;
  }
}

/**
 * Create multiple candles
 */
export function createCandles(mapData, scene, count = 8) {
  const candles = [];
  const rng = alea('spectra-candles');
  
  for (let i = 0; i < count; i++) {
    // Random position in a room
    const floor = Math.floor(rng() * 3);
    const x = 2 + rng() * 20;
    const z = 2 + rng() * 20;
    
    const candle = new Candle(x, floor * 4, z, `candle-${i}`);
    scene.add(candle.getGroup());
    candles.push(candle);
  }
  
  return candles;
}