/**
 * AutomationTools Component
 * Macros, damage application, condition tracking, and automated calculations
 * Streamlines common GM and player tasks in Cosmos Engine RPG
 */

export class AutomationTools {
    constructor(config, dataManager, eventBus) {
        this.config = config;
        this.dataManager = dataManager;
        this.eventBus = eventBus;
        
        // Component state
        this.macros = [];
        this.activeConditions = new Map();
        this.automationSettings = {
            autoApplyDamage: true,
            autoCalculateResults: true,
            showMacroResults: true,
            confirmCriticalActions: true
        };
        
        // Component DOM references
        this.container = null;
        this.macroList = null;
        this.conditionPanel = null;
        this.automationPanel = null;
        
        this.init();
    }
    
    async init() {
        this.setupEventListeners();
        await this.loadMacros();
        await this.loadSettings();
    }
    
    setupEventListeners() {
        this.eventBus.on('combat:damage', (data) => this.handleDamageApplication(data));
        this.eventBus.on('condition:apply', (data) => this.applyCondition(data));
        this.eventBus.on('condition:remove', (data) => this.removeCondition(data));
        this.eventBus.on('macro:execute', (data) => this.executeMacro(data));
        this.eventBus.on('automation:toggle', (data) => this.toggleAutomation(data));
    }
    
