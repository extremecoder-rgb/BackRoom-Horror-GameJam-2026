# Phase 2: Environment - Research

**Researched:** 2026-04-13
**Domain:** Three.js procedural environment generation, post-processing, horror lighting
**Confidence:** HIGH

## Summary

Phase 2 delivers the procedural Victorian haunted house environment with atmospheric rendering. This phase addresses 26 requirements spanning procedural map generation (MAP-01 to MAP-14) and visual effects (FX-01 to FX-12). The recommended approach uses a room-based procedural generation algorithm with seeded RNG for deterministic results, canvas-generated textures for zero external assets, SpotLight with additive cone meshes for volumetric moonlight, and a multi-pass EffectComposer pipeline for post-processing effects including bloom, vignette, film grain, chromatic aberration, and screen flicker.

**Primary recommendation:** Use grid-based room generation with predefined room templates, procedurally generate wall/floor textures via Canvas 2D API, implement volumetric moonlight using SpotLight + transparent cone mesh, and build the post-processing pipeline with RenderPass → UnrealBloomPass → custom ShaderPasses for vignette/film grain/chromatic aberration → OutputPass.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Three.js | r183 (latest) | 3D rendering, procedural geometry | Industry standard for WebGL |
| EffectComposer | three/addons | Post-processing pipeline | Standard for multi-pass rendering |
| RenderPass | three/addons | Scene rendering to composer | Required first pass |
| UnrealBloomPass | three/addons | HDR bloom for light glow | Creates spooky candle/moonlight glow |
| ShaderPass | three/addons | Custom shader effects | Vignette, film grain, chromatic aberration |
| OutputPass | three/addons | Color space conversion | Final output to screen |
| VignetteShader | three/addons/shaders | Edge darkening | Classic horror vignette |
| FilmPass | three/addons | Film grain effect | Atmosphere enhancement |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| simplex-noise | 4.0.x | Seeded procedural generation | Map variation, texture noise |
| alea | 1.0.x | Seeded PRNG | Deterministic random generation |

### Installation

```bash
# Core dependencies (already installed from Phase 1)
npm install three simplex-noise alea
```

## Architecture Patterns

### Recommended Project Structure

```
src/
├── main.js                 # Entry point
├── environment/
│   ├── map-generator.js    # Procedural Victorian house generation
│   ├── room.js             # Room class with dimensions, doors, exits
│   ├── texture-generator.js # Canvas-based procedural textures
│   ├── lighting.js         # Ambient, moonlight, candle setup
│   └── props/
│       ├── door.js          # Interactive door with rotation
│       ├── furniture.js    # Procedural boxes/cylinders
│       └── candle.js       # Candle with flickering light
├── effects/
│   ├── post-processing.js  # EffectComposer setup
│   ├── shaders/
│   │   ├── vignette.js    # Custom vignette shader
│   │   ├── filmGrain.js   # Film grain shader
│   │   ├── chromatic.js   # Chromatic aberration
│   │   └── flicker.js     # Screen flicker effect
│   └── particles/
│       ├── dust.js         # Dust motes
│       └── coldBreath.js   # Ghost cold breath
└── game/
    └── scene.js            # Three.js scene setup
```

### Pattern 1: Procedural Room-Based Map Generation

**What:** Grid-based dungeon/house generation using predefined rooms connected by doors

**When to use:** Creating a Victorian haunted house with multiple floors (attic, ground, basement)

