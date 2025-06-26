/**
 * DiceRoller Component
 * 
 * Handles all dice rolling for Cosmos Engine's 2d10 system
 * Features:
 * - Basic 2d10 rolls with modifiers
 * - Advantage/Disadvantage (3d10 keep highest/lowest 2)
 * - Success degree calculation
 * - Roll history with persistence
 * - Audio feedback and animations
 */

export class DiceRoller {
    constructor(config, eventBus) {
        this.config = config;
        this.eventBus = eventBus;
        this.history = [];
        this.maxHistory = config.performance.maxHistoryItems || 100;
        this.element = null;
        this.audioEnabled = config.ui.soundEffects;
        
        // Bind methods
        this.roll = this.roll.bind(this);
        this.clearHistory = this.clearHistory.bind(this);
    }
    
    init(container) {
        this.element = container;
        this.loadHistory();
        this.render();
        this.attachEventListeners();
        return this;
    }
    
    render() {
        this.element.innerHTML = `
            <div class="dice-roller">
                <div class="dice-controls">
                    <div class="dice-formula">
                        <label for="dice-modifier">Modifier:</label>
                        <input type="number" id="dice-modifier" class="dice-modifier" value="0" min="-20" max="20">
                        
                        <label for="dice-tn">Target Number:</label>
                        <input type="number" id="dice-tn" class="dice-tn" value="11" min="2" max="30">
                    </div>
                    
                    <div class="dice-mode">
                        <label>
                            <input type="radio" name="dice-mode" value="normal" checked>
                            Normal (2d10)
                        </label>
                        <label>
                            <input type="radio" name="dice-mode" value="advantage">
                            Advantage (3d10kh2)
                        </label>
                        <label>
                            <input type="radio" name="dice-mode" value="disadvantage">
                            Disadvantage (3d10kl2)
                        </label>
                    </div>
                    
                    <div class="dice-actions">
                        <button id="roll-dice" class="btn btn-primary">
                            Roll Dice
                        </button>
                        <button id="clear-history" class="btn btn-secondary">
                            Clear History
                        </button>
                    </div>
                </div>
                
                <div class="dice-display">
                    <div id="dice-result" class="dice-result">
                        <div class="dice-animation" id="dice-animation">
                            <span class="die" id="die1">-</span>
                            <span class="die" id="die2">-</span>
                            <span class="die extra" id="die3" style="display: none;">-</span>
                        </div>
                        <div class="dice-total" id="dice-total">
                            Click "Roll Dice" to begin
                        </div>
                    </div>
                </div>
                
                <div class="dice-history">
                    <h3>Roll History</h3>
                    <div id="history-list" class="history-list"></div>
                </div>
            </div>
        `;
        
        this.updateHistoryDisplay();
    }
    
