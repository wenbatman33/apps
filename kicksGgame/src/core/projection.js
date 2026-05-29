// 3D→2D 投影 — 1:1 移植自 game/js/ctl_utils.js 與 CGame.js
// 只用 THREE 的攝影機做投影矩陣運算，不做任何 3D 渲染。
// 在固定 1360×640 內部解析度下，s_fInverseScaling = 1，
// 投影結果直接就是 Phaser 世界座標。

const Projection = {
    camera: null,

    createCamera() {
        const cam = new THREE.PerspectiveCamera(FOV, CANVAS_WIDTH / CANVAS_HEIGHT, NEAR, FAR);
        cam.rotation.x = 88.6 * (Math.PI / 180);
        cam.rotation.y = 0.03 * (Math.PI / 180);
        cam.position.set(CAMERA_POSITION.x, CAMERA_POSITION.y, CAMERA_POSITION.z);
        cam.updateProjectionMatrix();
        cam.updateMatrixWorld();
        this.camera = cam;
        return cam;
    },

    // 把 Cannon 世界座標 {x,y,z} 投影到 1360×640 螢幕座標
    to2D(pos) {
        const v = new THREE.Vector3(pos.x, pos.y, pos.z);
        v.project(this.camera);
        const wHalf = CANVAS_WIDTH * 0.5;
        const hHalf = CANVAS_HEIGHT * 0.5;
        return {
            x: (v.x * wHalf) + wHalf,
            y: (-(v.y * hHalf)) + hHalf,
            z: v.z, // NDC 深度，用於球的距離縮放
        };
    },

    refresh() {
        this.camera.updateProjectionMatrix();
        this.camera.updateMatrixWorld();
    },
};
