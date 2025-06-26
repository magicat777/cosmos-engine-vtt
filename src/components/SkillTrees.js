/**
 * SkillTrees Component
 * Interactive visual skill tree display for Cosmos Engine RPG
 * Shows branching paths and specializations for all 14 skills
 */

export class SkillTrees {
    constructor(config, dataManager, eventBus) {
        this.config = config;
        this.dataManager = dataManager;
        this.eventBus = eventBus;
        
        // Component state
        this.selectedSkill = 'combat';
        this.selectedCharacter = null;
        this.zoomLevel = 1;
        this.panOffset = { x: 0, y: 0 };
        
        // Skill tree data structure
        this.skillTreeData = this.initializeSkillTrees();
        
        // Component DOM references
        this.container = null;
        this.canvas = null;
        this.ctx = null;
        
        this.init();
    }
    
    async init() {
        this.setupEventListeners();
        await this.loadCharacterProgress();
    }
    
    setupEventListeners() {
        this.eventBus.on('character:loaded', (data) => this.loadCharacter(data));
        this.eventBus.on('skill:advance', (data) => this.handleSkillAdvance(data));
        this.eventBus.on('specialization:select', (data) => this.selectSpecialization(data));
    }
    
    render() {
        const container = document.createElement('div');
        container.className = 'skill-trees-container';
        container.innerHTML = `
            <div class="skill-trees-header">
                <h2>Skill Trees</h2>
                <div class="skill-selector">
                    <select id="skill-select">
                        <option value="combat">Combat</option>
                        <option value="tech">Tech</option>
                        <option value="persuasion">Persuasion</option>
                        <option value="pilot">Pilot</option>
                        <option value="stealth">Stealth</option>
                        <option value="medical">Medical</option>
                        <option value="knowledge">Knowledge</option>
                        <option value="survival">Survival</option>
                        <option value="athletics">Athletics</option>
                        <option value="perception">Perception</option>
                        <option value="discipline">Discipline</option>
                        <option value="intimidation">Intimidation</option>
                        <option value="deception">Deception</option>
                        <option value="command">Command</option>
                    </select>
                </div>
                <div class="tree-controls">
                    <button id="zoom-in-btn" class="btn-icon" title="Zoom In">🔍+</button>
                    <button id="zoom-out-btn" class="btn-icon" title="Zoom Out">🔍-</button>
                    <button id="reset-view-btn" class="btn-icon" title="Reset View">⟲</button>
                    <button id="export-tree-btn" class="btn-secondary">Export Tree</button>
                </div>
            </div>
            
            <div class="skill-tree-content">
                <div class="tree-sidebar">
                    <div class="character-info">
                        <h3>Character Progress</h3>
                        <div id="character-name">No character selected</div>
                        <div class="skill-progress">
                            <div class="progress-label">Skill Level: <span id="skill-level">0</span>/10</div>
                            <div class="progress-bar">
                                <div id="skill-progress-bar" class="progress-fill"></div>
                            </div>
                            <div class="xp-info">
                                <span>XP Available: <span id="available-xp">0</span></span>
                                <span>Next Level: <span id="xp-needed">5</span> XP</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="path-info">
                        <h3>Selected Path</h3>
                        <div id="path-name" class="path-name">Choose a path...</div>
                        <div id="path-description" class="path-description"></div>
                        <div id="specializations" class="specializations-list"></div>
                    </div>
                    
                    <div class="node-details">
                        <h3>Node Details</h3>
                        <div id="node-info" class="node-info">
                            <p class="empty-state">Hover over a node to see details</p>
                        </div>
                    </div>
                    
                    <div class="synergy-info">
                        <h3>Cross-Skill Synergies</h3>
                        <div id="synergies" class="synergies-list">
                            <p class="empty-state">No synergies available</p>
                        </div>
                    </div>
                </div>
                
                <div class="tree-viewport">
                    <canvas id="skill-tree-canvas"></canvas>
                    <div class="tree-legend">
                        <h4>Legend</h4>
                        <div class="legend-item">
                            <span class="node-icon available"></span>
                            <span>Available</span>
                        </div>
                        <div class="legend-item">
                            <span class="node-icon unlocked"></span>
                            <span>Unlocked</span>
                        </div>
                        <div class="legend-item">
                            <span class="node-icon locked"></span>
                            <span>Locked</span>
                        </div>
                        <div class="legend-item">
                            <span class="node-icon specialization"></span>
                            <span>Specialization</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Node Selection Modal -->
            <div id="node-modal" class="modal hidden">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3 id="node-modal-title">Unlock Node</h3>
                        <button class="modal-close">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div id="node-modal-content"></div>
                    </div>
                    <div class="modal-footer">
                        <button id="unlock-node-btn" class="btn-primary">Unlock (Cost: <span id="unlock-cost">0</span> XP)</button>
                        <button id="cancel-unlock-btn" class="btn-secondary">Cancel</button>
                    </div>
                </div>
            </div>
        `;
        
        this.container = container;
        this.setupDOMReferences();
        this.attachEventHandlers();
        this.initializeCanvas();
        this.drawSkillTree();
        
        return container;
    }
    
