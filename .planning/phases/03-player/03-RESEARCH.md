# Phase 3: Player - Research

**Researched:** 2026-04-13
**Domain:** Three.js First-Person Controls, Flashlight, Sanity System
**Confidence:** HIGH

## Summary

This phase covers player first-person controls (WASD + mouse look), flashlight mechanics with shadow casting, collision detection, and a sanity system that decreases in darkness with visual distortion effects. Three.js provides PointerLockControls for mouse look and the official FPS example demonstrates velocity-based movement with friction. Raycaster collision detection is suitable for this scope but recommended alternatives include three-mesh-bvh for better reliability. Flashlight implementation uses SpotLight attached to the camera with shadow mapping enabled. Sanity system draws from classic horror games (Amnesia, Eternal Darkness) with darkness-based drain and post-processing effects for low sanity.

**Primary recommendation:** Use Three.js official PointerLockControls with custom velocity-based movement, SpotLight for flashlight, Raycaster for collision (with fallback to BVH if issues arise), and EffectComposer for sanity visual effects.

## User Constraints

No user constraints found. This phase is unconstrained and allows full research.

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PLAY-01 | First-person controls (WASD movement) | Velocity-based movement with direction vectors |
| PLAY-02 | PointerLockControls for mouse look | Official Three.js addon with pointer lock API |
| PLAY-03 | Velocity-based movement with inertia/friction | Damping/friction formula from official example |
| PLAY-04 | Raycaster collision detection | Raycaster intersects approach with collision objects |
| PLAY-05 | Camera bob while walking | Sinusoidal offset tied to movement |
| PLAY-06 | Flashlight toggle (F key) | SpotLight on/off state management |
| PLAY-07 | Flashlight SpotLight with shadows | SpotLight with castShadow enabled |
| PLAY-08 | Flashlight battery mechanic | State tracking with drain rate |
| PLAY-09 | Flashlight flicker when ghost near | Proximity-based intensity modulation |
| PLAY-10 | Sanity system (starts 100%, decreases in darkness) | Light level detection + decay rate |
| PLAY-11 | Sanity visual effects (hallucinations, distortion) | Post-processing: vignette, wave distortion, chromatic aberration |
| PLAY-12 | Sprint mechanic (SHIFT, drains sanity) | Speed multiplier + sanity cost |
| PLAY-13 | Interact system (E key for doors, objects) | Raycaster for interaction detection + action trigger |
| PLAY-14 | Chat system (T key) | UI overlay toggle |
| PLAY-15 | Journal overlay (TAB key) | UI overlay toggle |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| three | ^0.170.0 | 3D rendering | Official Three.js library |
| PointerLockControls | three/addons/controls/PointerLockControls.js | First-person mouse look | Official addon, implements browser Pointer Lock API |
| SpotLight | three built-in | Flashlight cone light | Built-in light type with angle/penumbra |

### Supporting

| Library | Purpose | When to Use |
|---------|---------|-------------|
| Raycaster | Collision detection | Simple wall/door collision |
| EffectComposer | Post-processing | Sanity visual effects |
| FilmPass | Film grain | Low sanity distortion |
| VignetteShader | Edge darkening | Low sanity effect |
| GlitchPass | Screen glitch | Hallucination effects |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Raycaster collision | three-mesh-bvh | BVH is more accurate but adds dependency |
| PointerLockControls | Custom pointer lock | Custom allows sensitivity control, more code |
| FilmPass | Custom noise shader | FilmPass simpler, less control |
| WebGLRenderer built-in | @react-three/fiber | More modern but React dependency |

## Architecture Patterns

### Recommended Project Structure

```
src/
├── controls/
│   └── FirstPersonControls.js    # WASD + mouse look logic
├── player/
│   ├── Player.js                 # Main player controller
│   ├── Flashlight.js             # SpotLight + battery logic
│   ├── Sanity.js                 # Sanity state + effects
│   └── Collision.js              # Raycaster collision
├── effects/
│   └── SanityEffects.js         # Post-processing for low sanity
└── ui/
    ├── HUD.js                    # Sanity/battery bars
    ├── Chat.js                   # Chat overlay
    └── Journal.js                # Evidence journal
```

### Pattern 1: PointerLockControls Integration

**What:** First-person camera control using browser Pointer Lock API

**When to use:** Always for FPS controls

**Example:**
```javascript
// Source: https://github.com/mrdoob/three.js/blob/master/examples/misc_controls_pointerlock.html
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

const controls = new PointerLockControls(camera, document.body);

const blocker = document.getElementById('blocker');
const instructions = document.getElementById('instructions');

instructions.addEventListener('click', () => {
    controls.lock();
});

controls.addEventListener('lock', () => {
    instructions.style.display = 'none';
    blocker.style.display = 'none';
});

controls.addEventListener('unlock', () => {
    blocker.style.display = 'block';
    instructions.style.display = '';
});

scene.add(controls.getObject());
```

