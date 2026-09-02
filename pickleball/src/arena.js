// ===== 室內場館：楓木地板、球場漆面、球網、牆面、天花板燈具、長椅、記分板、燈光 =====
import * as THREE from 'three';
import { COURT, TUNE } from './tune.js';
import {
  makeWoodTextures, makeCourtTexture, makeWallTexture, makeBlockTexture,
  makeNetTexture, makeBannerTexture, ScoreboardTexture,
} from './textures.js';

export const ROOM = { halfW: 12, halfL: 17, height: 9.5 };

export class Arena {
  constructor(scene, isMobile) {
    this.scene = scene;
    this.isMobile = isMobile;
    this.group = new THREE.Group();
    scene.add(this.group);
    this.arenaMats = [];   // envMapIntensity = envArena
    this.floorMats = [];   // envMapIntensity = envFloor
    this.panelMats = [];
    this._buildFloor();
    this._buildNet();
    this._buildWalls();
    this._buildCeiling();
    this._buildFurniture();
    this._buildLights();
    this._buildMarker();
  }

  // ---- 地板與球場漆面 ----
  _buildFloor() {
    const wood = makeWoodTextures(this.isMobile ? 768 : 1024);
    const floorMat = new THREE.MeshStandardMaterial({
      map: wood.map, normalMap: wood.normalMap, roughnessMap: wood.roughnessMap,
      normalScale: new THREE.Vector2(0.55, 0.55),
      roughness: 0.42, metalness: 0.0,
    });
    this.floorMats.push(floorMat);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(ROOM.halfW * 2, ROOM.halfL * 2), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.group.add(floor);

    const ct = makeCourtTexture(COURT);
    const courtMat = new THREE.MeshStandardMaterial({
      map: ct.texture, transparent: true, roughness: 0.5, metalness: 0,
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
      normalMap: wood.normalMap, normalScale: new THREE.Vector2(0.25, 0.25),
    });
    // 漆面沿用木紋法線（漆下仍看得出板縫）
    this.floorMats.push(courtMat);
    const court = new THREE.Mesh(new THREE.PlaneGeometry(ct.worldW, ct.worldL), courtMat);
    court.rotation.x = -Math.PI / 2;
    court.position.y = 0.003;
    court.receiveShadow = true;
    this.group.add(court);
  }