**Implementation:**
```javascript
// Source: Procedural dungeon generation patterns (Game Developer articles)
import { createNoise2D } from 'simplex-noise';
import alea from 'alea';

class MapGenerator {
    constructor(seed) {
        this.prng = alea(seed);
        this.noise2D = createNoise2D(this.prng);
        this.rooms = [];
        this.grid = [];
    }
    
    generate(width, height, floors = 3) {
        const map = { floors: [] };
        
        for (let floor = 0; floor < floors; floor++) {
            const floorData = this.generateFloor(width, height, floor);
            map.floors.push(floorData);
        }
        
        // Connect floors with stairs
        this.addStairs(map);
        
        return map;
    }
    
    generateFloor(width, height, floorIndex) {
        const grid = [];
        const numRooms = 4 + Math.floor(this.prng() * 4); // 4-7 rooms per floor
        
        // Generate rooms with random positions
        for (let i = 0; i < numRooms; i++) {
            const roomWidth = 4 + Math.floor(this.prng() * 4); // 4-7 units
            const roomHeight = 4 + Math.floor(this.prng() * 4);
            const x = Math.floor(this.prng() * (width - roomWidth));
            const z = Math.floor(this.prng() * (height - roomHeight));
            
            this.rooms.push({
                id: i,
                x, z,
                width: roomWidth,
                height: roomHeight,
                floor: floorIndex
            });
        }
        
        // Separate overlapping rooms (simple collision resolution)
        this.resolveOverlaps();
        
        // Generate grid
        return this.createGrid(width, height);
    }
    
    resolveOverlaps() {
        for (let i = 0; i < this.rooms.length; i++) {
            for (let j = i + 1; j < this.rooms.length; j++) {
                if (this.roomsOverlap(this.rooms[i], this.rooms[j])) {
                    this.separateRooms(this.rooms[i], this.rooms[j]);
                }
            }
        }
    }
    
    roomsOverlap(a, b) {
        return a.x < b.x + b.width &&
               a.x + a.width > b.x &&
               a.z < b.z + b.height &&
               a.z + a.height > b.z;
    }
    
    separateRooms(a, b) {
        const overlapX = Math.min(a.x + a.width - b.x, b.x + b.width - a.x);
        const overlapZ = Math.min(a.z + a.height - b.z, b.z + b.height - a.z);
        
        if (overlapX < overlapZ) {
            if (a.x < b.x) a.x -= overlapX + 1;
            else a.x += overlapX + 1;
        } else {
            if (a.z < b.z) a.z -= overlapZ + 1;
            else a.z += overlapZ + 1;
        }
    }
    
    createGrid(width, height) {
        const grid = [];
        for (let x = 0; x < width; x++) {
            grid[x] = [];
            for (let z = 0; z < height; z++) {
                grid[x][z] = { type: 'wall', roomId: null };
            }
        }
        
        // Mark room areas
        for (const room of this.rooms) {
            for (let x = room.x; x < room.x + room.width; x++) {
                for (let z = room.z; z < room.z + room.height; z++) {
                    if (x < width && z < height) {
                        grid[x][z] = { type: 'floor', roomId: room.id };
                    }
                }
            }
        }
        
        // Add doors between adjacent rooms
        this.addDoors(grid, width, height);
        
        return grid;
    }
    
    addDoors(grid, width, height) {
        // Find adjacent rooms and place doors
        for (const room of this.rooms) {
            for (const other of this.rooms) {
                if (room.id >= other.id) continue;
                
                // Check if rooms are adjacent
                const adjacent = this.checkAdjacency(room, other);
                if (adjacent) {
                    const doorX = Math.floor((room.x + room.width/2 + other.x + other.width/2) / 2);
                    const doorZ = Math.floor((room.z + room.height/2 + other.z + other.height/2) / 2);
                    if (doorX < width && doorZ < height) {
                        grid[doorX][doorZ] = { type: 'door', roomId: room.id };
                    }
                }
            }
        }
    }
    
    checkAdjacency(a, b) {
        // Check if rooms are next to each other (within 1 unit)
        return Math.abs((a.x + a.width/2) - (b.x + b.width/2)) < (a.width + b.width)/2 + 1 &&
               Math.abs((a.z + a.height/2) - (b.z + b.height/2)) < (a.height + b.height)/2 + 1;
    }
}
```

