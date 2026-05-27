// 開發者編輯面板 — 按 D 開關
// 即時調整 ROW Y、COL X、sprite 顯示尺寸；按 EXPORT 把當前值複製到剪貼簿
import Phaser from "phaser";
import { ZONE_X, GAME_HEIGHT, GAME_WIDTH } from "../config";
import { ASSET_SIZE } from "./BootScene";

export interface DevState {
  rowTopY: number;
  rowCoupleY: number;
  rowPlayerY: number;
  zoneX: number[];     // 7 個 (0..6)
  spriteScale: number; // 全體 sprite 縮放
  coupleSpread: number; // 夫婦兩人間距比例
}

// 全域 dev state，所有 scene 都讀這個
declare global {
  interface Window {
    __wbDev: DevState;
    __wbToggleDev: () => void;
    __wbExportLayout: () => void;
    __wbApplyLayout?: () => void;   // GameScene 設定，dev panel 滑桿改動時呼叫
  }
}

export function initDevState(): DevState {
  if (!window.__wbDev) {
    // 從 scene_editor.html v2 匯出的 layout（2026-05-24 v2 鎖定）
    window.__wbDev = {
      rowTopY: 0.300,     // 吧台軌道
      rowCoupleY: 0.478,
      rowPlayerY: 0.790,
      zoneX: [0.140, 0.227, 0.358, 0.492, 0.608, 0.732, 0.868],
      spriteScale: 1.0,
      coupleSpread: 0.35
    };
  }
  return window.__wbDev;
}

let panelEl: HTMLDivElement | null = null;
let panelOpen = false;

function styleEl(el: HTMLElement, css: Partial<CSSStyleDeclaration>) {
  Object.assign(el.style, css);
}

