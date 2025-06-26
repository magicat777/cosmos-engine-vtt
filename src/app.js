/**
 * Cosmos Engine VTT - Main Application Entry Point
 * 
 * This is the core application controller that initializes all components
 * and manages the overall application state.
 */

import { Router } from './lib/router.js';
import { EventBus } from './lib/eventBus.js';
import { stateManager } from './lib/stateManager.js';
import { Config } from './config.js';
import { DataManager } from './components/DataManager.js';
import { PanelSystem } from './components/PanelSystem.js';

// Component imports
import { DiceRoller } from './components/DiceRoller.js';
import { CharacterSheet } from './components/CharacterSheet.js';
import { CombatTracker } from './components/CombatTracker.js';
import { ScaleManager } from './components/ScaleManager.js';
import { RulesReference } from './components/RulesReference.js';
import { EncounterBuilder } from './components/EncounterBuilder.js';
import { ImportExport } from './components/ImportExport.js';
import { SessionTracker } from './components/SessionTracker.js';
import { CampaignNotes } from './components/CampaignNotes.js';
import { NPCManager } from './components/NPCManager.js';
import { WorldBuilder } from './components/WorldBuilder.js';
import { AutomationTools } from './components/AutomationTools.js';
import { DataSync } from './components/DataSync.js';
import { SkillTrees } from './components/SkillTrees.js';

class CosmosEngineVTT {
    constructor() {
        this.config = new Config();
        this.eventBus = new EventBus();
        this.stateManager = stateManager;
        this.router = new Router();
        this.dataManager = new DataManager(this.config);
        this.panels = new PanelSystem();
        this.components = new Map();
        
        // Make stateManager available globally for debugging
        window.appState = this.stateManager;
        
        this.init();
    }
    
    async init() {
        console.log('Initializing Cosmos Engine VTT...');
        
        try {
            // Initialize data manager
            console.log('Initializing data manager...');
            await this.dataManager.init();
            
            // Set up routing
            console.log('Setting up routes...');
            this.setupRoutes();
            
            // Initialize panel system
            console.log('Initializing panels...');
            this.panels.init(document.getElementById('main-content'));
            
            // Load saved layout or default
            console.log('Loading layout...');
            this.loadLayout();
            
            // Initialize components
            console.log('Initializing components...');
            await this.initializeComponents();
            
            // Start router
            console.log('Starting router...');
            this.router.start();
            
            console.log('Cosmos Engine VTT initialized successfully');
        } catch (error) {
            console.error('Failed to initialize VTT:', error);
            console.error('Error stack:', error.stack);
            this.showError(`Failed to initialize application: ${error.message}. Please refresh the page.`);
        }
    }
    
    setupRoutes() {
        // Define application routes
        this.router.addRoute('/', () => this.showDashboard());
        this.router.addRoute('/character', () => this.showCharacterSheet());
        this.router.addRoute('/dice', () => this.showDiceRoller());
        this.router.addRoute('/combat', () => this.showCombatTracker());
        this.router.addRoute('/encounter', () => this.showEncounterBuilder());
        this.router.addRoute('/scales', () => this.showScaleManager());
        this.router.addRoute('/rules', () => this.showRulesReference());
        this.router.addRoute('/session', () => this.showSessionTracker());
        this.router.addRoute('/notes', () => this.showCampaignNotes());
        this.router.addRoute('/npcs', () => this.showNPCManager());
        this.router.addRoute('/world', () => this.showWorldBuilder());
        this.router.addRoute('/automation', () => this.showAutomationTools());
        this.router.addRoute('/sync', () => this.showDataSync());
        this.router.addRoute('/skilltrees', () => this.showSkillTrees());
        this.router.addRoute('/import-export', () => this.showImportExport());
        this.router.addRoute('/settings', () => this.showSettings());
    }
    
