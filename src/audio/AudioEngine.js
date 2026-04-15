/**
 * Audio Engine — Procedural Horror Audio with Web Audio API
 * 
 * Complete procedural audio: no external files needed.
 * Creates all sounds from oscillators, noise, and filters.
 */
export class AudioEngine {
  constructor() {
    this.context = null;
    this.masterGain = null;
    this.initialized = false;
    
    // Sound state
    this.sounds = new Map();
    this.activeSources = new Set();
    
    // Continuous sound refs
    this.humOsc = null;
    this.breathingNode = null;
    this.chaseMusic = null;
    this.ambientDrone = null;
    
    // Heartbeat timing
    this.lastHeartbeat = 0;
    this.heartbeatInterval = 1.0;
    
    // External Assets
    this.laughBuffer = null;
  }
  
  /**
   * Initialize audio context (must be called after user gesture)
   */
  async init() {
    if (this.initialized) return;
    
    try {
      this.context = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.context.createGain();
      this.masterGain.gain.value = 0.5;
      this.masterGain.connect(this.context.destination);
      
      // Compressor to prevent clipping
      this.compressor = this.context.createDynamicsCompressor();
      this.compressor.threshold.value = -20;
      this.compressor.knee.value = 10;
      this.compressor.ratio.value = 8;
      this.compressor.connect(this.masterGain);
      
      if (this.context.state === 'suspended') {
        await this.context.resume();
      }
      
      this.initialized = true;
      console.log('🔊 AudioEngine initialized');
      
      // Auto-load the laugh sound
      this.loadLaughSound();
      
    } catch (error) {
      console.error('Audio init failed:', error);
    }
  }
  
