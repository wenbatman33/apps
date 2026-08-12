import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const FACE_NORMALS = [
  { value: 1, normal: new CANNON.Vec3(0, 1, 0) },
  { value: 6, normal: new CANNON.Vec3(0, -1, 0) },
  { value: 2, normal: new CANNON.Vec3(1, 0, 0) },
  { value: 5, normal: new CANNON.Vec3(-1, 0, 0) },
  { value: 3, normal: new CANNON.Vec3(0, 0, 1) },
  { value: 4, normal: new CANNON.Vec3(0, 0, -1) },
];

const PIPS = {
  1: [[0, 0]],
  2: [[-.28, -.28], [.28, .28]],
  3: [[-.28, -.28], [0, 0], [.28, .28]],
  4: [[-.28, -.28], [.28, -.28], [-.28, .28], [.28, .28]],
  5: [[-.28, -.28], [.28, -.28], [0, 0], [-.28, .28], [.28, .28]],
  6: [[-.28, -.32], [-.28, 0], [-.28, .32], [.28, -.32], [.28, 0], [.28, .32]],
};

export class Dice3D {
  constructor(container) {
    this.container = container;
    this.rolling = false;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(35, 1, .1, 100);
    this.camera.position.set(0, 6.6, 9.4);
    this.camera.lookAt(0, .45, 0);

    this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.18;
    this.container.replaceChildren(this.renderer.domElement);

    this.scene.add(new THREE.HemisphereLight(0xdff4ff, 0x20356c, 2.15));
    const key = new THREE.DirectionalLight(0xffffff, 3.4);
    key.position.set(-3, 7, 5);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.near = .1;
    key.shadow.camera.far = 20;
    this.scene.add(key);
    const rim = new THREE.PointLight(0x53dfff, 12, 10);
    rim.position.set(4, 3, -2);
    this.scene.add(rim);

    const shadowPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(6, 4.2),
      new THREE.ShadowMaterial({ color: 0x07183e, opacity: .36 }),
    );
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = -1.18;
    shadowPlane.receiveShadow = true;
    this.scene.add(shadowPlane);

    this.world = new CANNON.World({ gravity: new CANNON.Vec3(0, -18.5, 0), allowSleep: true });
    this.world.solver.iterations = 18;
    this.world.broadphase = new CANNON.SAPBroadphase(this.world);
    const diceMaterial = new CANNON.Material('dice');
    const arenaMaterial = new CANNON.Material('arena');
    this.world.addContactMaterial(new CANNON.ContactMaterial(diceMaterial, arenaMaterial, {
      friction: .32,
      restitution: .48,
    }));
    this.world.addContactMaterial(new CANNON.ContactMaterial(diceMaterial, diceMaterial, {
      friction: .22,
      restitution: .42,
    }));

