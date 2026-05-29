// 方向偵測：縮放模式固定為 ENVELOP（config 設定），這裡負責
//   1) 視窗尺寸變化時 refresh（ENVELOP 依新尺寸重算填滿）
//   2) 記錄 window.__portrait
//   3) 通知 Play 場景方向改變，調整相機（直向才需要跟球）
(function () {
    const overlay = document.getElementById('rotate-overlay');
    if (overlay) overlay.style.display = 'none'; // 不再強制橫向

    function apply() {
        if (!window.game || !window.game.scale) return;
        const portrait = window.innerHeight > window.innerWidth;
        window.__portrait = portrait;

        window.game.scale.refresh();
        if (window.game.loop) window.game.loop.wake();

        const play = window.game.scene.keys ? window.game.scene.keys['Play'] : null;
        if (play && play.scene.isActive() && play.onOrientation) {
            play.onOrientation(portrait);
        }
    }

    window.addEventListener('resize', apply);
    window.addEventListener('orientationchange', () => setTimeout(apply, 200));
    window.addEventListener('load', apply);
    setTimeout(apply, 400);

    window.__applyOrientation = apply;
})();
