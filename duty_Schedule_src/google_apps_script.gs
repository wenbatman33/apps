/**
 * 欣聯大心社區委員輪值抽籤系統
 * Google Apps Script 後端 API
 *
 * 【新功能】每次儲存都會建立一個與網頁相同排版的獨立「輪值表」分頁供查看與列印，
 *          並在「輪值總覽」中建立索引供歷史記錄讀取。
 *
 * 部署步驟：
 * 1. 試算表 → 擴充功能 → Apps Script → 貼上此程式碼 → 儲存
 * 2. 部署 → 新增部署作業 → 類型：網路應用程式
 * 3. 執行身分：我 ／ 存取權：所有人 → 部署
 * 4. 複製 URL 貼入 app.js 的 APPS_SCRIPT_URL
 */

const INDEX_SHEET_NAME = "輪值記錄總覽";

// ---- GET：列出所有記錄 ----
function doGet(e) {
  try {
    return listRecords();
  } catch (err) {
    return jsonResponse({ success: false, error: err.message });
  }
}

// ---- POST：儲存或刪除 ----
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    if (body.action === "save") return saveRecord(body);
    if (body.action === "delete") return deleteRecord(body.id);
    return jsonResponse({ success: false, error: "未知操作" });
  } catch (err) {
    return jsonResponse({ success: false, error: err.message });
  }
}

// ---- 列出所有記錄供網頁載入 ----
function listRecords() {
  const sheet = getOrCreateIndexSheet();
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return jsonResponse({ success: true, records: [] });

  const records = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0]) continue;
    records.push({
      id: String(row[0]),
      name: String(row[1]),
      year: row[2],
      drawDate: String(row[3]),
      orderA: String(row[4]), // 逗號分隔的 ID
      orderB: String(row[5]),
      orderC: String(row[6]),
      totalA: row[7] || 0,
      totalB: row[8] || 0,
      totalC: row[9] || 0,
      tabName: row[10] || "", // 對應的試算表分頁名稱
    });
  }

  records.sort((a, b) => b.id.localeCompare(a.id));
  return jsonResponse({ success: true, records });
}

