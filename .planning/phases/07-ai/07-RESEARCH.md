# Phase 7: AI Dialogue - Research

**Researched:** 2026-04-14
**Domain:** GLM API Integration, Ghost System Prompt, Fallback Response Pool
**Confidence:** HIGH

## Summary

This phase covers GLM API integration for AI-powered ghost dialogue using Zhipu AI's GLM model series. The API uses OpenAI-compatible endpoints at `https://api.z.ai/api/paas/v4/` with Bearer token authentication. For the fallback system, a response pool pattern provides pre-scripted ghost dialogue when the API is unavailable, ensuring gameplay continuity without an API key or during service outages.

**Primary recommendation:** Use GLM-4 Flash (free tier) for cost-effective ghost dialogue, implement a tiered fallback system: API -> cached responses -> response pool, and design the system prompt around ghost type/behavior from Phase 4 research.

## User Constraints

No user constraints found. This phase is unconstrained and allows full research.

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AI-01 | GLM API integration | OpenAI-compatible API at api.z.ai with Bearer auth |
| AI-02 | Ghost system prompt | Context fromPhase 4: ghost type, state, evidence collected |
| AI-03 | Context-aware responses | Include player name, ghost state, evidence in prompt |
| AI-04 | Fallback response pool | Pre-scripted responses for offline/API-less play |
| AI-05 | Player name incorporation | Pass player name from lobby to dialogue system |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| GLM API | Latest | AI dialogue generation | Zhipu AI flagship model |
| GLM-4 Flash | Free tier | Cost-effective fallback | No API cost, OpenAI-compatible |
| fetch API | browser native | HTTP requests | No external dependency needed |

### Supporting

| Library | Purpose | When to Use |
|---------|---------|-------------|
| node-fetch | Server-side API calls | WebSocket server in Node.js |
| .env | API key storage | Keep secrets out of source |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| GLM-5 | GLM-4 Flash (free) | Free tier available, slightly less capable |
| GLM API | OpenRouter GLM | Alternative endpoint, may have different pricing |
| Custom HTTP | axios/fetch | Native fetch reduces bundle size |

**Installation:**
```bash
# No additional packages - native fetch for client
# Server-side uses existing ws dependency from Phase 1
```

## Architecture Patterns

### Recommended Project Structure

```
src/
├── ai/
│   ├── GhostDialogue.js       # Main dialogue system
│   ├── GLMClient.js         # API client wrapper
│   ├── SystemPrompt.js      # Ghost system prompt builder
│   ├── ResponseCache.js    # Cached response storage
│   └── ResponsePool.js     # Fallback response pool
├── config/
│   └── ghostPersonalities.js # Ghost type dialogue styles
└── server/
    └── dialogueHandlers.js  # Server-side handlers (optional)
```

### Pattern 1: GLM API Client (OpenAI-Compatible)

**What:** OpenAI-compatible client for GLM API calls

**When to use:** For generating dynamic ghost dialogue

**Example:**
```javascript
// Source: Adapted from GLM API docs (api.z.ai)
class GLMClient {
  constructor(apiKey, baseUrl = 'https://api.z.ai/api/paas/v4/') {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.model = 'glm-4-flash'; // Free tier model
  }

  async complete(messages, options = {}) {
    const response = await fetch(`${this.baseUrl}chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: this.model,
        messages: messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 256,
        stream: false
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new GLMError(response.status, error.message || 'API error');
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }
}

class GLMError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'GLMError';
    this.status = status;
  }
}
```

### Pattern 2: Ghost System Prompt Builder

**What:** Dynamic system prompt based on ghost type and current state

**When to use:** For contextual AI dialogue that reflects game state

**Example:**
```javascript
// Source: Based on Phase 4 ghost research
class GhostSystemPrompt {
  static build(context) {
    const { ghostType, ghostState, evidence, playerName, sanity } = context;

    const typePrompt = this.getGhostTypePrompt(ghostType);
    const statePrompt = this.getStatePrompt(ghostState, sanity);
    const evidencePrompt = this.getEvidencePrompt(evidence);

    return `You are a ${ghostType.name} ghost in a haunted Victorian house.
Your traits: ${typePrompt.traits}
Current behavior: ${statePrompt.behavior}
Evidence found: ${evidencePrompt.summary}
Player ${playerName} is investigating.

Respond in a chilling, atmospheric manner. Keep responses under 100 words.
${typePrompt.dialogueStyle}`;
  }

