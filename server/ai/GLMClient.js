/**
 * GLM AI Client - Ghost dialogue via GLM API
 */
import 'dotenv/config';

const API_KEY = process.env.GLM_API_KEY;
const API_URL = 'https://api.zhipuai.cn/v1/chat/completions';

/**
 * Fallback responses by category
 */
const FALLBACK_RESPONSES = {
  general: [
    "Leave this place...",
    "You don't belong here.",
    "I was here first...",
    "The dead don't rest.",
    "Can you hear them?",
    "They're always watching.",
    "Why did you come?",
    "Turn back while you still can.",
    "The house remembers.",
    "Some doors shouldn't be opened."
  ],
  evidence: [
    "You think you can prove I exist?",
    "The cold doesn't lie.",
    "Do you feel that?",
    "The EMF doesn't lie.",
    "I touched that.",
    "You can't hide from me.",
    "The truth is in the silence."
  ],
  hunt: [
    "RUN.",
    "You can't escape.",
    "Too late.",
    "I see you.",
    "Now you see me.",
    "Stay..."
  ],
  player_specific: [
    "{name}, you shouldn't be here.",
    "{name}, leave me alone.",
    "Go ahead {name}, test your luck.",
    "{name}... are you scared?"
  ]
};

/**
 * Ghost dialogue system
 */
export class GhostDialogue {
  constructor(apiKey = API_KEY) {
    this.apiKey = apiKey;
    this.enabled = !!apiKey && apiKey !== 'your-api-key-here';
    this.cache = new Map();
  }
  
  /**
   * Build system prompt based on game state
   */
  buildSystemPrompt(ghostType, ghostState, evidence, players) {
    const evidenceList = evidence.length > 0 ? evidence.join(', ') : 'none collected yet';
    
    let prompt = `You are the ${ghostType} haunting this house. Rules:
- Speak in 1-2 short, unsettling sentences maximum
- Sometimes use player names to unsettle them
- Reference the room you're in or things happening
- Be cryptic, threatening, or eerily calm
- Never be helpful or break character
- Occasionally refuse to speak (reply with "...")
- You may whisper, scream, or speak in riddles

Current state: ${ghostState}
Evidence found: ${evidenceList}
Ghost room: somewhere in the house`;
    
    return prompt;
  }
  
  /**
   * Generate response
   */
  async generate(ghostType, ghostState, evidence, playerMessage, playerName = 'Investigator') {
    const hasEvidence = evidence.length > 0;
    
    // Determine response category
    let category = 'general';
    if (/emf|cold|evidence|proof/i.test(playerMessage)) {
      category = 'evidence';
    } else if (ghostState === 'Hunting' || ghostState === 'PreHunt') {
      category = 'hunt';
    }
    
    // Try API first
    if (this.enabled) {
      try {
        return await this.callAPI(playerMessage, playerName, ghostType);
      } catch (error) {
        console.log('GLM API failed, using fallback:', error.message);
      }
    }
    
    // Fallback response
    return this.getFallback(category, playerName);
  }
  
  /**
   * Call GLM API
   */
  async callAPI(message, playerName, ghostType) {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: 'glm-4-flash',
        messages: [
          {
            role: 'system',
            content: this.buildSystemPrompt(ghostType, 'Stalking', [], [])
          },
          {
            role: 'user',
            content: `${playerName}: ${message}`
          }
        ],
        max_tokens: 64,
        temperature: 0.7
      })
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.choices?.[0]?.message?.content || this.getFallback('general', playerName);
  }
  
  /**
   * Get fallback response
   */
  getFallback(category, playerName) {
    const pool = category === 'general' && Math.random() > 0.3
      ? [...FALLBACK_RESPONSES.general, ...FALLBACK_RESPONSES.evidence]
      : FALLBACK_RESPONSES[category] || FALLBACK_RESPONSES.general;
    
    let response = pool[Math.floor(Math.random() * pool.length)];
    
    // Replace player name placeholder
    if (response.includes('{name}')) {
      const namePool = FALLBACK_RESPONSES.player_specific;
      const nameResponse = namePool[Math.floor(Math.random() * namePool.length)];
      response = nameResponse.replace('{name}', playerName);
    }
    
    return response;
  }
  
  /**
   * Check if API is enabled
   */
  isEnabled() {
    return this.enabled;
  }
}