**Source:** [Procedural Dungeon Generation Algorithm - Game Developer](https://www.gamedeveloper.com/programming/procedural-dungeon-generation-algorithm)

### Pattern 2: Canvas-Based Procedural Textures

**What:** Generate textures programmatically using Canvas 2D API, avoiding external image files

**When to use:** Creating Victorian wall (plaster) and floor (wood) textures without external assets

**Implementation:**
```javascript
// Source: Three.js procedural texture patterns
class TextureGenerator {
    static generateWallTexture(width = 512, height = 512) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        // Base color - aged plaster (off-white with slight yellow/gray)
        const baseColor = this.lerpColor('#d4d0c8', '#8a8780', 0.3);
        ctx.fillStyle = baseColor;
        ctx.fillRect(0, 0, width, height);
        
        // Add noise for texture
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
            const noise = (Math.random() - 0.5) * 30;
            data[i] = Math.min(255, Math.max(0, data[i] + noise));
            data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
            data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
        }
        
        ctx.putImageData(imageData, 0, 0);
        
        // Add cracks
        this.drawCracks(ctx, width, height);
        
        // Add stains
        this.drawStains(ctx, width, height);
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(2, 2);
        
        return texture;
    }
    
    static generateFloorTexture(width = 512, height = 512, seed = 'default') {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        const prng = alea(seed);
        
        // Base dark wood color
        ctx.fillStyle = '#2a1f1a';
        ctx.fillRect(0, 0, width, height);
        
        // Draw wood planks
        const plankWidth = 64;
        const numPlanks = Math.ceil(width / plankWidth);
        
        for (let i = 0; i < numPlanks; i++) {
            const x = i * plankWidth;
            
            // Wood grain variation
            const variation = (prng() - 0.5) * 20;
            const baseR = 42 + variation;
            const baseG = 31 + variation * 0.7;
            const baseB = 26 + variation * 0.5;
            
            ctx.fillStyle = `rgb(${Math.floor(baseR)}, ${Math.floor(baseG)}, ${Math.floor(baseB)})`;
            ctx.fillRect(x, 0, plankWidth - 2, height);
            
            // Add wood grain lines
            ctx.strokeStyle = `rgba(20, 15, 10, ${0.3 + prng() * 0.3})`;
            ctx.lineWidth = 1;
            
            for (let j = 0; j < 8; j++) {
                const y = prng() * height;
                ctx.beginPath();
                ctx.moveTo(x, y);
                
                let currX = x;
                for (let k = 0; k < 20; k++) {
                    currX += 3 + prng() * 5;
                    if (currX > x + plankWidth - 2) break;
                    ctx.lineTo(currX, y + (prng() - 0.5) * 4);
                }
                ctx.stroke();
            }
        }
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(4, 4);
        
        return texture;
    }
    
    static drawCracks(ctx, width, height) {
        ctx.strokeStyle = 'rgba(80, 70, 60, 0.3)';
        ctx.lineWidth = 1;
        
        for (let i = 0; i < 5; i++) {
            ctx.beginPath();
            let x = Math.random() * width;
            let y = Math.random() * height;
            ctx.moveTo(x, y);
            
            for (let j = 0; j < 10; j++) {
                x += (Math.random() - 0.5) * 40;
                y += (Math.random() - 0.5) * 40;
                ctx.lineTo(x, y);
            }
            ctx.stroke();
        }
    }
    
    static drawStains(ctx, width, height) {
        for (let i = 0; i < 3; i++) {
            const x = Math.random() * width;
            const y = Math.random() * height;
            const radius = 20 + Math.random() * 40;
            
            const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
            gradient.addColorStop(0, 'rgba(60, 40, 30, 0.1)');
            gradient.addColorStop(1, 'rgba(60, 40, 30, 0)');
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    static lerpColor(a, b, t) {
        const ah = parseInt(a.replace('#', ''), 16);
        const bh = parseInt(b.replace('#', ''), 16);
        
        const ar = (ah >> 16) & 0xff, ag = (ah >> 8) & 0xff, ab = ah & 0xff;
        const br = (bh >> 16) & 0xff, bg = (bh >> 8) & 0xff, bb = bh & 0xff;
        
        const rr = ar + (br - ar) * t;
        const rg = ag + (bg - ag) * t;
        const rb = ab + (bb - ab) * t;
        
        return `rgb(${Math.floor(rr)}, ${Math.floor(rg)}, ${Math.floor(rb)})`;
    }
}
```

### Pattern 3: Post-Processing Pipeline with EffectComposer

**What:** Multi-pass rendering pipeline for bloom, vignette, film grain, chromatic aberration

**When to use:** Creating atmospheric horror visuals with screen effects

**Implementation:**
```javascript
// Source: Three.js official post-processing documentation
import {
    EffectComposer
} from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { VignetteShader } from 'three/addons/shaders/VignetteShader.js';
import { FilmPass } from 'three/addons/postprocessing/FilmPass.js';

class PostProcessing {
    constructor(renderer, scene, camera) {
        this.renderer = renderer;
        this.scene = scene;
        this.camera = camera;
        this.composer = null;
        this.flickerIntensity = 0;
        
        this.setup();
    }
    
    setup() {
        const size = new THREE.Vector2();
        this.renderer.getSize(size);
        
        // Create composer
        this.composer = new EffectComposer(this.renderer);
        
        // 1. Render the scene
        const renderPass = new RenderPass(this.scene, this.camera);
        this.composer.addPass(renderPass);
        
        // 2. Bloom pass for candle/light glow
        const bloomPass = new UnrealBloomPass(
            size,                    // Resolution
            1.5,                     // Strength
            0.4,                     // Radius
            0.85                     // Threshold
        );
        bloomPass.threshold = 0.2;
        bloomPass.strength = 1.5;
        bloomPass.radius = 0.5;
        this.composer.addPass(bloomPass);
        this.bloomPass = bloomPass;
        
        // 3. Film grain
        const filmPass = new FilmPass(0.35, 0.5, 648, false);
        this.composer.addPass(filmPass);
        
        // 4. Custom vignette + chromatic aberration combined pass
        const horrorEffectsShader = {
            uniforms: {
                tDiffuse: { value: null },
                vignetteOffset: { value: 0.95 },
                vignetteDarkness: { value: 1.2 },
                chromaticAmount: { value: 0.003 },
                flickerIntensity: { value: 0.0 },
                time: { value: 0.0 }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D tDiffuse;
                uniform float vignetteOffset;
                uniform float vignetteDarkness;
                uniform float chromaticAmount;
                uniform float flickerIntensity;
                uniform float time;
                varying vec2 vUv;
                
                void main() {
                    vec2 uv = vUv;
                    
                    // Flicker effect
                    float flicker = 1.0;
                    if (flickerIntensity > 0.0) {
                        flicker = 1.0 - flickerIntensity * (0.5 + 0.5 * sin(time * 20.0));
                    }
                    
                    // Chromatic aberration
                    vec2 dir = uv - 0.5;
                    float dist = length(dir);
                    vec2 offset = dir * chromaticAmount * dist;
                    
                    float r = texture2D(tDiffuse, uv - offset).r;
                    float g = texture2D(tDiffuse, uv).g;
                    float b = texture2D(tDiffuse, uv + offset).b;
                    
                    vec3 color = vec3(r, g, b) * flicker;
                    
                    // Vignette
                    float vignette = smoothstep(vignetteOffset, vignetteOffset - 0.4, dist);
                    color *= mix(1.0 - vignetteDarkness, 1.0, vignette);
                    
                    gl_FragColor = vec4(color, 1.0);
                }
            `
        };
        
        this.horrorPass = new ShaderPass(horrorEffectsShader);
        this.composer.addPass(this.horrorPass);
        
        // 5. Output pass (color space conversion)
        const outputPass = new OutputPass();
        this.composer.addPass(outputPass);
    }
    
    update(deltaTime) {
        if (this.horrorPass) {
            this.horrorPass.uniforms.time.value += deltaTime;
        }
    }
    
    triggerFlicker(intensity = 0.5, duration = 0.5) {
        this.flickerIntensity = intensity;
        this.horrorPass.uniforms.flickerIntensity.value = intensity;
        
        // Fade out
        setTimeout(() => {
            this.horrorPass.uniforms.flickerIntensity.value = 0;
        }, duration * 1000);
    }
    
    render() {
        this.composer.render();
    }
    
    setSize(width, height) {
        this.composer.setSize(width, height);
    }
}
```

**Source:** [Three.js Post-Processing Manual](https://threejs.org/manual/en/post-processing.html), [Unreal Bloom Tutorial - Wael Yasmina](https://waelyasmina.net/articles/unreal-bloom-selective-threejs-post-processing/)

### Pattern 4: Volumetric Moonlight with SpotLight + Cone Mesh

**What:** Approximate volumetric light using transparent cone mesh with additive blending

**When to use:** Creating dramatic moonlight shafts through windows

**Implementation:**
```javascript
// Source: Three.js volumetric spotlight patterns
class VolumetricLight {
    static createMoonlight(position, target, color = 0xc7ddff, intensity = 10) {
        const group = new THREE.Group();
        
        // Actual SpotLight for illumination and shadows
        const spotLight = new THREE.SpotLight(color, intensity, 50, Math.PI / 6, 0.3, 1);
        spotLight.position.copy(position);
        spotLight.target.position.copy(target);
        spotLight.castShadow = true;
        spotLight.shadow.mapSize.width = 1024;
        spotLight.shadow.mapSize.height = 1024;
        group.add(spotLight);
        group.add(spotLight.target);
        
        // Volumetric cone for light shaft effect
        const distance = position.distanceTo(target);
        const coneHeight = distance;
        const coneRadius = Math.tan(Math.PI / 6) * distance;
        
        const coneGeometry = new THREE.ConeGeometry(coneRadius, coneHeight, 32, 1, true);
        const coneMaterial = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.08,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            side: THREE.DoubleSide
        });
        
        const cone = new THREE.Mesh(coneGeometry, coneMaterial);
        
        // Position and orient the cone
        const midpoint = new THREE.Vector3().addVectors(position, target).multiplyScalar(0.5);
        cone.position.copy(midpoint);
        cone.lookAt(target);
        cone.rotateX(Math.PI / 2);
        
        group.add(cone);
        
        return { group, spotLight, cone };
    }
}
```

**Source:** [Three.js Volumetric Spotlight Demo](https://threejsdemos.com/demos/lighting/volumetric-spotlight)

### Pattern 5: Flickering Candle Light

**What:** Point light with animated intensity for candle flickering effect

**When to use:** Creating atmospheric candle props in the haunted house

**Implementation:**
```javascript
class Candle {
    constructor(position) {
        this.mesh = new THREE.Group();
        this.light = null;
        this.baseIntensity = 2;
        this.flickerSpeed = 15;
        this.flickerAmount = 0.3;
        
        this.createMesh(position);
    }
    
