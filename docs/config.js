/**
 * Cosmos Engine VTT - Configuration Management
 * 
 * Centralized configuration for the entire application.
 * This prevents the scattered configuration issues from previous projects.
 */

export class Config {
    constructor() {
        // API endpoints
        this.api = {
            cosmosRPGRepo: 'https://raw.githubusercontent.com/magicat777/CosmosEngineRPG/main/',
            localData: '/data/',
            version: 'v0.1.0'
        };
        
        // Application settings
        this.app = {
            name: 'Cosmos Engine VTT',
            shortName: 'CosmosVTT',
            maxComponents: 10,
            autosaveInterval: 30000, // 30 seconds
            offlineMode: false
        };
        
        // UI Configuration
        this.ui = {
            theme: 'dark',
            animations: true,
            soundEffects: true,
            panelMinWidth: 300,
            panelMinHeight: 200,
            breakpoints: {
                mobile: 768,
                tablet: 1024,
                desktop: 1440
            }
        };
        
        // Dice system configuration
        this.dice = {
            base: '2d10',
            advantage: '3d10kh2', // keep highest 2
            disadvantage: '3d10kl2', // keep lowest 2
            criticalSuccess: 20,
            criticalFailure: 2
        };
        
        // Combat configuration
        this.combat = {
            defaultInitiative: '1d10',
            scales: ['Personal', 'Vehicle', 'Starship', 'Capital'],
            damageMultipliers: {
                'Personal': 1,
                'Vehicle': 10,
                'Starship': 100,
                'Capital': 1000
            }
        };
        
        // Performance settings
        this.performance = {
            maxHistoryItems: 100,
            cacheExpiry: 86400000, // 24 hours
            lazyLoadDelay: 300,
            debounceDelay: 150
        };
        
        // Load user preferences
        this.loadUserPreferences();
    }
    
    loadUserPreferences() {
        const saved = localStorage.getItem('cosmos-vtt-preferences');
        if (saved) {
            try {
                const prefs = JSON.parse(saved);
                // Safely merge preferences
                if (prefs.ui) Object.assign(this.ui, prefs.ui);
                if (prefs.app) Object.assign(this.app, prefs.app);
                if (prefs.performance) Object.assign(this.performance, prefs.performance);
            } catch (e) {
                console.error('Failed to load preferences:', e);
            }
        }
    }
    
    saveUserPreferences() {
        const prefs = {
            ui: {
                theme: this.ui.theme,
                animations: this.ui.animations,
                soundEffects: this.ui.soundEffects
            },
            app: {
                offlineMode: this.app.offlineMode
            },
            performance: {
                maxHistoryItems: this.performance.maxHistoryItems
            }
        };
        
        localStorage.setItem('cosmos-vtt-preferences', JSON.stringify(prefs));
    }
    
    get(path) {
        // Get nested config value by path (e.g., 'api.cosmosRPGRepo')
        return path.split('.').reduce((obj, key) => obj?.[key], this);
    }
    
    set(path, value) {
        // Set nested config value by path
        const keys = path.split('.');
        const lastKey = keys.pop();
        const target = keys.reduce((obj, key) => obj[key] = obj[key] || {}, this);
        target[lastKey] = value;
        this.saveUserPreferences();
    }
    
    // Check if running in offline mode
    isOffline() {
        return this.app.offlineMode || !navigator.onLine;
    }
    
    // Get appropriate data source based on offline status
    getDataSource(path) {
        if (this.isOffline()) {
            return this.api.localData + path;
        }
        return this.api.cosmosRPGRepo + 'data/' + path;
    }
}