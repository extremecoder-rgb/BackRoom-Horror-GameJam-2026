---
phase: 07-ai
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/ai/GLMClient.js
  - src/ai/SystemPrompt.js
  - src/ai/ResponsePool.js
  - src/ai/ResponseCache.js
  - src/ai/GhostDialogue.js
  - src/config/ghostPersonalities.js
  - .env
autonomous: true
requirements:
  - AI-01
  - AI-02
  - AI-03
  - AI-04
  - AI-05
must_haves:
  truths:
    - "Ghost responds to player questions via GLM API with context-aware dialogue"
    - "Ghost uses player name in responses"
    - "Fallback pre-written responses work when API unavailable"
    - "Ghost dialogue reflects current behavior state (more talkative when hunting?)"
    - "Response cache reduces API calls and latency"
  artifacts:
    - path: "src/ai/GLMClient.js"
      provides: "OpenAI-compatible GLM API client"
      exports: ["GLMClient", "class"]
      min_lines: 60
    - path: "src/ai/SystemPrompt.js"
      provides: "Ghost system prompt builder with type/state context"
      exports: ["GhostSystemPrompt", "class"]
      min_lines: 100
    - path: "src/ai/ResponsePool.js"
      provides: "Pre-scripted fallback responses by category"
      exports: ["ResponsePool", "class"]
      min_lines: 80
    - path: "src/ai/ResponseCache.js"
      provides: "In-memory response cache with TTL"
      exports: ["ResponseCache", "class"]
      min_lines: 40
    - path: "src/ai/GhostDialogue.js"
      provides: "Main dialogue system with tiered fallback"
      exports: ["GhostDialogue", "class"]
      min_lines: 80
    - path: "src/config/ghostPersonalities.js"
      provides: "Ghost type dialogue style configurations"
      exports: ["ghostPersonalities", "object"]
      min_lines: 40
  key_links:
    - from: "GhostDialogue.js"
      to: "GLMClient.js"
      via: "complete() method for API calls"
      pattern: "glm.complete"
    - from: "GhostDialogue.js"
      to: "ResponsePool.js"
      via: "getRandom() for fallback responses"
      pattern: "pool.getRandom"
    - from: "GhostDialogue.js"
      to: "ResponseCache.js"
      via: "get/set for cache lookup"
      pattern: "cache.get|cache.set"
    - from: "GhostDialogue.js"
      to: "SystemPrompt.js"
      via: "build() for context prompts"
      pattern: "SystemPrompt.build"
    - from: "SystemPrompt.js"
      to: "ghostPersonalities.js"
      via: "getGhostTypePrompt() lookup"
      pattern: "ghostPersonalities"
---

<objective>
Build GLM-powered ghost dialogue system with contextual responses, player name incorporation, and a tiered fallback system.

Purpose: Enable players to communicate with the ghost via chat, receiving AI-generated contextual responses. The system must work offline via fallback responses when API is unavailable.

Output:
- GLM API client with OpenAI-compatible interface
- Ghost system prompt builder with type/state context
- Pre-scripted response pool for offline play
- Response cache to reduce API calls
- Main dialogue system with API -> cache -> pool fallback
</objective>

<execution_context>
@C:/Users/user/.config/opencode/get-shit-done/workflows/execute-plan.md
@C:/Users/user/.config/opencode/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/ROADMAP.md
@.planning/phases/07-ai/07-RESEARCH.md
@.planning/phases/06-audio/06-01-PLAN.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: GLM API client and environment configuration</name>
  <files>src/ai/GLMClient.js, .env</files>
  <action>
Create GLMClient (src/ai/GLMClient.js):

1. Constructor(apiKey, baseUrl):
   - apiKey: Bearer token for authentication
   - baseUrl: default 'https://api.z.ai/api/paas/v4/'
   - model: 'glm-4-flash' (free tier)
   - timeout: 8000ms default

