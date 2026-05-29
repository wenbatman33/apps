// 直向偵測：手機直拿時蓋上「請轉橫向」提示並暫停遊戲迴圈，
// 轉回橫向自動隱藏並恢復。對應原版的 check_orientation。
(function () {
    const overlay = document.getElementById('rotate-overlay');

    function isPortrait() {
        return window.innerHeight > window.innerWidth;
    }

    function check() {
        const portrait = isPortrait();
        overlay.style.display = portrait ? 'flex' : 'none';

        // 暫停／恢復遊戲迴圈（game 可能還沒建立，需防護）
        if (window.game && window.game.loop) {
            if (portrait) window.game.loop.sleep();
            else window.game.loop.wake();
        }
    }

    window.addEventListener('resize', check);
    window.addEventListener('orientationchange', () => setTimeout(check, 200));
    window.addEventListener('load', check);
    // game 建立稍有延遲，補一次檢查
    setTimeout(check, 400);
})();
