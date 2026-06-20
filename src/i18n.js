const i18nData = {
    "zh-TW": {
        "title": "RPG Maker MV 傷害公式視覺化工具",
        "header_title": "⚔️ RMMV 傷害公式視覺化工具",
        "card_formula_config": "傷害公式配置",
        "label_formula": "公式",
        "label_variance": "變化",
        "label_critical": "暴擊 (3.0x)",
        "card_variable_control": "公式變數動態控制",
        "label_expected_damage": "預期傷害值",
        "label_variance_range": "傷害浮動區間",
        "no_vars_detected": "公式中未偵測到 a, b, item 的屬性、方法或 v[x] 變數。",
        "error_syntax": "公式語法錯誤: ",
        "variance_range_text": "傷害浮動區間 ({variance}%): {min} ~ {max}"
    },
    "en": {
        "title": "RPG Maker MV Damage Formula Visualizer",
        "header_title": "⚔️ RMMV Formula Visualizer",
        "card_formula_config": "Formula Config",
        "label_formula": "Formula",
        "label_variance": "Variance",
        "label_critical": "Critical (3.0x)",
        "card_variable_control": "Dynamic Controls",
        "label_expected_damage": "Expected Damage",
        "label_variance_range": "Damage Variance Range",
        "no_vars_detected": "No attributes, methods of a, b, item, or v[x] variables detected.",
        "error_syntax": "Formula syntax error: ",
        "variance_range_text": "Variance Range ({variance}%): {min} ~ {max}"
    }
};

(function() {
    const defaultLocale = 'zh-TW';
    let currentLocale = localStorage.getItem('rmmv_analyzer_locale') || defaultLocale;
    if (currentLocale !== 'zh-TW' && currentLocale !== 'en') {
        currentLocale = defaultLocale;
    }

    const I18n = {
        get locale() {
            return currentLocale;
        },
        t(key, replacements = {}) {
            const dict = i18nData[currentLocale] || i18nData[defaultLocale];
            let val = dict[key] || key;
            Object.keys(replacements).forEach(placeholder => {
                val = val.replace(`{${placeholder}}`, replacements[placeholder]);
            });
            return val;
        },
        setLocale(locale) {
            if (locale === 'zh-TW' || locale === 'en') {
                currentLocale = locale;
                try {
                    localStorage.setItem('rmmv_analyzer_locale', locale);
                } catch (e) {
                    // localStorage might be unavailable in sandbox environments
                }
                this.updateDOM();
                
                // Trigger event to notify app.js to recalculate damage
                const event = new CustomEvent('localeChange', { detail: { locale } });
                window.dispatchEvent(event);
            }
        },
        updateDOM() {
            // Update title
            document.title = this.t('title');
            
            // Update all elements with data-i18n attribute
            const elements = document.querySelectorAll('[data-i18n]');
            elements.forEach(el => {
                const key = el.getAttribute('data-i18n');
                el.textContent = this.t(key);
            });
        },
        init() {
            this.updateDOM();
            
            // Bind dropdown selector
            const select = document.getElementById('langSelect');
            if (select) {
                select.value = currentLocale;
                // Prevent duplicate bindings
                select.onchange = (e) => {
                    this.setLocale(e.target.value);
                };
            }
        }
    };

    window.I18n = I18n;
    
    // Directly execute initialization as this script is loaded at the bottom of the body, meaning the DOM is already parsed
    I18n.init();
})();