2. async complete(messages, options):
   - messages: [{role, content}] array
   - options: {temperature, maxTokens}
   - Return: response content string
   - Throw: GLMError on API failure

3. Error handling:
   - GLMError class with status, message
   - Parse error responses for meaningful messages

4. Helper methods:
   - isConfigured(): check if API key exists
   - setTimeout(ms): update timeout

Create .env template:
```
# GLM API Configuration
# Get your free API key at https://z.ai or https://open.bigmodel.cn
VITE_GLM_API_KEY=your_api_key_here
```

Reference RESEARCH.md: Pattern 1 - OpenAI-compatible client
  </action>
  <verify>
GLMClient instantiates without API key (graceful)
complete() returns content on valid response
GLMError thrown on API failure with status code
API key check works via isConfigured()
  </verify>
  <done>
GLMClient class with OpenAI-compatible interface
Error handling with GLMError class
Environment variable support for API key
Graceful handling when no API key configured
  </done>
</task>

<task type="auto">
  <name>Task 2: Ghost system prompt and personality config</name>
  <files>src/ai/SystemPrompt.js, src/config/ghostPersonalities.js</files>
  <action>
Create ghostPersonalities.js (src/config/ghostPersonalities.js):

1. Export ghostPersonalities object with 6 ghost types:
   - PHANTOM: ethereal, whispers, tragic hints
   - BANSHEE: piercing warnings, targets victim
   - REVENANT: slow menacing, relentless pursuit
   - SHADE: shy, hidden, hunts alone
   - POLTERGEIST: noise + objects, violent
   - WRAITH: sudden appearances, ghostly nature

2. Each type has:
   - traits: description string
   - dialogueStyle: how to speak
   - responseLength: max words

Create SystemPrompt.js (src/ai/SystemPrompt.js):

1. static build(context):
   - context: {ghostType, ghostState, evidence, playerName, sanity}
   - Return: system prompt string

2. static getGhostTypePrompt(type):
   - Lookup ghost type in ghostPersonalities
   - Return traits + dialogueStyle

3. static getStatePrompt(state, sanity):
   - Map ghost state to behavior description
   - States: IDLE, ROAMING, STALKING, INTERACTING, PREHUNT, HUNTING, FLEEING, COOLDOWN

4. static getEvidencePrompt(evidence):
   - Format evidence found as summary

5. Build prompt includes:
   - Ghost name/type and traits
   - Current behavior state
   - Evidence discovered
   - Player name
   - Response length constraint (<100 words)
   - Dialogue style from personality

Reference RESEARCH.md: Pattern 2 - Ghost System Prompt Builder
  </action>
  <verify>
SystemPrompt.build() returns valid prompt string
Ghost type influences dialogue style
State affects behavior description
Player name appears in prompt
Evidence collected included in prompt
  </verify>
  <done>
Ghost personality config for 6 types
SystemPrompt class building contextual prompts
Type, state, evidence, player name all incorporated
Response length constraint in prompt
  </done>
</task>

<task type="auto">
  <name>Task 3: Response pool and cache system</name>
  <files>src/ai/ResponsePool.js, src/ai/ResponseCache.js</files>
  <action>
Create ResponsePool.js (src/ai/ResponsePool.js):

1. Constructor():
   - Initialize category pools

2. Categories:
   - 'general': haunting atmosphere responses
   - 'evidence': detection-related responses
   - 'hunt': urgent warning responses
   - 'emf', 'cold', 'orbs', 'writing': evidence-specific

3. Responses per category (10+ each):
   - General: "The temperature drops...", "Something watches...", etc.
   - Evidence: "The EMF spikes!", "The thermometer plummets!", etc.
   - Hunt: "RUN! IT'S HUNTING!", "FIND A HIDING SPOT!", etc.

4. Methods:
   - getRandom(category): random response
   - getForEvidence(evidenceType): specific response
   - getHuntWarning(): urgent response
   - addCustomResponse(category, response): extend pool