    this.addArena(arenaMaterial);
    this.dice = [this.createDie(diceMaterial), this.createDie(diceMaterial)];
    this.dice[0].body.position.set(-.82, -.48, 0);
    this.dice[1].body.position.set(.82, -.48, 0);
    this.dice[0].body.quaternion.setFromEuler(.1, .3, -.15);
    this.dice[1].body.quaternion.setFromEuler(-.2, -.45, .08);
    this.syncMeshes();

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.container);
    this.resize();
  }

  addArena(material) {
    const floor = new CANNON.Body({ mass: 0, material, shape: new CANNON.Plane() });
    floor.position.y = -1.18;
    floor.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    this.world.addBody(floor);

    const addWall = (position, halfExtents) => {
      const wall = new CANNON.Body({ mass: 0, material, shape: new CANNON.Box(halfExtents) });
      wall.position.copy(position);
      this.world.addBody(wall);
    };
    addWall(new CANNON.Vec3(-2.65, .4, 0), new CANNON.Vec3(.15, 2, 1.9));
    addWall(new CANNON.Vec3(2.65, .4, 0), new CANNON.Vec3(.15, 2, 1.9));
    addWall(new CANNON.Vec3(0, .4, -1.75), new CANNON.Vec3(2.7, 2, .15));
    addWall(new CANNON.Vec3(0, .4, 1.75), new CANNON.Vec3(2.7, 2, .15));
  }

  createDie(material) {
    const group = new THREE.Group();
    const shell = new THREE.Mesh(
      new RoundedBoxGeometry(1.22, 1.22, 1.22, 7, .16),
      new THREE.MeshPhysicalMaterial({
        color: 0xf7fbff,
        roughness: .22,
        metalness: .04,
        clearcoat: 1,
        clearcoatRoughness: .1,
      }),
    );
    shell.castShadow = true;
    shell.receiveShadow = true;
    group.add(shell);

    const pipGeometry = new THREE.SphereGeometry(.083, 18, 12);
    const pipMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x1d63d7,
      roughness: .16,
      metalness: .2,
      clearcoat: .8,
    });
    FACE_NORMALS.forEach(({ value, normal }) => {
      PIPS[value].forEach(([a, b]) => {
        const pip = new THREE.Mesh(pipGeometry, pipMaterial);
        const edge = .607;
        if (normal.y !== 0) pip.position.set(a, edge * normal.y, b * normal.y);
        if (normal.x !== 0) pip.position.set(edge * normal.x, b, a * -normal.x);
        if (normal.z !== 0) pip.position.set(a * normal.z, b, edge * normal.z);
        pip.scale.set(1, .52, 1);
        if (normal.x !== 0) pip.rotation.z = Math.PI / 2;
        if (normal.z !== 0) pip.rotation.x = Math.PI / 2;
        group.add(pip);
      });
    });
    this.scene.add(group);

    const body = new CANNON.Body({
      mass: 1,
      material,
      shape: new CANNON.Box(new CANNON.Vec3(.585, .585, .585)),
      linearDamping: .16,
      angularDamping: .18,
      allowSleep: true,
      sleepSpeedLimit: .13,
      sleepTimeLimit: .42,
    });
    this.world.addBody(body);
    return { mesh: group, body };
  }

  resize() {
    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.render();
  }

  syncMeshes() {
    this.dice.forEach(({ mesh, body }) => {
      mesh.position.copy(body.position);
      mesh.quaternion.copy(body.quaternion);
    });
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  async roll(forcedValues = null) {
    if (this.rolling) return null;
    this.rolling = true;
    this.container.classList.add('is-rolling');
    this.dice.forEach(({ body }, index) => {
      body.wakeUp();
      body.position.set(index ? .88 : -.88, 3.05 + index * .45, (Math.random() - .5) * .55);
      body.velocity.set((index ? -1 : 1) * (1.35 + Math.random() * .75), -1.15, (Math.random() - .5) * 1.8);
      body.angularVelocity.set(
        (8 + Math.random() * 7) * (index ? -1 : 1),
        10 + Math.random() * 8,
        (9 + Math.random() * 8) * (index ? 1 : -1),
      );
      body.quaternion.setFromEuler(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      body.force.setZero();
      body.torque.setZero();
    });

    if (navigator.vibrate) navigator.vibrate([22, 32, 22, 45, 28]);
    const started = performance.now();
    let previous = started;
    let quietFrames = 0;

    await new Promise((resolve) => {
      const frame = (now) => {
        const delta = Math.min((now - previous) / 1000, .05);
        previous = now;
        this.world.step(1 / 60, delta, 4);
        this.syncMeshes();
        this.render();

        const quiet = this.dice.every(({ body }) => body.velocity.lengthSquared() < .035 && body.angularVelocity.lengthSquared() < .055);
        quietFrames = quiet ? quietFrames + 1 : 0;
        if ((now - started > 1050 && quietFrames > 16) || now - started > 3200) {
          this.dice.forEach(({ body }) => {
            body.velocity.setZero();
            body.angularVelocity.setZero();
            body.sleep();
          });
          this.syncMeshes();
          this.render();
          resolve();
          return;
        }
        requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    });

    const landedValues = forcedValues ?? this.dice.map(({ body }) => this.topFace(body));
    await this.settleToValues(landedValues);
    const values = this.dice.map(({ body }) => this.topFace(body));
    this.rolling = false;
    this.container.classList.remove('is-rolling');
    return values;
  }

  targetQuaternion(value) {
    const quaternion = new CANNON.Quaternion();
    if (value === 1) quaternion.setFromEuler(0, 0, 0);
    if (value === 6) quaternion.setFromEuler(Math.PI, 0, 0);
    if (value === 2) quaternion.setFromEuler(0, 0, Math.PI / 2);
    if (value === 5) quaternion.setFromEuler(0, 0, -Math.PI / 2);
    if (value === 3) quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    if (value === 4) quaternion.setFromEuler(Math.PI / 2, 0, 0);
    return quaternion;
  }

  settleToValues(values) {
    const starts = this.dice.map(({ body }) => body.quaternion.clone());
    const startPositions = this.dice.map(({ body }) => body.position.clone());
    const targets = values.map((value) => this.targetQuaternion(value));
    const targetPositions = [
      new CANNON.Vec3(-.88, -.585, 0),
      new CANNON.Vec3(.88, -.585, 0),
    ];
    const started = performance.now();
    return new Promise((resolve) => {
      const frame = (now) => {
        const progress = Math.min(1, (now - started) / 460);
        const eased = 1 - (1 - progress) ** 3;
        this.dice.forEach(({ body }, index) => {
          starts[index].slerp(targets[index], eased, body.quaternion);
          body.position.set(
            startPositions[index].x + (targetPositions[index].x - startPositions[index].x) * eased,
            startPositions[index].y + (targetPositions[index].y - startPositions[index].y) * eased,
            startPositions[index].z + (targetPositions[index].z - startPositions[index].z) * eased,
          );
        });
        this.syncMeshes();
        this.render();
        if (progress < 1) requestAnimationFrame(frame);
        else {
          this.dice.forEach(({ body }) => {
            body.velocity.setZero();
            body.angularVelocity.setZero();
            body.sleep();
          });
          resolve();
        }
      };
      requestAnimationFrame(frame);
    });
  }

  topFace(body) {
    let best = FACE_NORMALS[0];
    let bestY = -Infinity;
    FACE_NORMALS.forEach((face) => {
      const worldNormal = new CANNON.Vec3();
      body.quaternion.vmult(face.normal, worldNormal);
      if (worldNormal.y > bestY) {
        bestY = worldNormal.y;
        best = face;
      }
    });
    return best.value;
  }
}
