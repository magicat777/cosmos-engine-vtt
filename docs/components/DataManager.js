/**
 * DataManager Component
 * Handles all data fetching, caching, and synchronization
 * Provides offline-first capability
 */

import { DataFetcher } from '../utils/dataFetcher.js';

export class DataManager {
    constructor(config) {
        this.config = config;
        this.cache = new Map();
        this.db = null;
        this.isInitialized = false;
        this.dataFetcher = new DataFetcher(config);
    }
    
    async init() {
        // Initialize IndexedDB for offline storage
        await this.initDatabase();
        
        // Load core data
        await this.loadCoreData();
        
        this.isInitialized = true;
    }
    
    async initDatabase() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('CosmosEngineVTT', 1);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Create object stores
                if (!db.objectStoreNames.contains('gameData')) {
                    db.createObjectStore('gameData', { keyPath: 'id' });
                }
                
                if (!db.objectStoreNames.contains('characters')) {
                    db.createObjectStore('characters', { keyPath: 'id', autoIncrement: true });
                }
                
                if (!db.objectStoreNames.contains('sessions')) {
                    db.createObjectStore('sessions', { keyPath: 'id', autoIncrement: true });
                }
            };
        });
    }
    
    async loadCoreData() {
        // Define core data files to preload
        const coreFiles = [
            'attributes.json',
            'skills.json',
            'equipment.json',
            'species.json'
        ];
        
        // Load each file
        const promises = coreFiles.map(file => this.loadData(file));
        await Promise.all(promises);
    }
    
    async loadData(filename) {
        // Check cache first
        if (this.cache.has(filename)) {
            return this.cache.get(filename);
        }
        
        // Check IndexedDB for offline data
        const stored = await this.getFromDB('gameData', filename);
        if (stored && !this.isDataExpired(stored)) {
            this.cache.set(filename, stored.data);
            return stored.data;
        }
        
        // Fetch from network
        try {
            const url = this.config.getDataSource(filename);
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`Failed to fetch ${filename}: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Cache in memory
            this.cache.set(filename, data);
            
            // Store in IndexedDB
            await this.saveToDB('gameData', {
                id: filename,
                data: data,
                timestamp: Date.now()
            });
            
            return data;
        } catch (error) {
            console.error(`Failed to load ${filename}:`, error);
            
            // Fall back to stored data if available
            if (stored) {
                console.warn(`Using expired cached data for ${filename}`);
                return stored.data;
            }
            
            throw error;
        }
    }
    
    isDataExpired(stored) {
        const now = Date.now();
        const age = now - stored.timestamp;
        return age > this.config.performance.cacheExpiry;
    }
    
    async getFromDB(storeName, key) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(key);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
    
    async saveToDB(storeName, data) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(data);
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }
    
    // Character management
    async saveCharacter(character) {
        character.lastModified = Date.now();
        await this.saveToDB('characters', character);
        return character.id;
    }
    
    async loadCharacter(id) {
        return this.getFromDB('characters', id);
    }
    
    async getAllCharacters() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['characters'], 'readonly');
            const store = transaction.objectStore('characters');
            const request = store.getAll();
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
    
    // Session management
    async saveSession(session) {
        session.lastModified = Date.now();
        await this.saveToDB('sessions', session);
        return session.id;
    }
    
    async loadSession(id) {
        return this.getFromDB('sessions', id);
    }
    
    // Utility methods
    clearCache() {
        this.cache.clear();
    }
    
    async clearAllData() {
        const stores = ['gameData', 'characters', 'sessions'];
        
        for (const storeName of stores) {
            await new Promise((resolve, reject) => {
                const transaction = this.db.transaction([storeName], 'readwrite');
                const store = transaction.objectStore(storeName);
                const request = store.clear();
                
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        }
        
        this.clearCache();
    }
    
    // Export/Import functionality
    async exportData() {
        const data = {
            version: this.config.api.version,
            timestamp: Date.now(),
            characters: await this.getAllCharacters(),
            sessions: await this.getAllSessions()
        };
        
        return JSON.stringify(data, null, 2);
    }
    
    async importData(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            
            // Validate version compatibility
            if (data.version !== this.config.api.version) {
                console.warn(`Importing data from version ${data.version}, current version is ${this.config.api.version}`);
            }
            
            // Import characters
            if (data.characters) {
                for (const character of data.characters) {
                    await this.saveCharacter(character);
                }
            }
            
            // Import sessions
            if (data.sessions) {
                for (const session of data.sessions) {
                    await this.saveSession(session);
                }
            }
            
            return true;
        } catch (error) {
            console.error('Failed to import data:', error);
            return false;
        }
    }
}