Create ResponseCache.js (src/ai/ResponseCache.js):

1. Constructor(ttlSeconds):
   - default TTL: 300 seconds (5 min)

2. Methods:
   - async get(key): return cached value or null if expired
   - async set(key, value, ttlSeconds): store with timestamp
   - cleanup(): remove expired entries
   - clear(): empty cache

3. Cache key generation:
   - Based on ghost type, state, evidence count
   - Simple hash: btoa(data).slice(0, 32)

Reference RESEARCH.md: Patterns 3, 5 - Fallback Response Pool, Cache System
  </action>
  <verify>
ResponsePool has 10+ responses per category
getRandom() returns random from pool
getHuntWarning() returns urgent response
ResponseCache stores and retrieves values
Expired entries return null on get
  </verify>
  <done>
ResponsePool with categorized fallback responses
ResponseCache with TTL-based expiration
Cache cleanup to prevent memory bloat
Category-based selection for hunt/evidence states
  </done>
</task>

<task type="auto">
  <name>Task 4: Main GhostDialogue system with tiered fallback</name>
  <files>src/ai/GhostDialogue.js</files>
  <action>
Create GhostDialogue.js (src/ai/GhostDialogue.js):

1. Constructor(glmClient, cache, responsePool):
   - Store dependencies
   - Initialize default timeout (8s)

2. async getResponse(context):
   - context: {ghostType, ghostState, evidence, playerName, sanity, recentMessages, playerMessage}

3. Tiered fallback logic:
   - Level 1: Check cache (getCacheKey based on type/state/evidence)
   - Level 2: Try GLM API if configured
   - Level 3: Fallback to response pool

4. buildContextMessage(context):
   - Build messages array: [system, ...recent, user]
   - System prompt from GhostSystemPrompt.build()

5. selectPoolCategory(context):
   - If ghostState === 'HUNTING': return 'hunt'
   - If evidence.length > 0: return 'evidence'
   - Default: return 'general'

6. callWithTimeout(fn, timeoutMs):
   - Promise.race with timeout rejection
   - Prevents long API delays

7. getCacheKey(context):
   - Hash: `${ghostType}-${ghostState}-${evidence.length}`

8. Returns: {source: 'api'|'cache'|'pool', content: string}

Reference RESEARCH.md: Pattern 4 - Tiered Fallback System

Integration: GhostDialogue integrates with Phase 4 ghost types and Phase 6 audio (playGhostEvent for audio on API responses).
  </action>
  <verify>
getResponse() returns response from API when available
getResponse() falls back to cache on repeat query
getResponse() falls back to pool when API unavailable
Source indicator ('api', 'cache', 'pool') returned
Timeout prevents long API waits
Cache key properly distinguishes contexts
  </verify>
  <done>
GhostDialogue class with tiered fallback
API -> cache -> pool fallback chain
Timeout handling for API calls
Source tracking for response origin
Integration point for GhostSystemPrompt
  </done>
</task>

</tasks>

<verification>
1. GLMClient makes API calls with proper auth
2. SystemPrompt builds context-aware prompts
3. ResponsePool provides fallback responses
4. ResponseCache stores/retrieves with TTL
5. GhostDialogue coordinates all components
6. Player name appears in responses
7. Ghost state affects dialogue tone
8. Hunt state returns urgent responses
9. Works offline with response pool only
10. Source indicator tracks response origin
</verification>

<success_criteria>
- [ ] AI-01: GLM API integration working
- [ ] AI-02: Ghost system prompt with type/state context
- [ ] AI-03: Context-aware responses with player name
- [ ] AI-04: Fallback response pool for offline play
- [ ] AI-05: Player name incorporated in responses
- [ ] All 5 requirements satisfied
- [ ] System works without API key (pool fallback)
- [ ] Response cache reduces API calls
- [ ] Timeout handling prevents long waits
</success_criteria>

<output>
After completion, create `.planning/phases/07-ai/07-01-SUMMARY.md`
</output>