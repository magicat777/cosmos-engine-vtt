/**
 * SessionTracker Component
 * 
 * Track campaign sessions with detailed logs and summaries
 * Features:
 * - Session creation and management
 * - Real-time session notes
 * - XP and loot tracking
 * - Session summaries and recaps
 * - Timeline view of campaign events
 * - Export session logs
 */

export class SessionTracker {
    constructor(config, dataManager, stateManager) {
        this.config = config;
        this.dataManager = dataManager;
        this.stateManager = stateManager;
        this.element = null;
        
        // Session state
        this.sessions = [];
        this.currentSession = null;
        this.activeTimer = null;
        this.elapsedTime = 0;
        
        // Load sessions from storage
        this.loadSessions();
        
        // Bind methods
        this.startSession = this.startSession.bind(this);
        this.endSession = this.endSession.bind(this);
        this.saveSession = this.saveSession.bind(this);
        this.updateTimer = this.updateTimer.bind(this);
    }
    
    init(container) {
        this.element = container;
        this.render();
        this.attachEventListeners();
        this.setupStateSubscriptions();
        return this;
    }
    
    setupStateSubscriptions() {
        // Listen for XP awards
        this.stateManager.subscribe('combat.xpAwarded', (xp) => {
            if (this.currentSession) {
                this.currentSession.xpEarned += xp;
                this.updateSessionDisplay();
            }
        });
        
        // Listen for loot gained
        this.stateManager.subscribe('campaign.lootGained', (loot) => {
            if (this.currentSession) {
                this.currentSession.loot.push(loot);
                this.updateSessionDisplay();
            }
        });
    }
    
    render() {
        this.element.innerHTML = `
            <div class="session-tracker">
                <div class="tracker-header">
                    <h3>Session Tracker</h3>
                    <div class="session-controls">
                        ${this.currentSession ? 
                            `<button id="end-session" class="btn btn-danger">End Session</button>` :
                            `<button id="start-session" class="btn btn-primary">Start New Session</button>`
                        }
                    </div>
                </div>
                
                <div class="tracker-content">
                    ${this.currentSession ? this.renderActiveSession() : this.renderSessionList()}
                </div>
            </div>
        `;
    }
    
    renderActiveSession() {
        return `
            <div class="active-session">
                <div class="session-info">
                    <h4>${this.currentSession.title}</h4>
                    <div class="session-timer">
                        <span class="timer-icon">⏱️</span>
                        <span id="timer-display">${this.formatTime(this.elapsedTime)}</span>
                    </div>
                </div>
                
                <div class="session-details">
                    <div class="detail-grid">
                        <div class="detail-item">
                            <label>Session #</label>
                            <span>${this.currentSession.number}</span>
                        </div>
                        <div class="detail-item">
                            <label>Date</label>
                            <span>${new Date(this.currentSession.date).toLocaleDateString()}</span>
                        </div>
                        <div class="detail-item">
                            <label>Players</label>
                            <span>${this.currentSession.players.length}</span>
                        </div>
                        <div class="detail-item">
                            <label>XP Earned</label>
                            <span class="xp-display">${this.currentSession.xpEarned}</span>
                        </div>
                    </div>
                </div>
                
                <div class="session-notes">
                    <h5>Session Notes</h5>
                    <textarea id="session-notes" class="notes-area" 
                              placeholder="Record important events, decisions, and outcomes...">${this.currentSession.notes}</textarea>
                </div>
                
                <div class="session-events">
                    <h5>Key Events</h5>
                    <div class="events-toolbar">
                        <button id="add-event" class="btn btn-sm">Add Event</button>
                        <select id="event-type" class="event-type-select">
                            <option value="combat">Combat</option>
                            <option value="discovery">Discovery</option>
                            <option value="npc">NPC Interaction</option>
                            <option value="location">Location Visited</option>
                            <option value="plot">Plot Development</option>
                            <option value="other">Other</option>
                        </select>
                    </div>
                    <div class="events-list">
                        ${this.renderEventsList(this.currentSession.events)}
                    </div>
                </div>
                
                <div class="session-loot">
                    <h5>Loot & Rewards</h5>
                    <div class="loot-toolbar">
                        <button id="add-loot" class="btn btn-sm">Add Loot</button>
                    </div>
                    <div class="loot-list">
                        ${this.renderLootList(this.currentSession.loot)}
                    </div>
                </div>
                
                <div class="session-actions">
                    <button id="save-session" class="btn btn-primary">Save Progress</button>
                    <button id="export-session" class="btn btn-secondary">Export Session</button>
                </div>
            </div>
        `;
    }
    