    attachEventListeners() {
        // Roll button
        const rollBtn = this.element.querySelector('#roll-dice');
        rollBtn.addEventListener('click', () => this.performRoll());
        
        // Clear history button
        const clearBtn = this.element.querySelector('#clear-history');
        clearBtn.addEventListener('click', this.clearHistory);
        
        // Enter key on inputs
        const inputs = this.element.querySelectorAll('input[type="number"]');
        inputs.forEach(input => {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.performRoll();
            });
        });
        
        // Mode change
        const modeInputs = this.element.querySelectorAll('input[name="dice-mode"]');
        modeInputs.forEach(input => {
            input.addEventListener('change', () => this.updateDiceDisplay());
        });
    }
    
    performRoll() {
        const modifier = parseInt(this.element.querySelector('#dice-modifier').value) || 0;
        const targetNumber = parseInt(this.element.querySelector('#dice-tn').value) || 11;
        const mode = this.element.querySelector('input[name="dice-mode"]:checked').value;
        
        const result = this.roll(modifier, targetNumber, mode);
        this.addToHistory(result);
        this.displayResult(result);
        
        if (this.audioEnabled) {
            this.playRollSound();
        }
    }
    
    roll(modifier = 0, targetNumber = 11, mode = 'normal') {
        let dice = [];
        let keptDice = [];
        
        // Roll the dice
        switch (mode) {
            case 'advantage':
                dice = [this.rollDie(), this.rollDie(), this.rollDie()];
                dice.sort((a, b) => b - a); // Sort descending
                keptDice = dice.slice(0, 2); // Keep highest 2
                break;
                
            case 'disadvantage':
                dice = [this.rollDie(), this.rollDie(), this.rollDie()];
                dice.sort((a, b) => a - b); // Sort ascending
                keptDice = dice.slice(0, 2); // Keep lowest 2
                break;
                
            default: // normal
                dice = [this.rollDie(), this.rollDie()];
                keptDice = dice;
        }
        
        const naturalTotal = keptDice.reduce((sum, die) => sum + die, 0);
        const total = naturalTotal + modifier;
        
        // Check for critical success/failure
        const isCritical = naturalTotal === this.config.dice.criticalSuccess;
        const isFumble = naturalTotal === this.config.dice.criticalFailure;
        
        // Calculate success
        const success = total >= targetNumber;
        const margin = total - targetNumber;
        
        // Determine success degree
        let degree = 'failure';
        if (success) {
            if (margin >= 10) degree = 'legendary';
            else if (margin >= 6) degree = 'critical';
            else if (margin >= 3) degree = 'solid';
            else degree = 'marginal';
        } else {
            if (margin <= -10) degree = 'catastrophic';
            else if (margin <= -6) degree = 'critical-failure';
            else if (margin <= -3) degree = 'clear-failure';
            else degree = 'marginal-failure';
        }
        
        const result = {
            dice,
            keptDice,
            naturalTotal,
            modifier,
            total,
            targetNumber,
            success,
            margin,
            degree,
            isCritical,
            isFumble,
            mode,
            timestamp: Date.now()
        };
        
        // Emit events if eventBus is available
        if (this.eventBus) {
            this.eventBus.emit('dice-rolled', result);
            
            if (isCritical) {
                this.eventBus.emit('critical-success', result);
            }
            if (isFumble) {
                this.eventBus.emit('critical-failure', result);
            }
        }
        
        return result;
    }
    
    rollDie() {
        return Math.floor(Math.random() * 10) + 1;
    }
    
    displayResult(result) {
        // Animate dice
        const die1 = this.element.querySelector('#die1');
        const die2 = this.element.querySelector('#die2');
        const die3 = this.element.querySelector('#die3');
        const diceAnimation = this.element.querySelector('#dice-animation');
        
        // Show/hide third die based on mode
        if (result.mode !== 'normal') {
            die3.style.display = 'inline-block';
        } else {
            die3.style.display = 'none';
        }
        
        // Add rolling animation
        diceAnimation.classList.add('rolling');
        
        // Simulate rolling animation
        let rolls = 0;
        const rollInterval = setInterval(() => {
            die1.textContent = this.rollDie();
            die2.textContent = this.rollDie();
            if (result.mode !== 'normal') {
                die3.textContent = this.rollDie();
            }
            rolls++;
            
            if (rolls > 10) {
                clearInterval(rollInterval);
                
                // Show final results
                die1.textContent = result.dice[0];
                die2.textContent = result.dice[1];
                if (result.dice[2]) {
                    die3.textContent = result.dice[2];
                }
                
                // Mark kept dice
                const allDice = [die1, die2, die3];
                allDice.forEach((die, index) => {
                    die.classList.remove('kept', 'dropped');
                    if (result.dice[index]) {
                        if (result.keptDice.includes(result.dice[index])) {
                            die.classList.add('kept');
                        } else {
                            die.classList.add('dropped');
                        }
                    }
                });
                
                // Remove rolling animation
                diceAnimation.classList.remove('rolling');
                
                // Display total and result
                this.updateTotalDisplay(result);
            }
        }, 50);
    }
    
    updateTotalDisplay(result) {
        const totalDiv = this.element.querySelector('#dice-total');
        
        let html = `
            <div class="result-main ${result.success ? 'success' : 'failure'}">
                <span class="result-total">${result.total}</span>
                <span class="result-formula">
                    (${result.naturalTotal}${result.modifier >= 0 ? '+' : ''}${result.modifier !== 0 ? result.modifier : ''})
                </span>
            </div>
            <div class="result-details">
                <span class="result-vs">vs TN ${result.targetNumber}</span>
                <span class="result-margin">${result.margin >= 0 ? '+' : ''}${result.margin}</span>
            </div>
            <div class="result-degree degree-${result.degree}">
                ${this.formatDegree(result.degree)}
                ${result.isCritical ? '<span class="critical">Critical!</span>' : ''}
                ${result.isFumble ? '<span class="fumble">Fumble!</span>' : ''}
            </div>
        `;
        
        totalDiv.innerHTML = html;
        totalDiv.className = `dice-total ${result.success ? 'success' : 'failure'}`;
    }
    
    formatDegree(degree) {
        const degreeMap = {
            'legendary': 'Legendary Success',
            'critical': 'Critical Success',
            'solid': 'Solid Success',
            'marginal': 'Marginal Success',
            'marginal-failure': 'Marginal Failure',
            'clear-failure': 'Clear Failure',
            'critical-failure': 'Critical Failure',
            'catastrophic': 'Catastrophic Failure'
        };
        
        return degreeMap[degree] || degree;
    }
    
    updateDiceDisplay() {
        const mode = this.element.querySelector('input[name="dice-mode"]:checked').value;
        const die3 = this.element.querySelector('#die3');
        
        if (mode !== 'normal') {
            die3.style.display = 'inline-block';
        } else {
            die3.style.display = 'none';
        }
    }
    
    addToHistory(result) {
        this.history.unshift(result);
        
        // Limit history size
        if (this.history.length > this.maxHistory) {
            this.history = this.history.slice(0, this.maxHistory);
        }
        
        this.saveHistory();
        this.updateHistoryDisplay();
    }
    
    updateHistoryDisplay() {
        const historyList = this.element.querySelector('#history-list');
        if (!historyList) return;
        
        if (this.history.length === 0) {
            historyList.innerHTML = '<p class="no-history">No rolls yet</p>';
            return;
        }
        
        const html = this.history.slice(0, 10).map((result, index) => `
            <div class="history-item ${result.success ? 'success' : 'failure'}">
                <span class="history-number">#${this.history.length - index}</span>
                <span class="history-roll">
                    ${result.keptDice.join('+')}${result.modifier !== 0 ? (result.modifier >= 0 ? '+' : '') + result.modifier : ''}
                    = ${result.total}
                </span>
                <span class="history-vs">vs ${result.targetNumber}</span>
                <span class="history-result">${result.margin >= 0 ? '+' : ''}${result.margin}</span>
                ${result.mode !== 'normal' ? `<span class="history-mode">${result.mode}</span>` : ''}
            </div>
        `).join('');
        
        historyList.innerHTML = html;
    }
    
    clearHistory() {
        if (confirm('Clear all roll history?')) {
            this.history = [];
            this.saveHistory();
            this.updateHistoryDisplay();
            
            // Reset display
            const totalDiv = this.element.querySelector('#dice-total');
            totalDiv.innerHTML = 'Click "Roll Dice" to begin';
            totalDiv.className = 'dice-total';
            
            // Reset dice display
            ['#die1', '#die2', '#die3'].forEach(id => {
                const die = this.element.querySelector(id);
                if (die) {
                    die.textContent = '-';
                    die.classList.remove('kept', 'dropped');
                }
            });
        }
    }
    
    saveHistory() {
        localStorage.setItem('cosmos-vtt-dice-history', JSON.stringify(this.history));
    }
    
    loadHistory() {
        const saved = localStorage.getItem('cosmos-vtt-dice-history');
        if (saved) {
            try {
                this.history = JSON.parse(saved);
            } catch (e) {
                console.error('Failed to load dice history:', e);
                this.history = [];
            }
        }
    }
    
    playRollSound() {
        // Simple audio feedback - could be enhanced with actual sound files
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.1);
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.1);
    }
    
    // Public API
    quickRoll(modifier = 0) {
        return this.roll(modifier);
    }
    
    getLastRoll() {
        return this.history[0] || null;
    }
    
    getHistory() {
        return [...this.history];
    }
}