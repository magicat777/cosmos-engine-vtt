/**
 * EncounterBuilder Component
 * 
 * GM tool for creating balanced encounters
 * Features:
 * - NPC quick generation by level and type
 * - Balanced encounter math based on party level
 * - Environmental factors and hazards
 * - Loot generation by technology era
 * - Save/load encounter templates
 * - Quick deploy to combat tracker
 */

export class EncounterBuilder {
    constructor(config, dataManager, eventBus) {
        this.config = config;
        this.dataManager = dataManager;
        this.eventBus = eventBus;
        this.element = null;
        
        // Encounter state
        this.partyLevel = 5;
        this.partySize = 4;
        this.encounterDifficulty = 'standard';
        this.currentEncounter = {
            name: 'New Encounter',
            npcs: [],
            environment: null,
            loot: [],
            notes: ''
        };
        
        // NPC templates by role
        this.npcTemplates = {
            'soldier': {
                name: 'Soldier',
                role: 'combatant',
                baseHp: 50,
                baseDamage: '1d10+2',
                skills: { combat: 4, perception: 3 },
                equipment: ['assault rifle', 'combat armor']
            },
            'technician': {
                name: 'Technician',
                role: 'support',
                baseHp: 40,
                baseDamage: '1d10',
                skills: { tech: 5, medical: 3 },
                equipment: ['pistol', 'tool kit', 'medical supplies']
            },
            'infiltrator': {
                name: 'Infiltrator',
                role: 'specialist',
                baseHp: 35,
                baseDamage: '1d10+1',
                skills: { stealth: 5, tech: 3, combat: 3 },
                equipment: ['stealth suit', 'hacking tools', 'silenced pistol']
            },
            'heavy': {
                name: 'Heavy Trooper',
                role: 'tank',
                baseHp: 70,
                baseDamage: '2d10',
                skills: { combat: 5, intimidation: 4 },
                equipment: ['heavy weapon', 'heavy armor']
            },
            'leader': {
                name: 'Squad Leader',
                role: 'elite',
                baseHp: 60,
                baseDamage: '1d10+3',
                skills: { command: 5, combat: 4, tactics: 4 },
                equipment: ['plasma rifle', 'tactical armor', 'comm unit']
            },
            'sniper': {
                name: 'Sniper',
                role: 'ranged',
                baseHp: 40,
                baseDamage: '2d10+2',
                skills: { combat: 5, perception: 5, stealth: 3 },
                equipment: ['sniper rifle', 'camouflage', 'rangefinder']
            },
            'medic': {
                name: 'Combat Medic',
                role: 'support',
                baseHp: 45,
                baseDamage: '1d10',
                skills: { medical: 5, combat: 2 },
                equipment: ['pistol', 'medical kit', 'stimpacks']
            },
            'pilot': {
                name: 'Vehicle Pilot',
                role: 'vehicle',
                baseHp: 40,
                baseDamage: '1d10',
                skills: { pilot: 5, tech: 3 },
                equipment: ['sidearm', 'flight suit', 'vehicle']
            }
        };
        
        // Environmental hazards
        this.environmentalHazards = {
            'vacuum': {
                name: 'Vacuum/No Atmosphere',
                effect: 'Requires EVA suits, limited time',
                modifier: { perception: -2, combat: -1 }
            },
            'zerog': {
                name: 'Zero Gravity',
                effect: 'Movement difficult, ranged combat affected',
                modifier: { athletics: -2, combat: -1 }
            },
            'radiation': {
                name: 'Radiation Zone',
                effect: '1d6 damage per round without protection',
                modifier: { all: -1 }
            },
            'darkness': {
                name: 'Total Darkness',
                effect: 'Vision-based actions difficult',
                modifier: { perception: -4, combat: -2 }
            },
            'extreme_heat': {
                name: 'Extreme Heat',
                effect: 'Exhaustion, equipment malfunction',
                modifier: { athletics: -2, tech: -1 }
            },
            'extreme_cold': {
                name: 'Extreme Cold',
                effect: 'Hypothermia risk, equipment issues',
                modifier: { athletics: -2, coordination: -1 }
            },
            'toxic_atmosphere': {
                name: 'Toxic Atmosphere',
                effect: 'Requires breathing apparatus',
                modifier: { all: -1 }
            },
            'electromagnetic': {
                name: 'EM Interference',
                effect: 'Electronics malfunction',
                modifier: { tech: -4, communication: -6 }
            }
        };
        
        // Bind methods
        this.generateNPC = this.generateNPC.bind(this);
        this.calculateBalance = this.calculateBalance.bind(this);
        this.saveEncounter = this.saveEncounter.bind(this);
        this.loadEncounter = this.loadEncounter.bind(this);
    }
    
