/**
 * ImportExport Component
 * 
 * Handles data import/export for campaigns, encounters, and characters
 * Features:
 * - JSON export/import for all game data
 * - Campaign backup/restore
 * - Character sheet templates
 * - Encounter library management
 * - Selective data export
 */

export class ImportExport {
    constructor(config, dataManager, stateManager) {
        this.config = config;
        this.dataManager = dataManager;
        this.stateManager = stateManager;
        this.element = null;
        
        // Export formats
        this.exportFormats = {
            json: { name: 'JSON', extension: 'json', mime: 'application/json' },
            campaign: { name: 'Campaign Bundle', extension: 'cosmos', mime: 'application/octet-stream' }
        };
        
        // Import handlers
        this.importHandlers = new Map([
            ['character', this.importCharacter.bind(this)],
            ['encounter', this.importEncounter.bind(this)],
            ['campaign', this.importCampaign.bind(this)],
            ['rules', this.importRules.bind(this)]
        ]);
    }
    
    init(container) {
        this.element = container;
        this.render();
        this.attachEventListeners();
        return this;
    }
    
    render() {
        this.element.innerHTML = `
            <div class="import-export">
                <div class="ie-header">
                    <h3>Import/Export Manager</h3>
                    <p class="ie-description">
                        Backup your campaigns, share characters, and manage game data
                    </p>
                </div>
                
                <div class="ie-content">
                    <div class="export-section">
                        <h4>Export Data</h4>
                        
                        <div class="export-options">
                            <div class="export-type">
                                <label>
                                    <input type="checkbox" name="export-type" value="characters" checked>
                                    Characters
                                </label>
                                <label>
                                    <input type="checkbox" name="export-type" value="encounters" checked>
                                    Encounters
                                </label>
                                <label>
                                    <input type="checkbox" name="export-type" value="campaign" checked>
                                    Campaign Data
                                </label>
                                <label>
                                    <input type="checkbox" name="export-type" value="settings">
                                    Settings
                                </label>
                            </div>
                            
                            <div class="export-format">
                                <label>Format:</label>
                                <select id="export-format">
                                    <option value="json">JSON (Human Readable)</option>
                                    <option value="campaign">Campaign Bundle (.cosmos)</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="export-actions">
                            <button id="export-selected" class="btn btn-primary">
                                Export Selected
                            </button>
                            <button id="export-all" class="btn btn-secondary">
                                Export Everything
                            </button>
                        </div>
                        
                        <div class="recent-exports">
                            <h5>Recent Exports</h5>
                            <div id="export-history" class="export-history">
                                ${this.renderExportHistory()}
                            </div>
                        </div>
                    </div>
                    
                    <div class="import-section">
                        <h4>Import Data</h4>
                        
                        <div class="import-dropzone" id="import-dropzone">
                            <div class="dropzone-content">
                                <span class="dropzone-icon">📁</span>
                                <p>Drop files here or click to browse</p>
                                <p class="dropzone-hint">Supports .json and .cosmos files</p>
                            </div>
                            <input type="file" id="import-file" accept=".json,.cosmos" style="display: none;">
                        </div>
                        
                        <div class="import-preview" id="import-preview" style="display: none;">
                            <h5>Import Preview</h5>
                            <div class="preview-content" id="preview-content"></div>
                            <div class="import-actions">
                                <button id="confirm-import" class="btn btn-primary">Import</button>
                                <button id="cancel-import" class="btn btn-secondary">Cancel</button>
                            </div>
                        </div>
                    </div>
                    
                    <div class="templates-section">
                        <h4>Quick Templates</h4>
                        
                        <div class="template-grid">
                            <button class="template-btn" data-template="starter-campaign">
                                <span class="template-icon">🏛️</span>
                                <span class="template-name">Starter Campaign</span>
                            </button>
                            <button class="template-btn" data-template="character-pack">
                                <span class="template-icon">👥</span>
                                <span class="template-name">Character Pack</span>
                            </button>
                            <button class="template-btn" data-template="encounter-library">
                                <span class="template-icon">⚔️</span>
                                <span class="template-name">Encounter Library</span>
                            </button>
                            <button class="template-btn" data-template="rules-reference">
                                <span class="template-icon">📖</span>
                                <span class="template-name">Rules Reference</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    renderExportHistory() {
        const history = JSON.parse(localStorage.getItem('cosmos-vtt-export-history') || '[]');
        
        if (history.length === 0) {
            return '<p class="no-history">No recent exports</p>';
        }
        
        return history.slice(0, 5).map(item => `
            <div class="history-item">
                <span class="history-name">${item.name}</span>
                <span class="history-date">${new Date(item.date).toLocaleDateString()}</span>
                <button class="btn-icon download-history" data-url="${item.url}">
                    ⬇️
                </button>
            </div>
        `).join('');
    }
    
    attachEventListeners() {
        // Export buttons
        this.element.querySelector('#export-selected').addEventListener('click', () => {
            this.exportSelected();
        });
        
        this.element.querySelector('#export-all').addEventListener('click', () => {
            this.exportAll();
        });
        
        // Import dropzone
        const dropzone = this.element.querySelector('#import-dropzone');
        const fileInput = this.element.querySelector('#import-file');
        
        dropzone.addEventListener('click', () => fileInput.click());
        dropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropzone.classList.add('dragover');
        });
        dropzone.addEventListener('dragleave', () => {
            dropzone.classList.remove('dragover');
        });
        dropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropzone.classList.remove('dragover');
            this.handleFiles(e.dataTransfer.files);
        });
        
        fileInput.addEventListener('change', (e) => {
            this.handleFiles(e.target.files);
        });
        
        // Import preview buttons
        this.element.querySelector('#confirm-import').addEventListener('click', () => {
            this.confirmImport();
        });
        
        this.element.querySelector('#cancel-import').addEventListener('click', () => {
            this.cancelImport();
        });
        
        // Template buttons
        this.element.querySelectorAll('.template-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.loadTemplate(btn.dataset.template);
            });
        });
        
        // History downloads
        this.element.addEventListener('click', (e) => {
            if (e.target.classList.contains('download-history')) {
                this.downloadFromHistory(e.target.dataset.url);
            }
        });
    }
    
    async exportSelected() {
        const selectedTypes = Array.from(
            this.element.querySelectorAll('input[name="export-type"]:checked')
        ).map(input => input.value);
        
        if (selectedTypes.length === 0) {
            this.showNotification('Please select data to export', 'warning');
            return;
        }
        
        const format = this.element.querySelector('#export-format').value;
        const data = await this.gatherExportData(selectedTypes);
        
        this.downloadExport(data, format, 'cosmos-engine-export');
    }
    
    async exportAll() {
        const allTypes = ['characters', 'encounters', 'campaign', 'settings'];
        const format = this.element.querySelector('#export-format').value;
        const data = await this.gatherExportData(allTypes);
        
        this.downloadExport(data, format, 'cosmos-engine-complete-backup');
    }
    
    async gatherExportData(types) {
        const exportData = {
            version: '1.0.0',
            exportDate: new Date().toISOString(),
            gameSystem: 'Cosmos Engine RPG',
            data: {}
        };
        
        for (const type of types) {
            switch (type) {
                case 'characters':
                    exportData.data.characters = await this.dataManager.getAllCharacters();
                    break;
                    
                case 'encounters':
                    exportData.data.encounters = JSON.parse(
                        localStorage.getItem('cosmos-vtt-encounters') || '[]'
                    );
                    break;
                    
                case 'campaign':
                    exportData.data.campaign = this.stateManager.getCategoryState('campaign');
                    break;
                    
                case 'settings':
                    exportData.data.settings = this.stateManager.getCategoryState('settings');
                    break;
            }
        }
        
        return exportData;
    }
    
    downloadExport(data, format, baseName) {
        const formatInfo = this.exportFormats[format];
        const filename = `${baseName}_${Date.now()}.${formatInfo.extension}`;
        
        let content;
        if (format === 'json') {
            content = JSON.stringify(data, null, 2);
        } else {
            // Campaign bundle format (compressed)
            content = this.createCampaignBundle(data);
        }
        
        const blob = new Blob([content], { type: formatInfo.mime });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        
        // Add to history
        this.addToExportHistory(filename, url);
        
        // Clean up URL after download
        setTimeout(() => URL.revokeObjectURL(url), 60000);
        
        this.showNotification(`Exported ${filename}`, 'success');
    }
    
    createCampaignBundle(data) {
        // Simple bundle format - could be enhanced with compression
        return JSON.stringify({
            ...data,
            bundleFormat: 'cosmos-campaign-1.0'
        });
    }
    
    addToExportHistory(name, url) {
        const history = JSON.parse(localStorage.getItem('cosmos-vtt-export-history') || '[]');
        history.unshift({
            name,
            url,
            date: Date.now()
        });
        
        // Keep only last 10 exports
        if (history.length > 10) {
            history.pop();
        }
        
        localStorage.setItem('cosmos-vtt-export-history', JSON.stringify(history));
        this.updateExportHistory();
    }
    
    updateExportHistory() {
        const historyEl = this.element.querySelector('#export-history');
        if (historyEl) {
            historyEl.innerHTML = this.renderExportHistory();
        }
    }
    
    handleFiles(files) {
        if (files.length === 0) return;
        
        const file = files[0];
        const reader = new FileReader();
        
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                this.previewImport(data, file.name);
            } catch (error) {
                this.showNotification('Invalid file format', 'error');
            }
        };
        
        reader.readAsText(file);
    }
    
    previewImport(data, filename) {
        this.pendingImport = data;
        
        const preview = this.element.querySelector('#import-preview');
        const content = this.element.querySelector('#preview-content');
        
        // Generate preview content
        let previewHtml = `
            <div class="import-info">
                <p><strong>File:</strong> ${filename}</p>
                <p><strong>System:</strong> ${data.gameSystem || 'Unknown'}</p>
                <p><strong>Exported:</strong> ${new Date(data.exportDate).toLocaleDateString()}</p>
            </div>
            <div class="import-contents">
                <h6>Contents:</h6>
                <ul>
        `;
        
        if (data.data) {
            for (const [key, value] of Object.entries(data.data)) {
                const count = Array.isArray(value) ? value.length : Object.keys(value).length;
                previewHtml += `<li>${this.formatDataType(key)}: ${count} items</li>`;
            }
        }
        
        previewHtml += '</ul></div>';
        
        content.innerHTML = previewHtml;
        preview.style.display = 'block';
    }
    
    formatDataType(type) {
        const formats = {
            characters: 'Characters',
            encounters: 'Encounters',
            campaign: 'Campaign Data',
            settings: 'Settings'
        };
        return formats[type] || type;
    }
    
    async confirmImport() {
        if (!this.pendingImport) return;
        
        try {
            // Import each data type
            for (const [type, data] of Object.entries(this.pendingImport.data || {})) {
                if (this.importHandlers.has(type)) {
                    await this.importHandlers.get(type)(data);
                }
            }
            
            this.showNotification('Import successful!', 'success');
            this.cancelImport();
            
            // Refresh current view
            window.location.reload();
        } catch (error) {
            console.error('Import error:', error);
            this.showNotification('Import failed: ' + error.message, 'error');
        }
    }
    
    cancelImport() {
        this.pendingImport = null;
        const preview = this.element.querySelector('#import-preview');
        preview.style.display = 'none';
    }
    
    async importCharacter(characters) {
        for (const character of characters) {
            await this.dataManager.saveCharacter(character);
        }
    }
    
    async importEncounter(encounters) {
        const existing = JSON.parse(localStorage.getItem('cosmos-vtt-encounters') || '[]');
        const combined = [...existing, ...encounters];
        localStorage.setItem('cosmos-vtt-encounters', JSON.stringify(combined));
    }
    
    async importCampaign(campaignData) {
        for (const [key, value] of Object.entries(campaignData)) {
            this.stateManager.setState(`campaign.${key}`, value);
        }
    }
    
    async importRules(rulesData) {
        // Import custom rules or modifications
        await this.dataManager.importRules(rulesData);
    }
    
    loadTemplate(templateName) {
        // Load predefined templates
        const templates = {
            'starter-campaign': {
                name: 'New Campaign',
                description: 'A fresh start for your adventures',
                npcs: [],
                locations: [],
                notes: ''
            },
            'character-pack': [
                { name: 'Captain Sarah Chen', level: 5, class: 'Soldier' },
                { name: 'Dr. Marcus Webb', level: 5, class: 'Scientist' },
                { name: 'Zara-7', level: 5, class: 'Synthetic' }
            ],
            'encounter-library': [
                { name: 'Pirate Ambush', difficulty: 'standard', level: 5 },
                { name: 'Derelict Ship', difficulty: 'challenging', level: 6 },
                { name: 'Station Defense', difficulty: 'deadly', level: 7 }
            ],
            'rules-reference': {
                quickRules: true,
                customRules: []
            }
        };
        
        const template = templates[templateName];
        if (template) {
            this.showNotification(`Loading ${templateName} template...`, 'info');
            // Process template based on type
            console.log('Template loaded:', template);
        }
    }
    
    downloadFromHistory(url) {
        const link = document.createElement('a');
        link.href = url;
        link.click();
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