  static getGhostTypePrompt(ghostType) {
    const prompts = {
      PHANTOM: {
        traits: 'ethereal, can drift through walls, feared but majestic',
        dialogueStyle: 'Speak in whispers, hint at tragic past.'
      },
      BANSHEE: {
        traits: 'screams before hunts, targets one player relentlessly',
        dialogueStyle: 'Make piercing warnings. Reference your chosen victim.'
      },
      REVENANT: {
        traits: 'slow but relentless hunter, grows faster when hidden',
        dialogueStyle: 'Speak slowly and menacingly. Never give up pursuit.'
      },
      SHADE: {
        traits: 'shy, hard to detect, hunts when alone',
        dialogueStyle: 'Hide in shadows. Speak from hidden positions.'
      },
      POLTERGEIST: {
        traits: 'throws objects, creates noise, violent manifestations',
        dialogueStyle: 'Speak while making noise. Reference objects moving.'
      },
      WRAITH: {
        traits: 'can phase through walls, no footprints',
        dialogueStyle: 'Appear suddenly. Reference your ghostly nature.'
      }
    };
    return prompts[ghostType] || prompts.PHANTOM;
  }

  static getStatePrompt(state, sanity) {
    const behaviors = {
      IDLE: 'wandering aimlessly, manifesting occasionally',
      ROAMING: 'moving between rooms, leaving traces',
      STALKING: 'following the player at a distance',
      INTERACTING: 'causing evidence manifestations',
      PREHUNT: 'growing more aggressive, hunting soon',
      HUNTING: 'actively chasing to kill the player',
      FLEEING: 'retreating to a safe room',
      COOLDOWN: 'recovering after a hunt, less active'
    };
    return { behavior: behaviors[state] || 'lurking' };
  }

  static getEvidencePrompt(evidence) {
    if (!evidence || evidence.length === 0) return { summary: 'none yet discovered' };
    const names = evidence.map(e => e.type).join(', ');
    return { summary: names };
  }
}
```

### Pattern 3: Fallback Response Pool

**What:** Pre-scripted responses when API is unavailable

**When to use:** For offline play or API key configuration

**Example:**
```javascript
// Source: Adapted from AI fallback patterns research
class ResponsePool {
  constructor() {
    this.pools = new Map();
    this.initialize();
  }

  initialize() {
    // General haunting responses
    this.pools.set('general', [
      "Did you hear that? Something is wrong with this place...",
      "The temperature drops. Something watches from the darkness.",
      "You feel like you're being followed...",
      "A cold breeze passes through you.",
      "The shadows seem to move on their own.",
      "You hear footsteps behind you. But no one is there.",
      "The candle flickers wildly. Something approaches.",
      "A whisper in your ear: 'Leave... while you still can...'",
      "The walls seem to close in around you.",
      "You smell something burning, but there's no fire."
    ]);

    // Evidence-related responses
    this.pools.set('evidence', [
      "The thermometer plummets! Something is nearby...",
      "The EMF reader spikes! There's an energy signature!",
      "The spirit book pages turn on their own!",
      "You see orbs floating in the darkness...",
      "The UV light reveals hidden markings!",
      "DOTS sensor detects movement in the empty room!",
      "Cold spots appear and disappear randomly."
    ]);

    // Hunt warnings
    this.pools.set('hunt', [
      "RUN! IT'S HUNTING!",
      "FIND A HIDING SPOT NOW!",
      "THE GHOST KNOWS WHERE YOU ARE!",
      "IT'S COMING! FIND A CLOSET!",
      "DON'T MOVE! IT CAN SEE YOU!",
      "THE HUNT HAS BEGUN! FIND COVER!",
      "IT'S CLOSE! HIDE!"
    ]);

    // Evidence-specific responses
    this.pools.set('emf', ["The EMF spikes to {value}!", "Energy reading: {value}"]);
    this.pools.set('cold', ["Temperature drops to {value}°C!", "A cold spot forms at {value}°C"]);
    this.pools.set('orbs', ["Ghost orbs materialize!", "You see glowing orbs floating..."]);
    this.pools.set('writing', ["The book writes itself...", "Words appear in the book!"]);
  }

  getRandom(category = 'general') {
    const pool = this.pools.get(category) || this.pools.get('general');
    return pool[Math.floor(Math.random() * pool.length)];
  }

  getForEvidence(evidenceType) {
    return this.getRandom(evidenceType);
  }