### Pattern 2: Velocity-Based WASD Movement

**What:** Movement with acceleration, friction, and direction relative to camera

**When to use:** For smooth, game-like movement feel

**Example:**
```javascript
// Source: https://stackoverflow.com/questions/79410358/threejs-fps-movement-stop-velocity-when-key-is-released
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
const playerOnFloor = false;

// Get camera direction (horizontal only for walking)
function getForwardVector() {
    camera.getWorldDirection(direction);
    direction.y = 0;
    direction.normalize();
    return direction;
}

function getSideVector() {
    camera.getWorldDirection(direction);
    direction.y = 0;
    direction.normalize();
    direction.cross(camera.up);
    return direction;
}

// In animate loop
const delta = clock.getDelta();
const damping = Math.exp(-4 * delta) - 1;
if (!playerOnFloor) {
    damping *= 0.1; // Less air resistance
}
velocity.addScaledVector(velocity, damping);

// Movement
const speedDelta = delta * (playerOnFloor ? 25 : 8);
let moving = false;

if (keyStates['KeyW']) {
    velocity.add(getForwardVector().multiplyScalar(speedDelta));
    moving = true;
}
if (keyStates['KeyS']) {
    velocity.add(getForwardVector().multiplyScalar(-speedDelta));
    moving = true;
}
if (keyStates['KeyA']) {
    velocity.add(getSideVector().multiplyScalar(-speedDelta));
    moving = true;
}
if (keyStates['KeyD']) {
    velocity.add(getSideVector().multiplyScalar(speedDelta));
    moving = true;
}

// Stop immediately when no input (prevents sliding)
if (!moving) {
    velocity.x = 0;
    velocity.z = 0;
}

// Apply movement
controls.moveRight(-velocity.x * delta);
controls.moveForward(-velocity.z * delta);
```

### Pattern 3: Flashlight with Shadows

**What:** SpotLight attached to camera that follows player view

**When to use:** When implementing flashlight with dynamic shadows

**Example:**
```javascript
// Source: https://stackoverflow.com/questions/16456912/point-spotlight-in-same-direction-as-camera-three-js-flashlight
const flashlight = new THREE.SpotLight(0xffffff, 7, 50, 0.8 * Math.PI);
flashlight.castShadow = true;
flashlight.shadow.mapSize.width = 1024;
flashlight.shadow.mapSize.height = 1024;
flashlight.shadow.camera.near = 0.5;
flashlight.shadow.camera.far = 50;

// Attach to camera
camera.add(flashlight);
flashlight.position.set(0, 0, 0);
flashlight.target = camera;

// Important: Add camera to scene for transforms to work
scene.add(camera);
```

### Pattern 4: Raycaster Collision Detection

**What:** Use Raycaster to detect walls/doors and prevent movement through them

**When to use:** Simple collision for rectangular environments

**Example:**
```javascript
// Source: https://github.com/mrdoob/three.js/blob/master/examples/games_fps.html
const raycaster = new THREE.Raycaster();
const objects = []; // walls, doors, furniture

function playerCollisions() {
    // Check in movement direction
    const playerPos = controls.getObject().position;
    const direction = velocity.clone().normalize();
    
    raycaster.set(playerPos, direction);
    const intersects = raycaster.intersectObjects(collidableObjects);
    
    if (intersects.length > 0 && intersects[0].distance < 1) {
        // Stop movement in that direction
        velocity.addScaledVector(intersects[0].face.normal, -velocity.dot(intersects[0].face.normal));
    }
}
```

### Pattern 5: Sanity System with Light Detection

**What:** Decrease sanity based on ambient light level, trigger effects at thresholds

**When to use:** Horror games with darkness mechanics

**Example:**
```javascript
// Source: Based on Amnesia: The Dark Descent mechanics
class SanitySystem {
    constructor() {
        this.sanity = 100;
        this.maxSanity = 100;
        this.decayRate = 2; // per second in darkness
        this.recoveryRate = 5; // per second in light
    }
    
    update(delta, ambientLight) {
        // ambientLight is 0-1 based on light sources in range
        if (ambientLight < 0.1) {
            // Dark - decay sanity
            this.sanity -= this.decayRate * delta;
        } else {
            // Light - recover sanity
            this.sanity = Math.min(this.maxSanity, this.sanity + this.recoveryRate * delta);
        }
        this.sanity = Math.max(0, this.sanity);
    }
    
    getVisualEffectIntensity() {
        // Returns 0-1 based on how low sanity is
        if (this.sanity > 50) return 0;
        return 1 - (this.sanity / 50);
    }
}
```

### Pattern 6: Post-Processing for Sanity Effects

**What:** EffectComposer with multiple passes for hallucination/distortion

