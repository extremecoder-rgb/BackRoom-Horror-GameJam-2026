---
phase: 04-ghost
plan: 04
type: execute
wave: 1
depends_on: []
files_modified:
  - src/ghost/Ghost.js
  - src/ghost/GhostShader.js
  - src/ghost/GhostParticles.js
  - src/ghost/GhostEyes.js
  - src/ghost/GhostStateMachine.js
  - src/ghost/types/EvidenceTypes.js
  - src/ghost/types/GhostTypes.js
  - src/ghost/behaviors/Behaviors.js
autonomous: true
requirements:
  - GHOST-01
  - GHOST-02
  - GHOST-03
  - GHOST-04
  - GHOST-05
  - GHOST-06
  - GHOST-07
  - GHOST-08
  - GHOST-09
  - GHOST-10
  - GHOST-11
must_haves:
  truths:
    - "Ghost renders as glowing entity with procedural geometry and distortion shader"
    - "Ghost has visible cold breath particle trail"
    - "Ghost has glowing eyes visible in darkness"
    - "Ghost flickers between visible/invisible states"
    - "Ghost cycles through 8 behavioral states (Idle, Roaming, Stalking, Interacting, PreHunt, Hunting, Fleeing, Cooldown)"
    - "6 ghost types exist: Phantom, Banshee, Revenant, Shade, Poltergeist, Wraith"
    - "Each ghost type has unique evidence combination (3 of 7 evidence types)"
    - "Ghost is assigned to a specific room"
    - "During hunt, ghost visibly chases players"
    - "Players can hide in closets to evade hunting ghost"
  artifacts:
    - path: "src/ghost/Ghost.js"
      provides: "Main ghost entity with procedural geometry"
      exports: ["Ghost", "class"]
      min_lines: 120
    - path: "src/ghost/GhostShader.js"
      provides: "Custom distortion shader material"
      exports: ["createGhostShaderMaterial()", "GhostShader"]
      min_lines: 80
    - path: "src/ghost/GhostParticles.js"
      provides: "Cold breath particle trail system"
      exports: ["GhostParticles", "class"]
      min_lines: 60
    - path: "src/ghost/GhostEyes.js"
      provides: "Glowing eyes component"
      exports: ["GhostEyes", "class"]
      min_lines: 40
    - path: "src/ghost/GhostStateMachine.js"
      provides: "8-state behavior state machine"
      exports: ["GhostStateMachine", "GhostState", "enum"]
      min_lines: 140
    - path: "src/ghost/types/EvidenceTypes.js"
      provides: "Evidence type definitions (7 types)"
      exports: ["EvidenceType", "const", "EVIDENCE_TYPES"]
      min_lines: 30
    - path: "src/ghost/types/GhostTypes.js"
      provides: "6 ghost type definitions with evidence combos"
      exports: ["GhostTypes", "const", "createGhostType()"]
      min_lines: 80
    - path: "src/ghost/behaviors/Behaviors.js"
      provides: "State-specific behavior implementations"
      exports: ["Behaviors", "const"]
      min_lines: 100
  key_links:
    - from: "Ghost.js"
      to: "GhostShader.js"
      via: "ShaderMaterial applied to geometry"
      pattern: "ShaderMaterial.*ghost"
    - from: "Ghost.js"
      to: "GhostStateMachine.js"
      via: "update() calls state machine"
      pattern: "stateMachine\\.update"
    - from: "GhostStateMachine.js"
      to: "Behaviors.js"
      via: "switch on current state"
      pattern: "case GhostState\\."
    - from: "GhostTypes.js"
      to: "EvidenceTypes.js"
      via: "evidence array property"
      pattern: "evidence:\\s*\\["
---

<objective>
Create complete ghost system with procedural entity rendering, 8-state behavior machine, and 6 distinct ghost types with evidence combinations.

Purpose: The ghost is the core antagonist - players must identify its type through evidence while surviving its hunt mechanics. The state machine creates unpredictable behavior cycles, while ghost types provide variety and evidence-based identification creates the core gameplay loop.

Output:
- Ghost entity with procedural geometry (SphereGeometry + vertex shader)
- Custom distortion shader (wavy transparency + glow)
- Cold breath particle trail
- Glowing eyes
- 8-state behavior state machine
- 6 ghost types with unique evidence combinations
- Hunt/hide mechanics
</objective>