    setupDOMReferences() {
        this.canvas = this.container.querySelector('#skill-tree-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.skillSelect = this.container.querySelector('#skill-select');
    }
    
    attachEventHandlers() {
        // Skill selection
        this.skillSelect.addEventListener('change', (e) => {
            this.selectedSkill = e.target.value;
            this.drawSkillTree();
        });
        
        // Zoom controls
        this.container.querySelector('#zoom-in-btn').addEventListener('click', () => this.zoom(1.2));
        this.container.querySelector('#zoom-out-btn').addEventListener('click', () => this.zoom(0.8));
        this.container.querySelector('#reset-view-btn').addEventListener('click', () => this.resetView());
        this.container.querySelector('#export-tree-btn').addEventListener('click', () => this.exportTree());
        
        // Canvas interactions
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        this.canvas.addEventListener('wheel', (e) => this.handleWheel(e));
        this.canvas.addEventListener('click', (e) => this.handleClick(e));
        
        // Modal handlers
        this.setupModalHandlers();
        
        // Resize handler
        window.addEventListener('resize', () => this.resizeCanvas());
    }
    
    setupModalHandlers() {
        const modal = this.container.querySelector('#node-modal');
        this.container.querySelector('#unlock-node-btn').addEventListener('click', () => this.confirmUnlock());
        this.container.querySelector('#cancel-unlock-btn').addEventListener('click', () => this.hideModal(modal));
        modal.querySelector('.modal-close').addEventListener('click', () => this.hideModal(modal));
        modal.addEventListener('click', (e) => {
            if (e.target === modal) this.hideModal(modal);
        });
    }
    
    initializeCanvas() {
        this.resizeCanvas();
        
        // Set canvas style
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = 'high';
    }
    
    resizeCanvas() {
        const viewport = this.container.querySelector('.tree-viewport');
        const rect = viewport.getBoundingClientRect();
        
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
        
        this.drawSkillTree();
    }
    
    initializeSkillTrees() {
        return {
            combat: {
                name: 'Combat',
                attribute: 'Coordination',
                paths: [
                    {
                        id: 'striker',
                        name: 'Striker Path',
                        description: 'Maximize damage output',
                        color: '#ff4444',
                        nodes: this.createStrikerNodes()
                    },
                    {
                        id: 'defender',
                        name: 'Defender Path',
                        description: 'Tank and protect allies',
                        color: '#4444ff',
                        nodes: this.createDefenderNodes()
                    },
                    {
                        id: 'tactician',
                        name: 'Tactician Path',
                        description: 'Control the battlefield',
                        color: '#44ff44',
                        nodes: this.createTacticianNodes()
                    },
                    {
                        id: 'gunslinger',
                        name: 'Gunslinger Path',
                        description: 'Ranged combat specialist',
                        color: '#ff44ff',
                        nodes: this.createGunslingerNodes()
                    }
                ]
            },
            // Additional skills would be added here...
        };
    }
    
    createStrikerNodes() {
        return [
            // Novice Tier (0-2)
            {
                id: 'basic-training',
                name: 'Basic Attack Training',
                tier: 'novice',
                level: 0,
                x: 200,
                y: 50,
                description: 'Foundation of combat prowess',
                effect: '+1 to attack rolls',
                cost: 5,
                requires: [],
                type: 'base'
            },
            {
                id: 'melee-striker',
                name: 'Melee Striker',
                tier: 'novice',
                level: 2,
                x: 100,
                y: 150,
                description: 'Specialize in close combat',
                effect: '+2 damage with melee weapons',
                cost: 10,
                requires: ['basic-training'],
                type: 'specialization'
            },
            {
                id: 'ranged-striker',
                name: 'Ranged Striker',
                tier: 'novice',
                level: 2,
                x: 200,
                y: 150,
                description: 'Specialize in ranged combat',
                effect: '+2 damage at range',
                cost: 10,
                requires: ['basic-training'],
                type: 'specialization'
            },
            {
                id: 'heavy-weapons',
                name: 'Heavy Weapons',
                tier: 'novice',
                level: 2,
                x: 300,
                y: 150,
                description: 'Master of heavy armaments',
                effect: '+2 damage with heavy weapons',
                cost: 10,
                requires: ['basic-training'],
                type: 'specialization'
            },
            // Proficient Tier (3-5)
            {
                id: 'precision-strikes',
                name: 'Precision Strikes',
                tier: 'proficient',
                level: 3,
                x: 200,
                y: 250,
                description: 'Strike with deadly accuracy',
                effect: 'Critical hits on 19-20',
                cost: 25,
                requires: ['melee-striker', 'ranged-striker', 'heavy-weapons'],
                type: 'advancement'
            },
            {
                id: 'vital-strike',
                name: 'Vital Strike',
                tier: 'proficient',
                level: 5,
                x: 100,
                y: 350,
                description: 'Target vital organs',
                effect: 'Double damage on critical hits',
                cost: 25,
                requires: ['precision-strikes'],
                type: 'specialization'
            },
            {
                id: 'penetrating-strike',
                name: 'Penetrating Strike',
                tier: 'proficient',
                level: 5,
                x: 200,
                y: 350,
                description: 'Pierce through armor',
                effect: 'Ignore 2 points of armor',
                cost: 25,
                requires: ['precision-strikes'],
                type: 'specialization'
            },
            {
                id: 'rapid-strike',
                name: 'Rapid Strike',
                tier: 'proficient',
                level: 5,
                x: 300,
                y: 350,
                description: 'Attack with blinding speed',
                effect: 'Extra attack at -2 penalty',
                cost: 25,
                requires: ['precision-strikes'],
                type: 'specialization'
            },
            // Expert Tier (6-8)
            {
                id: 'devastating-blows',
                name: 'Devastating Blows',
                tier: 'expert',
                level: 6,
                x: 200,
                y: 450,
                description: 'Your attacks are legendary',
                effect: '+4 damage on all attacks',
                cost: 40,
                requires: ['vital-strike', 'penetrating-strike', 'rapid-strike'],
                type: 'advancement'
            },
            {
                id: 'executioner',
                name: 'Executioner',
                tier: 'expert',
                level: 8,
                x: 100,
                y: 550,
                description: 'Master of the killing blow',
                effect: 'Triple damage on critical hits',
                cost: 40,
                requires: ['devastating-blows'],
                type: 'specialization'
            },
            {
                id: 'whirlwind',
                name: 'Whirlwind',
                tier: 'expert',
                level: 8,
                x: 200,
                y: 550,
                description: 'Strike multiple foes',
                effect: 'Hit all adjacent enemies',
                cost: 40,
                requires: ['devastating-blows'],
                type: 'specialization'
            },
            {
                id: 'perfect-strike',
                name: 'Perfect Strike',
                tier: 'expert',
                level: 8,
                x: 300,
                y: 550,
                description: 'Never miss your mark',
                effect: 'Reroll missed attacks 1/scene',
                cost: 40,
                requires: ['devastating-blows'],
                type: 'specialization'
            },
            // Legendary Tier (9-10)
            {
                id: 'death-incarnate',
                name: 'Death Incarnate',
                tier: 'legendary',
                level: 9,
                x: 200,
                y: 650,
                description: 'You are death itself',
                effect: 'All attacks are critical threats',
                cost: 50,
                requires: ['executioner', 'whirlwind', 'perfect-strike'],
                type: 'ultimate'
            },
            {
                id: 'one-shot',
                name: 'One Shot, One Kill',
                tier: 'legendary',
                level: 10,
                x: 100,
                y: 750,
                description: 'Instant death to lesser foes',
                effect: 'Instant kill on crit vs minions',
                cost: 50,
                requires: ['death-incarnate'],
                type: 'specialization'
            },
            {
                id: 'unstoppable-force',
                name: 'Unstoppable Force',
                tier: 'legendary',
                level: 10,
                x: 200,
                y: 750,
                description: 'Nothing can stop your attacks',
                effect: 'Attacks ignore all damage reduction',
                cost: 50,
                requires: ['death-incarnate'],
                type: 'specialization'
            },
            {
                id: 'blade-dance',
                name: 'Blade Dance',
                tier: 'legendary',
                level: 10,
                x: 300,
                y: 750,
                description: 'Dance of death',
                effect: 'Attack all enemies in sight',
                cost: 50,
                requires: ['death-incarnate'],
                type: 'specialization'
            }
        ];
    }
    
    createDefenderNodes() {
        // Similar structure for Defender path
        return [];
    }
    
    createTacticianNodes() {
        // Similar structure for Tactician path
        return [];
    }
    
    createGunslingerNodes() {
        // Similar structure for Gunslinger path
        return [];
    }
    
    drawSkillTree() {
        if (!this.ctx) return;
        
        const skill = this.skillTreeData[this.selectedSkill];
        if (!skill) return;
        
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Save context state
        this.ctx.save();
        
        // Apply zoom and pan
        this.ctx.translate(this.panOffset.x, this.panOffset.y);
        this.ctx.scale(this.zoomLevel, this.zoomLevel);
        
        // Draw background grid
        this.drawGrid();
        
        // Draw paths
        skill.paths.forEach((path, index) => {
            this.drawPath(path, index);
        });
        
        // Restore context state
        this.ctx.restore();
    }
    
    drawGrid() {
        const gridSize = 50;
        const width = this.canvas.width / this.zoomLevel;
        const height = this.canvas.height / this.zoomLevel;
        
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        this.ctx.lineWidth = 1;
        
        // Vertical lines
        for (let x = 0; x <= width; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, height);
            this.ctx.stroke();
        }
        
        // Horizontal lines
        for (let y = 0; y <= height; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(width, y);
            this.ctx.stroke();
        }
    }
    
