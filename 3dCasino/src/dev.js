// DEV 開發者微調工具 — 按 D 或右下角齒輪開關
// 所有 LAYOUT 數值即時調整、機台可直接拖曳、💾 匯出 JSON
import GUI from 'three/addons/libs/lil-gui.module.min.js';
import { LAYOUT } from './config.js?v=20';
import { makeSignTexture } from './casino.js?v=20';

export function initDev(app, actions) {
  let gui = null;

  function build() {
    gui = new GUI({ title: '🛠 DEV 微調工具' });

    const fRoom = gui.addFolder('機台排列');
    fRoom.add(LAYOUT.machines, 'total', 8, 36, 1).name('機台總數').onChange(actions.rebuildMachines);
    fRoom.add(LAYOUT.machines, 'carouselCount', 0, 10, 1).name('島台機台數').onChange(actions.rebuildMachines);
    fRoom.add(LAYOUT.machines, 'carouselRadius', 1.6, 4, 0.05).name('島台半徑').onChange(actions.rebuildMachines);
    fRoom.add(LAYOUT.machines, 'carouselZ', -8, 8, 0.1).name('島台前後移').onChange(actions.rebuildMachines);
    fRoom.add(LAYOUT.machines, 'arcRadius', 3, 14, 0.1).name('弧列半徑').onChange(actions.rebuildMachines);
    fRoom.add(LAYOUT.machines, 'arcSpacing', 1.6, 4, 0.05).name('弧列間距').onChange(actions.rebuildMachines);
    fRoom.add(LAYOUT.machines, 'arcZ', -6, 8, 0.1).name('弧列前後移').onChange(actions.rebuildMachines);
    fRoom.add(LAYOUT.machines, 'aisleHalf', 3, 12, 0.1).name('弧列離中距').onChange(actions.rebuildMachines);
    fRoom.add(LAYOUT.machines, 'backRowCount', 0, 10, 1).name('後排台數').onChange(actions.rebuildMachines);
    fRoom.add(LAYOUT.machines, 'backRowSpacing', 1.8, 4, 0.05).name('後排間距').onChange(actions.rebuildMachines);
    fRoom.add(LAYOUT.machines, 'backRowOffset', 2, 12, 0.1).name('後排離牆距').onChange(actions.rebuildMachines);
    fRoom.add(LAYOUT.machines, 'scale', 0.7, 1.5, 0.01).name('機台縮放').onChange(actions.rebuildMachines);
    fRoom.add({ reset: () => { LAYOUT.machineOffsets = {}; actions.rebuildMachines(); } }, 'reset').name('清除拖曳位移');

    const fCam = gui.addFolder('相機');
    fCam.add(LAYOUT.camera, 'fov', 35, 80, 1).name('視野 FOV').onChange(actions.applyLayout);
    fCam.add(LAYOUT.camera, 'minDist', 0.5, 5, 0.1).name('最近距離').onChange(actions.applyLayout);
    fCam.add(LAYOUT.camera, 'maxDist', 8, 30, 0.5).name('最遠距離').onChange(actions.applyLayout);
    fCam.add(LAYOUT.camera, 'polarMinDeg', 45, 88, 1).name('俯仰上限(度)').onChange(actions.applyLayout);
    fCam.add(LAYOUT.camera, 'polarMaxDeg', 60, 90, 1).name('俯仰下限(度)').onChange(actions.applyLayout);

    const fLight = gui.addFolder('燈光');
    fLight.add(LAYOUT.lights, 'exposure', 0.5, 2.5, 0.01).name('整體曝光').onChange(actions.applyLayout);
    fLight.add(LAYOUT.lights, 'ambient', 0, 1.5, 0.01).name('環境光').onChange(actions.applyLayout);
    fLight.add(LAYOUT.lights, 'hemi', 0, 1.5, 0.01).name('半球光').onChange(actions.applyLayout);
    fLight.add(LAYOUT.lights, 'aisleIntensity', 0, 60, 0.5).name('走道燈強度').onChange(actions.applyLayout);
    fLight.addColor(LAYOUT.lights, 'aisleColor').name('走道燈顏色').onChange(actions.applyLayout);
    fLight.add(LAYOUT.lights, 'ceilingPanel', 0, 4, 0.05).name('天花板燈格').onChange(actions.applyLayout);

    const fBloom = gui.addFolder('Bloom 光暈');
    fBloom.add(LAYOUT.bloom, 'strength', 0, 2.5, 0.01).name('強度').onChange(actions.applyLayout);
    fBloom.add(LAYOUT.bloom, 'radius', 0, 1.5, 0.01).name('半徑').onChange(actions.applyLayout);
    fBloom.add(LAYOUT.bloom, 'threshold', 0, 1, 0.01).name('門檻').onChange(actions.applyLayout);

    const fFog = gui.addFolder('霧氣');
    fFog.addColor(LAYOUT.fog, 'color').name('顏色').onChange(actions.applyLayout);
    fFog.add(LAYOUT.fog, 'density', 0, 0.06, 0.001).name('濃度').onChange(actions.applyLayout);

    const fMisc = gui.addFolder('其他');
    fMisc.add(LAYOUT.reels, 'speed', 0, 3, 0.05).name('轉輪速度');
    fMisc.add(LAYOUT.sign, 'text').name('招牌主標').onChange(updateSign);
    fMisc.add(LAYOUT.sign, 'sub').name('招牌副標').onChange(updateSign);
    fMisc.addColor(LAYOUT.sign, 'color').name('招牌顏色').onChange(updateSign);
    fMisc.add({ win: actions.triggerRandomWin }, 'win').name('🎉 測試中獎動畫');

    gui.add({ export: doExport }, 'export').name('💾 匯出設定 (JSON)');
    gui.close();  // 預設收合子資料夾以外先展開主面板
    gui.open();
  }

  function updateSign() {
    const tex = makeSignTexture(LAYOUT.sign.text, LAYOUT.sign.sub, LAYOUT.sign.color);
    app.refs.signMat.map = tex;
    app.refs.signMat.emissiveMap = tex;
    app.refs.signMat.needsUpdate = true;
    app.refs.signLight.color.set(LAYOUT.sign.color);
  }

  function doExport() {
    const json = JSON.stringify(LAYOUT, null, 2);
    console.log('=== LAYOUT 匯出 ===\n' + json);
    navigator.clipboard?.writeText(json).catch(() => {});
    alert('✅ LAYOUT 已複製到剪貼簿（也印在 Console）\n貼給 Claude 說「我調好了，鎖定」即可寫回 config.js');
  }

  window.__devToggle = (on) => {
    if (on && !gui) build();
    else if (!on && gui) { gui.destroy(); gui = null; }
  };
}
