<template>
  <div>
    <div class="bg-pattern"></div>
    <header class="site-header">
      <div class="header-inner">
        <div class="header-emblem">🏛</div>
        <div class="header-text">
          <h1 class="site-title">欣聯大心社區</h1>
          <p class="site-subtitle">管理委員會年度輪值抽籤系統</p>
        </div>
        <div class="header-right">
          <span v-if="APPS_SCRIPT_URL" class="mode-badge cloud-badge">☁️ 雲端模式</span>
          <span v-else class="mode-badge offline-badge">💾 離線模式</span>
          <div class="year-badge">
            <span class="year-label">年度</span>
            <span class="year-value">{{ currentYear }} 年</span>
          </div>
        </div>
      </div>
    </header>

    <main class="main-content">
      <!-- Control Panel -->
      <section class="control-panel" aria-label="抽籤控制面板">
        <div class="control-inner">
          <div class="control-info">
            <p class="control-desc">系統將對 A、B、C 三棟住戶<strong>各自獨立</strong>進行隨機抽籤，每棟產生自己的輪值順序。</p>
            <div class="unit-stats">
              <span class="stat-chip stat-a">A棟 <strong>17</strong> 戶</span>
              <span class="stat-chip stat-b">B棟 <strong>52</strong> 戶</span>
              <span class="stat-chip stat-c">C棟 <strong>38</strong> 戶</span>
              <span class="stat-chip stat-total">合計 <strong>107</strong> 戶</span>
            </div>
          </div>
          <div class="control-buttons">
            <button class="btn btn-draw" :class="{ loading: isDrawing }" :disabled="isDrawing" @click="startDraw">
              <span class="btn-icon">🎰</span>
              <span class="btn-text">開始抽籤</span>
            </button>
            <button class="btn btn-clear" :disabled="isDrawing || !hasResults" @click="clearDraw">
              <span class="btn-icon">🗑</span>
              <span class="btn-text">清除結果</span>
            </button>
          </div>
        </div>
        
        <div v-if="statusMessage" class="draw-status">{{ statusMessage }}</div>

        <!-- Save Panel -->
        <div v-if="hasResults && !isDrawing" class="save-panel" style="display: flex;">
          <div class="save-panel-inner">
            <span class="save-label">儲存此次結果：</span>
            <input type="text" v-model="saveName" class="save-name-input" placeholder="例：2026 年度輪值抽籤" maxlength="40" />
            <button class="btn btn-save-cloud" :disabled="isSaving" @click="saveToCloud">
              {{ isSaving ? '儲存中...' : '☁️ 儲存到試算表' }}
            </button>
          </div>
          <div v-if="cloudMsg.text" class="cloud-msg" :class="'cloud-msg-' + cloudMsg.type">{{ cloudMsg.text }}</div>
        </div>
      </section>

      <!-- Buildings Section -->
      <section class="buildings-section" aria-label="三棟大樓示意圖">
        <h2 class="section-title">大樓示意圖</h2>
        <div class="buildings-wrapper">
          <template v-for="building in ['A', 'B', 'C']" :key="building">
            <div class="building-container" :id="'building' + building">
              <div :class="['building-label', 'building-label-' + building.toLowerCase()]">{{ building }} 棟</div>
              <div :class="['building-structure', 'building-structure-' + building.toLowerCase()]">
                <div :class="['building-top', 'building-top-' + building.toLowerCase()]">
                  <div class="roof-decor"></div>
                  <div class="building-name">{{ building }}</div>
                  <div class="building-unit-count">{{ ALL_UNITS[building].length }} 戶</div>
                </div>
                <div class="building-floors">
                  <div v-for="floorData in floorsData[building]" :key="floorData.floor" class="floor-row">
                    <div class="floor-label">{{ floorData.floor }}F</div>
                    <div v-for="uid in floorData.units" :key="uid" 
                         class="unit-cell" 
                         :class="[
                           'unit-cell-' + building.toLowerCase(),
                           drawnUnits[building][uid] ? 'drawn' : 'undrawn'
                         ]"
                         :title="uid">
                      <div class="unit-rank">
                        <span class="unit-id-text">{{ uid }}</span>
                        <span v-if="drawnUnits[building][uid]" class="unit-rank-num">#{{ drawnUnits[building][uid] }}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="building-base"></div>
              </div>
            </div>
          </template>
        </div>
      </section>

      <!-- Results Tables Section -->
      <section class="results-section" aria-label="各棟輪值結果表格">
        <h2 class="section-title">輪值順序表</h2>
        <div class="results-container">
          
          <div v-if="!hasResults && !isDrawing" class="empty-state">
            <div class="empty-icon">🎲</div>
            <p class="empty-text">尚未進行抽籤</p>
            <p class="empty-sub">請點擊「開始抽籤」按鈕，A、B、C 三棟將分別進行獨立隨機排序</p>
          </div>

          <div v-if="hasResults">
            <div class="table-actions">
              <button class="btn-print" @click="printPage">🖨️ 列印輪值表</button>
              <span class="table-timestamp">{{ tableTimestamp }}</span>
            </div>
            <div class="tables-grid">
              <template v-for="building in ['A', 'B', 'C']" :key="'table-'+building">
                <div :class="['building-table-block', 'building-table-' + building.toLowerCase()]">
                  <div class="table-block-header">
                    <span class="table-block-title">{{ building }} 棟輪值表</span>
                    <span class="table-block-count">共 {{ drawResults[building].length }} 戶</span>
                  </div>
                  <div class="table-scroll">
                    <table class="results-table">
                      <thead>
                        <tr>
                          <th class="col-rank">順序</th>
                          <th class="col-unit">戶號</th>
                          <th class="col-floor">樓層</th>
                          <th class="col-note">備註</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="(unit, index) in drawResults[building]" :key="unit.id">
                          <td><span class="rank-badge" :class="'rank-' + getRankLevel(index + 1)">{{ index + 1 }}</span></td>
                          <td><span class="unit-code">{{ unit.label }}</span></td>
                          <td>{{ unit.floor }} 樓</td>
                          <td style="color:var(--clr-text-muted);font-size:0.82rem">{{ getNote(index + 1) }}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </template>
            </div>
          </div>
        </div>
      </section>

      <!-- Cloud History Section -->
      <section class="history-section" aria-label="雲端歷史記錄">
        <h2 class="section-title">
          歷史記錄
          <button class="btn-refresh" @click="loadCloudHistory" title="重新整理">↻</button>
        </h2>
        <div class="history-container">
          <div class="history-list">
            <div v-if="!APPS_SCRIPT_URL" class="history-empty">
              <p>尚未設定 Google 試算表連結</p>
              <p class="history-setup-hint">請在程式碼中填入 <code>APPS_SCRIPT_URL</code> 後即可使用雲端功能</p>
            </div>
            <div v-else-if="isLoadingHistory" class="history-loading">載入中...</div>
            <div v-else-if="historyError" class="history-empty">載入失敗：{{ historyError }}</div>
            <div v-else-if="historyRecords.length === 0" class="history-empty">尚無儲存記錄</div>
            <template v-else>
              <div v-for="rec in historyRecords" :key="rec.id" class="history-item">
                <div class="history-item-info">
                  <div class="history-item-name">
                    <span class="history-seq">{{ getSeqLabel(rec) }}</span>
                    {{ rec.name }}
                  </div>
                  <div class="history-item-meta">{{ getHistoryDate(rec) }} ｜ A棟 {{ rec.totalA }} 戶 ／ B棟 {{ rec.totalB }} 戶 ／ C棟 {{ rec.totalC }} 戶</div>
                </div>
                <div class="history-item-actions">
                  <button class="btn-history-load" @click="loadHistoryRecord(rec)">📋 載入</button>
                  <button class="btn-history-delete" :disabled="rec.isDeleting" @click="deleteHistoryRecord(rec)">
                    {{ rec.isDeleting ? '刪除中...' : '🗑 刪除' }}
                  </button>
                </div>
              </div>
            </template>
          </div>
        </div>
      </section>
    </main>

    <footer class="site-footer">
      <p>欣聯大心社區管理委員會 &copy; {{ currentYear }} ｜ 各棟獨立抽籤，公正透明 ｜ 資料儲存於 Google 試算表</p>
    </footer>

    <!-- Overlay -->
    <div v-if="showOverlay" class="drawer-overlay" style="display:flex">
      <div class="lottery-animation">
        <div class="lottery-balls" id="lotteryBalls">
          <div class="lottery-ball">A</div>
          <div class="lottery-ball">B</div>
          <div class="lottery-ball">C</div>
        </div>
        <div class="lottery-text">三棟各自抽籤進行中...</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';

