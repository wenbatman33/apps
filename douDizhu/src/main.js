// Phaser 启动设定（手机直式为主，等比缩放置中）

(function () {
  // 桌机宽萤幕时采用 PC 参数，其余用手机参数
  const isDesktop = window.matchMedia('(min-width: 900px) and (pointer: fine)').matches;
  window.LAYOUT = JSON.parse(JSON.stringify(isDesktop ? window.LAYOUT_PC : window.LAYOUT_MOBILE));

  const config = {
    type: Phaser.AUTO,
    parent: 'game',
    backgroundColor: window.THEME.bg,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: window.LAYOUT.width,
      height: window.LAYOUT.height
    },
    render: { antialias: true, roundPixels: true },
    input: { mouse: true, touch: true, activePointers: 2 },
    scene: [window.MenuScene, window.GameScene, window.RulesScene]
  };

  window.gameInstance = new Phaser.Game(config);

  // Phaser 会快取 canvas 在页面上的位置来换算点击座标。
  // 桌机改变视窗大小 / 缩放页面时这份快取可能过期，导致点击整体偏移，这里强制重新量测。
  const refresh = () => window.gameInstance.scale.refresh();
  ['resize', 'orientationchange', 'scroll'].forEach(evt =>
    window.addEventListener(evt, refresh, { passive: true })
  );
  document.addEventListener('visibilitychange', refresh);
  // 页面在容器尺寸尚未就绪时载入（嵌入式预览、背景分页）会把 canvas 算成 0，
  // 用 ResizeObserver 盯住容器，尺寸一变就重新量测
  window.addEventListener('load', refresh);
  [300, 800, 1500].forEach(ms => setTimeout(refresh, ms));
  if (window.ResizeObserver) {
    new ResizeObserver(() => refresh()).observe(document.getElementById('game'));
  }
})();