    createMesh(position) {
        // Candle body (cylinder)
        const candleGeo = new THREE.CylinderGeometry(0.05, 0.06, 0.3, 8);
        const candleMat = new THREE.MeshStandardMaterial({
            color: 0xf5f5dc,
            roughness: 0.9
        });
        const candle = new THREE.Mesh(candleGeo, candleMat);
        candle.position.y = 0.15;
        this.mesh.add(candle);
        
        // Flame (small sphere with emissive)
        const flameGeo = new THREE.SphereGeometry(0.03, 8, 8);
        const flameMat = new THREE.MeshStandardMaterial({
            color: 0xff6600,
            emissive: 0xff4400,
            emissiveIntensity: 2,
            roughness: 0.5
        });
        const flame = new THREE.Mesh(flameGeo, flameMat);
        flame.position.y = 0.32;
        this.mesh.add(flame);
        this.flame = flame;
        
        // Point light
        const light = new THREE.PointLight(0xff8844, this.baseIntensity, 8, 2);
        light.position.y = 0.35;
        light.castShadow = true;
        this.mesh.add(light);
        this.light = light;
        
        this.mesh.position.copy(position);
    }
    
    update(deltaTime, time) {
        // Flicker effect using sine waves
        const flicker = Math.sin(time * this.flickerSpeed) * 0.1 +
                       Math.sin(time * this.flickerSpeed * 2.3) * 0.05 +
                       Math.sin(time * this.flickerSpeed * 0.7) * 0.15;
        
        const intensity = this.baseIntensity + flicker * this.flickerAmount;
        this.light.intensity = Math.max(0.5, intensity);
        
        // Slight flame scale variation
        const scale = 1 + flicker * 0.2;
        this.flame.scale.set(scale, scale * 1.2, scale);
    }
}
```

### Anti-Patterns to Avoid

- **Using external texture images:** Violates zero external assets requirement — use Canvas textures
- **Overly complex volumetric raymarching:** Performance killer — use additive cone approximation instead
- **Bloom without threshold:** Everything glows — set threshold to filter dim objects
- **Static fog with no variation:** Looks artificial — use FogExp2 with proper density
- **Screen effects always on full intensity:** Causes eye strain — make intensity adjustable

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Post-processing pipeline | Custom render loop | EffectComposer | Well-tested, handles render targets |
| Bloom effect | Custom gaussian blur | UnrealBloomPass | Optimized GPU implementation |
| Film grain | Custom noise shader | FilmPass | Built-in, performance-tuned |
| Vignette | Canvas overlay | VignetteShader | Proper post-process integration |
| Chromatic aberration | CSS filters | Custom ShaderPass | Runs on GPU with rest of pipeline |
| Fog atmosphere | Custom shader | FogExp2 | Built-in, hardware accelerated |

**Key insight:** The post-processing pipeline is well-established in Three.js. Custom solutions add complexity without benefits. The EffectComposer handles render target management, pass ordering, and deltaTime propagation automatically.

## Common Pitfalls

### Pitfall 1: Bloom Affecting Everything

**What goes wrong:** All objects glow including walls, creating unrealistic look

**Why it happens:** Default threshold is 0, so any brightness triggers bloom

**How to avoid:** Set threshold to 0.2-0.3 and ensure only emissive materials (candles, eyes) exceed it

**Warning signs:** Walls looking unnaturally bright at edges

### Pitfall 2: Memory Leaks from Textures

**What goes wrong:** Creating new Canvas textures every frame or on map generation

**Why it happens:** Textures hold GPU memory; not disposing old ones causes growth

**How to avoid:** Generate textures once at startup, reuse them, dispose() when no longer needed

**Warning signs:** Increasing GPU memory over gameplay session

### Pitfall 3: Volumetric Cone Z-Fighting

**What goes wrong:** Light shaft cone flickers or shows artifacts

**Why it happens:** Cone geometry intersects with scene geometry

**How to avoid:** Set depthWrite: false on cone material, use additive blending

**Warning signs:** Flickering light shafts, visible cone edges

### Pitfall 4: Post-Processing Performance

**What goes wrong:** Low framerate when all effects enabled

**Why it happens:** Multiple render passes, especially bloom, are GPU-intensive

**How to avoid:** Use lower resolution for bloom (setSize with multiplier), limit bloom passes

**Warning signs:** Frame drops below 30fps on mid-range hardware

### Pitfall 5: Fog Clipping Near Camera

**What goes wrong:** Objects pop through fog when camera is close

**Why it happens:** Fog near/far plane too close to camera

**How to avoid:** Set scene.fog.near to > 0.5 and adjust density appropriately

**Warning signs:** Wall appearing through fog at close range

## Code Examples

### Scene Setup with Fog and Lighting

```javascript
// Source: Three.js haunted house tutorial patterns
function createAtmosphericScene() {
    const scene = new THREE.Scene();
    
    // Horror fog - exponential for natural falloff
    const fogColor = 0x0a0a12;
    scene.fog = new THREE.FogExp2(fogColor, 0.035);
    scene.background = new THREE.Color(fogColor);
    
    // Very dim ambient light - blue tinted for supernatural feel
    const ambient = new THREE.AmbientLight(0x1a1a2e, 0.15);
    scene.add(ambient);
    
    return scene;
}
```

### Interactive Door Component

```javascript
// Source: Three.js animation patterns
class InteractiveDoor {
    constructor(room, wall, doorPosition) {
        this.isOpen = false;
        this.isAnimating = false;
        this.rotation = 0;
        this.openAngle = Math.PI / 2; // 90 degrees
        this.animationSpeed = 2;
        
        this.createMesh(doorPosition);
    }
    
