/**
 * Cosmos Engine VTT - Main Application Entry Point
 * 
 * This is the core application controller that initializes all components
 * and manages the overall application state.
 */

import { Router } from './lib/router.js';
import { Config } from './config.js';
import { DataManager } from './components/DataManager.js';
import { PanelSystem } from './components/PanelSystem.js';

// Component imports
import { DiceRoller } from './components/DiceRoller.js';
import { CharacterSheet } from './components/CharacterSheet.js';
// import { CombatTracker } from './components/CombatTracker.js';
import { RulesReference } from './components/RulesReference.js';

class CosmosEngineVTT {
    constructor() {
        this.config = new Config();
        this.router = new Router();
        this.dataManager = new DataManager(this.config);
        this.panels = new PanelSystem();
        this.components = new Map();
        
        this.init();
    }
    
    async init() {
        console.log('Initializing Cosmos Engine VTT...');
        
        try {
            // Initialize data manager
            await this.dataManager.init();
            
            // Set up routing
            this.setupRoutes();
            
            // Initialize panel system
            this.panels.init(document.getElementById('main-content'));
            
            // Load saved layout or default
            this.loadLayout();
            
            // Initialize components
            await this.initializeComponents();
            
            // Start router
            this.router.start();
            
            console.log('Cosmos Engine VTT initialized successfully');
        } catch (error) {
            console.error('Failed to initialize VTT:', error);
            this.showError('Failed to initialize application. Please refresh the page.');
        }
    }
    
    setupRoutes() {
        // Define application routes
        this.router.addRoute('/', () => this.showDashboard());
        this.router.addRoute('/character', () => this.showCharacterSheet());
        this.router.addRoute('/dice', () => this.showDiceRoller());
        this.router.addRoute('/combat', () => this.showCombatTracker());
        this.router.addRoute('/rules', () => this.showRulesReference());
        this.router.addRoute('/settings', () => this.showSettings());
    }
    
    async initializeComponents() {
        // Initialize DiceRoller
        const diceRoller = new DiceRoller(this.config);
        this.components.set('diceRoller', diceRoller);
        
        // Initialize CharacterSheet
        const characterSheet = new CharacterSheet(this.config, this.dataManager);
        this.components.set('characterSheet', characterSheet);
        
        // Initialize RulesReference
        const rulesReference = new RulesReference(this.config, this.dataManager);
        this.components.set('rulesReference', rulesReference);
        
        // More components will be added as they're developed
        console.log('Components initialized:', this.components.size);
    }
    
    loadLayout() {
        const savedLayout = localStorage.getItem('cosmos-vtt-layout');
        if (savedLayout) {
            try {
                const layout = JSON.parse(savedLayout);
                this.panels.loadLayout(layout);
            } catch (e) {
                console.error('Failed to load saved layout:', e);
                this.panels.loadDefaultLayout();
            }
        } else {
            this.panels.loadDefaultLayout();
        }
    }
    
    // Route handlers
    showDashboard() {
        this.panels.clear();
        this.panels.addPanel({
            id: 'welcome',
            title: 'Welcome to Cosmos Engine VTT',
            content: `
                <div class="dashboard">
                    <h2>Quick Start</h2>
                    <p>Select a tool from the navigation menu to begin.</p>
                    <ul>
                        <li><a href="#/dice">Dice Roller</a> - Roll 2d10 with modifiers</li>
                        <li><a href="#/character">Character Sheet</a> - Manage your character</li>
                        <li><a href="#/combat">Combat Tracker</a> - Track initiative and damage</li>
                        <li><a href="#/rules">Rules Reference</a> - Quick rule lookups</li>
                    </ul>
                </div>
            `
        });
    }
    
    showCharacterSheet() {
        this.panels.clear();
        const panelId = this.panels.addPanel({
            id: 'character-sheet',
            title: 'Character Sheet - Cosmos Engine',
            content: '<div id="character-sheet-component"></div>',
            width: 700,
            height: 800
        });
        
        // Initialize character sheet in the panel
        const characterSheet = this.components.get('characterSheet');
        const container = document.getElementById('character-sheet-component');
        if (characterSheet && container) {
            characterSheet.init(container);
        }
    }
    
    showDiceRoller() {
        this.panels.clear();
        const panelId = this.panels.addPanel({
            id: 'dice-roller',
            title: 'Dice Roller - 2d10 System',
            content: '<div id="dice-roller-component"></div>',
            width: 500,
            height: 600
        });
        
        // Initialize dice roller in the panel
        const diceRoller = this.components.get('diceRoller');
        const container = document.getElementById('dice-roller-component');
        if (diceRoller && container) {
            diceRoller.init(container);
        }
    }
    
    showCombatTracker() {
        this.panels.clear();
        this.panels.addPanel({
            id: 'combat-tracker',
            title: 'Combat Tracker',
            content: '<p>Combat tracker component coming soon...</p>'
        });
    }
    
    showRulesReference() {
        this.panels.clear();
        const panelId = this.panels.addPanel({
            id: 'rules-reference',
            title: 'Rules Reference - Quick Lookup',
            content: '<div id="rules-reference-component"></div>',
            width: 800,
            height: 600
        });
        
        // Initialize rules reference in the panel
        const rulesReference = this.components.get('rulesReference');
        const container = document.getElementById('rules-reference-component');
        if (rulesReference && container) {
            rulesReference.init(container);
        }
    }
    
    showSettings() {
        this.panels.clear();
        this.panels.addPanel({
            id: 'settings',
            title: 'Settings',
            content: `
                <div class="settings">
                    <h3>Application Settings</h3>
                    <label>
                        <input type="checkbox" id="offline-mode"> 
                        Enable Offline Mode
                    </label>
                    <label>
                        <input type="checkbox" id="dark-mode" checked> 
                        Dark Mode
                    </label>
                    <button onclick="localStorage.clear(); location.reload();">
                        Clear Local Data
                    </button>
                </div>
            `
        });
    }
    
    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        document.body.appendChild(errorDiv);
        
        setTimeout(() => errorDiv.remove(), 5000);
    }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new CosmosEngineVTT());
} else {
    new CosmosEngineVTT();
}