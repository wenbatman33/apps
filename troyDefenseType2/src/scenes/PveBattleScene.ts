import Phaser from "phaser";
import { CAMPAIGN_YEARS, HERO, UNIT_ORDER, UNITS, UnitType } from "../game/content";
import { bodyStyle, buttonLabelStyle, FONT, titleStyle } from "../ui/theme";
import type { BattleResult } from "./ResultScene";

type BattleState = "playing" | "won" | "lost";
type BattlePhase = "prep" | "wave" | "boss" | "transition";
type EnemyKind = "raider" | "shield" | "boss";
type EnemyVisual = "raider" | "shield" | "achilles" | "horse";
type EnemyRoute = "left" | "right";

interface BoardUnit {
  id: number;
  type: UnitType;
  rank: number;
  slot: number;
  ring: Phaser.GameObjects.Image;
  sprite: Phaser.GameObjects.Sprite;
  rankBadge: Phaser.GameObjects.Image;
  rankText: Phaser.GameObjects.Text;
  nextAttackAt: number;
  wasDragged: boolean;
  dragging: boolean;
}

interface Enemy {
  id: number;
  kind: EnemyKind;
  visual: EnemyVisual;
  sprite: Phaser.GameObjects.Sprite;
  hpText: Phaser.GameObjects.Text;
  hp: number;
  maxHp: number;
  speed: number;
  progress: number;
  route: EnemyRoute;
  laneOffset: number;
  alive: boolean;
  slowUntil: number;
}

interface DamageFeedback {
  critical?: boolean;
  color?: string;
  small?: boolean;
}

interface HeroAssault {
  sprite: Phaser.GameObjects.Sprite;
  progress: number;
  route: EnemyRoute;
  persistent: boolean;
  returning: boolean;
  strikeTimer: Phaser.Time.TimerEvent;
}

const BOARD_X = [252, 348, 442];
const BOARD_Y = [419, 497, 579, 665, 758];
const BOARD_COLUMNS = 3;
const BOARD_SLOT_COUNT = 15;
const UNIT_RANK_X_OFFSET = 30;
const UNIT_RANK_Y_OFFSET = -35;
const MAX_WAVES = 3;
const MAX_ACTIVE_REGULAR_ENEMIES = 48;
const SQUAD_LANE_OFFSETS = [-26, 0, 26, -13, 13, -34, 34];
const HECTOR_RUN_FRAME_OFFSETS = [
  { x: 0, y: 0 },
  { x: 31, y: 0 },
  { x: 9, y: 44 },
  { x: 34, y: 41 },
];
const HECTOR_STRIKE_FRAME_OFFSETS = [
  { x: 0, y: 0 },
  { x: 11, y: 0 },
  { x: -25, y: 32 },
  { x: 15, y: 19 },
];
const UNIT_FRAME_OFFSETS: Record<UnitType, ReadonlyArray<Readonly<{ x: number; y: number }>>> = {
  archer: [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 5, y: 5 },
    { x: 9, y: 5 },
  ],
  guard: [
    { x: -5, y: -2 },
    { x: 2, y: -3 },
    { x: -8, y: 6 },
    { x: 1, y: 6 },
  ],
  priest: [
    { x: -10, y: 10 },
    { x: 8, y: 10 },
    { x: -11, y: 17 },
    { x: 6, y: 15 },
  ],
  hunter: [
    { x: -12, y: -4 },
    { x: 0, y: -4 },
    { x: -14, y: 4 },
    { x: -1, y: 3 },
  ],
  engineer: [
    { x: -10, y: -1 },
    { x: 0, y: -1 },
    { x: -10, y: 5 },
    { x: 4, y: 5 },
  ],
};
const UNIT_BASE_Y_OFFSET: Record<UnitType, number> = {
  archer: -45,
  guard: -32,
  priest: -32,
  hunter: -32,
  engineer: -32,
};
const PATHS: Record<EnemyRoute, Phaser.Math.Vector2[]> = {
  left: [
    new Phaser.Math.Vector2(190, 205),
    new Phaser.Math.Vector2(190, 255),
    new Phaser.Math.Vector2(170, 315),
    new Phaser.Math.Vector2(135, 360),
    new Phaser.Math.Vector2(122, 430),
    new Phaser.Math.Vector2(122, 610),
    new Phaser.Math.Vector2(124, 780),
    new Phaser.Math.Vector2(145, 840),
    new Phaser.Math.Vector2(190, 875),
    new Phaser.Math.Vector2(260, 900),
    new Phaser.Math.Vector2(320, 930),
    new Phaser.Math.Vector2(350, 970),
    new Phaser.Math.Vector2(350, 1010),
  ],
  right: [
    new Phaser.Math.Vector2(530, 205),
    new Phaser.Math.Vector2(530, 255),
    new Phaser.Math.Vector2(550, 315),
    new Phaser.Math.Vector2(585, 360),
    new Phaser.Math.Vector2(570, 430),
    new Phaser.Math.Vector2(570, 610),
    new Phaser.Math.Vector2(568, 780),
    new Phaser.Math.Vector2(555, 840),
    new Phaser.Math.Vector2(530, 875),
    new Phaser.Math.Vector2(460, 900),
    new Phaser.Math.Vector2(400, 930),
    new Phaser.Math.Vector2(350, 970),
    new Phaser.Math.Vector2(350, 1010),
  ],
};
const PATH_SEGMENTS: Record<EnemyRoute, number[]> = {
  left: PATHS.left.slice(0, -1).map((point, index) => point.distance(PATHS.left[index + 1])),
  right: PATHS.right.slice(0, -1).map((point, index) => point.distance(PATHS.right[index + 1])),
};
const PATH_LENGTHS: Record<EnemyRoute, number> = {
  left: PATH_SEGMENTS.left.reduce((sum, length) => sum + length, 0),
  right: PATH_SEGMENTS.right.reduce((sum, length) => sum + length, 0),
};

export class PveBattleScene extends Phaser.Scene {
  private year = 1;
  private state: BattleState = "playing";
  private phase: BattlePhase = "prep";
  private phaseSeconds = 8;
  private wave = 1;
  private lives = 3;
  private mana = 200;
  private summonCost = 10;
  private summonCount = 0;
  private score = 0;
  private heroEnergy = 0;
  private elapsedSeconds = 0;
  private kills = 0;
  private merges = 0;
  private heroUses = 0;
  private bossSpawned = false;
  private nextUnitId = 1;
  private nextEnemyId = 1;
  private guaranteedPairType: UnitType = "archer";
  private selectedUnit?: BoardUnit;
  private units: BoardUnit[] = [];
  private enemies: Enemy[] = [];
  private heroAssault?: HeroAssault;

  private secondTimer?: Phaser.Time.TimerEvent;
  private spawnTimer?: Phaser.Time.TimerEvent;
  private scoreText!: Phaser.GameObjects.Text;
  private waveText!: Phaser.GameObjects.Text;
  private phaseText!: Phaser.GameObjects.Text;
  private livesText!: Phaser.GameObjects.Text;
  private manaText!: Phaser.GameObjects.Text;
  private summonText!: Phaser.GameObjects.Text;
  private heroGuardian!: Phaser.GameObjects.Image;
  private heroChargeText!: Phaser.GameObjects.Text;
  private calloutText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;