// ---- 儲存一筆記錄 ----
function saveRecord(body) {
  const sheet = getOrCreateIndexSheet();
  const seq = sheet.getLastRow();
  const id = "R" + String(seq).padStart(4, "0");

  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const drawDate = `${now.getFullYear()}/${pad(now.getMonth() + 1)}/${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;

  // 1. 動態建立美觀的「表格分頁」供人眼查看
  let tabName = "";
  if (body.fullResults) {
    tabName = createDrawSheet(
      body.name || "未命名",
      body.fullResults,
      drawDate,
    );
  }

  // 2. 將精簡資訊（ID 清單）存入總覽頁供 Web APP 讀取
  const orderA = (body.orderA || []).join(",");
  const orderB = (body.orderB || []).join(",");
  const orderC = (body.orderC || []).join(",");

  sheet.appendRow([
    id,
    body.name || "未命名",
    body.year || now.getFullYear(),
    drawDate,
    orderA,
    orderB,
    orderC,
    body.totalA || 0,
    body.totalB || 0,
    body.totalC || 0,
    tabName,
  ]);

  formatLastRow(sheet);

  return jsonResponse({
    success: true,
    id,
    message: `✅ 第 ${seq} 筆記錄已儲存（${drawDate}）`,
  });
}

// ---- 刪除一筆記錄 ----
function deleteRecord(id) {
  if (!id) return jsonResponse({ success: false, error: "缺少 ID" });
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = getOrCreateIndexSheet();
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) {
      // 刪除對應的表格分頁
      const tabName = data[i][10];
      if (tabName) {
        const targetSheet = ss.getSheetByName(tabName);
        if (targetSheet) ss.deleteSheet(targetSheet);
      }

      // 從總覽表刪除
      sheet.deleteRow(i + 1);
      return jsonResponse({
        success: true,
        message: "✅ 記錄與表格分頁已刪除",
      });
    }
  }
  return jsonResponse({ success: false, error: "找不到該記錄" });
}

// ---- 取得或建立總覽表 ----
function getOrCreateIndexSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(INDEX_SHEET_NAME);
  if (!sheet) {
    // 建立在最前面
    sheet = ss.insertSheet(INDEX_SHEET_NAME, 0);
    const headers = [
      "編號",
      "名稱",
      "年度",
      "抽籤時間",
      "A棟順序",
      "B棟順序",
      "C棟順序",
      "A棟戶數",
      "B棟戶數",
      "C棟戶數",
      "對應表格分頁",
    ];
    sheet.appendRow(headers);
    sheet
      .getRange(1, 1, 1, headers.length)
      .setBackground("#1a73e8")
      .setFontColor("#fff")
      .setFontWeight("bold")
      .setHorizontalAlignment("center");

    // 隱藏長得很醜的 ID 順序欄位 (E, F, G)，網頁讀取不受影響
    sheet.hideColumns(5, 3);
    sheet.setFrozenRows(1);

    sheet.setColumnWidth(1, 80);
    sheet.setColumnWidth(2, 200);
    sheet.setColumnWidth(4, 150);
    sheet.setColumnWidth(11, 250);
  }
  return sheet;
}

function formatLastRow(sheet) {
  const lr = sheet.getLastRow();
  const bg = lr % 2 === 0 ? "#f0f4ff" : "#ffffff";
  sheet.getRange(lr, 1, 1, 11).setBackground(bg).setVerticalAlignment("middle");
  sheet.getRange(lr, 1).setFontWeight("bold").setHorizontalAlignment("center");
  sheet.getRange(lr, 3).setHorizontalAlignment("center");
  sheet
    .getRange(lr, 8, 1, 3)
    .setHorizontalAlignment("center")
    .setNumberFormat('0"戶"');
}

// ==========================================================
// 🎨 自動繪製出與網頁下方一模一樣的三欄式結果表格！
// ==========================================================
function createDrawSheet(baseName, results, drawDate) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 建立檔名 (加上月日防重複)
  const shortDate = drawDate.replace(/[\/ :]/g, "").substring(4, 8); // 取 0306 這種格式
  let sheetName = `${baseName}(${shortDate})`;
  let counter = 1;
  while (ss.getSheetByName(sheetName)) {
    sheetName = `${baseName}(${shortDate})_${counter}`;
    counter++;
  }

  // 建立新分頁放置在總覽表之後
  const sheet = ss.insertSheet(sheetName, ss.getSheets().length);

  // --- 1. 大標題 ---
  sheet.getRange("A1").setValue(`🏢 ${baseName}`);
  sheet
    .getRange("A1:N1")
    .merge()
    .setFontSize(16)
    .setFontWeight("bold")
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle");
  sheet.setRowHeight(1, 40);

  sheet.getRange("A2").setValue(`抽籤時間：${drawDate}`);
  sheet
    .getRange("A2:N2")
    .merge()
    .setHorizontalAlignment("center")
    .setFontColor("#555555")
    .setVerticalAlignment("middle");

  // --- 2. 建立三欄表頭 ---
  // A 是 A~D, B 是 F~I, C 是 K~N，E和J為空白間距
  const headers = [
    "排序",
    "A棟戶號",
    "樓層",
    "備註",
    "",
    "排序",
    "B棟戶號",
    "樓層",
    "備註",
    "",
    "排序",
    "C棟戶號",
    "樓層",
    "備註",
  ];
  sheet.appendRow(headers);
  const hr = sheet.getRange(3, 1, 1, 14);
  hr.setFontColor("#ffffff")
    .setFontWeight("bold")
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle");

  // 設定A、B、C棟標題顏色（對齊網頁主題色）
  sheet.getRange(3, 1, 1, 4).setBackground("#e08c2a"); // A棟橘色
  sheet.getRange(3, 6, 1, 4).setBackground("#3687e0"); // B棟藍色
  sheet.getRange(3, 11, 1, 4).setBackground("#41ba8a"); // C棟綠色
  // 設定間距背景色
  sheet.getRange(3, 5).setBackground("#ffffff");
  sheet.getRange(3, 10).setBackground("#ffffff");

  // --- 3. 準備資料列 ---
  const A = results.A || [];
  const B = results.B || [];
  const C = results.C || [];
  const maxRows = Math.max(A.length, B.length, C.length);
  const rows = [];

  const getNote = (rank) => {
    if (rank === 1) return "🥇 第一順位";
    if (rank === 2) return "🥈 第二順位";
    if (rank === 3) return "🥉 第三順位";
    return "";
  };

  for (let i = 0; i < maxRows; i++) {
    const row = [];

    // A棟
    if (i < A.length)
      row.push(i + 1, A[i].label, A[i].floor + "樓", getNote(i + 1));
    else row.push("", "", "", "");
    row.push(""); // E欄間距

    // B棟
    if (i < B.length)
      row.push(i + 1, B[i].label, B[i].floor + "樓", getNote(i + 1));
    else row.push("", "", "", "");
    row.push(""); // J欄間距

    // C棟
    if (i < C.length)
      row.push(i + 1, C[i].label, C[i].floor + "樓", getNote(i + 1));
    else row.push("", "", "", "");

    rows.push(row);
  }

  // --- 4. 寫入資料並設定外觀 ---
  if (rows.length > 0) {
    const dataRange = sheet.getRange(4, 1, rows.length, 14);
    dataRange
      .setValues(rows)
      .setHorizontalAlignment("center")
      .setVerticalAlignment("middle");

    // 背景交替色
    for (let r = 0; r < rows.length; r++) {
      if (r % 2 !== 0) {
        // A棟
        sheet.getRange(4 + r, 1, 1, 4).setBackground("#fff8f0");
        // B棟
        sheet.getRange(4 + r, 6, 1, 4).setBackground("#f0f7ff");
        // C棟
        sheet.getRange(4 + r, 11, 1, 4).setBackground("#f0fff9");
      }
    }

    // 加前三名特別樣式 (粗體、黃底)
    if (maxRows >= 3) {
      sheet.getRange(4, 1, 3, 4).setFontWeight("bold");
      sheet.getRange(4, 6, 3, 4).setFontWeight("bold");
      sheet.getRange(4, 11, 3, 4).setFontWeight("bold");
    }

    // 加框線
    sheet
      .getRange(3, 1, rows.length + 1, 4)
      .setBorder(
        true,
        true,
        true,
        true,
        true,
        true,
        "#aaaaaa",
        SpreadsheetApp.BorderStyle.SOLID,
      );
    sheet
      .getRange(3, 6, rows.length + 1, 4)
      .setBorder(
        true,
        true,
        true,
        true,
        true,
        true,
        "#aaaaaa",
        SpreadsheetApp.BorderStyle.SOLID,
      );
    sheet
      .getRange(3, 11, rows.length + 1, 4)
      .setBorder(
        true,
        true,
        true,
        true,
        true,
        true,
        "#aaaaaa",
        SpreadsheetApp.BorderStyle.SOLID,
      );
  }

  // --- 5. 調整欄寬 ---
  // A棟: 1=排序, 2=戶號, 3=樓層, 4=備註, 5=間隙
  const colWidths = [
    50,
    80,
    50,
    110,
    20, // A
    50,
    80,
    50,
    110,
    20, // B
    50,
    80,
    50,
    110, // C
  ];
  for (let i = 0; i < colWidths.length; i++) {
    sheet.setColumnWidth(i + 1, colWidths[i]);
  }

  sheet.setFrozenRows(3);
  return sheetName;
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(
    ContentService.MimeType.JSON,
  );
}
