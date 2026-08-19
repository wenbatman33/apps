// Phaser 官方的 phaser.esm.min.js 只有 named exports，沒有 default export，
// 而遊戲程式碼統一寫 `import Phaser from '...'`（Phaser 官方範例的慣用寫法）。
// 這層 shim 把整個命名空間包成 default，讓瀏覽器原生 ES module 直接可用，
// 不需要 bundler 做 interop。
import * as Phaser from './phaser.esm.min.js';

export default Phaser;
export * from './phaser.esm.min.js';