// --- 設定檔 ---
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzLOPcNMRb2d6uf4xZQIQwQOYs2-D87e_aKvItwrUuOa_SYiG9md0Nc6I-nWSyWR-2z/exec";

// --- 初始化住戶資料 ---
function generateUnits() {
  const aUnits = [], bUnits = [], cUnits = [];
  
  // A棟
  aUnits.push({ id: 'A1-1F', building: 'A', unit: 'A1', floor: 1, label: 'A1-1F' });
  for (let f = 2; f <= 9; f++) {
    aUnits.push({ id: `A1-${f}F`, building: 'A', unit: 'A1', floor: f, label: `A1-${f}F` });
    aUnits.push({ id: `A2-${f}F`, building: 'A', unit: 'A2', floor: f, label: `A2-${f}F` });
  }

  // B棟
  for (let f = 2; f <= 14; f++) {
    for (let u = 1; u <= 4; u++) bUnits.push({ id: `B${u}-${f}F`, building: 'B', unit: `B${u}`, floor: f, label: `B${u}-${f}F` });
  }

  // C棟
  cUnits.push({ id: 'C2-2F', building: 'C', unit: 'C2', floor: 2, label: 'C2-2F' });
  cUnits.push({ id: 'C3-2F', building: 'C', unit: 'C3', floor: 2, label: 'C3-2F' });
  for (let f = 3; f <= 14; f++) {
    for (let u = 1; u <= 3; u++) cUnits.push({ id: `C${u}-${f}F`, building: 'C', unit: `C${u}`, floor: f, label: `C${u}-${f}F` });
  }

  return { A: aUnits, B: bUnits, C: cUnits };
}

