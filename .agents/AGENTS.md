# RPG Maker MV Damage Formula Analyzer Development Memo (Agent Contribution Guide)

This project is an independent RMMV damage formula debugging and analysis tool.
It adopts a Vite-like directory structure, but **resources must be referenced using relative paths (e.g., `./src/app.js`) in index.html** to support the convenience of game designers double-clicking to run the tool directly.

When modifying and extending this project in the future, please strictly adhere to the following design and implementation key points:

## 1. Core Evaluation Simulation and RMMV API Alignment
- **Virtual Battler `VirtualBattler` (located in [src/rmmv-sim.js](file:///c:/Users/charl/Code/antigravity/formula/src/rmmv-sim.js))**:
  - Supports access to both `hp` and `_hp` (private underscore) properties, recursively mapping all multi-level property chains.
  - Supports RMMV property rate methods: `hpRate()`, `mpRate()`, `tpRate()`.
  - Supports RMMV trait determination methods: `elementRate(elementId)`, `debuffRate(paramId)`, `stateRate(stateId)` (corresponding to `%` sliders on the UI, and automatically converted to a decimal multiplier of `0.0~3.0` when executed within the formula).
- **State Determination `isStateAffected(stateId)`**:
  - When parsed in a formula, the UI must automatically generate a boolean **Checkbox** (instead of a Slider) for two-way binding. It automatically returns `true`/`false` during formula execution.
- **`item` (Skill/Item) Object**:
  - The `item` virtual object has been injected, supporting properties such as `item.mpCost`, and specifically supporting long-path property chains like `item.damage.elementId`.

## 2. Regex Pitfall Prevention Guide (Variable Parsing)
- **Avoid Overwriting Methods**: When parsing properties in a formula, a negative lookahead assertion `(?!\()` must be used to exclude method calls (e.g., `b.elementRate`). Otherwise, they will be mistaken for ordinary variable properties, which will then overwrite the functions themselves when sliders are adjusted, causing `is not a function` errors during execution.
- **Regex Design Examples**:
  - Property chain extraction: `/\b([ab]|item)\.([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)\b(?!\()/g`
  - Method extraction: `/\b([ab])\.(elementRate|debuffRate|stateRate|isStateAffected)\((\d+)\)/g`

## 3. UI/UX and Styling Pitfall Prevention (PrismJS Syntax Highlighting Alignment)
- **Precise Syntax Highlighting Alignment**:
  - The transparent `textarea` and the highlighting layer `pre` (with class `.editor-highlight`) must overlap perfectly.
  - Their `font-family`, `font-size` (14px), `line-height` (1.6), `white-space` (pre-wrap !important), `word-wrap` (break-word !important), `word-break` (break-all !important), and `padding` (14px 16px) **must be absolutely identical**.
  - **Important Pitfall Prevention**: Prism's CSS has default styles for `pre[class*="language-"]`. When resetting styles, do not set its padding to `0 !important`, otherwise it will break the custom padding on `.editor-highlight`, causing the highlighted text to misalign to the top-left.
