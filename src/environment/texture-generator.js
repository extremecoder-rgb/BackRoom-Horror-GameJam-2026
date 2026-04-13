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
 * Generate aged plaster wall texture (canvas-based)
 */
export function generateWallTexture(width = 512, height = 512, seed = 'wall') {
  const rng = alea(seed.split('').map(c => c.charCodeAt(0)));
  
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  
  // Base color - aged plaster (cream to gray)
  const baseR = 180 + Math.floor(rng() * 40);
  const baseG = 175 + Math.floor(rng() * 35);
  const baseB = 160 + Math.floor(rng() * 30);
  ctx.fillStyle = `rgb(${baseR}, ${baseG}, ${baseB})`;
  ctx.fillRect(0, 0, width, height);
  
  // Add noise/heterogeneity
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  
  for (let i = 0; i < data.length; i += 4) {
    const noise = (rng() - 0.5) * 30;
    data[i] = Math.max(0, Math.min(255, data[i] + noise));
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
  }
  ctx.putImageData(imageData, 0, 0);
  
  // Add cracks
  ctx.strokeStyle = `rgba(60, 55, 50, 0.3)`;
  ctx.lineWidth = 1;
  const numCracks = 3 + Math.floor(rng() * 5);
  
  for (let c = 0; c < numCracks; c++) {
    ctx.beginPath();
    let x = rng() * width;
    let y = rng() * height;
    ctx.moveTo(x, y);
    
    for (let j = 0; j < 5; j++) {
      x += (rng() - 0.5) * 80;
      y += (rng() - 0.5) * 80;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  
  // Add water stains
  const numStains = 2 + Math.floor(rng() * 3);
  for (let s = 0; s < numStains; s++) {
    const sx = rng() * width;
    const sy = rng() * height;
    const radius = 20 + rng() * 40;
    const gradient = ctx.createRadialGradient(sx, sy, 0, sx, sy, radius);
    gradient.addColorStop(0, 'rgba(100, 95, 85, 0.2)');
    gradient.addColorStop(1, 'rgba(100, 95, 85, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(sx - radius, sy - radius, radius * 2, radius * 2);
  }
  
  // Create Three.js texture
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  
  return texture;
}

/**
 * Generate wood floor texture (canvas-based)
 */
export function generateFloorTexture(width = 512, height = 512, seed = 'floor') {
  const rng = alea(seed.split('').map(c => c.charCodeAt(0)));
  
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  
  // Base dark wood
  ctx.fillStyle = '#1a1410';
  ctx.fillRect(0, 0, width, height);
  
  const plankWidth = 64;
  const numPlanks = Math.ceil(width / plankWidth);
  
  // Draw planks
  for (let i = 0; i < numPlanks; i++) {
    const x = i * plankWidth;
    
    // Plank color variation
    const variation = Math.floor(rng() * 20) - 10;
    const r = 30 + variation;
    const g = 22 + variation;
    const b = 15 + variation;
    
    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
    ctx.fillRect(x, 0, plankWidth - 2, height);
    
    // Wood grain lines
    ctx.strokeStyle = `rgba(10, 8, 5, 0.3)`;
    ctx.lineWidth = 1;
    
    const numGrains = 3 + Math.floor(rng() * 4);
    for (let g = 0; g < numGrains; g++) {
      ctx.beginPath();
      ctx.moveTo(x + rng() * plankWidth, 0);
      ctx.bezierCurveTo(
        x + rng() * plankWidth, height / 3,
        x + rng() * plankWidth, height * 2 / 3,
        x + rng() * plankWidth, height
      );
      ctx.stroke();
    }
    
    // Plank edges (darker)
    ctx.strokeStyle = 'rgba(10, 8, 5, 0.5)';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, 0, plankWidth - 2, height);
  }
  
  // Create Three.js texture
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  
  return texture;
}

/**
 * Generate door texture
 */
export function generateDoorTexture(width = 256, height = 256, seed = 'door') {
  const rng = alea(seed.split('').map(c => c.charCodeAt(0)));
  
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  
  // Dark wood base
  const baseR = 40 + Math.floor(rng() * 15);
  const baseG = 30 + Math.floor(rng() * 10);
  const baseB = 20 + Math.floor(rng() * 10);
  ctx.fillStyle = `rgb(${baseR}, ${baseG}, ${baseB})`;
  ctx.fillRect(0, 0, width, height);
  
  // Panel design
  ctx.fillStyle = `rgb(${baseR - 10}, ${baseG - 8}, ${baseB - 5})`;
  
  // Top panel
  ctx.fillRect(20, 20, width - 40, 80);
  // Bottom panel
  ctx.fillRect(20, 120, width - 40, 100);
  
  // Panel borders
  ctx.strokeStyle = 'rgba(10, 8, 5, 0.6)';
  ctx.lineWidth = 3;
  ctx.strokeRect(20, 20, width - 40, 80);
  ctx.strokeRect(20, 120, width - 40, 100);
  
  // Handle/Knob
  ctx.fillStyle = '#3a3530';
  ctx.beginPath();
  ctx.arc(width - 40, height / 2, 8, 0, Math.PI * 2);
  ctx.fill();
  
  // Create Three.js texture
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  
  return texture;
}

/**
 * Generate ceiling texture
 */
export function generateCeilingTexture(width = 512, height = 512, seed = 'ceiling') {
  const rng = alea(seed.split('').map(c => c.charCodeAt(0)));
  
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  
  // Dark ceiling
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, width, height);
  
  // Subtle texture
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  
  for (let i = 0; i < data.length; i += 4) {
    const noise = (rng() - 0.5) * 10;
    data[i] = Math.max(0, Math.min(255, data[i] + noise));
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
  }
  ctx.putImageData(imageData, 0, 0);
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  
  return texture;
}