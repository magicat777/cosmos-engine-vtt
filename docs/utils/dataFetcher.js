/**
 * Data Fetcher Utility
 * Fetches game data from the main Cosmos Engine RPG repository
 * Falls back to local data when offline
 */

export class DataFetcher {
    constructor(config) {
        this.config = config;
        this.baseUrl = 'https://raw.githubusercontent.com/magicat777/CosmosEngineRPG/main/';
        this.cache = new Map();
    }
    
    /**
     * Fetch data from the main repository
     * @param {string} path - Path relative to repo root
     * @returns {Promise<any>} Parsed JSON data
     */
    async fetchFromRepo(path) {
        const cacheKey = `repo:${path}`;
        
        // Check memory cache first
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }
        
        try {
            const url = this.baseUrl + path;
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`Failed to fetch ${path}: ${response.status}`);
            }
            
            let data;
            if (path.endsWith('.json')) {
                data = await response.json();
            } else if (path.endsWith('.md')) {
                data = await response.text();
            } else {
                data = await response.text();
            }
            
            // Cache the result
            this.cache.set(cacheKey, data);
            
            // Also store in localStorage for offline access
            this.saveToLocalStorage(cacheKey, data);
            
            return data;
        } catch (error) {
            console.warn(`Failed to fetch from repo: ${error.message}`);
            
            // Try to load from localStorage
            const cached = this.loadFromLocalStorage(cacheKey);
            if (cached) {
                console.log(`Using cached data for ${path}`);
                return cached;
            }
            
            throw error;
        }
    }
    
    /**
     * Fetch rules documentation from the repo
     * @returns {Promise<Object>} Structured rules data
     */
    async fetchRules() {
        try {
            // Try to fetch various rule documents
            const rulePaths = [
                'docs/core-rules/system_summary.md',
                'docs/core-rules/combat-system-v3.md',
                'docs/core-rules/balanced-skill-system.md',
                'docs/equipment/equipment-catalog-by-era.md'
            ];
            
            const rulePromises = rulePaths.map(path => 
                this.fetchFromRepo(path).catch(err => {
                    console.warn(`Could not fetch ${path}:`, err);
                    return null;
                })
            );
            
            const results = await Promise.all(rulePromises);
            
            // Parse and structure the rules
            return this.parseRulesFromMarkdown(results.filter(r => r !== null));
            
        } catch (error) {
            console.error('Failed to fetch rules:', error);
            // Return null to use hardcoded rules in RulesReference
            return null;
        }
    }
    
    /**
     * Parse markdown files into structured rules
     * @param {string[]} markdownFiles - Array of markdown content
     * @returns {Object} Structured rules data
     */
    parseRulesFromMarkdown(markdownFiles) {
        const rules = [];
        let ruleId = 0;
        
        markdownFiles.forEach(markdown => {
            // Simple parser - could be enhanced
            const lines = markdown.split('\n');
            let currentSection = null;
            let currentRule = null;
            
            lines.forEach(line => {
                // Section headers
                if (line.startsWith('## ')) {
                    currentSection = line.substring(3).trim();
                }
                
                // Rule headers
                if (line.startsWith('### ')) {
                    if (currentRule) {
                        rules.push(currentRule);
                    }
                    
                    currentRule = {
                        id: `parsed-${ruleId++}`,
                        category: this.categorizeRule(currentSection),
                        title: line.substring(4).trim(),
                        content: '',
                        examples: [],
                        related: []
                    };
                }
                
                // Rule content
                if (currentRule && !line.startsWith('#')) {
                    if (line.includes('Example:') || line.includes('e.g.')) {
                        currentRule.examples.push(line.trim());
                    } else if (line.trim()) {
                        currentRule.content += line.trim() + ' ';
                    }
                }
            });
            
            if (currentRule) {
                rules.push(currentRule);
            }
        });
        
        return {
            categories: {
                'core': 'Core Mechanics',
                'combat': 'Combat',
                'skills': 'Skills & Actions',
                'equipment': 'Equipment',
                'vehicles': 'Vehicles & Starships',
                'advancement': 'Character Advancement',
                'gm': 'Game Master'
            },
            rules: rules
        };
    }
    
    /**
     * Categorize a rule based on its section
     * @param {string} section - Section name from markdown
     * @returns {string} Category key
     */
    categorizeRule(section) {
        const sectionLower = (section || '').toLowerCase();
        
        if (sectionLower.includes('combat')) return 'combat';
        if (sectionLower.includes('skill')) return 'skills';
        if (sectionLower.includes('equipment') || sectionLower.includes('gear')) return 'equipment';
        if (sectionLower.includes('vehicle') || sectionLower.includes('ship')) return 'vehicles';
        if (sectionLower.includes('advancement') || sectionLower.includes('level')) return 'advancement';
        if (sectionLower.includes('gm') || sectionLower.includes('master')) return 'gm';
        
        return 'core';
    }
    
    /**
     * Save data to localStorage
     * @param {string} key - Storage key
     * @param {any} data - Data to store
     */
    saveToLocalStorage(key, data) {
        try {
            const serialized = JSON.stringify({
                data: data,
                timestamp: Date.now()
            });
            localStorage.setItem(`cosmos-vtt-fetch-${key}`, serialized);
        } catch (error) {
            console.warn('Failed to save to localStorage:', error);
        }
    }
    
    /**
     * Load data from localStorage
     * @param {string} key - Storage key
     * @returns {any|null} Stored data or null
     */
    loadFromLocalStorage(key) {
        try {
            const stored = localStorage.getItem(`cosmos-vtt-fetch-${key}`);
            if (!stored) return null;
            
            const parsed = JSON.parse(stored);
            
            // Check if data is too old (24 hours)
            const age = Date.now() - parsed.timestamp;
            if (age > 24 * 60 * 60 * 1000) {
                localStorage.removeItem(`cosmos-vtt-fetch-${key}`);
                return null;
            }
            
            return parsed.data;
        } catch (error) {
            console.warn('Failed to load from localStorage:', error);
            return null;
        }
    }
    
    /**
     * Clear all cached data
     */
    clearCache() {
        this.cache.clear();
        
        // Clear localStorage items
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
            if (key.startsWith('cosmos-vtt-fetch-')) {
                localStorage.removeItem(key);
            }
        });
    }
}