// Stores the currently parsed variable states
let activeVariables = {};
let latestCalcId = 0;

// 初始化：解析公式並綁定事件
const formulaInput = document.getElementById('formulaInput');
const highlightArea = document.getElementById('highlightArea');
const varianceInput = document.getElementById('varianceInput');
const criticalCheck = document.getElementById('criticalCheck');
const dynamicControls = document.getElementById('dynamicControls');
const errorMsg = document.getElementById('errorMsg');

// Synchronize scrolling
formulaInput.addEventListener('scroll', () => {
    const highlightPre = highlightArea.parentElement;
    highlightPre.scrollTop = formulaInput.scrollTop;
    highlightPre.scrollLeft = formulaInput.scrollLeft;
});

// Real-time update syntax highlighting
function updateHighlight() {
    let text = formulaInput.value;
    if (text[text.length - 1] === "\n") {
        text += " ";
    }
    highlightArea.textContent = text;
    Prism.highlightElement(highlightArea);
}

function parseFormula() {
    const formula = formulaInput.value;
    errorMsg.style.display = 'none';
    
    // Regex pattern capture
    // 1. Normal parameters (supports multi-level property chains, e.g., a.atk, item.mpCost, item.damage.elementId)
    // Negative lookahead assertion (?!\() avoids treating a.elementRate as a normal parameter
    const normalParamMatches = [...formula.matchAll(/\b([ab]|item)\.([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)\b(?!\()/g)];
    
    // 2. Special methods: elementRate(id), debuffRate(id), stateRate(id), isStateAffected(id)
    const methodMatches = [...formula.matchAll(/\b([ab])\.(elementRate|debuffRate|stateRate|isStateAffected)\((\d+)\)/g)];
    
    // 3. Game variables v[id]
    const gameVarMatches = [...formula.matchAll(/\bv\[(\d+)\]/g)];

    let newVars = {};

    // 1. Handle normal parameters
    normalParamMatches.forEach(match => {
        const subject = match[1]; // 'a', 'b', 或 'item'
        const paramPath = match[2]; // 'atk', 'damage.elementId' 等
        const key = `${subject}.${paramPath}`;
        
        let defaultVal = 10;
        
        if (subject === 'item') {
            // Read default values for skills/items
            if (paramPath.startsWith('damage.')) {
                defaultVal = 0;
            } else {
                defaultVal = defaultItemParam[paramPath] !== undefined ? defaultItemParam[paramPath] : 0;
            }
        } else {
            defaultVal = defaultBattlerParam[paramPath] !== undefined ? defaultBattlerParam[paramPath] : 10;
        }

        newVars[key] = { 
            type: 'param', 
            subject: subject, 
            paramName: paramPath, 
            label: key, // Raw variable name is used directly as the label, not translated
            value: activeVariables[key]?.value ?? defaultVal 
        };
    });

    // 2. Handle special methods
    methodMatches.forEach(match => {
        const subject = match[1];      // 'a' 或 'b'
        const methodName = match[2];   // 'elementRate', 'debuffRate' 等
        const id = parseInt(match[3]); // 參數 ID
        const key = `${subject}.${methodName}(${id})`;
        
        let defaultValue = 100;
        let valueType = 'number';
        
        if (methodName === 'isStateAffected') {
            defaultValue = false;
            valueType = 'boolean';
        }

        newVars[key] = {
            type: 'method',
            subject: subject,
            methodName: methodName,
            id: id,
            label: key, // Raw variable name is used directly as the label, not translated
            valueType: valueType,
            value: activeVariables[key]?.value ?? defaultValue
        };
    });

    // 3. Handle game variables v[x]
    gameVarMatches.forEach(match => {
        const id = match[1];
        const key = `v[${id}]`;
        newVars[key] = { 
            type: 'variable', 
            id: id, 
            label: key, 
            value: activeVariables[key]?.value ?? 0 
        };
    });

    // Redraw control elements
    renderControls(newVars);
    activeVariables = newVars;
    calculateDamage();
}

function renderControls(variables) {
    // Check if new variables need updates to avoid rebuilding and disrupting sliders during typing
    const currentKeys = Object.keys(variables).sort().join(',');
    const activeKeys = Object.keys(activeVariables).sort().join(',');
    
    if (currentKeys === activeKeys && activeKeys !== "") return;

    dynamicControls.innerHTML = '';
    
    if (Object.keys(variables).length === 0) {
        const noVarsText = window.I18n
            ? window.I18n.t('no_vars_detected')
            : '公式中未偵測到 a, b, item 的屬性、方法或 v[x] 變數。';
        dynamicControls.innerHTML = `<p style="color: var(--text-muted); font-style:italic; font-size: 13px; text-align: center; margin: 20px 0; grid-column: span 2;">${noVarsText}</p>`;
        return;
    }

    Object.keys(variables).forEach(key => {
        const v = variables[key];
        let maxRange = 999;
        let suffix = '';
        
        const group = document.createElement('div');
        group.className = 'control-group';
        
        if (v.type === 'method' && v.valueType === 'boolean') {
            // Boolean type (e.g., isStateAffected), rendered as a Checkbox
            group.innerHTML = `
                <div class="slider-row" style="padding: 4px 0;">
                    <label class="checkbox-container" style="margin-bottom:0; width: 100%;">
                        <input type="checkbox" id="checkbox_${key}" ${v.value ? 'checked' : ''}>
                        <div class="checkbox-custom"></div>
                        <span style="font-family: 'JetBrains Mono', monospace; font-size: 13px; color: var(--text-primary);">${v.label}</span>
                    </label>
                </div>
            `;
            dynamicControls.appendChild(group);

            const checkbox = group.querySelector(`#checkbox_${CSS.escape(key)}`);
            checkbox.addEventListener('change', (e) => {
                activeVariables[key].value = e.target.checked;
                calculateDamage();
            });
        } else {
            // Numeric type, rendered as Slider + Number Box
            if (v.type === 'param') {
                const name = v.paramName.toLowerCase();
                if (name.includes('successrate') || name.includes('variance')) {
                    maxRange = 100;
                } else if (name.includes('hp') || name.includes('mp')) {
                    maxRange = 9999;
                } else {
                    maxRange = 999;
                }
            } else if (v.type === 'variable') {
                maxRange = 5000;
            } else if (v.type === 'method') {
                maxRange = 1000;
                suffix = '%';
            }
            
            group.innerHTML = `
                <div class="control-header">
                    <label class="control-label" for="slider_${key}">${v.label}</label>
                </div>
                <div class="slider-row">
                    <input type="range" id="slider_${key}" min="0" max="${maxRange}" value="${v.value}">
                    <div style="display:flex; align-items:center; gap:4px;">
                        <input type="number" id="num_${key}" class="value-box" min="0" max="${maxRange}" value="${v.value}" aria-label="${v.label} 精確數值">
                        ${suffix ? `<span style="font-size:12px; color:var(--text-secondary); width:12px;">${suffix}</span>` : ''}
                    </div>
                </div>
                <div class="quick-adjust-row">
                    <button type="button" class="btn-adjust" data-delta="-100" aria-label="${v.label} 減少 100">-100</button>
                    <button type="button" class="btn-adjust" data-delta="-10" aria-label="${v.label} 減少 10">-10</button>
                    <button type="button" class="btn-adjust" data-delta="10" aria-label="${v.label} 增加 10">+10</button>
                    <button type="button" class="btn-adjust" data-delta="100" aria-label="${v.label} 增加 100">+100</button>
                </div>
            `;
            dynamicControls.appendChild(group);

            const slider = group.querySelector(`#slider_${CSS.escape(key)}`);
            const num = group.querySelector(`#num_${CSS.escape(key)}`);

            function update(val) {
                let n = parseInt(val) || 0;
                if(n < 0) n = 0;
                if(n > maxRange) n = maxRange;
                slider.value = n;
                num.value = n;
                activeVariables[key].value = n;
                calculateDamage();
            }

            slider.addEventListener('input', (e) => update(e.target.value));
            num.addEventListener('input', (e) => update(e.target.value));

            const adjustBtns = group.querySelectorAll('.btn-adjust');
            adjustBtns.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const delta = parseInt(e.target.getAttribute('data-delta'));
                    update(activeVariables[key].value + delta);
                });
            });
        }
    });
}

