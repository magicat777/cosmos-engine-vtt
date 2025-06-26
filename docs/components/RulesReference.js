/**
 * RulesReference Component
 * 
 * Searchable rules database for Cosmos Engine
 * Features:
 * - Full-text search across all rules
 * - Category-based browsing
 * - Quick lookups for common rules
 * - Bookmarking frequently used rules
 * - Offline access to all content
 * - Cross-references between related rules
 */

export class RulesReference {
    constructor(config, dataManager) {
        this.config = config;
        this.dataManager = dataManager;
        this.element = null;
        this.rulesData = null;
        this.searchIndex = new Map();
        this.bookmarks = this.loadBookmarks();
        this.currentCategory = 'all';
        this.searchTerm = '';
        
        // Bind methods
        this.search = this.search.bind(this);
        this.toggleBookmark = this.toggleBookmark.bind(this);
    }
    
    async init(container) {
        this.element = container;
        
        // Load rules data
        await this.loadRulesData();
        
        // Build search index
        this.buildSearchIndex();
        
        this.render();
        this.attachEventListeners();
        return this;
    }
    
    async loadRulesData() {
        // For now, use hardcoded rules. Later this will fetch from the main repo
        this.rulesData = {
            categories: {
                'core': 'Core Mechanics',
                'combat': 'Combat',
                'skills': 'Skills & Actions',
                'equipment': 'Equipment',
                'vehicles': 'Vehicles & Starships',
                'advancement': 'Character Advancement',
                'gm': 'Game Master'
            },
            rules: [
                // Core Mechanics
                {
                    id: 'core-resolution',
                    category: 'core',
                    title: 'Basic Roll',
                    content: 'All actions use 2d10 + Attribute + Skill Modifier + Equipment.',
                    examples: ['Attack: 2d10 + Coordination + (Combat ÷ 2) + Weapon'],
                    related: ['core-tn', 'core-success-degrees']
                },
                {
                    id: 'core-tn',
                    category: 'core',
                    title: 'Target Numbers',
                    content: 'Trivial: 8, Easy: 11, Moderate: 14, Hard: 17, Extreme: 20, Legendary: 23',
                    examples: ['Picking a simple lock: TN 11', 'Hacking military encryption: TN 20'],
                    related: ['core-resolution', 'core-success-degrees']
                },
                {
                    id: 'core-success-degrees',
                    category: 'core',
                    title: 'Degrees of Success',
                    content: 'Success margins determine quality: 0-2 Marginal, 3-5 Solid, 6-9 Critical, 10+ Legendary',
                    examples: ['Roll 17 vs TN 14 = +3 Solid Success'],
                    related: ['core-resolution', 'core-tn']
                },
                {
                    id: 'core-advantage',
                    category: 'core',
                    title: 'Advantage/Disadvantage',
                    content: 'Advantage: Roll 3d10, keep highest 2. Disadvantage: Roll 3d10, keep lowest 2.',
                    examples: ['Flanking grants advantage', 'Darkness imposes disadvantage'],
                    related: ['core-resolution']
                },
                
                // Combat Rules
                {
                    id: 'combat-initiative',
                    category: 'combat',
                    title: 'Initiative',
                    content: 'Roll 1d10 + Awareness + Coordination. Act in descending order.',
                    examples: ['Character with Awareness 4, Coordination 3 rolls 1d10+7'],
                    related: ['combat-turns', 'combat-actions']
                },
                {
                    id: 'combat-attack',
                    category: 'combat',
                    title: 'Attack Formula',
                    content: 'Attack: 2d10 + Attribute + (Combat ÷ 2) + Equipment + Situational',
                    examples: ['Melee: 2d10 + Might + (Combat ÷ 2) + Weapon', 'Ranged: 2d10 + Coordination + (Combat ÷ 2) + Weapon'],
                    related: ['combat-defense', 'combat-damage']
                },
                {
                    id: 'combat-defense',
                    category: 'combat',
                    title: 'Defense Calculation',
                    content: 'Defense = 10 + Coordination + (Combat ÷ 2) + Cover + Armor',
                    examples: ['Coordination 4, Combat 6 = Defense 17'],
                    related: ['combat-attack', 'combat-cover']
                },
                {
                    id: 'combat-damage',
                    category: 'combat',
                    title: 'Damage & Health',
                    content: 'Weapons deal fixed damage. HP = 30 + (Might × 5) + (Resolve × 5) + (Level × 5)',
                    examples: ['Laser Pistol: 1d10+2', 'Level 5 with Might 4, Resolve 3: 90 HP'],
                    related: ['combat-attack', 'combat-healing']
                },
                {
                    id: 'combat-actions',
                    category: 'combat',
                    title: 'Combat Actions',
                    content: 'Each turn: 1 Standard Action + 1 Move Action + Quick Actions',
                    examples: ['Standard: Attack, Full Defense', 'Move: Movement, Stand Up', 'Quick: Reload, Shout'],
                    related: ['combat-initiative', 'combat-movement']
                },
                {
                    id: 'combat-cover',
                    category: 'combat',
                    title: 'Cover & Concealment',
                    content: 'Partial Cover: +2 Defense. Full Cover: +4 Defense. Cannot be targeted behind total cover.',
                    examples: ['Behind crate: +2 Defense', 'Around corner: Cannot be targeted'],
                    related: ['combat-defense']
                },
                
                // Skills
                {
                    id: 'skills-list',
                    category: 'skills',
                    title: 'Skill List',
                    content: 'Combat, Pilot, Stealth, Athletics, Survival, Intimidation, Perception, Medical, Tech, Knowledge, Deception, Persuasion, Command, Discipline',
                    examples: ['Each skill has 0-10 ranks'],
                    related: ['skills-checks', 'skills-specialization']
                },
                {
                    id: 'skills-checks',
                    category: 'skills',
                    title: 'Skill Checks',
                    content: 'Roll: 2d10 + Attribute + (Skill ÷ 2) + Equipment + Situation',
                    examples: ['Hacking: 2d10 + Intellect + (Tech ÷ 2) + Hacking Kit'],
                    related: ['core-resolution', 'skills-list']
                },
                {
                    id: 'skills-specialization',
                    category: 'skills',
                    title: 'Specializations',
                    content: 'At skill rank 5+, choose a specialization for +2 bonus in that area.',
                    examples: ['Tech (Hacking) gives +2 to hacking attempts'],
                    related: ['skills-list', 'advancement-skills']
                },
                
                // Equipment
                {
                    id: 'equipment-eras',
                    category: 'equipment',
                    title: 'Technology Eras',
                    content: 'Primitive (-1), Industrial (+0), Advanced (+1), Stellar (+2), Exotic (+3)',
                    examples: ['Stellar Laser Rifle: +2 to hit and damage'],
                    related: ['equipment-weapons', 'equipment-armor']
                },
                {
                    id: 'equipment-weapons',
                    category: 'equipment',
                    title: 'Weapon Types',
                    content: 'Melee (Might-based), Ranged (Coordination-based), Energy (ignores some armor)',
                    examples: ['Vibroblade: 1d10+3 melee', 'Plasma Rifle: 2d10 energy'],
                    related: ['combat-attack', 'equipment-eras']
                },
                {
                    id: 'equipment-armor',
                    category: 'equipment',
                    title: 'Armor & Protection',
                    content: 'Light (+1), Medium (+2), Heavy (+3) to Defense. May have penalties.',
                    examples: ['Combat Armor: +2 Defense, -1 Stealth'],
                    related: ['combat-defense', 'equipment-eras']
                },
                
                // Vehicles
                {
                    id: 'vehicles-scales',
                    category: 'vehicles',
                    title: 'Scale System',
                    content: 'Personal (×1), Vehicle (×10), Starship (×100), Capital (×1000) damage',
                    examples: ['Vehicle weapon vs person: ×10 damage'],
                    related: ['vehicles-combat', 'combat-damage']
                },
                {
                    id: 'vehicles-operation',
                    category: 'vehicles',
                    title: 'Vehicle Operation',
                    content: 'Pilot checks: 2d10 + Coordination + (Pilot ÷ 2) + Vehicle Handling',
                    examples: ['Fighter with Handling +2: extra +2 to all pilot checks'],
                    related: ['skills-checks', 'vehicles-combat']
                },
                {
                    id: 'vehicles-combat',
                    category: 'vehicles',
                    title: 'Vehicle Combat',
                    content: 'Uses same combat system at different scale. Initiative includes vehicle handling.',
                    examples: ['Starfighter combat at Starship scale (×100 damage)'],
                    related: ['combat-initiative', 'vehicles-scales']
                },
                
                // Advancement
                {
                    id: 'advancement-points',
                    category: 'advancement',
                    title: 'Advancement Points',
                    content: 'Gain 1-3 AP per session. Costs: Attribute +1 (10 AP), Skill +1 (3 AP)',
                    examples: ['After 4 sessions with 10 AP total: Raise Might from 3 to 4'],
                    related: ['advancement-levels', 'advancement-skills']
                },
                {
                    id: 'advancement-levels',
                    category: 'advancement',
                    title: 'Character Levels',
                    content: 'Gain 1 level per 10 AP spent. Levels 1-20. Each level: +5 HP',
                    examples: ['Spending 30 AP total = Level 3 character'],
                    related: ['advancement-points', 'combat-damage']
                },
                {
                    id: 'advancement-skills',
                    category: 'advancement',
                    title: 'Skill Advancement',
                    content: 'Skills 0-10. Cannot exceed Attribute +2. Specialization at rank 5+.',
                    examples: ['Intellect 4 means Tech skill maxes at 6'],
                    related: ['skills-list', 'skills-specialization']
                },
                
                // GM Rules
                {
                    id: 'gm-difficulty',
                    category: 'gm',
                    title: 'Setting Difficulty',
                    content: 'Consider approach, tools, time, and conditions when setting TNs.',
                    examples: ['Picking lock with proper tools: TN 14, Improvised tools: TN 17'],
                    related: ['core-tn', 'gm-modifiers']
                },
                {
                    id: 'gm-modifiers',
                    category: 'gm',
                    title: 'Situational Modifiers',
                    content: 'Apply -2 to -4 for difficult conditions, +2 to +4 for ideal conditions.',
                    examples: ['Rain: -2 to physical tasks', 'Perfect lighting: +2 to Perception'],
                    related: ['gm-difficulty', 'core-resolution']
                },
                {
                    id: 'gm-npcs',
                    category: 'gm',
                    title: 'NPC Statistics',
                    content: 'Minions: 5+ levels below PCs. Standard: Equal level. Elite: 1-2 levels above.',
                    examples: ['Level 10 PCs face Level 5 minions (drop in one hit)'],
                    related: ['gm-encounters', 'combat-damage']
                },
                {
                    id: 'gm-encounters',
                    category: 'gm',
                    title: 'Encounter Balance',
                    content: 'Standard: Equal numbers at equal level. Adjust for party size and optimization.',
                    examples: ['4 Level 5 PCs vs 4 Level 5 enemies = Standard encounter'],
                    related: ['gm-npcs', 'gm-difficulty']
                }
            ]
        };
    }
    