    createMesh(position) {
        const doorGroup = new THREE.Group();
        
        // Door frame
        const frameGeo = new THREE.BoxGeometry(1.1, 2.2, 0.1);
        const frameMat = new THREE.MeshStandardMaterial({ color: 0x2a1f1a });
        const frame = new THREE.Mesh(frameGeo, frameMat);
        doorGroup.add(frame);
        
        // Door panel
        const doorGeo = new THREE.BoxGeometry(1, 2, 0.08);
        const doorMat = new THREE.MeshStandardMaterial({ 
            color: 0x3d2b1f,
            map: TextureGenerator.generateFloorTexture(256, 256, 'door')
        });
        const door = new THREE.Mesh(doorGeo, doorMat);
        door.position.z = 0.05;
        doorGroup.add(door);
        
        // Pivot point (hinge)
        doorGroup.position.copy(position);
        doorGroup.position.x -= 0.5; // Offset to hinge
        
        this.mesh = doorGroup;
    }
    
    toggle() {
        if (this.isAnimating) return;
        this.isAnimating = true;
        this.targetRotation = this.isOpen ? 0 : this.openAngle;
    }
    
    update(deltaTime) {
        if (!this.isAnimating) return;
        
        const speed = this.openAngle * this.animationSpeed * deltaTime;
        
        if (this.isOpen) {
            this.rotation = Math.max(0, this.rotation - speed);
            if (this.rotation <= 0) {
                this.rotation = 0;
                this.isAnimating = false;
                this.isOpen = false;
            }
        } else {
            this.rotation = Math.min(this.openAngle, this.rotation + speed);
            if (this.rotation >= this.openAngle) {
                this.rotation = this.openAngle;
                this.isAnimating = false;
                this.isOpen = true;
            }
        }
        
        this.mesh.rotation.y = this.rotation;
    }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| BloomPass | UnrealBloomPass | Three.js r137+ | Better HDR, adjustable threshold |
| Manual shader composition | EffectComposer | Three.js r100+ | Standard pipeline |
| PNG texture loading | Canvas texture generation | Project constraint | Zero assets |
| Linear fog (Fog) | Exponential fog (FogExp2) | Always | More realistic falloff |
| CSS screen effects | ShaderPass effects | Always | GPU-accelerated |

**Deprecated/outdated:**
- `BloomPass` (older): Replaced by UnrealBloomPass with better HDR support
- Texture loading with TextureLoader: Violates zero external assets constraint
- External model loading (GLTFLoader): All geometry procedural per requirements

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| MAP-01 | Procedural Victorian haunted house map (attic, ground floor, basement) | MapGenerator class with floor support |
| MAP-02 | Procedural plaster wall textures (canvas-generated) | TextureGenerator.generateWallTexture() |
| MAP-03 | Procedural wood floor textures (stripe-based) | TextureGenerator.generateFloorTexture() |
| MAP-04 | Interactive doors with rotation animation | InteractiveDoor class with toggle/animation |
| MAP-05 | Windows with volumetric moonlight (SpotLight cones) | VolumetricLight.createMoonlight() |
| MAP-06 | Basic furniture (boxes, cylinders for tables, chairs, beds) | Furniture procedural patterns |
| MAP-07 | Candle props with flickering point lights | Candle class with update() flicker |
| MAP-08 | Fog atmosphere (FogExp2, density 0.035) | createAtmosphericScene() with FogExp2 |
| MAP-09 | Ambient light (near-black blue tint) | AmbientLight(0x1a1a2e, 0.15) |
| MAP-10 | Moonlight from windows | SpotLight + volumetric cone |
| MAP-11 | RenderPass for scene rendering | EffectComposer setup |
| MAP-12 | UnrealBloomPass for light bloom | PostProcessing bloomPass |
| MAP-13 | Custom vignette + film grain + chromatic aberration shaders | horrorEffectsShader |
| MAP-14 | Screen flicker effect for ghost events | triggerFlicker() method |
| FX-01 | Cold breath particles | Particle system (out of scope - Phase 4) |
| FX-02 | Dust motes | Particle system |
| FX-03 | Ghost trail particles | Particle system (out of scope - Phase 4) |
| FX-04 | EMF sparks | Particle system (out of scope - Phase 4) |
| FX-05 | Vignette shader | VignetteShader in horrorEffectsShader |
| FX-06 | Film grain shader | FilmPass |
| FX-07 | Chromatic aberration shader | horrorEffectsShader |
| FX-08 | Screen flicker shader | flickerIntensity uniform |
| FX-09 | Static disruption effect | Future enhancement |
| FX-10 | Blood drip effect | Future enhancement |
| FX-11 | Lightning flash effect | Future enhancement |
| FX-12 | Frost creep on screen edges | Future enhancement |

**Note:** FX-01 through FX-04 and FX-10 through FX-12 are ghost/effect particles better implemented in Phase 4 (Ghost) and Phase 5 (Evidence) respectively. The environment phase focuses on MAP-01 through MAP-14 and the screen shader effects (FX-05 through FX-09).

## Open Questions

1. **Should we use true volumetric fog or approximation?**
   - What we know: True volumetric (raymarching) is expensive, cone approximation is fast
   - What's unclear: Whether approximation looks "good enough" for horror
   - Recommendation: Start with cone approximation; evaluate visual quality before adding complexity

2. **How to handle multi-floor connectivity?**
   - What we know: Need stairs between floors, must be reachable
   - What's unclear: Should stairs be procedural or fixed position?
   - Recommendation: Fixed central staircase position for simplicity; procedural rooms around it

3. **Should windows be procedural or fixed?**
   - What we know: Fixed window positions per room template are easier for moonlight
   - What's unclear: How to ensure enough windows for gameplay (evidence detection)
   - Recommendation: Pre-defined window positions per room type; light enters from outside

## Sources

### Primary (HIGH confidence)
- [Three.js Post-Processing Manual](https://threejs.org/manual/en/post-processing.html) - Official documentation
- [Three.js Unreal Bloom Examples](https://github.com/mrdoob/three.js/blob/dev/examples/webgl_postprocessing_unreal_bloom.html) - Official example
- [Three.js Volumetric Spotlight Demos](https://threejsdemos.com/demos/lighting/volumetric-spotlight) - Volumetric implementation

### Secondary (MEDIUM confidence)
- [Procedural Dungeon Generation Algorithm - Game Developer](https://www.gamedeveloper.com/programming/procedural-dungeon-generation-algorithm) - Room generation patterns
- [Unreal Bloom Selective - Wael Yasmina](https://waelyasmina.net/articles/unreal-bloom-selective-threejs-post-processing/) - Bloom pass setup
- [Three.js Haunted House Tutorial](https://gaohaoyang.github.io/2022/06/19/three-haunted-house/) - Horror atmosphere patterns
- [Post-Processing - Sangil Lee](https://sangillee.com/2025-01-15-post-processing/) - EffectComposer setup 2025

### Tertiary (LOW confidence)
- [Volumetric Lighting WebGPU - Three.js Forum](https://discourse.threejs.org/t/volumetric-lighting-in-webgpu/87959) - Advanced volumetric (for reference only)
- [Project Haunted House - Nathaniel Vrana](https://www.nathanielvrana.com/projects/haunted-house-game/) - PCG approaches

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Three.js post-processing well-documented, EffectComposer is standard
- Architecture: HIGH - Procedural generation patterns well-established in game development
- Pitfalls: MEDIUM - Identified common issues from Three.js community; some need implementation validation
- Performance: MEDIUM - Bloom pass is GPU-intensive; need testing on target hardware

**Research date:** 2026-04-13
**Valid until:** 2026-05-13 (30 days - stable Three.js version)

**Map requirements covered:** 14/14 (MAP-01 through MAP-14)
**FX requirements covered (environment phase):** 5/12 (FX-05 through FX-09)
**Remaining FX requirements:** Deferred to Phase 4 (Ghost) and Phase 5 (Evidence)
