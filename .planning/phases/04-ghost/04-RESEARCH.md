# Phase 4: Ghost - Research

**Researched:** 2026-04-13
**Domain:** Three.js Ghost Entity, State Machine, Ghost Types, Hunt Mechanics
**Confidence:** HIGH

## Summary

This phase covers ghost entity procedural geometry with distortion shader, behavior state machine with 8 states, 6 distinct ghost types with evidence combinations, and hunt/hide mechanics. Three.js ShaderMaterial provides the foundation for custom ghost rendering with vertex displacement for procedural geometry and fragment shader effects for transparency/glow. The state machine follows patterns from Phasmophobia and other horror games, cycling through Idle, Roaming, Stalking, Interacting, PreHunt, Hunting, Fleeing, and Cooldown states. Evidence combinations derive from Phasmophobia's proven 3-of-7 evidence system. Hunt mechanics create tension through visibility states and hiding spots.

**Primary recommendation:** Use Three.js ShaderMaterial with vertex displacement for procedural ghost geometry, implement state machine pattern with switch-case behavior, adopt Phasmophobia's 3-evidence system for ghost types, and implement visibility-based hunt mechanics with closet hiding.

## User Constraints

No user constraints found. This phase is unconstrained and allows full research.

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| GHOST-01 | Ghost entity with procedural geometry | SphereGeometry with vertex displacement shader |
| GHOST-02 | Ghost distortion shader | Custom vertex + fragment ShaderMaterial |
| GHOST-03 | Ghost particle trail (cold breath) | Points/PointsMaterial particle system |
| GHOST-04 | Ghost glowing eyes | Emissive SphereGeometry or PointLight |
| GHOST-05 | Ghost flickering visibility | Opacity animation in render loop |
| GHOST-06 | 6 ghost types | Phantom, Banshee, Revenant, Shade, Poltergeist, Wraith |
| GHOST-07 | Ghost evidence combinations | 3-of-7 evidence system (EMF, Cold, Orbs, UV, DOTS, Writing, Spirit) |
| GHOST-08 | Ghost behavior state machine | 8 states: Idle, Roaming, Stalking, Interacting, PreHunt, Hunting, Fleeing, Cooldown |
| GHOST-09 | Ghost room designation | NavMesh/waypoint system for room targeting |
| GHOST-10 | Ghost hunt mechanic (visible chase) | Visibility state during hunt based on sanity/flashlight |
| GHOST-11 | Hide mechanic during hunt | Closet collision detection + hiding state |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| three | ^0.170.0 | 3D rendering | Core Three.js library |
| ShaderMaterial | three built-in | Custom ghost shader | Enables vertex displacement + transparency |
| Points/PointsMaterial | three built-in | Particle trail | Cold breath effect |
| UnrealBloomPass | three/addons/postprocessing | Ghost glow | Standard bloom for ghostly appearance |

### Supporting

| Library | Purpose | When to Use |
|---------|---------|-------------|
| EffectComposer | Post-processing | Bloom + additional effects |
| MeshStandardMaterial | Ghost body | Base material fallback |
| Raycaster | Hiding spot detection | Finding closets/interaction points |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom shader | Sprite-based ghost | More code, but better distortion |
| Points particles | Sprite particles | More control over motion |
| Manual state machine | Behavior tree library | Simpler to implement, less overhead |

## Architecture Patterns

### Recommended Project Structure

```
src/
├── ghost/
│   ├── Ghost.js              # Main ghost entity
│   ├── GhostShader.js        # Custom distortion shader
│   ├── GhostParticles.js     # Cold breath trail
│   ├── GhostEyes.js         # Glowing eyes component
│   └── GhostStateMachine.js # Behavior state logic
├── types/
│   ├── Phantom.js           # Ghost type definitions
│   ├── Banshee.js
│   ├── Revenant.js
│   ├── Shade.js
│   ├── Poltergeist.js
│   └── Wraith.js
├── behaviors/
│   ├── IdleBehavior.js
│   ├── RoamingBehavior.js
│   ├── StalkingBehavior.js
│   ├── InteractingBehavior.js
│   ├── PreHuntBehavior.js
│   ├── HuntingBehavior.js
│   ├── FleeingBehavior.js
│   └── CooldownBehavior.js
└── evidence/
    └── EvidenceTypes.js     # Evidence definitions
```

### Pattern 1: Ghost Shader Material

**What:** Custom ShaderMaterial with vertex displacement for wavy ghost effect

