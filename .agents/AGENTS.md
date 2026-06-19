# RPG Maker MV 傷害公式分析儀開發備忘錄 (Agent 貢獻指南)

本專案為一個獨立的 RMMV 傷害公式調試與分析工具。
採用 Vite-like 目錄結構，但**必須在 index.html 中以相對路徑（如 `./src/app.js`）引用資源**，以支援數值策劃雙擊即可直接運行的便利性。

未來修改與擴充此專案時，請嚴格遵守以下設計與實現重點：

## 1. 核心評估模擬與 RMMV API 對齊
- **虛擬戰鬥員 `VirtualBattler` (位於 [src/rmmv-sim.js](file:///c:/Users/charl/Code/antigravity/formula/src/rmmv-sim.js))**：
  - 同時支援 `hp` 與 `_hp`（私有底線）等屬性的存取，遞迴映射所有多級屬性鏈。
  - 支援 RMMV 屬性比例方法：`hpRate()`、`mpRate()`、`tpRate()`。
  - 支援 RMMV 特質判定方法：`elementRate(elementId)`、`debuffRate(paramId)`、`stateRate(stateId)`（在 UI 上對應 `%` 滑桿，並在公式內自動轉換為 `0.0~3.0` 的小數倍率）。
- **狀態判定 `isStateAffected(stateId)`**：
  - 在公式中被解析時，UI 必須自動生成一個布林值的 **Checkbox**（而非 Slider）進行雙向聯動，公式內執行時自動返回 `true`/`false`。
- **`item`（技能/道具）物件**：
  - 已注入 `item` 虛擬物件，支援 `item.mpCost` 等屬性，並特別支援像 `item.damage.elementId` 這樣的長路徑屬性鏈。

## 2. 正則表達式防坑指南 (變數解析)
- **避免覆蓋方法**：解析公式中的屬性時，必須使用負向先行斷言 `(?!\)` 排除方法呼叫（如 `b.elementRate`），否則會將其誤認作普通變數屬性，進而在 Slider 調整時覆蓋掉函數本身，導致執行時拋出 `is not a function` 錯誤。
- **正則設計範例**：
  - 屬性鏈提取：`/\b([ab]|item)\.([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)\b(?!\()/g`
  - 方法提取：`/\b([ab])\.(elementRate|debuffRate|stateRate|isStateAffected)\((\d+)\)/g`

## 3. UI/UX 與樣式防坑 (PrismJS 語法高亮對齊)
- **語法高亮精確重合**：
  - 透明 `textarea` 與高亮層 `pre` (Class 為 `.editor-highlight`) 必須完全重合。
  - 兩者的 `font-family`, `font-size` (14px), `line-height` (1.6), `white-space` (pre-wrap !important), `word-wrap` (break-word !important), `word-break` (break-all !important) 與 `padding` (14px 16px) **必須絕對一致**。
  - **重要防坑**：Prism 的 CSS 對 `pre[class*="language-"]` 有預設樣式。重設樣式時不可將其 padding 設為 `0 !important`，否則會破壞 `.editor-highlight` 上的 custom padding，導致高亮層文字往左上錯位。