    init(container) {
        this.element = container;
        this.render();
        this.attachEventListeners();
        return this;
    }
    
    render() {
        this.element.innerHTML = `
            <div class="encounter-builder">
                <div class="builder-header">
                    <h3>Encounter Builder</h3>
                    <div class="encounter-name">
                        <input type="text" id="encounter-name" value="${this.currentEncounter.name}" 
                               placeholder="Encounter Name" class="encounter-name-input">
                    </div>
                </div>
                
                <div class="builder-content">
                    <div class="party-config">
                        <h4>Party Configuration</h4>
                        <div class="config-grid">
                            <div class="config-item">
                                <label>Party Level</label>
                                <input type="number" id="party-level" value="${this.partyLevel}" 
                                       min="1" max="20" class="config-input">
                            </div>
                            <div class="config-item">
                                <label>Party Size</label>
                                <input type="number" id="party-size" value="${this.partySize}" 
                                       min="1" max="8" class="config-input">
                            </div>
                            <div class="config-item">
                                <label>Difficulty</label>
                                <select id="difficulty" class="config-select">
                                    <option value="easy">Easy</option>
                                    <option value="standard" selected>Standard</option>
                                    <option value="challenging">Challenging</option>
                                    <option value="deadly">Deadly</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="balance-indicator">
                            ${this.renderBalanceIndicator()}
                        </div>
                    </div>
                    
                    <div class="npc-section">
                        <h4>NPCs and Enemies</h4>
                        <div class="npc-templates">
                            ${Object.entries(this.npcTemplates).map(([key, template]) => `
                                <button class="template-btn" data-template="${key}">
                                    <span class="template-name">${template.name}</span>
                                    <span class="template-role">${template.role}</span>
                                </button>
                            `).join('')}
                        </div>
                        
                        <div class="custom-npc">
                            <button id="add-custom-npc" class="btn btn-secondary">
                                Add Custom NPC
                            </button>
                        </div>
                        
                        <div class="npc-list">
                            ${this.renderNPCList()}
                        </div>
                    </div>
                    
                    <div class="environment-section">
                        <h4>Environmental Factors</h4>
                        <select id="environment-select" class="environment-select">
                            <option value="">None</option>
                            ${Object.entries(this.environmentalHazards).map(([key, hazard]) => `
                                <option value="${key}">${hazard.name}</option>
                            `).join('')}
                        </select>
                        
                        <div class="environment-details">
                            ${this.renderEnvironmentDetails()}
                        </div>
                    </div>
                    
                    <div class="loot-section">
                        <h4>Potential Loot</h4>
                        <div class="loot-controls">
                            <select id="loot-era" class="loot-select">
                                <option value="primitive">Primitive Era</option>
                                <option value="industrial">Industrial Era</option>
                                <option value="advanced" selected>Advanced Era</option>
                                <option value="stellar">Stellar Era</option>
                                <option value="exotic">Exotic Era</option>
                            </select>
                            <button id="generate-loot" class="btn btn-sm">
                                Generate Loot
                            </button>
                        </div>
                        
                        <div class="loot-list">
                            ${this.renderLootList()}
                        </div>
                    </div>
                    
                    <div class="notes-section">
                        <h4>Encounter Notes</h4>
                        <textarea id="encounter-notes" class="encounter-notes" 
                                  placeholder="Tactics, motivations, special conditions...">${this.currentEncounter.notes}</textarea>
                    </div>
                </div>
                
                <div class="builder-actions">
                    <button id="save-encounter" class="btn btn-primary">Save Encounter</button>
                    <button id="load-encounter" class="btn btn-secondary">Load Encounter</button>
                    <button id="export-encounter" class="btn btn-secondary">Export JSON</button>
                    <button id="deploy-encounter" class="btn btn-primary">Deploy to Combat</button>
                </div>
            </div>
        `;
    }
    