    drawPath(path, pathIndex) {
        const offsetX = pathIndex * 400;
        
        // Draw path background
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
        this.ctx.fillRect(offsetX, 0, 400, 800);
        
        // Draw path title
        this.ctx.fillStyle = path.color;
        this.ctx.font = 'bold 18px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(path.name, offsetX + 200, 30);
        
        // Draw connections first (so they appear behind nodes)
        path.nodes.forEach(node => {
            node.requires.forEach(reqId => {
                const reqNode = path.nodes.find(n => n.id === reqId);
                if (reqNode) {
                    this.drawConnection(
                        reqNode.x + offsetX,
                        reqNode.y,
                        node.x + offsetX,
                        node.y,
                        this.isNodeUnlocked(node) ? path.color : 'rgba(255, 255, 255, 0.2)'
                    );
                }
            });
        });
        
        // Draw nodes
        path.nodes.forEach(node => {
            this.drawNode(node, offsetX, path.color);
        });
    }
    
    drawConnection(x1, y1, x2, y2, color) {
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        
        // Draw curved connection
        const cp1x = x1;
        const cp1y = y1 + (y2 - y1) * 0.5;
        const cp2x = x2;
        const cp2y = y1 + (y2 - y1) * 0.5;
        
        this.ctx.moveTo(x1, y1);
        this.ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x2, y2);
        this.ctx.stroke();
    }
    
    drawNode(node, offsetX, pathColor) {
        const x = node.x + offsetX;
        const y = node.y;
        const radius = node.type === 'specialization' ? 25 : 20;
        
        // Determine node state
        const isUnlocked = this.isNodeUnlocked(node);
        const isAvailable = this.isNodeAvailable(node);
        
        // Draw node background
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        
        if (isUnlocked) {
            this.ctx.fillStyle = pathColor;
            this.ctx.fill();
            this.ctx.strokeStyle = '#fff';
            this.ctx.lineWidth = 3;
        } else if (isAvailable) {
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            this.ctx.fill();
            this.ctx.strokeStyle = pathColor;
            this.ctx.lineWidth = 2;
        } else {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            this.ctx.fill();
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            this.ctx.lineWidth = 1;
        }
        
        this.ctx.stroke();
        
        // Draw specialization indicator
        if (node.type === 'specialization') {
            this.ctx.beginPath();
            this.ctx.arc(x, y, radius + 5, 0, Math.PI * 2);
            this.ctx.strokeStyle = isUnlocked ? '#fff' : 'rgba(255, 255, 255, 0.3)';
            this.ctx.lineWidth = 1;
            this.ctx.stroke();
        }
        
        // Draw node icon or level
        this.ctx.fillStyle = isUnlocked ? '#fff' : 'rgba(255, 255, 255, 0.7)';
        this.ctx.font = 'bold 14px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(node.level, x, y);
        
        // Draw node name
        this.ctx.font = '12px Arial';
        this.ctx.fillStyle = isUnlocked ? '#fff' : 'rgba(255, 255, 255, 0.5)';
        this.ctx.fillText(node.name, x, y + radius + 15);
    }
    
    isNodeUnlocked(node) {
        // Check if character has unlocked this node
        if (!this.selectedCharacter) return false;
        return this.selectedCharacter.unlockedNodes?.includes(node.id) || false;
    }
    
    isNodeAvailable(node) {
        // Check if node can be unlocked
        if (!this.selectedCharacter) return false;
        if (this.isNodeUnlocked(node)) return false;
        
        // Check level requirement
        const currentLevel = this.selectedCharacter.skills?.[this.selectedSkill] || 0;
        if (currentLevel < node.level) return false;
        
        // Check prerequisite nodes
        return node.requires.every(reqId => {
            const reqNode = this.findNodeById(reqId);
            return reqNode && this.isNodeUnlocked(reqNode);
        });
    }
    
    findNodeById(nodeId) {
        const skill = this.skillTreeData[this.selectedSkill];
        if (!skill) return null;
        
        for (const path of skill.paths) {
            const node = path.nodes.find(n => n.id === nodeId);
            if (node) return node;
        }
        return null;
    }
    
    handleMouseDown(e) {
        this.isDragging = true;
        this.lastMousePos = { x: e.clientX, y: e.clientY };
    }
    
    handleMouseMove(e) {
        if (this.isDragging) {
            const dx = e.clientX - this.lastMousePos.x;
            const dy = e.clientY - this.lastMousePos.y;
            
            this.panOffset.x += dx;
            this.panOffset.y += dy;
            
            this.lastMousePos = { x: e.clientX, y: e.clientY };
            this.drawSkillTree();
        } else {
            // Check for node hover
            const node = this.getNodeAtPosition(e);
            if (node) {
                this.showNodeInfo(node);
                this.canvas.style.cursor = 'pointer';
            } else {
                this.canvas.style.cursor = 'default';
                this.clearNodeInfo();
            }
        }
    }
    
    handleMouseUp(e) {
        this.isDragging = false;
    }
    
    handleWheel(e) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        this.zoom(delta);
    }
    
    handleClick(e) {
        const node = this.getNodeAtPosition(e);
        if (node && this.isNodeAvailable(node)) {
            this.showUnlockModal(node);
        }
    }
    
    getNodeAtPosition(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left - this.panOffset.x) / this.zoomLevel;
        const y = (e.clientY - rect.top - this.panOffset.y) / this.zoomLevel;
        
        const skill = this.skillTreeData[this.selectedSkill];
        if (!skill) return null;
        
        for (let i = 0; i < skill.paths.length; i++) {
            const path = skill.paths[i];
            const offsetX = i * 400;
            
            for (const node of path.nodes) {
                const nodeX = node.x + offsetX;
                const nodeY = node.y;
                const radius = node.type === 'specialization' ? 25 : 20;
                
                const distance = Math.sqrt((x - nodeX) ** 2 + (y - nodeY) ** 2);
                if (distance <= radius) {
                    return { ...node, path: path };
                }
            }
        }
        
        return null;
    }
    
    zoom(factor) {
        this.zoomLevel *= factor;
        this.zoomLevel = Math.max(0.5, Math.min(2, this.zoomLevel));
        this.drawSkillTree();
    }
    
    resetView() {
        this.zoomLevel = 1;
        this.panOffset = { x: 0, y: 0 };
        this.drawSkillTree();
    }
    
    showNodeInfo(nodeData) {
        const nodeInfo = this.container.querySelector('#node-info');
        nodeInfo.innerHTML = `
            <h4>${nodeData.name}</h4>
            <p class="node-tier">${nodeData.tier.charAt(0).toUpperCase() + nodeData.tier.slice(1)} Tier (Level ${nodeData.level})</p>
            <p class="node-description">${nodeData.description}</p>
            <p class="node-effect"><strong>Effect:</strong> ${nodeData.effect}</p>
            <p class="node-cost"><strong>Cost:</strong> ${nodeData.cost} XP</p>
            ${nodeData.requires.length > 0 ? `<p class="node-requires"><strong>Requires:</strong> ${nodeData.requires.join(', ')}</p>` : ''}
        `;
    }
    
    clearNodeInfo() {
        const nodeInfo = this.container.querySelector('#node-info');
        nodeInfo.innerHTML = '<p class="empty-state">Hover over a node to see details</p>';
    }
    
    showUnlockModal(nodeData) {
        const modal = this.container.querySelector('#node-modal');
        const modalTitle = this.container.querySelector('#node-modal-title');
        const modalContent = this.container.querySelector('#node-modal-content');
        const unlockCost = this.container.querySelector('#unlock-cost');
        
        modalTitle.textContent = `Unlock: ${nodeData.name}`;
        modalContent.innerHTML = `
            <div class="node-unlock-info">
                <p><strong>Path:</strong> ${nodeData.path.name}</p>
                <p><strong>Tier:</strong> ${nodeData.tier.charAt(0).toUpperCase() + nodeData.tier.slice(1)}</p>
                <p><strong>Description:</strong> ${nodeData.description}</p>
                <p><strong>Effect:</strong> ${nodeData.effect}</p>
                <div class="unlock-requirements">
                    <h4>Requirements:</h4>
                    <ul>
                        <li>Skill Level: ${nodeData.level} ✓</li>
                        ${nodeData.requires.map(req => `<li>Prerequisite: ${req} ✓</li>`).join('')}
                        <li>XP Cost: ${nodeData.cost}</li>
                    </ul>
                </div>
            </div>
        `;
        
        unlockCost.textContent = nodeData.cost;
        this.pendingUnlock = nodeData;
        
        modal.classList.remove('hidden');
    }
    
    hideModal(modal) {
        modal.classList.add('hidden');
        this.pendingUnlock = null;
    }
    
    confirmUnlock() {
        if (!this.pendingUnlock || !this.selectedCharacter) return;
        
        const nodeId = this.pendingUnlock.id;
        const cost = this.pendingUnlock.cost;
        
        // Check if character has enough XP
        if ((this.selectedCharacter.xp || 0) < cost) {
            alert('Not enough XP to unlock this node!');
            return;
        }
        
        // Update character data
        this.selectedCharacter.xp = (this.selectedCharacter.xp || 0) - cost;
        
        // Add node to unlocked list
        if (!this.selectedCharacter.unlockedNodes) {
            this.selectedCharacter.unlockedNodes = [];
        }
        this.selectedCharacter.unlockedNodes.push(nodeId);
        
        // Store path selection if this is the first node in a path
        if (this.pendingUnlock.level === 0 && this.pendingUnlock.path) {
            if (!this.selectedCharacter.skillPaths) {
                this.selectedCharacter.skillPaths = {};
            }
            this.selectedCharacter.skillPaths[this.selectedSkill] = this.pendingUnlock.path.id;
        }
        
        // Emit unlock event
        this.eventBus.emit('skill:advance', {
            characterId: this.selectedCharacter.id,
            skill: this.selectedSkill,
            nodeId: nodeId,
            cost: cost,
            character: this.selectedCharacter
        });
        
        // Save character data
        this.dataManager.saveCharacter(this.selectedCharacter);
        
        // Update display
        this.hideModal(this.container.querySelector('#node-modal'));
        this.updateCharacterInfo();
        this.drawSkillTree();
    }
    
    async loadCharacterProgress() {
        // Load character skill progress from data manager
        try {
            // Try to get active character ID from localStorage first
            const savedCharId = localStorage.getItem('cosmos-vtt-active-character');
            const characterId = savedCharId || this.config.activeCharacterId;
            
            if (characterId) {
                const characterData = await this.dataManager.loadCharacter(parseInt(characterId));
                if (characterData) {
                    this.loadCharacter(characterData);
                }
            }
        } catch (error) {
            console.log('No active character found');
        }
    }
    
    loadCharacter(characterData) {
        this.selectedCharacter = characterData;
        this.updateCharacterInfo();
        this.drawSkillTree();
    }
    
    updateCharacterInfo() {
        if (!this.selectedCharacter) return;
        
        const skillLevel = this.selectedCharacter.skills?.[this.selectedSkill] || 0;
        const availableXP = this.selectedCharacter.xp || 0;
        const nextLevelCost = this.getXPCostForLevel(skillLevel + 1);
        
        this.container.querySelector('#character-name').textContent = this.selectedCharacter.name || 'Unknown Character';
        this.container.querySelector('#skill-level').textContent = skillLevel;
        this.container.querySelector('#available-xp').textContent = availableXP;
        this.container.querySelector('#xp-needed').textContent = nextLevelCost;
        
        // Update progress bar
        const progressBar = this.container.querySelector('#skill-progress-bar');
        progressBar.style.width = `${(skillLevel / 10) * 100}%`;
    }
    
    getXPCostForLevel(level) {
        const costs = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50];
        return costs[level] || 0;
    }
    
    async exportTree() {
        // Create a high-resolution image of the skill tree
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = 1600;
        tempCanvas.height = 900;
        
        const tempCtx = tempCanvas.getContext('2d');
        
        // Store current state
        const currentZoom = this.zoomLevel;
        const currentPan = { ...this.panOffset };
        const currentCanvas = this.canvas;
        const currentCtx = this.ctx;
        
        // Temporarily use temp canvas
        this.canvas = tempCanvas;
        this.ctx = tempCtx;
        this.zoomLevel = 1;
        this.panOffset = { x: 0, y: 0 };
        
        // Set black background
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        
        // Draw the tree
        this.drawSkillTree();
        
        // Restore original state
        this.canvas = currentCanvas;
        this.ctx = currentCtx;
        this.zoomLevel = currentZoom;
        this.panOffset = currentPan;
        
        // Export as image
        tempCanvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `cosmos-engine-${this.selectedSkill}-tree.png`;
            a.click();
            URL.revokeObjectURL(url);
        });
    }
}