/**
 * Simple client-side router for single-page application
 * Handles hash-based routing without page reloads
 */

export class Router {
    constructor() {
        this.routes = new Map();
        this.currentRoute = null;
        this.beforeRouteChange = null;
        this.afterRouteChange = null;
    }
    
    addRoute(path, handler) {
        this.routes.set(path, handler);
        return this;
    }
    
    start() {
        // Listen for hash changes
        window.addEventListener('hashchange', () => this.handleRoute());
        window.addEventListener('popstate', () => this.handleRoute());
        
        // Handle initial route
        this.handleRoute();
        
        // Set up navigation
        this.setupNavigation();
    }
    
    async handleRoute() {
        const path = this.getCurrentPath();
        const handler = this.routes.get(path) || this.routes.get('/');
        
        if (this.beforeRouteChange) {
            const proceed = await this.beforeRouteChange(path, this.currentRoute);
            if (!proceed) return;
        }
        
        this.currentRoute = path;
        
        if (handler) {
            handler();
        } else {
            this.notFound();
        }
        
        if (this.afterRouteChange) {
            this.afterRouteChange(path);
        }
        
        // Update active navigation
        this.updateActiveNav();
    }
    
    getCurrentPath() {
        const hash = window.location.hash.slice(1) || '/';
        return hash.split('?')[0]; // Remove query params
    }
    
    navigate(path) {
        window.location.hash = path;
    }
    
    notFound() {
        document.getElementById('main-content').innerHTML = `
            <div class="not-found">
                <h2>Page Not Found</h2>
                <p>The requested page could not be found.</p>
                <a href="#/">Return to Dashboard</a>
            </div>
        `;
    }
    
    setupNavigation() {
        const nav = document.getElementById('main-nav');
        if (!nav) return;
        
        nav.innerHTML = `
            <a href="#/" class="nav-link" data-route="/">Dashboard</a>
            <a href="#/dice" class="nav-link" data-route="/dice">Dice</a>
            <a href="#/character" class="nav-link" data-route="/character">Character</a>
            <a href="#/combat" class="nav-link" data-route="/combat">Combat</a>
            <a href="#/encounter" class="nav-link" data-route="/encounter">Encounter</a>
            <a href="#/scales" class="nav-link" data-route="/scales">Scales</a>
            <a href="#/rules" class="nav-link" data-route="/rules">Rules</a>
            <a href="#/import-export" class="nav-link" data-route="/import-export">Data</a>
            <a href="#/settings" class="nav-link" data-route="/settings">Settings</a>
        `;
    }
    
    updateActiveNav() {
        const currentPath = this.getCurrentPath();
        document.querySelectorAll('.nav-link').forEach(link => {
            const route = link.getAttribute('data-route');
            link.classList.toggle('active', route === currentPath);
        });
    }
    
    // Utility methods
    getQueryParams() {
        const hash = window.location.hash;
        const queryIndex = hash.indexOf('?');
        if (queryIndex === -1) return {};
        
        const queryString = hash.slice(queryIndex + 1);
        const params = {};
        
        queryString.split('&').forEach(param => {
            const [key, value] = param.split('=');
            params[decodeURIComponent(key)] = decodeURIComponent(value || '');
        });
        
        return params;
    }
    
    setQueryParams(params) {
        const path = this.getCurrentPath();
        const queryString = Object.entries(params)
            .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
            .join('&');
        
        window.location.hash = queryString ? `${path}?${queryString}` : path;
    }
}