<execution_context>
@C:/Users/user/.config/opencode/get-shit-done/workflows/execute-plan.md
@C:/Users/user/.config/opencode/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/REQUIREMENTS.md
@.planning/ROADMAP.md
@.planning/phases/04-ghost/04-RESEARCH.md
@.planning/phases/03-player/03-02-PLAN.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Ghost entity with procedural geometry and distortion shader</name>
  <files>src/ghost/Ghost.js, src/ghost/GhostShader.js</files>
  <action>
Create Ghost class (src/ghost/Ghost.js):

1. Constructor(scene, position):
   - scene: Three.js scene reference
   - position: Vector3 spawn position
   - Create procedural geometry:
     * Base: SphereGeometry(1.2, 32, 32)
     * Modifiers: stretch Y (1.5 scale), taper bottom
   - Apply GhostShader material (see GhostShader.js)
   - Set initial position
   - this.visible = true
   - this.opacity = 0.6 (base transparency)

2. Ghost Shader (src/ghost/GhostShader.js):
   Create custom ShaderMaterial:
   
   Vertex Shader:
   - Vertex displacement based on Y position + time
   - Wave formula: sin(pos.y * 3.0 + uTime * 2.0) * strength
   - Second wave for Z: cos(pos.y * 2.0 + uTime * 1.5) * strength * 0.5
   - Pass UV and displacement to fragment
   
   Fragment Shader:
   - Gradient alpha: more transparent at bottom (ghost tail)
   - Fresnel edge glow: brighter at edges (view angle)
   - Color: cyan-white glow (0.4, 0.8, 1.0)
   - Additive blending for ethereal look

3. Methods:
   - update(time): Update shader uniforms
   - setPosition(position): Move ghost
   - setOpacity(opacity): Fade in/out
   - setVisible(visible): Toggle visibility

4. Integration:
   - Apply UnrealBloomPass from Phase 2 for glow
   - Use additive blending

Reference Pattern 1 from RESEARCH.md (Ghost Shader Material).
  </action>
  <verify>
Ghost renders as glowing ethereal entity
Ghost has wavy/distorted appearance (animated)
Ghost fades from solid at top to transparent at bottom
Ghost has visible glow/bloom effect
  </verify>
  <done>
Ghost class with procedural geometry
Custom ShaderMaterial with vertex displacement
Animated distortion effect
Additive blending for glow
  </done>
</task>

<task type="auto">
  <name>Task 2: Ghost particle trail and glowing eyes</name>
  <files>src/ghost/GhostParticles.js, src/ghost/GhostEyes.js</files>
  <action>
Create GhostParticles class (cold breath trail):

1. Constructor(scene):
   - particleCount = 100
   - Create BufferGeometry with position/size attributes
   - Positions array for CPU-side particle management
   - Velocities array for motion
   - Lifetimes array for fade
   - PointsMaterial: color 0xaaddff, size 0.15
   - transparent, opacity 0.4, additive blending
   - Add to scene

2. update(ghostPosition, deltaTime):
   - Spawn 2-3 particles per frame at ghost position
   - Particle spawn offset: random within 0.5 unit
   - Velocity: slight upward drift + random spread
   - Update existing particle positions
   - Fade based on lifetime (0-2 seconds)
   - Remove dead particles
   - Update geometry attributes

3. Properties:
   - particles per second: spawn rate
   - lifetime: how long particles live
   - drift: upward velocity component

Create GhostEyes class:

1. Constructor(ghost):
   - Two SphereGeometry(0.08) for eyes
   - Emissive white material (0xffffff)
   - Positioned at ghost head (offset Y +1.0, X +/- 0.25)
   - Add as children of ghost mesh

2. update(time):
   - Subtle pulse: emissive intensity varies
   - blink() method for intermittent darkening
   - glow intensity tied to ghost visibility

Reference Pattern from RESEARCH.md (Ghost Particle Trail).
  </action>
  <verify>
Particles spawn from ghost position
Particles drift upward and fade
Ghost has two visible glowing eyes
Eyes pulse subtly
  </verify>
  <done>
GhostParticles class with spawn/update
Points-based cold breath effect
GhostEyes class with pulse
  </done>
