/**
 * CampaignNotes Component
 * 
 * Organized note-taking system for GMs
 * Features:
 * - Hierarchical note organization
 * - Rich text editing
 * - Tags and categories
 * - Quick search
 * - Cross-referencing
 * - Templates for common note types
 */

export class CampaignNotes {
    constructor(config, dataManager, stateManager) {
        this.config = config;
        this.dataManager = dataManager;
        this.stateManager = stateManager;
        this.element = null;
        
        // Notes state
        this.notes = [];
        this.categories = ['Plot', 'NPCs', 'Locations', 'Items', 'Lore', 'Rules', 'Ideas'];
        this.currentNote = null;
        this.searchTerm = '';
        this.selectedCategory = 'all';
        this.selectedTags = new Set();
        
        // Note templates
        this.templates = {
            npc: {
                title: 'New NPC',
                category: 'NPCs',
                template: `## Description
[Physical appearance and personality]

## Background
[History and motivations]

## Abilities
- 

## Relationships
- 

## Notes
`
            },
            location: {
                title: 'New Location',
                category: 'Locations',
                template: `## Description
[Physical description and atmosphere]

## Notable Features
- 

## NPCs Present
- 

## Connections
[How this location connects to others]

## Secrets
`
            },
            quest: {
                title: 'New Quest',
                category: 'Plot',
                template: `## Objective
[Main goal]

## Quest Giver
[NPC name and location]

## Requirements
- 

## Rewards
- 

## Complications
- 

## Resolution
`
            },
            item: {
                title: 'New Item',
                category: 'Items',
                template: `## Description
[Physical appearance]

## Properties
- 

## History
[Origin and previous owners]

## Location
[Where it can be found]

## Value
`
            }
        };
        
        // Load notes
        this.loadNotes();
        
        // Bind methods
        this.createNote = this.createNote.bind(this);
        this.saveNote = this.saveNote.bind(this);
        this.deleteNote = this.deleteNote.bind(this);
        this.searchNotes = this.searchNotes.bind(this);
    }
    
    init(container) {
        this.element = container;
        this.render();
        this.attachEventListeners();
        return this;
    }
    
    render() {
        this.element.innerHTML = `
            <div class="campaign-notes">
                <div class="notes-sidebar">
                    <div class="sidebar-header">
                        <h4>Notes</h4>
                        <button id="new-note" class="btn btn-primary btn-sm">
                            + New Note
                        </button>
                    </div>
                    
                    <div class="notes-search">
                        <input type="text" id="notes-search" placeholder="Search notes..." 
                               value="${this.searchTerm}" class="search-input">
                    </div>
                    
                    <div class="notes-filters">
                        <select id="category-filter" class="filter-select">
                            <option value="all">All Categories</option>
                            ${this.categories.map(cat => `
                                <option value="${cat}" ${this.selectedCategory === cat ? 'selected' : ''}>
                                    ${cat}
                                </option>
                            `).join('')}
                        </select>
                    </div>
                    
                    <div class="notes-templates">
                        <button class="template-btn" data-template="npc" title="New NPC">
                            👤
                        </button>
                        <button class="template-btn" data-template="location" title="New Location">
                            📍
                        </button>
                        <button class="template-btn" data-template="quest" title="New Quest">
                            📜
                        </button>
                        <button class="template-btn" data-template="item" title="New Item">
                            🗡️
                        </button>
                    </div>
                    
                    <div class="notes-list">
                        ${this.renderNotesList()}
                    </div>
                    
                    <div class="notes-tags">
                        <h5>Popular Tags</h5>
                        <div class="tags-cloud">
                            ${this.renderTagsCloud()}
                        </div>
                    </div>
                </div>
                
                <div class="notes-content">
                    ${this.currentNote ? this.renderNoteEditor() : this.renderWelcome()}
                </div>
            </div>
        `;
    }
    
    renderNotesList() {
        const filtered = this.getFilteredNotes();
        
        if (filtered.length === 0) {
            return '<p class="no-notes">No notes found</p>';
        }
        
        // Group by category
        const grouped = {};
        filtered.forEach(note => {
            if (!grouped[note.category]) {
                grouped[note.category] = [];
            }
            grouped[note.category].push(note);
        });
        
        return Object.entries(grouped).map(([category, notes]) => `
            <div class="notes-group">
                <div class="group-header">${category}</div>
                ${notes.map(note => `
                    <div class="note-item ${note.id === this.currentNote?.id ? 'active' : ''}" 
                         data-note-id="${note.id}">
                        <div class="note-title">${note.title}</div>
                        <div class="note-meta">
                            <span class="note-date">${this.formatDate(note.modified)}</span>
                            ${note.tags.length > 0 ? 
                                `<span class="note-tag-count">${note.tags.length} tags</span>` : ''
                            }
                        </div>
                    </div>
                `).join('')}
            </div>
        `).join('');
    }
    