    renderSessionList() {
        return `
            <div class="sessions-overview">
                <div class="campaign-stats">
                    <h4>Campaign Overview</h4>
                    <div class="stats-grid">
                        <div class="stat-card">
                            <div class="stat-value">${this.sessions.length}</div>
                            <div class="stat-label">Total Sessions</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value">${this.getTotalPlayTime()}</div>
                            <div class="stat-label">Total Play Time</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value">${this.getTotalXP()}</div>
                            <div class="stat-label">Total XP Awarded</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value">${this.getAverageSessionLength()}</div>
                            <div class="stat-label">Avg Session Length</div>
                        </div>
                    </div>
                </div>
                
                <div class="sessions-controls">
                    <div class="search-bar">
                        <input type="text" id="session-search" placeholder="Search sessions..." 
                               class="search-input">
                    </div>
                    <div class="filter-controls">
                        <select id="session-filter" class="filter-select">
                            <option value="all">All Sessions</option>
                            <option value="recent">Last 5 Sessions</option>
                            <option value="combat">Combat Heavy</option>
                            <option value="exploration">Exploration</option>
                            <option value="social">Social/RP</option>
                        </select>
                    </div>
                </div>
                
                <div class="sessions-timeline">
                    <h4>Session History</h4>
                    <div class="timeline">
                        ${this.renderTimeline()}
                    </div>
                </div>
                
                <div class="sessions-list">
                    ${this.renderSessionCards()}
                </div>
            </div>
        `;
    }
    
    renderEventsList(events) {
        if (events.length === 0) {
            return '<p class="no-events">No events recorded yet</p>';
        }
        
        return events.map((event, index) => `
            <div class="event-item ${event.type}">
                <div class="event-time">${new Date(event.timestamp).toLocaleTimeString()}</div>
                <div class="event-content">
                    <span class="event-icon">${this.getEventIcon(event.type)}</span>
                    <span class="event-description">${event.description}</span>
                </div>
                <button class="btn-icon remove-event" data-index="${index}">×</button>
            </div>
        `).join('');
    }
    
    renderLootList(loot) {
        if (loot.length === 0) {
            return '<p class="no-loot">No loot recorded yet</p>';
        }
        
        const totalValue = loot.reduce((sum, item) => sum + (item.value || 0), 0);
        
        return `
            ${loot.map((item, index) => `
                <div class="loot-item">
                    <span class="loot-name">${item.name}</span>
                    <span class="loot-value">${item.value || 0} cr</span>
                    <button class="btn-icon remove-loot" data-index="${index}">×</button>
                </div>
            `).join('')}
            <div class="loot-total">
                <strong>Total Value:</strong> ${totalValue} cr
            </div>
        `;
    }
    
    renderTimeline() {
        if (this.sessions.length === 0) {
            return '<p class="no-timeline">No sessions recorded yet</p>';
        }
        
        return this.sessions.slice(-10).reverse().map(session => `
            <div class="timeline-item" data-session-id="${session.id}">
                <div class="timeline-marker"></div>
                <div class="timeline-content">
                    <div class="timeline-date">${new Date(session.date).toLocaleDateString()}</div>
                    <div class="timeline-title">${session.title}</div>
                    <div class="timeline-summary">${session.summary || 'No summary available'}</div>
                </div>
            </div>
        `).join('');
    }
    
