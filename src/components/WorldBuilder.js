/**
 * WorldBuilder Component
 * Campaign world management: locations, factions, political systems
 * Supports Cosmos Engine's multi-scale universe building
 */

export class WorldBuilder {
    constructor(eventBus, dataManager) {
        this.eventBus = eventBus;
        this.dataManager = dataManager;
        this.currentWorld = null;
        this.selectedLocation = null;
        this.selectedFaction = null;
        
        // Component DOM references
        this.container = null;
        this.locationTree = null;
        this.factionList = null;
        this.detailPanel = null;
        
        // Initialize component
        this.init();
    }
    
    async init() {
        this.setupEventListeners();
        await this.loadWorldData();
    }
    
    setupEventListeners() {
        this.eventBus.on('world:select', (worldId) => this.loadWorld(worldId));
        this.eventBus.on('location:create', (data) => this.createLocation(data));
        this.eventBus.on('faction:create', (data) => this.createFaction(data));
        this.eventBus.on('worldbuilder:export', () => this.exportWorld());
    }
    
    render() {
        const container = document.createElement('div');
        container.className = 'worldbuilder-container';
        container.innerHTML = `
            <div class="worldbuilder-header">
                <h2>World Builder</h2>
                <div class="worldbuilder-controls">
                    <select id="world-selector" class="world-selector">
                        <option value="">Select World...</option>
                    </select>
                    <button id="new-world-btn" class="btn-primary">New World</button>
                    <button id="export-world-btn" class="btn-secondary">Export</button>
                </div>
            </div>
            
            <div class="worldbuilder-content">
                <!-- Location Hierarchy Panel -->
                <div class="location-panel">
                    <div class="panel-header">
                        <h3>Locations</h3>
                        <div class="location-controls">
                            <button id="add-location-btn" class="btn-small">+ Location</button>
                            <select id="location-scale" class="scale-selector">
                                <option value="sector">Sector</option>
                                <option value="system">System</option>
                                <option value="planet">Planet</option>
                                <option value="region">Region</option>
                                <option value="settlement">Settlement</option>
                                <option value="district">District</option>
                                <option value="structure">Structure</option>
                            </select>
                        </div>
                    </div>
                    <div id="location-tree" class="location-tree"></div>
                </div>
                
                <!-- Faction Panel -->
                <div class="faction-panel">
                    <div class="panel-header">
                        <h3>Factions</h3>
                        <button id="add-faction-btn" class="btn-small">+ Faction</button>
                    </div>
                    <div id="faction-list" class="faction-list"></div>
                </div>
                
                <!-- Details Panel -->
                <div class="details-panel">
                    <div id="detail-content" class="detail-content">
                        <div class="welcome-message">
                            <h3>Welcome to World Builder</h3>
                            <p>Select a location or faction to view details, or create a new world to get started.</p>
                            <div class="quick-actions">
                                <button id="quick-planet-btn" class="btn-outline">Quick Planet</button>
                                <button id="quick-faction-btn" class="btn-outline">Quick Faction</button>
                                <button id="random-world-btn" class="btn-outline">Random World</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- World Creation Modal -->
            <div id="world-modal" class="modal hidden">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3 id="modal-title">Create New World</h3>
                        <button id="close-modal" class="modal-close">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="world-form">
                            <div class="form-group">
                                <label for="world-name">World Name:</label>
                                <input type="text" id="world-name" required>
                            </div>
                            <div class="form-group">
                                <label for="world-type">World Type:</label>
                                <select id="world-type">
                                    <option value="sector">Galactic Sector</option>
                                    <option value="system">Star System</option>
                                    <option value="planet">Single Planet</option>
                                    <option value="station">Space Station</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="world-description">Description:</label>
                                <textarea id="world-description" rows="3"></textarea>
                            </div>
                            <div class="form-group">
                                <label for="tech-level">Technology Level:</label>
                                <select id="tech-level">
                                    <option value="1">TL 1 - Stone Age</option>
                                    <option value="2">TL 2 - Bronze/Iron Age</option>
                                    <option value="3">TL 3 - Medieval</option>
                                    <option value="4">TL 4 - Renaissance</option>
                                    <option value="5">TL 5 - Industrial</option>
                                    <option value="6">TL 6 - Mechanized</option>
                                    <option value="7">TL 7 - Nuclear</option>
                                    <option value="8">TL 8 - Digital</option>
                                    <option value="9" selected>TL 9 - Microtech</option>
                                    <option value="10">TL 10 - Robotic</option>
                                    <option value="11">TL 11 - Age of Miracles</option>
                                    <option value="12">TL 12 - Godtech</option>
                                </select>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button id="save-world-btn" class="btn-primary">Create World</button>
                        <button id="cancel-world-btn" class="btn-secondary">Cancel</button>
                    </div>
                </div>
            </div>
            
            <!-- Location Creation Modal -->
            <div id="location-modal" class="modal hidden">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Create Location</h3>
                        <button class="modal-close">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="location-form">
                            <div class="form-group">
                                <label for="location-name">Name:</label>
                                <input type="text" id="location-name" required>
                            </div>
                            <div class="form-group">
                                <label for="location-parent">Parent Location:</label>
                                <select id="location-parent">
                                    <option value="">None (Root Level)</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="location-type">Type:</label>
                                <select id="location-type">
                                    <option value="sector">Sector</option>
                                    <option value="system">Star System</option>
                                    <option value="planet">Planet</option>
                                    <option value="moon">Moon</option>
                                    <option value="station">Space Station</option>
                                    <option value="continent">Continent</option>
                                    <option value="nation">Nation</option>
                                    <option value="region">Region</option>
                                    <option value="city">City</option>
                                    <option value="district">District</option>
                                    <option value="building">Building</option>
                                    <option value="facility">Facility</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="location-description">Description:</label>
                                <textarea id="location-description" rows="3"></textarea>
                            </div>
                            <div class="form-group">
                                <label for="location-population">Population:</label>
                                <input type="text" id="location-population" placeholder="e.g., 10 million, Unknown, Abandoned">
                            </div>
                            <div class="form-group">
                                <label for="location-government">Government:</label>
                                <input type="text" id="location-government" placeholder="e.g., Democracy, Corporate, Tribal">
                            </div>
                            <div class="form-group">
                                <label for="location-notes">GM Notes:</label>
                                <textarea id="location-notes" rows="2" placeholder="Private notes for the GM"></textarea>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button id="save-location-btn" class="btn-primary">Create</button>
                        <button id="cancel-location-btn" class="btn-secondary">Cancel</button>
                    </div>
                </div>
            </div>
            
            <!-- Faction Creation Modal -->
            <div id="faction-modal" class="modal hidden">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Create Faction</h3>
                        <button class="modal-close">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="faction-form">
                            <div class="form-group">
                                <label for="faction-name">Name:</label>
                                <input type="text" id="faction-name" required>
                            </div>
                            <div class="form-group">
                                <label for="faction-type">Type:</label>
                                <select id="faction-type">
                                    <option value="government">Government</option>
                                    <option value="corporation">Corporation</option>
                                    <option value="military">Military</option>
                                    <option value="criminal">Criminal Organization</option>
                                    <option value="religious">Religious</option>
                                    <option value="academic">Academic</option>
                                    <option value="mercenary">Mercenary</option>
                                    <option value="rebel">Rebel Group</option>
                                    <option value="trade">Trade Guild</option>
                                    <option value="alien">Alien Species</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="faction-scope">Scope:</label>
                                <select id="faction-scope">
                                    <option value="local">Local (City/Region)</option>
                                    <option value="planetary">Planetary</option>
                                    <option value="system">System-wide</option>
                                    <option value="sector">Sector-wide</option>
                                    <option value="galactic">Galactic</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="faction-power">Power Level:</label>
                                <select id="faction-power">
                                    <option value="1">1 - Insignificant</option>
                                    <option value="2">2 - Minor</option>
                                    <option value="3">3 - Notable</option>
                                    <option value="4">4 - Significant</option>
                                    <option value="5">5 - Major</option>
                                    <option value="6">6 - Dominant</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="faction-goals">Goals:</label>
                                <textarea id="faction-goals" rows="2" placeholder="What does this faction want?"></textarea>
                            </div>
                            <div class="form-group">
                                <label for="faction-resources">Resources:</label>
                                <textarea id="faction-resources" rows="2" placeholder="What assets and capabilities do they have?"></textarea>
                            </div>
                            <div class="form-group">
                                <label for="faction-allies">Allies:</label>
                                <input type="text" id="faction-allies" placeholder="Friendly factions">
                            </div>
                            <div class="form-group">
                                <label for="faction-enemies">Enemies:</label>
                                <input type="text" id="faction-enemies" placeholder="Hostile factions">
                            </div>
                            <div class="form-group">
                                <label for="faction-notes">GM Notes:</label>
                                <textarea id="faction-notes" rows="2" placeholder="Private notes for the GM"></textarea>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button id="save-faction-btn" class="btn-primary">Create</button>
                        <button id="cancel-faction-btn" class="btn-secondary">Cancel</button>
                    </div>
                </div>
            </div>
        `;
        
        this.container = container;
        this.setupDOMReferences();
        this.attachEventHandlers();
        this.loadWorldList();
        
        return container;
    }
    
