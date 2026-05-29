// Cannon.js 物理世界 — 1:1 移植自原 game/js/CScenario.js
// 只含物理（無渲染），原本就與 CreateJS 無關，可直接搬
class Scenario {
    constructor() {
        this.world = null;
        this.ballBody = null;
        this.fieldBody = null;
        this.goalPoleBody = null;
        this.onFieldCollision = null;   // callback
        this.onPoleCollision = null;    // callback
        this.onLineGoal = null;         // callback(userData)
        this._init();
    }

    _init() {
        this.world = new CANNON.World();
        this.world.gravity.set(0, 0, -9.81);
        this.world.broadphase = new CANNON.NaiveBroadphase();
        this.world.solver.iterations = 50;
        this.world.solver.tolerance = 0.00001;

        this.groundMaterial = new CANNON.Material();
        this.ballMaterial = new CANNON.Material();
        this.wallMaterial = new CANNON.Material();

        this.world.addContactMaterial(new CANNON.ContactMaterial(
            this.ballMaterial, this.wallMaterial, { friction: 0.1, restitution: 0.01 }));
        this.world.addContactMaterial(new CANNON.ContactMaterial(
            this.ballMaterial, this.groundMaterial, { friction: 0.2, restitution: 0.3 }));

        this._createBallBody();
        this._createFieldBody();
        this._createGoal();
        this._createBackGoalWall();
        // 球門線觸發區（單一大區，命中即判定）
        this._createAreaGoal(GOAL_LINE_POS, BACK_WALL_GOAL_SIZE, null);
    }

    _createBallBody() {
        this.ballBody = new CANNON.Body({
            mass: BALL_MASS, material: this.ballMaterial,
            linearDamping: BALL_LINEAR_DAMPING, angularDamping: BALL_LINEAR_DAMPING * 2,
        });
        this.ballBody.position.set(POSITION_BALL.x, POSITION_BALL.y, POSITION_BALL.z);
        this.ballBody.addShape(new CANNON.Sphere(BALL_RADIUS));
        this.world.add(this.ballBody);
    }

    _createFieldBody() {
        this.fieldBody = new CANNON.Body({ mass: 0, material: this.groundMaterial });
        this.fieldBody.addShape(new CANNON.Plane());
        this.fieldBody.position.z = -9;
        this.fieldBody.addEventListener("collide", () => {
            if (this.onFieldCollision) this.onFieldCollision();
        });
        this.world.addBody(this.fieldBody);
    }

    _createGoal() {
        const poleLR = new CANNON.Cylinder(POLE_RIGHT_LEFT_SIZE.radius_top, POLE_RIGHT_LEFT_SIZE.radius_bottom,
            POLE_RIGHT_LEFT_SIZE.height, POLE_RIGHT_LEFT_SIZE.segments);
        const poleUp = new CANNON.Cylinder(POLE_UP_SIZE.radius_top, POLE_UP_SIZE.radius_bottom,
            POLE_UP_SIZE.height, POLE_UP_SIZE.segments);

        const q = new CANNON.Quaternion();
        q.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), Math.PI / 2);
        poleUp.transformAllPoints(new CANNON.Vec3(), q);

        this.goalPoleBody = new CANNON.Body({ mass: 0 });
        this.goalPoleBody.addShape(poleLR, new CANNON.Vec3(POLE_UP_SIZE.height * 0.5, 0, 0));
        this.goalPoleBody.addShape(poleLR, new CANNON.Vec3(-POLE_UP_SIZE.height * 0.5, 0, 0));
        this.goalPoleBody.addShape(poleUp, new CANNON.Vec3(0, 0, POLE_RIGHT_LEFT_SIZE.height * 0.5));
        this.goalPoleBody.position.set(BACK_WALL_GOAL_POSITION.x,
            BACK_WALL_GOAL_POSITION.y - UP_WALL_GOAL_SIZE.depth, BACK_WALL_GOAL_POSITION.z);
        this.goalPoleBody.addEventListener("collide", () => {
            if (this.onPoleCollision) this.onPoleCollision();
        });
        this.world.addBody(this.goalPoleBody);
    }

    _createBackGoalWall() {
        const back = new CANNON.Box(new CANNON.Vec3(BACK_WALL_GOAL_SIZE.width, BACK_WALL_GOAL_SIZE.depth, BACK_WALL_GOAL_SIZE.height));
        const side = new CANNON.Box(new CANNON.Vec3(LEFT_RIGHT_WALL_GOAL_SIZE.width, LEFT_RIGHT_WALL_GOAL_SIZE.depth, LEFT_RIGHT_WALL_GOAL_SIZE.height));
        const up = new CANNON.Box(new CANNON.Vec3(UP_WALL_GOAL_SIZE.width, UP_WALL_GOAL_SIZE.depth, UP_WALL_GOAL_SIZE.height));

        const body = new CANNON.Body({ mass: 0, material: this.wallMaterial });
        body.addShape(back);
        body.addShape(side, new CANNON.Vec3(BACK_WALL_GOAL_SIZE.width, 0, 0));
        body.addShape(side, new CANNON.Vec3(-BACK_WALL_GOAL_SIZE.width, 0, 0));
        body.addShape(up, new CANNON.Vec3(0, 0, BACK_WALL_GOAL_SIZE.height));
        body.position.set(BACK_WALL_GOAL_POSITION.x, BACK_WALL_GOAL_POSITION.y, BACK_WALL_GOAL_POSITION.z);
        this.world.addBody(body);
    }

    _createAreaGoal(pos, props, info) {
        const body = new CANNON.Body({ mass: 0 });
        body.addShape(new CANNON.Box(new CANNON.Vec3(props.width, props.depth, props.height)));
        body.position.set(pos.x, pos.y, pos.z);
        body.collisionResponse = 0;
        body.addEventListener("collide", (e) => {
            if (this.onLineGoal) this.onLineGoal(info);
        });
        this.world.addBody(body);
    }

    addImpulse(body, vec3) {
        body.applyImpulse(new CANNON.Vec3(vec3.x, vec3.y, vec3.z), new CANNON.Vec3(0, 0, BALL_RADIUS));
    }
    setVelocity(body, v) { body.velocity.set(v.x, v.y, v.z); }
    setAngularVelocity(body, v) { body.angularVelocity.set(v.x, v.y, v.z); }

    update() { this.world.step(PHYSICS_STEP); }
}
