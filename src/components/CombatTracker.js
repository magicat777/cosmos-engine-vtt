/**
 * CombatTracker Component
 * 
 * Manages combat encounters across all scales
 * Features:
 * - Initiative tracking with automatic sorting
 * - HP/damage tracking with health states
 * - Status effects and conditions
 * - Multi-scale support (Personal/Vehicle/Starship/Capital)
 * - Turn timers and combat log
 * - Round tracking and combat flow
 */

export class CombatTracker {
    constructor(config, dataManager, eventBus) {
        this.config = config;
        this.dataManager = dataManager;
        this.eventBus = eventBus;
        this.element = null;
        
        // Combat state
        this.combatants = new Map();
        this.round = 1;
        this.currentTurn = null;
        this.isActive = false;
        this.combatLog = [];
        this.turnTimer = null;
        this.turnStartTime = null;
        
        // Scale management
        this.currentScale = 'Personal'; // Personal, Vehicle, Starship, Capital
        this.scaleMultipliers = this.config.combat.damageMultipliers;
        
        // Status effects
        this.statusEffects = {
            'stunned': { name: 'Stunned', icon: '⚡', color: '#f39c12' },
            'prone': { name: 'Prone', icon: '⬇', color: '#e74c3c' },
            'burning': { name: 'Burning', icon: '🔥', color: '#e67e22' },
            'frozen': { name: 'Frozen', icon: '❄', color: '#3498db' },
            'invisible': { name: 'Invisible', icon: '👁', color: '#95a5a6' },
            'cover': { name: 'In Cover', icon: '🛡', color: '#27ae60' },
            'flying': { name: 'Flying', icon: '🪽', color: '#9b59b6' },
            'concentrating': { name: 'Concentrating', icon: '🎯', color: '#f1c40f' }
        };
        
        // Bind methods
        this.addCombatant = this.addCombatant.bind(this);
        this.rollInitiative = this.rollInitiative.bind(this);
        this.nextTurn = this.nextTurn.bind(this);
        this.endCombat = this.endCombat.bind(this);
    }
    
    init(container) {
        this.element = container;
        this.render();
        this.attachEventListeners();
        this.setupEventBus();
        return this;
    }
    
    setupEventBus() {
        if (!this.eventBus) return;
        
        // Listen for damage events from other components
        this.eventBus.on('damage-dealt', (data) => {
            this.applyDamage(data.targetId, data.damage, data.type);
        });
        
        // Listen for character updates
        this.eventBus.on('character-updated', (data) => {
            this.updateCombatantFromCharacter(data);
        });
    }
    
