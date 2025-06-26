/**
 * NPCManager Component
 * 
 * Comprehensive NPC database and management system
 * Features:
 * - NPC creation with full stat blocks
 * - Categorization and tagging
 * - Relationship tracking
 * - Quick reference cards
 * - NPC generator
 * - Portrait management
 */

export class NPCManager {
    constructor(config, dataManager, stateManager) {
        this.config = config;
        this.dataManager = dataManager;
        this.stateManager = stateManager;
        this.element = null;
        
        // NPC state
        this.npcs = [];
        this.currentNPC = null;
        this.filters = {
            search: '',
            category: 'all',
            tags: new Set(),
            location: 'all'
        };
        
        // NPC categories
        this.categories = [
            'Major NPC',
            'Minor NPC',
            'Antagonist',
            'Ally',
            'Neutral',
            'Contact',
            'Faction Leader'
        ];
        
        // Relationship types
        this.relationshipTypes = [
            'Family',
            'Friend',
            'Rival',
            'Enemy',
            'Employer',
            'Employee',
            'Romantic',
            'Mentor',
            'Student',
            'Associate'
        ];
        
        // Load NPCs
        this.loadNPCs();
        
        // Bind methods
        this.createNPC = this.createNPC.bind(this);
        this.saveNPC = this.saveNPC.bind(this);
        this.deleteNPC = this.deleteNPC.bind(this);
        this.generateNPC = this.generateNPC.bind(this);
    }
    
    init(container) {
        this.element = container;
        this.render();
        this.attachEventListeners();
        return this;
    }
    
    render() {
        this.element.innerHTML = `
            <div class="npc-manager">
                <div class="manager-sidebar">
                    <div class="sidebar-header">
                        <h4>NPCs</h4>
                        <div class="sidebar-actions">
                            <button id="new-npc" class="btn btn-primary btn-sm">+ New</button>
                            <button id="generate-npc" class="btn btn-secondary btn-sm">⚡ Generate</button>
                        </div>
                    </div>
                    
                    <div class="npc-search">
                        <input type="text" id="npc-search" placeholder="Search NPCs..." 
                               value="${this.filters.search}" class="search-input">
                    </div>
                    
                    <div class="npc-filters">
                        <select id="category-filter" class="filter-select">
                            <option value="all">All Categories</option>
                            ${this.categories.map(cat => `
                                <option value="${cat}">${cat}</option>
                            `).join('')}
                        </select>
                        
                        <select id="location-filter" class="filter-select">
                            <option value="all">All Locations</option>
                            ${this.getUniqueLocations().map(loc => `
                                <option value="${loc}">${loc}</option>
                            `).join('')}
                        </select>
                    </div>
                    
                    <div class="npc-list">
                        ${this.renderNPCList()}
                    </div>
                    
                    <div class="npc-stats">
                        <div class="stat-item">
                            <span class="stat-value">${this.npcs.length}</span>
                            <span class="stat-label">Total NPCs</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-value">${this.getActiveNPCs().length}</span>
                            <span class="stat-label">Active</span>
                        </div>
                    </div>
                </div>
                
                <div class="manager-content">
                    ${this.currentNPC ? this.renderNPCDetails() : this.renderWelcome()}
                </div>
            </div>
        `;
    }
    
    renderNPCList() {
        const filtered = this.getFilteredNPCs();
        
        if (filtered.length === 0) {
            return '<p class="no-npcs">No NPCs found</p>';
        }
        
        // Group by category
        const grouped = {};
        filtered.forEach(npc => {
            const category = npc.category || 'Uncategorized';
            if (!grouped[category]) {
                grouped[category] = [];
            }
            grouped[category].push(npc);
        });
        
        return Object.entries(grouped).map(([category, npcs]) => `
            <div class="npc-group">
                <div class="group-header">${category} (${npcs.length})</div>
                ${npcs.map(npc => `
                    <div class="npc-item ${npc.id === this.currentNPC?.id ? 'active' : ''}" 
                         data-npc-id="${npc.id}">
                        <div class="npc-portrait">
                            ${npc.portrait ? 
                                `<img src="${npc.portrait}" alt="${npc.name}">` :
                                `<div class="portrait-placeholder">${this.getInitials(npc.name)}</div>`
                            }
                        </div>
                        <div class="npc-info">
                            <div class="npc-name">${npc.name}</div>
                            <div class="npc-role">${npc.role || 'No role'}</div>
                        </div>
                        ${npc.isAlive === false ? '<span class="deceased-marker">†</span>' : ''}
                    </div>
                `).join('')}
            </div>
        `).join('');
    }
    
