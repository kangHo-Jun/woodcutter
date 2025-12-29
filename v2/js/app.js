/**
 * 대장간 - 목재 재단 최적화 앱 메인 로직 (V3)
 */

class CuttingApp {
    constructor() {
        this.parts = [];
        this.renderer = null;
        this.threePreview = null;
        this.kerf = 5;
        this.lastResult = null;
        this.init();
    }

    init() {
        // 엔진 및 렌더러 초기화
        this.renderer = new CuttingRenderer('resultCanvas');
        this.threePreview = new CuttingThreePreview('threeContainer');

        // UI 요소
        this.boardWidth = document.getElementById('boardWidth');
        this.boardHeight = document.getElementById('boardHeight');
        this.boardThickness = document.getElementById('boardThickness');
        this.preCutting = document.getElementById('preCutting');
        this.partWidth = document.getElementById('partWidth');
        this.partHeight = document.getElementById('partHeight');
        this.partQty = document.getElementById('partQty');
        this.partRotatable = document.getElementById('partRotatable');
        this.kerfInput = document.getElementById('kerfInput');
        this.partsListEl = document.getElementById('partsList');

        // Bento Stats
        this.statEfficiency = document.getElementById('statEfficiency');
        this.statWaste = document.getElementById('statWaste');
        this.statPlaced = document.getElementById('statPlaced');
        this.statArea = document.getElementById('statArea');
        this.statCost = document.getElementById('statCost');

        this.emptyState = document.getElementById('emptyState');
        this.actionsBar = document.getElementById('resultActions');

        this.bindEvents();

        // 초기값 설정
        if (this.boardWidth) this.boardWidth.value = 2440;
        if (this.boardHeight) this.boardHeight.value = 1220;
        if (this.boardThickness) this.boardThickness.value = 18;
        if (this.kerfInput) this.kerfInput.value = this.kerf;
    }