    renderTagsCloud() {
        const tagCounts = {};
        this.notes.forEach(note => {
            note.tags.forEach(tag => {
                tagCounts[tag] = (tagCounts[tag] || 0) + 1;
            });
        });
        
        const sortedTags = Object.entries(tagCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);
        
        if (sortedTags.length === 0) {
            return '<p class="no-tags">No tags yet</p>';
        }
        
        return sortedTags.map(([tag, count]) => `
            <button class="tag-btn ${this.selectedTags.has(tag) ? 'active' : ''}" 
                    data-tag="${tag}">
                ${tag} (${count})
            </button>
        `).join('');
    }
    
    renderNoteEditor() {
        return `
            <div class="note-editor">
                <div class="editor-header">
                    <input type="text" id="note-title" value="${this.currentNote.title}" 
                           placeholder="Note Title" class="note-title-input">
                    <div class="editor-actions">
                        <button id="save-note" class="btn btn-primary btn-sm">Save</button>
                        <button id="delete-note" class="btn btn-danger btn-sm">Delete</button>
                    </div>
                </div>
                
                <div class="editor-meta">
                    <select id="note-category" class="category-select">
                        ${this.categories.map(cat => `
                            <option value="${cat}" ${this.currentNote.category === cat ? 'selected' : ''}>
                                ${cat}
                            </option>
                        `).join('')}
                    </select>
                    
                    <input type="text" id="note-tags" value="${this.currentNote.tags.join(', ')}" 
                           placeholder="Tags (comma separated)" class="tags-input">
                </div>
                
                <div class="editor-toolbar">
                    <button class="toolbar-btn" data-action="bold" title="Bold">
                        <strong>B</strong>
                    </button>
                    <button class="toolbar-btn" data-action="italic" title="Italic">
                        <em>I</em>
                    </button>
                    <button class="toolbar-btn" data-action="heading" title="Heading">
                        H
                    </button>
                    <button class="toolbar-btn" data-action="list" title="List">
                        ☰
                    </button>
                    <button class="toolbar-btn" data-action="link" title="Link">
                        🔗
                    </button>
                    <button class="toolbar-btn" data-action="table" title="Table">
                        ⊞
                    </button>
                </div>
                
                <div class="editor-content">
                    <textarea id="note-content" class="note-content-area">${this.currentNote.content}</textarea>
                </div>
                
                <div class="editor-preview">
                    <h5>Preview</h5>
                    <div id="preview-content" class="preview-content">
                        ${this.parseMarkdown(this.currentNote.content)}
                    </div>
                </div>
                
                <div class="editor-footer">
                    <span class="note-created">Created: ${this.formatDate(this.currentNote.created)}</span>
                    <span class="note-modified">Modified: ${this.formatDate(this.currentNote.modified)}</span>
                    <span class="note-words">Words: ${this.countWords(this.currentNote.content)}</span>
                </div>
            </div>
        `;
    }
    
    renderWelcome() {
        return `
            <div class="notes-welcome">
                <h3>Campaign Notes</h3>
                <p>Select a note from the sidebar or create a new one to get started.</p>
                
                <div class="quick-actions">
                    <h4>Quick Start</h4>
                    <div class="action-grid">
                        <button class="action-card" data-template="npc">
                            <span class="action-icon">👤</span>
                            <span class="action-label">Create NPC</span>
                        </button>
                        <button class="action-card" data-template="location">
                            <span class="action-icon">📍</span>
                            <span class="action-label">Add Location</span>
                        </button>
                        <button class="action-card" data-template="quest">
                            <span class="action-icon">📜</span>
                            <span class="action-label">New Quest</span>
                        </button>
                        <button class="action-card" data-template="item">
                            <span class="action-icon">🗡️</span>
                            <span class="action-label">Create Item</span>
                        </button>
                    </div>
                </div>
                
                <div class="recent-notes">
                    <h4>Recent Notes</h4>
                    ${this.renderRecentNotes()}
                </div>
            </div>
        `;
    }
    
    renderRecentNotes() {
        const recent = this.notes
            .sort((a, b) => b.modified - a.modified)
            .slice(0, 5);
        
        if (recent.length === 0) {
            return '<p class="no-recent">No notes yet</p>';
        }
        
        return `
            <div class="recent-list">
                ${recent.map(note => `
                    <div class="recent-item" data-note-id="${note.id}">
                        <span class="recent-title">${note.title}</span>
                        <span class="recent-category">${note.category}</span>
                        <span class="recent-date">${this.formatDate(note.modified)}</span>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    attachEventListeners() {
        // Sidebar controls
        const newNoteBtn = this.element.querySelector('#new-note');
        if (newNoteBtn) {
            newNoteBtn.addEventListener('click', () => this.createNote());
        }
        
        // Search
        const searchInput = this.element.querySelector('#notes-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchTerm = e.target.value;
                this.updateNotesList();
            });
        }
        
