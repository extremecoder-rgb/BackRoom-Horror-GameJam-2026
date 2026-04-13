# Phase 5: Evidence - Tools, Journal, Win/Lose - Research

**Researched:** 2026-04-14  
**Domain:** Evidence Detection Systems, Tool Mechanics, Journal UI, Win/Lose Conditions  
**Confidence:** HIGH

## Summary

This phase covers the evidence detection system required for ghost identification, the tool mechanics players use to find and confirm evidence, the journal system for tracking findings, and the win/lose conditions that determine game outcomes. The evidence system is based on Phasmophobia's proven 3-of-6 evidence identification model, where players must discover at least 2 evidence types before they can make a valid ghost type guess. Tools provide specific detection capabilities: EMF Reader detects electromagnetic activity spikes, thermometer detects cold spots, UV light reveals fingerprints, video camera with night vision captures ghost orbs, spirit book captures writing, and audio equipment detects whispers. The journal filters possible ghost types based on collected evidence through a checkbox system. Win conditions require correct ghost type identification and team escape; lose conditions include player death or total team elimination.

**Primary recommendation:** Implement Phasmophobia-style evidence mechanics with 6 evidence types mapped to specific tools, journal ghost type filtering through evidence checkbox elimination, and exit door unlock after ghost type confirmation.

## User Constraints

No user constraints found. This phase is unconstrained and allows full research based on established game patterns.

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|----------------|
| EVID-01 | EMF Spike evidence detection | EMF Reader displays level 1-5; level 5 is evidence |
| EVID-02 | Cold Spot evidence detection | Thermometer reads below 10°C; freezing (<0°C) is evidence |
| EVID-03 | Ghost Orbs evidence (camera night vision) | Video camera night vision mode reveals floating orbs |
| EVID-04 | Whispers evidence (directional audio) | Audio equipment detects distant voice responses |
| EVID-05 | UV Prints evidence detection | UV light reveals fingerprints on surfaces |
| EVID-06 | Ghost Writing evidence (book placement) | Spirit Book placed in room captures writing |
| EVID-07 | EMF Reader tool | Handheld device with level indicators |
| EVID-08 | Thermometer tool | Temperature reading in Celsius |
| EVID-09 | UV Light tool mode | Purple light reveal mode |
| EVID-10 | Video Camera with night vision | Camera with NV toggle |
| EVID-11 | Spirit Book item | Placeable evidence book |
| EVID-12 | Crucifix item | Prevents hunts in radius |
| EVID-13 | Smudge Stick item | Delays ghost activity |
| EVID-14 | Tool cycling (number keys 1-7) | Quick tool selection |
| EVID-15 | Journal with ghost type filtering | Evidence checkbox filtering |
| EVID-16 | Evidence checkboxes | Toggle evidence confirmation |
| WIN-01 | Evidence collection requirement (2+ types) | Must find 2 evidence before guess |
| WIN-02 | Guess ghost type modal (G key) | Opens type selection |
| WIN-03 | Ghost type selection | 6 ghost type options |
| WIN-04 | Exit door unlock | Opens after correct identification |
| WIN-05 | All players escape condition | Victory requires team exit |
| WIN-06 | Victory screen with stats | Shows evidence found, time, etc |
| WIN-07 | Ghost catch player during hunt | Kill mechanic |
| WIN-08 | Player death mechanic | Sanity-based or instant catch |
| WIN-09 | Spectator mode for dead players | Continue watching |
| WIN-10 | All dead = game over | Total loss condition |
| WIN-11 | Scoring system | Points for evidence, time |
| WIN-12 | Restart option | New game option |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| three | ^0.170.0 | 3D detection visualization | Core rendering |
| Web Audio API | browser built-in | Spatial audio detection | Whisper evidence detection |
| Raycaster | three built-in | Tool detection trigger | Proximity-based evidence |

### Supporting

| Library | Purpose | When to Use |
|---------|---------|-------------|
| HTML overlay | Tool UI display | HUD indicators |
| Canvas 2D | Journal rendering | Evidence checkboxes |
| AudioContext | Directional audio | Whispers detection |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|---------|----------|
| 3D orbs | Sprite-based orbs | Simpler implementation, less performance |
| Real-time thermometry | Single reading | Less immersive, easier to code |
| 3D audio | Stereo audio only | Less spatial immersion |

