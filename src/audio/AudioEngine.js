/**
 * Audio Engine - Procedural audio synthesis with Web Audio API
 */
export class AudioEngine {
  constructor() {
    this.context = null;
    this.masterGain = null;
    this.initialized = false;
    
    // Sound state
    this.sounds = new Map();
    this.activeSources = new Set();
  }
  
  /**
   * Initialize audio context (must be called after user interaction)
   */
  async init() {
    if (this.initialized) return;
    
    try {
      this.context = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.context.createGain();
      this.masterGain.gain.value = 0.5;
      this.masterGain.connect(this.context.destination);
      
      // Resume if suspended
      if (this.context.state === 'suspended') {
        await this.context.resume();
      }
      
      this.initialized = true;
      console.log('AudioEngine initialized');
    } catch (error) {
      console.error('Audio initialization failed:', error);
    }
  }
  
  /**
   * Create oscillator-based sound
   */
  createOscillator(type = 'sine', frequency = 440) {
    if (!this.initialized) return null;
    
    const osc = this.context.createOscillator();
    osc.type = type;
    osc.frequency.value = frequency;
    
    return osc;
  }
  
  /**
   * Create noise buffer
   */
  createNoiseBuffer(duration = 1) {
    if (!this.initialized) return null;
    
    const sampleRate = this.context.sampleRate;
    const length = sampleRate * duration;
    const buffer = this.context.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    return buffer;
  }
  
  /**
   * Create gain node with envelope
   */
  createEnvelope() {
    if (!this.initialized) return null;
    
    const gain = this.context.createGain();
    gain.gain.value = 0;
    
    return gain;
  }
  
  /**
   * Apply ADSR envelope
   */
  applyEnvelope(gainNode, attack = 0.01, decay = 0.1, sustain = 0.7, release = 0.2, duration = 0.3) {
    const now = this.context.currentTime;
    
    gainNode.gain.cancelScheduledValues(now);
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(1, now + attack);
    gainNode.gain.linearRampToValueAtTime(sustain, now + attack + decay);
    gainNode.gain.linearRampToValueAtTime(0, now + duration + release);
    
    return duration + release;
  }
  
  /**
   * Create spatial panner
   */
  createPanner() {
    if (!this.initialized) return null;
    
    const panner = this.context.createPanner();
    panner.panningModel = 'HRTF';
    panner.distanceModel = 'inverse';
    panner.refDistance = 1;
    panner.maxDistance = 50;
    panner.rolloffFactor = 1;
    panner.coneInnerAngle = 360;
    panner.coneOuterAngle = 360;
    panner.coneOuterGain = 0;
    
    return panner;
  }
  
  /**
   * Set listener position
   */
  setListenerPosition(position, forward, up) {
    if (!this.initialized) return;
    
    const listener = this.context.listener;
    
    if (listener.positionX) {
      listener.positionX.value = position.x;
      listener.positionY.value = position.y;
      listener.positionZ.value = position.z;
      listener.forwardX.value = forward.x;
      listener.forwardY.value = forward.y;
      listener.forwardZ.value = forward.z;
      listener.upX.value = up.x;
      listener.upY.value = up.y;
      listener.upZ.value = up.z;
    } else {
      listener.setPosition(position.x, position.y, position.z);
      listener.setOrientation(forward.x, forward.y, forward.z, up.x, up.y, up.z);
    }
  }
  
  /**
   * Play footstep sound
   */
  playFootstep() {
    if (!this.initialized) return;
    
    const osc = this.createOscillator('sine', 100 + Math.random() * 50);
    const gain = this.createEnvelope();
    
    osc.connect(gain);
    gain.connect(this.masterGain);
    
    const duration = this.applyEnvelope(gain, 0.01, 0.05, 0, 0.1, 0.1);
    
    osc.start();
    osc.stop(this.context.currentTime + duration);
  }
  