    buildSearchIndex() {
        // Build inverted index for full-text search
        this.rulesData.rules.forEach(rule => {
            const text = `${rule.title} ${rule.content} ${rule.examples.join(' ')}`.toLowerCase();
            const words = text.split(/\s+/);
            
            words.forEach(word => {
                if (word.length < 3) return; // Skip short words
                
                if (!this.searchIndex.has(word)) {
                    this.searchIndex.set(word, new Set());
                }
                this.searchIndex.get(word).add(rule.id);
            });
        });
    }
    
    render() {
        this.element.innerHTML = `
            <div class="rules-reference">
                <div class="rules-header">
                    <div class="search-container">
                        <input type="text" 
                               id="rules-search" 
                               class="rules-search" 
                               placeholder="Search rules..."
                               value="${this.searchTerm}">
                        <button id="clear-search" class="btn-icon" title="Clear search">×</button>
                    </div>
                    
                    <div class="category-filters">
                        <button class="category-btn ${this.currentCategory === 'all' ? 'active' : ''}" 
                                data-category="all">All</button>
                        ${Object.entries(this.rulesData.categories).map(([key, name]) => `
                            <button class="category-btn ${this.currentCategory === key ? 'active' : ''}" 
                                    data-category="${key}">${name}</button>
                        `).join('')}
                    </div>
                </div>
                
                <div class="rules-content">
                    <div class="rules-sidebar">
                        <h3>Quick Links</h3>
                        <div class="quick-links">
                            <a href="#" data-rule="core-resolution">Basic Roll</a>
                            <a href="#" data-rule="core-tn">Target Numbers</a>
                            <a href="#" data-rule="combat-attack">Attack Formula</a>
                            <a href="#" data-rule="combat-defense">Defense Calculation</a>
                            <a href="#" data-rule="skills-checks">Skill Checks</a>
                            <a href="#" data-rule="advancement-points">Advancement</a>
                        </div>
                        
                        <h3>Bookmarks</h3>
                        <div id="bookmarks-list" class="bookmarks-list">
                            ${this.renderBookmarks()}
                        </div>
                    </div>
                    
                    <div class="rules-main">
                        <div id="rules-list" class="rules-list">
                            ${this.renderRules()}
                        </div>
                    </div>
                </div>
                
                <div class="rules-footer">
                    <span class="rule-count">${this.getFilteredRules().length} rules shown</span>
                </div>
            </div>
        `;
    }
    