    renderSessionCards() {
        const filteredSessions = this.getFilteredSessions();
        
        if (filteredSessions.length === 0) {
            return '<p class="no-sessions">No sessions match your filter</p>';
        }
        
        return filteredSessions.map(session => `
            <div class="session-card" data-session-id="${session.id}">
                <div class="session-header">
                    <h5>Session ${session.number}: ${session.title}</h5>
                    <span class="session-date">${new Date(session.date).toLocaleDateString()}</span>
                </div>
                <div class="session-summary">
                    ${session.summary || 'No summary available'}
                </div>
                <div class="session-stats">
                    <span>Duration: ${this.formatTime(session.duration)}</span>
                    <span>XP: ${session.xpEarned}</span>
                    <span>Events: ${session.events.length}</span>
                </div>
                <div class="session-actions">
                    <button class="btn btn-sm view-session" data-session-id="${session.id}">
                        View Details
                    </button>
                    <button class="btn btn-sm edit-session" data-session-id="${session.id}">
                        Edit
                    </button>
                    <button class="btn btn-sm export-session" data-session-id="${session.id}">
                        Export
                    </button>
                </div>
            </div>
        `).join('');
    }
    
    attachEventListeners() {
        // Session controls
        const startBtn = this.element.querySelector('#start-session');
        const endBtn = this.element.querySelector('#end-session');
        
        if (startBtn) {
            startBtn.addEventListener('click', this.startSession);
        }
        
        if (endBtn) {
            endBtn.addEventListener('click', this.endSession);
        }
        
        // Active session listeners
        if (this.currentSession) {
            // Notes auto-save
            const notesArea = this.element.querySelector('#session-notes');
            if (notesArea) {
                notesArea.addEventListener('input', (e) => {
                    this.currentSession.notes = e.target.value;
                });
            }
            
            // Add event
            const addEventBtn = this.element.querySelector('#add-event');
            if (addEventBtn) {
                addEventBtn.addEventListener('click', () => {
                    this.addEvent();
                });
            }
            
            // Add loot
            const addLootBtn = this.element.querySelector('#add-loot');
            if (addLootBtn) {
                addLootBtn.addEventListener('click', () => {
                    this.addLoot();
                });
            }
            
            // Save session
            const saveBtn = this.element.querySelector('#save-session');
            if (saveBtn) {
                saveBtn.addEventListener('click', this.saveSession);
            }
            
            // Export session
            const exportBtn = this.element.querySelector('#export-session');
            if (exportBtn) {
                exportBtn.addEventListener('click', () => {
                    this.exportSession(this.currentSession);
                });
            }
        }
        
        // Session list listeners
        const searchInput = this.element.querySelector('#session-search');
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                this.filterSessions();
            });
        }
        
        const filterSelect = this.element.querySelector('#session-filter');
        if (filterSelect) {
            filterSelect.addEventListener('change', () => {
                this.filterSessions();
            });
        }
        
        // Delegated events
        this.element.addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-event')) {
                const index = parseInt(e.target.dataset.index);
                this.removeEvent(index);
            } else if (e.target.classList.contains('remove-loot')) {
                const index = parseInt(e.target.dataset.index);
                this.removeLoot(index);
            } else if (e.target.classList.contains('view-session')) {
                const sessionId = e.target.dataset.sessionId;
                this.viewSession(sessionId);
            } else if (e.target.classList.contains('edit-session')) {
                const sessionId = e.target.dataset.sessionId;
                this.editSession(sessionId);
            } else if (e.target.classList.contains('export-session')) {
                const sessionId = e.target.dataset.sessionId;
                const session = this.sessions.find(s => s.id === sessionId);
                if (session) this.exportSession(session);
            }
        });
    }
    
    startSession() {
        const title = prompt('Session Title:', `Session ${this.sessions.length + 1}`);
        if (!title) return;
        
        const players = prompt('Player Names (comma separated):', '');
        const playerList = players ? players.split(',').map(p => p.trim()) : [];
        
        this.currentSession = {
            id: `session-${Date.now()}`,
            number: this.sessions.length + 1,
            title: title,
            date: Date.now(),
            players: playerList,
            duration: 0,
            notes: '',
            events: [],
            loot: [],
            xpEarned: 0,
            summary: ''
        };
        
        // Start timer
        this.elapsedTime = 0;
        this.activeTimer = setInterval(this.updateTimer, 1000);
        
        // Update state
        this.stateManager.setState('session.active', true);
        this.stateManager.setState('session.current', this.currentSession);
        
        this.render();
        this.attachEventListeners();
    }
    
    endSession() {
        if (!confirm('End the current session?')) return;
        
        // Stop timer
        if (this.activeTimer) {
            clearInterval(this.activeTimer);
            this.activeTimer = null;
        }
        
        // Update duration
        this.currentSession.duration = this.elapsedTime;
        
        // Generate summary
        const summary = prompt('Session Summary (brief recap):', '');
        if (summary) {
            this.currentSession.summary = summary;
        }
        
        // Save session
        this.sessions.push(this.currentSession);
        this.saveSessions();
        
        // Clear current session
        this.currentSession = null;
        this.elapsedTime = 0;
        
        // Update state
        this.stateManager.setState('session.active', false);
        this.stateManager.setState('session.current', null);
        
        this.render();
        this.attachEventListeners();
    }
    
    saveSession() {
        if (!this.currentSession) return;
        
        // Update duration
        this.currentSession.duration = this.elapsedTime;
        
        // Save to temporary storage
        this.saveSessions();
        
        this.showNotification('Session progress saved', 'success');
    }
    
    updateTimer() {
        this.elapsedTime++;
        const display = this.element.querySelector('#timer-display');
        if (display) {
            display.textContent = this.formatTime(this.elapsedTime);
        }
    }
    
    addEvent() {
        const typeSelect = this.element.querySelector('#event-type');
        const type = typeSelect.value;
        
        const description = prompt(`Describe the ${type} event:`, '');
        if (!description) return;
        
        const event = {
            type: type,
            description: description,
            timestamp: Date.now()
        };
        
        this.currentSession.events.push(event);
        this.updateEventsList();
    }
    
    removeEvent(index) {
        this.currentSession.events.splice(index, 1);
        this.updateEventsList();
    }
    
    addLoot() {
        const name = prompt('Item Name:', '');
        if (!name) return;
        
        const value = parseInt(prompt('Value (credits):', '0')) || 0;
        
        const loot = {
            name: name,
            value: value,
            timestamp: Date.now()
        };
        
        this.currentSession.loot.push(loot);
        this.updateLootList();
        
        // Notify state manager
        this.stateManager.setState('campaign.lootGained', loot, false);
    }
    
    removeLoot(index) {
        this.currentSession.loot.splice(index, 1);
        this.updateLootList();
    }
    
    updateSessionDisplay() {
        const xpDisplay = this.element.querySelector('.xp-display');
        if (xpDisplay && this.currentSession) {
            xpDisplay.textContent = this.currentSession.xpEarned;
        }
    }
    
    updateEventsList() {
        const eventsList = this.element.querySelector('.events-list');
        if (eventsList && this.currentSession) {
            eventsList.innerHTML = this.renderEventsList(this.currentSession.events);
        }
    }
    
    updateLootList() {
        const lootList = this.element.querySelector('.loot-list');
        if (lootList && this.currentSession) {
            lootList.innerHTML = this.renderLootList(this.currentSession.loot);
        }
    }
    
    viewSession(sessionId) {
        const session = this.sessions.find(s => s.id === sessionId);
        if (!session) return;
        
        // Create detailed view modal
        alert(`Session Details:\n\n${JSON.stringify(session, null, 2)}`);
    }
    
    editSession(sessionId) {
        const session = this.sessions.find(s => s.id === sessionId);
        if (!session) return;
        
        const newTitle = prompt('Edit Title:', session.title);
        if (newTitle && newTitle !== session.title) {
            session.title = newTitle;
            this.saveSessions();
            this.render();
            this.attachEventListeners();
        }
    }
    
    exportSession(session) {
        const filename = `session-${session.number}-${session.title.replace(/\s+/g, '_')}.json`;
        const data = JSON.stringify(session, null, 2);
        
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        
        URL.revokeObjectURL(url);
        this.showNotification(`Exported ${filename}`, 'success');
    }
    
    filterSessions() {
        this.render();
        this.attachEventListeners();
    }
    
    getFilteredSessions() {
        const searchTerm = this.element.querySelector('#session-search')?.value.toLowerCase() || '';
        const filterType = this.element.querySelector('#session-filter')?.value || 'all';
        
        let filtered = [...this.sessions];
        
        // Apply search
        if (searchTerm) {
            filtered = filtered.filter(session => 
                session.title.toLowerCase().includes(searchTerm) ||
                session.summary?.toLowerCase().includes(searchTerm) ||
                session.notes?.toLowerCase().includes(searchTerm)
            );
        }
        
        // Apply filter
        switch (filterType) {
            case 'recent':
                filtered = filtered.slice(-5);
                break;
            case 'combat':
                filtered = filtered.filter(s => 
                    s.events.some(e => e.type === 'combat')
                );
                break;
            case 'exploration':
                filtered = filtered.filter(s => 
                    s.events.some(e => e.type === 'location' || e.type === 'discovery')
                );
                break;
            case 'social':
                filtered = filtered.filter(s => 
                    s.events.some(e => e.type === 'npc')
                );
                break;
        }
        
        return filtered.reverse(); // Most recent first
    }
    
    getTotalPlayTime() {
        const totalSeconds = this.sessions.reduce((sum, s) => sum + (s.duration || 0), 0);
        const hours = Math.floor(totalSeconds / 3600);
        return `${hours}h`;
    }
    
    getTotalXP() {
        return this.sessions.reduce((sum, s) => sum + (s.xpEarned || 0), 0);
    }
    
    getAverageSessionLength() {
        if (this.sessions.length === 0) return '0h';
        const totalSeconds = this.sessions.reduce((sum, s) => sum + (s.duration || 0), 0);
        const avgSeconds = totalSeconds / this.sessions.length;
        const hours = Math.floor(avgSeconds / 3600);
        const minutes = Math.floor((avgSeconds % 3600) / 60);
        return `${hours}h ${minutes}m`;
    }
    
    formatTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    
    getEventIcon(type) {
        const icons = {
            combat: '⚔️',
            discovery: '🔍',
            npc: '💬',
            location: '📍',
            plot: '📖',
            other: '✨'
        };
        return icons[type] || '📝';
    }
    
    saveSessions() {
        localStorage.setItem('cosmos-vtt-sessions', JSON.stringify(this.sessions));
        if (this.currentSession) {
            localStorage.setItem('cosmos-vtt-current-session', JSON.stringify(this.currentSession));
        } else {
            localStorage.removeItem('cosmos-vtt-current-session');
        }
    }
    
    loadSessions() {
        const saved = localStorage.getItem('cosmos-vtt-sessions');
        if (saved) {
            this.sessions = JSON.parse(saved);
        }
        
        const currentSaved = localStorage.getItem('cosmos-vtt-current-session');
        if (currentSaved) {
            this.currentSession = JSON.parse(currentSaved);
            // Resume timer if session is active
            const now = Date.now();
            const sessionStart = this.currentSession.date;
            this.elapsedTime = Math.floor((now - sessionStart) / 1000);
            this.activeTimer = setInterval(this.updateTimer, 1000);
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