  /**
   * Play heartbeat
   */
  playHeartbeat(sanity) {
    if (!this.initialized) return;
    
    // Higher tempo at lower sanity
    const tempo = 1 + (1 - sanity / 100) * 2;
    const now = this.context.currentTime;
    
    // "lub"
    const lub = this.createOscillator('sine', 40);
    const lubGain = this.createEnvelope();
    lub.connect(lubGain);
    lubGain.connect(this.masterGain);
    lubGain.gain.setValueAtTime(0.3, now);
    lubGain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    lub.start(now);
    lub.stop(now + 0.1);
    
    // "dub"
    const dub = this.createOscillator('sine', 35);
    const dubGain = this.createEnvelope();
    dub.connect(dubGain);
    dubGain.connect(this.masterGain);
    dubGain.gain.setValueAtTime(0, now + 0.15);
    dubGain.gain.setValueAtTime(0.25, now + 0.2);
    dubGain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
    dub.start(now + 0.15);
    dub.stop(now + 0.3);
  }
  
  /**
   * Play ambient drone
   */
  playAmbientDrone() {
    if (!this.initialized) return;
    
    // Low frequency drone
    const osc1 = this.createOscillator('sine', 30);
    const osc2 = this.createOscillator('sine', 32);
    const gain = this.createEnvelope();
    
    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.masterGain);
    
    gain.gain.value = 0.1;
    
    osc1.start();
    osc2.start();
  }
  
  /**
   * Play whisper sound
   */
  playWhisper(position) {
    if (!this.initialized) return;
    
    // Noise source
    const noise = this.context.createBufferSource();
    noise.buffer = this.createNoiseBuffer(2);
    
    // Bandpass filter for whisper-like quality
    const filter = this.context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 800 + Math.random() * 400;
    filter.Q.value = 2;
    
    // Spatial positioning
    const panner = this.createPanner();
    panner.positionX.value = position.x;
    panner.positionY.value = position.y;
    panner.positionZ.value = position.z;
    
    const gain = this.createEnvelope();
    
    noise.connect(filter);
    filter.connect(panner);
    panner.connect(gain);
    gain.connect(this.masterGain);
    
    const duration = this.applyEnvelope(gain, 0.5, 0.5, 0.3, 0.5, 2);
    
    noise.start();
    noise.stop(this.context.currentTime + duration);
  }
  
  /**
   * Play door creak
   */
  playDoorCreak() {
    if (!this.initialized) return;
    
    // Sawtooth with resonance
    const osc = this.createOscillator('sawtooth', 200);
    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1000;
    filter.Q.value = 5;
    
    const gain = this.createEnvelope();
    
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    
    // Frequency sweep
    const now = this.context.currentTime;
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(50, now + 1);
    
    const duration = this.applyEnvelope(gain, 0.1, 0.3, 0.2, 0.3, 1);
    
    osc.start();
    osc.stop(now + duration);
  }
  
  /**
   * Play ghost scream
   */
  playGhostScream() {
    if (!this.initialized) return;
    
    // Harsh oscillator
    const osc = this.createOscillator('sawtooth', 300);
    const distortion = this.context.createWaveShaper();
    
    // Simple distortion curve
    const curve = new Float32Array(256);
    for (let i = 0; i < 256; i++) {
      const x = (i - 128) / 128;
      curve[i] = Math.tanh(x * 2);
    }
    distortion.curve = curve;
    
    const gain = this.createEnvelope();
    
    osc.connect(distortion);
    distortion.connect(gain);
    gain.connect(this.masterGain);
    
    // Scream effect
    const now = this.context.currentTime;
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.linearRampToValueAtTime(800, now + 0.1);
    osc.frequency.linearRampToValueAtTime(200, now + 0.5);
    
    gain.gain.value = 0.4;
    gain.gain.linearRampToValueAtTime(0, now + 0.8);
    
    osc.start();
    osc.stop(now + 0.8);
  }
  
  /**
   * Set master volume
   */
  setVolume(value) {
    if (this.masterGain) {
      this.masterGain.gain.value = value;
    }
  }
  
  /**
   * Get context state
   */
  isReady() {
    return this.initialized && this.context && this.context.state === 'running';
  }
}