        // Category filter
        const categoryFilter = this.element.querySelector('#category-filter');
        if (categoryFilter) {
            categoryFilter.addEventListener('change', (e) => {
                this.selectedCategory = e.target.value;
                this.updateNotesList();
            });
        }
        
        // Template buttons
        this.element.querySelectorAll('.template-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.createNoteFromTemplate(btn.dataset.template);
            });
        });
        
        // Note editor
        if (this.currentNote) {
            // Title
            const titleInput = this.element.querySelector('#note-title');
            if (titleInput) {
                titleInput.addEventListener('input', (e) => {
                    this.currentNote.title = e.target.value;
                });
            }
            
            // Category
            const categorySelect = this.element.querySelector('#note-category');
            if (categorySelect) {
                categorySelect.addEventListener('change', (e) => {
                    this.currentNote.category = e.target.value;
                });
            }
            
            // Tags
            const tagsInput = this.element.querySelector('#note-tags');
            if (tagsInput) {
                tagsInput.addEventListener('input', (e) => {
                    this.currentNote.tags = e.target.value
                        .split(',')
                        .map(tag => tag.trim())
                        .filter(tag => tag.length > 0);
                });
            }
            
            // Content
            const contentArea = this.element.querySelector('#note-content');
            if (contentArea) {
                contentArea.addEventListener('input', (e) => {
                    this.currentNote.content = e.target.value;
                    this.updatePreview();
                });
            }
            
            // Toolbar
            this.element.querySelectorAll('.toolbar-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    this.applyFormatting(btn.dataset.action);
                });
            });
            
            // Actions
            const saveBtn = this.element.querySelector('#save-note');
            if (saveBtn) {
                saveBtn.addEventListener('click', this.saveNote);
            }
            
            const deleteBtn = this.element.querySelector('#delete-note');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', this.deleteNote);
            }
        }
        
        // Delegated events
        this.element.addEventListener('click', (e) => {
            // Note selection
            const noteItem = e.target.closest('.note-item');
            if (noteItem) {
                this.selectNote(noteItem.dataset.noteId);
            }
            
            // Tag selection
            if (e.target.classList.contains('tag-btn')) {
                this.toggleTag(e.target.dataset.tag);
            }
            
            // Action cards
            if (e.target.closest('.action-card')) {
                const template = e.target.closest('.action-card').dataset.template;
                this.createNoteFromTemplate(template);
            }
            
            // Recent notes
            const recentItem = e.target.closest('.recent-item');
            if (recentItem) {
                this.selectNote(recentItem.dataset.noteId);
            }
        });
    }
    
    createNote() {
        const note = {
            id: `note-${Date.now()}`,
            title: 'New Note',
            category: 'Ideas',
            content: '',
            tags: [],
            created: Date.now(),
            modified: Date.now(),
            references: []
        };
        
        this.notes.push(note);
        this.currentNote = note;
        this.saveNotes();
        this.render();
        this.attachEventListeners();
        
        // Focus title input
        const titleInput = this.element.querySelector('#note-title');
        if (titleInput) {
            titleInput.focus();
            titleInput.select();
        }
    }
    
    createNoteFromTemplate(templateName) {
        const template = this.templates[templateName];
        if (!template) return;
        
        const note = {
            id: `note-${Date.now()}`,
            title: template.title,
            category: template.category,
            content: template.template,
            tags: [],
            created: Date.now(),
            modified: Date.now(),
            references: []
        };
        
        this.notes.push(note);
        this.currentNote = note;
        this.saveNotes();
        this.render();
        this.attachEventListeners();
    }
    
    selectNote(noteId) {
        const note = this.notes.find(n => n.id === noteId);
        if (note) {
            this.currentNote = note;
            this.render();
            this.attachEventListeners();
        }
    }
    
    saveNote() {
        if (!this.currentNote) return;
        
        this.currentNote.modified = Date.now();
        this.saveNotes();
        this.updateNotesList();
        this.showNotification('Note saved', 'success');
    }
    
    deleteNote() {
        if (!this.currentNote) return;
        
        if (!confirm(`Delete "${this.currentNote.title}"?`)) return;
        
        const index = this.notes.findIndex(n => n.id === this.currentNote.id);
        if (index !== -1) {
            this.notes.splice(index, 1);
            this.currentNote = null;
            this.saveNotes();
            this.render();
            this.attachEventListeners();
        }
    }
    
    searchNotes(term) {
        this.searchTerm = term;
        this.updateNotesList();
    }
    
    toggleTag(tag) {
        if (this.selectedTags.has(tag)) {
            this.selectedTags.delete(tag);
        } else {
            this.selectedTags.add(tag);
        }
        this.updateNotesList();
    }
    
    applyFormatting(action) {
        const textarea = this.element.querySelector('#note-content');
        if (!textarea) return;
        
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = textarea.value.substring(start, end);
        
        let replacement = '';
        let cursorOffset = 0;
        
        switch (action) {
            case 'bold':
                replacement = `**${selectedText}**`;
                cursorOffset = 2;
                break;
            case 'italic':
                replacement = `*${selectedText}*`;
                cursorOffset = 1;
                break;
            case 'heading':
                replacement = `## ${selectedText}`;
                cursorOffset = 3;
                break;
            case 'list':
                replacement = `- ${selectedText}`;
                cursorOffset = 2;
                break;
            case 'link':
                const url = prompt('Enter URL:', 'https://');
                if (url) {
                    replacement = `[${selectedText}](${url})`;
                    cursorOffset = 1;
                }
                break;
            case 'table':
                replacement = `| Column 1 | Column 2 |
|----------|----------|
| ${selectedText} |  |`;
                cursorOffset = 2;
                break;
        }
        
        if (replacement) {
            textarea.value = textarea.value.substring(0, start) + 
                           replacement + 
                           textarea.value.substring(end);
            
            this.currentNote.content = textarea.value;
            this.updatePreview();
            
            // Restore cursor position
            textarea.selectionStart = start + cursorOffset;
            textarea.selectionEnd = start + replacement.length - cursorOffset;
            textarea.focus();
        }
    }
    
    updatePreview() {
        const preview = this.element.querySelector('#preview-content');
        if (preview && this.currentNote) {
            preview.innerHTML = this.parseMarkdown(this.currentNote.content);
        }
    }
    
    parseMarkdown(text) {
        // Simple markdown parser
        return text
            // Headers
            .replace(/^### (.*$)/gim, '<h3>$1</h3>')
            .replace(/^## (.*$)/gim, '<h2>$1</h2>')
            .replace(/^# (.*$)/gim, '<h1>$1</h1>')
            // Bold
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            // Italic
            .replace(/\*(.+?)\*/g, '<em>$1</em>')
            // Links
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
            // Lists
            .replace(/^\- (.+)$/gim, '<li>$1</li>')
            // Line breaks
            .replace(/\n/g, '<br>')
            // Wrap lists
            .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
    }
    
    updateNotesList() {
        const notesList = this.element.querySelector('.notes-list');
        if (notesList) {
            notesList.innerHTML = this.renderNotesList();
        }
        
        const tagsCloud = this.element.querySelector('.tags-cloud');
        if (tagsCloud) {
            tagsCloud.innerHTML = this.renderTagsCloud();
        }
    }
    
    getFilteredNotes() {
        let filtered = [...this.notes];
        
        // Category filter
        if (this.selectedCategory !== 'all') {
            filtered = filtered.filter(note => note.category === this.selectedCategory);
        }
        
        // Search filter
        if (this.searchTerm) {
            const term = this.searchTerm.toLowerCase();
            filtered = filtered.filter(note => 
                note.title.toLowerCase().includes(term) ||
                note.content.toLowerCase().includes(term) ||
                note.tags.some(tag => tag.toLowerCase().includes(term))
            );
        }
        
        // Tag filter
        if (this.selectedTags.size > 0) {
            filtered = filtered.filter(note => 
                Array.from(this.selectedTags).some(tag => note.tags.includes(tag))
            );
        }
        
        // Sort by modified date
        return filtered.sort((a, b) => b.modified - a.modified);
    }
    
    formatDate(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        
        // Less than 1 hour
        if (diff < 3600000) {
            const minutes = Math.floor(diff / 60000);
            return `${minutes}m ago`;
        }
        
        // Less than 24 hours
        if (diff < 86400000) {
            const hours = Math.floor(diff / 3600000);
            return `${hours}h ago`;
        }
        
        // Less than 7 days
        if (diff < 604800000) {
            const days = Math.floor(diff / 86400000);
            return `${days}d ago`;
        }
        
        // Default to date
        return date.toLocaleDateString();
    }
    
    countWords(text) {
        return text.trim().split(/\s+/).filter(word => word.length > 0).length;
    }
    
    saveNotes() {
        localStorage.setItem('cosmos-vtt-notes', JSON.stringify(this.notes));
    }
    
    loadNotes() {
        const saved = localStorage.getItem('cosmos-vtt-notes');
        if (saved) {
            this.notes = JSON.parse(saved);
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