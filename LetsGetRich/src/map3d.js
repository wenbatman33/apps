import * as THREE from '../vendor/three.js';
import { RoundedBoxGeometry } from '../vendor/RoundedBoxGeometry.js';

// 金色外框彼此贴合；米白格面仍保留清楚的独立边界。
const CELL_STEP_X = 2.46;
const CELL_STEP_Z = 2.46;
// 普通回合以可读性优先：保留前后路线与邻近转角，但不把整条边缩进直屏。
// 此距离约显示 5～7 格，城市名、金额与建筑维持可辨识尺寸。
const CLOSE_OFFSET = new THREE.Vector3(14, 20, 14);
const OVERVIEW_OFFSET = new THREE.Vector3(40, 56, 40);
const CHARACTER_IDS = ['mira', 'leon', 'mabel', 'snooze', 'panna', 'miso', 'ivy', 'prof'];
const REGION_COLORS = {
  sapphire: 0x176de2,
  turquoise: 0x13bfc5,
  coral: 0xf15363,
  orange: 0xff951f,
  jade: 0x24ae53,
  cyan: 0x39bee8,
  violet: 0x7b45d4,
  magenta: 0xe33a92,
};
const SPECIAL_ICON_CELLS = {
  start: [0, 0],
  chance: [1, 0],
  fate: [2, 0],
  train: [3, 0],
  jail: [0, 1],
  roulette: [1, 1],
  world: [2, 1],
  diceLab: [3, 1],
};

function easeInOut(progress) {
  return progress < .5 ? 2 * progress * progress : 1 - ((-2 * progress + 2) ** 2) / 2;
}

export class Map3D {
  constructor(container) {
    this.container = container;
    this.active = false;
    this.tiles = [];
    this.cells = [];
    this.players = new Map();
    this.buildings = [];
    this.selectableMeshes = [];
    this.travelSelectHandler = null;
    this.hoveredTravelIndex = -1;
    this.travelDrag = null;
    this.projectionListener = null;
    this.cameraTarget = new THREE.Vector3(0, 0, 0);
    this.desiredTarget = new THREE.Vector3(0, 0, 0);
    this.cameraOffset = CLOSE_OFFSET.clone();
    this.desiredOffset = CLOSE_OFFSET.clone();

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xbfe6f2);
    this.scene.fog = new THREE.Fog(0xbfe6f2, 58, 112);
    this.camera = new THREE.PerspectiveCamera(38, 9 / 16, .1, 120);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.replaceChildren(this.renderer.domElement);
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.renderer.domElement.addEventListener('pointerdown', (event) => this.startTravelDrag(event));
    this.renderer.domElement.addEventListener('pointermove', (event) => this.handleTravelPointer(event));
    this.renderer.domElement.addEventListener('pointerleave', () => {
      if (!this.travelDrag) this.setTravelHover(-1);
    });
    this.renderer.domElement.addEventListener('pointerup', (event) => this.finishTravelDrag(event));
    this.renderer.domElement.addEventListener('pointercancel', (event) => this.finishTravelDrag(event, true));

    this.boardGroup = new THREE.Group();
    this.cellGroup = new THREE.Group();
    this.propertyGroup = new THREE.Group();
    this.playerGroup = new THREE.Group();
    this.boardGroup.add(this.cellGroup, this.propertyGroup, this.playerGroup);
    this.scene.add(this.boardGroup);

