/**
 * CharacterSheet Component
 * 
 * Interactive character sheet for Cosmos Engine
 * Features:
 * - PRIMAC attribute management
 * - Skill calculations with specializations
 * - Auto-calculate Defense, HP, Initiative
 * - Equipment integration
 * - Level tracking and advancement
 * - Import/Export JSON functionality
 */

export class CharacterSheet {
    constructor(config, dataManager, eventBus) {
        this.config = config;
        this.dataManager = dataManager;
        this.eventBus = eventBus;
        this.element = null;
        this.character = this.createNewCharacter();
        this.attributes = null;
        this.skills = null;
        
        // Bind methods
        this.save = this.save.bind(this);
        this.load = this.load.bind(this);
        this.export = this.export.bind(this);
        this.import = this.import.bind(this);
        
        // Listen for skill advancement events
        if (this.eventBus) {
            this.eventBus.on('skill:advance', (data) => {
                if (data.characterId === this.character.id) {
                    // Reload character to get updated data
                    this.character = data.character;
                    this.render();
                    this.attachEventListeners();
                }
            });
        }
    }
    
    async init(container) {
        this.element = container;
        
        // Load game data
        await this.loadGameData();
        
        // Load saved character if exists
        const savedCharId = localStorage.getItem('cosmos-vtt-active-character');
        if (savedCharId) {
            const savedChar = await this.dataManager.loadCharacter(parseInt(savedCharId));
            if (savedChar) {
                this.character = savedChar;
            }
        }
        
        this.render();
        this.attachEventListeners();
        return this;
    }
    
    async loadGameData() {
        // Load attributes and skills data
        this.attributes = await this.dataManager.loadData('attributes.json');
        this.skills = await this.dataManager.loadData('skills.json');
    }
    
    createNewCharacter() {
        return {
            id: null,
            name: 'New Character',
            level: 1,
            species: 'Human',
            background: '',
            
            // PRIMAC Attributes (0-8 range)
            attributes: {
                presence: 3,
                resolve: 3,
                intellect: 3,
                might: 3,
                awareness: 3,
                coordination: 3
            },
            
            // Skills (0-10 range)
            skills: {
                combat: 0,
                pilot: 0,
                stealth: 0,
                athletics: 0,
                survival: 0,
                intimidation: 0,
                perception: 0,
                medical: 0,
                tech: 0,
                knowledge: 0,
                deception: 0,
                persuasion: 0,
                command: 0,
                discipline: 0
            },
            
            // Specializations
            specializations: {},
            
            // Skill Trees
            skillPaths: {},  // Selected paths for each skill
            unlockedNodes: [],  // Array of unlocked node IDs
            
            // Derived stats
            hp: 50,
            maxHp: 50,
            defense: 10,
            initiative: 0,
            
            // Equipment
            equipment: {
                weapons: [],
                armor: null,
                gear: []
            },
            
            // Resources
            credits: 1000,
            xp: 100,  // Starting XP for skill advancement
            
            // Notes
            notes: '',
            
            // Metadata
            created: Date.now(),
            lastModified: Date.now()
        };
    }
    
