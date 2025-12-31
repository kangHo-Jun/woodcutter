/**
 * 대장간 V3 - Mobile-First App Logic
 */

/* Removed WheelSelector class */

class CuttingAppMobile {
    constructor() {
        this.currentStep = 1;
        this.currentField = 'boardWidth'; // Start with board width
        this.inputValues = {
            boardWidth: '2400',
            boardHeight: '1220',
            width: '',
            height: '',
            qty: '1'
        };
        this.parts = [];
        this.currentStep = 1;
        this.currentField = 'boardWidth';
        this.currentBoardIndex = 0;
        this.pdfCurrentBoardIndex = 0;
        this.lastResult = null;
        this.kerf = 2; // Default kerf
        this.useGrain = false;
        this.renderer = null;
        this.pdfRenderer = null;
        this.step1Renderer = null;
        this.init();
    }

    init() {
        this.bindEvents();
        this.updateStepIndicator();
    }


    bindEvents() {
        // Global Navigation (Nav Items)
        ['navStep1', 'navStep2', 'navStep3'].forEach((id, idx) => {
            document.getElementById(id)?.addEventListener('click', () => {
                const step = idx + 1;
                if (step === 3 && this.parts.length === 0) {
                    this.showToast('부품을 먼저 추가해주세요', 'error');
                    return;
                }
                this.goToStep(step);
            });
        });

        // Step Navigation Buttons
        document.getElementById('toStep2Btn')?.addEventListener('click', () => this.goToStep(2));
        document.getElementById('toStep1Btn')?.addEventListener('click', () => this.goToStep(1));
        document.getElementById('backToInputBtn')?.addEventListener('click', () => this.goToStep(2));

        // Board Selection (Step 1)
        document.querySelectorAll('[data-board-field]').forEach(field => {
            field.addEventListener('click', (e) => this.selectField(e.currentTarget.dataset.boardField, true, true));
        });

        // Compact Input Boxes (Step 2)
        document.querySelectorAll('.input-box-compact[data-field]').forEach(box => {
            box.addEventListener('click', (e) => {
                this.selectField(e.currentTarget.dataset.field, false, true);
            });
        });

        // Grain Toggle (Step 1)
        document.getElementById('grainToggleStep1')?.addEventListener('click', () => this.toggleGrainStep1());

        // Grain Toggle (Step 2)
        document.getElementById('grainToggle')?.addEventListener('click', () => this.toggleGrain());

        // Keypad Keys (with haptic feedback)
        document.querySelectorAll('.key').forEach(key => {
            key.addEventListener('click', (e) => {
                this.haptic('light');
                this.handleKeyPress(e.currentTarget.dataset.key);
            });
        });

        // Keypad Done Button
        document.getElementById('keypadDone')?.addEventListener('click', () => this.setKeypadVisibility(false));
        document.getElementById('keypadOverlay')?.addEventListener('click', (e) => {
            if (e.target.id === 'keypadOverlay') this.setKeypadVisibility(false);
        });

        // Calculate
        document.getElementById('calculateBtn')?.addEventListener('click', () => this.calculate());

        // Clear All Parts
        document.getElementById('clearAllBtn')?.addEventListener('click', () => this.clearParts());

        // Board Navigation
        document.getElementById('prevBoard')?.addEventListener('click', () => this.navigateBoard(-1));
        document.getElementById('nextBoard')?.addEventListener('click', () => this.navigateBoard(1));

        // PDF Modal paging
        document.getElementById('pdfPrevBoard')?.addEventListener('click', () => this.navigatePdfBoard(-1));
        document.getElementById('pdfNextBoard')?.addEventListener('click', () => this.navigatePdfBoard(1));
        document.getElementById('pdfCloseBtn')?.addEventListener('click', () => this.closePdfModal());
        document.getElementById('pdfDownloadBtn')?.addEventListener('click', () => this.downloadPDF());
        document.getElementById('pdfShareBtn')?.addEventListener('click', () => this.share());

        // PDF Preview Modal
        document.getElementById('downloadPdfBtn')?.addEventListener('click', () => this.openPdfModal());
        document.getElementById('pdfModal')?.addEventListener('click', (e) => {
            if (e.target.id === 'pdfModal') this.closePdfModal();
        });

        // Share
        document.getElementById('shareBtn')?.addEventListener('click', () => this.share());

        // Step 1: Settings Sync & Preview
        ['boardWidth', 'boardHeight'].forEach(id => {
            document.getElementById(id)?.addEventListener('input', () => {
                this.updateSettingsSummary();
                this.updateStep1Preview();
            });
        });

        // Step 2: Add Part Button
        document.getElementById('addPartBtn')?.addEventListener('click', () => this.addPart());

        // UI2: Zoom Controls
        this.initZoomHandlers('.result-canvas-wrapper', 'renderer', this.renderResult.bind(this));
        this.initZoomHandlers('.pdf-preview-wrapper', 'pdfRenderer', this.updatePdfPreview.bind(this));
    }

