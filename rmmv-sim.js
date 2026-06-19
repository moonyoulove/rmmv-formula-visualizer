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

// 虛擬戰鬥員類別，模擬 RMMV 的屬性與方法
class VirtualBattler {
    constructor(subject, varContext) {
        // 載入預設基本屬性
        Object.assign(this, defaultBattlerParam);
        
        this._subject = subject; // 'a' 或 'b'
        this._varContext = varContext;

        // 遞迴映射變數快照中設定的所有多級屬性鏈 (hp, mp 等，並同時映射帶底線的私有變數以防萬一)
        Object.keys(varContext).forEach(key => {
            if (key.startsWith(`${subject}.`)) {
                const path = key.split('.'); // ['a', 'atk']
                let obj = this;
                for (let i = 1; i < path.length - 1; i++) {
                    const part = path[i];
                    if (!obj[part]) obj[part] = {};
                    obj = obj[part];
                }
                const leaf = path[path.length - 1];
                const val = varContext[key].value;
                obj[leaf] = val;
                
                // 同時設定底線私有屬性，如 _hp
                obj[`_${leaf}`] = val;
            }
        });
        
        // 確保基本屬性即使沒被公式用到，私有屬性也同步存在
        Object.keys(defaultBattlerParam).forEach(param => {
            if (this[param] !== undefined) {
                this[`_${param}`] = this[param];
            }
        });
    }

    // 比例方法模擬 (RMMV 常用)
    hpRate() { return this.mhp > 0 ? this.hp / this.mhp : 0; }
    mpRate() { return this.mmp > 0 ? this.mp / this.mmp : 0; }
    tpRate() { return this.tp / 100; } // maxTp 預設為 100

    // 是否受特定狀態影響
    isStateAffected(stateId) {
        const key = `${this._subject}.isStateAffected(${stateId})`;
        return this._varContext[key] !== undefined ? !!this._varContext[key].value : false;
    }
    
    isDead() { return this.isStateAffected(1); } // 死亡狀態為 1
    isAlive() { return !this.isDead(); }

    // 屬性有效度模擬
    elementRate(elementId) {
        const key = `${this._subject}.elementRate(${elementId})`;
        const val = this._varContext[key] !== undefined ? this._varContext[key].value : 100;
        return val / 100;
    }

    // 弱化有效度模擬
    debuffRate(paramId) {
        const key = `${this._subject}.debuffRate(${paramId})`;
        const val = this._varContext[key] !== undefined ? this._varContext[key].value : 100;
        return val / 100;
    }

    // 狀態有效度模擬
    stateRate(stateId) {
        const key = `${this._subject}.stateRate(${stateId})`;
        const val = this._varContext[key] !== undefined ? this._varContext[key].value : 100;
        return val / 100;
    }
}

// 核心計算：還原 RMMV 的 Game_Action.prototype.evalDamageFormula
function evalFormulaWithContext(formula, varContext, isCritical = false, variance = 0) {
    // 建立虛擬的 a, b 物件
    const a = new VirtualBattler('a', varContext);
    const b = new VirtualBattler('b', varContext);
    const v = {};
    
    // 建立虛擬的 item 物件
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

    // 遞迴映射變數快照中以 item. 開頭的屬性鏈
    Object.keys(varContext).forEach(key => {
        if (key.startsWith('item.')) {
            const path = key.split('.'); // ['item', 'damage', 'elementId'] 或 ['item', 'mpCost']
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

    // 模擬核心腳本中的 $gameVariables.value(id)
    const $gameVariables = {
        value: function(id) { return v[id] || 0; }
    };

    try {
        // 還原 RMMV 的執行環境
        const f = new Function('a', 'b', 'v', 'item', '$gameVariables', `return ${formula};`);
        const baseResult = f(a, b, v, item, $gameVariables);
        return isNaN(baseResult) ? 0 : Math.max(baseResult, 0);
    } catch (e) {
        throw e;
    }
}
