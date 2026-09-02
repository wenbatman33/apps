// ===== 後製管線（PC）：Render → UnrealBloom → 暗角 → OutputPass(ACES + sRGB) → SMAA；手機直出 =====
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { TUNE } from './tune.js';

const VignetteShader = {
  uniforms: { tDiffuse: { value: null }, vignette: { value: 0.3 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float vignette; varying vec2 vUv;
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      vec2 d = vUv - 0.5;
      c.rgb *= 1.0 - vignette * dot(d, d) * 2.0;
      gl_FragColor = c;
    }`,
};

export class PostFX {
  constructor(renderer, scene, camera, enabled) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.enabled = enabled;
    this.composer = null;
    if (enabled) this._build();
  }

  _build() {
    const size = this.renderer.getSize(new THREE.Vector2());
    const pr = this.renderer.getPixelRatio();
    const target = new THREE.WebGLRenderTarget(size.x * pr, size.y * pr, { type: THREE.HalfFloatType, samples: 4 });
    this.composer = new EffectComposer(this.renderer, target);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(size.x, size.y), TUNE.post.bloomStrength, TUNE.post.bloomRadius, TUNE.post.bloomThreshold);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
    this.vig = new ShaderPass(VignetteShader);
    this.vig.uniforms.vignette.value = TUNE.post.vignette;
    this.composer.addPass(this.vig);
    this.smaa = new SMAAPass(size.x * pr, size.y * pr);
    this.composer.addPass(this.smaa);
  }

  setSize(w, h) {
    if (!this.composer) return;
    const pr = this.renderer.getPixelRatio();
    this.composer.setSize(w, h);
    this.smaa.setSize(w * pr, h * pr);
  }

  apply() {
    this.renderer.toneMappingExposure = TUNE.light.exposure;
    if (!this.composer) return;
    this.bloom.strength = TUNE.post.bloomStrength;
    this.bloom.radius = TUNE.post.bloomRadius;
    this.bloom.threshold = TUNE.post.bloomThreshold;
    this.vig.uniforms.vignette.value = TUNE.post.vignette;
  }

  render() {
    if (this.composer && this.enabled) this.composer.render();
    else { this.renderer.setRenderTarget(null); this.renderer.render(this.scene, this.camera); }
  }
}