    renderBalanceIndicator() {
        const balance = this.calculateBalance();
        const cssClass = balance.rating.toLowerCase().replace(' ', '-');
        
        return `
            <div class="balance-display ${cssClass}">
                <div class="balance-rating">${balance.rating}</div>
                <div class="balance-details">
                    <span>Total XP: ${balance.totalXP}</span>
                    <span>Per PC: ${balance.xpPerPC}</span>
                    <span>Recommended: ${balance.recommendedXP}</span>
                </div>
                <div class="balance-bar">
                    <div class="balance-fill" style="width: ${balance.percentage}%"></div>
                </div>
            </div>
        `;
    }
    
    renderNPCList() {
        if (this.currentEncounter.npcs.length === 0) {
            return '<p class="empty-list">No NPCs added yet</p>';
        }
        
        return this.currentEncounter.npcs.map((npc, index) => `
            <div class="npc-card" data-index="${index}">
                <div class="npc-header">
                    <input type="text" class="npc-name-input" value="${npc.name}" 
                           data-index="${index}" data-field="name">
                    <span class="npc-level">Level ${npc.level}</span>
                    <button class="btn-icon remove-npc" data-index="${index}">×</button>
                </div>
                <div class="npc-stats">
                    <div class="stat-group">
                        <label>HP:</label>
                        <input type="number" class="npc-stat-input" value="${npc.hp}" 
                               data-index="${index}" data-field="hp" min="1">
                    </div>
                    <div class="stat-group">
                        <label>Init:</label>
                        <input type="number" class="npc-stat-input" value="${npc.initiative}" 
                               data-index="${index}" data-field="initiative" min="-5" max="15">
                    </div>
                    <div class="stat-group">
                        <label>Defense:</label>
                        <input type="number" class="npc-stat-input" value="${npc.defense}" 
                               data-index="${index}" data-field="defense" min="8" max="30">
                    </div>
                </div>
                <div class="npc-equipment">
                    ${npc.equipment.join(', ')}
                </div>
            </div>
        `).join('');
    }
    
    renderEnvironmentDetails() {
        if (!this.currentEncounter.environment) {
            return '<p class="no-environment">No environmental hazards</p>';
        }
        
        const hazard = this.environmentalHazards[this.currentEncounter.environment];
        if (!hazard) return '';
        
        return `
            <div class="environment-info">
                <h5>${hazard.name}</h5>
                <p class="effect">${hazard.effect}</p>
                <div class="modifiers">
                    <strong>Modifiers:</strong>
                    ${Object.entries(hazard.modifier).map(([skill, mod]) => 
                        `<span class="modifier">${skill}: ${mod >= 0 ? '+' : ''}${mod}</span>`
                    ).join(', ')}
                </div>
            </div>
        `;
    }
    
    renderLootList() {
        if (this.currentEncounter.loot.length === 0) {
            return '<p class="empty-list">No loot generated</p>';
        }
        
        return `
            <ul class="loot-items">
                ${this.currentEncounter.loot.map((item, index) => `
                    <li class="loot-item">
                        <span class="item-name">${item.name}</span>
                        <span class="item-value">${item.value} cr</span>
                        <button class="btn-icon remove-loot" data-index="${index}">×</button>
                    </li>
                `).join('')}
            </ul>
            <div class="loot-total">
                Total Value: ${this.currentEncounter.loot.reduce((sum, item) => sum + item.value, 0)} cr
            </div>
        `;
    }
    
