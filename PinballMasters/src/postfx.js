// ===== 後製管線：亮度擷取 → 多級高斯模糊 → ACES 色調映射合成（自製 bloom，不依賴 examples） =====
import * as THREE from 'three';

const QUAD = new THREE.PlaneGeometry(2, 2);
const VERT = `
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const BRIGHT_FRAG = `
uniform sampler2D tDiffuse;
uniform float threshold;
uniform float softness;
varying vec2 vUv;
void main(){
  vec3 c = texture2D(tDiffuse, vUv).rgb;
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  float k = smoothstep(threshold, threshold + softness, l);
  gl_FragColor = vec4(c * k, 1.0);
}
`;

// 9-tap 線性取樣高斯
const BLUR_FRAG = `
uniform sampler2D tDiffuse;
uniform vec2 dir;       // 像素單位方向
varying vec2 vUv;
void main(){
  vec4 sum = texture2D(tDiffuse, vUv) * 0.227027;
  vec2 o1 = dir * 1.3846153846;
  vec2 o2 = dir * 3.2307692308;
  sum += texture2D(tDiffuse, vUv + o1) * 0.3162162162;
  sum += texture2D(tDiffuse, vUv - o1) * 0.3162162162;
  sum += texture2D(tDiffuse, vUv + o2) * 0.0702702703;
  sum += texture2D(tDiffuse, vUv - o2) * 0.0702702703;
  gl_FragColor = sum;
}
`;

const COMPOSITE_FRAG = `
uniform sampler2D tScene;
uniform sampler2D tBloom0;
uniform sampler2D tBloom1;
uniform sampler2D tBloom2;
uniform float bloomStrength;
uniform float exposure;
uniform float vignette;
uniform float chroma;
varying vec2 vUv;

// ACES filmic tone mapping（Narkowicz 近似）
vec3 aces(vec3 x){
  const float a = 2.51, b = 0.03, c = 2.43, d = 0.59, e = 0.14;
  return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
}

void main(){
  vec2 uv = vUv;
  vec2 fromC = uv - 0.5;
  // 輕微色差（邊緣）
  float ca = chroma * dot(fromC, fromC);
  vec3 col;
  col.r = texture2D(tScene, uv + fromC * ca).r;
  col.g = texture2D(tScene, uv).g;
  col.b = texture2D(tScene, uv - fromC * ca).b;

  vec3 bloom = texture2D(tBloom0, uv).rgb * 1.0
             + texture2D(tBloom1, uv).rgb * 0.75
             + texture2D(tBloom2, uv).rgb * 0.5;
  col += bloom * bloomStrength;

  col *= exposure;
  col = aces(col);
  // 暗角
  float v = 1.0 - vignette * dot(fromC, fromC) * 1.9;
  col *= clamp(v, 0.0, 1.0);
  // sRGB 編碼
  col = pow(col, vec3(1.0 / 2.2));
  gl_FragColor = vec4(col, 1.0);
}
`;

export class PostFX {
  constructor(renderer) {
    this.renderer = renderer;
    this.enabled = true;
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const rtOpts = { type: THREE.HalfFloatType, colorSpace: THREE.LinearSRGBColorSpace, depthBuffer: true };
    this.rtScene = new THREE.WebGLRenderTarget(1, 1, rtOpts);
    this.levels = [];
    for (let i = 0; i < 3; i++) {
      this.levels.push({
        a: new THREE.WebGLRenderTarget(1, 1, { ...rtOpts, depthBuffer: false }),
        b: new THREE.WebGLRenderTarget(1, 1, { ...rtOpts, depthBuffer: false }),
        scale: 2 << i, // 1/2, 1/4, 1/8
      });
    }

    this.brightMat = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: BRIGHT_FRAG,
      uniforms: { tDiffuse: { value: null }, threshold: { value: 0.72 }, softness: { value: 0.35 } },
      depthTest: false, depthWrite: false,
    });
    this.blurMat = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: BLUR_FRAG,
      uniforms: { tDiffuse: { value: null }, dir: { value: new THREE.Vector2() } },
      depthTest: false, depthWrite: false,
    });
    this.compMat = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: COMPOSITE_FRAG,
      uniforms: {
        tScene: { value: null }, tBloom0: { value: null }, tBloom1: { value: null }, tBloom2: { value: null },
        bloomStrength: { value: 0.85 }, exposure: { value: 1.0 }, vignette: { value: 0.5 }, chroma: { value: 0.006 },
      },
      depthTest: false, depthWrite: false,
    });
    this.quad = new THREE.Mesh(QUAD, this.brightMat);
    this.quad.frustumCulled = false;
    this.scene.add(this.quad);
  }

  setSize(w, h) {
    const pr = this.renderer.getPixelRatio();
    this.w = Math.max(1, Math.floor(w * pr));
    this.h = Math.max(1, Math.floor(h * pr));
    this.rtScene.setSize(this.w, this.h);
    for (const lv of this.levels) {
      const lw = Math.max(1, Math.floor(this.w / lv.scale));
      const lh = Math.max(1, Math.floor(this.h / lv.scale));
      lv.a.setSize(lw, lh); lv.b.setSize(lw, lh);
      lv.w = lw; lv.h = lh;
    }
  }

  _draw(mat, target) {
    this.quad.material = mat;
    this.renderer.setRenderTarget(target);
    this.renderer.clear();
    this.renderer.render(this.scene, this.camera);
  }

  // 由呼叫端提供 renderSceneFn(target) 把 3D 場景畫進 rtScene
  render(renderSceneFn) {
    const r = this.renderer;
    if (!this.enabled) { renderSceneFn(null); return; }

    renderSceneFn(this.rtScene);

    // 亮度擷取 → level0
    this.brightMat.uniforms.tDiffuse.value = this.rtScene.texture;
    this._draw(this.brightMat, this.levels[0].a);

    // 逐級模糊 + 降採樣
    let src = this.levels[0].a;
    for (let i = 0; i < this.levels.length; i++) {
      const lv = this.levels[i];
      if (i > 0) {
        // 直接把上一級結果模糊到本級（尺寸較小 = 降採樣）
        this.blurMat.uniforms.tDiffuse.value = src.texture;
        this.blurMat.uniforms.dir.value.set(1 / lv.w, 0);
        this._draw(this.blurMat, lv.a);
      }
      this.blurMat.uniforms.tDiffuse.value = lv.a.texture;
      this.blurMat.uniforms.dir.value.set(1 / lv.w, 0);
      this._draw(this.blurMat, lv.b);
      this.blurMat.uniforms.tDiffuse.value = lv.b.texture;
      this.blurMat.uniforms.dir.value.set(0, 1 / lv.h);
      this._draw(this.blurMat, lv.a);
      src = lv.a;
    }

    // 合成到螢幕
    const u = this.compMat.uniforms;
    u.tScene.value = this.rtScene.texture;
    u.tBloom0.value = this.levels[0].a.texture;
    u.tBloom1.value = this.levels[1].a.texture;
    u.tBloom2.value = this.levels[2].a.texture;
    this.quad.material = this.compMat;
    r.setRenderTarget(null);
    r.render(this.scene, this.camera);
  }

  set(name, v) {
    if (name in this.compMat.uniforms) this.compMat.uniforms[name].value = v;
    else if (name in this.brightMat.uniforms) this.brightMat.uniforms[name].value = v;
  }
}