  // ---- 球網 ----
  _buildNet() {
    const g = new THREE.Group();
    const postMat = new THREE.MeshStandardMaterial({ color: 0x15171c, roughness: 0.45, metalness: 0.7 });
    const bandMat = new THREE.MeshStandardMaterial({ color: 0xe4e4e4, roughness: 0.8 });
    this.arenaMats.push(postMat, bandMat);
    for (const s of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, COURT.netPost + 0.08, 20), postMat);
      post.position.set(s * COURT.postX, (COURT.netPost + 0.08) / 2, 0);
      post.castShadow = true;
      g.add(post);
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.05, 24), postMat);
      base.position.set(s * COURT.postX, 0.025, 0);
      base.castShadow = true;
      g.add(base);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 12), postMat);
      cap.position.set(s * COURT.postX, COURT.netPost + 0.08, 0);
      g.add(cap);
    }
    // 網面：用曲線讓中央微下垂
    const segs = 40;
    const w = COURT.postX * 2;
    const geo = new THREE.PlaneGeometry(w, 1, segs, 1);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const top = this.netHeight(x);
      const yN = pos.getY(i); // -0.5 或 0.5
      pos.setY(i, yN > 0 ? top : 0.02);
    }
    geo.computeVertexNormals();
    const netTex = makeNetTexture();
    // 一張貼圖 12 格 ≈ 0.3m → 每格 2.5cm
    netTex.repeat.set(w / 0.3, 0.9 / 0.3);
    const netMat = new THREE.MeshStandardMaterial({
      map: netTex, transparent: true, alphaTest: 0.08, side: THREE.DoubleSide,
      roughness: 0.9, color: 0xffffff, depthWrite: false,
    });
    const net = new THREE.Mesh(geo, netMat);
    net.castShadow = true;
    net.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: netTex, alphaTest: 0.3 });
    g.add(net);
    // 上帶（白色）沿弧線
    const bandGeo = new THREE.PlaneGeometry(w, 0.06, segs, 1);
    const bp = bandGeo.attributes.position;
    for (let i = 0; i < bp.count; i++) {
      const x = bp.getX(i);
      bp.setY(i, this.netHeight(x) + bp.getY(i));
    }
    const band = new THREE.Mesh(bandGeo, new THREE.MeshStandardMaterial({ color: 0xe4e4e4, roughness: 0.8, side: THREE.DoubleSide }));
    band.position.z = 0.004;
    g.add(band);
    const band2 = band.clone(); band2.position.z = -0.004; g.add(band2);
    this.group.add(g);
  }

  netHeight(x) {
    const t = Math.min(1, Math.abs(x) / COURT.postX);
    return COURT.netCenter + (COURT.netPost - COURT.netCenter) * t * t;
  }

  // ---- 牆面：下半防撞墊、上半磚牆 ----
  _buildWalls() {
    const wallTex = makeWallTexture();
    const block = makeBlockTexture();
    const upperMat = new THREE.MeshStandardMaterial({ map: block.map, normalMap: block.normalMap, roughness: 0.92 });
    const trimMat = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.9 });
    const padMat = new THREE.MeshStandardMaterial({ color: 0x1f3f7a, roughness: 0.62 });
    const padMat2 = new THREE.MeshStandardMaterial({ color: 0x2b5aa8, roughness: 0.62 });
    this.arenaMats.push(upperMat, trimMat, padMat, padMat2);

    const padH = 2.2, padD = 0.09;
    const H = ROOM.height;
    const walls = [
      { pos: [0, 0, -ROOM.halfL], rot: 0, len: ROOM.halfW * 2 },
      { pos: [0, 0, ROOM.halfL], rot: Math.PI, len: ROOM.halfW * 2 },
      { pos: [-ROOM.halfW, 0, 0], rot: Math.PI / 2, len: ROOM.halfL * 2 },
      { pos: [ROOM.halfW, 0, 0], rot: -Math.PI / 2, len: ROOM.halfL * 2 },
    ];
    for (const w of walls) {
      const g = new THREE.Group();
      g.position.set(...w.pos);
      g.rotation.y = w.rot;
      // 上半牆
      const upper = new THREE.Mesh(new THREE.PlaneGeometry(w.len, H), upperMat);
      upper.position.y = H / 2;
      upper.receiveShadow = true;
      g.add(upper);
      // 腰線
      const trim = new THREE.Mesh(new THREE.BoxGeometry(w.len, 0.12, 0.06), trimMat);
      trim.position.set(0, padH + 0.06, 0.03);
      g.add(trim);
      // 防撞墊分段
      const segW = 1.2, gap = 0.035;
      const n = Math.floor(w.len / segW);
      const start = -(n * segW) / 2 + segW / 2;
      for (let i = 0; i < n; i++) {
        const pad = new THREE.Mesh(new THREE.BoxGeometry(segW - gap, padH, padD), i % 2 ? padMat : padMat2);
        pad.position.set(start + i * segW, padH / 2, padD / 2);
        pad.receiveShadow = true;
        g.add(pad);
      }
      this.group.add(g);
    }

    // 記分板（後牆，AI 那側）
    this.scoreboard = new ScoreboardTexture();
    const sbMat = new THREE.MeshStandardMaterial({
      map: this.scoreboard.texture, emissive: 0xffffff, emissiveMap: this.scoreboard.texture,
      emissiveIntensity: 1.1, roughness: 0.4, color: 0x222222,
    });
    const sb = new THREE.Mesh(new THREE.BoxGeometry(5.2, 1.95, 0.18), sbMat);
    sb.position.set(0, 4.6, -ROOM.halfL + 0.1);
    this.group.add(sb);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(5.5, 2.25, 0.14), new THREE.MeshStandardMaterial({ color: 0x0d1117, roughness: 0.4, metalness: 0.6 }));
    frame.position.set(0, 4.6, -ROOM.halfL + 0.06);
    this.group.add(frame);

    // 橫幅
    const bannerMat = new THREE.MeshStandardMaterial({ map: makeBannerTexture('PICKLEBALL ARENA', 'INDOOR COURT · 3D'), roughness: 0.85 });
    const banner = new THREE.Mesh(new THREE.PlaneGeometry(9.6, 2.4), bannerMat);
    banner.position.set(0, 7.2, -ROOM.halfL + 0.03);
    this.group.add(banner);
    const bannerBack = new THREE.Mesh(new THREE.PlaneGeometry(9.6, 2.4), bannerMat);
    bannerBack.position.set(0, 7.2, ROOM.halfL - 0.03);
    bannerBack.rotation.y = Math.PI;
    this.group.add(bannerBack);
    for (const s of [-1, 1]) {
      const sideB = new THREE.Mesh(new THREE.PlaneGeometry(9.6, 2.4), bannerMat);
      sideB.position.set(s * (ROOM.halfW - 0.03), 6.0, 0);
      sideB.rotation.y = -s * Math.PI / 2;
      this.group.add(sideB);
    }
  }

  // ---- 天花板：桁架 + LED 面板燈 ----
  _buildCeiling() {
    const H = ROOM.height;
    const ceilMat = new THREE.MeshStandardMaterial({ color: 0x2b2f36, roughness: 0.95 });
    const trussMat = new THREE.MeshStandardMaterial({ color: 0x6d7480, roughness: 0.5, metalness: 0.75 });
    this.arenaMats.push(ceilMat, trussMat);
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(ROOM.halfW * 2, ROOM.halfL * 2), ceilMat);
    ceil.rotation.x = Math.PI / 2;
    ceil.position.y = H;
    this.group.add(ceil);

    // 橫向桁架（每 4.25m 一根）
    const trussGeo = new THREE.BoxGeometry(ROOM.halfW * 2, 0.45, 0.35);
    const chordGeo = new THREE.BoxGeometry(ROOM.halfW * 2, 0.08, 0.08);
    for (let z = -ROOM.halfL + 2.5; z < ROOM.halfL; z += 4.25) {
      const t = new THREE.Mesh(chordGeo, trussMat);
      t.position.set(0, H - 0.5, z);
      this.group.add(t);
      const t2 = new THREE.Mesh(chordGeo, trussMat);
      t2.position.set(0, H - 0.05, z);
      this.group.add(t2);
      // 斜撐
      for (let x = -ROOM.halfW + 1; x < ROOM.halfW; x += 2) {
        const d = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.06), trussMat);
        d.scale.set(1, 1, 1);
        const diag = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.1, 6), trussMat);
        diag.position.set(x, H - 0.28, z);
        diag.rotation.z = (x / 2 % 2 === 0 ? 1 : -1) * 0.95;
        this.group.add(diag);
      }
    }
    // 縱向主樑
    for (const x of [-6, 0, 6]) {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.5, ROOM.halfL * 2), trussMat);
      beam.position.set(x, H - 0.25, 0);
      this.group.add(beam);
    }

    // LED 面板燈（吊掛）
    const panelMat = new THREE.MeshStandardMaterial({
      color: 0xffffff, emissive: 0xfff4e0, emissiveIntensity: TUNE.light.panelEmissive, roughness: 0.3,
    });
    this.panelMats.push(panelMat);
    const housingMat = new THREE.MeshStandardMaterial({ color: 0xbfc4cc, roughness: 0.4, metalness: 0.8 });
    const wireMat = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.6 });
    const panelGeo = new THREE.BoxGeometry(1.8, 0.05, 0.9);
    const housingGeo = new THREE.BoxGeometry(1.9, 0.12, 1.0);
    const wireGeo = new THREE.CylinderGeometry(0.01, 0.01, 1.2, 6);
    const lightY = H - 1.7;
    for (const x of [-6, 0, 6]) {
      for (let z = -12; z <= 12; z += 6) {
        const h = new THREE.Mesh(housingGeo, housingMat);
        h.position.set(x, lightY + 0.05, z);
        this.group.add(h);
        const p = new THREE.Mesh(panelGeo, panelMat);
        p.position.set(x, lightY - 0.03, z);
        this.group.add(p);
        for (const dx of [-0.8, 0.8]) {
          const w = new THREE.Mesh(wireGeo, wireMat);
          w.position.set(x + dx, lightY + 0.7, z);
          this.group.add(w);
        }
      }
    }
  }

  // ---- 場邊設施：長椅、球車、水瓶 ----
  _buildFurniture() {
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x8a5a2b, roughness: 0.6 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x2a2d33, roughness: 0.4, metalness: 0.8 });
    const ballMat = new THREE.MeshStandardMaterial({ color: 0xd5ef2f, roughness: 0.55 });
    this.arenaMats.push(woodMat, metalMat, ballMat);
    const slatGeo = new THREE.BoxGeometry(2.0, 0.04, 0.12);
    const legGeo = new THREE.BoxGeometry(0.05, 0.42, 0.42);
    const bench = (x, z, rot) => {
      const g = new THREE.Group();
      for (let i = 0; i < 3; i++) {
        const s = new THREE.Mesh(slatGeo, woodMat);
        s.position.set(0, 0.44, -0.15 + i * 0.15);
        s.castShadow = true; s.receiveShadow = true;
        g.add(s);
      }
      for (const dx of [-0.85, 0.85]) {
        const l = new THREE.Mesh(legGeo, metalMat);
        l.position.set(dx, 0.21, 0);
        l.castShadow = true;
        g.add(l);
      }
      g.position.set(x, 0, z);
      g.rotation.y = rot;
      this.group.add(g);
    };
    bench(-6.2, 4.2, Math.PI / 2);
    bench(-6.2, -4.2, Math.PI / 2);
    bench(6.2, 4.2, -Math.PI / 2);
    bench(6.2, -4.2, -Math.PI / 2);

    // 球車
    const cart = new THREE.Group();
    const bin = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.28, 0.6, 24, 1, true), new THREE.MeshStandardMaterial({ color: 0x33363c, roughness: 0.5, metalness: 0.6, side: THREE.DoubleSide }));
    bin.position.y = 0.5;
    bin.castShadow = true;
    cart.add(bin);
    const binBottom = new THREE.Mesh(new THREE.CircleGeometry(0.28, 24), metalMat);
    binBottom.rotation.x = -Math.PI / 2; binBottom.position.y = 0.2;
    cart.add(binBottom);
    for (let i = 0; i < 4; i++) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.2, 8), metalMat);
      const a = (i / 4) * Math.PI * 2;
      leg.position.set(Math.cos(a) * 0.22, 0.1, Math.sin(a) * 0.22);
      cart.add(leg);
    }
    const ballGeo = new THREE.SphereGeometry(0.037, 12, 10);
    for (let i = 0; i < 14; i++) {
      const b = new THREE.Mesh(ballGeo, ballMat);
      const a = i * 2.39, r = 0.05 + (i % 5) * 0.05;
      b.position.set(Math.cos(a) * r, 0.62 + (i % 3) * 0.035, Math.sin(a) * r);
      cart.add(b);
    }
    cart.position.set(-6.4, 0, -7.6);
    this.group.add(cart);

    // 水瓶
    const bottleMat = new THREE.MeshStandardMaterial({ color: 0x3fb6ff, roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.85 });
    for (const [x, z] of [[-6.1, 3.6], [6.3, -3.9], [6.1, 4.5]]) {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.22, 12), bottleMat);
      b.position.set(x, 0.57, z);
      b.castShadow = true;
      this.group.add(b);
    }
  }

  // ---- 燈光：陰影主光 + 半球環境 + 局部點光 ----
  _buildLights() {
    const L = TUNE.light;
    this.hemi = new THREE.HemisphereLight(0xdfe8ff, 0x8a7a66, L.hemiIntensity);
    this.scene.add(this.hemi);

    this.sun = new THREE.DirectionalLight(0xfff4e6, L.sunIntensity);
    this.sun.position.set(L.sunX, L.sunY, L.sunZ);
    this.sun.castShadow = true;
    const sc = this.sun.shadow.camera;
    sc.near = 2; sc.far = 32;
    sc.left = -9; sc.right = 9; sc.top = 10.5; sc.bottom = -10.5;
    this.sun.shadow.mapSize.set(this.isMobile ? 1024 : 2048, this.isMobile ? 1024 : 2048);
    this.sun.shadow.bias = L.shadowBias;
    this.sun.shadow.normalBias = L.shadowNormalBias;
    this.sun.shadow.radius = 4;
    this.scene.add(this.sun);
    this.scene.add(this.sun.target);

    this.points = [];
    for (const [x, z] of [[-5, -5.5], [5, -5.5], [-5, 5.5], [5, 5.5]]) {
      const p = new THREE.PointLight(0xfff1dc, L.pointIntensity, 30, 2);
      p.position.set(x, 7.4, z);
      this.scene.add(p);
      this.points.push(p);
    }
  }

  // ---- 落點預測標記 ----
  _buildMarker() {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.2, 0.3, 40),
      new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.85, depthWrite: false })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.012;
    ring.visible = false;
    this.marker = ring;
    this.group.add(ring);
  }

  setEnvironment(envTex) {
    this.scene.environment = envTex;
    this.applyLightTune();
  }

  applyLightTune() {
    const L = TUNE.light;
    for (const m of this.floorMats) m.envMapIntensity = L.envFloor;
    for (const m of this.arenaMats) m.envMapIntensity = L.envArena;
    for (const m of this.panelMats) m.emissiveIntensity = L.panelEmissive;
    this.hemi.intensity = L.hemiIntensity;
    this.sun.intensity = L.sunIntensity;
    this.sun.position.set(L.sunX, L.sunY, L.sunZ);
    this.sun.shadow.bias = L.shadowBias;
    this.sun.shadow.normalBias = L.shadowNormalBias;
    for (const p of this.points) p.intensity = L.pointIntensity;
  }

  setScore(p, a, server) {
    this.scoreboard.draw(p, a, server);
  }
}
