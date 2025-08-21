class TranslationEngine {
    constructor() {
        this.translations = {};
        this.currentLanguage = 'en';
    }

    async init(defaultLang = 'en') {
        // 1. Always load English as the ultimate fallback.
        await this.loadLanguage('en');

        // 2. Determine the user's preferred language.
        const userLang = localStorage.getItem('selectedLanguage') || navigator.language.split('-')[0] || defaultLang;
        
        // 3. Load the preferred language if it's not English.
        if (userLang !== 'en') {
            await this.loadLanguage(userLang);
        }
        this.currentLanguage = userLang;

        // 4. Apply translations to the entire document.
        this.applyAll();

        // 5. Watch for future changes to the DOM and apply translations automatically.
        this.observeDOMChanges();
    }

    async loadLanguage(lang) {
        if (this.translations[lang]) {
            return; // Already loaded
        }
        try {
            const response = await fetch(`./translations/${lang}.json?v=${new Date().getTime()}`); // Cache-busting
            if (!response.ok) throw new Error(`Failed to load ${lang}.json`);
            this.translations[lang] = await response.json();
        } catch (error) {
            console.error(error);
            // If a language fails to load, we'll fall back to English, which is already loaded.
        }
    }

    async setLanguage(lang) {
        await this.loadLanguage(lang);
        this.currentLanguage = lang;
        localStorage.setItem('selectedLanguage', lang);
        this.applyAll();
    }

    // The core translation function.
    t(key) {
        // Get the value from the current language's dictionary.
        let value = key.split('.').reduce((obj, k) => obj?.[k], this.translations[this.currentLanguage]);
        
        // If not found, fall back to English.
        if (value === undefined) {
            value = key.split('.').reduce((obj, k) => obj?.[k], this.translations['en']);
        }

        // If still not found, return the key itself as a fallback.
        return value || key;
    }

    // Apply translations to all `[data-translate]` elements in a given container.
    applyAll(container = document.body) {
        container.querySelectorAll('[data-translate]').forEach(element => {
            const key = element.getAttribute('data-translate');
            element.textContent = this.t(key);
        });
    }

    // This is the magic for handling dynamically added content.
    observeDOMChanges() {
        const observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    // When a new element is added, check if it or its children need translation.
                    if (node.nodeType === 1) { // ELEMENT_NODE
                        this.applyAll(node);
                    }
                });
            });
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }
}

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    window.i18n = new TranslationEngine();
    window.i18n.init();
});
