# RPG Maker MV 傷害公式可視化工具開發備忘錄 (下一個 Agent 注意事項)

當前專案只有一個核心 HTML 檔案：[formula-visualize.html](file:///c:/Users/charl/Code/antigravity/formula/formula-visualize.html)，為一個提供給數值策劃的獨立傷害公式調試與趨勢交叉矩陣工具。

未來修改與擴充此專案時，請嚴格遵守以下設計與實現重點：

## 1. 核心評估模擬與 RMMV API 對齊
- **虛擬戰鬥員 `VirtualBattler`**：
  - 必須同時支援 `hp` 與 `_hp`（私有底線）等屬性的存取，預設會遞迴映射所有多級屬性鏈。
  - 支援 RMMV 的屬性比例方法：`hpRate()`、`mpRate()`、`tpRate()`。
  - 支援 RMMV 的特質判定方法：`elementRate(elementId)`、`debuffRate(paramId)`、`stateRate(stateId)`（在 UI 上對應 `%` 滑桿，並在公式內自動轉換為 `0.0~3.0` 的小數倍率）。
- **狀態判定 `isStateAffected(stateId)`**：
  - 此方法在公式中被解析時，UI 必須自動生成一個布林值的 **Checkbox**（而非 Slider）進行雙向聯動，公式內執行時自動返回 `true`/`false`。
- **`item`（技能/道具）物件**：
  - 公式執行環境中已注入 `item` 虛擬物件，支援 `item.mpCost` 等屬性，並特別支援像 `item.damage.elementId` 這樣的長路徑屬性鏈。

## 2. 正則表達式防坑指南 (變數解析)
- **避免覆蓋方法**：解析公式中的屬性時，必須使用負向先行斷言 `(?!\)` 排除方法呼叫（如 `b.elementRate`），否則會將其誤認作普通變數屬性，進而在 Slider 調整時覆蓋掉函數本身，導致執行時拋出 `is not a function` 錯誤。
- **正則設計範例**：
  - 屬性鏈提取：`/\b([ab]|item)\.([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)\b(?!\()/g`
  - 方法提取：`/\b([ab])\.(elementRate|debuffRate|stateRate|isStateAffected)\((\d+)\)/g`

## 3. UI/UX 與樣式約束 (Linear.app / Vercel 美學)
- **語法高亮精確重合 (PrismJS)**：
  - 透明 `textarea` 與高亮層 `pre` (Class 為 `.editor-highlight`) 必須完全重合。
  - 兩者的 `font-family`, `font-size` (14px), `line-height` (1.6), `white-space` (pre-wrap !important), `word-wrap` (break-word !important), `word-break` (break-all !important) 與 `padding` (14px 16px) **必須絕對一致**。
  - **重要防坑**：Prism 的 CSS 對 `pre[class*="language-"]` 有預設樣式。重設樣式時不可將其 padding 設為 `0 !important`，否則會破壞 `.editor-highlight` 上的 custom padding，導致高亮層文字往左上錯位。
- **滑桿面板 (Grid 雙排)**：
  - 調節面板採用 `grid` 雙排佈局以節省空間。為了使視覺對稱，右側的矩陣卡片設有 `align-self: start;`，使其依 5x5 表格高度自適應收縮，不要強行拉伸產生大片空白。
- **微調輸入框**：
  - 數值微調框 `.value-box` 寬度設為 `76px` 且 `text-align: center`，使輸入框中的微調小箭頭與數值之間保留合適的視覺距離。
- **變數 Label**：
  - Slider 標題直接展示原生的公式代碼（如 `item.successRate`），不翻譯成中文，保持極客簡潔感。
