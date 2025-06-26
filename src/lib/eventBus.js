/**
 * EventBus - Simple event emitter for component communication
 * Enables decoupled communication between components
 */

export class EventBus {
    constructor() {
        this.events = new Map();
        this.oneTimeEvents = new Map();
    }
    
    /**
     * Subscribe to an event
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     * @returns {Function} Unsubscribe function
     */
    on(event, callback) {
        if (!this.events.has(event)) {
            this.events.set(event, new Set());
        }
        
        this.events.get(event).add(callback);
        
        // Return unsubscribe function
        return () => this.off(event, callback);
    }
    
    /**
     * Subscribe to an event once
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     */
    once(event, callback) {
        if (!this.oneTimeEvents.has(event)) {
            this.oneTimeEvents.set(event, new Set());
        }
        
        this.oneTimeEvents.get(event).add(callback);
    }
    
    /**
     * Unsubscribe from an event
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     */
    off(event, callback) {
        if (this.events.has(event)) {
            this.events.get(event).delete(callback);
            
            // Clean up empty sets
            if (this.events.get(event).size === 0) {
                this.events.delete(event);
            }
        }
        
        if (this.oneTimeEvents.has(event)) {
            this.oneTimeEvents.get(event).delete(callback);
            
            if (this.oneTimeEvents.get(event).size === 0) {
                this.oneTimeEvents.delete(event);
            }
        }
    }
    
    /**
     * Emit an event
     * @param {string} event - Event name
     * @param {*} data - Event data
     */
    emit(event, data) {
        // Regular subscribers
        if (this.events.has(event)) {
            this.events.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in event handler for "${event}":`, error);
                }
            });
        }
        
        // One-time subscribers
        if (this.oneTimeEvents.has(event)) {
            const callbacks = Array.from(this.oneTimeEvents.get(event));
            this.oneTimeEvents.delete(event);
            
            callbacks.forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in one-time event handler for "${event}":`, error);
                }
            });
        }
    }
    
    /**
     * Clear all event listeners
     */
    clear() {
        this.events.clear();
        this.oneTimeEvents.clear();
    }
    
    /**
     * Get all registered events
     * @returns {Array<string>} Event names
     */
    getEvents() {
        const regular = Array.from(this.events.keys());
        const oneTime = Array.from(this.oneTimeEvents.keys());
        return [...new Set([...regular, ...oneTime])];
    }
    
    /**
     * Get listener count for an event
     * @param {string} event - Event name
     * @returns {number} Listener count
     */
    getListenerCount(event) {
        let count = 0;
        
        if (this.events.has(event)) {
            count += this.events.get(event).size;
        }
        
        if (this.oneTimeEvents.has(event)) {
            count += this.oneTimeEvents.get(event).size;
        }
        
        return count;
    }
}

// Create singleton instance
export const globalEventBus = new EventBus();

// Common event names (for consistency)
export const Events = {
    // Combat events
    COMBAT_STARTED: 'combat-started',
    COMBAT_ENDED: 'combat-ended',
    TURN_CHANGED: 'turn-changed',
    DAMAGE_DEALT: 'damage-dealt',
    COMBATANT_DYING: 'combatant-dying',
    
    // Character events
    CHARACTER_UPDATED: 'character-updated',
    CHARACTER_LOADED: 'character-loaded',
    CHARACTER_SAVED: 'character-saved',
    
    // Scale events
    SCALE_CHANGED: 'scale-changed',
    
    // Dice events
    DICE_ROLLED: 'dice-rolled',
    CRITICAL_SUCCESS: 'critical-success',
    CRITICAL_FAILURE: 'critical-failure',
    
    // System events
    COMPONENT_READY: 'component-ready',
    DATA_LOADED: 'data-loaded',
    ERROR_OCCURRED: 'error-occurred'
};