**When to use:** When implementing visual sanity degradation

**Example:**
```javascript
// Source: https://threejs.org/manual/en/post-processing.html
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { VignetteShader } from 'three/addons/shaders/VignetteShader.js';
import { GlitchPass } from 'three/addons/postprocessing/GlitchPass.js';

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

// Vignette - increases with low sanity
const vignettePass = new ShaderPass(VignetteShader);
vignettePass.uniforms['offset'].value = 0.5;
vignettePass.uniforms['darkness'].value = 0.5;
composer.addPass(vignettePass);

// Glitch - triggered at very low sanity
const glitchPass = new GlitchPass();
glitchPass.goWild = false;
composer.addPass(glitchPass);

// Update effects based on sanity
function updateSanityEffects(sanity) {
    const intensity = 1 - (sanity / 50); // 0 at 50+, increases below
    vignettePass.uniforms['darkness'].value = 0.5 + (intensity * 1.5);
    glitchPass.enabled = sanity < 20;
}
```

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| First-person mouse look | Custom pointer lock implementation | PointerLockControls addon | Handles browser Pointer Lock API correctly across browsers |
| Flashlight cone lighting | Custom cone math | SpotLight | Built-in angle, penumbra, decay, shadow support |
| Post-processing pipeline | Raw WebGL passes | EffectComposer + ShaderPass | Three.js integration, uniform management, blend modes |
| Shadow mapping | Custom shadow calculations | Three.js shadow maps | Built-in PCF, PCSS, VSM options, map size controls |
| Pointer lock detection | Polling-based approach | EventDispatcher in PointerLockControls | Proper lock/unlock events, cross-browser support |

**Key insight:** Three.js's controls and post-processing systems are battle-tested. The PointerLockControls addon handles edge cases (ESC key, browser focus loss) that custom implementations often miss. The postprocessing library (postprocessing npm package) provides optimized effect blending that manual shader passes cannot match.

## Common Pitfalls

### Pitfall 1: Camera Not Added to Scene

**What goes wrong:** Flashlight doesn't follow camera movement.

**Why it happens:** SpotLight attached to camera, but camera not added to scene. Three.js only updates transforms for objects in the scene graph.

**How to avoid:**
```javascript
scene.add(camera); // Required for child transforms to work
camera.add(flashlight);
```

### Pitfall 2: Movement Direction Wrong

**What goes wrong:** W key moves in wrong direction relative to camera look.

**Why it happens:** Not using camera's world direction, or using global axes instead of camera-relative.

**How to avoid:** Always compute movement relative to camera:
```javascript
camera.getWorldDirection(direction);
direction.y = 0;
direction.normalize(); // Horizontal only
```

### Pitfall 3: Raycaster Collision Pass-Through

**What goes wrong:** Player can walk through walls at certain angles.

**Why it happens:** Single raycaster misses thin objects or corners.

**How to avoid:** Use multiple raycasters in different directions (forward, back, left, right), or use three-mesh-bvh for proper collision detection.

### Pitfall 4: Shadow Map Too Small

**What goes wrong:** Flashlight shadows are blocky/pixelated.

**Why it happens:** Default shadow map size is 512x512, may be too low.

**How to avoid:** Increase for flashlight:
```javascript
flashlight.shadow.mapSize.width = 2048;
flashlight.shadow.mapSize.height = 2048;
```

### Pitfall 5: Sanity Effects Too Subtle/Extreme

**What goes wrong:** Players can't tell when sanity is affecting them, or effects are overwhelming.

**Why it happens:** Thresholds too narrow or intensity scales too quickly.

**How to avoid:** Gradual ramp with clear thresholds:
- 100-50: No effects
- 50-25: Slight vignette darkening
- 25-10: Wave distortion, color shift
- 10-0: Glitch effects, screen shake, hallucinations

### Pitfall 6: PointerLockControls Not Handling Unlock

**What goes wrong:** Game stays in "playing" state when player presses ESC.

**Why it happens:** Not listening to unlock event to pause game.

**How to avoid:**
```javascript
controls.addEventListener('unlock', () => {
    showPauseMenu();
});
```

## Code Examples

### Camera Bob While Walking

```javascript
// Source: Custom implementation based on common patterns
let bobTime = 0;
const bobSpeed = 10;
const bobAmount = 0.05;

function updateCameraBob(isMoving, delta) {
    if (isMoving) {
        bobTime += delta * bobSpeed;
        camera.position.y = baseHeight + Math.sin(bobTime) * bobAmount;
    } else {
        // Smooth return to base height
        camera.position.y = THREE.MathUtils.lerp(camera.position.y, baseHeight, delta * 10);
    }
}
```

### Flashlight Flicker When Ghost Near

