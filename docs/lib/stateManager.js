/**
 * StateManager - Shared state management for VTT components
 * 
 * Provides a centralized state store that components can subscribe to
 * for reactive updates. Implements a simple pub/sub pattern with
 * automatic persistence to localStorage.
 */

export class StateManager {
    constructor() {
        this.state = new Map();
        this.subscribers = new Map();
        this.storageKey = 'cosmos-vtt-state';
        
        // State categories
        this.stateCategories = {
            character: 'character',
            combat: 'combat',
            campaign: 'campaign',
            settings: 'settings',
            session: 'session'
        };
        
        // Load persisted state
        this.loadState();
        
        // Bind methods
        this.subscribe = this.subscribe.bind(this);
        this.unsubscribe = this.unsubscribe.bind(this);
        this.setState = this.setState.bind(this);
        this.getState = this.getState.bind(this);
    }
    
    /**
     * Subscribe to state changes
     * @param {string} key - State key to watch
     * @param {Function} callback - Function to call on state change
     * @returns {Function} Unsubscribe function
     */
    subscribe(key, callback) {
        if (!this.subscribers.has(key)) {
            this.subscribers.set(key, new Set());
        }
        
        this.subscribers.get(key).add(callback);
        
        // Return unsubscribe function
        return () => this.unsubscribe(key, callback);
    }
    
    /**
     * Unsubscribe from state changes
     * @param {string} key - State key
     * @param {Function} callback - Callback to remove
     */
    unsubscribe(key, callback) {
        if (this.subscribers.has(key)) {
            this.subscribers.get(key).delete(callback);
        }
    }
    
    /**
     * Set state value
     * @param {string} key - State key
     * @param {*} value - New value
     * @param {boolean} persist - Whether to persist to localStorage
     */
    setState(key, value, persist = true) {
        const oldValue = this.state.get(key);
        this.state.set(key, value);
        
        // Notify subscribers
        if (this.subscribers.has(key)) {
            this.subscribers.get(key).forEach(callback => {
                try {
                    callback(value, oldValue, key);
                } catch (error) {
                    console.error('Error in state subscriber:', error);
                }
            });
        }
        
        // Persist if requested
        if (persist) {
            this.saveState();
        }
    }
    
    /**
     * Get state value
     * @param {string} key - State key
     * @param {*} defaultValue - Default if key doesn't exist
     * @returns {*} State value
     */
    getState(key, defaultValue = null) {
        return this.state.has(key) ? this.state.get(key) : defaultValue;
    }
    
    /**
     * Batch update multiple state values
     * @param {Object} updates - Object with key-value pairs
     * @param {boolean} persist - Whether to persist to localStorage
     */
    setMultiple(updates, persist = true) {
        Object.entries(updates).forEach(([key, value]) => {
            this.setState(key, value, false);
        });
        
        if (persist) {
            this.saveState();
        }
    }
    
    /**
     * Get all state in a category
     * @param {string} category - Category name
     * @returns {Object} State object
     */
    getCategoryState(category) {
        const categoryState = {};
        const prefix = `${category}.`;
        
        this.state.forEach((value, key) => {
            if (key.startsWith(prefix)) {
                const subKey = key.slice(prefix.length);
                categoryState[subKey] = value;
            }
        });
        
        return categoryState;
    }
    
    /**
     * Clear all state in a category
     * @param {string} category - Category to clear
     */
    clearCategory(category) {
        const prefix = `${category}.`;
        const keysToDelete = [];
        
        this.state.forEach((value, key) => {
            if (key.startsWith(prefix)) {
                keysToDelete.push(key);
            }
        });
        
        keysToDelete.forEach(key => {
            this.state.delete(key);
            // Notify subscribers
            if (this.subscribers.has(key)) {
                this.subscribers.get(key).forEach(callback => {
                    callback(null, this.state.get(key), key);
                });
            }
        });
        
        this.saveState();
    }
    
    /**
     * Save state to localStorage
     */
    saveState() {
        try {
            const stateObj = {};
            this.state.forEach((value, key) => {
                // Only save serializable data
                if (this.isSerializable(value)) {
                    stateObj[key] = value;
                }
            });
            
            localStorage.setItem(this.storageKey, JSON.stringify(stateObj));
        } catch (error) {
            console.error('Failed to save state:', error);
        }
    }
    
    /**
     * Load state from localStorage
     */
    loadState() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            if (saved) {
                const stateObj = JSON.parse(saved);
                Object.entries(stateObj).forEach(([key, value]) => {
                    this.state.set(key, value);
                });
            }
        } catch (error) {
            console.error('Failed to load state:', error);
        }
    }
    
    /**
     * Check if value is serializable
     * @param {*} value - Value to check
     * @returns {boolean} True if serializable
     */
    isSerializable(value) {
        const type = typeof value;
        return (
            value === null ||
            type === 'boolean' ||
            type === 'number' ||
            type === 'string' ||
            (type === 'object' && (
                Array.isArray(value) ||
                value.constructor === Object
            ))
        );
    }
    
    /**
     * Export state for backup
     * @returns {Object} State object
     */
    exportState() {
        const stateObj = {};
        this.state.forEach((value, key) => {
            stateObj[key] = value;
        });
        return stateObj;
    }
    
    /**
     * Import state from backup
     * @param {Object} stateObj - State object to import
     */
    importState(stateObj) {
        // Clear existing state
        this.state.clear();
        
        // Import new state
        Object.entries(stateObj).forEach(([key, value]) => {
            this.setState(key, value, false);
        });
        
        this.saveState();
    }
    
    /**
     * Debug helper - log current state
     */
    debugState() {
        console.group('StateManager Debug');
        console.log('Current State:');
        this.state.forEach((value, key) => {
            console.log(`  ${key}:`, value);
        });
        console.log('Subscribers:');
        this.subscribers.forEach((callbacks, key) => {
            console.log(`  ${key}: ${callbacks.size} listeners`);
        });
        console.groupEnd();
    }
}

// Create singleton instance
export const stateManager = new StateManager();