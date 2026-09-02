// 渲染管線模组：ACES 色调映射、即时阴影、PMREM 环境反射、bloom 后制、画质分级
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// ---- 画质分级：手机／低核心数自动降级（?q=high / ?q=low 可强制）----
const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
const qParam = new URLSearchParams(location.search).get('q');
const lowTier = qParam ? qParam === 'low' : (isTouch || (navigator.hardwareConcurrency || 8) <= 4);

export const QUALITY = {
  low: lowTier,
  shadows: !lowTier,
  shadowSize: lowTier ? 1024 : 2048,
  bloom: !lowTier,
  pixelRatio: Math.min(window.devicePixelRatio, lowTier ? 1.5 : 2),
  terrainSeg: lowTier ? 64 : 128,
};

// ---- 全域可调渲染参数（DEV 面板即时改、匯出后 bake 回这里）----
export const RENDER = {
  exposure: 0.34,    // 全域曝光（HDR 物理天空很亮，曝光要压低、主光拉高才不会泛白）
  sun: 3.0,          // 主光强度（physically correct lights）
  hemi: 0.5,         // 半球光强度
  env: 0.5,          // 布景 envMapIntensity
  envKart: 0.6,      // 车辆 envMapIntensity
  bloomStrength: 0.28,
  bloomRadius: 0.45,
  bloomThreshold: 0.92,
  shadowRange: 46,   // 阴影正交相机半径（公尺）
  shadowBias: -0.00025,
  shadowNormalBias: 0.035,
  camDist: 7.4,
  camHeight: 3.4,
  fov: 68,
};

export function createRenderer(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(QUALITY.pixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = RENDER.exposure;
  renderer.shadowMap.enabled = QUALITY.shadows;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);
  return renderer;
}

// ---- 后制合成器：RenderPass → Bloom → OutputPass（色调映射 + sRGB）----
export class Pipeline {
  constructor(renderer, camera) {
    this.renderer = renderer;
    this.camera = camera;
    this.composer = null;
    this.bloom = null;
    this.renderPass = null;
    this.scene = null;
    this.exposureScale = 1;
    if (QUALITY.bloom) {
      const size = new THREE.Vector2();
      renderer.getSize(size);
      this.composer = new EffectComposer(renderer);
      this.renderPass = new RenderPass(new THREE.Scene(), camera);
      this.bloom = new UnrealBloomPass(size, RENDER.bloomStrength, RENDER.bloomRadius, RENDER.bloomThreshold);
      this.composer.addPass(this.renderPass);
      this.composer.addPass(this.bloom);
      this.composer.addPass(new OutputPass());
    }
  }

  setScene(scene, trackDef) {
    this.scene = scene;
    this.exposureScale = trackDef?.exposureScale ?? 1;
    if (this.renderPass) this.renderPass.scene = scene;
  }

  resize(w, h) {
    this.renderer.setSize(w, h);
    if (this.composer) this.composer.setSize(w, h);
  }

  // 每帧套用可调参数（DEV 面板改值后立即生效）
  applyParams() {
    this.renderer.toneMappingExposure = RENDER.exposure * this.exposureScale;
    if (this.bloom) {
      this.bloom.strength = RENDER.bloomStrength;
      this.bloom.radius = RENDER.bloomRadius;
      this.bloom.threshold = RENDER.bloomThreshold;
    }
  }

  render(scene) {
    if (!scene) { this.renderer.clear(); return; }
    if (this.composer) {
      if (this.renderPass.scene !== scene) this.renderPass.scene = scene;
      this.composer.render();
    } else {
      this.renderer.render(scene, this.camera);
    }
  }
}

// ---- 光照组：半球光 + 主光（带跟随玩家的阴影相机）----
export class LightRig {
  constructor(scene, trackDef) {
    this.dir = new THREE.Vector3(...trackDef.sunPos).normalize();
    this.hemi = new THREE.HemisphereLight(trackDef.hemiSky ?? 0xdfe9ff, trackDef.hemiGround ?? 0x4a5a44, RENDER.hemi * (trackDef.ambient ?? 1));
    scene.add(this.hemi);

    this.sun = new THREE.DirectionalLight(trackDef.sunColor, RENDER.sun * (trackDef.sunScale ?? 1));
    this.sun.position.copy(this.dir).multiplyScalar(160);
    scene.add(this.sun);
    scene.add(this.sun.target);

    if (QUALITY.shadows) {
      const s = this.sun;
      s.castShadow = true;
      s.shadow.mapSize.set(QUALITY.shadowSize, QUALITY.shadowSize);
      const r = RENDER.shadowRange;
      s.shadow.camera.left = -r; s.shadow.camera.right = r;
      s.shadow.camera.top = r; s.shadow.camera.bottom = -r;
      s.shadow.camera.near = 20; s.shadow.camera.far = 340;
      s.shadow.bias = RENDER.shadowBias;
      s.shadow.normalBias = RENDER.shadowNormalBias;
    }
    this._trackDef = trackDef;
  }

  // 阴影相机跟随焦点（玩家前方一点），并把阴影范围对齐到 texel 避免闪烁
  follow(focus) {
    const s = this.sun;
    s.target.position.copy(focus);
    s.position.copy(focus).addScaledVector(this.dir, 160);
    s.target.updateMatrixWorld();
    if (QUALITY.shadows) {
      const r = RENDER.shadowRange;
      const cam = s.shadow.camera;
      if (cam.right !== r) {
        cam.left = -r; cam.right = r; cam.top = r; cam.bottom = -r;
        cam.updateProjectionMatrix();
      }
      s.shadow.bias = RENDER.shadowBias;
      s.shadow.normalBias = RENDER.shadowNormalBias;
    }
    const def = this._trackDef;
    s.intensity = RENDER.sun * (def.sunScale ?? 1);
    this.hemi.intensity = RENDER.hemi * (def.ambient ?? 1);
  }
}

// ---- 由天空场景烘焙 PMREM 环境贴图（车漆反射 / 布景环境光）----
export function bakeEnvironment(renderer, skyObject) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const envScene = new THREE.Scene();
  envScene.add(skyObject);
  const rt = pmrem.fromScene(envScene, 0.04);
  envScene.remove(skyObject);
  pmrem.dispose();
  return rt;
}

// 把场景内所有 Standard 材质套上环境强度（车辆另外给较高值）
export function applyEnvIntensity(root, intensity) {
  root.traverse(o => {
    if (!o.material) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of mats) if ('envMapIntensity' in m) m.envMapIntensity = intensity;
  });
}