    render() {
        this.element.innerHTML = `
            <div class="character-sheet">
                <div class="sheet-header">
                    <div class="character-basics">
                        <input type="text" id="char-name" class="char-name" value="${this.character.name}">
                        <div class="char-meta">
                            <label>Level: <input type="number" id="char-level" value="${this.character.level}" min="1" max="20"></label>
                            <label>Species: <input type="text" id="char-species" value="${this.character.species}"></label>
                        </div>
                    </div>
                    <div class="sheet-actions">
                        <button id="save-character" class="btn btn-primary">Save</button>
                        <button id="load-character" class="btn btn-secondary">Load</button>
                        <button id="export-character" class="btn btn-secondary">Export</button>
                        <button id="import-character" class="btn btn-secondary">Import</button>
                    </div>
                </div>
                
                <div class="sheet-content">
                    <!-- Attributes Section -->
                    <section class="attributes-section">
                        <h3>Attributes (PRIMAC)</h3>
                        <div class="attributes-grid">
                            ${this.renderAttributes()}
                        </div>
                    </section>
                    
                    <!-- Derived Stats -->
                    <section class="derived-stats">
                        <h3>Derived Statistics</h3>
                        <div class="stats-grid">
                            <div class="stat-box">
                                <label>Hit Points</label>
                                <div class="hp-display">
                                    <input type="number" id="current-hp" value="${this.character.hp}" max="${this.character.maxHp}">
                                    <span>/</span>
                                    <span id="max-hp">${this.character.maxHp}</span>
                                </div>
                            </div>
                            <div class="stat-box">
                                <label>Defense</label>
                                <div class="stat-value" id="defense-value">${this.calculateDefense()}</div>
                            </div>
                            <div class="stat-box">
                                <label>Initiative</label>
                                <div class="stat-value" id="initiative-value">${this.calculateInitiative()}</div>
                            </div>
                        </div>
                    </section>
                    
                    <!-- Skills Section -->
                    <section class="skills-section">
                        <div class="skills-header">
                            <h3>Skills</h3>
                            <button class="btn btn-sm btn-primary" onclick="window.location.hash = '/skilltrees'">View Skill Trees</button>
                        </div>
                        <div class="skills-grid">
                            ${this.renderSkills()}
                        </div>
                    </section>
                    
                    <!-- Equipment Section -->
                    <section class="equipment-section">
                        <h3>Equipment</h3>
                        <div class="equipment-slots">
                            <div class="weapon-slot">
                                <h4>Weapons</h4>
                                <div id="weapons-list" class="equipment-list"></div>
                                <button class="btn btn-sm" onclick="alert('Weapon management coming soon')">Add Weapon</button>
                            </div>
                            <div class="armor-slot">
                                <h4>Armor</h4>
                                <div id="armor-display" class="equipment-item">
                                    ${this.character.equipment.armor || 'None equipped'}
                                </div>
                            </div>
                        </div>
                    </section>
                    
                    <!-- Resources Section -->
                    <section class="resources-section">
                        <h3>Resources</h3>
                        <div class="resources-grid">
                            <div class="resource-box">
                                <label>Credits</label>
                                <input type="number" id="credits" class="resource-input" value="${this.character.credits}" min="0">
                            </div>
                            <div class="resource-box">
                                <label>Experience Points (XP)</label>
                                <input type="number" id="xp" class="resource-input" value="${this.character.xp}" min="0">
                            </div>
                        </div>
                    </section>
                    
                    <!-- Notes Section -->
                    <section class="notes-section">
                        <h3>Notes</h3>
                        <textarea id="char-notes" class="char-notes" placeholder="Character background, goals, etc...">${this.character.notes}</textarea>
                    </section>
                </div>
            </div>
            
            <!-- Hidden file input for import -->
            <input type="file" id="import-file" style="display: none;" accept=".json">
        `;
    }
    
    renderAttributes() {
        if (!this.attributes) return '';
        
        return Object.entries(this.attributes.attributes).map(([key, attr]) => `
            <div class="attribute-box" style="--attr-color: ${attr.color}">
                <label>${attr.name}</label>
                <input type="number" 
                       class="attribute-input" 
                       data-attribute="${key}" 
                       value="${this.character.attributes[key]}" 
                       min="0" 
                       max="8">
                <span class="attr-abbr">${attr.abbreviation}</span>
            </div>
        `).join('');
    }
    