## Evidence Types

### Evidence Detection System

This game uses 6 evidence types (adapted from Phasmophobia's proven system):

| Evidence | Detection Method | Indicator |
|-----------|---------------|----------|
| EMF | EMF Reader | Level 5 reading |
| Cold Spot | Thermometer | Below 0°C (freezing) |
| Ghost Orbs | Video Camera (NV) | Floating white orbs |
| Whispers | Parabolic Mic | Voice response in room |
| UV Prints | UV Light | Fingerprints on surfaces |
| Ghost Writing | Spirit Book | Written message appears |

### Ghost Type Evidence Combinations

Each ghost type has exactly 3 evidence types:

| Ghost Type | Evidence 1 | Evidence 2 | Evidence 3 |
|-----------|-----------|-----------|-----------|
| Phantom | EMF | Cold Spot | Ghost Orbs |
| Banshee | Cold Spot | Whispers | UV Prints |
| Revenant | EMF | Whispers | Ghost Writing |
| Shade | Cold Spot | Ghost Orbs | Ghost Writing |
| Poltergeist | UV Prints | Whispers | Ghost Orbs |
| Wraith | EMF | UV Prints | Cold Spot |

## Tools

### Tool Overview

| Tool | Key | Evidence Detected | Function |
|------|-----|-----------------|----------|
| EMF Reader | 1 | EMF | Displays level 1-5; level 5 confirms evidence |
| Thermometer | 2 | Cold Spot | Shows temperature in Celsius |
| UV Light | 3 | UV Prints | Reveals fingerprints |
| Video Camera | 4 | Ghost Orbs | Night vision mode for orbs |
| Spirit Book | 5 | Ghost Writing | Captures writing when placed |
| Crucifix | 6 | None | Prevents hunts in radius |
| Smudge Stick | 7 | None | Delays ghost activity |
| Flashlight | F | None | Standard illumination |

### EMF Reader

**Detection mechanic:** EMF Reader displays activity levels 1-5:

- Level 1: No activity (blue)
- Level 2: Ghost interaction (green)
- Level 3: Object thrown (yellow)
- Level 4: Ghost manifestation (orange)
- Level 5: Evidence confirmed (red)

**Implementation:**

```javascript
// Source: Adapted from Phasmophobia mechanics
class EMFReader {
  constructor() {
    this.currentLevel = 1;
    this.isActive = true;
    this.maxRange = 3.5; // meters
  }

  update(ghost_position, player_position) {
    const distance = player_position.distanceTo(ghost_position);
    
    if (distance > this.maxRange) {
      this.currentLevel = 1;
      return;
    }

    // Ghost interaction based on state
    if (ghost.isInteracting) {
      // 25% chance for EMF 5 if ghost has EMF evidence
      if (ghost.evidence.includes(EvidenceType.EMF) && Math.random() < 0.25) {
        this.currentLevel = 5;
      } else {
        this.currentLevel = 2 + Math.floor(Math.random() * 2);
      }
    } else if (ghost.isManifested) {
      this.currentLevel = 4;
    } else {
      this.currentLevel = Math.ceil((this.maxRange - distance) / 2);
    }
  }

  hasEvidence() {
    return this.currentLevel >= 5;
  }
}
```

### Thermometer

**Detection mechanic:** Reads room temperature; freezing (<0°C) is evidence:

```javascript
class Thermometer {
  constructor() {
    this.baseTemp = 20; // Celsius
    this.ghostRoomModifier = -15;
  }

  readTemperature(ghost, player_position, room_temp) {
    // Ghost room is significantly colder
    if (ghost.currentRoom === player_position.currentRoom) {
      return this.baseTemp + this.ghostRoomModifier;
    }
    return room_temp;
  }

  hasEvidence() {
    return this.currentTemp <= 0;
  }
}
```

### Video Camera

**Detection mechanic:** Night vision mode reveals ghost orbs:

```javascript
class VideoCamera {
  constructor() {
    this.hasNightVision = true;
    this.nightVisionOn = false;
  }

  detectOrbs(ghosts, frame) {
    if (!this.nightVisionOn) return [];
    
    // Render orbs as bright dots in NV mode
    const orbs = [];
    for (const ghost of ghosts) {
      if (ghost.hasEvidence(EvidenceType.ORBS)) {
        // Spawn orb particle at ghost position
        orbs.push(this.createOrbParticle(ghost.position));
      }
    }
    return orbs;
  }
}
```

### UV Light

**Detection mechanic:** Reveals fingerprints on surfaces:

```javascript
class UVLight {
  constructor() {
    this.wavelength = '365nm'; // UV-A
  }

  detectFingerprints(player_position) {
    const surfaces = this.getNearbySurfaces(player_position, 3);
    const prints = [];
    
    for (const surface of surfaces) {
      // Ghost touches create UV-visible prints
      if (surface.ghostTouched) {
        prints.push(this.createFingerprintMesh(surface));
      }
    }
    return prints;
  }

  hasEvidence() {
    return this.fingerprints.length > 0;
  }
}
```

### Spirit Book

**Detection mechanic:** Placed in ghost room; captures writing:

```javascript
class SpiritBook {
  constructor() {
    this.isPlaced = false;
    this.hasWriting = false;
    this.writeDelay = 30000; // 30 seconds
  }

  place(position) {
    this.isPlaced = true;
    this.position = position;
    this.placedTime = Date.now();
  }

  checkWriting(ghost) {
    if (!this.isPlaced) return;
    
    // Ghost must be in same room and have Writing evidence
    if (ghost.currentRoom === this.room && ghost.evidence.includes(EvidenceType.WRITING)) {
      if (Date.now() - this.placedTime > this.writeDelay) {
        this.hasWriting = true;
        this.displayMessage(this.generateRandomMessage());
      }
    }
  }
}
```

### Protective Items

**Crucifix:** Prevents hunts within radius:

```javascript
class Crucifix {
  constructor() {
    this.radius = 3; // meters
    this.huntPrevention = true;
  }

  checkHunt(ghost_position) {
    const distance = this.position.distanceTo(ghost_position);
    if (distance < this.radius) {
      return { prevented: true, duration: 180000 }; // 3 minutes
    }
    return { prevented: false };
  }
}
```

**Smudge Stick:** Delays all ghost activity:

```javascript
class SmudgeStick {
  constructor() {
    this.duration = 90000; // 90 seconds
    this.isBurning = true;
  }

  use(ghost) {
    ghost.delayActivity(this.duration);
    ghost.clearTarget();
  }
}
```

## Architecture Patterns

### Recommended Project Structure

```
src/
├── evidence/
│   ├── EvidenceManager.js      # Evidence detection orchestration
│   ├── EMFReader.js        # EMF detection logic
│   ├── Thermometer.js     # Temperature detection
│   ├── VideoCamera.js   # Orb detection
│   ├── UVLight.js     # Fingerprint detection
│   ├── SpiritBook.js   # Writing detection
│   └── EvidenceTypes.js # Evidence definitions
├── tools/
│   ├── ToolManager.js     # Tool cycling and selection
│   ├── ToolUI.js        # Tool HUD display
│   ├── Crucifix.js      # Protective item
│   └── SmudgeStick.js  # Delay item
├── journal/
│   ├── JournalManager.js # Journal state
│   ├── JournalUI.js     # Journal overlay
│   └── GhostFilter.js   # Evidence filtering logic
└── game/
    ├── WinConditions.js  # Win/lose logic
    ├── Scoring.js      # Points calculation
    └── ExitDoor.js    # Escape mechanic
```

### Tool Cycling Pattern

```javascript
// Source: Phasmophobia-style tool switching
class ToolManager {
  constructor() {
    this.tools = [
      'emf',      // 1
      'thermometer', // 2
      'uv',        // 3
      'camera',    // 4
      'book',     // 5
      'crucifix', // 6
      'smudge'    // 7
    ];
    this.currentIndex = 0;
  }

  cycleTool(key) {
    const index = parseInt(key) - 1;
    if (index >= 0 && index < this.tools.length) {
      this.currentIndex = index;
      this.equipTool(this.tools[index]);
    }
  }

  getCurrentTool() {
    return this.tools[this.currentIndex];
  }
}
```

### Journal Ghost Filtering Pattern

```javascript
// Source: Evidence-based ghost elimination
class GhostFilter {
  constructor() {
    this.confirmedEvidence = [];
    this.excludedEvidence = [];
  }

  markEvidence(evidence, isPresent) {
    if (isPresent) {
      this.confirmedEvidence.push(evidence);
      this.excludedEvidence = this.excludedEvidence.filter(e => e !== evidence);
    } else {
      this.excludedEvidence.push(evidence);
      this.confirmedEvidence = this.confirmedEvidence.filter(e => e !== evidence);
    }
  }

  getPossibleGhosts() {
    return Object.entries(GhostEvidence)
      .filter(([_, required]) => {
        // Must have all confirmed evidence
        const hasConfirmed = this.confirmedEvidence.every(e => required.includes(e));
        // Must NOT have any excluded evidence
        const hasExcluded = this.excludedEvidence.some(e => required.includes(e));
        return hasConfirmed && !hasExcluded;
      })
      .map(([type, _]) => type);
  }
}
```

### Win Condition Pattern

```javascript
// Source: Phasmophobia exit mechanic
class WinConditions {
  constructor() {
    this.canGuess = false;
    this.exitOpen = false;
    this.ghostIdentified = false;
  }

  checkCanGuess(collectedEvidence) {
    // Must have 2+ evidence types
    this.canGuess = collectedEvidence.length >= 2;
    return this.canGuess;
  }

  makeGuess(selectedType) {
    if (!this.canGuess) return { valid: false };
    
    this.ghostIdentified = (selectedType === gameState.ghostType);
    return { valid: true, correct: this.ghostIdentified };
  }

  openExit() {
    if (this.ghostIdentified) {
      this.exitOpen = true;
    }
    return this.exitOpen;
  }

  checkVictory(players) {
    // All players must exit
    return players.every(p => p.hasEscaped);
  }

  checkDefeat(players) {
    // All players dead
    return players.every(p => p.isDead);
  }
}
```

## Win/Lose Conditions

### Win Flow

1. **Evidence Collection:** Players find 2+ evidence types using tools
2. **Ghost Identification:** Press G to open guess modal
3. **Select Ghost Type:** Choose from filtered options
4. **Exit Door Opens:** Correct guess unlocks exit
5. **Team Escape:** All players reach exit for victory

### Lose Flow

1. **Player Death:** Caught during hunt or sanity reaches 0
2. **Spectator Mode:** Dead players watch
3. **Game Over:** All players dead

### Scoring

| Action | Points |
|--------|-------|
| Each evidence found | +100 |
| Correct ghost ID | +500 |
| Each player escaped | +200 |
| Time bonus (under 5 min) | +300 |
| Perfect identification | +100 |

## Common Pitfalls

### Pitfall 1: Evidence Never Appears

**What goes wrong:** Certain evidence types never manifest

**Why it happens:** Random triggering without guaranteed spawns

**How to avoid:** Implement minimum spawn intervals per evidence type

**Warning signs:** Players cannot identify ghost after 10 minutes

### Pitfall 2: Tool Range Issues

**What goes wrong:** Tools detect ghost from too far away

**Why it happens:** Incorrect range calculation or detection logic

**How to avoid:** Calibrate detection ranges per tool (EMF: 3.5m, Thermometer: visual, UV: 3m)

**Warning signs:** Evidence found in wrong rooms

### Pitfall 3: Ghost Type Filter Inconsistency

**What goes wrong:** Journal filtering shows impossible ghosts

**Why it happens:** Evidence state not properly synced

**How to avoid:** Validate filtered list against confirmed evidence

**Warning signs:** Ghost with no matching evidence appears

### Pitfall 4: Exit Door Logic Failures

**What goes wrong:** Exit opens for incorrect guess

**Why it happens:** Missing validation in guess callback

**How to avoid:** Require 2+ evidence before enabling guess

**Warning signs:** Players can guess without evidence

### Pitfall 5: Spectator Mode Not Working

**What goes wrong:** Dead players stuck, cannot watch

**Why it happens:** Camera not transferred to spectator system

**How to avoid:** Implement spectator camera on death

**Warning signs:** Game hangs when player dies

## Code Examples

### Evidence Detection Manager

```javascript
// Source: Phasmophobia-style detection
class EvidenceManager {
  constructor() {
    this.foundEvidence = new Set();
    this.tools = {
      emf: new EMFReader(),
      thermometer: new Thermometer(),
      uv: new UVLight(),
      camera: new VideoCamera(),
      book: new SpiritBook()
    };
  }

  update(ghost, player, room) {
    // Check each tool
    if (this.tools.thermometer.checkTemperature(ghost, player, room)) {
      this.foundEvidence.add(EvidenceType.COLD);
    }
    if (this.tools.emf.hasEvidence()) {
      this.foundEvidence.add(EvidenceType.EMF);
    }
    if (this.tools.camera.detectOrbs(ghost)) {
      this.foundEvidence.add(EvidenceType.ORBS);
    }
    if (this.tools.uv.detectFingerprints(player)) {
      this.foundEvidence.add(EvidenceType.UV);
    }
    if (this.tools.book.hasWriting()) {
      this.foundEvidence.add(EvidenceType.WRITING);
    }
    if (this.detectWhispers(player, room)) {
      this.foundEvidence.add(EvidenceType.WHISPERS);
    }
  }

  detectWhispers(player, room) {
    // Audio detection logic
    return room.hasWhisperActivity && player.hasAudioDevice;
  }

  getEvidenceCount() {
    return this.foundEvidence.size;
  }

  hasMinimumEvidence() {
    return this.foundEvidence.size >= 2;
  }
}
```

### Tool HUD Rendering

```javascript
// Source: HUD tool display
function renderToolBar(tools, selectedTool) {
  const toolbar = document.getElementById('toolbar');
  toolbar.innerHTML = '';

  tools.forEach((tool, index) => {
    const slot = document.createElement('div');
    slot.className = `tool-slot ${index === selectedTool ? 'selected' : ''}`;
    slot.textContent = tool.name;
    slot.style.borderColor = tool.hasEvidence ? '#0f0' : '#fff';
    toolbar.appendChild(slot);
  });
}
```

### Journal Evidence Checkboxes

```javascript
// Source: Journal evidence UI
function renderJournalEvidence(evidenceManager, ghostFilter) {
  const evidencePage = document.getElementById('evidence-page');
  const evidenceTypes = Object.values(EvidenceType);

  evidenceTypes.forEach(evidence => {
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = evidenceManager.foundEvidence.has(evidence);
    checkbox.onChange = () => {
      ghostFilter.markEvidence(evidence, checkbox.checked);
      updateGhostList(ghostFilter.getPossibleGhosts());
    };

    const label = document.createElement('label');
    label.textContent = evidence;
    label.appendChild(checkbox);

    evidencePage.appendChild(label);
  });
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single evidence | 3-of-6 evidence system | 2020 (Phasmophobia) | Core identification gameplay |
| Manual note-taking | In-game journal | 2020+ | Streamlined UX |
| Static exit | Evidence-gated exit | Phasmophobia | Prevents early escape |
| Death = game over | Spectator mode | 2021+ | Multiplayer friendly |

**Deprecated/outdated:**
- Single player escape wins - Replaced by team escape requirement
- Instant death on catch - Replaced by sanity-based vulnerability
- Manual ghost type entry - Replaced by selection modal

## Open Questions

1. **Evidence manifestation timing**
   - What we know: Evidence appears during ghost activity
   - What's unclear: Should evidence be guaranteed or random?
   - Recommendation: Guaranteed at least one evidence spawn per 60 seconds

2. **Minimum evidence for guess**
   - What we know: Phasmophobia requires 3 evidence
   - What's unclear: This game uses 6 evidence, how many needed?
   - Recommendation: 2 evidence (consistent with EVID-01 requirements)

3. **Scoring details**
   - What we know: Points for evidence and escape
   - What's unclear: Exact point values?
   - Recommendation: 100 per evidence, 500 for ID, 200 per escape

## Sources

### Primary (HIGH confidence)
- Phasmophobia wiki - Evidence system, ghost types, tool mechanics
- GamingScan equipment guide - Tool functionality and ranges

### Secondary (MEDIUM confidence)
- Phasmophobia journal guide - Journal UI patterns
- Game community guides - Win/lose conditions

### Tertiary (LOW confidence)
- Various game tutorials - Need verification

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Three.js and Web Audio API are stable
- Architecture: HIGH - Phasmophobia pattern well-established
- Pitfalls: MEDIUM - Based on game community reports

**Research date:** 2026-04-14  
**Valid until:** 2026-05-14 (30 days for stable patterns)