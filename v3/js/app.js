/**
 * 대장간 V3 - Mobile-First App Logic
 */

class CuttingAppMobile {
    constructor() {
        this.currentStep = 1;
        this.parts = [];
        this.currentField = 'width';
        this.inputValues = { width: '', height: '', qty: '1' };
        this.kerf = 5;
        this.lastResult = null;
        this.currentBoardIndex = 0;
        this.renderer = null;
        this.init();
    }

    init() {
        this.bindEvents();
        this.updateStepIndicator();
    }

    bindEvents() {
        // Step Navigation
        document.getElementById('toStep2Btn')?.addEventListener('click', () => this.goToStep(2));
        document.getElementById('toStep1Btn')?.addEventListener('click', () => this.goToStep(1));
        document.getElementById('backToInputBtn')?.addEventListener('click', () => this.goToStep(2));

        // Preset Cards
        document.querySelectorAll('.preset-card:not(.add-preset)').forEach(card => {
            card.addEventListener('click', (e) => this.selectPreset(e.currentTarget));
        });

        // Input Fields
        document.querySelectorAll('.input-field').forEach(field => {
            field.addEventListener('click', (e) => this.selectField(e.currentTarget.dataset.field));
        });

        // Keypad
        document.querySelectorAll('.key').forEach(key => {
            key.addEventListener('click', (e) => this.handleKeyPress(e.currentTarget.dataset.key));
        });

        // Calculate
        document.getElementById('calculateBtn')?.addEventListener('click', () => this.calculate());

        // Clear All Parts
        document.getElementById('clearAllBtn')?.addEventListener('click', () => this.clearParts());

        // Board Navigation
        document.getElementById('prevBoard')?.addEventListener('click', () => this.navigateBoard(-1));
        document.getElementById('nextBoard')?.addEventListener('click', () => this.navigateBoard(1));

        // PDF Download
        document.getElementById('downloadPdfBtn')?.addEventListener('click', () => this.downloadPDF());

        // Share
        document.getElementById('shareBtn')?.addEventListener('click', () => this.share());
    }

    // ============================================
    // Step Navigation
    // ============================================