```javascript
// Source: Based on Amnesia flashlight mechanic
function updateFlashlight(ghostDistance) {
    const flickerThreshold = 10; // meters
    
    if (ghostDistance < flickerThreshold && flashlightOn) {
        // More flicker as ghost gets closer
        const proximity = 1 - (ghostDistance / flickerThreshold);
        
        // Random flicker
        if (Math.random() < proximity * 0.3) {
            flashlight.intensity = Math.random() * 3;
        } else {
            flashlight.intensity = 7; // normal intensity
        }
    }
}
```

### Sprint Mechanic

```javascript
// Source: Based on common FPS sprint
let isSprinting = false;

function updateSprint(delta) {
    if (keyStates['ShiftLeft'] && sanity > 10) {
        if (!isSprinting) {
            isSprinting = true;
            // Sanity cost to start sprinting
            sanity -= 5;
        }
        // Sprinting drains sanity
        sanity -= 0.5 * delta;
    } else {
        isSprinting = false;
    }
    
    // Speed multiplier
    const speed = isSprinting ? runSpeed : walkSpeed;
}
```

### Interaction System (E Key)

```javascript
// Source: Raycaster-based interaction
const interactionRaycaster = new THREE.Raycaster();
const interactionDistance = 3;

function handleInteraction() {
    interactionRaycaster.setFromCamera({x: 0, y: 0}, camera); // Center of screen
    
    const intersects = interactionRaycaster.intersectObjects(interactableObjects);
    
    if (intersects.length > 0 && intersects[0].distance < interactionDistance) {
        const target = intersects[0].object;
        
        if (target.userData.type === 'door') {
            target.userData.toggle();
        } else if (target.userData.type === 'evidence') {
            collectEvidence(target.userData.evidence);
        }
    }
}

// Key handler
document.addEventListener('keydown', (e) => {
    if (e.code === 'KeyE') {
        handleInteraction();
    }
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| FirstPersonControls (fly mode) | PointerLockControls + custom WASD | Three.js r125+ | Better FPS feel, no flying |
| Manual shadow setup | Built-in SpotLight shadows | Three.js long-standing | Simpler API |
| Single ray collision | BVH acceleration structures | 2020+ | More reliable collision |
| Canvas-based film grain | FilmPass post-processing | Three.js r130+ | Hardware accelerated |

**Deprecated/outdated:**
- `FirstPersonControls`: Not suitable for walking (fly mode), use PointerLockControls instead
- Manual WebGL shader passes: Use EffectComposer + ShaderPass for cleaner pipeline

## Open Questions

1. **Multiplayer collision sync**: How should player collision detection work in multiplayer? Each client predict locally? Server authoritative?
   - What we know: Standard is client prediction with server reconciliation
   - What's unclear: How to handle collision response for other players
   - Recommendation: Client-authoritative for self, server validates

2. **Sanity system pacing**: What's the right decay rate for a 5-10 minute investigation phase?
   - What we know: Amnesia uses ~2/sec in darkness, ~5/sec recovery in light
   - What's unclear: Whether this fits shorter game loops
   - Recommendation: Adjustable rate, default slower for investigation-focused gameplay

3. **Performance with shadows**: Multiple SpotLights with shadows (candles + flashlight)?
   - What we know: Each shadow-casting light renders scene from light POV
   - What's unclear: How many shadow lights before FPS drops
   - Recommendation: Limit to 2-3 shadow lights, use fake shadows for distant candles

## Sources

### Primary (HIGH confidence)
- https://github.com/mrdoob/three.js/blob/master/examples/misc_controls_pointerlock.html - Official PointerLockControls example
- https://threejs.org/manual/en/post-processing.html - Post-processing guide
- https://threejs.org/manual/en/shadows.html - Shadow system documentation
- https://threejs.org/docs/pages/module-VignetteShader.html - Vignette shader

### Secondary (MEDIUM confidence)
- https://stackoverflow.com/questions/79410358/threejs-fps-movement-stop-velocity-when-key-is-released - Velocity movement pattern
- https://stackoverflow.com/questions/16456912/point-spotlight-in-same-direction-as-camera-three-js-flashlight - Flashlight attachment
- https://www.gamedeveloper.com/design/game-design-deep-dive-i-amnesia-i-s-sanity-meter- - Amnesia sanity design

### Tertiary (LOW confidence)
- https://medium.com/@pablobandinopla/collision-detection-in-threejs-made-easy-using-bvh-1ce6012199e8 - BVH for collision (marked for validation)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Three.js PointerLockControls and SpotLight are well-documented official solutions
- Architecture: HIGH - Patterns from official examples and verified Stack Overflow sources
- Pitfalls: HIGH - Common issues well-documented in Three.js community
- Sanity system: MEDIUM - Based on Amnesia/Eternal Darkness design patterns, not specific implementation

**Research date:** 2026-04-13
**Valid until:** 2026-05-13 (30 days - stable Three.js API)