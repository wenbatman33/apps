// ===== 後製管線：改用 three.js 官方的 EffectComposer =====
// SSAO（接觸陰影）→ UnrealBloom（輝光）→ 自製色調映射/暗角/色差 → SMAA（抗鋸齒）
// 官方模組放在 vendor/jsm/，與 three r160 對應。
import * as THREE from 'three';
import { EffectComposer } from '../vendor/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from '../vendor/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from '../vendor/jsm/postprocessing/ShaderPass.js';
import { SSAOPass } from '../vendor/jsm/postprocessing/SSAOPass.js';
import { UnrealBloomPass } from '../vendor/jsm/postprocessing/UnrealBloomPass.js';
import { SMAAPass } from '../vendor/jsm/postprocessing/SMAAPass.js';

// 最終調色：ACES 色調映射 + 暗角 + 色差 + 輕微雜訊（讓漸層不帶色帶）
const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    exposure: { value: 1.0 },
    vignette: { value: 0.34 },
    chroma: { value: 0.0016 },
    grain: { value: 0.02 },
    time: { value: 0 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float exposure, vignette, chroma, grain, time;
    varying vec2 vUv;

    vec3 aces(vec3 x){
      const float a = 2.51, b = 0.03, c = 2.43, d = 0.59, e = 0.14;
      return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
    }
    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

    void main(){
      vec2 d = vUv - 0.5;
      // 色差：越靠邊分離越明顯
      float amt = chroma * dot(d, d) * 4.0;
      vec3 col;
      col.r = texture2D(tDiffuse, vUv + d * amt).r;
      col.g = texture2D(tDiffuse, vUv).g;
      col.b = texture2D(tDiffuse, vUv - d * amt).b;

      col = aces(col * exposure);
      col *= 1.0 - vignette * dot(d, d) * 2.2;              // 暗角
      col += (hash(vUv * 1024.0 + time) - 0.5) * grain;      // 去色帶雜訊
      gl_FragColor = vec4(max(col, 0.0), 1.0);
    }
  `,
};

export class PostFX {
  constructor(renderer) {
    this.renderer = renderer;
    this.enabled = true;
    this.composer = null;
    this.w = 1; this.h = 1;
    this.params = {
      threshold: 0.62, strength: 0.85, radius: 0.5,
      exposure: 1.0, vignette: 0.34, chroma: 0.0016,
      ssao: 1, ssaoRadius: 0.22, ssaoIntensity: 0.9,
    };
    this._sceneRef = null;
    this._cameraRef = null;
  }

  // 場景/相機會隨開檯改變，因此 composer 在第一次 render 時才建立
  _build(scene, camera) {
    const pr = Math.min(this.renderer.getPixelRatio(), 2);
    this.composer = new EffectComposer(this.renderer);
    this.composer.setPixelRatio(pr);
    this.composer.setSize(this.w, this.h);

    this.renderPass = new RenderPass(scene, camera);
    this.composer.addPass(this.renderPass);

    // SSAO：接觸陰影，讓零件真的「坐」在檯面上
    this.ssaoPass = new SSAOPass(scene, camera, this.w, this.h);
    this.ssaoPass.kernelRadius = this.params.ssaoRadius;
    this.ssaoPass.minDistance = 0.0018;
    this.ssaoPass.maxDistance = 0.09;
    this.ssaoPass.output = SSAOPass.OUTPUT.Default;
    this.ssaoPass.enabled = this.params.ssao > 0;
    this.composer.addPass(this.ssaoPass);

    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(this.w, this.h),
      this.params.strength, this.params.radius, this.params.threshold
    );
    this.composer.addPass(this.bloomPass);

    this.gradePass = new ShaderPass(GradeShader);
    this.gradePass.uniforms.exposure.value = this.params.exposure;
    this.gradePass.uniforms.vignette.value = this.params.vignette;
    this.gradePass.uniforms.chroma.value = this.params.chroma;
    this.composer.addPass(this.gradePass);

    this.smaaPass = new SMAAPass(this.w * pr, this.h * pr);
    this.composer.addPass(this.smaaPass);

    this._sceneRef = scene;
    this._cameraRef = camera;
  }

  setSize(w, h) {
    this.w = Math.max(1, w | 0);
    this.h = Math.max(1, h | 0);
    if (!this.composer) return;
    const pr = Math.min(this.renderer.getPixelRatio(), 2);
    this.composer.setSize(this.w, this.h);
    this.ssaoPass?.setSize(this.w, this.h);
    this.bloomPass?.setSize(this.w, this.h);
    this.smaaPass?.setSize(this.w * pr, this.h * pr);
  }

  // drawScene(target)：沿用舊介面。target 為 null 表示直接畫到畫面。
  // 這裡改成由 composer 主導，呼叫端只要提供 scene / camera。
  renderScene(scene, camera, dt = 0) {
    if (!this.enabled) {
      this.renderer.setRenderTarget(null);
      this.renderer.render(scene, camera);
      return;
    }
    if (!this.composer || this._sceneRef !== scene || this._cameraRef !== camera) {
      this.composer?.dispose?.();
      this._build(scene, camera);
    }
    this.gradePass.uniforms.time.value += dt;
    this.composer.render(dt);
  }

  set(name, v) {
    this.params[name] = v;
    if (!this.composer) return;
    switch (name) {
      case 'threshold': this.bloomPass.threshold = v; break;
      case 'strength': this.bloomPass.strength = v; break;
      case 'radius': this.bloomPass.radius = v; break;
      case 'exposure': this.gradePass.uniforms.exposure.value = v; break;
      case 'vignette': this.gradePass.uniforms.vignette.value = v; break;
      case 'chroma': this.gradePass.uniforms.chroma.value = v; break;
      case 'ssao': this.ssaoPass.enabled = v > 0; break;
      case 'ssaoRadius': this.ssaoPass.kernelRadius = v; break;
      case 'ssaoIntensity': this.ssaoPass.maxDistance = 0.02 + v * 0.1; break;
    }
  }
}