    async initializeComponents() {
        const componentList = [
            { name: 'DiceRoller', class: DiceRoller, deps: [this.config, this.eventBus] },
            { name: 'CharacterSheet', class: CharacterSheet, deps: [this.config, this.dataManager] },
            { name: 'CombatTracker', class: CombatTracker, deps: [this.config, this.dataManager, this.eventBus] },
            { name: 'ScaleManager', class: ScaleManager, deps: [this.config, this.eventBus] },
            { name: 'RulesReference', class: RulesReference, deps: [this.config, this.dataManager] },
            { name: 'EncounterBuilder', class: EncounterBuilder, deps: [this.config, this.dataManager, this.eventBus] },
            { name: 'ImportExport', class: ImportExport, deps: [this.config, this.dataManager, this.stateManager] },
            { name: 'SessionTracker', class: SessionTracker, deps: [this.config, this.dataManager, this.stateManager] },
            { name: 'CampaignNotes', class: CampaignNotes, deps: [this.config, this.dataManager, this.stateManager] },
            { name: 'NPCManager', class: NPCManager, deps: [this.config, this.dataManager, this.stateManager] },
            { name: 'WorldBuilder', class: WorldBuilder, deps: [this.eventBus, this.dataManager] },
            { name: 'AutomationTools', class: AutomationTools, deps: [this.config, this.dataManager, this.eventBus] },
            { name: 'DataSync', class: DataSync, deps: [this.config, this.dataManager, this.eventBus] },
            { name: 'SkillTrees', class: SkillTrees, deps: [this.config, this.dataManager, this.eventBus] }
        ];

        for (const component of componentList) {
            try {
                console.log(`Initializing ${component.name}...`);
                const instance = new component.class(...component.deps);
                this.components.set(component.name.toLowerCase(), instance);
            } catch (error) {
                console.error(`Failed to initialize ${component.name}:`, error);
                throw new Error(`Component initialization failed: ${component.name} - ${error.message}`);
            }
        }
        
        console.log('All components initialized successfully:', this.components.size);
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
                        <li><a href="#/encounter">Encounter Builder</a> - Create balanced encounters</li>
                        <li><a href="#/scales">Scale Manager</a> - Convert damage between scales</li>
                        <li><a href="#/rules">Rules Reference</a> - Quick rule lookups</li>
                        <li><a href="#/session">Session Tracker</a> - Track campaign sessions</li>
                        <li><a href="#/notes">Campaign Notes</a> - Organize GM notes</li>
                        <li><a href="#/npcs">NPC Manager</a> - Manage characters and NPCs</li>
                        <li><a href="#/world">World Builder</a> - Create locations and factions</li>
                        <li><a href="#/automation">Automation Tools</a> - Macros and conditions</li>
                        <li><a href="#/sync">Data Sync</a> - Cloud saves and collaboration</li>
                        <li><a href="#/skilltrees">Skill Trees</a> - Visual skill progression</li>
                        <li><a href="#/import-export">Import/Export</a> - Backup and share data</li>
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
        const characterSheet = this.components.get('charactersheet');
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
        const diceRoller = this.components.get('diceroller');
        const container = document.getElementById('dice-roller-component');
        if (diceRoller && container) {
            diceRoller.init(container);
        }
    }
    
    showCombatTracker() {
        this.panels.clear();
        const panelId = this.panels.addPanel({
            id: 'combat-tracker',
            title: 'Combat Tracker - Initiative & HP',
            content: '<div id="combat-tracker-component"></div>',
            width: 900,
            height: 700
        });
        
        // Initialize combat tracker in the panel
        const combatTracker = this.components.get('combattracker');
        const container = document.getElementById('combat-tracker-component');
        if (combatTracker && container) {
            combatTracker.init(container);
        }
    }
    
    showScaleManager() {
        this.panels.clear();
        const panelId = this.panels.addPanel({
            id: 'scale-manager',
            title: 'Scale Manager - Combat Scaling',
            content: '<div id="scale-manager-component"></div>',
            width: 600,
            height: 700
        });
        
        // Initialize scale manager in the panel
        const scaleManager = this.components.get('scalemanager');
        const container = document.getElementById('scale-manager-component');
        if (scaleManager && container) {
            scaleManager.init(container);
        }
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
        const rulesReference = this.components.get('rulesreference');
        const container = document.getElementById('rules-reference-component');
        if (rulesReference && container) {
            rulesReference.init(container);
        }
    }
    
    showEncounterBuilder() {
        this.panels.clear();
        const panelId = this.panels.addPanel({
            id: 'encounter-builder',
            title: 'Encounter Builder - GM Tools',
            content: '<div id="encounter-builder-component"></div>',
            width: 1000,
            height: 800
        });
        
        // Initialize encounter builder in the panel
        const encounterBuilder = this.components.get('encounterbuilder');
        const container = document.getElementById('encounter-builder-component');
        if (encounterBuilder && container) {
            encounterBuilder.init(container);
        }
    }
    