    initZoomHandlers(wrapperSelector, rendererName, renderFn) {
        const wrapper = document.querySelector(wrapperSelector);
        if (!wrapper) return;

        let isDragging = false;
        let lastX, lastY;
        let initialDistance = null;
        let lastTouchTime = 0;

        const handleZoom = (delta) => {
            const renderer = this[rendererName];
            if (!renderer) return;
            renderer.zoom = Math.min(Math.max(0.5, renderer.zoom + delta), 10);
            renderFn();
        };

        // Wheel Zoom
        wrapper.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY < 0 ? 0.2 : -0.2;
            handleZoom(delta);
        }, { passive: false });

        // Mouse Pan
        wrapper.addEventListener('mousedown', (e) => {
            isDragging = true;
            lastX = e.clientX;
            lastY = e.clientY;
        });

        window.addEventListener('mousemove', (e) => {
            if (!isDragging || !this[rendererName]) return;
            const dx = e.clientX - lastX;
            const dy = e.clientY - lastY;
            this[rendererName].offsetX += dx;
            this[rendererName].offsetY += dy;
            lastX = e.clientX;
            lastY = e.clientY;
            renderFn();
        });

        window.addEventListener('mouseup', () => isDragging = false);

        // Touch Gestures (Pinch & Pan)
        wrapper.addEventListener('touchstart', (e) => {
            const renderer = this[rendererName];
            if (!renderer) return;

            if (e.touches.length === 1) {
                isDragging = true;
                lastX = e.touches[0].clientX;
                lastY = e.touches[0].clientY;

                const now = Date.now();
                if (now - lastTouchTime < 300) {
                    renderer.zoom = renderer.zoom > 1.5 ? 1.0 : 3.0;
                    renderer.offsetX = 0;
                    renderer.offsetY = 0;
                    renderFn();
                }
                lastTouchTime = now;
            } else if (e.touches.length === 2) {
                isDragging = false;
                initialDistance = Math.hypot(
                    e.touches[0].clientX - e.touches[1].clientX,
                    e.touches[0].clientY - e.touches[1].clientY
                );
            }
        }, { passive: true });

        wrapper.addEventListener('touchmove', (e) => {
            const renderer = this[rendererName];
            if (!renderer) return;

            if (e.touches.length === 1 && isDragging) {
                const dx = e.touches[0].clientX - lastX;
                const dy = e.touches[0].clientY - lastY;
                renderer.offsetX += dx;
                renderer.offsetY += dy;
                lastX = e.touches[0].clientX;
                lastY = e.touches[0].clientY;
                renderFn();
            } else if (e.touches.length === 2 && initialDistance !== null) {
                const currentDistance = Math.hypot(
                    e.touches[0].clientX - e.touches[1].clientX,
                    e.touches[0].clientY - e.touches[1].clientY
                );
                const delta = (currentDistance - initialDistance) * 0.01;
                handleZoom(delta);
                initialDistance = currentDistance;
            }
        }, { passive: true });

        wrapper.addEventListener('touchend', () => {
            isDragging = false;
            initialDistance = null;
        });
    }

    updateZoomUI() {
        const zoomLevelEl = document.getElementById('zoomLevel');
        if (zoomLevelEl && this.renderer) {
            zoomLevelEl.textContent = `${Math.round(this.renderer.zoom * 100)}%`;
        }
    }

    // ============================================
    // Step Navigation
    // ============================================

    goToStep(step) {
        this.currentStep = step;

        // Reset scroll position and other states if needed
        if (step === 3) {
            this.pdfCurrentBoardIndex = 0;
        }

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

        // Initialize v4 specific step logic
        if (step === 1) {
            this.setKeypadVisibility(false);
            document.querySelectorAll('.input-field').forEach(f => f.classList.remove('active'));
            this.currentField = 'boardWidth';
            this.updateStep1Preview();
        }

        if (step === 2) {
            this.setKeypadVisibility(false);
            this.updateGrainUI();
        }

        if (step === 3) {
            this.setKeypadVisibility(false);
        }
    }

    updateStepIndicator() {
        document.querySelectorAll('.nav-item').forEach((navEl, index) => {
            const stepNum = index + 1;
            navEl.classList.toggle('active', stepNum === this.currentStep);
        });
    }

    // Step 1: Logic
    toggleGrainStep1() {
        this.useGrain = !this.useGrain;
        const checkbox = document.getElementById('grainCheckboxStep1');
        if (checkbox) checkbox.checked = this.useGrain;

        // Sync with Step 2 grain if applicable
        const step2Checkbox = document.getElementById('useGrain');
        if (step2Checkbox) step2Checkbox.checked = this.useGrain;

        this.haptic('light');
        this.updateStep1Preview();
    }

    updateStep1Preview() {
        if (this.currentStep !== 1) return;

        const canvas = document.getElementById('step1PreviewCanvas');
        const placeholder = document.querySelector('.preview-placeholder');
        if (!canvas) return;

        const w = parseInt(document.getElementById('boardWidth').value) || 2440;
        const h = parseInt(document.getElementById('boardHeight').value) || 1220;

        if (!this.step1Renderer) {
            this.step1Renderer = new CuttingRenderer('step1PreviewCanvas');
        }

        // Show canvas, hide placeholder
        canvas.classList.remove('hidden');
        if (placeholder) placeholder.classList.add('hidden');

        // Simple render of just the board
        this.step1Renderer.render(w, h, [], 0);
    }

    changeQty(delta) {
        let current = parseInt(this.inputValues.qty) || 1;
        current += delta;
        if (current < 1) current = 1;
        if (current > 100) current = 100;
        this.inputValues.qty = String(current);
        this.updateInputField('qty', current);
    }

    updateSettingsSummary() {
        const w = document.getElementById('boardWidth').value;
        const h = document.getElementById('boardHeight').value;
        const t = document.getElementById('boardThickness').value;
        const k = document.getElementById('kerfInput').value;

        document.getElementById('displayBoardSize').textContent = `${w} × ${h} mm`;
        document.getElementById('displayThickness').textContent = `${t} mm`;
        document.getElementById('displayKerf').textContent = `${k} mm`;

        // Also update home screen title if it matches default
        const title = document.querySelector('.home-title');
        if (title) title.textContent = `합판 ${t}T`;
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

    selectField(field, isBoard = false, showKeypad = true) {
        this.currentField = field;

        // Remove active from all
        document.querySelectorAll('.input-field, .input-box, .input-box-compact').forEach(f => f.classList.remove('active'));

        // Add active to correct one
        const selector = isBoard ? `[data-board-field="${field}"]` : `[data-field="${field}"]`;
        const fieldEl = document.querySelector(selector);
        if (fieldEl) fieldEl.classList.add('active');


        // Clear field on click as requested
        this.inputValues[field] = '';
        this.updateInputField(field, '');

        // Handle Keypad Visibility
        if (showKeypad) {
            this.setKeypadVisibility(true);

            // Update Keypad Header
            const labels = { width: '가로', height: '세로', qty: '개수' };
            const label = labels[field] || '값 입력';
            const labelEl = document.getElementById('keypadFieldLabel');
            if (labelEl) labelEl.textContent = label;
            this.updateKeypadPreview('');
        }
    }

    setKeypadVisibility(visible) {
        const overlay = document.getElementById('keypadOverlay');

        if (visible) {
            overlay?.classList.remove('hidden');
            document.querySelectorAll('.screen').forEach(s => s.classList.add('has-keypad'));
            // Center active box view if needed
        } else {
            overlay?.classList.add('hidden');
            document.querySelectorAll('.screen').forEach(s => s.classList.remove('has-keypad'));
            // Remove selection active state when closing
            document.querySelectorAll('.input-box-compact').forEach(f => f.classList.remove('active'));
        }
    }

    updateKeypadPreview(value) {
        const previewEl = document.getElementById('keypadPreview');
        if (previewEl) {
            previewEl.textContent = value || '0';
        }
    }

    updateInputField(field, value) {
        if (this.currentStep === 1) {
            // Handle board fields in Step 1
            if (field === 'boardWidth') {
                const displayEl = document.getElementById('displayBoardWidth');
                if (displayEl) displayEl.textContent = value || '0';
                const realEl = document.getElementById('boardWidth');
                if (realEl) realEl.value = value;
            } else if (field === 'boardHeight') {
                const displayEl = document.getElementById('displayBoardHeight');
                if (displayEl) displayEl.textContent = value || '0';
                const realEl = document.getElementById('boardHeight');
                if (realEl) realEl.value = value;
            }
        } else {
            const displayId = `input${field.charAt(0).toUpperCase() + field.slice(1)}`;
            const element = document.getElementById(displayId);
            if (element) {
                element.textContent = value || '0';

                // Oversize Validation (v4)
                if (field === 'width' || field === 'height') {
                    const boardLimit = field === 'width' ?
                        parseInt(document.getElementById('boardWidth').value) :
                        parseInt(document.getElementById('boardHeight').value);

                    const val = parseInt(value);
                    const container = element.closest('.input-box-compact');

                    if (val > boardLimit) {
                        container?.classList.add('warning');
                        // Show warning text if not exists
                        let warningEl = container.querySelector('.warning-text');
                        if (!warningEl) {
                            warningEl = document.createElement('span');
                            warningEl.className = 'warning-text';
                            container.appendChild(warningEl);
                        }
                        warningEl.textContent = `⚠️ 원판(${boardLimit})보다 큼`;
                    } else {
                        container?.classList.remove('warning');
                        container.querySelector('.warning-text')?.remove();
                    }
                }
            }
        }
    }

    handleKeyPress(key) {
        let currentValue = this.inputValues[this.currentField];

        switch (key) {
            case '←':
                if (currentValue.length > 0) {
                    this.inputValues[this.currentField] = currentValue.slice(0, -1);
                }
                break;

            case 'done':
                // UI4: Auto-transition width → height → qty → close
                if (this.currentStep === 1) {
                    if (this.currentField === 'boardWidth') {
                        this.selectField('boardHeight', true, true);
                    } else {
                        this.setKeypadVisibility(false);
                    }
                } else if (this.currentStep === 2) {
                    if (this.currentField === 'width') {
                        this.selectField('height', false, true);
                    } else if (this.currentField === 'height') {
                        this.selectField('qty', false, true);
                    } else {
                        this.setKeypadVisibility(false);
                    }
                } else {
                    this.setKeypadVisibility(false);
                }
                return;

            default:
                // Number input
                if (!this.inputValues[this.currentField] || this.inputValues[this.currentField] === '0') {
                    this.inputValues[this.currentField] = key;
                } else {
                    this.inputValues[this.currentField] += key;
                }
                break;
        }

        // Update display and preview
        this.updateInputField(this.currentField, this.inputValues[this.currentField]);
        this.updateKeypadPreview(this.inputValues[this.currentField]);

        // Validation warning for Step 2 dimensions
        if (this.currentStep === 2 && (this.currentField === 'width' || this.currentField === 'height')) {
            this.checkInputValidation();
        }
    }

    checkInputValidation() {
        const boardW = parseInt(document.getElementById('boardWidth').value);
        const boardH = parseInt(document.getElementById('boardHeight').value);
        const inputW = parseInt(this.inputValues.width) || 0;
        const inputH = parseInt(this.inputValues.height) || 0;

        const preview = document.getElementById('keypadPreview');
        const warning = document.getElementById('validationWarning');

        let isInvalid = false;
        let message = '';

        if (this.currentField === 'width' && inputW > boardW) {
            isInvalid = true;
            message = `⚠️ 원판 가로(${boardW})보다 큼`;
        } else if (this.currentField === 'height' && inputH > boardH) {
            isInvalid = true;
            message = `⚠️ 원판 세로(${boardH})보다 큼`;
        }

        if (preview) {
            preview.classList.toggle('invalid', isInvalid);
        }

        if (warning) {
            warning.textContent = message;
            warning.classList.toggle('show', isInvalid);
        }
    }

    handleNext() {
        const fieldOrder = ['width', 'height', 'qty'];
        const currentIndex = fieldOrder.indexOf(this.currentField);

        if (currentIndex < fieldOrder.length - 1) {
            // Move to next field
            this.selectField(fieldOrder[currentIndex + 1], false, true);
        } else {
            // Add part
            this.addPart();
        }
    }

    updateNextButtonText() {
        const btn = document.getElementById('keyNext');
        if (!btn) return;

        if (this.currentStep === 1) {
            btn.textContent = this.currentField === 'boardHeight' ? '입력 완료' : '다음';
        } else {
            const fieldOrder = ['width', 'height'];
            const currentIndex = fieldOrder.indexOf(this.currentField);
            btn.textContent = currentIndex < fieldOrder.length - 1 ? '다음' : '추가하기';
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

        this.parts.push({ width: w, height: h, qty, rotatable });
        this.renderPartsList();
        this.resetInputFields();
        this.showToast(`${w}×${h} ×${qty} 추가됨`, 'success');
    }

    resetInputFields() {
        this.inputValues.width = '';
        this.inputValues.height = '';
        // Keep qty as is

        this.updateInputField('width', '');
        this.updateInputField('height', '');
        this.updateInputField('qty', this.inputValues.qty);
        // Select width but DO NOT OPEN KEYPAD (wait for user)
        this.selectField('width', false, false);
    }

    toggleGrain() {
        const checkbox = document.getElementById('partRotatable');
        if (!checkbox) return;

        // Toggle logic: checkbox.checked means rotatable (Grain OFF)
        // Card active means Grain ON (Not rotatable)
        const isRotatable = checkbox.checked;
        checkbox.checked = !isRotatable;
        this.useGrain = !checkbox.checked;

        // Sync Step 1
        const s1Checkbox = document.getElementById('grainCheckboxStep1');
        if (s1Checkbox) s1Checkbox.checked = this.useGrain;

        this.updateGrainUI();
    }

    updateGrainUI() {
        const checkbox = document.getElementById('partRotatable');
        const card = document.getElementById('grainToggle');
        const iconEl = card?.querySelector('.toggle-icon-mini');

        if (!checkbox || !card) return;

        if (checkbox.checked) {
            // Rotatable = Grain OFF (Free)
            card.classList.remove('active');
            if (iconEl) iconEl.textContent = '≡≡';
        } else {
            // Not Rotatable = Grain ON (Fixed)
            card.classList.add('active');
            if (iconEl) iconEl.textContent = '≡≡'; // Icon stays same, visual active handled by CSS
        }
    }

    renderPartsList() {
        const container = document.getElementById('partsList');
        if (!container) return;

        if (this.parts.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <span class="empty-state-icon">📦</span>
                    <span class="empty-state-text">아직 부품이 없습니다<br>아래에서 추가해주세요 ↓</span>
                </div>
            `;
        } else {
            container.innerHTML = this.parts.map((part, index) => `
                <div class="part-item-wrap">
                    <div class="part-item" data-index="${index}">
                        <span class="part-info">
                            ${part.width}×${part.height}
                            <span class="part-qty">×${part.qty}</span>
                        </span>
                        <div class="part-item-actions">
                            <button class="item-delete-btn" onclick="app.removePart(${index})">삭제</button>
                        </div>
                    </div>
                </div>
            `).join('');

            this.bindSwipeEvents();
        }

        const totalParts = this.parts.reduce((sum, p) => sum + p.qty, 0);
        document.getElementById('partsCount').textContent = `부품 목록 (${totalParts}개)`;
    }

    bindSwipeEvents() {
        document.querySelectorAll('.part-item').forEach(item => {
            let startX = 0;
            let currentX = 0;
            let isSwiping = false;

            item.addEventListener('touchstart', (e) => {
                startX = e.touches[0].clientX;
                item.style.transition = 'none';
                isSwiping = true;
            }, { passive: true });

            item.addEventListener('touchmove', (e) => {
                if (!isSwiping) return;
                currentX = e.touches[0].clientX;
                const diff = currentX - startX;

                // Only allow left swipe
                if (diff < 0) {
                    const translateX = Math.max(diff, -80);
                    item.style.transform = `translateX(${translateX}px)`;
                }
            }, { passive: true });

            item.addEventListener('touchend', () => {
                isSwiping = false;
                item.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
                const diff = currentX - startX;

                if (diff < -40) {
                    item.style.transform = 'translateX(-80px)';
                } else {
                    item.style.transform = 'translateX(0)';
                }
            });
        });
    }

    removePart(index) {
        const deleted = this.parts.splice(index, 1)[0];
        this.lastDeletedPart = { part: deleted, index: index };
        this.renderPartsList();
        this.showUndoToast(deleted);
    }

    showUndoToast(part) {
        const existing = document.querySelector('.undo-toast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.className = 'undo-toast';
        toast.innerHTML = `
            <span>${part.width}×${part.height} 삭제됨</span>
            <button class="undo-btn" onclick="app.undoDelete()">되돌리기</button>
        `;
        document.body.appendChild(toast);

        this.undoTimeout = setTimeout(() => {
            toast.remove();
            this.lastDeletedPart = null;
        }, 3000);
    }

    undoDelete() {
        if (!this.lastDeletedPart) return;

        clearTimeout(this.undoTimeout);
        const { part, index } = this.lastDeletedPart;
        this.parts.splice(index, 0, part);
        this.renderPartsList();
        this.lastDeletedPart = null;

        const toast = document.querySelector('.undo-toast');
        if (toast) toast.remove();

        this.showToast('되돌렸습니다', 'success');
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

        let boardW = parseInt(document.getElementById('boardWidth').value) || 2440;
        let boardH = parseInt(document.getElementById('boardHeight').value) || 1220;

        // Defaults for removed v4 parameters
        const thickness = parseInt(document.getElementById('boardThickness')?.value) || 18;
        const preCutting = document.getElementById('preCutting')?.checked ?? false;
        const useGrain = this.useGrain; // Sync with v4 state

        // Apply pre-cutting logic (12mm each side = 24mm total)
        if (preCutting) {
            boardW -= 24;
            boardH -= 24;
        }

        // Use packer
        const packer = new GuillotinePacker(boardW, boardH, this.kerf);
        // Note: packers can be updated later to respect grain (useGrain) if needed.
        // For UI4, we focus on the UI/UX flow.
        const result = packer.pack(this.parts);

        this.lastResult = result;
        this.currentBoardIndex = 0;

        // Calculate stats
        const totalCuts = result.bins.reduce((sum, bin) => sum + (bin.cuttingCount || 0), 0);
        const cost = this.calculateCuttingCost(thickness, totalCuts, preCutting, result.bins.length);
        const efficiency = result.totalEfficiency || 0;

        // Update UI
        document.getElementById('statCost').textContent = cost.toLocaleString() + '원';
        document.getElementById('statCuts').textContent = totalCuts + '회';
        document.getElementById('statBoards').textContent = result.bins.length + '장';

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
            this.renderer = new CuttingRenderer('resultCanvas');
        }

        const boardW = parseInt(document.getElementById('boardWidth').value);
        const boardH = parseInt(document.getElementById('boardHeight').value);

        const legend = this.renderer.render(boardW, boardH, bin.placed, this.kerf);

        // Update indicator
        document.getElementById('boardIndicator').textContent =
            `${this.currentBoardIndex + 1} / ${this.lastResult.bins.length}`;

        // UI2: Display legend for small parts
        this.updateLegend(legend);
    }

    updateLegend(legend) {
        const container = document.getElementById('legendSection');
        if (!container) return;

        if (!legend || legend.length === 0) {
            container.innerHTML = '';
            return;
        }

        const circles = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩'];
        const items = legend.map(l => {
            const circle = circles[l.num - 1] || `(${l.num})`;
            return `${circle} ${l.width}×${l.height} ×${l.count}`;
        }).join('   ');

        container.innerHTML = `<span class="legend-title">범례</span> ${items}`;
    }

    navigateBoard(delta) {
        if (!this.lastResult) return;
        const newIndex = this.currentBoardIndex + delta;
        if (newIndex >= 0 && newIndex < this.lastResult.bins.length) {
            this.currentBoardIndex = newIndex;
            // Reset zoom/pan when switching boards
            if (this.renderer) {
                this.renderer.zoom = 1.0;
                this.renderer.offsetX = 0;
                this.renderer.offsetY = 0;
                this.updateZoomUI();
            }
            this.renderResult();
        }
    }

    // ============================================
    // Export & Share
    // ============================================

    openPdfModal() {
        if (!this.lastResult || this.lastResult.bins.length === 0) return;

        const modal = document.getElementById('pdfModal');
        const listContainer = document.getElementById('pdfPreviewList');
        if (!modal || !listContainer) return;

        // Reset scroll position and clear list
        const scrollContainer = document.getElementById('pdfScrollContainer');
        if (scrollContainer) scrollContainer.scrollTop = 0;
        listContainer.innerHTML = '';

        // Update stats
        document.getElementById('pdfStatCost').textContent = document.getElementById('statCost').textContent;
        document.getElementById('pdfStatCuts').textContent = document.getElementById('statCuts').textContent;
        document.getElementById('pdfStatBoards').textContent = document.getElementById('statBoards').textContent;

        const boardW = parseInt(document.getElementById('boardWidth').value);
        const boardH = parseInt(document.getElementById('boardHeight').value);

        // Render each board
        this.lastResult.bins.forEach((bin, idx) => {
            const container = document.createElement('div');
            container.className = 'pdf-board-container';

            const label = document.createElement('div');
            label.className = 'pdf-board-label';
            label.textContent = `${idx + 1} / ${this.lastResult.bins.length}`;
            container.appendChild(label);

            const canvas = document.createElement('canvas');
            canvas.id = `pdfCanvas_${idx}`;
            container.appendChild(canvas);
            listContainer.appendChild(container);

            // Use a one-time renderer for each canvas
            const tempRenderer = new CuttingRenderer(canvas.id);
            tempRenderer.render(boardW, boardH, bin.placed, this.kerf);
        });

        modal.classList.remove('hidden');
    }

    closePdfModal() {
        const modal = document.getElementById('pdfModal');
        if (modal) modal.classList.add('hidden');
    }

    async downloadPDF() {
        if (!this.lastResult || this.lastResult.bins.length === 0) return;

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');
        const boardW = parseInt(document.getElementById('boardWidth').value);
        const boardH = parseInt(document.getElementById('boardHeight').value);
        const cost = document.getElementById('statCost').textContent;
        const cuts = document.getElementById('statCuts').textContent;
        const efficiency = document.getElementById('statEfficiency').textContent;

        const totalPages = this.lastResult.bins.length;

        // Create a hidden canvas for high-quality rendering
        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = 1200; // High resolution
        exportCanvas.height = 1200 * (boardH / boardW);
        const exportRenderer = new CuttingRenderer('resultCanvas'); // Temporarily hijack ID or create new
        exportRenderer.canvas = exportCanvas;
        exportRenderer.ctx = exportCanvas.getContext('2d');

        for (let i = 0; i < totalPages; i++) {
            if (i > 0) doc.addPage();

            // Render current board
            const bin = this.lastResult.bins[i];
            exportRenderer.render(boardW, boardH, bin.placed, this.kerf);

            // Header info on first page
            if (i === 0) {
                doc.setFontSize(22);
                doc.text('대장간 V3 재단 도면', 20, 20);
                doc.setFontSize(12);
                doc.text(`원판: ${boardW} × ${boardH} mm`, 20, 32);
                doc.text(`총 비용: ${cost} | 절단: ${cuts} | 효율: ${efficiency}`, 20, 40);
                doc.line(20, 45, 190, 45);
            }

            // Board Image
            const imgData = exportCanvas.toDataURL('image/png');
            doc.addImage(imgData, 'PNG', 15, 55, 180, 0);

            doc.setFontSize(10);
            doc.text(`Page ${i + 1} / ${totalPages}`, 105, 285, { align: 'center' });
        }

        doc.save(`woodcutter_V3_${Date.now()}.pdf`);
        this.showToast('PDF 다운로드가 시작되었습니다', 'success');
    }

    async share() {
        if (!this.lastResult) return;

        const boardW = document.getElementById('boardWidth').value;
        const boardH = document.getElementById('boardHeight').value;
        const cost = document.getElementById('statCost').textContent;
        const cuts = document.getElementById('statCuts').textContent;
        const boards = this.lastResult.bins.length;
        const efficiency = document.getElementById('statEfficiency').textContent;

        const partsList = this.parts.map(p => `• ${p.width}×${p.height} ×${p.qty}개`).join('\n');

        const shareText = `[대장간 V3 재단 결과]

📐 원판: ${boardW} × ${boardH} mm
📦 사용 원판: ${boards}장
✂️ 총 절단: ${cuts}
📊 효율: ${efficiency}
💰 예상 비용: ${cost}

─────────────────
부품 목록:
${partsList}

📎 대장간 V3으로 작성됨`;

        const canvas = document.getElementById('resultCanvas');
        if (navigator.share && canvas) {
            try {
                const blob = await new Promise(resolve => canvas.toBlob(resolve));
                const file = new File([blob], 'result.png', { type: 'image/png' });

                await navigator.share({
                    files: [file],
                    title: '대장간 V3 재단 결과',
                    text: shareText,
                });
            } catch (err) {
                // Fallback to text only
                navigator.share({
                    title: '대장간 V3 재단 결과',
                    text: shareText
                }).catch(() => {
                    this.copyToClipboard(shareText);
                    this.showToast('결과가 복사되었습니다', 'success');
                });
            }
        } else {
            this.copyToClipboard(shareText);
            this.showToast('결과가 복사되었습니다', 'success');
        }
    }

    // ============================================
    // Utilities
    // ============================================

    haptic(type = 'light') {
        if (!navigator.vibrate) return;
        switch (type) {
            case 'light': navigator.vibrate(10); break;
            case 'medium': navigator.vibrate(20); break;
            case 'success': navigator.vibrate([10, 50, 10]); break;
            case 'error': navigator.vibrate([50, 50, 50]); break;
        }
    }

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

    // ============================================
    // Debugging
    // ============================================

    debug() {
        console.group('/debug - Application State');
        console.log('Current Step:', this.currentStep);
        console.log('Current Field:', this.currentField);
        console.log('Input Values:', { ...this.inputValues });
        console.log('Parts:', [...this.parts]);
        console.log('Last Result:', this.lastResult);
        console.log('Board Specs:', {
            width: document.getElementById('boardWidth')?.value,
            height: document.getElementById('boardHeight')?.value,
            thickness: document.getElementById('boardThickness')?.value,
            kerf: this.kerf
        });
        console.groupEnd();

        this.showToast('디버그 정보가 콘솔에 출력되었습니다', 'success');
    }
}

// Initialize App
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new CuttingAppMobile();
});