    renderRules() {
        const rules = this.getFilteredRules();
        
        if (rules.length === 0) {
            return `<div class="no-results">No rules found matching your search.</div>`;
        }
        
        return rules.map(rule => `
            <div class="rule-card" data-rule-id="${rule.id}">
                <div class="rule-header">
                    <h4>${this.highlightSearchTerm(rule.title)}</h4>
                    <button class="bookmark-btn ${this.bookmarks.has(rule.id) ? 'bookmarked' : ''}" 
                            data-rule-id="${rule.id}"
                            title="${this.bookmarks.has(rule.id) ? 'Remove bookmark' : 'Add bookmark'}">
                        ★
                    </button>
                </div>
                <div class="rule-category">${this.rulesData.categories[rule.category]}</div>
                <div class="rule-content">${this.highlightSearchTerm(rule.content)}</div>
                ${rule.examples.length > 0 ? `
                    <div class="rule-examples">
                        <strong>Examples:</strong>
                        <ul>
                            ${rule.examples.map(ex => `<li>${this.highlightSearchTerm(ex)}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
                ${rule.related.length > 0 ? `
                    <div class="rule-related">
                        <strong>Related:</strong>
                        ${rule.related.map(relId => {
                            const relRule = this.rulesData.rules.find(r => r.id === relId);
                            return relRule ? `<a href="#" data-rule="${relId}">${relRule.title}</a>` : '';
                        }).join(', ')}
                    </div>
                ` : ''}
            </div>
        `).join('');
    }
    
    renderBookmarks() {
        if (this.bookmarks.size === 0) {
            return '<p class="no-bookmarks">No bookmarks yet</p>';
        }
        
        return Array.from(this.bookmarks).map(ruleId => {
            const rule = this.rulesData.rules.find(r => r.id === ruleId);
            if (!rule) return '';
            
            return `<a href="#" data-rule="${ruleId}">${rule.title}</a>`;
        }).join('');
    }
    
    getFilteredRules() {
        let rules = this.rulesData.rules;
        
        // Filter by category
        if (this.currentCategory !== 'all') {
            rules = rules.filter(rule => rule.category === this.currentCategory);
        }
        
        // Filter by search term
        if (this.searchTerm) {
            const searchWords = this.searchTerm.toLowerCase().split(/\s+/);
            const matchingIds = new Set();
            
            searchWords.forEach(word => {
                if (word.length < 3) return;
                
                // Get all rules that contain this word
                const ids = this.searchIndex.get(word);
                if (ids) {
                    ids.forEach(id => matchingIds.add(id));
                }
            });
            
            rules = rules.filter(rule => matchingIds.has(rule.id));
        }
        
        return rules;
    }
    
    highlightSearchTerm(text) {
        if (!this.searchTerm) return text;
        
        const searchWords = this.searchTerm.split(/\s+/).filter(w => w.length >= 3);
        let highlighted = text;
        
        searchWords.forEach(word => {
            const regex = new RegExp(`(${word})`, 'gi');
            highlighted = highlighted.replace(regex, '<mark>$1</mark>');
        });
        
        return highlighted;
    }
    
    attachEventListeners() {
        // Search functionality
        const searchInput = this.element.querySelector('#rules-search');
        searchInput.addEventListener('input', (e) => {
            this.searchTerm = e.target.value;
            this.updateRulesList();
        });
        
        // Clear search
        this.element.querySelector('#clear-search').addEventListener('click', () => {
            this.searchTerm = '';
            searchInput.value = '';
            this.updateRulesList();
        });
        
        // Category filters
        this.element.querySelectorAll('.category-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.currentCategory = e.target.dataset.category;
                this.updateCategoryButtons();
                this.updateRulesList();
            });
        });
        