function calculateDamage() {
    const formula = formulaInput.value;
    if (!formula.trim()) return;

    const variance = parseFloat(varianceInput.value) || 0;
    const isCritical = criticalCheck.checked;
    
    const calcId = ++latestCalcId;

    evalFormulaWithContextAsync(formula, activeVariables, isCritical, variance)
        .then(baseDamage => {
            if (calcId !== latestCalcId) return;

            if (errorMsg) {
                errorMsg.style.display = 'none';
            }

            // Calculate critical damage (restore Game_Action.prototype.applyCritical)
            const critDamage = isCritical ? baseDamage * 3 : baseDamage;

            // Calculate variance float (restore Game_Action.prototype.applyVariance)
            const amp = Math.floor(Math.max(Math.abs(critDamage) * variance / 100, 0));
            const minDamage = Math.max(Math.round(critDamage - amp), 0);
            const maxDamage = Math.max(Math.round(critDamage + amp), 0);

            // Update UI (use separate resultValue and resultRange to avoid DOM destruction caused by innerHTML overwriting)
            const resultValue = document.getElementById('resultValue');
            if (resultValue) {
                resultValue.innerText = Math.round(critDamage);
            }
            const resultRange = document.getElementById('resultRange');
            if (resultRange) {
                const rangeText = window.I18n
                    ? window.I18n.t('variance_range_text', { variance, min: minDamage, max: maxDamage })
                    : `傷害浮動區間 (${variance}%): ${minDamage} ~ ${maxDamage}`;
                resultRange.innerText = rangeText;
            }
        })
        .catch(err => {
            if (calcId !== latestCalcId) return;
            if (errorMsg) {
                const errorPrefix = window.I18n ? window.I18n.t('error_syntax') : '公式語法錯誤: ';
                errorMsg.innerText = `${errorPrefix}${err.message}`;
                errorMsg.style.display = 'block';
            }
        });
}

// Event listener setup
formulaInput.addEventListener('input', () => {
    updateHighlight();
    parseFormula();
});
varianceInput.addEventListener('input', calculateDamage);
criticalCheck.addEventListener('change', calculateDamage);

// Execute on initial page load
updateHighlight();
parseFormula();

// Listen for localeChange events to recalculate damage and update UI messages in real-time
window.addEventListener('localeChange', () => {
    calculateDamage();
});