    goToStep(step) {
        const prevStep = this.currentStep;
        this.currentStep = step;

        // Update screen visibility
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active', 'prev');
        });

        const targetScreen = document.getElementById(`step${step}`);
        if (targetScreen) {
            targetScreen.classList.add('active');
        }

        // Mark previous screens
        for (let i = 1; i < step; i++) {
            const prevScreen = document.getElementById(`step${i}`);
            if (prevScreen) prevScreen.classList.add('prev');
        }

        this.updateStepIndicator();

        // Initialize Step 2: Reset input fields
        if (step === 2 && prevStep === 1) {
            this.resetInputFields();
        }
    }

    updateStepIndicator() {
        document.querySelectorAll('.step-indicator .step').forEach((stepEl, index) => {
            const stepNum = index + 1;
            stepEl.classList.remove('active', 'done');
            if (stepNum === this.currentStep) {
                stepEl.classList.add('active');
            } else if (stepNum < this.currentStep) {
                stepEl.classList.add('done');
            }
        });
    }

    // ============================================
    // Step 1: Settings
    // ============================================

    selectPreset(card) {
        // Remove active from all
        document.querySelectorAll('.preset-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');

        const w = card.dataset.w;
        const h = card.dataset.h;
        const t = card.dataset.t;
        const k = card.dataset.k;

        // Update hidden inputs
        document.getElementById('boardWidth').value = w;
        document.getElementById('boardHeight').value = h;
        document.getElementById('boardThickness').value = t;
        document.getElementById('kerfInput').value = k;
        this.kerf = parseInt(k);

        // Update display
        document.getElementById('displayBoardSize').textContent = `${w} × ${h} mm`;
        document.getElementById('displayThickness').textContent = `${t} mm`;
        document.getElementById('displayKerf').textContent = `${k} mm`;
    }

    // ============================================
    // Step 2: Parts Input
    // ============================================

    selectField(fieldName) {
        this.currentField = fieldName;
        document.querySelectorAll('.input-field').forEach(f => f.classList.remove('active'));
        document.querySelector(`.input-field[data-field="${fieldName}"]`)?.classList.add('active');
    }

    handleKeyPress(key) {
        const fieldMap = { width: 'inputWidth', height: 'inputHeight', qty: 'inputQty' };
        const displayEl = document.getElementById(fieldMap[this.currentField]);
        let currentValue = this.inputValues[this.currentField];

        switch (key) {
            case 'C':
                // Clear current field
                this.inputValues[this.currentField] = '';
                displayEl.textContent = '-';
                break;

            case '←':
                // Backspace
                if (currentValue.length > 0) {
                    this.inputValues[this.currentField] = currentValue.slice(0, -1);
                    displayEl.textContent = this.inputValues[this.currentField] || '-';
                }
                break;

            case '+50':
            case '+100':
                // Add value
                const addValue = parseInt(key.replace('+', ''));
                const current = parseInt(currentValue) || 0;
                this.inputValues[this.currentField] = String(current + addValue);
                displayEl.textContent = this.inputValues[this.currentField];
                break;

            case 'next':
                this.handleNext();
                break;

            case '00':
                // Add double zero
                if (currentValue.length > 0 && currentValue !== '0') {
                    this.inputValues[this.currentField] = currentValue + '00';
                    displayEl.textContent = this.inputValues[this.currentField];
                }
                break;

            default:
                // Digit input
                if (currentValue === '' && key === '0') return; // No leading zero
                this.inputValues[this.currentField] = currentValue + key;
                displayEl.textContent = this.inputValues[this.currentField];
                break;
        }

        // Update next button text
        this.updateNextButtonText();
    }

    handleNext() {
        const fieldOrder = ['width', 'height', 'qty'];
        const currentIndex = fieldOrder.indexOf(this.currentField);

        if (currentIndex < fieldOrder.length - 1) {
            // Move to next field
            this.selectField(fieldOrder[currentIndex + 1]);
        } else {
            // Add part
            this.addPart();
        }
    }

    updateNextButtonText() {
        const btn = document.getElementById('keyNext');
        if (!btn) return;

        const fieldOrder = ['width', 'height', 'qty'];
        const currentIndex = fieldOrder.indexOf(this.currentField);

        if (currentIndex < fieldOrder.length - 1) {
            btn.textContent = '다음';
        } else {
            btn.textContent = '+ 추가';
        }
    }

    addPart() {
        const w = parseInt(this.inputValues.width);
        const h = parseInt(this.inputValues.height);
        const qty = parseInt(this.inputValues.qty) || 1;

        if (!w || !h || w <= 0 || h <= 0) {
            this.showToast('가로와 세로를 입력하세요', 'error');
            return;
        }

        const rotatable = document.getElementById('partRotatable')?.checked ?? true;

        this.parts.push({ w, h, qty, rotatable });
        this.renderPartsList();
        this.resetInputFields();
        this.showToast(`${w}×${h} ×${qty} 추가됨`, 'success');
    }

    resetInputFields() {
        this.inputValues = { width: '', height: '', qty: '1' };
        document.getElementById('inputWidth').textContent = '-';
        document.getElementById('inputHeight').textContent = '-';
        document.getElementById('inputQty').textContent = '1';
        this.selectField('width');
    }

    renderPartsList() {
        const container = document.getElementById('partsList');
        if (!container) return;

        container.innerHTML = this.parts.map((part, index) => `
            <div class="part-item">
                <span class="part-info">
                    ${part.w}×${part.h}
                    <span class="part-qty">×${part.qty}</span>
                </span>
                <button class="part-delete" onclick="app.removePart(${index})">×</button>
            </div>
        `).join('');

        const totalParts = this.parts.reduce((sum, p) => sum + p.qty, 0);
        document.getElementById('partsCount').textContent = `부품 ${totalParts}개`;
    }

    removePart(index) {
        this.parts.splice(index, 1);
        this.renderPartsList();
    }

    clearParts() {
        this.parts = [];
        this.renderPartsList();
    }

    // ============================================
    // Step 3: Calculate & Results
    // ============================================

    calculate() {
        if (this.parts.length === 0) {
            this.showToast('부품을 추가해주세요', 'error');
            return;
        }

        const boardW = parseInt(document.getElementById('boardWidth').value);
        const boardH = parseInt(document.getElementById('boardHeight').value);
        const thickness = parseInt(document.getElementById('boardThickness').value);
        const preCutting = document.getElementById('preCutting')?.checked ?? false;

        // Expand parts by qty
        const expandedParts = [];
        this.parts.forEach((p, i) => {
            for (let j = 0; j < p.qty; j++) {
                expandedParts.push({
                    w: p.w,
                    h: p.h,
                    rotatable: p.rotatable,
                    id: `${i}-${j}`
                });
            }
        });

        // Use packer
        const packer = new GrainAwareBinPacker(boardW, boardH, this.kerf);
        const result = packer.pack(expandedParts);

        this.lastResult = result;
        this.currentBoardIndex = 0;

        // Calculate stats
        const totalCuts = result.bins.reduce((sum, bin) => sum + (bin.cuts || 0), 0);
        const cost = this.calculateCuttingCost(thickness, totalCuts, preCutting, result.bins.length);
        const efficiency = result.efficiency || 0;

        // Update UI
        document.getElementById('statCost').textContent = cost.toLocaleString() + '원';
        document.getElementById('statCuts').textContent = totalCuts + '회';
        document.getElementById('statBoards').textContent = result.bins.length + '장';
        document.getElementById('statEfficiency').textContent = efficiency.toFixed(1) + '%';

        // Render canvas
        this.renderResult();

        // Go to Step 3
        this.goToStep(3);
    }

    calculateCuttingCost(thickness, totalCuts, isPreCut, binCount) {
        let costPerCut = 1000;
        if (thickness >= 13 && thickness <= 23) {
            costPerCut = 1500;
        } else if (thickness >= 24) {
            costPerCut = 2000;
        }
        return totalCuts * costPerCut;
    }

    renderResult() {
        if (!this.lastResult || this.lastResult.bins.length === 0) return;

        const bin = this.lastResult.bins[this.currentBoardIndex];
        const canvas = document.getElementById('resultCanvas');
        if (!canvas) return;

        // Initialize renderer if needed
        if (!this.renderer) {
            this.renderer = new CuttingRenderer(canvas);
        }

        const boardW = parseInt(document.getElementById('boardWidth').value);
        const boardH = parseInt(document.getElementById('boardHeight').value);

        this.renderer.render(bin, boardW, boardH, this.kerf);

        // Update indicator
        document.getElementById('boardIndicator').textContent = 
            `${this.currentBoardIndex + 1}/${this.lastResult.bins.length}`;
    }

    navigateBoard(delta) {
        if (!this.lastResult) return;
        const newIndex = this.currentBoardIndex + delta;
        if (newIndex >= 0 && newIndex < this.lastResult.bins.length) {
            this.currentBoardIndex = newIndex;
            this.renderResult();
        }
    }

    // ============================================
    // Export & Share
    // ============================================

    downloadPDF() {
        this.showToast('PDF 생성 중...', 'info');
        // PDF generation logic would go here
        // Using existing jsPDF logic from v2/app.js
    }

    share() {
        if (navigator.share) {
            navigator.share({
                title: '대장간 재단 결과',
                text: `예상 비용: ${document.getElementById('statCost').textContent}`,
                url: window.location.href
            }).catch(() => {});
        } else {
            this.showToast('공유 기능을 지원하지 않습니다', 'error');
        }
    }

    // ============================================
    // Utilities
    // ============================================

    showToast(message, type = 'info') {
        // Simple toast implementation
        const existing = document.querySelector('.toast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            bottom: 100px;
            left: 50%;
            transform: translateX(-50%);
            background: ${type === 'error' ? '#FF6B6B' : type === 'success' ? '#00D4AA' : '#2D2D2D'};
            color: ${type === 'info' ? '#F5F5F5' : '#1A1A1A'};
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            z-index: 9999;
            animation: fadeInUp 0.3s ease;
        `;

        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2500);
    }
}

// Initialize App
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new CuttingAppMobile();
});