</task>

<task type="auto">
  <name>Task 3: Ghost behavior state machine (8 states)</name>
  <files>src/ghost/GhostStateMachine.js, src/ghost/behaviors/Behaviors.js</files>
  <action>
Create GhostState enum and StateMachine:

1. GhostState enum:
   - IDLE: 0-30s - stationary, minimal activity
   - ROAMING: 30-90s - move between rooms randomly
   - STALKING: follow player at distance, observe
   - INTERACTING: trigger events (doors, objects)
   - PREHUNT: 5-15s warning phase, increasing activity
   - HUNTING: chase visible players, catch if caught
   - FLEEING: flee from light/ crucifix temporarily
   - COOLDOWN: 20-40s after hunt ends

2. GhostStateMachine class:
   - Constructor(ghost):
     * ghost: reference to Ghost instance
     * currentState = GhostState.IDLE
     * stateTimer = 0
     * transitions: Map of state -> allowed transitions
   
   - update(deltaTime, players, map):
     * Increment stateTimer
     * Call state-specific behavior
     * Check transition conditions
     * Return current state info

3. State Transitions:
   - IDLE -> ROAMING: timer > random(20, 40)
   - ROAMING -> STALKING: player nearby, timer > 30
   - STALKING -> INTERACTING: timer > random(15, 30)
   - STALKING -> PREHUNT: sanity < 50, random chance
   - INTERACTING -> any: after interaction complete
   - PREHUNT -> HUNTING: timer > random(5, 15)
   - HUNTING -> COOLDOWN: all players caught OR timer > 45
   - COOLDOWN -> IDLE: timer > random(20, 40)
   - Any -> FLEEING: player uses crucifix

4. Behavior Implementation (src/ghost/behaviors/Behaviors.js):
   Each state has corresponding handler:
   
   - handleIdle(): Minimal movement, occasional flicker
   - handleRoaming(): Navigate to random room, speed = 2
   - handleStalking(): Follow farthest player, stay 10+ units back
   - handleInteracting(): Random door slam, object throw
   - handlePreHunt(): Increased activity, flickering, sound cues
   - handleHunting(): Chase visible player, speed = 4
   - handleFleeing(): Move away from light source
   - handleCooldown(): Wander slowly, no activity

5. Track:
   - targetPlayer: which player being targeted
   - targetRoom: current/navigating room
   - huntTimer: how long hunt has lasted

Reference Pattern 2 from RESEARCH.md (Ghost State Machine).
  </action>
  <verify>
Ghost transitions between 8 states
State timing is random within bounds
Ghost moves differently per state
PreHunt phase gives warning before hunting
Hunting phase actively chases players
  </verify>
  <done>
GhostState enum with 8 states
GhostStateMachine with update() method
State-specific behaviors in Behaviors.js
Transition logic with timer-based changes
  </done>
</task>

<task type="auto">
  <name>Task 4: 6 ghost types with evidence combinations</name>
  <files>src/ghost/types/EvidenceTypes.js, src/ghost/types/GhostTypes.js</files>
  <action>
Create EvidenceTypes (7 evidence types):

1. EvidenceType enum:
   - EMF: Electromagnetic field spikes
   - COLD: Temperature drops below freezing
   - ORBS: Ghost orbs visible on camera
   - UV: UV prints on surfaces
   - DOTS: Disappearing Object Tracking System
   - WRITING: Ghost writing in books
   - SPIRIT: Spirit box responses

2. Evidence properties per type:
   - detectionTool: which tool detects it
   - manifestation: how it appears in world
   - duration: how long evidence persists
   - audio: associated sound (if any)

Create GhostTypes (6 ghost types):

1. Phantom:
   - evidence: [DOTS, UV, ORBS]
   - traits: canFly=true, sanityDrain=0.8, huntSpeed=3.5
   - behavior: avoids direct confrontation

2. Banshee:
   - evidence: [DOTS, UV, SPIRIT]
   - traits: targetsSingle=true, huntSpeed=4.0, wailFrequency=0.33
   - behavior: screams before hunt

3. Revenant:
   - evidence: [COLD, ORBS, WRITING]
   - traits: slow=true, huntSpeed=2.0, relentless=true
   - behavior: slow but never stops