    setupDOMReferences() {
        this.locationTree = this.container.querySelector('#location-tree');
        this.factionList = this.container.querySelector('#faction-list');
        this.detailPanel = this.container.querySelector('#detail-content');
        this.worldSelector = this.container.querySelector('#world-selector');
    }
    
    attachEventHandlers() {
        // World management
        this.container.querySelector('#new-world-btn').addEventListener('click', () => this.showWorldModal());
        this.container.querySelector('#export-world-btn').addEventListener('click', () => this.exportWorld());
        this.worldSelector.addEventListener('change', (e) => this.loadWorld(e.target.value));
        
        // Location management
        this.container.querySelector('#add-location-btn').addEventListener('click', () => this.showLocationModal());
        
        // Faction management
        this.container.querySelector('#add-faction-btn').addEventListener('click', () => this.showFactionModal());
        
        // Quick actions
        this.container.querySelector('#quick-planet-btn')?.addEventListener('click', () => this.quickCreatePlanet());
        this.container.querySelector('#quick-faction-btn')?.addEventListener('click', () => this.quickCreateFaction());
        this.container.querySelector('#random-world-btn')?.addEventListener('click', () => this.generateRandomWorld());
        
        // Modal handlers
        this.setupModalHandlers();
    }
    
    setupModalHandlers() {
        // World modal
        const worldModal = this.container.querySelector('#world-modal');
        this.container.querySelector('#save-world-btn').addEventListener('click', () => this.saveWorld());
        this.container.querySelector('#cancel-world-btn').addEventListener('click', () => this.hideModal(worldModal));
        this.container.querySelector('#close-modal').addEventListener('click', () => this.hideModal(worldModal));
        
        // Location modal
        const locationModal = this.container.querySelector('#location-modal');
        this.container.querySelector('#save-location-btn').addEventListener('click', () => this.saveLocation());
        this.container.querySelector('#cancel-location-btn').addEventListener('click', () => this.hideModal(locationModal));
        
        // Faction modal
        const factionModal = this.container.querySelector('#faction-modal');
        this.container.querySelector('#save-faction-btn').addEventListener('click', () => this.saveFaction());
        this.container.querySelector('#cancel-faction-btn').addEventListener('click', () => this.hideModal(factionModal));
        
        // Close on backdrop click
        [worldModal, locationModal, factionModal].forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) this.hideModal(modal);
            });
        });
    }
    
    async loadWorldData() {
        try {
            this.worlds = await this.dataManager.loadData('worlds.json');
        } catch (error) {
            console.log('No worlds.json found, starting with empty worlds');
            this.worlds = { worlds: [] };
        }
    }
    
    loadWorldList() {
        this.worldSelector.innerHTML = '<option value="">Select World...</option>';
        this.worlds.worlds.forEach(world => {
            const option = document.createElement('option');
            option.value = world.id;
            option.textContent = world.name;
            this.worldSelector.appendChild(option);
        });
    }
    
    async loadWorld(worldId) {
        if (!worldId) return;
        
        this.currentWorld = this.worlds.worlds.find(w => w.id === worldId);
        if (!this.currentWorld) return;
        
        this.renderLocationTree();
        this.renderFactionList();
        this.showWorldDetails();
    }
    
    renderLocationTree() {
        if (!this.currentWorld || !this.currentWorld.locations) {
            this.locationTree.innerHTML = '<p class="empty-state">No locations created yet.</p>';
            return;
        }
        
        const tree = this.buildLocationHierarchy(this.currentWorld.locations);
        this.locationTree.innerHTML = '';
        this.renderLocationNode(tree, this.locationTree);
    }
    
    buildLocationHierarchy(locations) {
        const roots = [];
        const locationMap = new Map();
        
        // Index all locations
        locations.forEach(loc => locationMap.set(loc.id, { ...loc, children: [] }));
        
        // Build hierarchy
        locations.forEach(loc => {
            const node = locationMap.get(loc.id);
            if (loc.parentId) {
                const parent = locationMap.get(loc.parentId);
                if (parent) parent.children.push(node);
                else roots.push(node); // Orphaned node becomes root
            } else {
                roots.push(node);
            }
        });
        
        return roots;
    }
    
    renderLocationNode(nodes, container, depth = 0) {
        nodes.forEach(node => {
            const div = document.createElement('div');
            div.className = `location-node depth-${depth}`;
            div.innerHTML = `
                <div class="location-item" data-location-id="${node.id}">
                    <span class="location-icon">${this.getLocationIcon(node.type)}</span>
                    <span class="location-name">${node.name}</span>
                    <span class="location-type">(${node.type})</span>
                    <div class="location-actions">
                        <button class="btn-tiny" onclick="worldBuilder.editLocation('${node.id}')">✏️</button>
                        <button class="btn-tiny" onclick="worldBuilder.deleteLocation('${node.id}')">🗑️</button>
                    </div>
                </div>
            `;
            
            div.querySelector('.location-item').addEventListener('click', () => this.selectLocation(node.id));
            container.appendChild(div);
            
            if (node.children.length > 0) {
                const childContainer = document.createElement('div');
                childContainer.className = 'location-children';
                this.renderLocationNode(node.children, childContainer, depth + 1);
                div.appendChild(childContainer);
            }
        });
    }
    
    getLocationIcon(type) {
        const icons = {
            sector: '🌌', system: '⭐', planet: '🌍', moon: '🌙',
            station: '🛰️', continent: '🗺️', nation: '🏛️', region: '🌄',
            city: '🏙️', district: '🏘️', building: '🏢', facility: '🏭'
        };
        return icons[type] || '📍';
    }
    
    renderFactionList() {
        if (!this.currentWorld || !this.currentWorld.factions) {
            this.factionList.innerHTML = '<p class="empty-state">No factions created yet.</p>';
            return;
        }
        
        this.factionList.innerHTML = '';
        this.currentWorld.factions.forEach(faction => {
            const div = document.createElement('div');
            div.className = 'faction-item';
            div.innerHTML = `
                <div class="faction-header">
                    <span class="faction-icon">${this.getFactionIcon(faction.type)}</span>
                    <span class="faction-name">${faction.name}</span>
                    <span class="faction-power">Power: ${faction.power}</span>
                </div>
                <div class="faction-type">${faction.type} • ${faction.scope}</div>
                <div class="faction-actions">
                    <button class="btn-tiny" onclick="worldBuilder.editFaction('${faction.id}')">✏️</button>
                    <button class="btn-tiny" onclick="worldBuilder.deleteFaction('${faction.id}')">🗑️</button>
                </div>
            `;
            
            div.addEventListener('click', () => this.selectFaction(faction.id));
            this.factionList.appendChild(div);
        });
    }
    
    getFactionIcon(type) {
        const icons = {
            government: '🏛️', corporation: '🏢', military: '⚔️',
            criminal: '🔫', religious: '⛪', academic: '🎓',
            mercenary: '🛡️', rebel: '✊', trade: '💰',
            alien: '👽', other: '❓'
        };
        return icons[type] || '🔰';
    }
    
    selectLocation(locationId) {
        this.selectedLocation = this.currentWorld.locations.find(l => l.id === locationId);
        this.selectedFaction = null;
        this.showLocationDetails();
    }
    
    selectFaction(factionId) {
        this.selectedFaction = this.currentWorld.factions.find(f => f.id === factionId);
        this.selectedLocation = null;
        this.showFactionDetails();
    }
    
    showWorldDetails() {
        this.detailPanel.innerHTML = `
            <div class="world-details">
                <h3>${this.currentWorld.name}</h3>
                <div class="world-info">
                    <p><strong>Type:</strong> ${this.currentWorld.type}</p>
                    <p><strong>Tech Level:</strong> TL ${this.currentWorld.techLevel}</p>
                    <p><strong>Locations:</strong> ${this.currentWorld.locations?.length || 0}</p>
                    <p><strong>Factions:</strong> ${this.currentWorld.factions?.length || 0}</p>
                </div>
                <div class="world-description">
                    <h4>Description</h4>
                    <p>${this.currentWorld.description || 'No description provided.'}</p>
                </div>
            </div>
        `;
    }
    
    showLocationDetails() {
        if (!this.selectedLocation) return;
        
        const loc = this.selectedLocation;
        this.detailPanel.innerHTML = `
            <div class="location-details">
                <h3>${loc.name}</h3>
                <div class="location-info">
                    <p><strong>Type:</strong> ${loc.type}</p>
                    <p><strong>Population:</strong> ${loc.population || 'Unknown'}</p>
                    <p><strong>Government:</strong> ${loc.government || 'Unknown'}</p>
                </div>
                <div class="location-description">
                    <h4>Description</h4>
                    <p>${loc.description || 'No description provided.'}</p>
                </div>
                ${loc.notes ? `
                    <div class="location-notes">
                        <h4>GM Notes</h4>
                        <p>${loc.notes}</p>
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    showFactionDetails() {
        if (!this.selectedFaction) return;
        
        const faction = this.selectedFaction;
        this.detailPanel.innerHTML = `
            <div class="faction-details">
                <h3>${faction.name}</h3>
                <div class="faction-info">
                    <p><strong>Type:</strong> ${faction.type}</p>
                    <p><strong>Scope:</strong> ${faction.scope}</p>
                    <p><strong>Power Level:</strong> ${faction.power}</p>
                </div>
                <div class="faction-goals">
                    <h4>Goals</h4>
                    <p>${faction.goals || 'No goals defined.'}</p>
                </div>
                <div class="faction-resources">
                    <h4>Resources</h4>
                    <p>${faction.resources || 'No resources listed.'}</p>
                </div>
                <div class="faction-relations">
                    <h4>Relations</h4>
                    <p><strong>Allies:</strong> ${faction.allies || 'None listed'}</p>
                    <p><strong>Enemies:</strong> ${faction.enemies || 'None listed'}</p>
                </div>
                ${faction.notes ? `
                    <div class="faction-notes">
                        <h4>GM Notes</h4>
                        <p>${faction.notes}</p>
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    showWorldModal() {
        const modal = this.container.querySelector('#world-modal');
        modal.classList.remove('hidden');
    }
    
    showLocationModal() {
        if (!this.currentWorld) {
            alert('Please select a world first.');
            return;
        }
        
        // Populate parent location dropdown
        const parentSelect = this.container.querySelector('#location-parent');
        parentSelect.innerHTML = '<option value="">None (Root Level)</option>';
        
        if (this.currentWorld.locations) {
            this.currentWorld.locations.forEach(loc => {
                const option = document.createElement('option');
                option.value = loc.id;
                option.textContent = `${loc.name} (${loc.type})`;
                parentSelect.appendChild(option);
            });
        }
        
        const modal = this.container.querySelector('#location-modal');
        modal.classList.remove('hidden');
    }
    
    showFactionModal() {
        if (!this.currentWorld) {
            alert('Please select a world first.');
            return;
        }
        
        const modal = this.container.querySelector('#faction-modal');
        modal.classList.remove('hidden');
    }
    
    hideModal(modal) {
        modal.classList.add('hidden');
        // Clear form data
        const form = modal.querySelector('form');
        if (form) form.reset();
    }
    
    async saveWorld() {
        const form = this.container.querySelector('#world-form');
        const formData = new FormData(form);
        
        const world = {
            id: Date.now().toString(),
            name: formData.get('world-name') || this.container.querySelector('#world-name').value,
            type: formData.get('world-type') || this.container.querySelector('#world-type').value,
            description: formData.get('world-description') || this.container.querySelector('#world-description').value,
            techLevel: formData.get('tech-level') || this.container.querySelector('#tech-level').value,
            locations: [],
            factions: [],
            created: Date.now()
        };
        
        this.worlds.worlds.push(world);
        await this.saveWorldData();
        this.loadWorldList();
        this.hideModal(this.container.querySelector('#world-modal'));
        
        // Auto-select the new world
        this.worldSelector.value = world.id;
        this.loadWorld(world.id);
    }
    
    async saveLocation() {
        const form = this.container.querySelector('#location-form');
        
        const location = {
            id: Date.now().toString(),
            name: this.container.querySelector('#location-name').value,
            type: this.container.querySelector('#location-type').value,
            parentId: this.container.querySelector('#location-parent').value || null,
            description: this.container.querySelector('#location-description').value,
            population: this.container.querySelector('#location-population').value,
            government: this.container.querySelector('#location-government').value,
            notes: this.container.querySelector('#location-notes').value,
            created: Date.now()
        };
        
        if (!this.currentWorld.locations) this.currentWorld.locations = [];
        this.currentWorld.locations.push(location);
        
        await this.saveWorldData();
        this.renderLocationTree();
        this.hideModal(this.container.querySelector('#location-modal'));
    }
    
    async saveFaction() {
        const faction = {
            id: Date.now().toString(),
            name: this.container.querySelector('#faction-name').value,
            type: this.container.querySelector('#faction-type').value,
            scope: this.container.querySelector('#faction-scope').value,
            power: this.container.querySelector('#faction-power').value,
            goals: this.container.querySelector('#faction-goals').value,
            resources: this.container.querySelector('#faction-resources').value,
            allies: this.container.querySelector('#faction-allies').value,
            enemies: this.container.querySelector('#faction-enemies').value,
            notes: this.container.querySelector('#faction-notes').value,
            created: Date.now()
        };
        
        if (!this.currentWorld.factions) this.currentWorld.factions = [];
        this.currentWorld.factions.push(faction);
        
        await this.saveWorldData();
        this.renderFactionList();
        this.hideModal(this.container.querySelector('#faction-modal'));
    }
    
    async saveWorldData() {
        // Save to IndexedDB via DataManager
        await this.dataManager.saveToDB('gameData', {
            id: 'worlds.json',
            data: this.worlds,
            timestamp: Date.now()
        });
    }
    
    quickCreatePlanet() {
        const planetNames = ['Kepler-442b', 'Proxima Centauri b', 'TOI-715 b', 'K2-18 b', 'HD 40307 g'];
        const randomName = planetNames[Math.floor(Math.random() * planetNames.length)];
        
        this.container.querySelector('#location-name').value = randomName;
        this.container.querySelector('#location-type').value = 'planet';
        this.container.querySelector('#location-description').value = 'A potentially habitable world with Earth-like conditions.';
        this.showLocationModal();
    }
    
    quickCreateFaction() {
        const factionNames = ['Stellar Trade Consortium', 'Colonial Defense Force', 'New Terra Liberation Front'];
        const randomName = factionNames[Math.floor(Math.random() * factionNames.length)];
        
        this.container.querySelector('#faction-name').value = randomName;
        this.container.querySelector('#faction-type').value = 'corporation';
        this.container.querySelector('#faction-scope').value = 'system';
        this.showFactionModal();
    }
    
    generateRandomWorld() {
        const worldNames = ['Epsilon Sector', 'Frontier Nebula', 'Outer Rim Territory'];
        const randomName = worldNames[Math.floor(Math.random() * worldNames.length)];
        
        this.container.querySelector('#world-name').value = randomName;
        this.container.querySelector('#world-type').value = 'sector';
        this.container.querySelector('#world-description').value = 'A frontier region ripe for exploration and expansion.';
        this.showWorldModal();
    }
    
    async exportWorld() {
        if (!this.currentWorld) {
            alert('Please select a world to export.');
            return;
        }
        
        const exportData = {
            world: this.currentWorld,
            exportDate: new Date().toISOString(),
            version: '1.0'
        };
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.currentWorld.name.replace(/\s+/g, '_')}_world.json`;
        a.click();
        URL.revokeObjectURL(url);
    }
    
    // Global methods for button onclick handlers
    editLocation(locationId) {
        // TODO: Implement edit functionality
        console.log('Edit location:', locationId);
    }
    
    deleteLocation(locationId) {
        if (confirm('Are you sure you want to delete this location?')) {
            this.currentWorld.locations = this.currentWorld.locations.filter(l => l.id !== locationId);
            this.saveWorldData();
            this.renderLocationTree();
        }
    }
    
    editFaction(factionId) {
        // TODO: Implement edit functionality
        console.log('Edit faction:', factionId);
    }
    
    deleteFaction(factionId) {
        if (confirm('Are you sure you want to delete this faction?')) {
            this.currentWorld.factions = this.currentWorld.factions.filter(f => f.id !== factionId);
            this.saveWorldData();
            this.renderFactionList();
        }
    }
}

// Make worldBuilder globally accessible for onclick handlers
window.worldBuilder = null;