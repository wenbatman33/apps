// 寶石繪製：使用 assets/gems/*.png 素材
// 載入 7 張 PNG 為 sprite，後續 gemComp 每幀以 drawSprite 繪製
import { GEM_IMAGES } from "./constants.js";

// 載入 PNG 寶石素材為 Kaboom sprite
// Kaboom 的 loadSprite 回傳 Asset 物件（含 .onLoad / .loaded），不一定是標準 Promise；
// 把它們包成 Promise 後回傳，讓 main.js 等全部完成再進 menu。
export function preloadGemSprites(k) {
  return Promise.all(
    GEM_IMAGES.map((file, i) => {
      const asset = k.loadSprite(`gem-${i}`, `./assets/gems/${file}`);
      return new Promise((resolve) => {
        if (!asset) return resolve();
        if (typeof asset.then === "function") {
          asset.then(resolve).catch(resolve);
        } else if (typeof asset.onLoad === "function") {
          asset.onLoad(resolve);
          if (asset.loaded) resolve();
        } else {
          resolve();
        }
      });
    }),
  );
}

// Kaboom 組件：每幀貼 sprite + 偶爾疊一層發光
export function gemComp(k, type, size) {
  return {
    id: "gem",
    require: [],
    type,
    size,
    scale: 1,
    brightness: 0,
    rot: 0,
    draw() {
      k.pushTransform();
      k.pushRotate(this.rot);
      k.pushScale(this.scale, this.scale);
      k.drawSprite({
        sprite: `gem-${this.type}`,
        anchor: "center",
        width: size,
        height: size,
      });
      if (this.brightness > 0.01) {
        k.drawCircle({
          pos: k.vec2(0, 0),
          radius: size * 0.44 * (1 + this.brightness * 0.3),
          color: k.rgb(255, 255, 255),
          opacity: this.brightness * 0.5,
        });
      }
      k.popTransform();
    },
  };
}