  getHuntWarning() {
    return this.getRandom('hunt');
  }

  addCustomResponse(category, response) {
    if (!this.pools.has(category)) {
      this.pools.set(category, []);
    }
    this.pools.get(category).push(response);
  }
}
```

### Pattern 4: Tiered Fallback System

**What:** Progressive fallback from API to cache to pool

**When to use:** For reliable dialogue in all conditions

**Example:**
```javascript
// Source: Adapted from AI resilience patterns
class GhostDialogueSystem {
  constructor(glmClient, cache, responsePool) {
    this.glm = glmClient;
    this.cache = cache;
    this.pool = responsePool;
  }

  async getResponse(context) {
    // Level 1: Try cached response first
    const cacheKey = this.getCacheKey(context);
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return { source: 'cache', content: cached };
    }

    // Level 2: Try GLM API
    if (this.glm.apiKey) {
      try {
        const message = await this.buildContextMessage(context);
        const response = await this.callWithTimeout(
          () => this.glm.complete(message),
          8000 // 8 second timeout
        );

        if (response) {
          await this.cache.set(cacheKey, response, 300); // 5 min TTL
          return { source: 'api', content: response };
        }
      } catch (error) {
        console.warn('GLM API failed:', error.message);
      }
    }

    // Level 3: Fallback response pool
    return {
      source: 'pool',
      content: this.pool.getRandom(this.selectPoolCategory(context))
    };
  }

  buildContextMessage(context) {
    const systemPrompt = GhostSystemPrompt.build({
      ghostType: context.ghostType,
      ghostState: context.ghostState,
      evidence: context.evidence,
      playerName: context.playerName,
      sanity: context.sanity
    });

    return [
      { role: 'system', content: systemPrompt },
      ...context.recentMessages || [],
      { role: 'user', content: context.playerMessage || 'What is happening?' }
    ];
  }

  selectPoolCategory(context) {
    if (context.ghostState === 'HUNTING') return 'hunt';
    if (context.evidence?.length > 0) return 'evidence';
    return 'general';
  }

  async callWithTimeout(fn, timeoutMs) {
    return Promise.race([
      fn(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), timeoutMs)
      )
    ]);
  }

  getCacheKey(context) {
    // Hash based on ghost type, state, and evidence
    const data = `${context.ghostType}-${context.ghostState}-${context.evidence?.length || 0}`;
    return btoa(data).slice(0, 32);
  }
}
```

### Pattern 5: Cache System

**What:** Simple in-memory cache for recent responses

**When to use:** For reducing API calls and faster responses

**Example:**
```javascript
// Source: Common caching patterns
class ResponseCache {
  constructor(ttlSeconds = 300) {
    this.cache = new Map();
    this.ttl = ttlSeconds * 1000;
  }

  async get(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  async set(key, value, ttlSeconds) {
    const ttl = (ttlSeconds || this.ttl / 1000) * 1000;
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      ttl
    });

    // Cleanup old entries periodically
    if (this.cache.size > 100) {
      this.cleanup();
    }
  }

  cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.cache) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  clear() {
    this.cache.clear();
  }
}
```

### Anti-Patterns to Avoid

- **No API key fallback:** Always include response pool for users without API keys
- **Hard-coded responses:** Make sure pool has variety to avoid repetition
- **No timeout handling:** Long API delays break immersion in horror games
- **Ignoring ghost state:** Dialogue should reflect hunt state urgency

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|------------|-----|
| HTTP client | Custom fetch wrapper | Native fetch | Minimal bundle, works in browser |
| Response caching | Redis/complex cache | Simple in-memory Map | Only server needs it, brief TTL |
| Error classification | Complex categorization | Simple try/catch | Overengineering for game dialogue |

## Common Pitfalls

### Pitfall 1: API Key Not Configured
**What goes wrong:** Dialogue system crashes without API key
**Why it happens:** Not checking for API key before calling
**How to avoid:** Check `process.env.VITE_GLM_API_KEY` and fallback to pool
**Warning signs:** "API key required" errors in console

### Pitfall 2: Response Too Long
**What goes wrong:** Long AI responses break horror pacing
**Why it happens:** No max_tokens limit or system prompt instructions
**How to avoid:** Set `max_tokens: 100-150` in API call
**Warning signs:** Multi-paragraph ghostly speeches

### Pitfall 3: Same Response Repeated
**What goes wrong:** Cached response replays repeatedly
**Why it happens:** Cache key too simple, TTL too long
**How to avoid:** Include more context in cache key, use shorter TTL
**Warning signs:** Players comment on repetitive dialogue

### Pitfall 4: Hunt Response During Non-Hunt
**What goes wrong:** Emergency hunt messages appear when ghost is idle
**Why it happens:** Not checking ghost state before selecting pool
**How to avoid:** Use `selectPoolCategory()` based on state
**Warning words:** "RUN!" appearing during normal investigation

## Code Examples

### Server-Side API Handler (Node.js)
```javascript
// Source: WebSocket server integration
const GLM_CLIENT = new GLMClient(process.env.GLM_API_KEY);
const RESPONSE_POOL = new ResponsePool();
const RESPONSE_CACHE = new ResponseCache();