    showSessionTracker() {
        this.panels.clear();
        const panelId = this.panels.addPanel({
            id: 'session-tracker',
            title: 'Session Tracker - Campaign Management',
            content: '<div id="session-tracker-component"></div>',
            width: 1000,
            height: 800
        });
        
        // Initialize session tracker in the panel
        const sessionTracker = this.components.get('sessiontracker');
        const container = document.getElementById('session-tracker-component');
        if (sessionTracker && container) {
            sessionTracker.init(container);
        }
    }
    
    showCampaignNotes() {
        this.panels.clear();
        const panelId = this.panels.addPanel({
            id: 'campaign-notes',
            title: 'Campaign Notes - GM Organization',
            content: '<div id="campaign-notes-component"></div>',
            width: 1200,
            height: 800
        });
        
        // Initialize campaign notes in the panel
        const campaignNotes = this.components.get('campaignnotes');
        const container = document.getElementById('campaign-notes-component');
        if (campaignNotes && container) {
            campaignNotes.init(container);
        }
    }
    
    showNPCManager() {
        this.panels.clear();
        const panelId = this.panels.addPanel({
            id: 'npc-manager',
            title: 'NPC Manager - Character Database',
            content: '<div id="npc-manager-component"></div>',
            width: 1100,
            height: 800
        });
        
        // Initialize NPC manager in the panel
        const npcManager = this.components.get('npcmanager');
        const container = document.getElementById('npc-manager-component');
        if (npcManager && container) {
            npcManager.init(container);
        }
    }
    
    showWorldBuilder() {
        this.panels.clear();
        const panelId = this.panels.addPanel({
            id: 'world-builder',
            title: 'World Builder - Locations & Factions',
            content: '<div id="world-builder-component"></div>',
            width: 1400,
            height: 900
        });
        
        // Initialize world builder in the panel
        const worldBuilder = this.components.get('worldbuilder');
        const container = document.getElementById('world-builder-component');
        if (worldBuilder && container) {
            // Make worldBuilder globally accessible
            window.worldBuilder = worldBuilder;
            container.appendChild(worldBuilder.render());
        }
    }
    
    showAutomationTools() {
        this.panels.clear();
        const panelId = this.panels.addPanel({
            id: 'automation-tools',
            title: 'Automation Tools - Macros & Conditions',
            content: '<div id="automation-tools-component"></div>',
            width: 1300,
            height: 900
        });
        
        // Initialize automation tools in the panel
        const automationTools = this.components.get('automationtools');
        const container = document.getElementById('automation-tools-component');
        if (automationTools && container) {
            // Make automationTools globally accessible
            window.automationTools = automationTools;
            container.appendChild(automationTools.render());
        }
    }
    
    showDataSync() {
        this.panels.clear();
        const panelId = this.panels.addPanel({
            id: 'data-sync',
            title: 'Data Sync - Cloud Storage & Collaboration',
            content: '<div id="data-sync-component"></div>',
            width: 1400,
            height: 900
        });
        
        // Initialize data sync in the panel
        const dataSync = this.components.get('datasync');
        const container = document.getElementById('data-sync-component');
        if (dataSync && container) {
            container.appendChild(dataSync.render());
        }
    }
    
    showSkillTrees() {
        this.panels.clear();
        const panelId = this.panels.addPanel({
            id: 'skill-trees',
            title: 'Skill Trees - Character Progression',
            content: '<div id="skill-trees-component"></div>',
            width: 1600,
            height: 900
        });
        
        // Initialize skill trees in the panel
        const skillTrees = this.components.get('skilltrees');
        const container = document.getElementById('skill-trees-component');
        if (skillTrees && container) {
            container.appendChild(skillTrees.render());
        }
    }
    
    showImportExport() {
        this.panels.clear();
        const panelId = this.panels.addPanel({
            id: 'import-export',
            title: 'Import/Export Manager',
            content: '<div id="import-export-component"></div>',
            width: 1000,
            height: 700
        });
        
        // Initialize import/export manager in the panel
        const importExport = this.components.get('importexport');
        const container = document.getElementById('import-export-component');
        if (importExport && container) {
            importExport.init(container);
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