/**
 * Ghost Types - 6 ghost types with evidence combinations
 */

export const GhostType = {
  PHANTOM: 'Phantom',
  BANSHEE: 'Banshee',
  REVENANT: 'Revenant',
  SHADE: 'Shade',
  POLTERGEIST: 'Poltergeist',
  WRAITH: 'Wraith'
};

export const EvidenceType = {
  EMF: 'EMF',
  COLD: 'Cold Spot',
  ORBS: 'Ghost Orbs',
  WHISPERS: 'Whispers',
  UV: 'UV Prints',
  WRITING: 'Ghost Writing'
};

// Each ghost type has 3 required evidence types
export const GhostEvidence = {
  [GhostType.PHANTOM]: [EvidenceType.EMF, EvidenceType.COLD, EvidenceType.ORBS],
  [GhostType.BANSHEE]: [EvidenceType.COLD, EvidenceType.WHISPERS, EvidenceType.UV],
  [GhostType.REVENANT]: [EvidenceType.EMF, EvidenceType.WHISPERS, EvidenceType.WRITING],
  [GhostType.SHADE]: [EvidenceType.COLD, EvidenceType.ORBS, EvidenceType.WRITING],
  [GhostType.POLTERGEIST]: [EvidenceType.UV, EvidenceType.WHISPERS, EvidenceType.ORBS],
  [GhostType.WRAITH]: [EvidenceType.EMF, EvidenceType.UV, EvidenceType.COLD]
};

// Ghost type descriptions
export const GhostDescriptions = {
  [GhostType.PHANTOM]: 'The Phantom disappears when photographed or looked at directly.',
  [GhostType.BANSHEE]: 'The Banshee targets one player exclusively and cries before hunting.',
  [GhostType.REVENANT]: 'The Revenant becomes extremely fast during a hunt.',
  [GhostType.SHADE]: 'The Shade only hunts when players are alone.',
  [GhostType.POLTERGEIST]: 'The Poltergeist throws objects violently.',
  [GhostType.WRAITH]: 'The Wraith can teleport through walls.'
};

// Ghost special behaviors
export const GhostBehaviors = {
  [GhostType.PHANTOM]: {
    fleeOnLook: true,
    disappearOnPhoto: true
  },
  [GhostType.BANSHEE]: {
    targetLock: true,
    screamWarning: true
  },
  [GhostType.REVENANT]: {
    fastHunt: true,
    speedMultiplier: 2.5
  },
  [GhostType.SHADE]: {
    soloHunt: true,
    hideOnMultiple: true
  },
  [GhostType.POLTERGEIST]: {
    throwObjects: true,
    violentInteraction: true
  },
  [GhostType.WRAITH]: {
    teleport: true,
    phaseThroughWalls: true
  }
};

/**
 * Get random ghost type
 */
export function getRandomGhostType() {
  const types = Object.values(GhostType);
  return types[Math.floor(Math.random() * types.length)];
}

/**
 * Get evidence for a ghost type
 */
export function getEvidenceForType(ghostType) {
  return GhostEvidence[ghostType] || [];
}

/**
 * Check if evidence matches ghost type
 */
export function checkEvidence(ghostType, foundEvidence) {
  const required = getEvidenceForType(ghostType);
  return required.every(e => foundEvidence.includes(e));
}

/**
 * Get all possible ghost types from evidence
 */
export function getPossibleGhostTypes(foundEvidence) {
  return Object.entries(GhostEvidence)
    .filter(([_, required]) => 
      required.every(e => foundEvidence.includes(e))
    .map(([type, _]) => type);
}