const ALL_UNITS = generateUnits();

// 建構樓層資料，用於大樓示意圖渲染
const floorsData = { A: [], B: [], C: [] };
for (let f = 9; f >= 2; f--) floorsData.A.push({ floor: f, units: [`A1-${f}F`, `A2-${f}F`] });
floorsData.A.push({ floor: 1, units: ['A1-1F'] });

for (let f = 14; f >= 2; f--) {
  const ids = [];
  for (let u = 1; u <= 4; u++) ids.push(`B${u}-${f}F`);
  floorsData.B.push({ floor: f, units: ids });
}

for (let f = 14; f >= 3; f--) {
  const ids = [];
  for (let u = 1; u <= 3; u++) ids.push(`C${u}-${f}F`);
  floorsData.C.push({ floor: f, units: ids });
}
floorsData.C.push({ floor: 2, units: ['C2-2F', 'C3-2F'] });

// --- 狀態管理 ---
const currentYear = ref(new Date().getFullYear());
const saveName = ref(`${currentYear.value} 年度輪值抽籤`);
const isDrawing = ref(false);
const showOverlay = ref(false);
const isSaving = ref(false);
const cloudMsg = reactive({ text: '', type: 'info', timer: null });
const statusMessage = ref('');
const tableTimestamp = ref('');

// 儲存實際抽籤結果的陣列
const drawResults = reactive({ A: [], B: [], C: [] });