    render() {
        const container = document.createElement('div');
        container.className = 'automation-container';
        container.innerHTML = `
            <div class="automation-header">
                <h2>Automation Tools</h2>
                <div class="automation-controls">
                    <button id="new-macro-btn" class="btn-primary">New Macro</button>
                    <button id="import-macros-btn" class="btn-secondary">Import</button>
                    <button id="export-macros-btn" class="btn-secondary">Export</button>
                </div>
            </div>
            
            <div class="automation-content">
                <!-- Macro Panel -->
                <div class="macro-panel">
                    <div class="panel-header">
                        <h3>Macros</h3>
                        <div class="macro-filter">
                            <select id="macro-category-filter">
                                <option value="">All Categories</option>
                                <option value="combat">Combat</option>
                                <option value="skill">Skill Checks</option>
                                <option value="damage">Damage</option>
                                <option value="condition">Conditions</option>
                                <option value="utility">Utility</option>
                            </select>
                        </div>
                    </div>
                    <div id="macro-list" class="macro-list"></div>
                </div>
                
                <!-- Condition Tracker Panel -->
                <div class="condition-panel">
                    <div class="panel-header">
                        <h3>Active Conditions</h3>
                        <button id="add-condition-btn" class="btn-small">+ Condition</button>
                    </div>
                    <div id="condition-tracker" class="condition-tracker"></div>
                </div>
                
                <!-- Automation Settings Panel -->
                <div class="automation-settings-panel">
                    <div class="panel-header">
                        <h3>Automation Settings</h3>
                    </div>
                    <div class="automation-settings">
                        <label class="setting-item">
                            <input type="checkbox" id="auto-damage" checked>
                            <span>Auto-apply damage calculations</span>
                        </label>
                        <label class="setting-item">
                            <input type="checkbox" id="auto-calculate" checked>
                            <span>Auto-calculate roll results</span>
                        </label>
                        <label class="setting-item">
                            <input type="checkbox" id="show-macro-results" checked>
                            <span>Show macro execution results</span>
                        </label>
                        <label class="setting-item">
                            <input type="checkbox" id="confirm-critical" checked>
                            <span>Confirm critical actions</span>
                        </label>
                    </div>
                </div>
                
                <!-- Quick Actions Panel -->
                <div class="quick-actions-panel">
                    <div class="panel-header">
                        <h3>Quick Actions</h3>
                    </div>
                    <div class="quick-actions">
                        <div class="action-group">
                            <h4>Combat</h4>
                            <button class="quick-action-btn" data-action="initiative">Roll Initiative</button>
                            <button class="quick-action-btn" data-action="attack">Quick Attack</button>
                            <button class="quick-action-btn" data-action="defend">Quick Defense</button>
                            <button class="quick-action-btn" data-action="heal">Apply Healing</button>
                        </div>
                        <div class="action-group">
                            <h4>Conditions</h4>
                            <button class="quick-action-btn" data-action="stunned">Apply Stunned</button>
                            <button class="quick-action-btn" data-action="wounded">Apply Wounded</button>
                            <button class="quick-action-btn" data-action="exhausted">Apply Exhausted</button>
                            <button class="quick-action-btn" data-action="clear-conditions">Clear All</button>
                        </div>
                        <div class="action-group">
                            <h4>Utility</h4>
                            <button class="quick-action-btn" data-action="advantage">Grant Advantage</button>
                            <button class="quick-action-btn" data-action="disadvantage">Grant Disadvantage</button>
                            <button class="quick-action-btn" data-action="temp-bonus">Temp Bonus</button>
                            <button class="quick-action-btn" data-action="scale-damage">Scale Damage</button>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Macro Creation Modal -->
            <div id="macro-modal" class="modal hidden">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Create Macro</h3>
                        <button class="modal-close">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="macro-form">
                            <div class="form-group">
                                <label for="macro-name">Name:</label>
                                <input type="text" id="macro-name" required>
                            </div>
                            <div class="form-group">
                                <label for="macro-category">Category:</label>
                                <select id="macro-category">
                                    <option value="combat">Combat</option>
                                    <option value="skill">Skill Check</option>
                                    <option value="damage">Damage</option>
                                    <option value="condition">Condition</option>
                                    <option value="utility">Utility</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="macro-description">Description:</label>
                                <textarea id="macro-description" rows="2"></textarea>
                            </div>
                            <div class="form-group">
                                <label for="macro-script">Script:</label>
                                <textarea id="macro-script" rows="8" placeholder="// JavaScript code for macro
// Available variables: character, target, dice, conditions
// Example: dice.roll('2d10+5')"></textarea>
                            </div>
                            <div class="form-group">
                                <label for="macro-hotkey">Hotkey (optional):</label>
                                <input type="text" id="macro-hotkey" placeholder="e.g., Ctrl+1">
                            </div>
                            <div class="form-group">
                                <label>
                                    <input type="checkbox" id="macro-gm-only">
                                    GM Only
                                </label>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button id="save-macro-btn" class="btn-primary">Save Macro</button>
                        <button id="test-macro-btn" class="btn-secondary">Test</button>
                        <button id="cancel-macro-btn" class="btn-secondary">Cancel</button>
                    </div>
                </div>
            </div>
            
            <!-- Condition Modal -->
            <div id="condition-modal" class="modal hidden">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Apply Condition</h3>
                        <button class="modal-close">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="condition-form">
                            <div class="form-group">
                                <label for="condition-target">Target:</label>
                                <select id="condition-target">
                                    <option value="">Select character...</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="condition-type">Condition:</label>
                                <select id="condition-type">
                                    <option value="stunned">Stunned (-2 to all actions)</option>
                                    <option value="wounded">Wounded (-1 per wound level)</option>
                                    <option value="exhausted">Exhausted (-1 to physical actions)</option>
                                    <option value="shaken">Shaken (-1 to mental actions)</option>
                                    <option value="blinded">Blinded (-4 to sight-based actions)</option>
                                    <option value="deafened">Deafened (-2 to hearing-based actions)</option>
                                    <option value="paralyzed">Paralyzed (cannot move or act)</option>
                                    <option value="unconscious">Unconscious (helpless)</option>
                                    <option value="advantage">Advantage (+1 to next action)</option>
                                    <option value="disadvantage">Disadvantage (-1 to next action)</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="condition-duration">Duration:</label>
                                <select id="condition-duration">
                                    <option value="1">1 round</option>
                                    <option value="3">3 rounds</option>
                                    <option value="5">5 rounds</option>
                                    <option value="10">1 minute (10 rounds)</option>
                                    <option value="permanent">Until removed</option>
                                    <option value="scene">End of scene</option>
                                    <option value="custom">Custom</option>
                                </select>
                            </div>
                            <div class="form-group hidden" id="custom-duration-group">
                                <label for="custom-duration">Custom Duration (rounds):</label>
                                <input type="number" id="custom-duration" min="1">
                            </div>
                            <div class="form-group">
                                <label for="condition-notes">Notes:</label>
                                <textarea id="condition-notes" rows="2"></textarea>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button id="apply-condition-btn" class="btn-primary">Apply</button>
                        <button id="cancel-condition-btn" class="btn-secondary">Cancel</button>
                    </div>
                </div>
            </div>
            
            <!-- Damage Application Modal -->
            <div id="damage-modal" class="modal hidden">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Apply Damage</h3>
                        <button class="modal-close">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="damage-form">
                            <div class="form-group">
                                <label for="damage-target">Target:</label>
                                <select id="damage-target">
                                    <option value="">Select character...</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="damage-amount">Damage Amount:</label>
                                <input type="number" id="damage-amount" min="0" required>
                            </div>
                            <div class="form-group">
                                <label for="damage-type">Damage Type:</label>
                                <select id="damage-type">
                                    <option value="physical">Physical</option>
                                    <option value="energy">Energy</option>
                                    <option value="psychic">Psychic</option>
                                    <option value="environmental">Environmental</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="damage-scale">Scale:</label>
                                <select id="damage-scale">
                                    <option value="Personal">Personal</option>
                                    <option value="Vehicle">Vehicle</option>
                                    <option value="Starship">Starship</option>
                                    <option value="Capital">Capital</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>
                                    <input type="checkbox" id="ignore-armor">
                                    Ignore Armor
                                </label>
                            </div>
                            <div class="form-group">
                                <label for="damage-notes">Notes:</label>
                                <textarea id="damage-notes" rows="2"></textarea>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button id="apply-damage-btn" class="btn-primary">Apply Damage</button>
                        <button id="heal-instead-btn" class="btn-secondary">Heal Instead</button>
                        <button id="cancel-damage-btn" class="btn-secondary">Cancel</button>
                    </div>
                </div>
            </div>
        `;
        
        this.container = container;
        this.setupDOMReferences();
        this.attachEventHandlers();
        this.renderMacros();
        this.renderConditions();
        this.loadAutomationSettings();
        
        return container;
    }
    