    renderNPCDetails() {
        const npc = this.currentNPC;
        
        return `
            <div class="npc-details">
                <div class="details-header">
                    <div class="header-main">
                        <input type="text" id="npc-name" value="${npc.name}" 
                               placeholder="NPC Name" class="name-input">
                        <div class="header-actions">
                            <button id="save-npc" class="btn btn-primary">Save</button>
                            <button id="export-npc" class="btn btn-secondary">Export</button>
                            <button id="delete-npc" class="btn btn-danger">Delete</button>
                        </div>
                    </div>
                    <div class="header-meta">
                        <select id="npc-category" class="category-select">
                            ${this.categories.map(cat => `
                                <option value="${cat}" ${npc.category === cat ? 'selected' : ''}>
                                    ${cat}
                                </option>
                            `).join('')}
                        </select>
                        <label class="alive-toggle">
                            <input type="checkbox" id="npc-alive" ${npc.isAlive !== false ? 'checked' : ''}>
                            <span>Alive</span>
                        </label>
                    </div>
                </div>
                
                <div class="details-content">
                    <div class="detail-section portrait-section">
                        <h5>Portrait</h5>
                        <div class="portrait-container">
                            ${npc.portrait ? 
                                `<img src="${npc.portrait}" alt="${npc.name}" class="npc-portrait-full">` :
                                `<div class="portrait-placeholder-large">${this.getInitials(npc.name)}</div>`
                            }
                            <button id="change-portrait" class="btn btn-sm">Change Portrait</button>
                        </div>
                    </div>
                    
                    <div class="detail-section">
                        <h5>Basic Information</h5>
                        <div class="info-grid">
                            <div class="info-item">
                                <label>Role/Title</label>
                                <input type="text" id="npc-role" value="${npc.role || ''}" 
                                       placeholder="e.g., Ship Captain, Crime Boss">
                            </div>
                            <div class="info-item">
                                <label>Species</label>
                                <input type="text" id="npc-species" value="${npc.species || ''}" 
                                       placeholder="e.g., Human, Synthetic">
                            </div>
                            <div class="info-item">
                                <label>Location</label>
                                <input type="text" id="npc-location" value="${npc.location || ''}" 
                                       placeholder="Current location">
                            </div>
                            <div class="info-item">
                                <label>Age</label>
                                <input type="text" id="npc-age" value="${npc.age || ''}" 
                                       placeholder="Age or apparent age">
                            </div>
                        </div>
                    </div>
                    
                    <div class="detail-section">
                        <h5>Description</h5>
                        <textarea id="npc-description" class="description-area" 
                                  placeholder="Physical appearance, mannerisms, first impressions...">${npc.description || ''}</textarea>
                    </div>
                    
                    <div class="detail-section">
                        <h5>Background</h5>
                        <textarea id="npc-background" class="background-area" 
                                  placeholder="History, motivations, goals...">${npc.background || ''}</textarea>
                    </div>
                    
                    <div class="detail-section">
                        <h5>Game Statistics</h5>
                        <div class="stats-grid">
                            <div class="stat-group">
                                <label>Level</label>
                                <input type="number" id="npc-level" value="${npc.stats?.level || 1}" 
                                       min="1" max="20">
                            </div>
                            <div class="stat-group">
                                <label>HP</label>
                                <input type="number" id="npc-hp" value="${npc.stats?.hp || 10}" 
                                       min="1">
                            </div>
                            <div class="stat-group">
                                <label>Defense</label>
                                <input type="number" id="npc-defense" value="${npc.stats?.defense || 10}" 
                                       min="1">
                            </div>
                            <div class="stat-group">
                                <label>Initiative</label>
                                <input type="number" id="npc-initiative" value="${npc.stats?.initiative || 0}" 
                                       min="-5" max="15">
                            </div>
                        </div>
                        
                        <div class="attributes-section">
                            <h6>Attributes (PRIMAC)</h6>
                            <div class="attributes-grid">
                                ${['Presence', 'Resolve', 'Intellect', 'Might', 'Awareness', 'Coordination'].map(attr => `
                                    <div class="attribute-item">
                                        <label>${attr}</label>
                                        <input type="number" data-attribute="${attr.toLowerCase()}" 
                                               value="${npc.stats?.attributes?.[attr.toLowerCase()] || 0}" 
                                               min="0" max="5">
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                        
                        <div class="skills-section">
                            <h6>Key Skills</h6>
                            <textarea id="npc-skills" class="skills-area" 
                                      placeholder="List key skills and ratings...">${npc.stats?.skills || ''}</textarea>
                        </div>
                    </div>
                    
                    <div class="detail-section">
                        <h5>Relationships</h5>
                        <div class="relationships-toolbar">
                            <button id="add-relationship" class="btn btn-sm">+ Add Relationship</button>
                        </div>
                        <div class="relationships-list">
                            ${this.renderRelationships(npc.relationships || [])}
                        </div>
                    </div>
                    
                    <div class="detail-section">
                        <h5>Notes & Secrets</h5>
                        <textarea id="npc-notes" class="notes-area" 
                                  placeholder="GM notes, secrets, plot hooks...">${npc.notes || ''}</textarea>
                    </div>
                    
                    <div class="detail-section">
                        <h5>Tags</h5>
                        <input type="text" id="npc-tags" value="${(npc.tags || []).join(', ')}" 
                               placeholder="Tags (comma separated)" class="tags-input">
                    </div>
                </div>
            </div>
        `;
    }
    
    renderWelcome() {
        return `
            <div class="npc-welcome">
                <h3>NPC Manager</h3>
                <p>Create and manage non-player characters for your campaign.</p>
                
                <div class="welcome-actions">
                    <button class="action-card" id="create-npc-welcome">
                        <span class="action-icon">👤</span>
                        <span class="action-label">Create NPC</span>
                        <span class="action-desc">Build a new character from scratch</span>
                    </button>
                    <button class="action-card" id="generate-npc-welcome">
                        <span class="action-icon">⚡</span>
                        <span class="action-label">Generate NPC</span>
                        <span class="action-desc">Quick random NPC generator</span>
                    </button>
                    <button class="action-card" id="import-npc-welcome">
                        <span class="action-icon">📥</span>
                        <span class="action-label">Import NPCs</span>
                        <span class="action-desc">Load NPCs from file</span>
                    </button>
                </div>
                
                <div class="recent-npcs">
                    <h4>Recent NPCs</h4>
                    ${this.renderRecentNPCs()}
                </div>
            </div>
        `;
    }
    
    renderRelationships(relationships) {
        if (relationships.length === 0) {
            return '<p class="no-relationships">No relationships defined</p>';
        }
        
        return relationships.map((rel, index) => `
            <div class="relationship-item">
                <select class="relationship-type" data-index="${index}">
                    ${this.relationshipTypes.map(type => `
                        <option value="${type}" ${rel.type === type ? 'selected' : ''}>${type}</option>
                    `).join('')}
                </select>
                <input type="text" class="relationship-target" data-index="${index}" 
                       value="${rel.target}" placeholder="Character name">
                <input type="text" class="relationship-notes" data-index="${index}" 
                       value="${rel.notes || ''}" placeholder="Notes">
                <button class="btn-icon remove-relationship" data-index="${index}">×</button>
            </div>
        `).join('');
    }
    
    renderRecentNPCs() {
        const recent = this.npcs
            .sort((a, b) => (b.modified || 0) - (a.modified || 0))
            .slice(0, 5);
        
        if (recent.length === 0) {
            return '<p class="no-recent">No NPCs created yet</p>';
        }
        
        return `
            <div class="recent-grid">
                ${recent.map(npc => `
                    <div class="recent-npc-card" data-npc-id="${npc.id}">
                        <div class="recent-portrait">
                            ${npc.portrait ? 
                                `<img src="${npc.portrait}" alt="${npc.name}">` :
                                `<div class="portrait-placeholder">${this.getInitials(npc.name)}</div>`
                            }
                        </div>
                        <div class="recent-info">
                            <div class="recent-name">${npc.name}</div>
                            <div class="recent-role">${npc.role || 'No role'}</div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    attachEventListeners() {
        // Sidebar controls
        const newBtn = this.element.querySelector('#new-npc');
        if (newBtn) {
            newBtn.addEventListener('click', this.createNPC);
        }
        
        const generateBtn = this.element.querySelector('#generate-npc');
        if (generateBtn) {
            generateBtn.addEventListener('click', this.generateNPC);
        }
        
        // Search and filters
        const searchInput = this.element.querySelector('#npc-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filters.search = e.target.value;
                this.updateNPCList();
            });
        }
        
        const categoryFilter = this.element.querySelector('#category-filter');
        if (categoryFilter) {
            categoryFilter.addEventListener('change', (e) => {
                this.filters.category = e.target.value;
                this.updateNPCList();
            });
        }
        
        const locationFilter = this.element.querySelector('#location-filter');
        if (locationFilter) {
            locationFilter.addEventListener('change', (e) => {
                this.filters.location = e.target.value;
                this.updateNPCList();
            });
        }
        
        // NPC details
        if (this.currentNPC) {
            this.attachDetailListeners();
        }
        
        // Welcome actions
        const createWelcome = this.element.querySelector('#create-npc-welcome');
        if (createWelcome) {
            createWelcome.addEventListener('click', this.createNPC);
        }
        
        const generateWelcome = this.element.querySelector('#generate-npc-welcome');
        if (generateWelcome) {
            generateWelcome.addEventListener('click', this.generateNPC);
        }
        
        // Delegated events
        this.element.addEventListener('click', (e) => {
            // NPC selection
            const npcItem = e.target.closest('.npc-item');
            if (npcItem) {
                this.selectNPC(npcItem.dataset.npcId);
            }
            
            // Recent NPC selection
            const recentCard = e.target.closest('.recent-npc-card');
            if (recentCard) {
                this.selectNPC(recentCard.dataset.npcId);
            }
            
            // Remove relationship
            if (e.target.classList.contains('remove-relationship')) {
                const index = parseInt(e.target.dataset.index);
                this.removeRelationship(index);
            }
        });
        
        // Relationship changes
        this.element.addEventListener('change', (e) => {
            if (e.target.classList.contains('relationship-type') ||
                e.target.classList.contains('relationship-target') ||
                e.target.classList.contains('relationship-notes')) {
                this.updateRelationship(e.target);
            }
        });
    }
    
    attachDetailListeners() {
        // Basic info
        ['name', 'role', 'species', 'location', 'age'].forEach(field => {
            const input = this.element.querySelector(`#npc-${field}`);
            if (input) {
                input.addEventListener('input', (e) => {
                    this.currentNPC[field] = e.target.value;
                });
            }
        });
        
        // Category
        const categorySelect = this.element.querySelector('#npc-category');
        if (categorySelect) {
            categorySelect.addEventListener('change', (e) => {
                this.currentNPC.category = e.target.value;
            });
        }
        
        // Alive status
        const aliveCheck = this.element.querySelector('#npc-alive');
        if (aliveCheck) {
            aliveCheck.addEventListener('change', (e) => {
                this.currentNPC.isAlive = e.target.checked;
            });
        }
        
        // Text areas
        ['description', 'background', 'notes'].forEach(field => {
            const textarea = this.element.querySelector(`#npc-${field}`);
            if (textarea) {
                textarea.addEventListener('input', (e) => {
                    this.currentNPC[field] = e.target.value;
                });
            }
        });
        
        // Stats
        if (!this.currentNPC.stats) {
            this.currentNPC.stats = { attributes: {} };
        }
        
        ['level', 'hp', 'defense', 'initiative'].forEach(stat => {
            const input = this.element.querySelector(`#npc-${stat}`);
            if (input) {
                input.addEventListener('input', (e) => {
                    this.currentNPC.stats[stat] = parseInt(e.target.value) || 0;
                });
            }
        });
        
        // Attributes
        this.element.querySelectorAll('[data-attribute]').forEach(input => {
            input.addEventListener('input', (e) => {
                const attr = e.target.dataset.attribute;
                this.currentNPC.stats.attributes[attr] = parseInt(e.target.value) || 0;
            });
        });
        
        // Skills
        const skillsArea = this.element.querySelector('#npc-skills');
        if (skillsArea) {
            skillsArea.addEventListener('input', (e) => {
                this.currentNPC.stats.skills = e.target.value;
            });
        }
        
        // Tags
        const tagsInput = this.element.querySelector('#npc-tags');
        if (tagsInput) {
            tagsInput.addEventListener('input', (e) => {
                this.currentNPC.tags = e.target.value
                    .split(',')
                    .map(tag => tag.trim())
                    .filter(tag => tag.length > 0);
            });
        }
        
        // Portrait
        const portraitBtn = this.element.querySelector('#change-portrait');
        if (portraitBtn) {
            portraitBtn.addEventListener('click', () => {
                this.changePortrait();
            });
        }
        
        // Relationships
        const addRelBtn = this.element.querySelector('#add-relationship');
        if (addRelBtn) {
            addRelBtn.addEventListener('click', () => {
                this.addRelationship();
            });
        }
        
        // Actions
        const saveBtn = this.element.querySelector('#save-npc');
        if (saveBtn) {
            saveBtn.addEventListener('click', this.saveNPC);
        }
        
        const exportBtn = this.element.querySelector('#export-npc');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportNPC(this.currentNPC);
            });
        }
        
        const deleteBtn = this.element.querySelector('#delete-npc');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', this.deleteNPC);
        }
    }
    
    createNPC() {
        const npc = {
            id: `npc-${Date.now()}`,
            name: 'New NPC',
            category: 'Minor NPC',
            isAlive: true,
            created: Date.now(),
            modified: Date.now(),
            stats: {
                level: 1,
                hp: 10,
                defense: 10,
                initiative: 0,
                attributes: {
                    presence: 0,
                    resolve: 0,
                    intellect: 0,
                    might: 0,
                    awareness: 0,
                    coordination: 0
                }
            },
            relationships: [],
            tags: []
        };
        
        this.npcs.push(npc);
        this.currentNPC = npc;
        this.saveNPCs();
        this.render();
        this.attachEventListeners();
        
        // Focus name input
        const nameInput = this.element.querySelector('#npc-name');
        if (nameInput) {
            nameInput.focus();
            nameInput.select();
        }
    }
    
    generateNPC() {
        // Name generators
        const firstNames = ['Sarah', 'Marcus', 'Elena', 'Viktor', 'Zara', 'Chen', 'Alexei', 'Luna', 'Kai', 'Nova'];
        const lastNames = ['Chen', 'Rodriguez', 'Volkov', 'Singh', 'O\'Brien', 'Nakamura', 'Reeves', 'Cross', 'Stone', 'Vega'];
        
        // Role generators
        const roles = ['Merchant', 'Pilot', 'Engineer', 'Doctor', 'Security Officer', 'Smuggler', 'Diplomat', 'Scientist', 'Bounty Hunter', 'Information Broker'];
        
        // Species
        const species = ['Human', 'Human (Enhanced)', 'Synthetic', 'Human (Cybernetic)', 'Gravitae', 'Verdathi'];
        
        const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
        const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
        
        const npc = {
            id: `npc-${Date.now()}`,
            name: `${firstName} ${lastName}`,
            role: roles[Math.floor(Math.random() * roles.length)],
            species: species[Math.floor(Math.random() * species.length)],
            category: Math.random() > 0.7 ? 'Major NPC' : 'Minor NPC',
            isAlive: true,
            age: Math.floor(Math.random() * 40) + 25,
            created: Date.now(),
            modified: Date.now(),
            stats: {
                level: Math.floor(Math.random() * 5) + 1,
                hp: Math.floor(Math.random() * 30) + 20,
                defense: Math.floor(Math.random() * 5) + 10,
                initiative: Math.floor(Math.random() * 5),
                attributes: {
                    presence: Math.floor(Math.random() * 4),
                    resolve: Math.floor(Math.random() * 4),
                    intellect: Math.floor(Math.random() * 4),
                    might: Math.floor(Math.random() * 4),
                    awareness: Math.floor(Math.random() * 4),
                    coordination: Math.floor(Math.random() * 4)
                }
            },
            relationships: [],
            tags: []
        };
        
        // Add some personality
        const personalities = [
            'Cautious and methodical',
            'Bold and impulsive', 
            'Friendly but secretive',
            'Gruff but loyal',
            'Charming and deceptive',
            'Quiet and observant'
        ];
        
        npc.description = personalities[Math.floor(Math.random() * personalities.length)];
        
        this.npcs.push(npc);
        this.currentNPC = npc;
        this.saveNPCs();
        this.render();
        this.attachEventListeners();
    }
    
    selectNPC(npcId) {
        const npc = this.npcs.find(n => n.id === npcId);
        if (npc) {
            this.currentNPC = npc;
            this.render();
            this.attachEventListeners();
        }
    }
    
    saveNPC() {
        if (!this.currentNPC) return;
        
        this.currentNPC.modified = Date.now();
        this.saveNPCs();
        this.updateNPCList();
        this.showNotification('NPC saved', 'success');
    }
    
    deleteNPC() {
        if (!this.currentNPC) return;
        
        if (!confirm(`Delete "${this.currentNPC.name}"?`)) return;
        
        const index = this.npcs.findIndex(n => n.id === this.currentNPC.id);
        if (index !== -1) {
            this.npcs.splice(index, 1);
            this.currentNPC = null;
            this.saveNPCs();
            this.render();
            this.attachEventListeners();
        }
    }
    
    exportNPC(npc) {
        const filename = `npc-${npc.name.replace(/\s+/g, '_')}.json`;
        const data = JSON.stringify(npc, null, 2);
        
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        
        URL.revokeObjectURL(url);
        this.showNotification(`Exported ${filename}`, 'success');
    }
    
    changePortrait() {
        const url = prompt('Enter portrait URL:', this.currentNPC.portrait || '');
        if (url !== null) {
            this.currentNPC.portrait = url;
            this.render();
            this.attachEventListeners();
        }
    }
    
    addRelationship() {
        if (!this.currentNPC.relationships) {
            this.currentNPC.relationships = [];
        }
        
        this.currentNPC.relationships.push({
            type: 'Associate',
            target: '',
            notes: ''
        });
        
        this.updateRelationshipsList();
    }
    
    updateRelationship(element) {
        const index = parseInt(element.dataset.index);
        const field = element.classList.contains('relationship-type') ? 'type' :
                     element.classList.contains('relationship-target') ? 'target' : 'notes';
        
        if (this.currentNPC.relationships[index]) {
            this.currentNPC.relationships[index][field] = element.value;
        }
    }
    
    removeRelationship(index) {
        this.currentNPC.relationships.splice(index, 1);
        this.updateRelationshipsList();
    }
    
    updateRelationshipsList() {
        const container = this.element.querySelector('.relationships-list');
        if (container) {
            container.innerHTML = this.renderRelationships(this.currentNPC.relationships || []);
        }
    }
    
    updateNPCList() {
        const listContainer = this.element.querySelector('.npc-list');
        if (listContainer) {
            listContainer.innerHTML = this.renderNPCList();
        }
        
        // Update stats
        const totalStat = this.element.querySelector('.stat-value');
        if (totalStat) {
            totalStat.textContent = this.npcs.length;
        }
        
        // Update location filter
        const locationFilter = this.element.querySelector('#location-filter');
        if (locationFilter) {
            const currentValue = locationFilter.value;
            locationFilter.innerHTML = `
                <option value="all">All Locations</option>
                ${this.getUniqueLocations().map(loc => `
                    <option value="${loc}" ${currentValue === loc ? 'selected' : ''}>${loc}</option>
                `).join('')}
            `;
        }
    }
    
    getFilteredNPCs() {
        let filtered = [...this.npcs];
        
        // Search filter
        if (this.filters.search) {
            const search = this.filters.search.toLowerCase();
            filtered = filtered.filter(npc => 
                npc.name.toLowerCase().includes(search) ||
                npc.role?.toLowerCase().includes(search) ||
                npc.description?.toLowerCase().includes(search) ||
                npc.tags?.some(tag => tag.toLowerCase().includes(search))
            );
        }
        
        // Category filter
        if (this.filters.category !== 'all') {
            filtered = filtered.filter(npc => npc.category === this.filters.category);
        }
        
        // Location filter
        if (this.filters.location !== 'all') {
            filtered = filtered.filter(npc => npc.location === this.filters.location);
        }
        
        // Sort by name
        return filtered.sort((a, b) => a.name.localeCompare(b.name));
    }
    
    getUniqueLocations() {
        const locations = new Set();
        this.npcs.forEach(npc => {
            if (npc.location) {
                locations.add(npc.location);
            }
        });
        return Array.from(locations).sort();
    }
    
    getActiveNPCs() {
        return this.npcs.filter(npc => npc.isAlive !== false);
    }
    
    getInitials(name) {
        return name
            .split(' ')
            .map(word => word[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    }
    
    saveNPCs() {
        localStorage.setItem('cosmos-vtt-npcs', JSON.stringify(this.npcs));
    }
    
    loadNPCs() {
        const saved = localStorage.getItem('cosmos-vtt-npcs');
        if (saved) {
            this.npcs = JSON.parse(saved);
        }
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
}