/* ===== Classic Sevens Slots — Symbol Renderer (Individual PNGs) ===== */
'use strict';

const SymbolRenderer = (() => {
  const SIZE = 140;
  const BASE = 'assets/img/gameItems/';

  // Map symbol name → image filename
  const IMAGE_MAP = {
    orange:     'Slice.png',
    lemon:      'Slice Copy.png',
    plum:       'Slice Copy 2.png',
    watermelon: 'Slice Copy 3.png',
    banana:     'Slice Copy 4.png',
    cherry:     'Slice Copy 5.png',
    grapes:     'Slice Copy 6.png',
    scatter:    'Slice Copy 7.png',
    bar:        'Slice Copy 8.png',
    seven:      'Slice Copy 9.png',
    wild:       'Slice Copy 10.png',
  };

  // Fallback colours shown before images load
  const PLACEHOLDER = {
    orange:'#ff8010', lemon:'#ffe020', plum:'#8020a0',
    watermelon:'#20a030', banana:'#ffe030', cherry:'#dd1010',
    grapes:'#8020cc', scatter:'#cc2020', bar:'#2050cc',
    seven:'#cc0000', wild:'#cc8010',
  };

  const cache = {}; // name → HTMLImageElement (once loaded)

  function init() {
    Object.entries(IMAGE_MAP).forEach(([name, file]) => {
      const img = new Image();
      img.onload = () => { cache[name] = img; };
      img.onerror = () => console.warn('[SymbolRenderer] Failed to load:', file);
      img.src = BASE + file;
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
      // Placeholder circle while loading
      ctx.fillStyle = PLACEHOLDER[name] || '#555';
      ctx.beginPath();
      ctx.arc(x + w / 2, y + h / 2, Math.min(w, h) / 2 - 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  return { init, getSymbol, drawSymbolAt, SIZE };
})();
