/**
 * PanelSystem Component
 * Manages draggable, resizable panels for flexible UI layouts
 * Learned from cyberpunk project - keep it simple and focused
 */

export class PanelSystem {
    constructor() {
        this.panels = new Map();
        this.container = null;
        this.isDragging = false;
        this.isResizing = false;
        this.activePanel = null;
        this.zIndexCounter = 100;
    }
    
    init(container) {
        this.container = container;
        this.container.classList.add('panel-container');
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Apply saved layout if exists
        this.loadSavedLayout();
    }
    
    setupEventListeners() {
        // Mouse events for drag and resize
        this.container.addEventListener('mousedown', this.handleMouseDown.bind(this));
        document.addEventListener('mousemove', this.handleMouseMove.bind(this));
        document.addEventListener('mouseup', this.handleMouseUp.bind(this));
        
        // Touch events for mobile
        this.container.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
        document.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        document.addEventListener('touchend', this.handleTouchEnd.bind(this));
        
        // Keyboard shortcuts
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
    }
    
    addPanel(options) {
        const panel = {
            id: options.id || `panel-${Date.now()}`,
            title: options.title || 'Panel',
            content: options.content || '',
            x: options.x || 50,
            y: options.y || 50,
            width: options.width || 400,
            height: options.height || 300,
            minimized: false,
            closed: false,
            zIndex: this.zIndexCounter++
        };
        
        this.panels.set(panel.id, panel);
        this.renderPanel(panel);
        this.saveLayout();
        
        return panel.id;
    }
    
    renderPanel(panel) {
        // Create panel element
        const panelElement = document.createElement('div');
        panelElement.className = 'panel';
        panelElement.id = panel.id;
        panelElement.style.cssText = `
            left: ${panel.x}px;
            top: ${panel.y}px;
            width: ${panel.width}px;
            height: ${panel.height}px;
            z-index: ${panel.zIndex};
        `;
        
        panelElement.innerHTML = `
            <div class="panel-header" data-panel-id="${panel.id}">
                <span class="panel-title">${panel.title}</span>
                <div class="panel-controls">
                    <button class="panel-minimize" data-action="minimize" aria-label="Minimize">_</button>
                    <button class="panel-maximize" data-action="maximize" aria-label="Maximize">□</button>
                    <button class="panel-close" data-action="close" aria-label="Close">×</button>
                </div>
            </div>
            <div class="panel-content">
                ${panel.content}
            </div>
            <div class="panel-resize-handle" data-panel-id="${panel.id}"></div>
        `;
        
        // Add to container
        this.container.appendChild(panelElement);
        
        // Set up panel-specific event listeners
        this.setupPanelEvents(panelElement, panel);
    }
    