    render() {
        this.element.innerHTML = `
            <div class="combat-tracker">
                <div class="combat-header">
                    <div class="combat-status">
                        <h3>Combat Tracker</h3>
                        <div class="combat-info">
                            <span class="round-counter">Round: ${this.round}</span>
                            <span class="scale-indicator">Scale: ${this.currentScale}</span>
                            <span class="combatant-count">${this.combatants.size} combatants</span>
                        </div>
                    </div>
                    
                    <div class="combat-controls">
                        <div class="scale-selector">
                            <label>Scale:</label>
                            <select id="combat-scale" class="scale-select">
                                ${Object.keys(this.scaleMultipliers).map(scale => `
                                    <option value="${scale}" ${scale === this.currentScale ? 'selected' : ''}>
                                        ${scale} (×${this.scaleMultipliers[scale]})
                                    </option>
                                `).join('')}
                            </select>
                        </div>
                        
                        <button id="start-combat" class="btn btn-primary" ${this.isActive ? 'disabled' : ''}>
                            Start Combat
                        </button>
                        <button id="next-turn" class="btn btn-primary" ${!this.isActive ? 'disabled' : ''}>
                            Next Turn
                        </button>
                        <button id="end-combat" class="btn btn-danger" ${!this.isActive ? 'disabled' : ''}>
                            End Combat
                        </button>
                    </div>
                </div>
                
                <div class="combat-content">
                    <div class="combatants-section">
                        <div class="add-combatant">
                            <input type="text" id="combatant-name" placeholder="Name" class="combatant-input">
                            <input type="number" id="combatant-init-mod" placeholder="Init Mod" value="0" class="init-input">
                            <input type="number" id="combatant-hp" placeholder="HP" value="50" class="hp-input">
                            <select id="combatant-type" class="type-select">
                                <option value="pc">PC</option>
                                <option value="npc">NPC</option>
                                <option value="enemy">Enemy</option>
                                <option value="ally">Ally</option>
                            </select>
                            <button id="add-combatant" class="btn btn-sm">Add</button>
                        </div>
                        
                        <div class="combatants-list" id="combatants-list">
                            ${this.renderCombatants()}
                        </div>
                    </div>
                    
                    <div class="combat-sidebar">
                        <div class="turn-timer">
                            <h4>Turn Timer</h4>
                            <div id="timer-display" class="timer-display">--:--</div>
                        </div>
                        
                        <div class="quick-actions">
                            <h4>Quick Actions</h4>
                            <button class="btn btn-sm" onclick="alert('Conditions manager coming soon')">
                                Manage Conditions
                            </button>
                            <button class="btn btn-sm" id="roll-all-initiative">
                                Roll All Initiative
                            </button>
                            <button class="btn btn-sm" id="clear-all">
                                Clear All
                            </button>
                        </div>
                        
                        <div class="combat-log">
                            <h4>Combat Log</h4>
                            <div id="combat-log-entries" class="log-entries">
                                ${this.renderCombatLog()}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    renderCombatants() {
        if (this.combatants.size === 0) {
            return '<p class="no-combatants">No combatants added yet</p>';
        }
        
        // Sort by initiative (descending)
        const sorted = Array.from(this.combatants.values()).sort((a, b) => {
            // First by initiative
            if (b.initiative !== a.initiative) {
                return b.initiative - a.initiative;
            }
            // Then by init modifier
            return b.initiativeModifier - a.initiativeModifier;
        });
        
        return sorted.map((combatant, index) => {
            const healthState = this.getHealthState(combatant);
            const isCurrentTurn = this.currentTurn === combatant.id;
            
            return `
                <div class="combatant-card ${combatant.type} ${isCurrentTurn ? 'current-turn' : ''} ${healthState.class}" 
                     data-combatant-id="${combatant.id}">
                    <div class="combatant-header">
                        <div class="combatant-info">
                            <span class="combatant-name">${combatant.name}</span>
                            <span class="combatant-type-badge">${combatant.type.toUpperCase()}</span>
                        </div>
                        <div class="initiative-display">
                            <span class="init-value">${combatant.initiative || '--'}</span>
                        </div>
                    </div>
                    
                    <div class="combatant-body">
                        <div class="hp-section">
                            <div class="hp-bar-container">
                                <div class="hp-bar" style="width: ${healthState.percentage}%; background-color: ${healthState.color}"></div>
                            </div>
                            <div class="hp-controls">
                                <button class="hp-btn damage" data-action="damage" data-id="${combatant.id}">-</button>
                                <input type="number" 
                                       class="hp-current" 
                                       value="${combatant.currentHp}" 
                                       data-id="${combatant.id}"
                                       data-max="${combatant.maxHp}">
                                <span class="hp-max">/ ${combatant.maxHp}</span>
                                <button class="hp-btn heal" data-action="heal" data-id="${combatant.id}">+</button>
                            </div>
                        </div>
                        
                        <div class="status-effects">
                            ${combatant.statusEffects.map(effect => {
                                const effectData = this.statusEffects[effect] || { icon: '?', color: '#666' };
                                return `<span class="status-icon" 
                                              style="color: ${effectData.color}" 
                                              title="${effectData.name}">
                                            ${effectData.icon}
                                        </span>`;
                            }).join('')}
                        </div>
                        
                        <div class="combatant-actions">
                            <button class="btn-icon" data-action="edit" data-id="${combatant.id}" title="Edit">✏️</button>
                            <button class="btn-icon" data-action="remove" data-id="${combatant.id}" title="Remove">🗑️</button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    renderCombatLog() {
        if (this.combatLog.length === 0) {
            return '<p class="no-log">Combat not started</p>';
        }
        
        return this.combatLog.slice(-10).reverse().map(entry => `
            <div class="log-entry log-${entry.type}">
                <span class="log-time">${entry.round ? `R${entry.round}` : ''}</span>
                <span class="log-message">${entry.message}</span>
            </div>
        `).join('');
    }
    
    getHealthState(combatant) {
        const percentage = (combatant.currentHp / combatant.maxHp) * 100;
        
        if (percentage > 75) {
            return { percentage, color: '#2ecc71', class: 'healthy', state: 'Healthy' };
        } else if (percentage > 50) {
            return { percentage, color: '#f39c12', class: 'wounded', state: 'Wounded' };
        } else if (percentage > 25) {
            return { percentage, color: '#e67e22', class: 'injured', state: 'Injured' };
        } else if (percentage > 0) {
            return { percentage, color: '#e74c3c', class: 'critical', state: 'Critical' };
        } else {
            return { percentage: 0, color: '#7f8c8d', class: 'dying', state: 'Dying' };
        }
    }
    
    attachEventListeners() {
        // Add combatant
        this.element.querySelector('#add-combatant').addEventListener('click', () => {
            const name = this.element.querySelector('#combatant-name').value;
            const initMod = parseInt(this.element.querySelector('#combatant-init-mod').value) || 0;
            const hp = parseInt(this.element.querySelector('#combatant-hp').value) || 50;
            const type = this.element.querySelector('#combatant-type').value;
            
            if (name) {
                this.addCombatant({ name, initiativeModifier: initMod, maxHp: hp, type });
                
                // Clear inputs
                this.element.querySelector('#combatant-name').value = '';
                this.element.querySelector('#combatant-init-mod').value = '0';
                this.element.querySelector('#combatant-hp').value = '50';
            }
        });
        
        // Enter key on name input
        this.element.querySelector('#combatant-name').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.element.querySelector('#add-combatant').click();
            }
        });
        
        // Combat controls
        this.element.querySelector('#start-combat').addEventListener('click', () => this.startCombat());
        this.element.querySelector('#next-turn').addEventListener('click', () => this.nextTurn());
        this.element.querySelector('#end-combat').addEventListener('click', () => this.endCombat());
        
        // Scale selector
        this.element.querySelector('#combat-scale').addEventListener('change', (e) => {
            this.setScale(e.target.value);
        });
        
        // Quick actions
        this.element.querySelector('#roll-all-initiative').addEventListener('click', () => this.rollAllInitiative());
        this.element.querySelector('#clear-all').addEventListener('click', () => this.clearAll());
        
        // Delegated events for combatant actions
        this.element.querySelector('#combatants-list').addEventListener('click', (e) => {
            const action = e.target.dataset.action;
            const id = e.target.dataset.id;
            
            if (action && id) {
                switch (action) {
                    case 'damage':
                        this.showDamageDialog(id);
                        break;
                    case 'heal':
                        this.showHealDialog(id);
                        break;
                    case 'edit':
                        this.editCombatant(id);
                        break;
                    case 'remove':
                        this.removeCombatant(id);
                        break;
                }
            }
        });
        
        // HP direct edit
        this.element.querySelector('#combatants-list').addEventListener('change', (e) => {
            if (e.target.classList.contains('hp-current')) {
                const id = e.target.dataset.id;
                const newHp = parseInt(e.target.value) || 0;
                const maxHp = parseInt(e.target.dataset.max) || 1;
                
                this.setHp(id, Math.max(0, Math.min(newHp, maxHp)));
            }
        });
    }
    
    addCombatant(data) {
        const combatant = {
            id: `combatant-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: data.name || 'Unknown',
            type: data.type || 'npc',
            initiative: null,
            initiativeModifier: data.initiativeModifier || 0,
            currentHp: data.currentHp || data.maxHp || 50,
            maxHp: data.maxHp || 50,
            statusEffects: data.statusEffects || [],
            customData: data.customData || {}
        };
        
        this.combatants.set(combatant.id, combatant);
        this.updateCombatantsList();
        this.logAction(`${combatant.name} joined combat`, 'add');
        
        // Auto-roll initiative if combat is active
        if (this.isActive && combatant.initiative === null) {
            this.rollInitiative(combatant.id);
        }
        
        return combatant.id;
    }
    
    rollInitiative(combatantId) {
        const combatant = this.combatants.get(combatantId);
        if (!combatant) return;
        
        const roll = Math.floor(Math.random() * 10) + 1;
        combatant.initiative = roll + combatant.initiativeModifier;
        
        this.updateCombatantsList();
        this.logAction(`${combatant.name} rolled initiative: ${roll} + ${combatant.initiativeModifier} = ${combatant.initiative}`, 'roll');
    }
    
    rollAllInitiative() {
        this.combatants.forEach((combatant, id) => {
            if (combatant.initiative === null) {
                this.rollInitiative(id);
            }
        });
    }
    
    startCombat() {
        if (this.combatants.size === 0) {
            alert('Add combatants before starting combat');
            return;
        }
        
        // Roll initiative for anyone who doesn't have it
        this.rollAllInitiative();
        
        this.isActive = true;
        this.round = 1;
        this.combatLog = [];
        
        // Set first turn
        const sorted = Array.from(this.combatants.values()).sort((a, b) => b.initiative - a.initiative);
        if (sorted.length > 0) {
            this.currentTurn = sorted[0].id;
            this.startTurnTimer();
        }
        
        this.updateCombatControls();
        this.updateCombatantsList();
        this.logAction('Combat started!', 'system');
        
        // Emit event
        if (this.eventBus) {
            this.eventBus.emit('combat-started', { round: this.round });
        }
    }
    
    nextTurn() {
        if (!this.isActive) return;
        
        const sorted = Array.from(this.combatants.values()).sort((a, b) => b.initiative - a.initiative);
        const currentIndex = sorted.findIndex(c => c.id === this.currentTurn);
        
        // Move to next combatant
        let nextIndex = currentIndex + 1;
        
        // If we've gone through everyone, start new round
        if (nextIndex >= sorted.length) {
            this.round++;
            nextIndex = 0;
            this.logAction(`Round ${this.round} begins`, 'system');
            
            // Process end-of-round effects
            this.processEndOfRound();
        }
        
        if (sorted[nextIndex]) {
            const prevCombatant = this.combatants.get(this.currentTurn);
            this.currentTurn = sorted[nextIndex].id;
            const nextCombatant = sorted[nextIndex];
            
            this.logAction(`${nextCombatant.name}'s turn`, 'turn');
            
            // Reset turn timer
            this.startTurnTimer();
            
            // Emit event
            if (this.eventBus) {
                this.eventBus.emit('turn-changed', {
                    previous: prevCombatant,
                    current: nextCombatant,
                    round: this.round
                });
            }
        }
        
        this.updateCombatantsList();
    }
    
    endCombat() {
        if (!confirm('End combat? This will clear initiative values.')) return;
        
        this.isActive = false;
        this.currentTurn = null;
        this.stopTurnTimer();
        
        // Clear initiative values
        this.combatants.forEach(combatant => {
            combatant.initiative = null;
        });
        
        this.logAction('Combat ended', 'system');
        this.updateCombatControls();
        this.updateCombatantsList();
        
        // Emit event
        if (this.eventBus) {
            this.eventBus.emit('combat-ended', { round: this.round });
        }
    }
    
    processEndOfRound() {
        // Process ongoing effects
        this.combatants.forEach((combatant, id) => {
            // Burning damage
            if (combatant.statusEffects.includes('burning')) {
                this.applyDamage(id, 5, 'fire');
                this.logAction(`${combatant.name} takes 5 fire damage from burning`, 'damage');
            }
            
            // Remove effects that end at round end
            // TODO: Track effect durations
        });
    }
    
    applyDamage(combatantId, amount, type = 'physical') {
        const combatant = this.combatants.get(combatantId);
        if (!combatant) return;
        
        // Apply scale multiplier if damage is from different scale
        const scaledDamage = amount; // TODO: Apply scale conversion
        
        combatant.currentHp = Math.max(0, combatant.currentHp - scaledDamage);
        
        this.updateCombatantsList();
        this.logAction(`${combatant.name} takes ${scaledDamage} ${type} damage`, 'damage');
        
        // Check for death
        if (combatant.currentHp <= 0) {
            this.logAction(`${combatant.name} is dying!`, 'death');
            
            if (this.eventBus) {
                this.eventBus.emit('combatant-dying', { combatant });
            }
        }
    }
    
    heal(combatantId, amount) {
        const combatant = this.combatants.get(combatantId);
        if (!combatant) return;
        
        const previousHp = combatant.currentHp;
        combatant.currentHp = Math.min(combatant.maxHp, combatant.currentHp + amount);
        const actualHealing = combatant.currentHp - previousHp;
        
        this.updateCombatantsList();
        this.logAction(`${combatant.name} heals ${actualHealing} HP`, 'heal');
    }
    
    setHp(combatantId, newHp) {
        const combatant = this.combatants.get(combatantId);
        if (!combatant) return;
        
        const change = newHp - combatant.currentHp;
        combatant.currentHp = newHp;
        
        this.updateCombatantsList();
        
        if (change > 0) {
            this.logAction(`${combatant.name} heals ${change} HP`, 'heal');
        } else if (change < 0) {
            this.logAction(`${combatant.name} takes ${Math.abs(change)} damage`, 'damage');
        }
    }
    
    addStatusEffect(combatantId, effect) {
        const combatant = this.combatants.get(combatantId);
        if (!combatant || !this.statusEffects[effect]) return;
        
        if (!combatant.statusEffects.includes(effect)) {
            combatant.statusEffects.push(effect);
            this.updateCombatantsList();
            this.logAction(`${combatant.name} is ${this.statusEffects[effect].name}`, 'status');
        }
    }
    
    removeStatusEffect(combatantId, effect) {
        const combatant = this.combatants.get(combatantId);
        if (!combatant) return;
        
        const index = combatant.statusEffects.indexOf(effect);
        if (index > -1) {
            combatant.statusEffects.splice(index, 1);
            this.updateCombatantsList();
            this.logAction(`${combatant.name} is no longer ${this.statusEffects[effect].name}`, 'status');
        }
    }
    
    showDamageDialog(combatantId) {
        const amount = prompt('Enter damage amount:');
        if (amount && !isNaN(amount)) {
            this.applyDamage(combatantId, parseInt(amount));
        }
    }
    
    showHealDialog(combatantId) {
        const amount = prompt('Enter healing amount:');
        if (amount && !isNaN(amount)) {
            this.heal(combatantId, parseInt(amount));
        }
    }
    
    editCombatant(combatantId) {
        const combatant = this.combatants.get(combatantId);
        if (!combatant) return;
        
        // Simple edit - could be enhanced with a modal
        const newName = prompt('Edit name:', combatant.name);
        if (newName && newName !== combatant.name) {
            combatant.name = newName;
            this.updateCombatantsList();
            this.logAction(`Renamed to ${newName}`, 'edit');
        }
    }
    
    removeCombatant(combatantId) {
        const combatant = this.combatants.get(combatantId);
        if (!combatant) return;
        
        if (confirm(`Remove ${combatant.name} from combat?`)) {
            this.combatants.delete(combatantId);
            
            // If this was the current turn, advance
            if (this.currentTurn === combatantId && this.isActive) {
                this.nextTurn();
            }
            
            this.updateCombatantsList();
            this.logAction(`${combatant.name} removed from combat`, 'remove');
        }
    }
    
    setScale(scale) {
        if (this.scaleMultipliers[scale]) {
            this.currentScale = scale;
            this.updateScaleIndicator();
            this.logAction(`Combat scale changed to ${scale}`, 'system');
            
            if (this.eventBus) {
                this.eventBus.emit('scale-changed', { scale, multiplier: this.scaleMultipliers[scale] });
            }
        }
    }
    
    clearAll() {
        if (this.isActive) {
            alert('Cannot clear during active combat');
            return;
        }
        
        if (confirm('Remove all combatants?')) {
            this.combatants.clear();
            this.combatLog = [];
            this.round = 1;
            this.updateCombatantsList();
            this.updateCombatLog();
        }
    }
    
    startTurnTimer() {
        this.turnStartTime = Date.now();
        this.stopTurnTimer();
        
        this.turnTimer = setInterval(() => {
            const elapsed = Date.now() - this.turnStartTime;
            const minutes = Math.floor(elapsed / 60000);
            const seconds = Math.floor((elapsed % 60000) / 1000);
            
            const display = this.element.querySelector('#timer-display');
            if (display) {
                display.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            }
        }, 1000);
    }
    
    stopTurnTimer() {
        if (this.turnTimer) {
            clearInterval(this.turnTimer);
            this.turnTimer = null;
        }
        
        const display = this.element.querySelector('#timer-display');
        if (display) {
            display.textContent = '--:--';
        }
    }
    
    logAction(message, type = 'action') {
        this.combatLog.push({
            message,
            type,
            round: this.round,
            timestamp: Date.now()
        });
        
        this.updateCombatLog();
    }
    
    updateCombatantsList() {
        const list = this.element.querySelector('#combatants-list');
        if (list) {
            list.innerHTML = this.renderCombatants();
        }
        
        // Update combatant count
        const count = this.element.querySelector('.combatant-count');
        if (count) {
            count.textContent = `${this.combatants.size} combatants`;
        }
    }
    
    updateCombatLog() {
        const log = this.element.querySelector('#combat-log-entries');
        if (log) {
            log.innerHTML = this.renderCombatLog();
            log.scrollTop = 0;
        }
    }
    
    updateCombatControls() {
        const startBtn = this.element.querySelector('#start-combat');
        const nextBtn = this.element.querySelector('#next-turn');
        const endBtn = this.element.querySelector('#end-combat');
        
        if (startBtn) startBtn.disabled = this.isActive;
        if (nextBtn) nextBtn.disabled = !this.isActive;
        if (endBtn) endBtn.disabled = !this.isActive;
    }
    
    updateScaleIndicator() {
        const indicator = this.element.querySelector('.scale-indicator');
        if (indicator) {
            indicator.textContent = `Scale: ${this.currentScale}`;
        }
    }
    
    updateCombatantFromCharacter(characterData) {
        // Find combatant by name or create new
        let combatant = null;
        this.combatants.forEach(c => {
            if (c.name === characterData.name) {
                combatant = c;
            }
        });
        
        if (combatant) {
            // Update existing
            combatant.maxHp = characterData.maxHp;
            combatant.initiativeModifier = characterData.initiative;
            this.updateCombatantsList();
        }
    }
    
    // Public API
    getCombatants() {
        return Array.from(this.combatants.values());
    }
    
    getCombatant(id) {
        return this.combatants.get(id);
    }
    
    getCurrentTurn() {
        return this.combatants.get(this.currentTurn);
    }
    
    isInCombat() {
        return this.isActive;
    }
    
    exportCombat() {
        return {
            combatants: Array.from(this.combatants.values()),
            round: this.round,
            currentTurn: this.currentTurn,
            isActive: this.isActive,
            scale: this.currentScale,
            log: this.combatLog
        };
    }
    
    importCombat(data) {
        this.combatants.clear();
        data.combatants.forEach(c => {
            this.combatants.set(c.id, c);
        });
        
        this.round = data.round || 1;
        this.currentTurn = data.currentTurn;
        this.isActive = data.isActive || false;
        this.currentScale = data.scale || 'Personal';
        this.combatLog = data.log || [];
        
        this.render();
        this.attachEventListeners();
        
        if (this.isActive && this.currentTurn) {
            this.startTurnTimer();
        }
    }
}