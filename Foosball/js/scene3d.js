// Three.js 場景：球桌、球桿、人偶、球、鏡頭（直版/橫版切換）
import * as THREE from 'three';
import { CONFIG, RODS } from './config.js';

const ROD_Y = 1.25; // 桿高度

export class Scene3D {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0d1020);
    this.scene.fog = new THREE.Fog(0x0d1020, 55, 110);

    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 200);
    this.orientation = 'portrait';

    this.tableGroup = new THREE.Group();
    this.scene.add(this.tableGroup);

    this._buildLights();
    this._buildEnvironment();
    this._buildTable();
    this._buildRods();
    this._buildBall();

    this._plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this._ray = new THREE.Raycaster();
    this._v2 = new THREE.Vector2();
    this._v3 = new THREE.Vector3();
  }

  _buildLights() {
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x33415e, 1.0));
    const dir = new THREE.DirectionalLight(0xfff2dd, 1.6);
    dir.position.set(12, 28, 10);
    dir.castShadow = true;
    dir.shadow.mapSize.set(1024, 1024);
    const s = 22;
    dir.shadow.camera.left = -s; dir.shadow.camera.right = s;
    dir.shadow.camera.top = s; dir.shadow.camera.bottom = -s;
    dir.shadow.camera.far = 80;
    this.scene.add(dir);
  }

  _buildEnvironment() {
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(300, 300),
      new THREE.MeshStandardMaterial({ color: 0x141828, roughness: 1 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -6;
    floor.receiveShadow = true;
    this.scene.add(floor);
  }

  _fieldTexture() {
    const T = CONFIG.table;
    const c = document.createElement('canvas');
    c.width = 512; c.height = Math.round(512 * T.length / T.width);
    const g = c.getContext('2d');
    const W = c.width, H = c.height;
    // 草皮直條紋
    const bands = 10;
    for (let i = 0; i < bands; i++) {
      g.fillStyle = i % 2 === 0 ? '#2f9e44' : '#2b8f3e';
      g.fillRect(0, H * i / bands, W, H / bands + 1);
    }
    // 白線
    g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 5;
    const m = W * 0.045;
    g.strokeRect(m, m, W - 2 * m, H - 2 * m);
    g.beginPath(); g.moveTo(m, H / 2); g.lineTo(W - m, H / 2); g.stroke();
    g.beginPath(); g.arc(W / 2, H / 2, W * 0.16, 0, Math.PI * 2); g.stroke();
    // 禁區
    const bw = W * 0.55, bh = H * 0.13;
    g.strokeRect(W / 2 - bw / 2, m, bw, bh);
    g.strokeRect(W / 2 - bw / 2, H - m - bh, bw, bh);
    const tex = new THREE.CanvasTexture(c);
    tex.anisotropy = 4;
    return tex;
  }

  _buildTable() {
    const T = CONFIG.table;
    const field = new THREE.Mesh(
      new THREE.PlaneGeometry(T.width, T.length),
      new THREE.MeshStandardMaterial({ map: this._fieldTexture(), roughness: 0.9 })
    );
    field.rotation.x = -Math.PI / 2;
    field.receiveShadow = true;
    this.tableGroup.add(field);

    const wood = new THREE.MeshStandardMaterial({ color: 0x7a4f28, roughness: 0.7 });
    const woodDark = new THREE.MeshStandardMaterial({ color: 0x5d3a1a, roughness: 0.8 });
    const wallT = 0.8;
    // 側牆
    for (const sx of [-1, 1]) {
      const w = new THREE.Mesh(new THREE.BoxGeometry(wallT, T.wallH, T.length + wallT * 2), wood);
      w.position.set(sx * (T.width / 2 + wallT / 2), T.wallH / 2, 0);
      w.castShadow = true; w.receiveShadow = true;
      this.tableGroup.add(w);
    }
    // 端牆（球門開口兩側）
    const segW = T.width / 2 - T.goalHalf;
    for (const sz of [-1, 1]) {
      for (const sx of [-1, 1]) {
        const w = new THREE.Mesh(new THREE.BoxGeometry(segW, T.wallH, wallT), wood);
        w.position.set(sx * (T.goalHalf + segW / 2), T.wallH / 2, sz * (T.length / 2 + wallT / 2));
        w.castShadow = true; w.receiveShadow = true;
        this.tableGroup.add(w);
      }
      // 球門框（橫楣）
      const bar = new THREE.Mesh(new THREE.BoxGeometry(T.goalHalf * 2, 0.35, wallT), woodDark);
      bar.position.set(0, T.wallH + 0.4, sz * (T.length / 2 + wallT / 2));
      this.tableGroup.add(bar);
      // 球門內袋（暗色）
      const pocket = new THREE.Mesh(
        new THREE.BoxGeometry(T.goalHalf * 2 + 0.6, T.wallH + 0.7, 1.8),
        new THREE.MeshStandardMaterial({ color: 0x15181f, roughness: 1 })
      );
      pocket.position.set(0, (T.wallH + 0.7) / 2 - 0.05, sz * (T.length / 2 + wallT + 0.9));
      this.tableGroup.add(pocket);
    }
    // 桌體外框底座
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(T.width + wallT * 2 + 0.6, 2.2, T.length + wallT * 2 + 4.4), woodDark
    );
    base.position.y = -1.35;
    base.receiveShadow = true;
    this.tableGroup.add(base);
  }

  _figure(matBody, matPants, matSkin) {
    const grp = new THREE.Group();
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.27, 12, 10), matSkin);
    head.position.y = 0.5;
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.72, 0.36), matBody);
    torso.position.y = -0.12;
    const legs = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.55, 0.3), matPants);
    legs.position.y = -0.72;
    const feet = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.22, 0.42), matBody);
    feet.position.y = -1.06;
    for (const m of [head, torso, legs, feet]) { m.castShadow = true; grp.add(m); }
    return grp;
  }

  _buildRods() {
    const T = CONFIG.table;
    const metal = new THREE.MeshStandardMaterial({ color: 0xc8ccd6, metalness: 0.9, roughness: 0.25 });
    this.rodViews = RODS.map(def => {
      const holder = new THREE.Group();
      holder.position.set(0, ROD_Y, def.z);
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, T.width + 4.4, 10), metal);
      rod.rotation.z = Math.PI / 2;
      rod.castShadow = true;
      holder.add(rod);
      // 握把
      const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 1.3, 10),
        new THREE.MeshStandardMaterial({ color: def.side === 'P' ? 0x2255cc : 0xcc3333, roughness: 0.6 }));
      grip.rotation.z = Math.PI / 2;
      grip.position.x = (def.side === 'P' ? 1 : -1) * (T.width / 2 + 2.6);
      holder.add(grip);
      const figures = new THREE.Group();
      holder.add(figures);
      this.tableGroup.add(holder);
      return { def, holder, figures, gripBase: grip.position.x };
    });
  }

  // 依選定隊伍上色人偶
  setTeams(pTeam, aTeam) {
    const skin = new THREE.MeshStandardMaterial({ color: 0xe8b98a, roughness: 0.8 });
    const mats = {
      P: [new THREE.MeshStandardMaterial({ color: pTeam.jc1, roughness: 0.55 }),
          new THREE.MeshStandardMaterial({ color: pTeam.jc2, roughness: 0.55 })],
      A: [new THREE.MeshStandardMaterial({ color: aTeam.jc1, roughness: 0.55 }),
          new THREE.MeshStandardMaterial({ color: aTeam.jc2, roughness: 0.55 })],
    };
    for (const rv of this.rodViews) {
      rv.figures.clear();
      const [body, pants] = mats[rv.def.side];
      for (let i = 0; i < rv.def.count; i++) {
        const rel = (i - (rv.def.count - 1) / 2) * rv.def.spacing;
        const fig = this._figure(body, pants, skin);
        fig.position.x = rel;
        rv.figures.add(fig);
      }
    }
  }

  _ballTexture() {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d');
    g.fillStyle = '#f4f4f4'; g.fillRect(0, 0, 128, 128);
    g.fillStyle = '#222';
    for (const [x, y] of [[20, 30], [70, 14], [110, 44], [40, 78], [95, 95], [10, 105], [64, 52]]) {
      g.beginPath(); g.arc(x, y, 11, 0, Math.PI * 2); g.fill();
    }
    return new THREE.CanvasTexture(c);
  }

  _buildBall() {
    this.ballMesh = new THREE.Mesh(
      new THREE.SphereGeometry(CONFIG.table.ballR, 20, 16),
      new THREE.MeshStandardMaterial({ map: this._ballTexture(), roughness: 0.4 })
    );
    this.ballMesh.castShadow = true;
    this.tableGroup.add(this.ballMesh);
  }

  // 直版：桌長沿螢幕縱向（玩家在下）；橫版：旋轉 90°（玩家守左門、往右攻）
  setOrientation(mode) {
    this.orientation = mode;
    this.tableGroup.rotation.y = mode === 'landscape' ? -Math.PI / 2 : 0;
    this.applyLayout();
  }

  applyLayout() {
    const L = this.orientation === 'landscape' ? CONFIG.LAYOUT_PC : CONFIG.LAYOUT_MOBILE;
    this.camera.fov = L.fov;
    this.camera.position.set(0, L.camH, L.camD);
    this.camera.lookAt(0, 0, L.lookZ);
    this.camera.updateProjectionMatrix();
    this.camera.updateMatrixWorld(); // 尚未 render 前（背景分頁）也要能正確 raycast
    this.tableGroup.updateMatrixWorld(true);
  }

  resize(w, h) {
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  // 螢幕座標 → 球桌本地座標（自動處理橫版旋轉）
  screenToLocal(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    this._v2.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    this._ray.setFromCamera(this._v2, this.camera);
    if (!this._ray.ray.intersectPlane(this._plane, this._v3)) return null;
    const p = this.tableGroup.worldToLocal(this._v3.clone());
    return { x: p.x, z: p.z };
  }

  sync(game) {
    for (let i = 0; i < game.rods.length; i++) {
      const r = game.rods[i], rv = this.rodViews[i];
      rv.figures.position.x = r.offset;
      rv.figures.rotation.x = -r.facing * r.angle; // 遊戲角度=朝攻擊方向擺腿，轉成 three 旋轉
      // 握把跟著桿滑動
      rv.holder.children[1].position.x = rv.gripBase + r.offset * 0.4;
    }
    const b = game.ball;
    this.ballMesh.position.set(b.x, CONFIG.table.ballR, b.z);
    this.ballMesh.rotation.x += b.vz * 0.02;
    this.ballMesh.rotation.z -= b.vx * 0.02;
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}