4. Shade:
   - evidence: [DOTS, COLD, WRITING]
   - traits: shy=true, harderToFind=true, huntSpeed=3.0
   - behavior: hides when watched

5. Poltergeist:
   - evidence: [UV, ORBS, WRITING]
   - traits: throwsObjects=true, noiseMultiplier=2.0, huntSpeed=3.2
   - behavior: throws objects frequently

6. Wraith:
   - evidence: [DOTS, EMF, SPIRIT]
   - traits: phases=true, noFootsteps=true, huntSpeed=3.8
   - behavior: can walk through walls

Each type stores:
- name, evidence array, traits object
- huntSpeed: movement speed during hunt
- sanityDrain: how fast it drains sanity nearby
- unique behavior flags

Reference Pattern 3 from RESEARCH.md (Evidence-Based Ghost Types).
  </action>
  <verify>
6 distinct ghost types exist
Each has exactly 3 evidence types
Evidence combinations are unique per type
Different hunt speeds and behaviors per type
  </verify>
  <done>
EvidenceType enum (7 evidence)
GhostTypes const (6 types)
Evidence combinations for identification
  </done>
</task>

<task type="auto">
  <name>Task 5: Ghost hunt and hide mechanics</name>
  <files>src/ghost/Ghost.js (add hunt methods)</files>
  <action>
Add hunt mechanics to Ghost class:

1. Hunt State:
   - isHunting: boolean
   - huntTimer: current hunt duration
   - huntMaxDuration: 45 seconds
   - catchRadius: 1.5 units

2. Visibility System (calculateGhostVisibility):
   Input: ghost position, player position, player state
   
   Checks (in order):
   - If player.isHiding: visible = false
   - If player.flashlightOn && lookingAt(ghost): visible = true
   - If distance < 8 && player.sanity > 50: visible = true
   - If distance < 15 && player.sanity < 25: visible = true (low sanity)
   - Default: visible = false

3. Hunting Behavior:
   - Target closest VISIBLE player
   - Move toward target at huntSpeed
   - If target hides: search last known position
   - If catchRadius met: player dies

4. Hide Mechanic:
   - player.isHiding: set when in closet collision
   - Closet collision: check proximity to closet objects
   - Hiding delays ghost detection
   - Ghost circles hiding spot briefly

5. Ghost Flickering (during non-hunt):
   - Flicker schedule: visible 8s, invisible 4s
   - Random variance in schedule
   - More frequent when sanity low
   - Phase 2 screen effects trigger on flicker

6. Room Designation:
   - favoriteRoom: assigned at spawn
   - ghost prefers to stay in assigned room
   - Different types prefer different rooms (Shade: dark, Poltergeist: cluttered)

Implementation combines Patterns 4 (Hunt Visibility) and behavior system.
  </action>
  <verify>
During hunt, ghost visibly chases players
Players in closets are not caught
Flashlight reveals ghost
Low sanity causes more frequent sightings
Ghost catches players within 1.5 units
Ghost navigates toward visible players
  </verify>
  <done>
Hunt state management
Visibility calculation
Hide spot detection
Catch mechanic
Room preference system
  </done>
</task>

</tasks>

<verification>
1. Run `npm run dev` - game loads without errors
2. Ghost entity renders as glowing ethereal figure
3. Ghost has animated distortion (wavy appearance)
4. Particle trail drifts from ghost position
5. Ghost has visible glowing eyes
6. Ghost state cycles: observe different behaviors
7. PreHunt phase announces impending hunt
8. Hunt state actively chases players
9. Closing closet door hides player from ghost
10. Flashlight aimed at ghost reveals it
11. Different evidence appears per ghost type
</verification>

<success_criteria>
- [ ] Ghost renders with procedural geometry and distortion shader
- [ ] Cold breath particle trail visible
- [ ] Glowing eyes present
- [ ] Ghost flickers between visible/invisible states
- [ ] 8-state behavior machine implemented
- [ ] 6 ghost types with unique evidence combos
- [ ] Hunt mechanic chases visible players
- [ ] Hide mechanic protects players in closets
- [ ] Evidence system supports identification gameplay
</success_criteria>

<output>
After completion, create `.planning/phases/04-ghost/04-SUMMARY.md`
</output>