    renderSkills() {
        if (!this.skills) return '';
        
        return Object.entries(this.skills.skills).map(([key, skill]) => {
            const attrValue = this.character.attributes[skill.attribute] || 0;
            const skillValue = this.character.skills[key] || 0;
            const totalBonus = attrValue + Math.floor(skillValue / 2);
            
            return `
                <div class="skill-box">
                    <label>${skill.name}</label>
                    <div class="skill-controls">
                        <input type="number" 
                               class="skill-input" 
                               data-skill="${key}" 
                               value="${skillValue}" 
                               min="0" 
                               max="10">
                        <span class="skill-total">+${totalBonus}</span>
                        <span class="skill-attr">(${this.attributes.attributes[skill.attribute].abbreviation})</span>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    calculateDefense() {
        const coordination = this.character.attributes.coordination || 0;
        const combatSkill = this.character.skills.combat || 0;
        const armorBonus = 0; // TODO: Calculate from equipped armor
        
        return 10 + coordination + Math.floor(combatSkill / 2) + armorBonus;
    }
    
    calculateInitiative() {
        const awareness = this.character.attributes.awareness || 0;
        const coordination = this.character.attributes.coordination || 0;
        
        return awareness + coordination;
    }
    
    calculateMaxHp() {
        const might = this.character.attributes.might || 0;
        const resolve = this.character.attributes.resolve || 0;
        const level = this.character.level || 1;
        
        return 30 + (might * 5) + (resolve * 5) + (level * 5);
    }
    
    attachEventListeners() {
        // Character basics
        this.element.querySelector('#char-name').addEventListener('input', (e) => {
            this.character.name = e.target.value;
            this.autoSave();
        });
        
        this.element.querySelector('#char-level').addEventListener('input', (e) => {
            this.character.level = parseInt(e.target.value) || 1;
            this.updateDerivedStats();
            this.autoSave();
        });
        
        this.element.querySelector('#char-species').addEventListener('input', (e) => {
            this.character.species = e.target.value;
            this.autoSave();
        });
        
        // Attributes
        this.element.querySelectorAll('.attribute-input').forEach(input => {
            input.addEventListener('input', (e) => {
                const attr = e.target.dataset.attribute;
                this.character.attributes[attr] = parseInt(e.target.value) || 0;
                this.updateDerivedStats();
                this.updateSkillTotals();
                this.autoSave();
            });
        });
        
        // Skills
        this.element.querySelectorAll('.skill-input').forEach(input => {
            input.addEventListener('input', (e) => {
                const skill = e.target.dataset.skill;
                this.character.skills[skill] = parseInt(e.target.value) || 0;
                this.updateSkillTotal(skill);
                if (skill === 'combat') {
                    this.updateDerivedStats();
                }
                this.autoSave();
            });
        });
        
        // HP tracking
        this.element.querySelector('#current-hp').addEventListener('input', (e) => {
            this.character.hp = parseInt(e.target.value) || 0;
            this.autoSave();
        });
        
        // Resources
        this.element.querySelector('#credits').addEventListener('input', (e) => {
            this.character.credits = parseInt(e.target.value) || 0;
            this.autoSave();
        });
        
        this.element.querySelector('#xp').addEventListener('input', (e) => {
            this.character.xp = parseInt(e.target.value) || 0;
            this.autoSave();
        });
        
        // Notes
        this.element.querySelector('#char-notes').addEventListener('input', (e) => {
            this.character.notes = e.target.value;
            this.autoSave();
        });
        
        // Action buttons
        this.element.querySelector('#save-character').addEventListener('click', this.save);
        this.element.querySelector('#load-character').addEventListener('click', this.load);
        this.element.querySelector('#export-character').addEventListener('click', this.export);
        this.element.querySelector('#import-character').addEventListener('click', this.import);
        
        // File import
        const fileInput = this.element.querySelector('#import-file');
        fileInput.addEventListener('change', (e) => this.handleFileImport(e));
    }
    
    updateDerivedStats() {
        // Update max HP
        const newMaxHp = this.calculateMaxHp();
        if (newMaxHp !== this.character.maxHp) {
            const hpRatio = this.character.hp / this.character.maxHp;
            this.character.maxHp = newMaxHp;
            this.character.hp = Math.floor(newMaxHp * hpRatio);
            
            this.element.querySelector('#max-hp').textContent = newMaxHp;
            this.element.querySelector('#current-hp').max = newMaxHp;
            this.element.querySelector('#current-hp').value = this.character.hp;
        }
        
        // Update defense
        this.character.defense = this.calculateDefense();
        this.element.querySelector('#defense-value').textContent = this.character.defense;
        
        // Update initiative
        this.character.initiative = this.calculateInitiative();
        this.element.querySelector('#initiative-value').textContent = 
            this.character.initiative >= 0 ? `+${this.character.initiative}` : this.character.initiative;
    }
    
    updateSkillTotals() {
        Object.keys(this.character.skills).forEach(skill => {
            this.updateSkillTotal(skill);
        });
    }
    
    updateSkillTotal(skillKey) {
        const skill = this.skills.skills[skillKey];
        if (!skill) return;
        
        const attrValue = this.character.attributes[skill.attribute] || 0;
        const skillValue = this.character.skills[skillKey] || 0;
        const totalBonus = attrValue + Math.floor(skillValue / 2);
        
        const totalSpan = this.element.querySelector(`[data-skill="${skillKey}"]`)?.parentElement?.querySelector('.skill-total');
        if (totalSpan) {
            totalSpan.textContent = `+${totalBonus}`;
        }
    }
    
    autoSave() {
        // Debounced auto-save
        clearTimeout(this.saveTimeout);
        this.saveTimeout = setTimeout(() => {
            this.saveToLocal();
        }, 1000);
    }
    
    async save() {
        this.character.lastModified = Date.now();
        const id = await this.dataManager.saveCharacter(this.character);
        this.character.id = id;
        
        // Set as active character
        localStorage.setItem('cosmos-vtt-active-character', id);
        
        this.showNotification('Character saved!', 'success');
    }
    
    saveToLocal() {
        // Quick save to localStorage for recovery
        localStorage.setItem('cosmos-vtt-character-draft', JSON.stringify(this.character));
    }
    
    async load() {
        const characters = await this.dataManager.getAllCharacters();
        
        if (characters.length === 0) {
            this.showNotification('No saved characters found', 'warning');
            return;
        }
        
        // Simple character selection - could be enhanced with a modal
        const selected = prompt(
            'Select character:\n' + 
            characters.map((c, i) => `${i + 1}. ${c.name} (Level ${c.level})`).join('\n')
        );
        
        const index = parseInt(selected) - 1;
        if (index >= 0 && index < characters.length) {
            this.character = characters[index];
            localStorage.setItem('cosmos-vtt-active-character', this.character.id);
            this.render();
            this.attachEventListeners();
            this.showNotification('Character loaded!', 'success');
        }
    }
    
    export() {
        const dataStr = JSON.stringify(this.character, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `${this.character.name.replace(/\s+/g, '_')}_cosmos_engine.json`;
        link.click();
        
        this.showNotification('Character exported!', 'success');
    }
    
    import() {
        this.element.querySelector('#import-file').click();
    }
    
    async handleFileImport(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        try {
            const text = await file.text();
            const importedChar = JSON.parse(text);
            
            // Validate character data
            if (!importedChar.attributes || !importedChar.skills) {
                throw new Error('Invalid character file');
            }
            
            // Use imported character
            this.character = importedChar;
            this.character.id = null; // Reset ID for new save
            this.character.lastModified = Date.now();
            
            this.render();
            this.attachEventListeners();
            this.showNotification('Character imported!', 'success');
            
        } catch (error) {
            this.showNotification('Failed to import character: ' + error.message, 'error');
        }
        
        // Clear file input
        event.target.value = '';
    }
    
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
    
    // Public API
    getCharacter() {
        return { ...this.character };
    }
    
    setCharacter(character) {
        this.character = { ...character };
        this.render();
        this.attachEventListeners();
    }
    
    rollSkillCheck(skillKey) {
        const skill = this.skills.skills[skillKey];
        if (!skill) return null;
        
        const attrValue = this.character.attributes[skill.attribute] || 0;
        const skillValue = this.character.skills[skillKey] || 0;
        const totalBonus = attrValue + Math.floor(skillValue / 2);
        
        return {
            skill: skill.name,
            attribute: skill.attribute,
            bonus: totalBonus
        };
    }
}