/* ===== Rock Climber Slots — Symbol Renderer ===== */
'use strict';

const SymbolRenderer = (() => {
  const SIZE = 140;
  const BASE_MAIN = 'assets/img/Rock climber slot game kit/main_game/';
  const BASE_BONUS = 'assets/img/Rock climber slot game kit/bonus_game/';

  // 符號名稱 → 圖片路徑對應
  const IMAGE_MAP = {
    orange:     { path: BASE_MAIN,  file: 'icon_4.png' },   // 登山靴
    lemon:      { path: BASE_MAIN,  file: 'icon_5.png' },   // 繩鉤
    plum:       { path: BASE_MAIN,  file: 'icon_1.png' },   // 頭盔+繩索
    watermelon: { path: BASE_MAIN,  file: 'icon_6.png' },   // 帳篷營火
    banana:     { path: BASE_MAIN,  file: 'icon_2.png' },   // 冰鋤
    cherry:     { path: BASE_BONUS, file: 'gem_red.png' },   // 紅寶石
    grapes:     { path: BASE_BONUS, file: 'gem_purple.png' },// 紫寶石
    bar:        { path: BASE_MAIN,  file: 'icon_8.png' },   // 冰雪巨人（高價值）
    seven:      { path: BASE_MAIN,  file: 'icon_3.png' },   // 登山者（高價值）
    scatter:    { path: BASE_MAIN,  file: 'icon_7.png' },   // ROCK CLIMBER Logo
    wild:       { path: BASE_BONUS, file: 'gem_yellow.png' },// 金寶石（Wild）
  };

  // 載入前的佔位色
  const PLACEHOLDER = {
    orange:'#8B4513', lemon:'#C0C0C0', plum:'#FF6600',
    watermelon:'#2E8B57', banana:'#4682B4', cherry:'#DC143C',
    grapes:'#9400D3', scatter:'#228B22', bar:'#4169E1',
    seven:'#B8860B', wild:'#FFD700',
  };

  const cache = {};

  function init() {
    Object.entries(IMAGE_MAP).forEach(([name, { path, file }]) => {
      const img = new Image();
      img.onload = () => { cache[name] = img; };
      img.onerror = () => console.warn('[SymbolRenderer] 載入失敗:', path + file);
      img.src = path + file;
    });
  }

  function getSymbol(name) {
    return cache[name] || null;
  }

  function drawSymbolAt(ctx, name, x, y, w, h) {
    const img = cache[name];
    if (img) {
      ctx.drawImage(img, x, y, w, h);
    } else {
      // 載入中的佔位圓形
      ctx.fillStyle = PLACEHOLDER[name] || '#555';
      ctx.beginPath();
      ctx.arc(x + w / 2, y + h / 2, Math.min(w, h) / 2 - 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  return { init, getSymbol, drawSymbolAt, SIZE };
})();