  constructor() {
    super("pve-battle");
  }

  init(data: { year?: number }): void {
    this.year = Phaser.Math.Clamp(data.year ?? 1, 1, 10);
    this.state = "playing";
    this.phase = "prep";
    this.phaseSeconds = 8;
    this.wave = 1;
    this.lives = 3;
    this.mana = 200;
    this.summonCost = 10;
    this.summonCount = 0;
    this.score = 0;
    this.heroEnergy = 0;
    this.elapsedSeconds = 0;
    this.kills = 0;
    this.merges = 0;
    this.heroUses = 0;
    this.bossSpawned = false;
    this.nextUnitId = 1;
    this.nextEnemyId = 1;
    this.guaranteedPairType = UNIT_ORDER[(this.year - 1) % UNIT_ORDER.length];
    this.selectedUnit = undefined;
    this.units = [];
    this.enemies = [];
    this.heroAssault = undefined;
  }

  create(): void {
    this.input.dragDistanceThreshold = 8;
    this.add.image(360, 640, "battle-clean").setDisplaySize(720, 1280).setDepth(0);
    this.createHud();
    this.createControls();
    this.bindDragging();
    this.startRun();
    if (this.year >= 6) {
      this.time.delayedCall(500, () => this.deployPersistentHector());
    }
  }

  update(time: number, delta: number): void {
    if (this.state !== "playing") return;
    this.updateEnemies(time, delta);
    this.updateUnits(time);
    this.checkPhaseProgress();
  }

  private createHud(): void {
    const stage = CAMPAIGN_YEARS[this.year - 1];
    this.scoreText = this.add.text(14, 15, "分數 0", bodyStyle(21, "#fff5c9")).setDepth(80).setStroke("#4b251a", 5);
    this.waveText = this.add
      .text(360, 15, `關卡${this.year}・1/${MAX_WAVES}`, bodyStyle(21, "#fff2c2"))
      .setOrigin(0.5, 0)
      .setDepth(80)
      .setStroke("#20344b", 5);
    this.phaseText = this.add
      .text(360, 50, "備戰 00:08", bodyStyle(18, "#dff7ff"))
      .setOrigin(0.5, 0)
      .setDepth(80)
      .setStroke("#20344b", 5);
    this.livesText = this.add
      .text(512, 70, "♥    ♥    ♥", bodyStyle(27, "#ff5c67"))
      .setOrigin(0, 0.5)
      .setDepth(80)
      .setStroke("#4b251a", 5);
    this.calloutText = this.add
      .text(360, 128, `${stage.title}・8 秒後開戰`, titleStyle(19))
      .setOrigin(0.5)
      .setWordWrapWidth(620)
      .setDepth(85)
      .setStroke("#512418", 4);
    this.hintText = this.add
      .text(360, 1072, "敵軍左右分流・近戰部署在兩側路旁", bodyStyle(16, "#fff8cf"))
      .setOrigin(0.5)
      .setDepth(85)
      .setStroke("#512418", 4);
    this.manaText = this.add
      .text(82, 1160, "法力\n200", bodyStyle(22, "#d9f7ff"))
      .setOrigin(0.5)
      .setDepth(85)
      .setStroke("#3f211b", 5);
  }

  private createControls(): void {
    this.add
      .image(360, 1160, "gold-action-button")
      .setDisplaySize(300, 92)
      .setDepth(70)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.summon());
    this.summonText = this.add
      .text(360, 1160, "召喚  10", buttonLabelStyle(28))
      .setOrigin(0.5)
      .setDepth(86);

