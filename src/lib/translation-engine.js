export class TranslationEngine {
    constructor() {
        this.translations = {};
        this.currentLanguage = 'en';
    }

    async init(defaultLang = 'en') {
        console.log('TranslationEngine init called with defaultLang:', defaultLang);
        
        // 1. Always load English as the ultimate fallback.
        await this.loadLanguage('en');

        // 2. Determine the user's preferred language.
        // Prioritize the defaultLang parameter (from URL) over stored preferences
        const userLang = defaultLang || localStorage.getItem('selectedLanguage') || navigator.language.split('-')[0] || 'en';
        
        console.log('TranslationEngine using language:', userLang);
        
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
            console.log(`Language ${lang} already loaded`);
            return; // Already loaded
        }
        try {
            const url = `/translations/${lang}.json?v=${new Date().getTime()}`;
            console.log(`Loading language ${lang} from:`, url);
            const response = await fetch(url, { 
                cache: 'no-cache',  // Force no cache
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache'
                }
            });
            if (!response.ok) throw new Error(`Failed to load ${lang}.json: ${response.status} ${response.statusText}`);
            const data = await response.json();
            this.translations[lang] = data;
            console.log(`Successfully loaded ${lang} with ${Object.keys(data).length} top-level keys`);
        } catch (error) {
            console.error(`Error loading language ${lang}:`, error);
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
            
            // Debug missing keys
            if (value === undefined) {
                console.log(`Translation missing for key: ${key} in language: ${this.currentLanguage}`);
                if (key.includes('results.dimensions')) {
                    console.log(`DEBUG: Current language translations for results:`, this.translations[this.currentLanguage]?.results);
                    console.log(`DEBUG: English translations for results:`, this.translations['en']?.results);
                }
            }
        }

        // If still not found, return the key itself as a fallback.
        return value || key;
    }

    // Expose the full translations object for the current language
    getTranslations() {
        return this.translations[this.currentLanguage] || this.translations['en'] || {};
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

// The engine is now initialized and managed by TranslationProvider.tsx
