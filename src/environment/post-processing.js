import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

/**
 * Custom shader for vignette + film grain + chromatic aberration
 */
const HorrorEffectShader = {
  uniforms: {
    tDiffuse: { value: null },
    time: { value: 0 },
    intensity: { value: 1.0 },
    flicker: { value: 0 }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float time;
    uniform float intensity;
    uniform float flicker;
    varying vec2 vUv;
    
    // Random noise
    float random(vec2 co) {
      return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
    }
    
    void main() {
      vec2 uv = vUv;
      
      // Chromatic aberration (subtle, increases with flicker)
      float aberration = 0.002 * intensity + flicker * 0.01;
      vec4 color;
      color.r = texture2D(tDiffuse, uv + vec2(aberration, 0.0)).r;
      color.g = texture2D(tDiffuse, uv).g;
      color.b = texture2D(tDiffuse, uv - vec2(aberration, 0.0)).b;
      color.a = 1.0;
      
      // Vignette (darker edges)
      vec2 center = uv - 0.5;
      float dist = length(center);
      float vignette = 1.0 - smoothstep(0.3, 0.9, dist);
      vignette = mix(0.3, 1.0, vignette);
      color.rgb *= vignette;
      
      // Film grain
      float grain = random(uv + time) * 0.1 * intensity;
      color.rgb += grain - 0.05;
      
      // Screen flicker (during ghost events)
      color.rgb *= 1.0 + flicker * (random(vec2(time, 0.0)) - 0.5) * 0.3;
      
      gl_FragColor = color;
    }
  `
};

/**
 * Post-processing setup for horror atmosphere
 */
export class PostProcessor {
  constructor(renderer, scene, camera) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.composer = null;
    this.horrorPass = null;
    this.bloomPass = null;
    this.flickerIntensity = 0;
    this.time = 0;
    
    this.setup();
  }
  
  /**
   * Setup post-processing pipeline
   */
  setup() {
    const size = this.renderer.getSize();
    
    // Create composer
    this.composer = new EffectComposer(this.renderer);
    
    // Render pass
    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);
    
    // Bloom pass (subtle)
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(size.width, size.height),
      0.6,  // strength
      0.3,  // radius
      0.85   // threshold
    );
    this.composer.addPass(this.bloomPass);
    
    // Custom horror effect pass
    this.horrorPass = new ShaderPass(HorrorEffectShader);
    this.composer.addPass(this.horrorPass);
    
    // Output pass
    const outputPass = new OutputPass();
    this.composer.addPass(outputPass);
  }
  
  /**
   * Update effects each frame
   */
  update(deltaTime) {
    this.time += deltaTime;
    
    if (this.horrorPass) {
      this.horrorPass.uniforms.time.value = this.time;
      this.horrorPass.uniforms.intensity.value = 1.0;
      
      // Decay flicker
      if (this.flickerIntensity > 0) {
        this.flickerIntensity -= deltaTime * 2;
        if (this.flickerIntensity < 0) this.flickerIntensity = 0;
      }
      this.horrorPass.uniforms.flicker.value = this.flickerIntensity;
    }
  }
  
  /**
   * Trigger screen flicker effect
   */
  triggerFlicker(intensity = 1.0) {
    this.flickerIntensity = intensity;
  }
  
  /**
   * Render with post-processing
   */
  render() {
    this.composer.render();
  }
  
  /**
   * Resize handler
   */
  resize(width, height) {
    this.composer.setSize(width, height);
    this.bloomPass.resolution.set(width, height);
  }
}

/**
 * Screen effects manager (for game events)
 */
export class ScreenEffects {
  constructor(postProcessor) {
    this.postProcessor = postProcessor;
    this.vignetteIntensity = 1.0;
    this.staticIntensity = 0;
    this.bloodDrip = 0;
  }
  
  /**
   * Trigger ghost event effect
   */
  triggerGhostEvent() {
    if (this.postProcessor) {
      this.postProcessor.triggerFlicker(1.0);
    }
  }
  
  /**
   * Increase vignette (low sanity)
   */
  setSanityLevel(sanity) {
    // Higher vignette at lower sanity
    this.vignetteIntensity = 0.5 + (sanity / 100) * 0.5;
  }
  
  /**
   * Trigger static disruption
   */
  triggerStatic() {
    this.staticIntensity = 1.0;
  }
  
  /**
   * Trigger blood drip effect
   */
  triggerBloodDrip() {
    this.bloodDrip = 1.0;
  }
  
  /**
   * Update each frame
   */
  update(deltaTime) {
    // Decay effects
    if (this.staticIntensity > 0) {
      this.staticIntensity -= deltaTime;
      if (this.staticIntensity < 0) this.staticIntensity = 0;
    }
    
    if (this.bloodDrip > 0) {
      this.bloodDrip -= deltaTime * 0.5;
      if (this.bloodDrip < 0) this.bloodDrip = 0;
    }
  }
}