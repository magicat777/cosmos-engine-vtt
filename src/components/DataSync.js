/**
 * DataSync Component
 * Cloud saves and real-time collaboration for Cosmos Engine VTT
 * Supports offline-first architecture with sync when online
 */

export class DataSync {
    constructor(config, dataManager, eventBus) {
        this.config = config;
        this.dataManager = dataManager;
        this.eventBus = eventBus;
        
        // Sync state
        this.isOnline = navigator.onLine;
        this.syncEnabled = false;
        this.lastSyncTime = null;
        this.pendingChanges = [];
        this.collaborationEnabled = false;
        this.sessionId = null;
        this.userId = null;
        
        // Cloud storage configuration
        this.cloudProvider = 'github'; // github, dropbox, google-drive
        this.cloudConfig = {
            github: {
                username: '',
                repository: '',
                token: '',
                branch: 'main'
            }
        };
        
        // Real-time collaboration
        this.collaborators = new Map();
        this.websocket = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        
        // Component DOM references
        this.container = null;
        
        this.init();
    }
    
    async init() {
        this.setupEventListeners();
        await this.loadSyncSettings();
        this.startPeriodicSync();
    }
    
    setupEventListeners() {
        // Network status
        window.addEventListener('online', () => this.handleOnlineStatus(true));
        window.addEventListener('offline', () => this.handleOnlineStatus(false));
        
        // Data change events
        this.eventBus.on('data:changed', (data) => this.queueChange(data));
        this.eventBus.on('sync:force', () => this.forcSync());
        this.eventBus.on('collaboration:enable', () => this.enableCollaboration());
        this.eventBus.on('collaboration:disable', () => this.disableCollaboration());
        
        // Page visibility for sync optimization
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.isOnline) {
                this.syncIfNeeded();
            }
        });
        
        // Cleanup on page unload
        window.addEventListener('beforeunload', () => {
            this.cleanup();
        });
    }
    
    render() {
        const container = document.createElement('div');
        container.className = 'datasync-container';
        container.innerHTML = `
            <div class="datasync-header">
                <h2>Data Sync & Collaboration</h2>
                <div class="sync-status">
                    <span id="sync-indicator" class="sync-indicator offline">Offline</span>
                    <span id="last-sync" class="last-sync">Never synced</span>
                </div>
            </div>
            
            <div class="datasync-content">
                <!-- Cloud Storage Panel -->
                <div class="cloud-panel">
                    <div class="panel-header">
                        <h3>Cloud Storage</h3>
                        <div class="cloud-controls">
                            <button id="sync-now-btn" class="btn-primary" disabled>Sync Now</button>
                            <button id="export-backup-btn" class="btn-secondary">Export Backup</button>
                        </div>
                    </div>
                    <div class="cloud-content">
                        <div class="provider-selection">
                            <label>Storage Provider:</label>
                            <select id="cloud-provider">
                                <option value="">Local Only</option>
                                <option value="github">GitHub Repository</option>
                                <option value="dropbox">Dropbox (Coming Soon)</option>
                                <option value="google-drive">Google Drive (Coming Soon)</option>
                            </select>
                        </div>
                        
                        <div id="github-config" class="provider-config hidden">
                            <div class="form-group">
                                <label for="github-username">GitHub Username:</label>
                                <input type="text" id="github-username" placeholder="your-username">
                            </div>
                            <div class="form-group">
                                <label for="github-repo">Repository Name:</label>
                                <input type="text" id="github-repo" placeholder="cosmos-vtt-data">
                            </div>
                            <div class="form-group">
                                <label for="github-token">Personal Access Token:</label>
                                <input type="password" id="github-token" placeholder="ghp_...">
                                <small>Needs repo scope. <a href="https://github.com/settings/tokens" target="_blank">Create token</a></small>
                            </div>
                            <div class="form-group">
                                <label for="github-branch">Branch:</label>
                                <input type="text" id="github-branch" value="main">
                            </div>
                            <button id="test-connection-btn" class="btn-secondary">Test Connection</button>
                        </div>
                        
                        <div class="sync-settings">
                            <label class="setting-item">
                                <input type="checkbox" id="auto-sync">
                                <span>Auto-sync every 5 minutes</span>
                            </label>
                            <label class="setting-item">
                                <input type="checkbox" id="sync-on-change">
                                <span>Sync on data changes</span>
                            </label>
                            <label class="setting-item">
                                <input type="checkbox" id="compress-data">
                                <span>Compress data for faster transfer</span>
                            </label>
                        </div>
                    </div>
                </div>
                
                <!-- Collaboration Panel -->
                <div class="collaboration-panel">
                    <div class="panel-header">
                        <h3>Real-time Collaboration</h3>
                        <div class="collaboration-controls">
                            <button id="start-session-btn" class="btn-primary">Start Session</button>
                            <button id="join-session-btn" class="btn-secondary">Join Session</button>
                        </div>
                    </div>
                    <div class="collaboration-content">
                        <div class="session-info">
                            <div class="form-group">
                                <label for="session-id">Session ID:</label>
                                <div class="session-id-group">
                                    <input type="text" id="session-id" placeholder="Enter session ID to join">
                                    <button id="generate-session-btn" class="btn-small">Generate</button>
                                </div>
                            </div>
                            <div class="form-group">
                                <label for="user-name">Your Name:</label>
                                <input type="text" id="user-name" placeholder="Enter your name">
                            </div>
                        </div>
                        
                        <div id="collaborators-list" class="collaborators-list">
                            <h4>Active Collaborators</h4>
                            <div id="collaborators" class="collaborators">
                                <p class="empty-state">No active collaboration session</p>
                            </div>
                        </div>
                        
                        <div class="collaboration-settings">
                            <label class="setting-item">
                                <input type="checkbox" id="share-dice-rolls">
                                <span>Share dice rolls with group</span>
                            </label>
                            <label class="setting-item">
                                <input type="checkbox" id="share-character-updates">
                                <span>Share character sheet updates</span>
                            </label>
                            <label class="setting-item">
                                <input type="checkbox" id="gm-override">
                                <span>GM can override all data</span>
                            </label>
                        </div>
                    </div>
                </div>
                
                <!-- Sync History Panel -->
                <div class="sync-history-panel">
                    <div class="panel-header">
                        <h3>Sync History</h3>
                        <button id="clear-history-btn" class="btn-small">Clear</button>
                    </div>
                    <div class="sync-history-content">
                        <div id="sync-log" class="sync-log">
                            <p class="empty-state">No sync history yet</p>
                        </div>
                    </div>
                </div>
                
                <!-- Conflict Resolution Panel -->
                <div class="conflict-panel hidden" id="conflict-panel">
                    <div class="panel-header">
                        <h3>Sync Conflicts</h3>
                        <span class="conflict-count">0 conflicts</span>
                    </div>
                    <div class="conflict-content">
                        <div id="conflicts-list" class="conflicts-list"></div>
                        <div class="conflict-actions">
                            <button id="resolve-local-btn" class="btn-secondary">Keep Local</button>
                            <button id="resolve-remote-btn" class="btn-secondary">Keep Remote</button>
                            <button id="resolve-merge-btn" class="btn-primary">Smart Merge</button>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Connection Test Modal -->
            <div id="connection-modal" class="modal hidden">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Connection Test</h3>
                        <button class="modal-close">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div id="connection-status" class="connection-status">
                            <div class="status-item">
                                <span class="status-label">Authentication:</span>
                                <span id="auth-status" class="status-value">Testing...</span>
                            </div>
                            <div class="status-item">
                                <span class="status-label">Repository Access:</span>
                                <span id="repo-status" class="status-value">Testing...</span>
                            </div>
                            <div class="status-item">
                                <span class="status-label">Write Permissions:</span>
                                <span id="write-status" class="status-value">Testing...</span>
                            </div>
                        </div>
                        <div id="test-results" class="test-results"></div>
                    </div>
                    <div class="modal-footer">
                        <button id="close-test-btn" class="btn-primary">Close</button>
                    </div>
                </div>
            </div>
        `;
        
        this.container = container;
        this.setupDOMReferences();
        this.attachEventHandlers();
        this.updateSyncStatus();
        this.loadCloudSettings();
        
        return container;
    }
    
    setupDOMReferences() {
        this.syncIndicator = this.container.querySelector('#sync-indicator');
        this.lastSyncElement = this.container.querySelector('#last-sync');
        this.syncLog = this.container.querySelector('#sync-log');
        this.collaboratorsList = this.container.querySelector('#collaborators');
    }
    
    attachEventHandlers() {
        // Cloud storage
        this.container.querySelector('#cloud-provider').addEventListener('change', (e) => {
            this.showProviderConfig(e.target.value);
            this.saveCloudSettings();
        });
        
        this.container.querySelector('#sync-now-btn').addEventListener('click', () => this.forcSync());
        this.container.querySelector('#export-backup-btn').addEventListener('click', () => this.exportBackup());
        this.container.querySelector('#test-connection-btn').addEventListener('click', () => this.testConnection());
        
        // Collaboration
        this.container.querySelector('#start-session-btn').addEventListener('click', () => this.startCollaborationSession());
        this.container.querySelector('#join-session-btn').addEventListener('click', () => this.joinCollaborationSession());
        this.container.querySelector('#generate-session-btn').addEventListener('click', () => this.generateSessionId());
        
        // Settings
        this.container.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', () => this.saveSyncSettings());
        });
        
        // Cloud config inputs
        ['github-username', 'github-repo', 'github-token', 'github-branch'].forEach(id => {
            this.container.querySelector(`#${id}`)?.addEventListener('change', () => this.saveCloudSettings());
        });
        
        // History
        this.container.querySelector('#clear-history-btn').addEventListener('click', () => this.clearSyncHistory());
        
        // Modal handlers
        this.setupModalHandlers();
    }
    
    setupModalHandlers() {
        const connectionModal = this.container.querySelector('#connection-modal');
        this.container.querySelector('#close-test-btn').addEventListener('click', () => this.hideModal(connectionModal));
        connectionModal.querySelector('.modal-close').addEventListener('click', () => this.hideModal(connectionModal));
        connectionModal.addEventListener('click', (e) => {
            if (e.target === connectionModal) this.hideModal(connectionModal);
        });
    }
    
    showProviderConfig(provider) {
        // Hide all provider configs
        this.container.querySelectorAll('.provider-config').forEach(config => {
            config.classList.add('hidden');
        });
        
        // Show selected provider config
        if (provider) {
            const config = this.container.querySelector(`#${provider}-config`);
            if (config) config.classList.remove('hidden');
            
            this.container.querySelector('#sync-now-btn').disabled = false;
        } else {
            this.container.querySelector('#sync-now-btn').disabled = true;
        }
    }
    
    handleOnlineStatus(isOnline) {
        this.isOnline = isOnline;
        this.updateSyncStatus();
        
        if (isOnline && this.syncEnabled) {
            this.syncIfNeeded();
        }
        
        this.eventBus.emit('network:status', { online: isOnline });
    }
    
    updateSyncStatus() {
        const indicator = this.syncIndicator;
        const lastSync = this.lastSyncElement;
        
        if (!this.isOnline) {
            indicator.className = 'sync-indicator offline';
            indicator.textContent = 'Offline';
        } else if (this.syncEnabled) {
            indicator.className = 'sync-indicator online';
            indicator.textContent = 'Online';
        } else {
            indicator.className = 'sync-indicator disabled';
            indicator.textContent = 'Sync Disabled';
        }
        
        if (this.lastSyncTime) {
            const timeAgo = this.formatTimeAgo(this.lastSyncTime);
            lastSync.textContent = `Last sync: ${timeAgo}`;
        } else {
            lastSync.textContent = 'Never synced';
        }
    }
    
    formatTimeAgo(timestamp) {
        const now = Date.now();
        const diff = now - timestamp;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        
        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        return `${days}d ago`;
    }
    
    queueChange(data) {
        if (!this.syncEnabled) return;
        
        this.pendingChanges.push({
            id: Date.now().toString(),
            timestamp: Date.now(),
            type: data.type,
            path: data.path,
            data: data.data,
            userId: this.userId
        });
        
        // Auto-sync if enabled
        const autoSyncEnabled = this.container?.querySelector('#sync-on-change')?.checked;
        if (autoSyncEnabled && this.isOnline) {
            this.debounceSync();
        }
        
        // Broadcast to collaborators
        if (this.collaborationEnabled) {
            this.broadcastChange(data);
        }
    }
    
    debounceSync = this.debounce(() => {
        this.performSync();
    }, 2000);
    
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    async forcSync() {
        if (!this.isOnline) {
            this.addSyncLogEntry('error', 'Cannot sync while offline');
            return;
        }
        
        this.addSyncLogEntry('info', 'Manual sync started...');
        await this.performSync();
    }
    
    async performSync() {
        if (!this.syncEnabled || !this.isOnline) return;
        
        try {
            const provider = this.container.querySelector('#cloud-provider').value;
            if (!provider) return;
            
            // Export current data
            const exportData = await this.dataManager.exportData();
            
            // Upload to cloud provider
            await this.uploadToCloud(provider, exportData);
            
            // Mark sync as successful
            this.lastSyncTime = Date.now();
            this.pendingChanges = [];
            this.updateSyncStatus();
            
            this.addSyncLogEntry('success', `Synced to ${provider} successfully`);
            this.eventBus.emit('sync:completed', { provider, timestamp: this.lastSyncTime });
            
        } catch (error) {
            console.error('Sync failed:', error);
            this.addSyncLogEntry('error', `Sync failed: ${error.message}`);
            this.eventBus.emit('sync:failed', { error: error.message });
        }
    }
    
    async uploadToCloud(provider, data) {
        switch (provider) {
            case 'github':
                return this.uploadToGitHub(data);
            default:
                throw new Error(`Unsupported provider: ${provider}`);
        }
    }
    
    async uploadToGitHub(data) {
        const config = this.cloudConfig.github;
        if (!config.username || !config.repository || !config.token) {
            throw new Error('GitHub configuration incomplete');
        }
        
        const filename = `cosmos-vtt-backup-${Date.now()}.json`;
        const content = btoa(data); // Base64 encode
        
        const url = `https://api.github.com/repos/${config.username}/${config.repository}/contents/backups/${filename}`;
        
        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${config.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: `VTT backup - ${new Date().toISOString()}`,
                content: content,
                branch: config.branch
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'GitHub upload failed');
        }
        
        return response.json();
    }
    
    async testConnection() {
        const modal = this.container.querySelector('#connection-modal');
        modal.classList.remove('hidden');
        
        const authStatus = this.container.querySelector('#auth-status');
        const repoStatus = this.container.querySelector('#repo-status');
        const writeStatus = this.container.querySelector('#write-status');
        
        authStatus.textContent = 'Testing...';
        repoStatus.textContent = 'Testing...';
        writeStatus.textContent = 'Testing...';
        
        try {
            const config = this.cloudConfig.github;
            
            // Test authentication
            const authResponse = await fetch('https://api.github.com/user', {
                headers: { 'Authorization': `token ${config.token}` }
            });
            
            if (authResponse.ok) {
                authStatus.textContent = '✅ Success';
                authStatus.className = 'status-value success';
            } else {
                authStatus.textContent = '❌ Failed';
                authStatus.className = 'status-value error';
                return;
            }
            
            // Test repository access
            const repoResponse = await fetch(`https://api.github.com/repos/${config.username}/${config.repository}`, {
                headers: { 'Authorization': `token ${config.token}` }
            });
            
            if (repoResponse.ok) {
                repoStatus.textContent = '✅ Success';
                repoStatus.className = 'status-value success';
            } else {
                repoStatus.textContent = '❌ Failed';
                repoStatus.className = 'status-value error';
                return;
            }
            
            // Test write permissions (create a test file)
            const testContent = btoa('VTT connection test');
            const writeResponse = await fetch(`https://api.github.com/repos/${config.username}/${config.repository}/contents/test-${Date.now()}.txt`, {
                method: 'PUT',
                headers: {
                    'Authorization': `token ${config.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: 'VTT connection test',
                    content: testContent,
                    branch: config.branch
                })
            });
            
            if (writeResponse.ok) {
                writeStatus.textContent = '✅ Success';
                writeStatus.className = 'status-value success';
                
                // Clean up test file
                const testFile = await writeResponse.json();
                await fetch(`https://api.github.com/repos/${config.username}/${config.repository}/contents/test-${Date.now()}.txt`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `token ${config.token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        message: 'Remove VTT connection test',
                        sha: testFile.content.sha,
                        branch: config.branch
                    })
                });
            } else {
                writeStatus.textContent = '❌ Failed';
                writeStatus.className = 'status-value error';
            }
            
        } catch (error) {
            authStatus.textContent = '❌ Error';
            authStatus.className = 'status-value error';
            console.error('Connection test failed:', error);
        }
    }
    
    generateSessionId() {
        const sessionId = Math.random().toString(36).substring(2, 15);
        this.container.querySelector('#session-id').value = sessionId;
    }
    
    async startCollaborationSession() {
        const sessionId = this.container.querySelector('#session-id').value;
        const userName = this.container.querySelector('#user-name').value;
        
        if (!sessionId || !userName) {
            alert('Please enter a session ID and your name');
            return;
        }
        
        try {
            // Initialize collaboration
            this.sessionId = sessionId;
            this.userId = userName;
            this.collaborationEnabled = true;
            
            // Connect to collaboration server (mock implementation)
            await this.connectToCollaborationServer();
            
            this.addSyncLogEntry('info', `Started collaboration session: ${sessionId}`);
            this.updateCollaboratorsList();
            
        } catch (error) {
            console.error('Failed to start collaboration:', error);
            alert('Failed to start collaboration session');
        }
    }
    
    async joinCollaborationSession() {
        const sessionId = this.container.querySelector('#session-id').value;
        const userName = this.container.querySelector('#user-name').value;
        
        if (!sessionId || !userName) {
            alert('Please enter a session ID and your name');
            return;
        }
        
        try {
            this.sessionId = sessionId;
            this.userId = userName;
            this.collaborationEnabled = true;
            
            await this.connectToCollaborationServer();
            
            this.addSyncLogEntry('info', `Joined collaboration session: ${sessionId}`);
            this.updateCollaboratorsList();
            
        } catch (error) {
            console.error('Failed to join collaboration:', error);
            alert('Failed to join collaboration session');
        }
    }
    
    async connectToCollaborationServer() {
        // Mock implementation - in a real app, this would connect to WebSocket server
        this.addCollaborator(this.userId, 'online');
        
        // Simulate other collaborators (for demo)
        setTimeout(() => {
            if (this.collaborationEnabled) {
                this.addCollaborator('GM', 'online');
                this.addCollaborator('Player1', 'idle');
            }
        }, 1000);
    }
    
    addCollaborator(name, status) {
        this.collaborators.set(name, {
            name,
            status,
            joinedAt: Date.now()
        });
        this.updateCollaboratorsList();
    }
    
    updateCollaboratorsList() {
        if (this.collaborators.size === 0) {
            this.collaboratorsList.innerHTML = '<p class="empty-state">No active collaboration session</p>';
            return;
        }
        
        this.collaboratorsList.innerHTML = '';
        this.collaborators.forEach((collaborator, name) => {
            const div = document.createElement('div');
            div.className = 'collaborator-item';
            div.innerHTML = `
                <span class="collaborator-name">${collaborator.name}</span>
                <span class="collaborator-status ${collaborator.status}">${collaborator.status}</span>
            `;
            this.collaboratorsList.appendChild(div);
        });
    }
    
    broadcastChange(data) {
        // Mock implementation - in a real app, this would broadcast via WebSocket
        console.log('Broadcasting change to collaborators:', data);
    }
    
    addSyncLogEntry(type, message) {
        const entry = document.createElement('div');
        entry.className = `sync-entry ${type}`;
        entry.innerHTML = `
            <span class="sync-time">${new Date().toLocaleTimeString()}</span>
            <span class="sync-message">${message}</span>
        `;
        
        this.syncLog.insertBefore(entry, this.syncLog.firstChild);
        
        // Keep only last 50 entries
        while (this.syncLog.children.length > 50) {
            this.syncLog.removeChild(this.syncLog.lastChild);
        }
        
        // Remove empty state if present
        const emptyState = this.syncLog.querySelector('.empty-state');
        if (emptyState) emptyState.remove();
    }
    
    clearSyncHistory() {
        this.syncLog.innerHTML = '<p class="empty-state">No sync history yet</p>';
    }
    
    async exportBackup() {
        const data = await this.dataManager.exportData();
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cosmos-vtt-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        this.addSyncLogEntry('info', 'Local backup exported successfully');
    }
    
    syncIfNeeded() {
        if (this.pendingChanges.length > 0) {
            this.performSync();
        }
    }
    
    startPeriodicSync() {
        setInterval(() => {
            const autoSyncEnabled = this.container?.querySelector('#auto-sync')?.checked;
            if (autoSyncEnabled && this.isOnline && this.syncEnabled) {
                this.syncIfNeeded();
            }
        }, 5 * 60 * 1000); // 5 minutes
    }
    
    async loadSyncSettings() {
        const settings = localStorage.getItem('cosmos-sync-settings');
        if (settings) {
            const parsed = JSON.parse(settings);
            this.syncEnabled = parsed.syncEnabled || false;
            this.lastSyncTime = parsed.lastSyncTime || null;
        }
    }
    
    saveSyncSettings() {
        const settings = {
            syncEnabled: this.container?.querySelector('#auto-sync')?.checked || false,
            syncOnChange: this.container?.querySelector('#sync-on-change')?.checked || false,
            compressData: this.container?.querySelector('#compress-data')?.checked || false,
            lastSyncTime: this.lastSyncTime
        };
        
        this.syncEnabled = settings.syncEnabled;
        localStorage.setItem('cosmos-sync-settings', JSON.stringify(settings));
        this.updateSyncStatus();
    }
    
    loadCloudSettings() {
        const settings = localStorage.getItem('cosmos-cloud-settings');
        if (settings) {
            const parsed = JSON.parse(settings);
            this.cloudConfig = { ...this.cloudConfig, ...parsed };
            
            // Restore UI state
            if (parsed.provider) {
                this.container.querySelector('#cloud-provider').value = parsed.provider;
                this.showProviderConfig(parsed.provider);
                
                if (parsed.provider === 'github' && parsed.github) {
                    this.container.querySelector('#github-username').value = parsed.github.username || '';
                    this.container.querySelector('#github-repo').value = parsed.github.repository || '';
                    this.container.querySelector('#github-token').value = parsed.github.token || '';
                    this.container.querySelector('#github-branch').value = parsed.github.branch || 'main';
                }
            }
        }
    }
    
    saveCloudSettings() {
        const provider = this.container.querySelector('#cloud-provider').value;
        const settings = { provider };
        
        if (provider === 'github') {
            settings.github = {
                username: this.container.querySelector('#github-username').value,
                repository: this.container.querySelector('#github-repo').value,
                token: this.container.querySelector('#github-token').value,
                branch: this.container.querySelector('#github-branch').value
            };
            this.cloudConfig.github = settings.github;
        }
        
        localStorage.setItem('cosmos-cloud-settings', JSON.stringify(settings));
    }
    
    hideModal(modal) {
        modal.classList.add('hidden');
    }
    
    cleanup() {
        if (this.websocket) {
            this.websocket.close();
        }
        
        // Save final sync if needed
        if (this.pendingChanges.length > 0 && this.isOnline) {
            navigator.sendBeacon('/api/sync', JSON.stringify(this.pendingChanges));
        }
    }
}