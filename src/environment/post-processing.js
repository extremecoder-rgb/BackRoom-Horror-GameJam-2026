import * as THREE from 'three';

import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

/**
 * Subtle Backrooms post-processing: slight vignette + film grain only
 * NO bloom (was crushing contrast), minimal effects
 */
const BackroomsShader = {
  uniforms: {
    tDiffuse: { value: null },
    time: { value: 0 },
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
    uniform float flicker;
    varying vec2 vUv;
    
    float random(vec2 co) {
      return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
    }
    
    void main() {
      vec2 uv = vUv;
      
      // Very subtle chromatic aberration only during flicker
      float aberration = flicker * 0.003;
      vec4 color;
      color.r = texture2D(tDiffuse, uv + vec2(aberration, 0.0)).r;
      color.g = texture2D(tDiffuse, uv).g;
      color.b = texture2D(tDiffuse, uv - vec2(aberration, 0.0)).b;
      color.a = 1.0;
      
      // Gentle vignette - only darken the very edges
      vec2 center = uv - 0.5;
      float dist = length(center);
      float vignette = 1.0 - smoothstep(0.5, 1.0, dist);
      vignette = mix(0.7, 1.0, vignette);
      color.rgb *= vignette;
      
      // Tiny film grain
      float grain = random(uv + time) * 0.015;
      color.rgb += grain - 0.0075;
      
      // Flicker effect (only during ghost events)
      color.rgb *= 1.0 + flicker * (random(vec2(time, 0.0)) - 0.5) * 0.15;
      
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
    
    try {
      this.composer = new EffectComposer(this.renderer);
      
      const renderPass = new RenderPass(this.scene, this.camera);
      this.composer.addPass(renderPass);
      
      // NO bloom pass - it was darkening everything
      
      this.horrorPass = new ShaderPass(BackroomsShader);
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
      
      if (this.flickerIntensity > 0) {
        this.flickerIntensity -= deltaTime * 2;
        if (this.flickerIntensity < 0) this.flickerIntensity = 0;
      }
      this.horrorPass.uniforms.flicker.value = this.flickerIntensity;
    }
  }
  
  triggerFlicker(intensity = 1.0) {
    this.flickerIntensity = intensity;
  }
  
  render() {
    if (this.failed) {
      this.renderer.render(this.scene, this.camera);
    } else {
      try {
        this.composer.render();
      } catch (e) {
        console.warn('Post-processing render failed, using fallback:', e);
        this.failed = true;
        this.renderer.render(this.scene, this.camera);
      }
    }
  }
  
  resize(width, height) {
    this.composer.setSize(width, height);
  }
}

// Keep ScreenEffects export for compatibility
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