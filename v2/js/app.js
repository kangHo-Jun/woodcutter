/**
 * 목재 재단 최적화 앱 메인 로직 (V3)
 */

class CuttingApp {
    constructor() {
        this.parts = [];
        this.renderer = null;
        this.threePreview = null;
        this.kerf = 5;
        this.init();
    }

    init() {
        // 엔진 및 렌더러 초기화
        this.renderer = new CuttingRenderer('resultCanvas');
        this.threePreview = new CuttingThreePreview('threeContainer');

        // UI 요소
        this.boardWidth = document.getElementById('boardWidth');
        this.boardHeight = document.getElementById('boardHeight');
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

        this.emptyState = document.getElementById('emptyState');
        this.actionsBar = document.getElementById('resultActions');

        this.bindEvents();

        // 초기값 설정
        this.boardWidth.value = 2440;
        this.boardHeight.value = 1220;
        this.kerfInput.value = this.kerf;
    }

    bindEvents() {
        document.getElementById('addPartBtn').addEventListener('click', () => this.addPart());
        document.getElementById('calculateBtn').addEventListener('click', () => this.calculate());
        document.getElementById('downloadBtn').addEventListener('click', () => this.download());
        document.getElementById('downloadPdfBtn').addEventListener('click', () => this.downloadPDF());
        document.getElementById('clearBtn').addEventListener('click', () => this.clearParts());

        // Tab View Switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchView(e.target));
        });

        // Enter 키로 부품 추가
        [this.partWidth, this.partHeight, this.partQty].forEach(el => {
            el.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.addPart();
            });
        });

        // Theme Toggle
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
            this.showToast('부품 크기를 올바르게 입력하세요', 'error');
            return;
        }

        const boardW = parseInt(this.boardWidth.value);
        const boardH = parseInt(this.boardHeight.value);

        if (width > boardW || height > boardH) {
            if (!rotatable || (height > boardW || width > boardH)) {
                this.showToast('부품이 원판보다 큽니다', 'error');
                return;
            }
        }

        this.parts.push({ width, height, qty, rotatable, id: this.parts.length });
        this.renderPartsList();

        // 입력 필드 초기화
        this.partWidth.value = '';
        this.partHeight.value = '';
        this.partQty.value = '1';
        this.partRotatable.checked = true;
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

        // 캔버스 및 3D 초기화 (빈 상태로 렌더)
        this.displayResults({ placed: [], unplaced: [], efficiency: 0, usedArea: 0 });
    }

    renderPartsList() {
        if (this.parts.length === 0) {
            this.partsListEl.innerHTML = '<span class="empty-msg" style="color:var(--text-muted); font-size:0.8rem;">부품을 추가하세요</span>';
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

    calculate() {
        if (this.parts.length === 0) {
            this.showToast('부품을 먼저 추가하세요', 'error');
            return;
        }

        const boardW = parseInt(this.boardWidth.value);
        const boardH = parseInt(this.boardHeight.value);
        const kerf = parseInt(this.kerfInput.value) || 0;

        if (!boardW || !boardH) {
            this.showToast('원판 크기를 입력하세요', 'error');
            return;
        }

        // Packer 실행 (다중 원판 지원)
        const packer = new GuillotinePacker(boardW, boardH, kerf);
        const result = packer.pack(this.parts);

        // 결과 데이터 보관 (PDF 등에서 사용)
        this.lastResult = result;

        // 결과 표시
        this.displayResults(result);

        if (result.unplaced.length > 0) {
            this.showToast(`⚠️ ${result.unplaced.length}개 부품 배치 불가 (원판보다 큼)`, 'warning');
        } else {
            this.showToast(`✓ 최적화 완료! (총 ${result.bins.length}개 원판 사용)`, 'success');
        }
    }

    displayResults(result) {
        const boardW = parseInt(this.boardWidth.value) || 0;
        const boardH = parseInt(this.boardHeight.value) || 0;
        const kerf = parseInt(this.kerfInput.value) || 0;

        const container = document.getElementById('canvasContainer');
        container.innerHTML = ''; // 기존 캔버스 제거

        const hasPlaced = result.bins.length > 0;
        if (this.emptyState) this.emptyState.style.display = hasPlaced ? 'none' : 'block';
        if (this.actionsBar) this.actionsBar.style.display = hasPlaced ? 'flex' : 'none';

        if (!hasPlaced) return;

        // 각 원판(Bin) 별로 캔버스 생성 및 렌더링
        result.bins.forEach((bin, idx) => {
            const wrapper = document.createElement('div');
            wrapper.className = 'board-result-wrapper';
            wrapper.innerHTML = `<h4 class="board-title">Sheet ${idx + 1} (${bin.efficiency.toFixed(1)}%)</h4>`;

            const canvas = document.createElement('canvas');
            canvas.id = `resultCanvas-${idx}`;
            wrapper.appendChild(canvas);
            container.appendChild(wrapper);

            const renderer = new CuttingRenderer(canvas.id);
            renderer.render(boardW, boardH, bin.placed, kerf);
        });

        // 3D Preview - 첫 번째 원판만 우선 표시 (또는 전체를 보여줄 엔진 고도화 필요)
        const firstBin = result.bins[0];
        const placedWithColor = firstBin.placed.map(item => ({
            ...item,
            color: this.getColor(item.originalId)
        }));
        this.threePreview.update(boardW, boardH, placedWithColor);

        // Bento Stats 업데이트 (전체 효율 기준)
        this.statEfficiency.innerText = `${result.totalEfficiency.toFixed(1)}%`;
        this.statWaste.innerText = `${(100 - result.totalEfficiency).toFixed(1)}%`;
        const totalPlaced = result.bins.reduce((sum, b) => sum + b.placed.length, 0);
        const totalRequested = totalPlaced + result.unplaced.length;
        this.statPlaced.innerText = `${totalPlaced}/${totalRequested}`;
        const totalUsedArea = result.bins.reduce((sum, b) => sum + b.usedArea, 0);
        this.statArea.innerText = `${(totalUsedArea / 1000000).toFixed(2)} m²`;
    }

    switchView(btn) {
        const view = btn.dataset.view;
        // 탭 상태 업데이트
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // 뷰 가시성 업데이트
        document.querySelectorAll('.view-item').forEach(v => v.classList.remove('active'));
        if (view === '3d') {
            document.getElementById('threeContainer').classList.add('active');
        } else {
            document.getElementById('canvasContainer').classList.add('active');
        }
    }

    download() {
        this.renderer.downloadImage();
        this.showToast('이미지 다운로드 시작', 'success');
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
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();

        const primaryColor = [29, 29, 31];
        const textColor = [29, 29, 31];
        const mutedColor = [134, 134, 139];

        const result = this.lastResult;
        if (!result || !result.bins || result.bins.length === 0) {
            this.showToast('출력할 결과가 없습니다. 최적화를 먼저 실행하세요.', 'error');
            return;
        }

        // --- PAGE 1 ~ N: Drawings for each Sheet ---
        result.bins.forEach((bin, index) => {
            if (index > 0) pdf.addPage('landscape', 'mm', 'a4');
            this.drawPDFPage(pdf, bin, index);
        });

        // --- FINAL PAGE(S): Detailed Parts Total Summary ---
        pdf.addPage('landscape', 'mm', 'a4');
        this.drawPDFTablePage(pdf, result, primaryColor, textColor);

        pdf.save(`woodcut-pro-report-${Date.now()}.pdf`);
        this.showToast('전체 원판 포함 다중 페이지 리포트 발행 완료', 'success');
    }

    drawPDFPage(pdf, bin, index) {
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const primaryColor = [29, 29, 31];
        const textColor = [29, 29, 31];
        const mutedColor = [134, 134, 139];

        // Header
        pdf.setFillColor(...primaryColor);
        pdf.rect(0, 0, pageWidth, 25, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(18);
        pdf.text(`WOOD CUT PRO REPORT - SHEET ${index + 1}`, 15, 17);

        // Date
        pdf.setFontSize(9);
        const date = new Date().toLocaleString();
        pdf.text(`ISSUED: ${date}`, pageWidth - 15, 17, { align: 'right' });

        // Info
        pdf.setTextColor(...textColor);
        pdf.setFontSize(12);
        const boardW = this.boardWidth.value;
        const boardH = this.boardHeight.value;
        pdf.text(`Board: ${boardW} x ${boardH} mm | Sheet Efficiency: ${bin.efficiency.toFixed(1)}%`, 15, 35);

        // Canvas Image for ONLY this bin
        const canvas = document.getElementById(`resultCanvas-${index}`);
        if (canvas) {
            const imgData = canvas.toDataURL('image/png');
            const margin = 15;
            const maxImgW = pageWidth - margin * 2;
            const maxImgH = pageHeight - 60; // Slightly larger space for images

            let imgW = maxImgW;
            let imgH = (canvas.height / canvas.width) * imgW;
            if (imgH > maxImgH) {
                imgH = maxImgH;
                imgW = (canvas.width / canvas.height) * imgH;
            }

            const imgX = (pageWidth - imgW) / 2;
            pdf.addImage(imgData, 'PNG', imgX, 40, imgW, imgH);
        }

        // Mini Stats at bottom
        pdf.setTextColor(...mutedColor);
        pdf.setFontSize(9);
        pdf.text(`Sheet ${index + 1} / ${this.lastResult.bins.length} | Generated by Wood Cut PRO`, 15, pageHeight - 10);
    }

    drawPDFTablePage(pdf, result, primaryColor, textColor) {
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();

        pdf.setFillColor(...primaryColor);
        pdf.rect(0, 0, pageWidth, 20, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(14);
        pdf.text('Detailed Cutting List (Total Summary)', 15, 13);

        pdf.setTextColor(...textColor);
        pdf.setFontSize(10);
        let curY = 35;
        const colW = [20, 40, 40, 30, 30, 40];
        const headers = ['#', 'Width (mm)', 'Height (mm)', 'Qty', 'Rotatable', 'Total Area'];

        pdf.setFillColor(245, 245, 247);
        pdf.rect(15, curY - 5, pageWidth - 30, 7, 'F');

        let curX = 15;
        headers.forEach((h, i) => {
            pdf.text(h, curX, curY);
            curX += colW[i];
        });

        curY += 10;

        // Use this.parts (original requested items) for the table
        this.parts.forEach((p, idx) => {
            if (curY > pageHeight - 20) {
                pdf.addPage('landscape', 'mm', 'a4');
                curY = 30;
                // Add header for continuation
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
            const area = (p.width * p.height * p.qty / 1000000).toFixed(3);
            pdf.text(`${area} m²`, curX, curY);

            pdf.setDrawColor(240, 240, 242);
            pdf.line(15, curY + 2, pageWidth - 15, curY + 2);
            curY += 8;
        });

        // Summary Statistics Box
        curY += 10;
        pdf.setFillColor(248, 249, 250);
        pdf.rect(15, curY, pageWidth - 30, 25, 'F');
        pdf.setTextColor(...textColor);
        pdf.setFontSize(12);
        pdf.text('Project Stats:', 20, curY + 10);
        pdf.setFontSize(10);
        pdf.text(`Total Sheets: ${result.bins.length}`, 20, curY + 18);
        pdf.text(`Total Efficiency: ${result.totalEfficiency.toFixed(1)}%`, 70, curY + 18);
        pdf.text(`Total Used Area: ${this.statArea.innerText}`, 140, curY + 18);
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

// 앱 인스턴스
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new CuttingApp();
});