    attachEventListeners() {
        // Encounter name
        this.element.querySelector('#encounter-name').addEventListener('input', (e) => {
            this.currentEncounter.name = e.target.value;
        });
        
        // Party configuration
        this.element.querySelector('#party-level').addEventListener('change', (e) => {
            this.partyLevel = parseInt(e.target.value) || 1;
            this.updateBalance();
        });
        
        this.element.querySelector('#party-size').addEventListener('change', (e) => {
            this.partySize = parseInt(e.target.value) || 1;
            this.updateBalance();
        });
        
        this.element.querySelector('#difficulty').addEventListener('change', (e) => {
            this.encounterDifficulty = e.target.value;
            this.updateBalance();
        });
        
        // NPC templates
        this.element.querySelectorAll('.template-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const template = btn.dataset.template;
                this.addNPCFromTemplate(template);
            });
        });
        
        // Custom NPC
        this.element.querySelector('#add-custom-npc').addEventListener('click', () => {
            this.addCustomNPC();
        });
        
        // Environment
        this.element.querySelector('#environment-select').addEventListener('change', (e) => {
            this.currentEncounter.environment = e.target.value || null;
            this.updateEnvironmentDisplay();
        });
        
        // Loot generation
        this.element.querySelector('#generate-loot').addEventListener('click', () => {
            const era = this.element.querySelector('#loot-era').value;
            this.generateLoot(era);
        });
        
        // Notes
        this.element.querySelector('#encounter-notes').addEventListener('input', (e) => {
            this.currentEncounter.notes = e.target.value;
        });
        
        // Actions
        this.element.querySelector('#save-encounter').addEventListener('click', this.saveEncounter);
        this.element.querySelector('#load-encounter').addEventListener('click', this.loadEncounter);
        this.element.querySelector('#export-encounter').addEventListener('click', () => this.exportEncounter());
        this.element.querySelector('#deploy-encounter').addEventListener('click', () => this.deployToCombat());
        
        // Delegated events for dynamic content
        this.element.addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-npc')) {
                const index = parseInt(e.target.dataset.index);
                this.removeNPC(index);
            } else if (e.target.classList.contains('remove-loot')) {
                const index = parseInt(e.target.dataset.index);
                this.removeLoot(index);
            }
        });
        
        this.element.addEventListener('input', (e) => {
            if (e.target.classList.contains('npc-name-input') || 
                e.target.classList.contains('npc-stat-input')) {
                const index = parseInt(e.target.dataset.index);
                const field = e.target.dataset.field;
                const value = e.target.type === 'number' ? 
                    parseInt(e.target.value) || 0 : e.target.value;
                
                this.updateNPC(index, field, value);
            }
        });
    }
    
    generateNPC(template, level = null) {
        const npcLevel = level || this.partyLevel;
        const baseNPC = this.npcTemplates[template];
        
        // Scale stats based on level
        const levelMod = npcLevel - 5; // Base templates are for level 5
        
        return {
            name: `${baseNPC.name} ${Math.floor(Math.random() * 100)}`,
            level: npcLevel,
            role: baseNPC.role,
            hp: Math.max(10, baseNPC.baseHp + (levelMod * 5)),
            initiative: Math.floor(levelMod / 2),
            defense: 10 + Math.max(0, Math.min(8, 3 + Math.floor(levelMod / 2))),
            damage: baseNPC.baseDamage,
            skills: { ...baseNPC.skills },
            equipment: [...baseNPC.equipment],
            xpValue: this.calculateNPCXP(npcLevel, baseNPC.role)
        };
    }
    
    calculateNPCXP(level, role) {
        const baseXP = level * 100;
        const roleMultipliers = {
            'combatant': 1.0,
            'support': 0.8,
            'specialist': 0.9,
            'tank': 1.2,
            'elite': 1.5,
            'ranged': 1.0,
            'vehicle': 1.3
        };
        
        return Math.floor(baseXP * (roleMultipliers[role] || 1.0));
    }
    
    addNPCFromTemplate(templateKey) {
        const npc = this.generateNPC(templateKey);
        this.currentEncounter.npcs.push(npc);
        this.updateNPCList();
        this.updateBalance();
    }
    
    addCustomNPC() {
        const customNPC = {
            name: 'Custom NPC',
            level: this.partyLevel,
            role: 'combatant',
            hp: 50,
            initiative: 0,
            defense: 13,
            damage: '1d10',
            skills: {},
            equipment: [],
            xpValue: this.calculateNPCXP(this.partyLevel, 'combatant')
        };
        
        this.currentEncounter.npcs.push(customNPC);
        this.updateNPCList();
        this.updateBalance();
    }
    
    removeNPC(index) {
        this.currentEncounter.npcs.splice(index, 1);
        this.updateNPCList();
        this.updateBalance();
    }
    
    updateNPC(index, field, value) {
        if (this.currentEncounter.npcs[index]) {
            this.currentEncounter.npcs[index][field] = value;
            
            // Recalculate XP if level changed
            if (field === 'level') {
                const npc = this.currentEncounter.npcs[index];
                npc.xpValue = this.calculateNPCXP(value, npc.role);
                this.updateBalance();
            }
        }
    }
    
    generateLoot(era) {
        const lootTables = {
            'primitive': [
                { name: 'Crude Weapon', value: 50 },
                { name: 'Simple Armor', value: 100 },
                { name: 'Basic Supplies', value: 20 }
            ],
            'industrial': [
                { name: 'Firearm', value: 500 },
                { name: 'Body Armor', value: 1000 },
                { name: 'Medical Kit', value: 200 },
                { name: 'Electronics', value: 300 }
            ],
            'advanced': [
                { name: 'Energy Weapon', value: 2000 },
                { name: 'Combat Armor', value: 3000 },
                { name: 'Cybernetic Component', value: 5000 },
                { name: 'Hacking Module', value: 1500 }
            ],
            'stellar': [
                { name: 'Plasma Rifle', value: 10000 },
                { name: 'Power Armor', value: 25000 },
                { name: 'AI Core', value: 50000 },
                { name: 'Quantum Computer', value: 30000 }
            ],
            'exotic': [
                { name: 'Antimatter Cell', value: 100000 },
                { name: 'Psionic Amplifier', value: 75000 },
                { name: 'Nanobot Swarm', value: 150000 },
                { name: 'Temporal Stabilizer', value: 200000 }
            ]
        };
        
        const table = lootTables[era] || lootTables['advanced'];
        const numItems = Math.floor(Math.random() * 3) + 1;
        
        for (let i = 0; i < numItems; i++) {
            const item = table[Math.floor(Math.random() * table.length)];
            // Add some variance to value
            const variance = 0.8 + (Math.random() * 0.4);
            this.currentEncounter.loot.push({
                name: item.name,
                value: Math.floor(item.value * variance)
            });
        }
        
        this.updateLootList();
    }
    
    removeLoot(index) {
        this.currentEncounter.loot.splice(index, 1);
        this.updateLootList();
    }
    
    calculateBalance() {
        const totalXP = this.currentEncounter.npcs.reduce((sum, npc) => sum + npc.xpValue, 0);
        const xpPerPC = Math.floor(totalXP / this.partySize);
        
        // XP thresholds based on party level
        const thresholds = {
            easy: this.partyLevel * 50,
            standard: this.partyLevel * 100,
            challenging: this.partyLevel * 150,
            deadly: this.partyLevel * 200
        };
        
        const recommendedXP = thresholds[this.encounterDifficulty];
        const percentage = Math.min(100, (xpPerPC / recommendedXP) * 100);
        
        let rating = 'Too Easy';
        if (xpPerPC >= thresholds.deadly) rating = 'Deadly!';
        else if (xpPerPC >= thresholds.challenging) rating = 'Challenging';
        else if (xpPerPC >= thresholds.standard) rating = 'Standard';
        else if (xpPerPC >= thresholds.easy) rating = 'Easy';
        
        return {
            totalXP,
            xpPerPC,
            recommendedXP,
            percentage,
            rating
        };
    }
    
    updateBalance() {
        const indicator = this.element.querySelector('.balance-indicator');
        if (indicator) {
            indicator.innerHTML = this.renderBalanceIndicator();
        }
    }
    
    updateNPCList() {
        const list = this.element.querySelector('.npc-list');
        if (list) {
            list.innerHTML = this.renderNPCList();
        }
    }
    
    updateEnvironmentDisplay() {
        const details = this.element.querySelector('.environment-details');
        if (details) {
            details.innerHTML = this.renderEnvironmentDetails();
        }
    }
    
    updateLootList() {
        const list = this.element.querySelector('.loot-list');
        if (list) {
            list.innerHTML = this.renderLootList();
        }
    }
    
    async saveEncounter() {
        const encounterData = {
            ...this.currentEncounter,
            partyLevel: this.partyLevel,
            partySize: this.partySize,
            difficulty: this.encounterDifficulty,
            timestamp: Date.now()
        };
        
        // Save to IndexedDB via dataManager
        const encounters = JSON.parse(localStorage.getItem('cosmos-vtt-encounters') || '[]');
        encounters.push(encounterData);
        localStorage.setItem('cosmos-vtt-encounters', JSON.stringify(encounters));
        
        this.showNotification('Encounter saved!', 'success');
    }
    
    async loadEncounter() {
        const encounters = JSON.parse(localStorage.getItem('cosmos-vtt-encounters') || '[]');
        
        if (encounters.length === 0) {
            this.showNotification('No saved encounters found', 'warning');
            return;
        }
        
        // Simple selection - could be enhanced with a modal
        const names = encounters.map((e, i) => `${i + 1}. ${e.name} (Level ${e.partyLevel})`).join('\n');
        const selected = prompt('Select encounter:\n' + names);
        
        const index = parseInt(selected) - 1;
        if (index >= 0 && index < encounters.length) {
            const encounter = encounters[index];
            this.currentEncounter = {
                name: encounter.name,
                npcs: encounter.npcs || [],
                environment: encounter.environment,
                loot: encounter.loot || [],
                notes: encounter.notes || ''
            };
            this.partyLevel = encounter.partyLevel || 5;
            this.partySize = encounter.partySize || 4;
            this.encounterDifficulty = encounter.difficulty || 'standard';
            
            this.render();
            this.attachEventListeners();
            this.showNotification('Encounter loaded!', 'success');
        }
    }
    
    exportEncounter() {
        const encounterData = {
            ...this.currentEncounter,
            partyLevel: this.partyLevel,
            partySize: this.partySize,
            difficulty: this.encounterDifficulty,
            exportDate: new Date().toISOString()
        };
        
        const dataStr = JSON.stringify(encounterData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `${this.currentEncounter.name.replace(/\s+/g, '_')}_encounter.json`;
        link.click();
        
        this.showNotification('Encounter exported!', 'success');
    }
    
    deployToCombat() {
        if (this.currentEncounter.npcs.length === 0) {
            this.showNotification('Add NPCs before deploying', 'warning');
            return;
        }
        
        // Emit event to combat tracker
        if (this.eventBus) {
            this.eventBus.emit('deploy-encounter', {
                encounter: this.currentEncounter,
                environment: this.currentEncounter.environment ? 
                    this.environmentalHazards[this.currentEncounter.environment] : null
            });
            
            this.showNotification('Encounter deployed to Combat Tracker!', 'success');
            
            // Switch to combat view
            window.location.hash = '#/combat';
        }
    }
    
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
    
    // Public API
    getEncounter() {
        return { ...this.currentEncounter };
    }
    
    setPartyConfig(level, size) {
        this.partyLevel = level;
        this.partySize = size;
        this.updateBalance();
    }
    
    importEncounter(encounterData) {
        this.currentEncounter = {
            name: encounterData.name || 'Imported Encounter',
            npcs: encounterData.npcs || [],
            environment: encounterData.environment || null,
            loot: encounterData.loot || [],
            notes: encounterData.notes || ''
        };
        
        if (encounterData.partyLevel) this.partyLevel = encounterData.partyLevel;
        if (encounterData.partySize) this.partySize = encounterData.partySize;
        if (encounterData.difficulty) this.encounterDifficulty = encounterData.difficulty;
        
        this.render();
        this.attachEventListeners();
    }
}