async function handleGhostChat(ws, message) {
  const { playerId, playerName, content, gameState } = message;

  const context = {
    ghostType: gameState.ghost.type,
    ghostState: gameState.ghost.state,
    evidence: gameState.collectedEvidence,
    playerName,
    sanity: gameState.players[playerId]?.sanity || 100,
    recentMessages: gameState.recentChat?.slice(-5) || [],
    playerMessage: content
  };

  const dialogueSystem = new GhostDialogueSystem(
    GLM_CLIENT,
    RESPONSE_CACHE,
    RESPONSE_POOL
  );

  const response = await dialogueSystem.getResponse(context);

  ws.send(JSON.stringify({
    type: 'ghost_message',
    content: response.content,
    source: response.source
  }));
}
```

### Client Triggering Dialogue
```javascript
// Source: Client-side chat system
function triggerGhostDialogue(gameState, playerMessage) {
  const message = {
    type: 'chat_message',
    playerId: gameState.playerId,
    playerName: gameState.playerName,
    content: playerMessage,
    gameState: {
      ghost: { type: gameState.ghostType, state: gameState.ghostState },
      collectedEvidence: gameState.evidence,
      sanity: gameState.sanity
    }
  };

  ws.send(JSON.stringify(message));
}

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'ghost_message') {
    displayGhostMessage(data.content, data.source);
    playGhostAudio(data.source === 'api'); // Only audio for live responses
  }
};
```

### Environment Configuration (.env)
```bash
# GLM API Configuration
# Get your free API key at https://open.bigmodel.cn or https://z.ai
GLM_API_KEY=your_api_key_here

# Optional: Use different endpoint for China region
# GLM_BASE_URL=https://open.bigmodel.cn/api/paas/v4/
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Localized text files | AI-generated dialogue | Phasmophobia (2020) | Dynamic, non-repetitive responses |
| Single response pool | Tiered fallback systems | 2024+ | Reliable with graceful degradation |
| Hard-coded personalities | Context-aware prompts | 2025+ | Ghost type affects dialogue style |

**Deprecated/outdated:**
- Static text files - Replaced by AI + fallback pool hybrid
- Single API provider - Multi-provider fallbacks now standard

## Open Questions

1. **Free tier rate limits**
   - What we know: GLM-4 Flash is free but rate-limited
   - What's unclear: Exact limits for game dialogue usage
   - Recommendation: Cache aggressively, fallback to pool at limits

2. **Response latency**
   - What we know: GLM API typically responds in 1-3 seconds
   - What's unclear: How players perceive delay in horror context
   - Recommendation: Show subtle typing indicator, use cache when available

3. **Multiplayer dialogue priority**
   - What we know: Need to handle multiple chat requests
   - What's unclear: Should ghost respond to all players or one at a time
   - Recommendation: Queue responses, respond to most recent message

## Sources

### Primary (HIGH confidence)
- GLM API documentation (api.z.ai) - Endpoint, authentication, models
- Apidog GLM-5 guide - OpenAI-compatible format examples

### Secondary (MEDIUM confidence)
- AI resilience patterns - Fallback chain, cache, circuit breaker
- Phase 4 ghost research - Ghost types, states, behaviors

### Tertiary (LOW confidence)
- Phasmophobia dialogue patterns - Need verification for game-specific needs
- Game horror AI tutorials - Need verification

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - GLM API well-documented, OpenAI-compatible
- Architecture: HIGH - Fallback patterns well-established
- Pitfalls: MEDIUM - Based on general AI API issues, need game testing
- Ghost system prompt: HIGH - Phase 4 provides ghost context

**Research date:** 2026-04-14
**Valid until:** 2026-05-14 (30 days for stable API, 7 for fast-moving)