// 模擬 RMMV 的基本變數結構與預設值
const defaultBattlerParam = {
    mhp: 1000, mmp: 100, atk: 100, def: 50, mat: 100, mdf: 50, agi: 50, luk: 50, hp: 1000, mp: 100, tp: 0, level: 1
};

// 模擬 RMMV 技能或道具的常用屬性
const defaultItemParam = {
    mpCost: 0,
    tpCost: 0,
    tpGain: 0,
    successRate: 100,
    repeats: 1,
    speed: 0
};

// Worker 執行代碼 (包含獨立沙盒環境)
const workerCode = `
const defaultBattlerParam = {
    mhp: 1000, mmp: 100, atk: 100, def: 50, mat: 100, mdf: 50, agi: 50, luk: 50, hp: 1000, mp: 100, tp: 0, level: 1
};

class VirtualBattler {
    constructor(subject, varContext) {
        Object.assign(this, defaultBattlerParam);
        
        this._subject = subject; // 'a' 或 'b'
        this._varContext = varContext;

        Object.keys(varContext).forEach(key => {
            if (key.startsWith(subject + '.')) {
                const path = key.split('.');
                let obj = this;
                for (let i = 1; i < path.length - 1; i++) {
                    const part = path[i];
                    if (!obj[part]) obj[part] = {};
                    obj = obj[part];
                }
                const leaf = path[path.length - 1];
                const val = varContext[key].value;
                obj[leaf] = val;
                obj['_' + leaf] = val;
            }
        });
        
        Object.keys(defaultBattlerParam).forEach(param => {
            if (this[param] !== undefined) {
                this['_' + param] = this[param];
            }
        });
    }

    hpRate() { return this.mhp > 0 ? this.hp / this.mhp : 0; }
    mpRate() { return this.mmp > 0 ? this.mp / this.mmp : 0; }
    tpRate() { return this.tp / 100; }

    isStateAffected(stateId) {
        const key = this._subject + '.isStateAffected(' + stateId + ')';
        return this._varContext[key] !== undefined ? !!this._varContext[key].value : false;
    }
    
    isDead() { return this.isStateAffected(1); }
    isAlive() { return !this.isDead(); }

    elementRate(elementId) {
        const key = this._subject + '.elementRate(' + elementId + ')';
        const val = this._varContext[key] !== undefined ? this._varContext[key].value : 100;
        return val / 100;
    }

    debuffRate(paramId) {
        const key = this._subject + '.debuffRate(' + paramId + ')';
        const val = this._varContext[key] !== undefined ? this._varContext[key].value : 100;
        return val / 100;
    }

    stateRate(stateId) {
        const key = this._subject + '.stateRate(' + stateId + ')';
        const val = this._varContext[key] !== undefined ? this._varContext[key].value : 100;
        return val / 100;
    }
}

function evalFormulaWithContext(formula, varContext, isCritical = false, variance = 0) {
    const a = new VirtualBattler('a', varContext);
    const b = new VirtualBattler('b', varContext);
    
    // 使用 Proxy 來包裝 v，當讀取不存在的屬性時回傳 0，符合 RMMV 預設值
    const v = new Proxy({}, {
        get: (target, name) => {
            return name in target ? target[name] : 0;
        }
    });
    
    const item = {
        damage: {
            critical: isCritical,
            variance: variance,
            elementId: 0,
            type: 1
        },
        mpCost: 0,
        tpCost: 0,
        tpGain: 0,
        successRate: 100,
        repeats: 1,
        speed: 0
    };

    Object.keys(varContext).forEach(key => {
        if (key.startsWith('item.')) {
            const path = key.split('.');
            let obj = item;
            for (let i = 1; i < path.length - 1; i++) {
                const part = path[i];
                if (!obj[part]) obj[part] = {};
                obj = obj[part];
            }
            obj[path[path.length - 1]] = varContext[key].value;
        }
        
        const ctx = varContext[key];
        if (ctx && ctx.type === 'variable') {
            v[ctx.id] = ctx.value;
        }
    });

    try {
        // 移除 $gameVariables 參數，改用精簡的 v
        const f = new Function('a', 'b', 'v', 'item', 'return ' + formula + ';');
        const baseResult = f(a, b, v, item);
        return isNaN(baseResult) ? 0 : Math.max(baseResult, 0);
    } catch (e) {
        throw e;
    }
}

self.onmessage = function(e) {
    const { reqId, formula, varContext, isCritical, variance } = e.data;
    try {
        const result = evalFormulaWithContext(formula, varContext, isCritical, variance);
        self.postMessage({ reqId, success: true, result });
    } catch (err) {
        self.postMessage({ reqId, success: false, error: err.message });
    }
};
`;

// 使用 Blob URL 初始化 Web Worker 以防止本地 CORS 安全錯誤
const blob = new Blob([workerCode], { type: 'application/javascript' });
const worker = new Worker(URL.createObjectURL(blob));

let currentReqId = 0;
const pendingPromises = {};

worker.onmessage = function(e) {
    const { reqId, success, result, error } = e.data;
    if (pendingPromises[reqId]) {
        if (success) {
            pendingPromises[reqId].resolve(result);
        } else {
            pendingPromises[reqId].reject(new Error(error));
        }
        delete pendingPromises[reqId];
    }
};

// 異步公式執行介面
function evalFormulaWithContextAsync(formula, varContext, isCritical = false, variance = 0) {
    return new Promise((resolve, reject) => {
        const reqId = ++currentReqId;
        pendingPromises[reqId] = { resolve, reject };
        worker.postMessage({ reqId, formula, varContext, isCritical, variance });
    });
}