    bindEvents() {
        document.getElementById('addPartBtn').addEventListener('click', () => this.addPart());
        document.getElementById('calculateBtn').addEventListener('click', () => this.calculate());
        document.getElementById('downloadBtn').addEventListener('click', () => this.download());
        document.getElementById('downloadPdfBtn').addEventListener('click', () => this.downloadPDF());
        document.getElementById('clearBtn').addEventListener('click', () => this.clearParts());

        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchView(e.target));
        });

        [this.partWidth, this.partHeight, this.partQty].forEach(el => {
            if (!el) return;
            el.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.addPart();
            });
        });

        const themeBtn = document.getElementById('toggleTheme');
        if (themeBtn) {
            themeBtn.addEventListener('click', () => {
                document.body.classList.toggle('dark-mode');
            });
        }
    }

    addPart() {
        const width = parseInt(this.partWidth.value);
        const height = parseInt(this.partHeight.value);
        const qty = parseInt(this.partQty.value) || 1;
        const rotatable = this.partRotatable.checked;

        if (!width || !height || width <= 0 || height <= 0) {
            this.showToast('절단 크기를 올바르게 입력하세요', 'error');
            return;
        }

        const rawW = parseInt(this.boardWidth.value);
        const rawH = parseInt(this.boardHeight.value);
        const isPreCut = this.preCutting.checked;

        // 전단컷팅 적용 시 가용 크기 보정 (사방 12mm 소실)
        const boardW = isPreCut ? rawW - 24 : rawW;
        const boardH = isPreCut ? rawH - 24 : rawH;

        if (width > boardW || height > boardH) {
            if (!rotatable || (height > boardW || width > boardH)) {
                this.showToast(isPreCut ? '절단 부위가 전단컷팅 적용 후 원판보다 큽니다' : '절단 부위가 원판보다 큽니다', 'error');
                return;
            }
        }

        this.parts.push({ width, height, qty, rotatable, id: this.parts.length });
        this.renderPartsList();

        this.partWidth.value = '';
        this.partHeight.value = '';
        this.partQty.value = '1';
        this.partWidth.focus();

        this.showToast(`${width}×${height} (${qty}개) 추가됨`, 'success');
    }

    removePart(index) {
        this.parts.splice(index, 1);
        this.renderPartsList();
    }

    clearParts() {
        this.parts = [];
        this.renderPartsList();
        if (this.emptyState) this.emptyState.style.display = 'block';
        if (this.actionsBar) this.actionsBar.style.display = 'none';
        this.displayResults({ bins: [], unplaced: [], totalEfficiency: 0 });
    }

    renderPartsList() {
        if (this.parts.length === 0) {
            this.partsListEl.innerHTML = '<span class="empty-msg" style="color:var(--text-muted); font-size:0.8rem;">항목을 추가하세요</span>';
            return;
        }

        this.partsListEl.innerHTML = this.parts.map((p, i) => `
            <div class="part-card" style="border-left: 4px solid ${this.getColor(i)}">
                <div class="part-info">
                    <span>${p.width}×${p.height}</span>
                    <span class="qty">×${p.qty}</span>
                    ${!p.rotatable ? '🌾' : ''}
                </div>
                <button class="remove-btn" style="color:#ff3b30; background:none; border:none; cursor:pointer;" onclick="app.removePart(${i})">×</button>
            </div>
        `).join('');
    }

    getColor(index) {
        const colors = ['#4ECDC4', '#FF6B6B', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'];
        return colors[index % colors.length];
    }

    /**
     * GitHub (kangHo-Jun/wood-cutter) 원본 로직 기반 재단비용 계산
     * - 12mm 이하: 1,000원/컷
     * - 13~23mm: 1,500원/컷
     * - 24mm 이상: 2,000원/컷
     * - 전단컷팅은 크기에만 영향, 컷팅 횟수에 추가 가산 없음
     */
    calculateCuttingCost(thickness, totalCuts, isPreCut, binCount) {
        let perCutPrice;
        if (thickness <= 12) perCutPrice = 1000;
        else if (thickness <= 23) perCutPrice = 1500;
        else perCutPrice = 2000;

        // 전단컷팅은 원판 크기에만 영향 (calculate()에서 처리)
        // 컷팅 횟수에는 추가 가산 없음
        return totalCuts * perCutPrice;
    }

    calculate() {
        if (this.parts.length === 0) {
            this.showToast('항목을 먼저 추가하세요', 'error');
            return;
        }

        const rawW = parseInt(this.boardWidth.value);
        const rawH = parseInt(this.boardHeight.value);
        const thickness = parseInt(this.boardThickness.value) || 18;
        const kerf = parseInt(this.kerfInput.value) || 0;
        const isPreCut = this.preCutting.checked;

        if (!rawW || !rawH) {
            this.showToast('원판 크기를 입력하세요', 'error');
            return;
        }

        // 전단컷팅 적용 시 내부 가용 영역 계산
        const boardW = isPreCut ? rawW - 24 : rawW;
        const boardH = isPreCut ? rawH - 24 : rawH;

        const packer = new GuillotinePacker(boardW, boardH, kerf);
        const result = packer.pack(this.parts);

        // 총 재단 비용 계산 (모든 원판의 컷팅 수 합산 + 전단컷팅 보정)
        const totalCuts = result.bins.reduce((sum, b) => sum + b.cuttingCount, 0);
        const binCount = result.bins.length;
        result.totalCost = this.calculateCuttingCost(thickness, totalCuts, isPreCut, binCount);
        result.totalCuts = totalCuts;
        result.boardW = rawW;
        result.boardH = rawH;

        this.lastResult = result;
        this.displayResults(result);

        if (result.unplaced.length > 0) {
            this.showToast(`⚠️ ${result.unplaced.length}개 항목 배치 불가`, 'warning');
        } else {
            this.showToast(`✓ 최적화 완료! (비용: ${result.totalCost.toLocaleString()}원)`, 'success');
        }
    }

    displayResults(result) {
        const boardW = result.boardW || parseInt(this.boardWidth.value) || 0;
        const boardH = result.boardH || parseInt(this.boardHeight.value) || 0;
        const kerf = parseInt(this.kerfInput.value) || 0;

        const container = document.getElementById('canvasContainer');
        container.innerHTML = '';

        const hasPlaced = result.bins && result.bins.length > 0;
        if (this.emptyState) this.emptyState.style.display = hasPlaced ? 'none' : 'block';
        if (this.actionsBar) this.actionsBar.style.display = hasPlaced ? 'flex' : 'none';

        if (!hasPlaced) return;

        result.bins.forEach((bin, idx) => {
            const wrapper = document.createElement('div');
            wrapper.className = 'board-result-wrapper';
            wrapper.innerHTML = `<h4 class="board-title">Sheet ${idx + 1} (${bin.efficiency.toFixed(1)}%) - Cuts: ${bin.cuttingCount}</h4>`;

            const canvas = document.createElement('canvas');
            canvas.id = `resultCanvas-${idx}`;
            wrapper.appendChild(canvas);
            container.appendChild(wrapper);

            const renderer = new CuttingRenderer(canvas.id);
            // 렌더링 시에는 원본 크기(boardW, boardH)를 전달하되 
            // 배치된 좌표는 이미 전단컷팅 보정(사방 12mm)이 필요할 수 있으나 
            // 여기서는 배치 알고리즘이 줄어든 크기에서 작동했으므로 여백 표현 필요 시 추가 보정 가능
            // 일단은 줄어든 가용 영역 기준으로 렌더링 (V1 방식과 대포 동소문)
            renderer.render(boardW, boardH, bin.placed, kerf);
        });

        const firstBin = result.bins[0];
        const placedWithColor = firstBin.placed.map(item => ({
            ...item,
            color: this.getColor(item.originalId)
        }));
        this.threePreview.update(boardW, boardH, placedWithColor);

        this.statEfficiency.innerText = `${result.totalEfficiency.toFixed(1)}%`;
        this.statWaste.innerText = `${(100 - result.totalEfficiency).toFixed(1)}%`;
        const totalPlaced = result.bins.reduce((sum, b) => sum + b.placed.length, 0);
        const totalRequested = totalPlaced + result.unplaced.length;
        this.statPlaced.innerText = `${totalPlaced}/${totalRequested}`;
        const totalUsedArea = result.bins.reduce((sum, b) => sum + b.usedArea, 0);
        this.statArea.innerText = `${(totalUsedArea / 1000000).toFixed(2)} m²`;
        this.statCost.innerText = `${result.totalCost.toLocaleString()}원`;
    }

    switchView(btn) {
        const view = btn.dataset.view;
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        document.querySelectorAll('.view-item').forEach(v => v.classList.remove('active'));
        if (view === '3d') {
            document.getElementById('threeContainer').classList.add('active');
        } else {
            document.getElementById('canvasContainer').classList.add('active');
        }
    }

    download() {
        // 첫 번째 캔버스 기준 다운로드
        const canvas = document.querySelector('#canvasContainer canvas');
        if (canvas) {
            const link = document.createElement('a');
            link.download = `woodcut-result-${Date.now()}.png`;
            link.href = canvas.toDataURL();
            link.click();
        }
    }

    downloadPDF() {
        if (typeof window.jspdf === 'undefined') {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
            script.onload = () => this.generatePDF();
            document.head.appendChild(script);
        } else {
            this.generatePDF();
        }
    }

    generatePDF() {
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('landscape', 'mm', 'a4');
        const primaryColor = [29, 29, 31];
        const textColor = [29, 29, 31];

        const result = this.lastResult;
        if (!result || !result.bins || result.bins.length === 0) {
            this.showToast('출력할 결과가 없습니다', 'error');
            return;
        }

        result.bins.forEach((bin, index) => {
            if (index > 0) pdf.addPage('landscape', 'mm', 'a4');
            this.drawPDFPage(pdf, bin, index);
        });

        pdf.addPage('landscape', 'mm', 'a4');
        this.drawPDFTablePage(pdf, result, primaryColor, textColor);

        pdf.save(`woodcut-pro-report-${Date.now()}.pdf`);
        this.showToast('재단 비용 포함 PDF 리포트 발행 완료', 'success');
    }

    drawPDFPage(pdf, bin, index) {
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const primaryColor = [29, 29, 31];
        const textColor = [29, 29, 31];
        const mutedColor = [134, 134, 139];

        pdf.setFillColor(...primaryColor);
        pdf.rect(0, 0, pageWidth, 25, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(18);
        pdf.text(`대장간 리포트 - SHEET ${index + 1}`, 15, 17);

        pdf.setFontSize(9);
        pdf.text(`ISSUED: ${new Date().toLocaleString()}`, pageWidth - 15, 17, { align: 'right' });

        pdf.setTextColor(...textColor);
        pdf.setFontSize(12);
        pdf.text(`Board: ${this.boardWidth.value}x${this.boardHeight.value}x${this.boardThickness.value}T | Pre-cut: ${this.preCutting.checked ? 'Yes' : 'No'}`, 15, 35);

        const canvas = document.getElementById(`resultCanvas-${index}`);
        if (canvas) {
            const imgData = canvas.toDataURL('image/png');
            const maxImgW = pageWidth - 30;
            const maxImgH = pageHeight - 65;
            let imgW = maxImgW;
            let imgH = (canvas.height / canvas.width) * imgW;
            if (imgH > maxImgH) {
                imgH = maxImgH;
                imgW = (canvas.width / canvas.height) * imgH;
            }
            pdf.addImage(imgData, 'PNG', (pageWidth - imgW) / 2, 45, imgW, imgH);
        }

        pdf.setTextColor(...mutedColor);
        pdf.setFontSize(9);
        pdf.text(`Sheet ${index + 1} / ${this.lastResult.bins.length} | Generated by 대장간`, 15, pageHeight - 10);
    }

    drawPDFTablePage(pdf, result, primaryColor, textColor) {
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();

        pdf.setFillColor(...primaryColor);
        pdf.rect(0, 0, pageWidth, 20, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(14);
        pdf.text('Detailed Cutting List & Cost Summary', 15, 13);

        pdf.setTextColor(...textColor);
        pdf.setFontSize(10);
        let curY = 35;
        const colW = [20, 40, 40, 30, 30, 40];
        const headers = ['#', 'Width (mm)', 'Height (mm)', 'Qty', 'Rotatable', 'Area (m²)'];

        pdf.setFillColor(245, 245, 247);
        pdf.rect(15, curY - 5, pageWidth - 30, 7, 'F');
        let curX = 15;
        headers.forEach((h, i) => {
            pdf.text(h, curX, curY);
            curX += colW[i];
        });

        curY += 10;
        this.parts.forEach((p, idx) => {
            if (curY > pageHeight - 60) {
                pdf.addPage('landscape', 'mm', 'a4');
                curY = 30;
                pdf.setFillColor(...primaryColor);
                pdf.rect(0, 0, pageWidth, 15, 'F');
                pdf.setTextColor(255, 255, 255);
                pdf.text('Detailed Cutting List (Continued)', 15, 10);
                pdf.setTextColor(...textColor);
            }
            curX = 15;
            pdf.text((idx + 1).toString(), curX, curY); curX += colW[0];
            pdf.text(p.width.toString(), curX, curY); curX += colW[1];
            pdf.text(p.height.toString(), curX, curY); curX += colW[2];
            pdf.text(p.qty.toString(), curX, curY); curX += colW[3];
            pdf.text(p.rotatable ? 'Yes' : 'No', curX, curY); curX += colW[4];
            pdf.text((p.width * p.height * p.qty / 1000000).toFixed(3), curX, curY);
            pdf.line(15, curY + 2, pageWidth - 15, curY + 2);
            curY += 8;
        });

        // Financial Summary
        curY += 10;
        pdf.setFillColor(248, 249, 250);
        pdf.rect(15, curY, pageWidth - 30, 35, 'F');
        pdf.setTextColor(...textColor);
        pdf.setFontSize(11);
        pdf.text('Calculation Details:', 20, curY + 10);
        pdf.setFontSize(10);
        pdf.text(`- Thickness: ${this.boardThickness.value}T`, 20, curY + 18);
        pdf.text(`- Pre-cutting: ${this.preCutting.checked ? 'Enabled (+4 cuts, -12mm margin)' : 'Disabled'}`, 20, curY + 25);
        pdf.text(`- Total Cutting Count: ${result.totalCuts} cuts`, 100, curY + 18);
        pdf.text(`- Efficiency Score: ${result.totalEfficiency.toFixed(1)}%`, 100, curY + 25);

        pdf.setFontSize(14);
        pdf.setTextColor(0, 122, 255);
        pdf.text(`TOTAL EST. COST: ${result.totalCost.toLocaleString()} KRW`, pageWidth - 25, curY + 20, { align: 'right' });
    }

    showToast(message, type = 'info') {
        const existing = document.querySelector('.toast');
        if (existing) existing.remove();
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 2500);
    }
}

let app;
document.addEventListener('DOMContentLoaded', () => { app = new CuttingApp(); });