// 供建築圖格子綁定使用（會慢慢變色出現）: { 'A1-5F': 1, 'B2-4F': 5 ... }
const drawnUnits = reactive({ A: {}, B: {}, C: {} });

const historyRecords = ref([]);
const isLoadingHistory = ref(false);
const historyError = ref('');

const hasResults = computed(() => drawResults.A.length > 0 || drawResults.B.length > 0 || drawResults.C.length > 0);

// --- 方法 ---
onMounted(() => {
  if (APPS_SCRIPT_URL) loadCloudHistory();
  loadSavedResult();
});

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function startDraw() {
  if (isDrawing.value) return;
  isDrawing.value = true;
  showOverlay.value = true;
  
  // 清空目前的顯示
  ['A', 'B', 'C'].forEach(b => {
    drawnUnits[b] = {};
    drawResults[b] = [];
  });
  
  setTimeout(() => {
    const results = {
      A: shuffleArray(ALL_UNITS.A),
      B: shuffleArray(ALL_UNITS.B),
      C: shuffleArray(ALL_UNITS.C)
    };
    
    showOverlay.value = false;
    isDrawing.value = false;
    
    // 設定最終結果表格
    drawResults.A = results.A;
    drawResults.B = results.B;
    drawResults.C = results.C;
    
    const now = new Date();
    tableTimestamp.value = `抽籤時間：${now.getFullYear()}/${String(now.getMonth()+1).padStart(2,'0')}/${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    statusMessage.value = `✅ 抽籤完成！A棟 ${results.A.length} 戶 ／ B棟 ${results.B.length} 戶 ／ C棟 ${results.C.length} 戶`;
    
    saveLocalResult(results, now.toISOString());
    
    // 執行大樓格子動畫 (利用 setTimeout 逐漸塞入 drawnUnits)
    ['A', 'B', 'C'].forEach(building => {
      const baseDelay = { A: 0, B: 50, C: 100 }[building] || 0;
      results[building].forEach((unit, index) => {
        setTimeout(() => {
          drawnUnits[building][unit.id] = index + 1;
        }, baseDelay + Math.min(index * 18, 2400) + Math.random() * 60);
      });
    });
    
  }, 2200);
}

function clearDraw() {
  ['A', 'B', 'C'].forEach(b => {
    drawnUnits[b] = {};
    drawResults[b] = [];
  });
  statusMessage.value = '';
  localStorage.removeItem('dutyDrawResult');
}

function printPage() {
  window.print();
}

function getRankLevel(rank) {
  if (rank === 1) return '1';
  if (rank === 2) return '2';
  if (rank === 3) return '3';
  return 'other';
}

function getNote(rank) {
  if (rank === 1) return '🥇 第一順位委員';
  if (rank === 2) return '🥈 第二順位委員';
  if (rank === 3) return '🥉 第三順位委員';
  return '';
}

function saveLocalResult(results, timestamp) {
  try {
    localStorage.setItem('dutyDrawResult', JSON.stringify({ results, timestamp }));
  } catch(e) {}
}

function loadSavedResult() {
  try {
    const saved = localStorage.getItem('dutyDrawResult');
    if (!saved) return;
    const { results, timestamp } = JSON.parse(saved);
    if (!results || !results.A || results.A.length === 0) return;

    ['A', 'B', 'C'].forEach(b => {
      drawResults[b] = results[b] || [];
      drawResults[b].forEach((unit, index) => {
        drawnUnits[b][unit.id] = index + 1;
      });
    });

    const d = new Date(timestamp);
    tableTimestamp.value = `抽籤時間：${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}（已儲存記錄）`;
    statusMessage.value = `✅ 已載入本機記錄（A棟 ${results.A.length} 戶 ／ B棟 ${results.B.length} 戶 ／ C棟 ${results.C.length} 戶）`;
  } catch(e) {}
}

// --- 雲端互動 ---
function showMsg(text, type = 'info') {
  cloudMsg.text = text;
  cloudMsg.type = type;
  clearTimeout(cloudMsg.timer);
  cloudMsg.timer = setTimeout(() => { cloudMsg.text = ''; }, 4000);
}

async function saveToCloud() {
  if (!APPS_SCRIPT_URL) return showMsg('⚠️ 尚未設定 Apps Script URL', 'warn');
  
  isSaving.value = true;
  showMsg('☁️ 傳送資料中，請稍候...', 'info');

  try {
    const orderA = drawResults.A.map(u => u.id);
    const orderB = drawResults.B.map(u => u.id);
    const orderC = drawResults.C.map(u => u.id);

    await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      body: JSON.stringify({
        action: 'save',
        name: saveName.value || '未命名',
        year: currentYear.value,
        orderA,
        orderB,
        orderC,
        fullResults: drawResults,
        totalA: orderA.length,
        totalB: orderB.length,
        totalC: orderC.length,
      })
    });

    showMsg('☁️ 已送出，等待試算表確認...', 'success');
    setTimeout(() => loadCloudHistory(), 2000);
  } catch (e) {
    showMsg('❌ 連線失敗：' + e.message, 'error');
  } finally {
    isSaving.value = false;
  }
}

async function loadCloudHistory() {
  if (!APPS_SCRIPT_URL) return;
  
  isLoadingHistory.value = true;
  historyError.value = '';

  try {
    const resp = await fetch(`${APPS_SCRIPT_URL}?action=list`);
    const data = await resp.json();

    if (!data.success) {
      historyError.value = data.error;
    } else {
      historyRecords.value = data.records.map(r => ({ ...r, isDeleting: false }));
    }
  } catch (e) {
    historyError.value = e.message;
  } finally {
    isLoadingHistory.value = false;
  }
}

async function deleteHistoryRecord(rec) {
  if (!confirm('確定要刪除這筆記錄嗎？')) return;
  
  rec.isDeleting = true;
  try {
    await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      body: JSON.stringify({ action: 'delete', id: rec.id })
    });
    
    showMsg('🗑 刪除中，等待確認...', 'success');
    setTimeout(() => loadCloudHistory(), 1500);
  } catch (e) {
    showMsg('❌ 連線失敗', 'error');
    rec.isDeleting = false;
  }
}

function loadHistoryRecord(rec) {
  try {
    const toFullUnits = (orderStr, building) => {
      if (!orderStr) return [];
      const unitMap = {};
      ALL_UNITS[building].forEach(u => { unitMap[u.id] = u; });
      return orderStr.split(',').filter(Boolean).map(id => unitMap[id]).filter(Boolean);
    };

    const results = {
      A: toFullUnits(rec.orderA, 'A'),
      B: toFullUnits(rec.orderB, 'B'),
      C: toFullUnits(rec.orderC, 'C'),
    };
    
    if (!results.A.length && !results.B.length && !results.C.length) {
      return showMsg('❌ 無法載入記錄（資料格式不相容）', 'error');
    }

    // 立即顯示
    ['A', 'B', 'C'].forEach(b => {
      drawResults[b] = results[b];
      drawnUnits[b] = {};
      results[b].forEach((unit, index) => {
        drawnUnits[b][unit.id] = index + 1;
      });
    });

    saveLocalResult(results, new Date().toISOString());
    statusMessage.value = `☁️ 已載入雲端記錄：${rec.name}`;
    window.scrollTo({ top: document.querySelector('.results-section').offsetTop, behavior: 'smooth' });
  } catch (e) {
    showMsg('❌ 載入失敗', 'error');
  }
}

function getSeqLabel(rec) {
  return rec.seq ? `#${rec.seq}` : rec.id;
}

function getHistoryDate(rec) {
  let dateStr = rec.drawDate || '';
  if (!dateStr && rec.timestamp) {
    const d = new Date(rec.timestamp);
    dateStr = `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
  return dateStr;
}
</script>
