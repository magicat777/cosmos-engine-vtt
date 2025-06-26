/**
 * ScaleManager Component
 * 
 * Manages scale transitions and conversions for Cosmos Engine
 * Features:
 * - Seamless scale transitions (Personal/Vehicle/Starship/Capital)
 * - Unified interface across all scales
 * - Scale conversion calculators
 * - Visual scale indicators
 * - Damage/HP scaling between scales
 */

export class ScaleManager {
    constructor(config, eventBus) {
        this.config = config;
        this.eventBus = eventBus;
        this.element = null;
        
        // Scale definitions
        this.scales = {
            'Personal': {
                name: 'Personal',
                multiplier: 1,
                icon: '👤',
                color: '#3498db',
                examples: ['Humans', 'Robots', 'Small creatures'],
                damageRange: '1-20',
                hpRange: '10-200'
            },
            'Vehicle': {
                name: 'Vehicle',
                multiplier: 10,
                icon: '🚗',
                color: '#e67e22',
                examples: ['Cars', 'Motorcycles', 'Small mechs'],
                damageRange: '10-200',
                hpRange: '20-500'
            },
            'Starship': {
                name: 'Starship',
                multiplier: 100,
                icon: '🚀',
                color: '#9b59b6',
                examples: ['Fighters', 'Transports', 'Corvettes'],
                damageRange: '100-2000',
                hpRange: '100-5000'
            },
            'Capital': {
                name: 'Capital',
                multiplier: 1000,
                icon: '🛸',
                color: '#e74c3c',
                examples: ['Cruisers', 'Carriers', 'Stations'],
                damageRange: '1000-20000',
                hpRange: '1000-50000'
            }
        };
        
        this.currentScale = 'Personal';
        this.comparisonScale = 'Vehicle';
        
        // Bind methods
        this.setScale = this.setScale.bind(this);
        this.convertDamage = this.convertDamage.bind(this);
    }
    
    init(container) {
        this.element = container;
        this.render();
        this.attachEventListeners();
        this.setupEventHandlers();
        return this;
    }
    
    setupEventHandlers() {
        if (!this.eventBus) return;
        
        // Listen for scale change requests
        this.eventBus.on('request-scale-change', (data) => {
            this.setScale(data.scale);
        });
        
        // Listen for damage calculations
        this.eventBus.on('calculate-scaled-damage', (data) => {
            const scaled = this.convertDamage(data.damage, data.fromScale, data.toScale);
            this.eventBus.emit('scaled-damage-calculated', {
                original: data.damage,
                scaled: scaled,
                fromScale: data.fromScale,
                toScale: data.toScale
            });
        });
    }
    
