import * as THREE from 'three';

import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

/**
 * BACKROOMS HORROR POST-PROCESSING
 * 
 * Effects:
 * - VHS scanlines & noise
 * - Chromatic aberration (increases during ghost events)
 * - Vignette (darkens at low sanity)
 * - Red pulse when ghost is near
 * - Full-screen distortion during hunt
 * - Sanity-based visual degradation
 */
const BackroomsHorrorShader = {
  uniforms: {
    tDiffuse: { value: null },
    time: { value: 0 },
    flicker: { value: 0 },
    sanity: { value: 1.0 },
    ghostProximity: { value: 0.0 },    // 0 = far, 1 = very close
    huntIntensity: { value: 0.0 },      // 0 = no hunt, 1 = full hunt
    jumpscareAmount: { value: 0.0 },    // 0 = none, 1 = full jumpscare
    resolution: { value: new THREE.Vector2(1920, 1080) }
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
    uniform float flicker;
    uniform float sanity;
    uniform float ghostProximity;
    uniform float huntIntensity;
    uniform float jumpscareAmount;
    uniform vec2 resolution;
    varying vec2 vUv;
    
    float random(vec2 co) {
      return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
    }
    
    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      float a = random(i);
      float b = random(i + vec2(1.0, 0.0));
      float c = random(i + vec2(0.0, 1.0));
      float d = random(i + vec2(1.0, 1.0));
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
    }
    
    void main() {
      vec2 uv = vUv;
      
      // ─── SCREEN DISTORTION (sanity + hunt) ───
      float distortionStrength = (1.0 - sanity) * 0.008 + huntIntensity * 0.012 + jumpscareAmount * 0.03;
      if (distortionStrength > 0.001) {
        float distX = sin(uv.y * 30.0 + time * 3.0) * distortionStrength;
        float distY = cos(uv.x * 20.0 + time * 2.5) * distortionStrength * 0.5;
        uv += vec2(distX, distY);
      }
      
      // ─── CHROMATIC ABERRATION ───
      float aberration = 0.001 + flicker * 0.005 + ghostProximity * 0.003 + huntIntensity * 0.006 + jumpscareAmount * 0.015;
      aberration += (1.0 - sanity) * 0.003;
      
      vec4 color;
      color.r = texture2D(tDiffuse, uv + vec2(aberration, aberration * 0.5)).r;
      color.g = texture2D(tDiffuse, uv).g;
      color.b = texture2D(tDiffuse, uv - vec2(aberration, -aberration * 0.3)).b;
      color.a = 1.0;
      
      // ─── SCANLINES (VHS effect) ───
      float scanlineIntensity = 0.03 + huntIntensity * 0.05 + (1.0 - sanity) * 0.04;
      float scanline = sin(vUv.y * resolution.y * 0.5 + time * 2.0) * scanlineIntensity;
      color.rgb -= scanline;
      
      // ─── FILM GRAIN ───
      float grainAmount = 0.02 + huntIntensity * 0.04 + (1.0 - sanity) * 0.03;
      float grain = (random(vUv + fract(time)) - 0.5) * grainAmount;
      color.rgb += grain;
      
      // ─── VIGNETTE ───
      vec2 center = vUv - 0.5;
      float dist = length(center);
      float vignetteStrength = 0.4 + (1.0 - sanity) * 0.3 + ghostProximity * 0.2;
      float vignette = 1.0 - smoothstep(0.3, 0.9, dist) * vignetteStrength;
      color.rgb *= vignette;
      
      // ─── GHOST PROXIMITY RED PULSE ───
      if (ghostProximity > 0.01) {
        float redPulse = sin(time * 4.0) * 0.5 + 0.5;
        float redAmount = ghostProximity * redPulse * 0.15;
        color.r += redAmount;
        color.g -= redAmount * 0.3;
        color.b -= redAmount * 0.3;
      }
      
      // ─── HUNT EFFECT — screen goes crazy ───
      if (huntIntensity > 0.01) {
        // Random horizontal glitch lines
        float glitchLine = step(0.98, random(vec2(floor(vUv.y * 50.0), floor(time * 5.0))));
        if (glitchLine > 0.0) {
          float offset = (random(vec2(floor(time * 10.0), floor(vUv.y * 50.0))) - 0.5) * 0.05 * huntIntensity;
          vec4 glitchColor = texture2D(tDiffuse, vUv + vec2(offset, 0.0));
          color = mix(color, glitchColor, huntIntensity * 0.7);
        }
        
        // Rapid flicker
        float rapidFlicker = random(vec2(floor(time * 15.0), 0.0));
        color.rgb *= 1.0 - huntIntensity * rapidFlicker * 0.2;
      }
      
      // ─── JUMPSCARE FLASH ───
      if (jumpscareAmount > 0.01) {
        // White flash then red
        float flash = jumpscareAmount * step(0.7, jumpscareAmount);
        color.rgb = mix(color.rgb, vec3(1.0, 0.1, 0.0), flash * 0.4);
        
        // Extreme noise
        float jumpNoise = random(vUv * 100.0 + time * 50.0) * jumpscareAmount * 0.3;
        color.rgb += jumpNoise;
      }
      
      // ─── SANITY DEGRADATION ───
      if (sanity < 0.5) {
        // Desaturation at low sanity
        float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
        float desatAmount = (0.5 - sanity) * 1.2;
        color.rgb = mix(color.rgb, vec3(gray), min(desatAmount, 0.7));
        
        // Occasional static bursts
        if (sanity < 0.3) {
          float staticBurst = step(0.995, random(vec2(floor(time * 3.0), 0.0)));
          if (staticBurst > 0.0) {
            color.rgb = mix(color.rgb, vec3(random(vUv + time)), 0.4 * (0.3 - sanity));
          }
        }
      }
      
      // ─── FLICKER (light events) ───
      if (flicker > 0.01) {
        float flickerEffect = random(vec2(floor(time * 12.0), 0.0));
        color.rgb *= 1.0 - flicker * flickerEffect * 0.3;
      }
      
      gl_FragColor = color;
    }
  `
};

export class PostProcessor {
  constructor(renderer, scene, camera) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.flickerIntensity = 0;
    this.time = 0;
    this.failed = false;
    
    // Horror state
    this.sanity = 1.0;
    this.ghostProximity = 0;
    this.huntIntensity = 0;
    this.jumpscareAmount = 0;
    this.targetHuntIntensity = 0;
    
    try {
      this.composer = new EffectComposer(this.renderer);
      
      const renderPass = new RenderPass(this.scene, this.camera);
      this.composer.addPass(renderPass);
      
      this.horrorPass = new ShaderPass(BackroomsHorrorShader);
      this.horrorPass.uniforms.resolution.value.set(window.innerWidth, window.innerHeight);
      this.composer.addPass(this.horrorPass);
      
      const outputPass = new OutputPass();
      this.composer.addPass(outputPass);
    } catch (e) {
      console.warn('Post-processing setup failed:', e);
      this.failed = true;
    }
  }
  
  update(deltaTime) {
    this.time += deltaTime;
    
    if (this.horrorPass) {
      this.horrorPass.uniforms.time.value = this.time;
      
      // Smooth flicker decay
      if (this.flickerIntensity > 0) {
        this.flickerIntensity -= deltaTime * 3;
        if (this.flickerIntensity < 0) this.flickerIntensity = 0;
      }
      this.horrorPass.uniforms.flicker.value = this.flickerIntensity;
      
      // Smooth hunt intensity
      this.huntIntensity += (this.targetHuntIntensity - this.huntIntensity) * deltaTime * 5;
      this.horrorPass.uniforms.huntIntensity.value = this.huntIntensity;
      
      // Smooth ghost proximity
      this.horrorPass.uniforms.ghostProximity.value = this.ghostProximity;
      
      // Sanity
      this.horrorPass.uniforms.sanity.value = this.sanity;
      
      // Jumpscare decay
      if (this.jumpscareAmount > 0) {
        this.jumpscareAmount -= deltaTime * 0.8;
        if (this.jumpscareAmount < 0) this.jumpscareAmount = 0;
      }
      this.horrorPass.uniforms.jumpscareAmount.value = this.jumpscareAmount;
    }
  }
  
  // ─── EFFECT TRIGGERS ───────────────────────────────────
  
  triggerFlicker(intensity = 1.0) {
    this.flickerIntensity = Math.min(1.0, intensity);
  }
  
  setGhostProximity(value) {
    this.ghostProximity = Math.max(0, Math.min(1, value));
  }
  
  setHuntMode(active) {
    this.targetHuntIntensity = active ? 1.0 : 0.0;
  }
  
  setSanity(value) {
    this.sanity = Math.max(0, Math.min(1, value / 100));
  }
  
  triggerJumpscare() {
    this.jumpscareAmount = 1.0;
    this.flickerIntensity = 1.0;
  }
  
  render() {
    if (this.failed) {
      this.renderer.render(this.scene, this.camera);
    } else {
      try {
        this.composer.render();
      } catch (e) {
        console.warn('Post-processing render failed:', e);
        this.failed = true;
        this.renderer.render(this.scene, this.camera);
      }
    }
  }
  
  resize(width, height) {
    if (this.composer) {
      this.composer.setSize(width, height);
    }
    if (this.horrorPass) {
      this.horrorPass.uniforms.resolution.value.set(width, height);
    }
  }
}

// Compatibility export
export class ScreenEffects {
  constructor(postProcessor) {
    this.postProcessor = postProcessor;
  }
  triggerGhostEvent() {
    if (this.postProcessor) this.postProcessor.triggerFlicker(1.0);
  }
  setSanityLevel() {}
  triggerStatic() {}
  triggerBloodDrip() {}
  update() {}
}