function makeSlider(label: string, get: () => number, set: (v: number) => void, min: number, max: number, step: number): HTMLDivElement {
  const row = document.createElement("div");
  styleEl(row, { display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px", fontSize: "11px", fontFamily: "monospace" });

  const lbl = document.createElement("span");
  lbl.textContent = label;
  styleEl(lbl, { width: "110px", color: "#ffe8b5" });

  const slider = document.createElement("input");
  slider.type = "range";
  slider.min = String(min);
  slider.max = String(max);
  slider.step = String(step);
  slider.value = String(get());
  styleEl(slider, { flex: "1", minWidth: "120px" });

  const valLbl = document.createElement("span");
  valLbl.textContent = get().toFixed(3);
  styleEl(valLbl, { width: "60px", color: "#ffd166", textAlign: "right" });

  // 用 debounce 避免每像素都重啟 scene
  let applyTimer: number | null = null;
  const scheduleApply = () => {
    if (applyTimer) clearTimeout(applyTimer);
    applyTimer = window.setTimeout(() => {
      try { window.__wbApplyLayout?.(); } catch (e) { console.error(e); }
    }, 80);
  };
  slider.addEventListener("input", () => {
    const v = parseFloat(slider.value);
    set(v);
    valLbl.textContent = v.toFixed(3);
    scheduleApply();
  });

  row.appendChild(lbl);
  row.appendChild(slider);
  row.appendChild(valLbl);
  return row;
}

function buildPanel(): HTMLDivElement {
  const panel = document.createElement("div");
  panel.id = "wb-dev-panel";
  styleEl(panel, {
    position: "fixed",
    top: "10px",
    right: "10px",
    width: "360px",
    maxHeight: "90vh",
    overflowY: "auto",
    background: "rgba(20,12,6,0.92)",
    border: "2px solid #6b4423",
    borderRadius: "6px",
    padding: "10px",
    zIndex: "9999",
    color: "#ffe8b5",
    fontFamily: "monospace",
    fontSize: "12px",
    boxShadow: "0 4px 20px rgba(0,0,0,0.6)"
  });

  const dev = window.__wbDev;

  // Header
  const hdr = document.createElement("div");
  hdr.innerHTML = "🛠 <b>Dev Panel</b> &nbsp; <span style='font-size:10px;color:#999'>D 開關 / X 匯出</span>";
  styleEl(hdr, { marginBottom: "10px", fontSize: "14px", borderBottom: "1px solid #6b4423", paddingBottom: "6px" });
  panel.appendChild(hdr);

  // Section: rows
  const rowsTitle = document.createElement("div");
  rowsTitle.textContent = "■ 三層 Y 位置 (比例)";
  styleEl(rowsTitle, { color: "#ffd166", margin: "8px 0 4px" });
  panel.appendChild(rowsTitle);

  panel.appendChild(makeSlider("rowTopY (吧台)", () => dev.rowTopY, v => dev.rowTopY = v, 0.30, 0.70, 0.005));
  panel.appendChild(makeSlider("rowCoupleY (夫婦)", () => dev.rowCoupleY, v => dev.rowCoupleY = v, 0.50, 0.80, 0.005));
  panel.appendChild(makeSlider("rowPlayerY (玩家)", () => dev.rowPlayerY, v => dev.rowPlayerY = v, 0.75, 0.95, 0.005));

  // Section: zone X
  const zonesTitle = document.createElement("div");
  zonesTitle.textContent = "■ Zone X 位置 (比例)";
  styleEl(zonesTitle, { color: "#ffd166", margin: "10px 0 4px" });
  panel.appendChild(zonesTitle);

  for (let i = 0; i < 7; i++) {
    panel.appendChild(makeSlider(`zoneX[${i}]`, () => dev.zoneX[i], v => dev.zoneX[i] = v, 0.0, 1.0, 0.005));
  }

  // Section: other
  const otherTitle = document.createElement("div");
  otherTitle.textContent = "■ 其他";
  styleEl(otherTitle, { color: "#ffd166", margin: "10px 0 4px" });
  panel.appendChild(otherTitle);

  panel.appendChild(makeSlider("sprite 全體縮放", () => dev.spriteScale, v => dev.spriteScale = v, 0.3, 2.0, 0.05));
  panel.appendChild(makeSlider("夫婦間距", () => dev.coupleSpread, v => dev.coupleSpread = v, 0.0, 1.5, 0.05));

  // Buttons
  const btnRow = document.createElement("div");
  styleEl(btnRow, { display: "flex", gap: "8px", marginTop: "10px", flexWrap: "wrap" });

  const expBtn = document.createElement("button");
  expBtn.textContent = "📋 EXPORT (X)";
  styleEl(expBtn, { flex: "1", padding: "6px", background: "#ffd166", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" });
  expBtn.onclick = exportLayout;
  btnRow.appendChild(expBtn);

  const resetBtn = document.createElement("button");
  resetBtn.textContent = "↺ RESET";
  styleEl(resetBtn, { flex: "1", padding: "6px", background: "#6b4423", color: "#ffe8b5", border: "none", borderRadius: "4px", cursor: "pointer" });
  resetBtn.onclick = () => {
    Object.assign(window.__wbDev, {
      rowTopY: 0.50, rowCoupleY: 0.65, rowPlayerY: 0.86,
      zoneX: [0.15, 0.27, 0.39, 0.51, 0.63, 0.75, 0.90],
      spriteScale: 1.0, coupleSpread: 0.35
    });
    closeDevPanel();
    openDevPanel();
    window.__wbApplyLayout?.();
  };
  btnRow.appendChild(resetBtn);

  panel.appendChild(btnRow);

  return panel;
}

export function openDevPanel() {
  if (panelOpen) return;
  panelEl = buildPanel();
  document.body.appendChild(panelEl);
  panelOpen = true;
}

export function closeDevPanel() {
  if (!panelOpen) return;
  panelEl?.remove();
  panelEl = null;
  panelOpen = false;
}

export function toggleDevPanel() {
  if (panelOpen) closeDevPanel();
  else openDevPanel();
}

// DevPanel UI（按鈕 / 鍵盤 / 面板）已移除。layout 編輯改用 scene_editor.html。
// 保留 initDevState() 與 window.__wbDev，因為 GameScene 仍讀取這些值。
// 清掉殘留的 floating button / panel（如果先前的版本留下）
if (typeof window !== "undefined") {
  const oldBtn = document.getElementById("wb-dev-btn");
  if (oldBtn) oldBtn.remove();
  const oldPanel = document.getElementById("wb-dev-panel");
  if (oldPanel) oldPanel.remove();
}

export function exportLayout() {
  const dev = window.__wbDev;
  const text = JSON.stringify(dev, null, 2);
  navigator.clipboard.writeText(text).then(
    () => alert("已複製到剪貼簿！貼給 Claude 鎖定數值。"),
    () => { console.log(text); alert("複製失敗 — 看 console 取值"); }
  );
}

// 工具：根據 dev state 算實際 px
export const Dev = {
  state: initDevState(),
  rowTopY: () => GAME_HEIGHT * window.__wbDev.rowTopY,
  rowCoupleY: () => GAME_HEIGHT * window.__wbDev.rowCoupleY,
  rowPlayerY: () => GAME_HEIGHT * window.__wbDev.rowPlayerY,
  zoneX: (i: number) => {
    const z = window.__wbDev.zoneX;
    if (i >= 0 && i < z.length) return GAME_WIDTH * z[i];
    // zone -1 = zone 0 左邊一格
    if (i === -1) return GAME_WIDTH * (z[0] - (z[1] - z[0]));
    return GAME_WIDTH * 0.5;
  },
  scale: () => window.__wbDev.spriteScale,
  coupleSpread: () => window.__wbDev.coupleSpread,
  applySize: (sprite: Phaser.GameObjects.Sprite, key: string) => {
    const size = ASSET_SIZE[key];
    if (!size) return;
    const s = window.__wbDev.spriteScale;
    sprite.setDisplaySize(size.w * s, size.h * s);
  }
};