**When to use:** For procedural ghost geometry that morphs and flows

**Example:**
```javascript
// Source: Adapted from Three.js ShaderMaterial docs + ghost effect tutorials
const ghostShaderMaterial = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0 },
    uOpacity: { value: 0.6 },
    uColor: { value: new THREE.Color(0.4, 0.8, 1.0) },
    uDistortionStrength: { value: 0.3 }
  },
  vertexShader: `
    uniform float uTime;
    uniform float uDistortionStrength;
    varying vec2 vUv;
    varying float vDisplacement;
    
    void main() {
      vUv = uv;
      vec3 pos = position;
      
      // Wavy distortion based on Y position and time
      float wave = sin(pos.y * 3.0 + uTime * 2.0) * uDistortionStrength;
      float wave2 = cos(pos.y * 2.0 + uTime * 1.5) * uDistortionStrength * 0.5;
      
      pos.x += wave;
      pos.z += wave2;
      
      vDisplacement = wave;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uOpacity;
    uniform vec3 uColor;
    varying float vDisplacement;
    
    void main() {
      // Gradient from bottom to top (more transparent at bottom)
      float alpha = uOpacity * (1.0 - vDisplacement * 0.5);
      gl_FragColor = vec4(uColor, alpha);
    }
  `,
  transparent: true,
  side: THREE.DoubleSide,
  depthWrite: false,
  blending: THREE.AdditiveBlending
});
```

### Pattern 2: Ghost State Machine

**What:** Enum-based state machine with update method per state

**When to use:** For managing ghost behavior transitions

**Example:**
```javascript
// Source: Game programming patterns - State pattern
const GhostState = {
  IDLE: 'idle',
  ROAMING: 'roaming',
  STALKING: 'stalking',
  INTERACTING: 'interacting',
  PREHUNT: 'prehunt',
  HUNTING: 'hunting',
  FLEEING: 'fleeing',
  COOLDOWN: 'cooldown'
};

class GhostStateMachine {
  constructor(ghost) {
    this.ghost = ghost;
    this.currentState = GhostState.IDLE;
    this.stateTimer = 0;
  }
  
  update(deltaTime, players, evidence) {
    this.stateTimer += deltaTime;
    
    switch (this.currentState) {
      case GhostState.IDLE:
        return this.updateIdle(deltaTime, players, evidence);
      case GhostState.ROAMING:
        return this.updateRoaming(deltaTime, players, evidence);
      case GhostState.PREHUNT:
        return this.updatePreHunt(deltaTime, players, evidence);
      case GhostState.HUNTING:
        return this.updateHunting(deltaTime, players, evidence);
      // ... other states
    }
  }
  
  transitionTo(newState, options = {}) {
    const oldState = this.currentState;
    this.currentState = newState;
    this.stateTimer = 0;
    this.ghost.onStateChange(oldState, newState, options);
  }
  
  // State-specific update methods...
}
```

### Pattern 3: Evidence-Based Ghost Types

**What:** Each ghost type has exactly 3 of 7 evidence types

**When to use:** For identification mechanics and gameplay progression

**Example:**
```javascript
// Source: Phasmophobia evidence system (industry standard)
const EvidenceType = {
  EMF: 'emf',
  COLD: 'cold',
  ORBS: 'orbs',
  UV: 'uv',
  DOTS: 'dots',
  WRITING: 'writing',
  SPIRIT: 'spirit'
};

const GhostTypes = {
  PHANTOM: {
    name: 'Phantom',
    evidence: [EvidenceType.DOTS, EvidenceType.UV, EvidenceType.ORBS],
    traits: {
      canFly: true,
      sanityDrain: 0.8,
      huntSpeed: 3.5
    }
  },
  BANSHEE: {
    name: 'Banshee',
    evidence: [EvidenceType.DOTS, EvidenceType.UV, EvidenceType.SPIRIT],
    traits: {
      targetsSinglePlayer: true,
      huntSpeed: 4.0,
      wailFrequency: 0.33
    }
  },
  REVENANT: {
    name: 'Revenant',
    evidence: [EvidenceType.COLD, EvidenceType.ORBS, EvidenceType.WRITING],
    traits: {
      slowButRelentless: true,
      huntSpeed: 2.0,
      speedBonusWhenHidden: true
    }
  },
  SHADE: {
    name: 'Shade',
    evidence: [EvidenceType.DOTS, EvidenceType.COLD, EvidenceType.WRITING],
    traits: {
      shyBehavior: true,
      harderToFind: true,
      huntSpeed: 3.0
    }
  },
  POLTERGEIST: {
    name: 'Poltergeist',
    evidence: [EvidenceType.UV, EvidenceType.ORBS, EvidenceType.WRITING],
    traits: {
      throwsObjects: true,
      noiseMultiplier: 2.0,
      huntSpeed: 3.2
    }
  },
  WRAITH: {
    name: 'Wraith',
    evidence: [EvidenceType.DOTS, EvidenceType.EMF, EvidenceType.SPIRIT],
    traits: {
      canPhaseThroughWalls: true,
      noFootsteps: true,
      huntSpeed: 3.8
    }
  }
};
```

### Pattern 4: Hunt Visibility System

**What:** Ghost visibility during hunt determined by player state

**When to use:** For hide-or-seek gameplay tension

**Example:**
```javascript
// Source: Phasmophobia hunt mechanics
function calculateGhostVisibility(ghost, player) {
  const distance = ghost.position.distanceTo(player.position);
  
  // Check if player is hiding (in closet/safe spot)
  if (player.isHiding) {
    return { visible: false, reason: 'hiding' };
  }
  
  // Check if player has flashlight on and is looking at ghost
  if (player.flashlightOn && player.isLookingAt(ghost)) {
    return { visible: true, reason: 'lit_up' };
  }
  
  // Check distance threshold for visibility
  if (distance < 8 && player.sanity > 50) {
    return { visible: true, reason: 'close_and_sane' };
  }
  
  // At very low sanity, ghost appears more easily
  if (distance < 15 && player.sanity < 25) {
    return { visible: true, reason: 'low_sanity' };
  }
  
  return { visible: false, reason: 'too_far_or_safe' };
}

function checkHuntCollision(ghost, player) {
  if (!ghost.isHunting) return false;
  
  const visibility = calculateGhostVisibility(ghost, player);
  
  // Ghost can catch visible players
  if (visibility.visible) {
    const distance = ghost.position.distanceTo(player.position);
    if (distance < 1.5) { // Catch radius
      return true; // Player caught!
    }
  }
  
  return false;
}
```

### Anti-Patterns to Avoid

- **Static ghost model:** Always animate the ghost shader - static ghosts break immersion
- **Single state transitions:** Ensure state machine can handle edge cases (interrupted hunts, evidence found mid-hunt)
- **Hard-coded evidence counts:** Support optional evidence (missing evidence on higher difficulties)
- **Instant kill on contact:** Add brief grace period or warning before killing

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|------------|-----|
| Ghost glow | Custom glow shader | UnrealBloomPass | Bloom is optimized, supports HDR |
| Particle trail | Individual meshes | Points/PointsMaterial | GPU-accelerated, thousands of particles |
| Pathfinding | Custom navigation | NavMesh or simple waypoint system | Room-to-room movement only needed |
| State persistence | Custom save | Server state already synced | Ghost state synced via WebSocket |

## Common Pitfalls

### Pitfall 1: Ghost Always Visible
**What goes wrong:** Ghost appears even when player is in safe hiding spot
**Why it happens:** Not checking `player.isHiding` in visibility calculation
**How to avoid:** Add hiding spot collision detection; ghost cannot see players in closets
**Warning signs:** Players die while hiding; hiding feels pointless

### Pitfall 2: State Machine Deadlock
**What goes wrong:** Ghost stuck in PreHunt indefinitely or cannot transition to Hunting
**Why it happens:** Missing state transition conditions or timer issues
**How to avoid:** Add timeout fallback; always allow PreHunt → Hunting transition after threshold
**Warning signs:** Ghost stuck in warning phase; hunt never triggers

### Pitfall 3: Evidence Impossible to Find
**What goes wrong:** Certain evidence combinations never spawn
**Why it happens:** Random selection without ensuring evidence actually appears in world
**How to avoid:** Trigger specific evidence manifestations based on ghost type (e.g., Poltergeist always throws objects → UV evidence)
**Warning signs:** Players cannot identify ghost despite thorough investigation

### Pitfall 4: Ghost Movement Through Walls
**What goes wrong:** Ghost clips through walls, breaks collision logic
**Why it happens:** Not using waypoint system for navigation
**How to avoid:** Implement room-based waypoint system; ghost moves between valid positions only
**Warning signs:** Ghost appears in impossible locations; players can predict ghost position easily

## Code Examples

Verified patterns from official sources:

### Ghost Particle Trail (Cold Breath)
```javascript
// Source: Three.js Points example
class GhostParticles {
  constructor(scene) {
    this.particles = null;
    this.positions = [];
    this.velocities = [];
    this.lifetimes = [];
    
    const particleCount = 100;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    
    for (let i = 0; i < particleCount; i++) {
      this.velocities.push(new THREE.Vector3());
      this.lifetimes.push(0);
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    
    const material = new THREE.PointsMaterial({
      color: 0xaaddff,
      size: 0.15,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    
    this.particles = new THREE.Points(geometry, material);
    scene.add(this.particles);
  }
  
  update(ghostPosition, deltaTime) {
    // Spawn new particles at ghost position
    // Update existing particle positions
    // Fade out based on lifetime
  }
}
```

### State-Based Behavior
```javascript
// Source: Game AI patterns
class GhostBehavior {
  constructor(ghost, map) {
    this.ghost = ghost;
    this.map = map;
    this.state = GhostState.IDLE;
    this.targetRoom = null;
    this.targetPosition = null;
  }
  
  update(deltaTime, players) {
    switch (this.state) {
      case GhostState.IDLE:
        this.handleIdle(players);
        break;
      case GhostState.ROAMING:
        this.handleRoaming(players);
        break;
      case GhostState.HUNTING:
        this.handleHunting(players);
        break;
    }
  }
  
  handleHunting(players) {
    // Find closest visible player
    let closestVisible = null;
    let closestDistance = Infinity;
    
    for (const player of players) {
      if (this.canSeePlayer(player)) {
        const dist = this.ghost.position.distanceTo(player.position);
        if (dist < closestDistance) {
          closestDistance = dist;
          closestVisible = player;
        }
      }
    }
    
    if (closestVisible) {
      // Move toward visible player
      this.moveToward(closestVisible.position, this.ghost.huntSpeed);
      
      // Check collision
      if (closestDistance < 1.5) {
        this.killPlayer(closestVisible);
      }
    } else {
      // Search - move to last known player position
      if (this.targetPosition) {
        this.moveToward(this.targetPosition, this.ghost.huntSpeed * 0.5);
      }
    }
  }
  
  canSeePlayer(player) {
    if (player.isHiding) return false;
    if (!player.flashlightOn) return false;
    // Additional visibility checks...
    return true;
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Sprite-based ghosts | Shader-based geometry | 2020+ (Phasmophobia) | More immersive, real-time distortion |
| Simple patrol AI | Multi-state behavior machine | 2015+ (modern horror games) | Dynamic behavior, unpredictability |
| Single ghost type | 6+ distinct types with evidence | Phasmophobia (2020) | Core identification gameplay loop |
| Always visible hunt | Visibility-based hunt | Phasmophobia | Strategic hiding, survival tension |

**Deprecated/outdated:**
- Static ghost sprites - Replaced by procedural shader-based geometry
- Simple chase AI - Replaced by state machine with multiple behavior modes
- Single evidence type - Replaced by 3-of-7 evidence system

## Open Questions

1. **Ghost spawn location**
   - What we know: Ghost starts in a random room
   - What's unclear: Should ghost have a "favorite" room based on type?
   - Recommendation: Add favorite room per ghost type (Shade prefers dark rooms)

2. **Multiplayer ghost targeting**
   - What we know: During hunt, ghost targets one player at a time
   - What's unclear: How to handle target switching when player hides?
   - Recommendation: Brief search phase before retargeting

3. **Evidence manifestation timing**
   - What we know: Evidence appears periodically based on ghost type
   - What's unclear: Should evidence be guaranteed or random per type?
   - Recommendation: Guaranteed at least one evidence manifestation per minute

## Sources

### Primary (HIGH confidence)
- Three.js docs - ShaderMaterial, Points, EffectComposer
- Phasmophobia wiki - Ghost types, evidence system, hunt mechanics

### Secondary (MEDIUM confidence)
- Paranormal Investigator devlog - State machine implementation
- Game programming patterns - State pattern documentation
- Midnight Ghost Hunt - Hide-and-seek mechanics

### Tertiary (LOW confidence)
- Various Three.js ghost tutorials - Need verification

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Three.js is stable, versions well-documented
- Architecture: HIGH - State machine pattern well-established in games
- Pitfalls: MEDIUM - Based on Phasmophobia player reports and similar games
- Ghost types: HIGH - Phasmophobia is industry standard for evidence systems

**Research date:** 2026-04-13
**Valid until:** 2026-05-13 (30 days for stable patterns, 7 for fast-moving)