    render() {
        this.element.innerHTML = `
            <div class="scale-manager">
                <div class="scale-header">
                    <h3>Scale Manager</h3>
                    <p class="scale-description">
                        Manage combat and damage across different scales
                    </p>
                </div>
                
                <div class="current-scale-display">
                    <h4>Current Scale</h4>
                    <div class="scale-selector">
                        ${Object.entries(this.scales).map(([key, scale]) => `
                            <button class="scale-btn ${key === this.currentScale ? 'active' : ''}" 
                                    data-scale="${key}"
                                    style="--scale-color: ${scale.color}">
                                <span class="scale-icon">${scale.icon}</span>
                                <span class="scale-name">${scale.name}</span>
                                <span class="scale-multiplier">×${scale.multiplier}</span>
                            </button>
                        `).join('')}
                    </div>
                    
                    <div class="scale-info">
                        ${this.renderScaleInfo(this.currentScale)}
                    </div>
                </div>
                
                <div class="scale-converter">
                    <h4>Damage Converter</h4>
                    <div class="converter-controls">
                        <div class="converter-input">
                            <label>Damage Amount</label>
                            <input type="number" id="damage-input" value="10" min="0">
                        </div>
                        
                        <div class="converter-scales">
                            <div class="from-scale">
                                <label>From Scale</label>
                                <select id="from-scale">
                                    ${Object.keys(this.scales).map(scale => `
                                        <option value="${scale}" ${scale === this.currentScale ? 'selected' : ''}>
                                            ${scale}
                                        </option>
                                    `).join('')}
                                </select>
                            </div>
                            
                            <div class="scale-arrow">→</div>
                            
                            <div class="to-scale">
                                <label>To Scale</label>
                                <select id="to-scale">
                                    ${Object.keys(this.scales).map(scale => `
                                        <option value="${scale}" ${scale === this.comparisonScale ? 'selected' : ''}>
                                            ${scale}
                                        </option>
                                    `).join('')}
                                </select>
                            </div>
                        </div>
                        
                        <button id="convert-damage" class="btn btn-primary">
                            Calculate Scaled Damage
                        </button>
                    </div>
                    
                    <div id="conversion-result" class="conversion-result"></div>
                </div>
                
                <div class="scale-comparison">
                    <h4>Scale Comparison Chart</h4>
                    <div class="comparison-grid">
                        ${this.renderComparisonChart()}
                    </div>
                </div>
                
                <div class="scale-examples">
                    <h4>Common Conversions</h4>
                    <div class="examples-list">
                        <div class="example-item">
                            <span class="example-desc">Pistol vs Starfighter</span>
                            <span class="example-calc">10 damage → 0.1 damage (×0.01)</span>
                        </div>
                        <div class="example-item">
                            <span class="example-desc">Vehicle cannon vs Person</span>
                            <span class="example-calc">20 damage → 200 damage (×10)</span>
                        </div>
                        <div class="example-item">
                            <span class="example-desc">Starship laser vs Capital ship</span>
                            <span class="example-calc">100 damage → 10 damage (×0.1)</span>
                        </div>
                        <div class="example-item">
                            <span class="example-desc">Capital weapon vs Vehicle</span>
                            <span class="example-calc">1000 damage → 10,000 damage (×10)</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    renderScaleInfo(scaleName) {
        const scale = this.scales[scaleName];
        if (!scale) return '';
        
        return `
            <div class="scale-details">
                <div class="scale-stat">
                    <label>Damage Multiplier</label>
                    <span>×${scale.multiplier}</span>
                </div>
                <div class="scale-stat">
                    <label>Typical Damage</label>
                    <span>${scale.damageRange}</span>
                </div>
                <div class="scale-stat">
                    <label>Typical HP</label>
                    <span>${scale.hpRange}</span>
                </div>
                <div class="scale-examples">
                    <label>Examples</label>
                    <span>${scale.examples.join(', ')}</span>
                </div>
            </div>
        `;
    }
    
    renderComparisonChart() {
        const scales = Object.keys(this.scales);
        let html = '<table class="comparison-table">';
        
        // Header row
        html += '<tr><th>From \\ To</th>';
        scales.forEach(scale => {
            html += `<th>${scale}</th>`;
        });
        html += '</tr>';
        
        // Data rows
        scales.forEach(fromScale => {
            html += `<tr><th>${fromScale}</th>`;
            scales.forEach(toScale => {
                const multiplier = this.getScaleMultiplier(fromScale, toScale);
                const cssClass = multiplier > 1 ? 'scale-up' : multiplier < 1 ? 'scale-down' : 'scale-same';
                html += `<td class="${cssClass}">×${multiplier}</td>`;
            });
            html += '</tr>';
        });
        
        html += '</table>';
        return html;
    }
    
    attachEventListeners() {
        // Scale selection
        this.element.querySelectorAll('.scale-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const scale = btn.dataset.scale;
                this.setScale(scale);
            });
        });
        
        // Damage converter
        this.element.querySelector('#convert-damage').addEventListener('click', () => {
            this.calculateConversion();
        });
        
        // Auto-update conversion when values change
        ['#damage-input', '#from-scale', '#to-scale'].forEach(selector => {
            this.element.querySelector(selector).addEventListener('change', () => {
                const resultDiv = this.element.querySelector('#conversion-result');
                if (resultDiv.innerHTML) {
                    this.calculateConversion();
                }
            });
        });
        
        // Enter key on damage input
        this.element.querySelector('#damage-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.calculateConversion();
            }
        });
    }
    
    setScale(scaleName) {
        if (!this.scales[scaleName]) return;
        
        const previousScale = this.currentScale;
        this.currentScale = scaleName;
        
        // Update UI
        this.element.querySelectorAll('.scale-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.scale === scaleName);
        });
        
        // Update scale info
        const infoDiv = this.element.querySelector('.scale-info');
        if (infoDiv) {
            infoDiv.innerHTML = this.renderScaleInfo(scaleName);
        }
        
        // Update converter default
        const fromSelect = this.element.querySelector('#from-scale');
        if (fromSelect) {
            fromSelect.value = scaleName;
        }
        
        // Emit event
        if (this.eventBus) {
            this.eventBus.emit('scale-changed', {
                previous: previousScale,
                current: scaleName,
                multiplier: this.scales[scaleName].multiplier
            });
        }
    }
    
    calculateConversion() {
        const damage = parseFloat(this.element.querySelector('#damage-input').value) || 0;
        const fromScale = this.element.querySelector('#from-scale').value;
        const toScale = this.element.querySelector('#to-scale').value;
        
        const scaledDamage = this.convertDamage(damage, fromScale, toScale);
        const multiplier = this.getScaleMultiplier(fromScale, toScale);
        
        const resultDiv = this.element.querySelector('#conversion-result');
        
        // Determine effect description
        let effectDesc = '';
        if (multiplier > 1) {
            effectDesc = 'devastating';
            if (multiplier >= 100) effectDesc = 'apocalyptic';
            else if (multiplier >= 10) effectDesc = 'catastrophic';
        } else if (multiplier < 1) {
            effectDesc = 'minimal';
            if (multiplier <= 0.01) effectDesc = 'negligible';
            else if (multiplier <= 0.1) effectDesc = 'reduced';
        } else {
            effectDesc = 'normal';
        }
        
        resultDiv.innerHTML = `
            <div class="result-display ${multiplier > 1 ? 'scale-up' : multiplier < 1 ? 'scale-down' : ''}">
                <div class="result-main">
                    <span class="original-damage">${damage}</span>
                    <span class="result-arrow">→</span>
                    <span class="scaled-damage">${scaledDamage}</span>
                </div>
                <div class="result-details">
                    <span class="multiplier-display">Multiplier: ×${multiplier}</span>
                    <span class="effect-desc">Effect: ${effectDesc}</span>
                </div>
                <div class="result-explanation">
                    ${fromScale} attacking ${toScale}: 
                    ${multiplier > 1 ? 'Lower scale attacks higher (multiply damage)' : 
                      multiplier < 1 ? 'Higher scale attacks lower (divide damage)' : 
                      'Same scale (no modification)'}
                </div>
            </div>
        `;
    }
    
    convertDamage(damage, fromScale, toScale) {
        const multiplier = this.getScaleMultiplier(fromScale, toScale);
        return Math.round(damage * multiplier * 10) / 10; // Round to 1 decimal
    }
    
    getScaleMultiplier(fromScale, toScale) {
        const from = this.scales[fromScale];
        const to = this.scales[toScale];
        
        if (!from || !to) return 1;
        
        // If attacking higher scale, divide
        // If attacking lower scale, multiply
        if (from.multiplier < to.multiplier) {
            return from.multiplier / to.multiplier;
        } else if (from.multiplier > to.multiplier) {
            return from.multiplier / to.multiplier;
        }
        
        return 1;
    }
    
    // Public API
    getCurrentScale() {
        return this.currentScale;
    }
    
    getScaleInfo(scaleName) {
        return this.scales[scaleName] || null;
    }
    
    getScales() {
        return Object.keys(this.scales);
    }
    
    calculateScaledValue(value, fromScale, toScale) {
        return this.convertDamage(value, fromScale, toScale);
    }
    
    // Get appropriate scale for an entity based on size/type
    suggestScale(entityType) {
        const suggestions = {
            'person': 'Personal',
            'human': 'Personal',
            'robot': 'Personal',
            'car': 'Vehicle',
            'tank': 'Vehicle',
            'mech': 'Vehicle',
            'fighter': 'Starship',
            'shuttle': 'Starship',
            'transport': 'Starship',
            'cruiser': 'Capital',
            'battleship': 'Capital',
            'station': 'Capital'
        };
        
        const type = entityType.toLowerCase();
        for (const [key, scale] of Object.entries(suggestions)) {
            if (type.includes(key)) {
                return scale;
            }
        }
        
        return 'Personal'; // Default
    }
}