    setupPanelEvents(element, panel) {
        // Panel control buttons
        element.querySelectorAll('.panel-controls button').forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                const action = button.dataset.action;
                this.handlePanelAction(panel.id, action);
            });
        });
    }
    
    handlePanelAction(panelId, action) {
        const panel = this.panels.get(panelId);
        if (!panel) return;
        
        switch (action) {
            case 'minimize':
                this.minimizePanel(panelId);
                break;
            case 'maximize':
                this.maximizePanel(panelId);
                break;
            case 'close':
                this.closePanel(panelId);
                break;
        }
    }
    
    minimizePanel(panelId) {
        const panel = this.panels.get(panelId);
        const element = document.getElementById(panelId);
        
        if (panel && element) {
            panel.minimized = !panel.minimized;
            element.classList.toggle('minimized', panel.minimized);
            this.saveLayout();
        }
    }
    
    maximizePanel(panelId) {
        const panel = this.panels.get(panelId);
        const element = document.getElementById(panelId);
        
        if (panel && element) {
            if (element.classList.contains('maximized')) {
                // Restore
                element.style.left = `${panel.x}px`;
                element.style.top = `${panel.y}px`;
                element.style.width = `${panel.width}px`;
                element.style.height = `${panel.height}px`;
                element.classList.remove('maximized');
            } else {
                // Maximize
                panel.x = parseInt(element.style.left);
                panel.y = parseInt(element.style.top);
                panel.width = parseInt(element.style.width);
                panel.height = parseInt(element.style.height);
                
                element.style.left = '0';
                element.style.top = '0';
                element.style.width = '100%';
                element.style.height = '100%';
                element.classList.add('maximized');
            }
            this.saveLayout();
        }
    }
    
    closePanel(panelId) {
        const element = document.getElementById(panelId);
        if (element) {
            element.remove();
        }
        this.panels.delete(panelId);
        this.saveLayout();
    }
    
    // Drag handling
    handleMouseDown(e) {
        const header = e.target.closest('.panel-header');
        const resizeHandle = e.target.closest('.panel-resize-handle');
        
        if (header) {
            this.startDrag(e, header.dataset.panelId);
        } else if (resizeHandle) {
            this.startResize(e, resizeHandle.dataset.panelId);
        }
    }
    
    handleTouchStart(e) {
        const touch = e.touches[0];
        const header = e.target.closest('.panel-header');
        const resizeHandle = e.target.closest('.panel-resize-handle');
        
        if (header) {
            e.preventDefault();
            this.startDrag(touch, header.dataset.panelId);
        } else if (resizeHandle) {
            e.preventDefault();
            this.startResize(touch, resizeHandle.dataset.panelId);
        }
    }
    
    startDrag(e, panelId) {
        const panel = this.panels.get(panelId);
        const element = document.getElementById(panelId);
        
        if (!panel || !element) return;
        
        this.isDragging = true;
        this.activePanel = panel;
        
        // Bring to front
        panel.zIndex = this.zIndexCounter++;
        element.style.zIndex = panel.zIndex;
        
        // Calculate offset
        const rect = element.getBoundingClientRect();
        this.dragOffset = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
        
        element.classList.add('dragging');
    }
    
    startResize(e, panelId) {
        const panel = this.panels.get(panelId);
        const element = document.getElementById(panelId);
        
        if (!panel || !element) return;
        
        this.isResizing = true;
        this.activePanel = panel;
        
        // Bring to front
        panel.zIndex = this.zIndexCounter++;
        element.style.zIndex = panel.zIndex;
        
        const rect = element.getBoundingClientRect();
        this.resizeStart = {
            x: e.clientX,
            y: e.clientY,
            width: rect.width,
            height: rect.height
        };
        
        element.classList.add('resizing');
    }
    
    handleMouseMove(e) {
        if (this.isDragging) {
            this.performDrag(e);
        } else if (this.isResizing) {
            this.performResize(e);
        }
    }
    
    handleTouchMove(e) {
        const touch = e.touches[0];
        if (this.isDragging) {
            e.preventDefault();
            this.performDrag(touch);
        } else if (this.isResizing) {
            e.preventDefault();
            this.performResize(touch);
        }
    }
    
    performDrag(e) {
        if (!this.activePanel) return;
        
        const element = document.getElementById(this.activePanel.id);
        if (!element) return;
        
        const x = e.clientX - this.dragOffset.x;
        const y = e.clientY - this.dragOffset.y;
        
        // Constrain to container
        const containerRect = this.container.getBoundingClientRect();
        const panelRect = element.getBoundingClientRect();
        
        const maxX = containerRect.width - panelRect.width;
        const maxY = containerRect.height - panelRect.height;
        
        this.activePanel.x = Math.max(0, Math.min(x, maxX));
        this.activePanel.y = Math.max(0, Math.min(y, maxY));
        
        element.style.left = `${this.activePanel.x}px`;
        element.style.top = `${this.activePanel.y}px`;
    }
    
    performResize(e) {
        if (!this.activePanel) return;
        
        const element = document.getElementById(this.activePanel.id);
        if (!element) return;
        
        const deltaX = e.clientX - this.resizeStart.x;
        const deltaY = e.clientY - this.resizeStart.y;
        
        const newWidth = Math.max(200, this.resizeStart.width + deltaX);
        const newHeight = Math.max(150, this.resizeStart.height + deltaY);
        
        this.activePanel.width = newWidth;
        this.activePanel.height = newHeight;
        
        element.style.width = `${newWidth}px`;
        element.style.height = `${newHeight}px`;
    }
    
    handleMouseUp() {
        this.endDragResize();
    }
    
    handleTouchEnd() {
        this.endDragResize();
    }
    
    endDragResize() {
        if (this.activePanel) {
            const element = document.getElementById(this.activePanel.id);
            if (element) {
                element.classList.remove('dragging', 'resizing');
            }
        }
        
        this.isDragging = false;
        this.isResizing = false;
        this.activePanel = null;
        
        this.saveLayout();
    }
    
    handleKeyDown(e) {
        // Ctrl/Cmd + W to close active panel
        if ((e.ctrlKey || e.metaKey) && e.key === 'w') {
            e.preventDefault();
            const topPanel = this.getTopPanel();
            if (topPanel) {
                this.closePanel(topPanel.id);
            }
        }
    }
    
    getTopPanel() {
        let topPanel = null;
        let highestZ = -1;
        
        this.panels.forEach(panel => {
            if (panel.zIndex > highestZ && !panel.closed) {
                highestZ = panel.zIndex;
                topPanel = panel;
            }
        });
        
        return topPanel;
    }
    
    // Layout management
    saveLayout() {
        const layout = Array.from(this.panels.values()).map(panel => ({
            id: panel.id,
            title: panel.title,
            x: panel.x,
            y: panel.y,
            width: panel.width,
            height: panel.height,
            minimized: panel.minimized,
            zIndex: panel.zIndex
        }));
        
        localStorage.setItem('cosmos-vtt-panel-layout', JSON.stringify(layout));
    }
    
    loadSavedLayout() {
        const saved = localStorage.getItem('cosmos-vtt-panel-layout');
        if (saved) {
            try {
                const layout = JSON.parse(saved);
                // Layout will be applied when panels are added
                return layout;
            } catch (e) {
                console.error('Failed to load panel layout:', e);
            }
        }
        return null;
    }
    
    loadDefaultLayout() {
        // Clear existing panels
        this.clear();
        
        // Add default panels
        this.addPanel({
            id: 'dice',
            title: 'Dice Roller',
            x: 20,
            y: 20,
            width: 300,
            height: 200
        });
        
        this.addPanel({
            id: 'reference',
            title: 'Quick Reference',
            x: 340,
            y: 20,
            width: 400,
            height: 300
        });
    }
    
    loadLayout(layout) {
        this.clear();
        layout.forEach(panelConfig => {
            this.addPanel(panelConfig);
        });
    }
    
    clear() {
        this.panels.forEach(panel => {
            const element = document.getElementById(panel.id);
            if (element) {
                element.remove();
            }
        });
        this.panels.clear();
    }
    
    updatePanelContent(panelId, content) {
        const panel = this.panels.get(panelId);
        const element = document.getElementById(panelId);
        
        if (panel && element) {
            panel.content = content;
            const contentDiv = element.querySelector('.panel-content');
            if (contentDiv) {
                contentDiv.innerHTML = content;
            }
        }
    }
}