    setupDOMReferences() {
        this.macroList = this.container.querySelector('#macro-list');
        this.conditionPanel = this.container.querySelector('#condition-tracker');
        this.automationPanel = this.container.querySelector('.automation-settings');
    }
    
    attachEventHandlers() {
        // Macro management
        this.container.querySelector('#new-macro-btn').addEventListener('click', () => this.showMacroModal());
        this.container.querySelector('#import-macros-btn').addEventListener('click', () => this.importMacros());
        this.container.querySelector('#export-macros-btn').addEventListener('click', () => this.exportMacros());
        
        // Condition management
        this.container.querySelector('#add-condition-btn').addEventListener('click', () => this.showConditionModal());
        
        // Quick actions
        this.container.querySelectorAll('.quick-action-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.executeQuickAction(e.target.dataset.action));
        });
        
        // Settings
        this.automationPanel.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', () => this.saveAutomationSettings());
        });
        
        // Modal handlers
        this.setupModalHandlers();
        
        // Filters
        this.container.querySelector('#macro-category-filter').addEventListener('change', (e) => {
            this.filterMacros(e.target.value);
        });
        
        // Condition duration handler
        this.container.querySelector('#condition-duration').addEventListener('change', (e) => {
            const customGroup = this.container.querySelector('#custom-duration-group');
            if (e.target.value === 'custom') {
                customGroup.classList.remove('hidden');
            } else {
                customGroup.classList.add('hidden');
            }
        });
    }
    
    setupModalHandlers() {
        // Macro modal
        const macroModal = this.container.querySelector('#macro-modal');
        this.container.querySelector('#save-macro-btn').addEventListener('click', () => this.saveMacro());
        this.container.querySelector('#test-macro-btn').addEventListener('click', () => this.testMacro());
        this.container.querySelector('#cancel-macro-btn').addEventListener('click', () => this.hideModal(macroModal));
        
        // Condition modal
        const conditionModal = this.container.querySelector('#condition-modal');
        this.container.querySelector('#apply-condition-btn').addEventListener('click', () => this.saveCondition());
        this.container.querySelector('#cancel-condition-btn').addEventListener('click', () => this.hideModal(conditionModal));
        
        // Damage modal
        const damageModal = this.container.querySelector('#damage-modal');
        this.container.querySelector('#apply-damage-btn').addEventListener('click', () => this.applyDamage());
        this.container.querySelector('#heal-instead-btn').addEventListener('click', () => this.applyHealing());
        this.container.querySelector('#cancel-damage-btn').addEventListener('click', () => this.hideModal(damageModal));
        
        // Close on backdrop click
        [macroModal, conditionModal, damageModal].forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) this.hideModal(modal);
            });
            
            modal.querySelector('.modal-close').addEventListener('click', () => this.hideModal(modal));
        });
    }
    
    async loadMacros() {
        try {
            const data = await this.dataManager.loadData('macros.json');
            this.macros = data.macros || this.getDefaultMacros();
        } catch (error) {
            console.log('No macros.json found, using defaults');
            this.macros = this.getDefaultMacros();
        }
    }
    
    getDefaultMacros() {
        return [
            {
                id: 'basic-attack',
                name: 'Basic Attack',
                category: 'combat',
                description: 'Standard attack roll with weapon',
                script: `
const roll = dice.roll('2d10');
const attribute = character.attributes.coordination || 0;
const skill = Math.floor((character.skills.combat || 0) / 2);
const weapon = character.equipment.weapon?.bonus || 0;
const total = roll.total + attribute + skill + weapon;
return {
    result: total,
    breakdown: \`\${roll.result} + \${attribute} (Coord) + \${skill} (Combat/2) + \${weapon} (Weapon) = \${total}\`,
    success: total >= (target?.defense || 10)
};`,
                hotkey: 'Ctrl+1',
                gmOnly: false
            },
            {
                id: 'skill-check',
                name: 'Generic Skill Check',
                category: 'skill',
                description: 'Roll for any skill check',
                script: `
const roll = dice.roll('2d10');
const attribute = prompt('Attribute value:') || 0;
const skill = prompt('Skill value:') || 0;
const modifier = prompt('Additional modifier:') || 0;
const total = roll.total + parseInt(attribute) + Math.floor(parseInt(skill) / 2) + parseInt(modifier);
const difficulty = prompt('Difficulty (8=Easy, 11=Moderate, 14=Hard, 17=Extreme, 20=Legendary):') || 11;
return {
    result: total,
    breakdown: \`\${roll.result} + \${attribute} (Attr) + \${Math.floor(parseInt(skill) / 2)} (Skill/2) + \${modifier} (Mod) = \${total}\`,
    success: total >= parseInt(difficulty),
    difficulty: difficulty
};`,
                hotkey: 'Ctrl+2',
                gmOnly: false
            },
            {
                id: 'damage-roll',
                name: 'Damage Roll',
                category: 'damage',
                description: 'Roll weapon damage',
                script: `
const weaponDamage = prompt('Weapon damage (e.g., 1d6+2):') || '1d6';
const roll = dice.roll(weaponDamage);
const margin = prompt('Attack margin of success (0 if hit exactly):') || 0;
const total = roll.total + Math.floor(parseInt(margin) / 2);
return {
    result: total,
    breakdown: \`\${roll.result} + \${Math.floor(parseInt(margin) / 2)} (Margin/2) = \${total}\`,
    damage: total
};`,
                hotkey: 'Ctrl+3',
                gmOnly: false
            },
            {
                id: 'apply-stunned',
                name: 'Apply Stunned',
                category: 'condition',
                description: 'Apply stunned condition (-2 to all actions)',
                script: `
if (!target) {
    return { error: 'No target selected' };
}
automation.applyCondition(target.id, 'stunned', 3);
return {
    result: \`Applied Stunned condition to \${target.name} for 3 rounds\`,
    condition: 'stunned'
};`,
                hotkey: 'Ctrl+S',
                gmOnly: true
            }
        ];
    }
    
    renderMacros() {
        if (!this.macroList) return;
        
        this.macroList.innerHTML = '';
        
        const filteredMacros = this.macros.filter(macro => {
            const categoryFilter = this.container.querySelector('#macro-category-filter')?.value;
            return !categoryFilter || macro.category === categoryFilter;
        });
        
        if (filteredMacros.length === 0) {
            this.macroList.innerHTML = '<p class="empty-state">No macros found. Create your first macro!</p>';
            return;
        }
        
        filteredMacros.forEach(macro => {
            const div = document.createElement('div');
            div.className = 'macro-item';
            div.innerHTML = `
                <div class="macro-header">
                    <span class="macro-name">${macro.name}</span>
                    <span class="macro-category">${macro.category}</span>
                    ${macro.hotkey ? `<span class="macro-hotkey">${macro.hotkey}</span>` : ''}
                </div>
                <div class="macro-description">${macro.description}</div>
                <div class="macro-actions">
                    <button class="btn-tiny" onclick="automationTools.executeMacro('${macro.id}')">▶️ Run</button>
                    <button class="btn-tiny" onclick="automationTools.editMacro('${macro.id}')">✏️ Edit</button>
                    <button class="btn-tiny" onclick="automationTools.deleteMacro('${macro.id}')">🗑️ Delete</button>
                </div>
            `;
            
            this.macroList.appendChild(div);
        });
    }
    
    renderConditions() {
        if (!this.conditionPanel) return;
        
        this.conditionPanel.innerHTML = '';
        
        if (this.activeConditions.size === 0) {
            this.conditionPanel.innerHTML = '<p class="empty-state">No active conditions</p>';
            return;
        }
        
        this.activeConditions.forEach((condition, id) => {
            const div = document.createElement('div');
            div.className = 'condition-item';
            div.innerHTML = `
                <div class="condition-header">
                    <span class="condition-target">${condition.targetName}</span>
                    <span class="condition-type">${condition.type}</span>
                </div>
                <div class="condition-details">
                    <span class="condition-effect">${this.getConditionEffect(condition.type)}</span>
                    <span class="condition-duration">${condition.duration} rounds</span>
                </div>
                ${condition.notes ? `<div class="condition-notes">${condition.notes}</div>` : ''}
                <div class="condition-actions">
                    <button class="btn-tiny" onclick="automationTools.removeCondition('${id}')">Remove</button>
                    <button class="btn-tiny" onclick="automationTools.reduceConditionDuration('${id}')">-1 Round</button>
                </div>
            `;
            
            this.conditionPanel.appendChild(div);
        });
    }
    
    getConditionEffect(type) {
        const effects = {
            stunned: '-2 to all actions',
            wounded: '-1 per wound level',
            exhausted: '-1 to physical actions',
            shaken: '-1 to mental actions',
            blinded: '-4 to sight-based actions',
            deafened: '-2 to hearing-based actions',
            paralyzed: 'Cannot move or act',
            unconscious: 'Helpless',
            advantage: '+1 to next action',
            disadvantage: '-1 to next action'
        };
        return effects[type] || 'Unknown effect';
    }
    
    filterMacros(category) {
        this.renderMacros();
    }
    
    showMacroModal(macroId = null) {
        const modal = this.container.querySelector('#macro-modal');
        
        if (macroId) {
            const macro = this.macros.find(m => m.id === macroId);
            if (macro) {
                this.container.querySelector('#macro-name').value = macro.name;
                this.container.querySelector('#macro-category').value = macro.category;
                this.container.querySelector('#macro-description').value = macro.description;
                this.container.querySelector('#macro-script').value = macro.script;
                this.container.querySelector('#macro-hotkey').value = macro.hotkey || '';
                this.container.querySelector('#macro-gm-only').checked = macro.gmOnly;
            }
        }
        
        modal.classList.remove('hidden');
    }
    
    showConditionModal() {
        const modal = this.container.querySelector('#condition-modal');
        // TODO: Populate target dropdown with active characters
        modal.classList.remove('hidden');
    }
    
    showDamageModal() {
        const modal = this.container.querySelector('#damage-modal');
        // TODO: Populate target dropdown with active characters
        modal.classList.remove('hidden');
    }
    
    hideModal(modal) {
        modal.classList.add('hidden');
        const form = modal.querySelector('form');
        if (form) form.reset();
    }
    
    async saveMacro() {
        const form = this.container.querySelector('#macro-form');
        const formData = new FormData(form);
        
        const macro = {
            id: Date.now().toString(),
            name: this.container.querySelector('#macro-name').value,
            category: this.container.querySelector('#macro-category').value,
            description: this.container.querySelector('#macro-description').value,
            script: this.container.querySelector('#macro-script').value,
            hotkey: this.container.querySelector('#macro-hotkey').value,
            gmOnly: this.container.querySelector('#macro-gm-only').checked,
            created: Date.now()
        };
        
        this.macros.push(macro);
        await this.saveMacroData();
        this.renderMacros();
        this.hideModal(this.container.querySelector('#macro-modal'));
    }
    
    async saveCondition() {
        const targetId = this.container.querySelector('#condition-target').value;
        const type = this.container.querySelector('#condition-type').value;
        const duration = this.container.querySelector('#condition-duration').value;
        const notes = this.container.querySelector('#condition-notes').value;
        
        if (!targetId || !type) {
            alert('Please select a target and condition type');
            return;
        }
        
        let finalDuration = duration;
        if (duration === 'custom') {
            finalDuration = this.container.querySelector('#custom-duration').value;
        } else if (duration === 'permanent') {
            finalDuration = 999;
        } else if (duration === 'scene') {
            finalDuration = 'scene';
        }
        
        this.applyCondition({
            targetId,
            targetName: 'Character', // TODO: Get actual name
            type,
            duration: finalDuration,
            notes
        });
        
        this.hideModal(this.container.querySelector('#condition-modal'));
    }
    
    async executeMacro(macroId) {
        const macro = this.macros.find(m => m.id === macroId);
        if (!macro) return;
        
        try {
            // Create execution context
            const context = {
                dice: {
                    roll: (formula) => this.rollDice(formula)
                },
                character: {}, // TODO: Get active character
                target: {}, // TODO: Get selected target
                automation: this,
                conditions: this.activeConditions
            };
            
            // Execute macro script
            const func = new Function('dice', 'character', 'target', 'automation', 'conditions', macro.script);
            const result = func(context.dice, context.character, context.target, context.automation, context.conditions);
            
            if (this.automationSettings.showMacroResults) {
                this.showMacroResult(macro.name, result);
            }
            
            // Emit macro execution event
            this.eventBus.emit('macro:executed', { macro, result });
            
        } catch (error) {
            console.error('Macro execution error:', error);
            alert(`Macro execution failed: ${error.message}`);
        }
    }
    
    rollDice(formula) {
        // Simple dice roller - supports basic patterns like '2d10+5'
        const match = formula.match(/(\d+)d(\d+)([+-]\d+)?/);
        if (!match) {
            return { result: formula, total: parseInt(formula) || 0 };
        }
        
        const numDice = parseInt(match[1]);
        const dieSize = parseInt(match[2]);
        const modifier = parseInt(match[3]) || 0;
        
        let total = 0;
        const rolls = [];
        
        for (let i = 0; i < numDice; i++) {
            const roll = Math.floor(Math.random() * dieSize) + 1;
            rolls.push(roll);
            total += roll;
        }
        
        const finalTotal = total + modifier;
        const result = rolls.length === 1 ? rolls[0].toString() : `[${rolls.join(', ')}]`;
        
        return {
            result: modifier ? `${result}${modifier >= 0 ? '+' : ''}${modifier}` : result,
            total: finalTotal,
            rolls,
            modifier
        };
    }
    
    showMacroResult(macroName, result) {
        const resultDiv = document.createElement('div');
        resultDiv.className = 'macro-result-popup';
        resultDiv.innerHTML = `
            <div class="result-header">${macroName}</div>
            <div class="result-content">
                ${result.breakdown || result.result || JSON.stringify(result)}
            </div>
        `;
        
        document.body.appendChild(resultDiv);
        
        setTimeout(() => {
            resultDiv.remove();
        }, 5000);
    }
    
    applyCondition(data) {
        const id = Date.now().toString();
        this.activeConditions.set(id, {
            id,
            targetId: data.targetId,
            targetName: data.targetName,
            type: data.type,
            duration: data.duration,
            notes: data.notes,
            applied: Date.now()
        });
        
        this.renderConditions();
        this.eventBus.emit('condition:applied', data);
    }
    
    removeCondition(conditionId) {
        const condition = this.activeConditions.get(conditionId);
        if (condition) {
            this.activeConditions.delete(conditionId);
            this.renderConditions();
            this.eventBus.emit('condition:removed', condition);
        }
    }
    
    reduceConditionDuration(conditionId) {
        const condition = this.activeConditions.get(conditionId);
        if (condition && typeof condition.duration === 'number') {
            condition.duration -= 1;
            if (condition.duration <= 0) {
                this.removeCondition(conditionId);
            } else {
                this.renderConditions();
            }
        }
    }
    
    executeQuickAction(action) {
        switch (action) {
            case 'initiative':
                this.executeMacro('initiative-roll');
                break;
            case 'attack':
                this.executeMacro('basic-attack');
                break;
            case 'defend':
                // TODO: Implement defense roll
                break;
            case 'heal':
                this.showDamageModal();
                break;
            case 'stunned':
                this.applyCondition({
                    targetId: 'selected',
                    targetName: 'Selected Character',
                    type: 'stunned',
                    duration: 3,
                    notes: 'Applied via quick action'
                });
                break;
            case 'wounded':
                this.applyCondition({
                    targetId: 'selected',
                    targetName: 'Selected Character',
                    type: 'wounded',
                    duration: 'permanent',
                    notes: 'Applied via quick action'
                });
                break;
            case 'exhausted':
                this.applyCondition({
                    targetId: 'selected',
                    targetName: 'Selected Character',
                    type: 'exhausted',
                    duration: 10,
                    notes: 'Applied via quick action'
                });
                break;
            case 'clear-conditions':
                if (confirm('Clear all active conditions?')) {
                    this.activeConditions.clear();
                    this.renderConditions();
                }
                break;
            default:
                console.log('Quick action not implemented:', action);
        }
    }
    
    async loadSettings() {
        const settings = localStorage.getItem('cosmos-automation-settings');
        if (settings) {
            this.automationSettings = { ...this.automationSettings, ...JSON.parse(settings) };
        }
    }
    
    loadAutomationSettings() {
        this.container.querySelector('#auto-damage').checked = this.automationSettings.autoApplyDamage;
        this.container.querySelector('#auto-calculate').checked = this.automationSettings.autoCalculateResults;
        this.container.querySelector('#show-macro-results').checked = this.automationSettings.showMacroResults;
        this.container.querySelector('#confirm-critical').checked = this.automationSettings.confirmCriticalActions;
    }
    
    saveAutomationSettings() {
        this.automationSettings = {
            autoApplyDamage: this.container.querySelector('#auto-damage').checked,
            autoCalculateResults: this.container.querySelector('#auto-calculate').checked,
            showMacroResults: this.container.querySelector('#show-macro-results').checked,
            confirmCriticalActions: this.container.querySelector('#confirm-critical').checked
        };
        
        localStorage.setItem('cosmos-automation-settings', JSON.stringify(this.automationSettings));
    }
    
    async saveMacroData() {
        await this.dataManager.saveToDB('gameData', {
            id: 'macros.json',
            data: { macros: this.macros },
            timestamp: Date.now()
        });
    }
    
    async exportMacros() {
        const data = {
            macros: this.macros,
            exportDate: new Date().toISOString(),
            version: '1.0'
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'cosmos-macros.json';
        a.click();
        URL.revokeObjectURL(url);
    }
    
    editMacro(macroId) {
        this.showMacroModal(macroId);
    }
    
    deleteMacro(macroId) {
        if (confirm('Are you sure you want to delete this macro?')) {
            this.macros = this.macros.filter(m => m.id !== macroId);
            this.saveMacroData();
            this.renderMacros();
        }
    }
}

// Make automationTools globally accessible
window.automationTools = null;