    this.createEnvironment();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resize();
    this.animate();
  }

  createEnvironment() {
    this.scene.add(new THREE.HemisphereLight(0xf4fbff, 0x43536d, 2.15));
    const sun = new THREE.DirectionalLight(0xfff3d5, 3.4);
    sun.position.set(-14, 26, 18);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -28;
    sun.shadow.camera.right = 28;
    sun.shadow.camera.top = 28;
    sun.shadow.camera.bottom = -28;
    sun.shadow.camera.near = 2;
    sun.shadow.camera.far = 70;
    this.scene.add(sun);
    const fill = new THREE.DirectionalLight(0x79c8ff, 1.25);
    fill.position.set(18, 12, -20);
    this.scene.add(fill);

    const groundTexture = new THREE.TextureLoader().load('./assets/board-ground-china-3d-v1.png');
    groundTexture.colorSpace = THREE.SRGBColorSpace;
    groundTexture.anisotropy = Math.min(16, this.renderer.capabilities.getMaxAnisotropy());
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(58, 58),
      new THREE.MeshStandardMaterial({ map: groundTexture, color: 0xffffff, roughness: .96, metalness: 0 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -.22;
    ground.receiveShadow = true;
    this.scene.add(ground);
  }

  createTree(x, z, seed) {
    const group = new THREE.Group();
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(.16, .23, 1.45, 10),
      new THREE.MeshStandardMaterial({ color: 0x76502f, roughness: .95 }),
    );
    trunk.position.y = .65;
    trunk.castShadow = true;
    group.add(trunk);
    const colors = [0x3a8b4b, 0x4d9f55, 0x2f7a46, 0xd7658a];
    const foliageMaterial = new THREE.MeshStandardMaterial({ color: colors[seed % colors.length], roughness: .82 });
    [[0, 1.45, 0], [-.34, 1.3, .08], [.32, 1.32, -.05], [0, 1.68, -.12]].forEach(([fx, fy, fz], index) => {
      const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(.58 - index * .035, 1), foliageMaterial);
      crown.position.set(fx, fy, fz);
      crown.castShadow = true;
      group.add(crown);
    });
    group.position.set(x, 0, z);
    return group;
  }

  createPagoda(x, z) {
    const group = new THREE.Group();
    const stone = new THREE.MeshStandardMaterial({ color: 0xd7c39e, roughness: .7 });
    const red = new THREE.MeshStandardMaterial({ color: 0xa93628, roughness: .62 });
    const blue = new THREE.MeshStandardMaterial({ color: 0x184c80, roughness: .5, metalness: .1 });
    const gold = new THREE.MeshStandardMaterial({ color: 0xe3ae43, roughness: .34, metalness: .55 });
    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.55, .45, 8), stone);
    base.position.y = .05;
    base.castShadow = true;
    group.add(base);
    for (let floor = 0; floor < 2; floor += 1) {
      const y = .55 + floor * .95;
      const hall = new THREE.Mesh(new THREE.CylinderGeometry(.72 - floor * .12, .82 - floor * .1, .72, 8), red);
      hall.position.y = y;
      hall.castShadow = true;
      const roof = new THREE.Mesh(new THREE.ConeGeometry(1.2 - floor * .14, .46, 4), blue);
      roof.position.y = y + .48;
      roof.rotation.y = Math.PI / 4;
      roof.castShadow = true;
      group.add(hall, roof);
    }
    const finial = new THREE.Mesh(new THREE.ConeGeometry(.16, .58, 8), gold);
    finial.position.y = 2.45;
    finial.castShadow = true;
    group.add(finial);
    group.position.set(x, 0, z);
    return group;
  }

  tilePosition(index) {
    let gx;
    let gz;
    if (index <= 8) { gx = index; gz = 8; }
    else if (index <= 16) { gx = 8; gz = 16 - index; }
    else if (index <= 24) { gx = 24 - index; gz = 0; }
    else { gx = 0; gz = index - 24; }
    return new THREE.Vector3((gx - 4) * CELL_STEP_X, 0, (gz - 4) * CELL_STEP_Z);
  }

  tileRotation(index) {
    if (index <= 8) return 0;
    if (index <= 16) return Math.PI / 2;
    if (index <= 24) return Math.PI;
    return -Math.PI / 2;
  }

  tileLocalPosition(index, localX = 0, localZ = 0, y = 0) {
    const position = this.tilePosition(index);
    const rotation = this.tileRotation(index);
    position.x += localX * Math.cos(rotation) + localZ * Math.sin(rotation);
    position.z += -localX * Math.sin(rotation) + localZ * Math.cos(rotation);
    position.y = y;
    return position;
  }

  buildBoard(tiles) {
    this.tiles = tiles;
    this.cellGroup.clear();
    this.cells = [];
    this.selectableMeshes = [];
    const navy = new THREE.MeshStandardMaterial({ color: 0x0b2854, roughness: .38, metalness: .16 });
    const gold = new THREE.MeshPhysicalMaterial({ color: 0xe0a63e, roughness: .26, metalness: .72, clearcoat: .7 });
    const ivory = new THREE.MeshPhysicalMaterial({ color: 0xfff5df, roughness: .55, metalness: .02, clearcoat: .28 });
    tiles.forEach((tile, index) => {
      const group = new THREE.Group();
      const position = this.tilePosition(index);
      group.position.copy(position);
      group.rotation.y = this.tileRotation(index);
      const base = new THREE.Mesh(new RoundedBoxGeometry(2.54, .42, 2.26, 5, .12), navy);
      base.position.y = .02;
      base.castShadow = true;
      base.receiveShadow = true;
      const trim = new THREE.Mesh(new RoundedBoxGeometry(2.47, .16, 2.19, 5, .10), gold);
      trim.position.y = .29;
      trim.castShadow = true;
      const top = new THREE.Mesh(new RoundedBoxGeometry(2.31, .10, 2.03, 5, .075), ivory.clone());
      top.position.y = .40;
      top.receiveShadow = true;
      [base, trim, top].forEach((mesh) => {
        mesh.userData.tileIndex = index;
        this.selectableMeshes.push(mesh);
      });
      group.add(base, trim, top);
      let band = null;
      if (tile.type === 'property') {
        const color = REGION_COLORS[tile.region] || 0x249dda;
        const bandMaterial = new THREE.MeshPhysicalMaterial({
          color, roughness: .32, metalness: .08, clearcoat: .75, emissive: color, emissiveIntensity: .03,
        });
        band = new THREE.Mesh(new RoundedBoxGeometry(2.22, .11, .62, 4, .06), bandMaterial);
        band.position.set(0, .49, -.66);
        band.castShadow = true;
        band.userData.tileIndex = index;
        this.selectableMeshes.push(band);
        group.add(band);
      } else {
        const icon = new THREE.Mesh(
          new THREE.PlaneGeometry(1.54, 1.54),
          new THREE.MeshBasicMaterial({
            map: this.createSpecialTileTexture(tile.type),
            depthWrite: false,
            toneMapped: false,
          }),
        );
        icon.position.set(0, .515, -.12);
        icon.rotation.x = -Math.PI / 2;
        icon.renderOrder = 3;
        group.add(icon);
      }
      this.cellGroup.add(group);
      this.cells[index] = { group, top, band, rotation: group.rotation.y };
    });
    this.focusTile(0, { immediate: true });
  }

  createRosterTexture(characterId) {
    const index = Math.max(0, CHARACTER_IDS.indexOf(characterId));
    const texture = new THREE.TextureLoader().load('./assets/character-roster-fun.png');
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.repeat.set(.25, .5);
    texture.offset.set((index % 4) * .25, index < 4 ? .5 : 0);
    return texture;
  }

  createSpecialTileTexture(type) {
    const [column, row] = SPECIAL_ICON_CELLS[type] || [0, 0];
    const texture = new THREE.TextureLoader().load('./assets/special-tile-faces-v1.png');
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.repeat.set(.25, .5);
    texture.offset.set(column * .25, row === 0 ? .5 : 0);
    texture.anisotropy = Math.min(16, this.renderer.capabilities.getMaxAnisotropy());
    return texture;
  }

  resetPlayers(players) {
    this.playerGroup.clear();
    this.players.clear();
    players.forEach((player) => {
      const material = new THREE.SpriteMaterial({
        map: this.createRosterTexture(player.character.id), transparent: true, alphaTest: .04, depthTest: true,
      });
      const sprite = new THREE.Sprite(material);
      sprite.center.set(.5, .06);
      sprite.scale.set(1.72, 2.35, 1);
      sprite.renderOrder = 8;
      this.playerGroup.add(sprite);
      this.players.set(player.id, sprite);
    });
    this.syncTokenPositions(players);
  }

  syncTokenPositions(players) {
    const groups = new Map();
    players.filter((player) => !player.bankrupt).forEach((player) => {
      if (!groups.has(player.position)) groups.set(player.position, []);
      groups.get(player.position).push(player);
    });
    const offsets = [[0, 0], [-.44, .18], [.44, .18], [0, .42]];
    groups.forEach((group, tileIndex) => {
      const cell = this.tilePosition(tileIndex);
      group.forEach((player, slot) => {
        const sprite = this.players.get(player.id);
        if (!sprite) return;
        sprite.position.copy(this.tileLocalPosition(tileIndex, offsets[slot][0], .18 + offsets[slot][1], .58));
        sprite.visible = true;
      });
    });
  }

  setPlayerVisible(playerId, visible) {
    const sprite = this.players.get(playerId);
    if (sprite) sprite.visible = visible;
  }

  moveToken(playerId, tileIndex, duration = 180) {
    const sprite = this.players.get(playerId);
    if (!sprite) return Promise.resolve();
    const start = sprite.position.clone();
    const cell = this.tilePosition(tileIndex);
    const end = this.tileLocalPosition(tileIndex, 0, .18, .58);
    this.desiredTarget.copy(cell);
    const started = performance.now();
    return new Promise((resolve) => {
      const frame = (now) => {
        const progress = Math.min(1, (now - started) / duration);
        const eased = easeInOut(progress);
        sprite.position.lerpVectors(start, end, eased);
        sprite.position.y = .58 + Math.sin(progress * Math.PI) * .44;
        if (progress < 1) requestAnimationFrame(frame);
        else resolve();
      };
      requestAnimationFrame(frame);
    });
  }

  async teleportToken(playerId, destination) {
    const sprite = this.players.get(playerId);
    if (!sprite) return;
    const origin = sprite.position.clone();
    const beamMaterial = new THREE.MeshBasicMaterial({ color: 0xd76cff, transparent: true, opacity: 0, depthWrite: false });
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(.18, .42, 6, 16, 1, true), beamMaterial);
    beam.position.set(origin.x, 3, origin.z);
    this.scene.add(beam);
    await this.animateValue(360, (progress) => {
      beamMaterial.opacity = Math.sin(progress * Math.PI) * .85;
      beam.scale.x = beam.scale.z = .4 + progress;
      sprite.material.opacity = 1 - progress;
    });
    const cell = this.tilePosition(destination);
    this.focusTile(destination);
    sprite.position.copy(this.tileLocalPosition(destination, 0, .18, .58));
    beam.position.set(cell.x, 3, cell.z);
    await this.animateValue(460, (progress) => {
      beamMaterial.opacity = Math.sin(progress * Math.PI) * .85;
      sprite.material.opacity = progress;
    });
    sprite.material.opacity = 1;
    this.scene.remove(beam);
    beam.geometry.dispose();
    beamMaterial.dispose();
  }

  animateValue(duration, update) {
    const started = performance.now();
    return new Promise((resolve) => {
      const frame = (now) => {
        const progress = Math.min(1, (now - started) / duration);
        update(easeInOut(progress));
        if (progress < 1) requestAnimationFrame(frame);
        else resolve();
      };
      requestAnimationFrame(frame);
    });
  }

  createHouse(color = 0x4c86d8) {
    const group = new THREE.Group();
    group.name = 'moulded-house-token';
    const tokenMaterial = new THREE.MeshPhysicalMaterial({
      color,
      roughness: .32,
      metalness: 0,
      clearcoat: .34,
      clearcoatRoughness: .22,
    });
    const reliefMaterial = tokenMaterial.clone();
    reliefMaterial.color.offsetHSL(0, 0, -.075);
    reliefMaterial.roughness = .38;
    const add = (geometry, material, position, rotation = [0, 0, 0]) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...position);
      mesh.rotation.set(...rotation);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
      return mesh;
    };

    // One-colour injection-moulded Monopoly-like token: short body, planted
    // base lip, thick double-pitched roof and broad overhang.
    add(new RoundedBoxGeometry(.84, .12, .68, 3, .045), tokenMaterial, [0, .06, 0]);
    add(new RoundedBoxGeometry(.70, .50, .56, 4, .048), tokenMaterial, [0, .34, 0]);
    const roofShape = new THREE.Shape();
    roofShape.moveTo(-.42, 0);
    roofShape.lineTo(.42, 0);
    roofShape.lineTo(0, .30);
    roofShape.closePath();
    add(new THREE.ExtrudeGeometry(roofShape, {
      depth: .68,
      bevelEnabled: true,
      bevelThickness: .025,
      bevelSize: .025,
      bevelSegments: 3,
      curveSegments: 2,
    }), tokenMaterial, [0, .57, -.34]);

    // Shallow same-hue relief catches the light without turning the token into
    // a detailed architectural miniature.
    add(new RoundedBoxGeometry(.18, .28, .035, 3, .025), reliefMaterial, [-.15, .28, .298]);
    add(new RoundedBoxGeometry(.18, .16, .035, 3, .025), reliefMaterial, [.17, .39, .298]);
    add(new THREE.BoxGeometry(.018, .14, .040), tokenMaterial, [.17, .39, .322]);
    add(new THREE.BoxGeometry(.16, .018, .040), tokenMaterial, [.17, .39, .322]);
    add(new RoundedBoxGeometry(.035, .16, .18, 2, .012), reliefMaterial, [.368, .38, 0]);
    return group;
  }

  createLandmark(color = 0xe0a63e) {
    const group = new THREE.Group();
    const stone = new THREE.MeshStandardMaterial({ color: 0xf0dec0, roughness: .62 });
    const accent = new THREE.MeshPhysicalMaterial({ color, roughness: .3, metalness: .35, clearcoat: .6 });
    const base = new THREE.Mesh(new THREE.CylinderGeometry(.58, .72, .28, 8), stone);
    base.position.y = .14;
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(.24, .38, 1.28, 8), stone);
    tower.position.y = .9;
    const roof1 = new THREE.Mesh(new THREE.ConeGeometry(.62, .38, 6), accent);
    roof1.position.y = 1.48;
    const roof2 = new THREE.Mesh(new THREE.ConeGeometry(.38, .3, 6), accent);
    roof2.position.y = 1.82;
    [base, tower, roof1, roof2].forEach((mesh) => { mesh.castShadow = true; });
    group.add(base, tower, roof1, roof2);
    return group;
  }

  syncProperties(tiles, players, animatedIndex = -1) {
    this.propertyGroup.clear();
    this.buildings = [];
    this.cells.forEach(({ top }) => {
      top.material.color.setHex(0xfff5df);
      top.material.emissive.setHex(0x000000);
      top.material.emissiveIntensity = 0;
    });
    tiles.forEach((tile, index) => {
      if (tile.type !== 'property' || !tile.owner) return;
      const cell = this.tilePosition(index);
      const owner = players.find((player) => player.id === tile.owner);
      const ownerColor = owner ? Number.parseInt(owner.color.slice(1), 16) : 0xffffff;
      const ownedTop = this.cells[index]?.top;
      if (ownedTop) {
        ownedTop.material.color.setHex(ownerColor).lerp(new THREE.Color(0xfff5df), .42);
        ownedTop.material.emissive.setHex(ownerColor);
        ownedTop.material.emissiveIntensity = .07;
      }
      if (tile.level <= 0) return;
      const group = new THREE.Group();
      group.position.copy(this.tileLocalPosition(index, 0, -.65, .54));
      group.rotation.y = this.tileRotation(index);
      if (tile.level < 4) {
        const positions = tile.level === 1 ? [0] : tile.level === 2 ? [-.43, .43] : [-.66, 0, .66];
        positions.forEach((x) => {
          const house = this.createHouse(ownerColor);
          house.position.x = x;
          house.scale.setScalar(tile.level === 3 ? .72 : .82);
          group.add(house);
        });
      } else {
        const landmark = this.createLandmark(REGION_COLORS[tile.region]);
        landmark.scale.setScalar(.82);
        group.add(landmark);
      }
      if (index === animatedIndex) {
        group.scale.setScalar(.01);
        this.animateValue(520, (progress) => group.scale.setScalar(.01 + progress * .99));
      }
      this.propertyGroup.add(group);
      this.buildings.push(group);
    });
  }

  setTravelMode(enabled, onSelect = null) {
    this.travelSelectHandler = enabled ? onSelect : null;
    this.travelDrag = null;
    this.container.classList.toggle('is-selecting', enabled);
    this.hoveredTravelIndex = -1;
    this.cells.forEach(({ band }) => {
      if (!band) return;
      band.material.emissiveIntensity = enabled ? .55 : .03;
    });
    this.renderer.domElement.style.cursor = enabled ? 'grab' : 'default';
  }

  intersectTravelTile(event) {
    if (!this.travelSelectHandler) return -1;
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hit = this.raycaster.intersectObjects(this.selectableMeshes, false)
      .find(({ object }) => this.tiles[object.userData.tileIndex]?.type === 'property');
    return hit ? hit.object.userData.tileIndex : -1;
  }

  setTravelHover(index) {
    if (this.hoveredTravelIndex === index) return;
    this.hoveredTravelIndex = index;
    this.cells.forEach(({ band }, tileIndex) => {
      if (!band) return;
      band.material.emissiveIntensity = tileIndex === index ? 1.25 : .55;
    });
    if (!this.travelDrag) this.renderer.domElement.style.cursor = index >= 0 ? 'pointer' : 'grab';
  }

  startTravelDrag(event) {
    if (!this.travelSelectHandler) return;
    this.travelDrag = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastY: event.clientY,
      distance: 0,
      startedAt: performance.now(),
    };
    this.renderer.domElement.setPointerCapture?.(event.pointerId);
    this.renderer.domElement.style.cursor = 'grabbing';
  }

  handleTravelPointer(event) {
    if (!this.travelSelectHandler) return;
    if (this.travelDrag && this.travelDrag.pointerId === event.pointerId) {
      const dx = event.clientX - this.travelDrag.lastX;
      const dy = event.clientY - this.travelDrag.lastY;
      this.travelDrag.lastX = event.clientX;
      this.travelDrag.lastY = event.clientY;
      this.travelDrag.distance += Math.hypot(dx, dy);
      if (this.travelDrag.distance > 4) {
        const scale = Math.max(0.015, this.cameraOffset.length() * .0016);
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion).setY(0).normalize();
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion).setY(0).normalize();
        this.desiredTarget.addScaledVector(right, -dx * scale);
        this.desiredTarget.addScaledVector(forward, dy * scale);
        this.desiredTarget.x = THREE.MathUtils.clamp(this.desiredTarget.x, -12.5, 12.5);
        this.desiredTarget.z = THREE.MathUtils.clamp(this.desiredTarget.z, -12.5, 12.5);
        this.setTravelHover(-1);
      }
      return;
    }
    this.setTravelHover(this.intersectTravelTile(event));
  }

  finishTravelDrag(event, cancelled = false) {
    if (!this.travelDrag || this.travelDrag.pointerId !== event.pointerId) return;
    const directDistance = Math.hypot(
      event.clientX - this.travelDrag.startX,
      event.clientY - this.travelDrag.startY,
    );
    const dragged = this.travelDrag.distance > 6
      || directDistance > 6
      || performance.now() - this.travelDrag.startedAt > 320;
    this.renderer.domElement.releasePointerCapture?.(event.pointerId);
    this.travelDrag = null;
    this.renderer.domElement.style.cursor = 'grab';
    if (cancelled || dragged) return;
    const index = this.intersectTravelTile(event);
    if (index >= 0) this.travelSelectHandler?.(index);
  }

  focusTile(index, { immediate = false } = {}) {
    const target = this.tilePosition(index);
    this.desiredTarget.copy(target);
    this.desiredOffset.copy(CLOSE_OFFSET);
    if (immediate) {
      this.cameraTarget.copy(target);
      this.cameraOffset.copy(CLOSE_OFFSET);
    }
  }

  showOverview() {
    this.desiredTarget.set(0, 0, 0);
    this.desiredOffset.copy(OVERVIEW_OFFSET);
  }

  setActive(active) {
    this.active = active;
    this.container.classList.toggle('is-active', active);
  }

  setProjectionListener(listener) {
    this.projectionListener = listener;
  }

  projectTiles() {
    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);
    return this.tiles.map((tile, index) => {
      const cell = this.tilePosition(index);
      const world = this.tileLocalPosition(index, 0, .34, .88);
      const projected = world.project(this.camera);
      const x = (projected.x * .5 + .5) * 450;
      const y = (-projected.y * .5 + .5) * 800;
      const distance = this.camera.position.distanceTo(world);
      return {
        x,
        y,
        scale: THREE.MathUtils.clamp(26 / distance, .5, 1.16),
        visible: projected.z > -1 && projected.z < 1 && x > -70 && x < 520 && y > 170 && y < 755,
        screenWidth: width,
        screenHeight: height,
      };
    });
  }

  resize() {
    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    if (!this.active) return;
    this.cameraTarget.lerp(this.desiredTarget, .105);
    this.cameraOffset.lerp(this.desiredOffset, .075);
    this.camera.position.copy(this.cameraTarget).add(this.cameraOffset);
    this.camera.lookAt(this.cameraTarget.x, .1, this.cameraTarget.z);
    this.renderer.render(this.scene, this.camera);
    this.projectionListener?.(this.projectTiles());
  }
}