        // Rule links (using event delegation)
        this.element.addEventListener('click', (e) => {
            // Handle rule links
            if (e.target.matches('[data-rule]')) {
                e.preventDefault();
                const ruleId = e.target.dataset.rule;
                this.scrollToRule(ruleId);
            }
            
            // Handle bookmarks
            if (e.target.matches('.bookmark-btn')) {
                const ruleId = e.target.dataset.ruleId;
                this.toggleBookmark(ruleId);
            }
        });
        
        // Keyboard shortcuts
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.searchTerm = '';
                searchInput.value = '';
                this.updateRulesList();
            }
        });
    }
    
    updateRulesList() {
        const rulesList = this.element.querySelector('#rules-list');
        rulesList.innerHTML = this.renderRules();
        
        // Update rule count
        const count = this.getFilteredRules().length;
        this.element.querySelector('.rule-count').textContent = `${count} rules shown`;
    }
    
    updateCategoryButtons() {
        this.element.querySelectorAll('.category-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.category === this.currentCategory);
        });
    }
    
    scrollToRule(ruleId) {
        // First, clear any filters that might hide the rule
        this.currentCategory = 'all';
        this.searchTerm = '';
        this.element.querySelector('#rules-search').value = '';
        this.updateCategoryButtons();
        this.updateRulesList();
        
        // Then scroll to the rule
        setTimeout(() => {
            const ruleCard = this.element.querySelector(`[data-rule-id="${ruleId}"]`);
            if (ruleCard) {
                ruleCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                ruleCard.classList.add('highlight');
                setTimeout(() => ruleCard.classList.remove('highlight'), 2000);
            }
        }, 100);
    }
    
    toggleBookmark(ruleId) {
        if (this.bookmarks.has(ruleId)) {
            this.bookmarks.delete(ruleId);
        } else {
            this.bookmarks.add(ruleId);
        }
        
        this.saveBookmarks();
        this.updateBookmarkButton(ruleId);
        this.updateBookmarksList();
    }
    
    updateBookmarkButton(ruleId) {
        const btn = this.element.querySelector(`.bookmark-btn[data-rule-id="${ruleId}"]`);
        if (btn) {
            const isBookmarked = this.bookmarks.has(ruleId);
            btn.classList.toggle('bookmarked', isBookmarked);
            btn.title = isBookmarked ? 'Remove bookmark' : 'Add bookmark';
        }
    }
    
    updateBookmarksList() {
        const bookmarksList = this.element.querySelector('#bookmarks-list');
        bookmarksList.innerHTML = this.renderBookmarks();
    }
    
    saveBookmarks() {
        localStorage.setItem('cosmos-vtt-bookmarks', JSON.stringify([...this.bookmarks]));
    }
    
    loadBookmarks() {
        const saved = localStorage.getItem('cosmos-vtt-bookmarks');
        if (saved) {
            try {
                return new Set(JSON.parse(saved));
            } catch (e) {
                console.error('Failed to load bookmarks:', e);
            }
        }
        return new Set();
    }
    
    // Public API
    search(term) {
        this.searchTerm = term;
        const searchInput = this.element.querySelector('#rules-search');
        if (searchInput) {
            searchInput.value = term;
        }
        this.updateRulesList();
    }
    
    showRule(ruleId) {
        this.scrollToRule(ruleId);
    }
    
    getRule(ruleId) {
        return this.rulesData.rules.find(r => r.id === ruleId);
    }
}