  async loadLaughSound() {
    const url = '/audio/ElevenLabs_Chilling_maniacal_laugh_resonating_in_a_dark_forest.mp3';
    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      this.laughBuffer = await this.context.decodeAudioData(arrayBuffer);
      console.log('🎙️ Laugh sound loaded successfully');
    } catch (e) {
      console.warn('Failed to load laugh sound:', e);
    }
  }
  
  // ─── UTILITY ─────────────────────────────────────────
  
  createOscillator(type = 'sine', frequency = 440) {
    if (!this.initialized) return null;
    const osc = this.context.createOscillator();
    osc.type = type;
    osc.frequency.value = frequency;
    return osc;
  }
  
  createNoiseBuffer(duration = 1) {
    if (!this.initialized) return null;
    const sr = this.context.sampleRate;
    const len = sr * duration;
    const buf = this.context.createBuffer(1, len, sr);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buf;
  }
  
  createEnvelope() {
    if (!this.initialized) return null;
    const gain = this.context.createGain();
    gain.gain.value = 0;
    return gain;
  }
  
  applyEnvelope(gainNode, attack = 0.01, decay = 0.1, sustain = 0.7, release = 0.2, duration = 0.3) {
    const now = this.context.currentTime;
    gainNode.gain.cancelScheduledValues(now);
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(1, now + attack);
    gainNode.gain.linearRampToValueAtTime(sustain, now + attack + decay);
    gainNode.gain.linearRampToValueAtTime(0, now + duration + release);
    return duration + release;
  }
  
  createPanner() {
    if (!this.initialized) return null;
    const panner = this.context.createPanner();
    panner.panningModel = 'HRTF';
    panner.distanceModel = 'inverse';
    panner.refDistance = 1;
    panner.maxDistance = 50;
    panner.rolloffFactor = 1;
    return panner;
  }
  
  setListenerPosition(position, forward, up) {
    if (!this.initialized) return;
    const L = this.context.listener;
    if (L.positionX) {
      L.positionX.value = position.x;
      L.positionY.value = position.y;
      L.positionZ.value = position.z;
      L.forwardX.value = forward.x;
      L.forwardY.value = forward.y;
      L.forwardZ.value = forward.z;
      L.upX.value = up.x;
      L.upY.value = up.y;
      L.upZ.value = up.z;
    } else {
      L.setPosition(position.x, position.y, position.z);
      L.setOrientation(forward.x, forward.y, forward.z, up.x, up.y, up.z);
    }
  }
  
  // ─── AMBIENT / BACKROOMS ─────────────────────────────
  
  /**
   * Fluorescent hum — the iconic Backrooms sound
   */
  playFluorescentHum() {
    if (!this.initialized || this.humOsc) return;
    
    // 60Hz hum (power line frequency)
    const hum = this.createOscillator('square', 60);
    const humFilter = this.context.createBiquadFilter();
    humFilter.type = 'lowpass';
    humFilter.frequency.value = 120;
    
    // High-freq buzz
    const buzz = this.createOscillator('sawtooth', 120);
    const buzzFilter = this.context.createBiquadFilter();
    buzzFilter.type = 'highpass';
    buzzFilter.frequency.value = 1000;
    
    // Very quiet rumble
    const rumble = this.createOscillator('sine', 30);
    const rumbleGain = this.context.createGain();
    rumbleGain.gain.value = 0.03;
    
    const gain = this.context.createGain();
    gain.gain.value = 0.05;
    
    hum.connect(humFilter);
    humFilter.connect(gain);
    buzz.connect(buzzFilter);
    buzzFilter.connect(gain);
    rumble.connect(rumbleGain);
    rumbleGain.connect(gain);
    gain.connect(this.compressor);
    
    hum.start();
    buzz.start();
    rumble.start();
    this.humOsc = { hum, buzz, rumble, gain };
    
    // Random crackle
    this._humInterval = setInterval(() => {
      if (Math.random() > 0.93 && this.initialized) {
        gain.gain.setValueAtTime(0.09, this.context.currentTime);
        gain.gain.linearRampToValueAtTime(0.05, this.context.currentTime + 0.15);
      }
    }, 400);
  }
  
  /**
   * Start ambient tension drone
   */
  playAmbientDrone() {
    if (!this.initialized || this.ambientDrone) return;
    
    const osc1 = this.createOscillator('sine', 28);
    const osc2 = this.createOscillator('sine', 31);
    const osc3 = this.createOscillator('triangle', 55);
    const gain = this.context.createGain();
    gain.gain.value = 0.06;
    
    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 80;
    
    osc1.connect(filter);
    osc2.connect(filter);
    osc3.connect(filter);
    filter.connect(gain);
    gain.connect(this.compressor);
    
    osc1.start();
    osc2.start();
    osc3.start();
    
    this.ambientDrone = { osc1, osc2, osc3, gain };
  }
  
  // ─── PLAYER SOUNDS ───────────────────────────────────
  
  playFootstep() {
    if (!this.initialized) return;
    
    const osc = this.createOscillator('sine', 80 + Math.random() * 40);
    const noise = this.context.createBufferSource();
    noise.buffer = this.createNoiseBuffer(0.1);
    
    const noiseFilter = this.context.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.value = 500;
    
    const gain = this.context.createGain();
    
    osc.connect(gain);
    noise.connect(noiseFilter);
    noiseFilter.connect(gain);
    gain.connect(this.compressor);
    
    const now = this.context.currentTime;
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    
    osc.start(now);
    osc.stop(now + 0.12);
    noise.start(now);
    noise.stop(now + 0.1);
  }
  
  /**
   * Heartbeat — gets faster as sanity drops
   */
  playHeartbeat(sanity = 100) {
    if (!this.initialized) return;
    
    const now = this.context.currentTime;
    const volume = Math.max(0.05, (100 - sanity) / 100 * 0.5);
    
    // "lub"
    const lub = this.createOscillator('sine', 45);
    const lubGain = this.context.createGain();
    lub.connect(lubGain);
    lubGain.connect(this.compressor);
    lubGain.gain.setValueAtTime(volume, now);
    lubGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    lub.start(now);
    lub.stop(now + 0.12);
    
    // "dub"
    const dub = this.createOscillator('sine', 38);
    const dubGain = this.context.createGain();
    dub.connect(dubGain);
    dubGain.connect(this.compressor);
    dubGain.gain.setValueAtTime(0, now + 0.18);
    dubGain.gain.setValueAtTime(volume * 0.8, now + 0.2);
    dubGain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
    dub.start(now + 0.18);
    dub.stop(now + 0.32);
  }
  
  // ─── GHOST SOUNDS ────────────────────────────────────
  
  /**
   * Ghost scream — sharp attack, distorted
   */
  playGhostScream() {
    if (!this.initialized) return;
    
    const osc = this.createOscillator('sawtooth', 300);
    const osc2 = this.createOscillator('square', 373);
    
    const distortion = this.context.createWaveShaper();
    const curve = new Float32Array(256);
    for (let i = 0; i < 256; i++) {
      const x = (i - 128) / 128;
      curve[i] = Math.tanh(x * 4);
    }
    distortion.curve = curve;
    
    const gain = this.context.createGain();
    
    osc.connect(distortion);
    osc2.connect(distortion);
    distortion.connect(gain);
    gain.connect(this.compressor);
    
    const now = this.context.currentTime;
    
    // Screaming pitch sweep
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.linearRampToValueAtTime(900, now + 0.08);
    osc.frequency.linearRampToValueAtTime(400, now + 0.3);
    osc.frequency.linearRampToValueAtTime(150, now + 0.8);
    
    osc2.frequency.setValueAtTime(250, now);
    osc2.frequency.linearRampToValueAtTime(1100, now + 0.1);
    osc2.frequency.linearRampToValueAtTime(300, now + 0.6);
    
    gain.gain.setValueAtTime(0.5, now);
    gain.gain.linearRampToValueAtTime(0, now + 1.0);
    
    osc.start(now);
    osc.stop(now + 1.0);
    osc2.start(now);
    osc2.stop(now + 0.8);
  }
  
  /**
   * Low ghost growl — warning sound before hunt
   */
  playGhostGrowl() {
    if (!this.initialized) return;
    
    const osc = this.createOscillator('sawtooth', 60);
    const osc2 = this.createOscillator('sine', 55);
    
    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 200;
    filter.Q.value = 3;
    
    const gain = this.context.createGain();
    
    osc.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.compressor);
    
    const now = this.context.currentTime;
    
    // Slow frequency warble
    osc.frequency.setValueAtTime(60, now);
    osc.frequency.linearRampToValueAtTime(40, now + 0.5);
    osc.frequency.linearRampToValueAtTime(70, now + 1.5);
    osc.frequency.linearRampToValueAtTime(35, now + 2.5);
    
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.25, now + 0.3);
    gain.gain.linearRampToValueAtTime(0.2, now + 2.0);
    gain.gain.linearRampToValueAtTime(0, now + 3.0);
    
    osc.start(now);
    osc.stop(now + 3.0);
    osc2.start(now);
    osc2.stop(now + 3.0);
  }
  
  /**
   * Ghost breathing — unsettling during stalking/hunt
   */
  playGhostBreathing() {
    if (!this.initialized || this.breathingNode) return;
    
    const noise = this.context.createBufferSource();
    noise.buffer = this.createNoiseBuffer(8);
    noise.loop = true;
    
    const filter = this.context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 400;
    filter.Q.value = 5;
    
    // LFO to modulate for breathing rhythm
    const lfo = this.createOscillator('sine', 0.4);
    const lfoGain = this.context.createGain();
    lfoGain.gain.value = 300;
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    
    const gain = this.context.createGain();
    gain.gain.value = 0.12;
    
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.compressor);
    
    noise.start();
    lfo.start();
    
    this.breathingNode = { noise, lfo, gain, filter };
  }
  
  stopGhostBreathing() {
    if (!this.breathingNode) return;
    try {
      const now = this.context.currentTime;
      this.breathingNode.gain.gain.linearRampToValueAtTime(0, now + 0.5);
      setTimeout(() => {
        try {
          this.breathingNode.noise.stop();
          this.breathingNode.lfo.stop();
        } catch(e) {}
        this.breathingNode = null;
      }, 600);
    } catch(e) {
      this.breathingNode = null;
    }
  }
  
  /**
   * Play the maniacal laugh when the ghost hunts
   */
  playManiacalLaugh() {
    if (!this.initialized || !this.laughBuffer) return;
    
    const source = this.context.createBufferSource();
    source.buffer = this.laughBuffer;
    
    const gain = this.context.createGain();
    gain.gain.value = 0.8;
    
    source.connect(gain);
    gain.connect(this.masterGain);
    
    source.start(0);
    console.log('😈 Maniacal laugh triggered');
  }
  
  /**
   * Jumpscare — massive audio spike
   */
  playJumpscare() {
    if (!this.initialized) return;
    
    // Dense noise burst
    const noise = this.context.createBufferSource();
    noise.buffer = this.createNoiseBuffer(1.5);
    
    // Multiple harsh oscillators
    const osc1 = this.createOscillator('sawtooth', 200);
    const osc2 = this.createOscillator('square', 377);
    const osc3 = this.createOscillator('sawtooth', 523);
    
    const distortion = this.context.createWaveShaper();
    const curve = new Float32Array(256);
    for (let i = 0; i < 256; i++) {
      const x = (i - 128) / 128;
      curve[i] = Math.sign(x) * Math.pow(Math.abs(x), 0.3);
    }
    distortion.curve = curve;
    
    const gain = this.context.createGain();
    
    noise.connect(distortion);
    osc1.connect(distortion);
    osc2.connect(distortion);
    osc3.connect(distortion);
    distortion.connect(gain);
    gain.connect(this.compressor);
    
    const now = this.context.currentTime;
    
    // Sharp spike then decay
    gain.gain.setValueAtTime(0.7, now);
    gain.gain.linearRampToValueAtTime(0.4, now + 0.1);
    gain.gain.linearRampToValueAtTime(0, now + 1.2);
    
    // Pitch sweep
    osc1.frequency.linearRampToValueAtTime(800, now + 0.05);
    osc1.frequency.linearRampToValueAtTime(100, now + 1.0);
    osc2.frequency.linearRampToValueAtTime(600, now + 0.05);
    osc3.frequency.linearRampToValueAtTime(1200, now + 0.03);
    osc3.frequency.linearRampToValueAtTime(200, now + 0.8);
    
    noise.start(now);
    noise.stop(now + 1.2);
    osc1.start(now);
    osc1.stop(now + 1.2);
    osc2.start(now);
    osc2.stop(now + 0.8);
    osc3.start(now);
    osc3.stop(now + 1.0);
  }
  
  /**
   * Whisper — spatial positioned, creepy
   */
  playWhisper(position) {
    if (!this.initialized) return;
    
    const noise = this.context.createBufferSource();
    noise.buffer = this.createNoiseBuffer(2.5);
    
    const filter = this.context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 700 + Math.random() * 500;
    filter.Q.value = 3;
    
    // Second filter for sibilance  
    const sibilance = this.context.createBiquadFilter();
    sibilance.type = 'highpass';
    sibilance.frequency.value = 2000;
    
    const panner = this.createPanner();
    if (position) {
      panner.positionX.value = position.x;
      panner.positionY.value = position.y || 1.5;
      panner.positionZ.value = position.z;
    }
    
    const gain = this.createEnvelope();
    
    noise.connect(filter);
    filter.connect(sibilance);
    sibilance.connect(panner);
    panner.connect(gain);
    gain.connect(this.compressor);
    
    const duration = this.applyEnvelope(gain, 0.5, 0.5, 0.15, 0.8, 2.0);
    
    noise.start();
    noise.stop(this.context.currentTime + duration);
  }
  
  /**
   * Door creak
   */
  playDoorCreak() {
    if (!this.initialized) return;
    
    const osc = this.createOscillator('sawtooth', 200);
    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 800;
    filter.Q.value = 8;
    
    const gain = this.createEnvelope();
    
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.compressor);
    
    const now = this.context.currentTime;
    osc.frequency.setValueAtTime(250, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 1.2);
    
    const duration = this.applyEnvelope(gain, 0.05, 0.3, 0.15, 0.4, 1.0);
    
    osc.start();
    osc.stop(now + duration);
  }
  
  /**
   * Light flicker sound
   */
  playLightFlicker() {
    if (!this.initialized) return;
    
    const noise = this.context.createBufferSource();
    noise.buffer = this.createNoiseBuffer(0.15);
    
    const filter = this.context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 3000;
    filter.Q.value = 2;
    
    const gain = this.context.createGain();
    gain.gain.value = 0.08;
    
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.compressor);
    
    noise.start();
    noise.stop(this.context.currentTime + 0.15);
  }
  
  /**
   * Chase music — tense pulsing drone
   */
  startChaseMusic() {
    if (!this.initialized || this.chaseMusic) return;
    
    // Fast pulse bass
    const bass = this.createOscillator('sine', 45);
    const bassGain = this.context.createGain();
    bassGain.gain.value = 0.15;
    
    // High tension string
    const tension = this.createOscillator('sawtooth', 220);
    const tensionFilter = this.context.createBiquadFilter();
    tensionFilter.type = 'lowpass';
    tensionFilter.frequency.value = 600;
    tensionFilter.Q.value = 5;
    const tensionGain = this.context.createGain();
    tensionGain.gain.value = 0.08;
    
    // Pulse LFO (heartbeat-like rhythm)
    const pulseLFO = this.createOscillator('square', 3);
    const pulseDepth = this.context.createGain();
    pulseDepth.gain.value = 0.1;
    pulseLFO.connect(pulseDepth);
    pulseDepth.connect(bassGain.gain);
    
    bass.connect(bassGain);
    bassGain.connect(this.compressor);
    tension.connect(tensionFilter);
    tensionFilter.connect(tensionGain);
    tensionGain.connect(this.compressor);
    
    bass.start();
    tension.start();
    pulseLFO.start();
    
    this.chaseMusic = { bass, tension, pulseLFO, bassGain, tensionGain };
  }
  
  stopChaseMusic() {
    if (!this.chaseMusic) return;
    try {
      const now = this.context.currentTime;
      this.chaseMusic.bassGain.gain.linearRampToValueAtTime(0, now + 1);
      this.chaseMusic.tensionGain.gain.linearRampToValueAtTime(0, now + 1);
      setTimeout(() => {
        try {
          this.chaseMusic.bass.stop();
          this.chaseMusic.tension.stop();
          this.chaseMusic.pulseLFO.stop();
        } catch(e) {}
        this.chaseMusic = null;
      }, 1200);
    } catch(e) {
      this.chaseMusic = null;
    }
  }
  
  // ─── CONTROLS ────────────────────────────────────────
  
  setVolume(value) {
    if (this.masterGain) this.masterGain.gain.value = value;
  }
  
  isReady() {
    return this.initialized && this.context && this.context.state === 'running';
  }
}