    this.heroGuardian = this.add
      .image(644, 1065, HERO.texture)
      .setDisplaySize(102, 138)
      .setDepth(73)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.castHeroSkill());
    this.heroChargeText = this.add
      .text(640, 1138, "赫克托耳\n守護者・0%", bodyStyle(14, "#fff3b7"))
      .setOrigin(0.5)
      .setDepth(87)
      .setStroke("#3d2019", 5);
  }

  private startRun(): void {
    this.deployStartingGuardians();
    this.flashCallout("特洛伊守軍已就位・兩名同階守軍可直接合成");
    this.refreshHud();
    this.secondTimer = this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => this.tickSecond(),
    });
  }

  private deployStartingGuardians(): void {
    const starterSlots = [6, 8];
    starterSlots.forEach((slot) => {
      const unit = this.createUnit(this.guaranteedPairType, slot, 1);
      this.showImpact("bronze-impact", unit.sprite.x, unit.sprite.y, 90);
    });
    this.summonCount = 2;
    this.updateHint();
  }

  private tickSecond(): void {
    if (this.state !== "playing") return;
    this.elapsedSeconds += 1;
    if (this.phaseSeconds > 0) this.phaseSeconds -= 1;

    if (this.phaseSeconds <= 0) {
      if (this.phase === "prep") this.startWave();
      else if (this.phase === "wave") this.finishWaveSpawning();
      else if (this.phase === "transition") {
        this.wave += 1;
        this.beginPrep(4);
      }
    }
    this.refreshHud();
  }

  private beginPrep(seconds: number): void {
    this.phase = "prep";
    this.phaseSeconds = seconds;
    this.bossSpawned = false;
    this.flashCallout(`第 ${this.wave} 波即將開始・整理盤面`);
    this.updateHint();
  }

  private startWave(): void {
    this.phase = "wave";
    this.phaseSeconds = 20 + this.wave * 3;
    this.bossSpawned = false;
    this.flashCallout(`第 ${this.wave}/${MAX_WAVES} 波・希臘大軍成群湧入！`);
    this.spawnSquad();
    const delay = Math.max(720, 990 - this.wave * 70 - this.year * 8);
    this.spawnTimer?.remove(false);
    this.spawnTimer = this.time.addEvent({
      delay,
      loop: true,
      callback: () => {
        if (this.state !== "playing" || this.phase !== "wave") return;
        this.spawnSquad();
      },
    });
  }

  private spawnSquad(): void {
    const activeRegulars = this.enemies.filter((enemy) => enemy.alive && enemy.kind !== "boss").length;
    const capacity = MAX_ACTIVE_REGULAR_ENEMIES - activeRegulars;
    if (capacity <= 0) return;
    const squadSize = Math.min(3 + this.wave + Math.floor((this.year - 1) / 4), capacity);
    for (let index = 0; index < squadSize; index += 1) {
      this.time.delayedCall(index * 78, () => {
        if (this.state !== "playing" || this.phase !== "wave") return;
        const liveRegulars = this.enemies.filter((enemy) => enemy.alive && enemy.kind !== "boss").length;
        if (liveRegulars >= MAX_ACTIVE_REGULAR_ENEMIES) return;
        const laneOffset = SQUAD_LANE_OFFSETS[index % SQUAD_LANE_OFFSETS.length] + Phaser.Math.Between(-3, 3);
        const route: EnemyRoute = (this.nextEnemyId + this.wave) % 2 === 0 ? "left" : "right";
        this.spawnEnemy(this.pickRegularEnemy(), laneOffset, route);
      });
    }
  }

  private finishWaveSpawning(): void {
    this.phase = "boss";
    this.phaseSeconds = 0;
    this.spawnTimer?.remove(false);
    this.spawnTimer = undefined;
    this.flashCallout("首領逼近！先清除路上的殘軍");
  }

  private pickRegularEnemy(): EnemyKind {
    const shieldChance = 0.16 + this.wave * 0.08 + this.year * 0.012;
    return Math.random() < shieldChance ? "shield" : "raider";
  }

  private spawnEnemy(kind: EnemyKind, laneOffset = 0, requestedRoute?: EnemyRoute): void {
    const difficulty = 1 + (this.year - 1) * 0.16;
    const waveScale = 1 + (this.wave - 1) * 0.42;
    const boss = kind === "boss";
    const shield = kind === "shield";
    const visual: EnemyVisual = boss ? (this.year === 10 ? "horse" : this.year >= 8 ? "achilles" : "shield") : shield ? "shield" : "raider";
    const texture = visual === "horse" ? "boss-horse" : visual === "achilles" ? "boss-achilles" : visual === "shield" ? "enemy-shield" : "enemy-raider";
    const animation = visual === "horse" ? "roll-horse" : visual === "achilles" ? "run-achilles" : visual === "shield" ? "march-shield" : "walk-raider";
    const deployedRanks = this.units.reduce((sum, unit) => sum + unit.rank, 0);
    const regularDefenseScale =
      1 + Math.max(0, this.units.length - 2) * 0.07 + Math.max(0, deployedRanks - this.units.length) * 0.1;
    const bossDefenseScale =
      1 + Math.max(0, this.units.length - 2) * 0.16 + Math.max(0, deployedRanks - this.units.length) * 0.22;
    const maxHp = Math.round(
      (boss ? 1100 * bossDefenseScale : (shield ? 100 : 40) * regularDefenseScale) * difficulty * waveScale,
    );
    const size = boss ? (this.year === 10 ? 150 : 122) : shield ? 82 : 72;
    const route = requestedRoute ?? (this.wave % 2 === 1 ? "left" : "right");
    const spawnPoint = this.pointOnPath(route, 0, boss ? 0 : laneOffset);
    const sprite = this.add.sprite(spawnPoint.x, spawnPoint.y, texture, 0).setDisplaySize(size, size).setDepth(25);
    sprite.play(animation);
    const stage = CAMPAIGN_YEARS[this.year - 1];
    const hpText = this.add
      .text(
        spawnPoint.x,
        spawnPoint.y + (boss ? 70 : 38),
        boss ? `${stage.boss} ${maxHp}` : `${maxHp}`,
        bodyStyle(boss ? 17 : 12, boss || shield ? "#ffdf7d" : "#bdeaff"),
      )
      .setOrigin(0.5)
      .setStroke("#3b1a1a", 5)
      .setDepth(29)
      .setAlpha(boss || shield ? 1 : 0);

    this.enemies.push({
      id: this.nextEnemyId++,
      kind,
      visual,
      sprite,
      hpText,
      hp: maxHp,
      maxHp,
      speed: (boss ? 44 : shield ? 58 : 80) * Math.min(1.24, 1 + (this.year - 1) * 0.026),
      progress: 0,
      route,
      laneOffset: boss ? 0 : laneOffset,
      alive: true,
      slowUntil: 0,
    });

    if (boss) {
      this.bossSpawned = true;
      this.cameras.main.shake(380, 0.01);
      this.flashCallout(`首領：${stage.boss}・擊敗他才能進入下一波`);
    }
    this.refreshHud();
  }

  private updateEnemies(time: number, delta: number): void {
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      const slowFactor = time < enemy.slowUntil ? 0.58 : 1;
      enemy.sprite.anims.timeScale = slowFactor;
      enemy.progress += (enemy.speed * slowFactor * (delta / 1000)) / PATH_LENGTHS[enemy.route];
      if (enemy.progress >= 1) {
        this.breach(enemy);
        continue;
      }
      const previousX = enemy.sprite.x;
      const point = this.pointOnPath(enemy.route, enemy.progress, enemy.laneOffset);
      enemy.sprite.setPosition(point.x, point.y).setDepth(24 + point.y / 1000);
      if (Math.abs(point.x - previousX) > 0.3) enemy.sprite.setFlipX(point.x < previousX);
      enemy.hpText.setPosition(point.x, point.y + (enemy.kind === "boss" ? 70 : 38));
    }
  }

  private pointOnPath(route: EnemyRoute, progress: number, laneOffset = 0): Phaser.Math.Vector2 {
    const path = PATHS[route];
    const segments = PATH_SEGMENTS[route];
    let distance = Phaser.Math.Clamp(progress, 0, 1) * PATH_LENGTHS[route];
    for (let index = 0; index < segments.length; index += 1) {
      const segment = segments[index];
      if (distance <= segment) {
        const start = path[index];
        const end = path[index + 1];
        const point = start.clone().lerp(end, distance / segment);
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        point.x += (-dy / segment) * laneOffset;
        point.y += (dx / segment) * laneOffset;
        return point;
      }
      distance -= segment;
    }
    return path[path.length - 1].clone();
  }

  private breach(enemy: Enemy): void {
    if (!enemy.alive) return;
    enemy.alive = false;
    const lostLives = enemy.kind === "boss" ? 2 : 1;
    this.lives = Math.max(0, this.lives - lostLives);
    this.showDamageNumber(enemy.sprite.x, enemy.sprite.y - 34, lostLives, { color: "#ff6874" });
    this.showImpact(
      "bronze-impact",
      PATHS[enemy.route][PATHS[enemy.route].length - 1].x,
      PATHS[enemy.route][PATHS[enemy.route].length - 1].y,
      enemy.kind === "boss" ? 160 : 104,
    );
    this.destroyEnemyObjects(enemy);
    this.cameras.main.shake(enemy.kind === "boss" ? 520 : 260, enemy.kind === "boss" ? 0.016 : 0.007);
    this.flashCallout(`敵軍突破！失去 ${lostLives} 顆生命`);
    this.refreshHud();
    if (this.lives <= 0) this.finishBattle(false);
  }

  private updateUnits(time: number): void {
    const targets = this.enemies.filter((enemy) => enemy.alive).sort((a, b) => b.progress - a.progress);
    if (targets.length === 0) return;
    const momentum = this.combatMomentum();
    for (const unit of this.units) {
      const config = UNITS[unit.type];
      const targetsInRange = targets.filter(
        (enemy) => Phaser.Math.Distance.Between(unit.sprite.x, unit.sprite.y, enemy.sprite.x, enemy.sprite.y) <= config.attackRange,
      );
      if (targetsInRange.length === 0) continue;
      const targetWindow = Math.min(targetsInRange.length, Math.max(1, Math.ceil(targetsInRange.length / 6)));
      const target = targetsInRange[(unit.id - 1) % targetWindow];
      if (!target?.alive) continue;
      this.faceUnitAt(unit, target);
      if (time < unit.nextAttackAt) continue;
      const attackSpeed = (1 + (unit.rank - 1) * 0.24) * momentum.attackSpeed;
      unit.nextAttackAt = time + config.attackDelay / attackSpeed;
      let damage = config.baseDamage * (1 + (unit.rank - 1) * 0.76) * momentum.damage;
      const critical = unit.type === "archer" && Math.random() < 0.16 + unit.rank * 0.04;
      if (critical) damage *= 2;
      if (unit.type === "guard" && target.kind !== "raider") damage *= 1.5;
      this.fireProjectile(unit, target, damage, critical);
    }
  }

  private combatMomentum(): { damage: number; attackSpeed: number; percent: number } {
    const aliveEnemies = this.enemies.filter((enemy) => enemy.alive).length;
    const density = Math.max(0, aliveEnemies - 6);
    const damage = 1 + Math.min(1.15, density * 0.028) + Math.min(0.45, this.merges * 0.08);
    const attackSpeed = 1 + Math.min(0.65, density * 0.016) + Math.min(0.25, this.merges * 0.04);
    return { damage, attackSpeed, percent: Math.round(damage * attackSpeed * 100) };
  }

  private fireProjectile(unit: BoardUnit, target: Enemy, damage: number, critical: boolean): void {
    this.playAttackAnimation(unit, target);
    const releaseDelay = unit.type === "engineer" ? 205 : 165;
    this.time.delayedCall(releaseDelay, () => {
      if (this.state !== "playing" || !unit.sprite.active || !target.alive) return;
      this.launchProjectile(unit, target, damage, critical);
    });
  }

  private launchProjectile(unit: BoardUnit, target: Enemy, damage: number, critical: boolean): void {
    const config = UNITS[unit.type];
    const projectileWidth = unit.type === "engineer" ? 54 : unit.type === "priest" ? 40 : 34;
    const projectileHeight = unit.type === "engineer" ? 54 : unit.type === "priest" ? 60 : 80;
    const projectile = this.add
      .image(unit.sprite.x, unit.sprite.y - 35, config.projectile)
      .setDisplaySize(projectileWidth, projectileHeight)
      .setDepth(60);
    const startX = projectile.x;
    const startY = projectile.y;
    const flight = { t: 0 };
    const duration = unit.type === "engineer" ? 520 : unit.type === "priest" ? 420 : 350;
    const trail = this.time.addEvent({
      delay: 48,
      loop: true,
      callback: () => {
        if (!projectile.active) return;
        const ghost = this.add
          .image(projectile.x, projectile.y, config.projectile)
          .setDisplaySize(projectileWidth * 0.72, projectileHeight * 0.72)
          .setAngle(projectile.angle)
          .setAlpha(0.68)
          .setDepth(56);
        this.tweens.add({
          targets: ghost,
          alpha: 0,
          scaleX: ghost.scaleX * 0.48,
          scaleY: ghost.scaleY * 0.48,
          duration: 300,
          onComplete: () => ghost.destroy(),
        });
      },
    });

    this.tweens.add({
      targets: flight,
      t: 1,
      duration,
      ease: "Sine.easeIn",
      onUpdate: () => {
        if (!projectile.active) return;
        const endX = target.alive ? target.sprite.x : projectile.x;
        const endY = target.alive ? target.sprite.y : projectile.y;
        const oldX = projectile.x;
        const oldY = projectile.y;
        const lift = unit.type === "engineer" ? 94 : unit.type === "priest" ? 56 : 32;
        projectile.setPosition(
          Phaser.Math.Linear(startX, endX, flight.t),
          Phaser.Math.Linear(startY, endY, flight.t) - Math.sin(Math.PI * flight.t) * lift,
        );
        projectile.setAngle(Phaser.Math.RadToDeg(Math.atan2(projectile.y - oldY, projectile.x - oldX)) + 90);
      },
      onComplete: () => {
        trail.remove(false);
        projectile.destroy();
        if (!target.alive || this.state !== "playing") return;
        const impactX = target.sprite.x;
        const impactY = target.sprite.y;
        this.showImpact(config.impact, impactX, impactY, unit.type === "engineer" ? 112 : 84);
        const feedback: DamageFeedback = {
          critical,
          color: critical ? "#fff06b" : unit.type === "priest" ? "#e3a5ff" : unit.type === "hunter" ? "#baff7b" : "#ffffff",
        };
        if (unit.type === "hunter") {
          target.slowUntil = this.time.now + 1750 + unit.rank * 250;
        }
        if (unit.type === "guard" && target.kind !== "raider") {
          target.progress = Math.max(0, target.progress - 0.018 * unit.rank);
        }
        this.damageEnemy(target, damage, feedback);
        if (unit.type === "engineer") this.applySplash(target, impactX, impactY, damage * 0.58);
      },
    });
  }

  private faceUnitAt(unit: BoardUnit, target: Enemy): void {
    unit.sprite.setFlipX(target.sprite.x < unit.sprite.x);
    this.applyUnitFrameOffset(unit, Number(unit.sprite.frame.name));
  }

  private playAttackAnimation(unit: BoardUnit, target: Enemy): void {
    if (unit.dragging) return;
    this.faceUnitAt(unit, target);
    unit.sprite.play(`attack-${unit.type}`, true);
    unit.sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      if (unit.sprite.active && !unit.dragging) {
        unit.sprite.setFrame(0);
        this.applyUnitFrameOffset(unit, 0);
      }
    });
  }

  private applySplash(primary: Enemy, x: number, y: number, damage: number): void {
    for (const enemy of this.enemies) {
      if (!enemy.alive || enemy.id === primary.id) continue;
      if (Phaser.Math.Distance.Between(x, y, enemy.sprite.x, enemy.sprite.y) <= 142) {
        this.showImpact("bronze-impact", enemy.sprite.x, enemy.sprite.y, 66);
        this.damageEnemy(enemy, damage, { color: "#ffb764", small: true });
      }
    }
  }

  private showImpact(texture: string, x: number, y: number, size: number): void {
    const impact = this.add.image(x, y, texture).setDisplaySize(size, size).setDepth(65).setAlpha(0.98);
    this.tweens.add({
      targets: impact,
      scaleX: impact.scaleX * 1.6,
      scaleY: impact.scaleY * 1.6,
      alpha: 0,
      duration: 290,
      onComplete: () => impact.destroy(),
    });
  }

  private showDamageNumber(x: number, y: number, damage: number, feedback: DamageFeedback = {}): void {
    const amount = Math.max(1, Math.round(damage));
    const fontSize = feedback.small ? 24 : feedback.critical ? 40 : 30;
    const label = this.add
      .text(x, y, `${amount}`, bodyStyle(fontSize, feedback.color ?? "#ffffff"))
      .setOrigin(0.5)
      .setStroke("#391717", feedback.critical ? 7 : 5)
      .setScale(feedback.critical ? 1.35 : 1.15)
      .setDepth(110);
    this.tweens.add({
      targets: label,
      y: y - (feedback.critical ? 66 : 50),
      scale: 1,
      alpha: 0,
      duration: feedback.critical ? 820 : 690,
      ease: "Cubic.easeOut",
      onComplete: () => label.destroy(),
    });
  }

  private damageEnemy(enemy: Enemy, damage: number, feedback: DamageFeedback = {}): void {
    if (!enemy.alive) return;
    this.showDamageNumber(enemy.sprite.x, enemy.sprite.y - (enemy.kind === "boss" ? 60 : 40), damage, feedback);
    enemy.hp -= damage;
    if (enemy.hp > 0) {
      const stage = CAMPAIGN_YEARS[this.year - 1];
      enemy.hpText
        .setText(enemy.kind === "boss" ? `${stage.boss} ${Math.ceil(enemy.hp)}` : `${Math.ceil(enemy.hp)}`)
        .setAlpha(1);
      this.tweens.killTweensOf(enemy.sprite);
      enemy.sprite.setAlpha(1).setTintFill(0xffffff);
      this.time.delayedCall(60, () => {
        if (enemy.alive && enemy.sprite.active) enemy.sprite.clearTint().setAlpha(1);
      });
      return;
    }

    enemy.alive = false;
    this.kills += 1;
    const reward = enemy.kind === "boss" ? 2600 * this.wave : enemy.kind === "shield" ? 80 : 40;
    const manaReward = enemy.kind === "boss" ? 70 : enemy.kind === "shield" ? 6 : 3;
    this.score += reward;
    this.mana = Math.min(999, this.mana + manaReward);
    this.heroEnergy = Math.min(100, this.heroEnergy + (enemy.kind === "boss" ? 40 : enemy.kind === "shield" ? 4 : 2));
    const gain = this.add
      .text(enemy.sprite.x, enemy.sprite.y + 24, `法力 +${manaReward}`, bodyStyle(18, "#79e9ff"))
      .setOrigin(0.5)
      .setStroke("#23304d", 5)
      .setDepth(111);
    this.tweens.add({ targets: gain, y: gain.y - 40, alpha: 0, duration: 720, onComplete: () => gain.destroy() });
    this.showImpact(enemy.kind === "boss" ? "oracle-impact" : "bronze-impact", enemy.sprite.x, enemy.sprite.y, enemy.kind === "boss" ? 180 : 104);
    this.destroyEnemyObjects(enemy);
    this.refreshHud();
  }

  private destroyEnemyObjects(enemy: Enemy): void {
    enemy.sprite.destroy();
    enemy.hpText.destroy();
  }

  private checkPhaseProgress(): void {
    if (this.phase !== "boss" || this.state !== "playing") return;
    const alive = this.enemies.some((enemy) => enemy.alive);
    if (!this.bossSpawned && !alive) {
      this.spawnEnemy("boss");
      return;
    }
    if (this.bossSpawned && !alive) this.completeBoss();
  }

  private completeBoss(): void {
    if (this.wave >= MAX_WAVES) {
      this.finishBattle(true);
      return;
    }
    this.phase = "transition";
    this.phaseSeconds = 4;
    this.mana = Math.min(999, this.mana + 70);
    this.flashCallout(`首領擊破！法力 +70・下一波將更強`);
    this.updateHint();
  }

  private summon(): void {
    if (this.state !== "playing") return;
    const slot = this.findRandomFreeSlot();
    if (slot < 0) {
      this.flashCallout("15 格已滿；尋找相同兵種與星階進行合成");
      return;
    }
    if (this.mana < this.summonCost) {
      this.flashCallout(`法力不足，還差 ${this.summonCost - this.mana}`);
      return;
    }

    this.mana -= this.summonCost;
    this.summonCost = Math.min(100, this.summonCost + 5);
    const type = this.summonCount < 2 ? this.guaranteedPairType : Phaser.Math.RND.pick(UNIT_ORDER);
    this.summonCount += 1;
    const unit = this.createUnit(type, slot, 1);
    this.showImpact(type === "priest" ? "oracle-impact" : "bronze-impact", unit.sprite.x, unit.sprite.y, 102);
    this.flashCallout(this.summonCount === 2 ? "可合成！橘色選取後，拖到綠色同類棋子" : `召喚：${UNITS[type].name}`);
    if (this.summonCount === 2) {
      const pair = this.units.filter((item) => item.type === type && item.rank === 1);
      if (pair.length >= 2) {
        this.selectedUnit = pair[0];
        this.highlightMergeTargets();
      }
    }
    this.updateHint();
    this.refreshHud();
  }

  private createUnit(type: UnitType, slot: number, rank: number): BoardUnit {
    const [x, y] = this.slotPosition(slot);
    const ring = this.add
      .image(x, y + 10, "unit-role-ring")
      .setDisplaySize(94, 94)
      .setTint(UNITS[type].ringTint)
      .setAlpha(0)
      .setDepth(34);
    const sprite = this.add
      .sprite(x, y, UNITS[type].texture)
      .setDisplaySize(104, 104)
      .setDepth(35)
      .setInteractive({ draggable: true, useHandCursor: true });
    const rankBadge = this.add
      .image(x + UNIT_RANK_X_OFFSET, y + UNIT_RANK_Y_OFFSET, "rank-badge")
      .setDisplaySize(34, 34)
      .setDepth(44);
    const rankText = this.add
      .text(x + UNIT_RANK_X_OFFSET, y + UNIT_RANK_Y_OFFSET, `${rank}`, {
        fontFamily: FONT,
        fontSize: "22px",
        fontStyle: "bold",
        color: "#ffffff",
        stroke: "#07162d",
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(45);
    const unit: BoardUnit = {
      id: this.nextUnitId++,
      type,
      rank,
      slot,
      ring,
      sprite,
      rankBadge,
      rankText,
      nextAttackAt: this.time.now + 280,
      wasDragged: false,
      dragging: false,
    };
    sprite.on(
      Phaser.Animations.Events.ANIMATION_UPDATE,
      (_animation: Phaser.Animations.Animation, frame: Phaser.Animations.AnimationFrame) => {
        if (!unit.dragging) this.applyUnitFrameOffset(unit, Number(frame.textureFrame));
      },
    );
    sprite.setData("boardUnit", unit);
    sprite.on("pointerdown", () => {
      unit.wasDragged = false;
    });
    sprite.on("pointerup", () => {
      if (!unit.wasDragged && this.units.includes(unit)) this.selectForMerge(unit);
    });
    this.units.push(unit);
    this.applyUnitFrameOffset(unit, 0);
    return unit;
  }

  private selectForMerge(unit: BoardUnit): void {
    if (this.state !== "playing") return;
    if (!this.selectedUnit) {
      this.selectedUnit = unit;
      this.highlightMergeTargets();
      this.updateHint();
      return;
    }
    if (this.selectedUnit.id === unit.id) {
      this.clearSelection();
      return;
    }
    if (this.canMerge(this.selectedUnit, unit)) {
      this.mergeUnits(this.selectedUnit, unit);
      return;
    }
    this.selectedUnit = unit;
    this.highlightMergeTargets();
    this.flashCallout("這兩個棋子不能合成；必須同兵種、同星階");
    this.updateHint();
  }

  private canMerge(a: BoardUnit, b: BoardUnit): boolean {
    return a.id !== b.id && a.type === b.type && a.rank === b.rank && a.rank < 5;
  }

  private mergeUnits(source: BoardUnit, target: BoardUnit): void {
    if (!this.canMerge(source, target)) return;
    const newRank = target.rank + 1;
    const resultType = target.type;
    const slot = target.slot;
    this.removeUnit(source);
    this.removeUnit(target);
    this.clearSelection();
    const result = this.createUnit(resultType, slot, newRank);
    result.sprite.setTint(0xffe56d);
    this.time.delayedCall(340, () => {
      if (result.sprite.active) result.sprite.clearTint();
    });
    this.merges += 1;
    this.score += 240 * newRank;
    this.heroEnergy = Math.min(100, this.heroEnergy + 18);
    this.showImpact(resultType === "priest" ? "oracle-impact" : "bronze-impact", result.sprite.x, result.sprite.y, 140);
    this.flashCallout(`升階成功：${UNITS[resultType].shortName} ${newRank} 階・兵種保持不變`);
    this.updateHint();
    this.refreshHud();
  }

  private removeUnit(unit: BoardUnit): void {
    this.units = this.units.filter((item) => item.id !== unit.id);
    unit.ring.destroy();
    unit.sprite.destroy();
    unit.rankBadge.destroy();
    unit.rankText.destroy();
  }

  private highlightMergeTargets(): void {
    for (const unit of this.units) {
      unit.sprite.clearTint();
      unit.ring.setTint(UNITS[unit.type].ringTint).setAlpha(0);
      if (!this.selectedUnit) continue;
      if (unit.id === this.selectedUnit.id) unit.ring.setTint(0xff982f).setAlpha(0.9);
      else if (this.canMerge(this.selectedUnit, unit)) unit.ring.setTint(0x55ff6f).setAlpha(0.9);
    }
  }

  private clearSelection(): void {
    this.selectedUnit = undefined;
    for (const unit of this.units) {
      unit.sprite.clearTint();
      unit.ring.setTint(UNITS[unit.type].ringTint).setAlpha(0);
    }
    this.updateHint();
  }

  private bindDragging(): void {
    this.input.on("dragstart", (_pointer: Phaser.Input.Pointer, object: Phaser.GameObjects.Sprite) => {
      const unit = object.getData("boardUnit") as BoardUnit | undefined;
      if (!unit || this.state !== "playing") return;
      unit.wasDragged = true;
      unit.dragging = true;
      object.anims.stop();
      object.setFrame(0);
      this.selectedUnit = unit;
      this.highlightMergeTargets();
      unit.ring.setDepth(94);
      object.setDepth(95).setDisplaySize(118, 118);
      unit.rankBadge.setDepth(96);
      unit.rankText.setDepth(97);
    });

    this.input.on("drag", (_pointer: Phaser.Input.Pointer, object: Phaser.GameObjects.Sprite, x: number, y: number) => {
      const unit = object.getData("boardUnit") as BoardUnit | undefined;
      if (!unit || this.state !== "playing") return;
      unit.dragging = true;
      object.setPosition(x, y);
      unit.ring.setPosition(x, y + 10);
      unit.rankBadge.setPosition(x + UNIT_RANK_X_OFFSET, y + UNIT_RANK_Y_OFFSET);
      unit.rankText.setPosition(x + UNIT_RANK_X_OFFSET, y + UNIT_RANK_Y_OFFSET);
    });

    this.input.on("dragend", (pointer: Phaser.Input.Pointer, object: Phaser.GameObjects.Sprite) => {
      const unit = object.getData("boardUnit") as BoardUnit | undefined;
      if (!unit || this.state !== "playing") return;
      unit.dragging = false;
      const target = this.units
        .filter((other) => other.id !== unit.id)
        .map((other) => ({ other, distance: Phaser.Math.Distance.Between(pointer.worldX, pointer.worldY, ...this.slotPosition(other.slot)) }))
        .sort((a, b) => a.distance - b.distance)[0];
      if (target && target.distance < 80 && this.canMerge(unit, target.other)) {
        this.mergeUnits(unit, target.other);
        return;
      }
      const emptySlot = Array.from({ length: BOARD_SLOT_COUNT }, (_, slot) => ({
        slot,
        distance: Phaser.Math.Distance.Between(pointer.worldX, pointer.worldY, ...this.slotPosition(slot)),
      }))
        .filter(({ slot }) => slot !== unit.slot && !this.units.some((other) => other.id !== unit.id && other.slot === slot))
        .sort((a, b) => a.distance - b.distance)[0];
      if (emptySlot && emptySlot.distance < 62) {
        unit.slot = emptySlot.slot;
        this.clearSelection();
        this.snapUnit(unit);
        this.flashCallout(
          unit.type === "guard"
            ? "禁衛已移至新位置・靠近左右道路才能近戰"
            : `${UNITS[unit.type].shortName}已移至新位置`,
        );
        return;
      }
      this.flashCallout(
        target && target.distance < 80 ? "不能合成：兵種或星階不同" : "拖到空格移動；拖到綠色同階守軍完成合成",
      );
      this.clearSelection();
      this.snapUnit(unit);
    });
  }

  private snapUnit(unit: BoardUnit): void {
    if (!this.units.includes(unit)) return;
    const [x, y] = this.slotPosition(unit.slot);
    unit.ring.setPosition(x, y + 10).setDisplaySize(94, 94).setDepth(34);
    unit.sprite.setDisplaySize(104, 104).setDepth(35);
    this.applyUnitFrameOffset(unit, 0);
    unit.rankBadge.setPosition(x + UNIT_RANK_X_OFFSET, y + UNIT_RANK_Y_OFFSET).setDisplaySize(34, 34).setDepth(44);
    unit.rankText.setPosition(x + UNIT_RANK_X_OFFSET, y + UNIT_RANK_Y_OFFSET).setDepth(45);
  }

  private findRandomFreeSlot(): number {
    const free = Array.from({ length: BOARD_SLOT_COUNT }, (_, slot) => slot).filter(
      (slot) => !this.units.some((unit) => unit.slot === slot),
    );
    return free.length > 0 ? Phaser.Math.RND.pick(free) : -1;
  }

  private slotPosition(slot: number): [number, number] {
    return [BOARD_X[slot % BOARD_COLUMNS], BOARD_Y[Math.floor(slot / BOARD_COLUMNS)]];
  }

  private applyUnitFrameOffset(unit: BoardUnit, frameIndex: number): void {
    if (!this.units.includes(unit) || unit.dragging) return;
    const [slotX, slotY] = this.slotPosition(unit.slot);
    const offsets = UNIT_FRAME_OFFSETS[unit.type];
    const safeFrame = Phaser.Math.Clamp(Number.isFinite(frameIndex) ? frameIndex : 0, 0, offsets.length - 1);
    const offset = offsets[safeFrame];
    unit.sprite.setPosition(
      slotX + (unit.sprite.flipX ? -offset.x : offset.x),
      slotY + UNIT_BASE_Y_OFFSET[unit.type] + offset.y,
    );
  }

  private castHeroSkill(): void {
    if (this.state !== "playing") return;
    if (this.heroAssault?.persistent) {
      this.castPersistentHectorSkill();
      return;
    }
    if (this.heroAssault) {
      this.flashCallout("赫克托耳正在戰線上迎擊敵軍");
      return;
    }
    if (this.heroEnergy < 100) {
      this.flashCallout(`${HERO.skill}尚未就緒：${Math.floor(this.heroEnergy)}%`);
      return;
    }
    const targets = this.enemies.filter((enemy) => enemy.alive);
    if (targets.length === 0 && this.lives >= 3) {
      this.flashCallout("目前沒有敵軍，也沒有需要恢復的生命");
      return;
    }
    this.heroEnergy = 0;
    this.heroUses += 1;
    this.lives = Math.min(3, this.lives + 1);
    this.heroGuardian.setAlpha(1).setTint(0xffe36e);
    this.showImpact("bronze-impact", this.heroGuardian.x - 18, this.heroGuardian.y - 18, 150);
    this.cameras.main.flash(360, 255, 220, 116, false);
    this.cameras.main.shake(520, 0.012);
    this.flashCallout("赫克托耳・不破城牆！親自出城迎戰！");
    this.launchHectorAssault(false);
    this.refreshHud();
  }

  private deployPersistentHector(): void {
    if (this.state !== "playing" || this.heroAssault) return;
    this.flashCallout("第6關增援・赫克托耳常駐城門前線！");
    this.launchHectorAssault(true);
    this.refreshHud();
  }

  private castPersistentHectorSkill(): void {
    if (this.heroEnergy < 100) {
      this.flashCallout(`${HERO.skill}尚未就緒：${Math.floor(this.heroEnergy)}%`);
      return;
    }
    const targets = this.enemies
      .filter((enemy) => enemy.alive)
      .sort((a, b) => b.progress - a.progress)
      .slice(0, 12);
    if (targets.length === 0 && this.lives >= 3) {
      this.flashCallout("目前沒有敵軍，也沒有需要恢復的生命");
      return;
    }
    this.heroEnergy = 0;
    this.heroUses += 1;
    this.lives = Math.min(3, this.lives + 1);
    this.heroGuardian.setAlpha(1).setTint(0xffe36e);
    this.time.delayedCall(260, () => {
      if (this.heroGuardian.active) this.heroGuardian.clearTint().setAlpha(1);
    });
    this.cameras.main.flash(360, 255, 220, 116, false);
    this.cameras.main.shake(520, 0.012);
    this.flashCallout("赫克托耳・不破城牆！雙路敵軍全線震退！");
    targets.forEach((enemy, index) => {
      this.time.delayedCall(index * 45, () => {
        if (!enemy.alive || this.state !== "playing") return;
        enemy.progress = Math.max(0, enemy.progress - (enemy.kind === "boss" ? 0.035 : 0.075));
        this.showImpact("bronze-impact", enemy.sprite.x, enemy.sprite.y, enemy.kind === "boss" ? 160 : 112);
        this.damageEnemy(enemy, enemy.kind === "boss" ? 260 : 360 + this.year * 18, { color: "#ffe168" });
      });
    });
    this.refreshHud();
  }

  private launchHectorAssault(persistent: boolean): void {
    const startProgress = 0.985;
    const frontmostEnemy = this.enemies
      .filter((enemy) => enemy.alive)
      .sort((a, b) => b.progress - a.progress)[0];
    const route: EnemyRoute = persistent ? "left" : (frontmostEnemy?.route ?? "left");
    const frontmostProgress = frontmostEnemy?.progress ?? 0.1;
    const battleLine = persistent ? 0.9 : Phaser.Math.Clamp(frontmostProgress + 0.06, 0.16, 0.72);
    const start = this.pointOnPath(route, startProgress, route === "left" ? -24 : 24);
    const sprite = this.add
      .sprite(start.x, start.y, "hero-hector-run", 0)
      .setDisplaySize(156, 156)
      .setDepth(58)
      .play("run-hector-field");
    sprite.setData("anchorX", start.x).setData("anchorY", start.y);
    sprite.on(Phaser.Animations.Events.ANIMATION_UPDATE, () => this.applyHectorFrameOffset(sprite));

    const strikeTimer = this.time.addEvent({
      delay: persistent ? 780 : 470,
      loop: true,
      callback: () => this.strikeWithHector(),
    });
    const assault: HeroAssault = { sprite, progress: startProgress, route, persistent, returning: false, strikeTimer };
    this.heroAssault = assault;
    this.applyHectorFrameOffset(sprite);

    this.tweens.add({
      targets: assault,
      progress: battleLine,
      duration: 1900,
      ease: "Cubic.easeOut",
      onUpdate: () => this.positionHectorAssault(assault),
      onComplete: () => {
        if (persistent) {
          this.flashCallout("赫克托耳已常駐城門・持續攔截左右兩路敵軍！");
          this.tweens.add({
            targets: assault,
            progress: 0.86,
            duration: 2400,
            ease: "Sine.easeInOut",
            yoyo: true,
            repeat: -1,
            onUpdate: () => this.positionHectorAssault(assault),
          });
          return;
        }
        this.flashCallout("赫克托耳已抵達前線・持續迎擊希臘大軍！");
        this.tweens.add({
          targets: assault,
          progress: Math.max(0.06, battleLine - 0.14),
          duration: 6500,
          ease: "Sine.easeInOut",
          onUpdate: () => this.positionHectorAssault(assault),
          onComplete: () => this.returnHectorToTroy(assault),
        });
      },
    });
  }

  private positionHectorAssault(assault: HeroAssault): void {
    if (!assault.sprite.active) return;
    const point = this.pointOnPath(assault.route, assault.progress, assault.route === "left" ? -24 : 24);
    const oldAnchorX = Number(assault.sprite.getData("anchorX") ?? point.x);
    if (Math.abs(point.x - oldAnchorX) > 0.25) assault.sprite.setFlipX(point.x > oldAnchorX);
    assault.sprite.setData("anchorX", point.x).setData("anchorY", point.y);
    this.applyHectorFrameOffset(assault.sprite);
  }

  private applyHectorFrameOffset(sprite: Phaser.GameObjects.Sprite): void {
    if (!sprite.active) return;
    const strike = sprite.anims.currentAnim?.key === "strike-hector-field";
    const offsets = strike ? HECTOR_STRIKE_FRAME_OFFSETS : HECTOR_RUN_FRAME_OFFSETS;
    const frame = Phaser.Math.Clamp(Number(sprite.frame.name) || 0, 0, offsets.length - 1);
    const offset = offsets[frame];
    const scale = sprite.displayWidth / 627;
    const anchorX = Number(sprite.getData("anchorX") ?? sprite.x);
    const anchorY = Number(sprite.getData("anchorY") ?? sprite.y);
    sprite.setPosition(anchorX + (sprite.flipX ? -offset.x : offset.x) * scale, anchorY + offset.y * scale);
  }

  private strikeWithHector(): void {
    const assault = this.heroAssault;
    if (!assault || assault.returning || !assault.sprite.active || this.state !== "playing") return;
    const anchorX = Number(assault.sprite.getData("anchorX") ?? assault.sprite.x);
    const anchorY = Number(assault.sprite.getData("anchorY") ?? assault.sprite.y);
    const targets = this.enemies
      .filter((enemy) => {
        if (!enemy.alive) return false;
        if (!assault.persistent) {
          return enemy.route === assault.route && Math.abs(enemy.progress - assault.progress) <= 0.14;
        }
        return Phaser.Math.Distance.Between(anchorX, anchorY, enemy.sprite.x, enemy.sprite.y) <= 190;
      })
      .sort((a, b) => {
        if (!assault.persistent) return Math.abs(a.progress - assault.progress) - Math.abs(b.progress - assault.progress);
        return (
          Phaser.Math.Distance.Between(anchorX, anchorY, a.sprite.x, a.sprite.y) -
          Phaser.Math.Distance.Between(anchorX, anchorY, b.sprite.x, b.sprite.y)
        );
      })
      .slice(0, assault.persistent ? 3 : 6);
    if (targets.length === 0) return;

    const primary = targets[0];
    assault.sprite.setFlipX(primary.sprite.x > anchorX).play("strike-hector-field", true);
    assault.sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      if (!assault.sprite.active || assault.returning) return;
      assault.sprite.play("run-hector-field", true);
      this.applyHectorFrameOffset(assault.sprite);
    });

    targets.forEach((enemy, index) => {
      this.time.delayedCall(index * 55, () => {
        if (!enemy.alive || this.state !== "playing") return;
        const knockback = assault.persistent
          ? enemy.kind === "boss"
            ? 0.006
            : 0.014
          : enemy.kind === "boss"
            ? 0.012
            : 0.026;
        const damage = assault.persistent
          ? enemy.kind === "boss"
            ? 70 + this.year * 5
            : 70 + this.year * 9
          : enemy.kind === "boss"
            ? 115
            : 175;
        enemy.progress = Math.max(0, enemy.progress - knockback);
        this.showImpact("bronze-impact", enemy.sprite.x, enemy.sprite.y, enemy.kind === "boss" ? 150 : 104);
        this.damageEnemy(enemy, damage, { color: "#ffe168" });
      });
    });
  }

  private returnHectorToTroy(assault: HeroAssault): void {
    if (this.heroAssault !== assault || !assault.sprite.active) return;
    assault.returning = true;
    assault.strikeTimer.remove(false);
    assault.sprite.play("run-hector-field", true);
    this.flashCallout("赫克托耳完成突擊，返回特洛伊城門");
    this.tweens.add({
      targets: assault,
      progress: 0.985,
      duration: 1500,
      ease: "Cubic.easeIn",
      onUpdate: () => this.positionHectorAssault(assault),
      onComplete: () => {
        assault.sprite.destroy();
        if (this.heroAssault === assault) this.heroAssault = undefined;
        if (this.heroGuardian.active) this.heroGuardian.clearTint().setAlpha(1);
        this.refreshHud();
      },
    });
  }

  private updateHint(): void {
    if (this.selectedUnit) {
      const matches = this.units.filter((unit) => this.canMerge(this.selectedUnit as BoardUnit, unit)).length;
      this.hintText.setText(matches > 0 ? "拖到綠色目標合成・也可拖到空格移動" : "拖到空格調整站位");
      return;
    }
    const hasPair = this.units.some((unit, index) => this.units.slice(index + 1).some((other) => this.canMerge(unit, other)));
    if (hasPair) this.hintText.setText("已有可合成組合");
    else if (this.units.length < 5) this.hintText.setText("召喚守軍・近戰放左右兩側路旁");
    else this.hintText.setText("拖曳調整站位・同兵種同階可合成");
  }

  private refreshHud(): void {
    const phaseLabel =
      this.phase === "prep"
        ? `備戰 00:${String(this.phaseSeconds).padStart(2, "0")}`
        : this.phase === "wave"
          ? `首領 00:${String(this.phaseSeconds).padStart(2, "0")}`
          : this.phase === "boss"
            ? "首領戰"
            : `整軍 00:${String(this.phaseSeconds).padStart(2, "0")}`;
    this.scoreText.setText(`分數 ${Math.round(this.score)}`);
    this.waveText.setText(`關卡${this.year}・${this.wave}/${MAX_WAVES}`);
    const aliveEnemyCount = this.enemies.filter((enemy) => enemy.alive).length;
    const momentum = this.combatMomentum();
    this.phaseText.setText(`${phaseLabel}　敵軍${aliveEnemyCount}　戰意${momentum.percent}%`);
    this.livesText.setText(Array.from({ length: 3 }, (_, index) => (index < this.lives ? "♥" : "♡")).join("    "));
    this.manaText.setText(`法力\n${this.mana}`);
    this.summonText.setText(`召喚  ${this.summonCost}`);
    const heroCharge = this.heroEnergy >= 100 ? "就緒" : `${Math.floor(this.heroEnergy)}%`;
    const heroStatus = this.heroAssault?.persistent
      ? `常駐・${heroCharge}`
      : this.heroAssault
        ? "出戰中"
        : `守護者・${heroCharge}`;
    this.heroChargeText.setText(`赫克托耳\n${heroStatus}`);
  }

  private flashCallout(message: string): void {
    this.calloutText.setText(message).setAlpha(1).setScale(1.04);
    this.tweens.killTweensOf(this.calloutText);
    this.tweens.add({ targets: this.calloutText, scale: 1, duration: 180 });
  }

  private finishBattle(won: boolean): void {
    if (this.state !== "playing") return;
    this.state = won ? "won" : "lost";
    this.spawnTimer?.remove(false);
    this.secondTimer?.remove(false);
    if (won) this.score += this.lives * 2500 + Math.max(0, 210 - this.elapsedSeconds) * 25 + this.heroUses * 300;
    this.flashCallout(won ? "勝利！三名首領全部擊破" : "生命耗盡，特洛伊防線失守");
    const result: BattleResult = {
      won,
      year: this.year,
      score: Math.round(this.score),
      elapsedSeconds: this.elapsedSeconds,
      lives: this.lives,
      kills: this.kills,
      merges: this.merges,
      heroUses: this.heroUses,
    };
    this.time.delayedCall(1100, () => this.scene.start("result", result));
  }

}
