# RPG Maker MV 傷害公式分析儀 (RM-like Style)

一個提供給數值策劃的獨立傷害公式調試與趨勢交叉矩陣工具。採用經典的 RPG Maker MV 視窗與對話框風格。

## 📁 專案結構
- `index.html` - 進入點。雙擊即可直接在瀏覽器運行。
- `src/` - 原始碼目錄
  - `src/app.js` - 公式解析與 UI 交互
  - `src/rmmv-sim.js` - RMMV 公式執行模擬器 (提供 `VirtualBattler` 與計算沙盒)
  - `src/style.css` - 復古 RM 視窗樣式
  - `src/assets/tileset.png` - 像素草地平鋪背景

## 🚀 使用方式
直接在檔案總管中雙擊 `index.html`，即可在瀏覽器中打開使用，**無需安裝或啟動任何本地伺服器**。
