/**
 * Canvas 기반 재단 패턴 렌더러
 */

class CuttingRenderer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.padding = 40;
        this.colors = [
            '#4ECDC4', '#FF6B6B', '#45B7D1', '#96CEB4',
            '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
            '#BB8FCE', '#85C1E9', '#F8B500', '#00CED1'
        ];
    }

    /**
     * 재단 결과 렌더링
     */
    render(binWidth, binHeight, placedItems, kerf = 0) {
        const scale = this.calculateScale(binWidth, binHeight);

        // 캔버스 크기 조정
        this.canvas.width = binWidth * scale + this.padding * 2;
        this.canvas.height = binHeight * scale + this.padding * 2;

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // 배경
        this.ctx.fillStyle = '#1a1a2e';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // 원판 그리기
        this.drawBoard(binWidth, binHeight, scale);

        // 부품들 그리기
        placedItems.forEach((item, index) => {
            this.drawPart(item, scale, index);
        });

        // 치수 표시
        this.drawDimensions(binWidth, binHeight, scale);
    }

    calculateScale(binWidth, binHeight) {
        const maxWidth = Math.min(800, window.innerWidth - 80);
        const maxHeight = 500;
        const scaleX = (maxWidth - this.padding * 2) / binWidth;
        const scaleY = (maxHeight - this.padding * 2) / binHeight;
        return Math.min(scaleX, scaleY, 0.5);
    }

    drawBoard(width, height, scale) {
        const x = this.padding;
        const y = this.padding;
        const w = width * scale;
        const h = height * scale;

        // 원판 배경 (나무색상)
        this.ctx.fillStyle = '#3d2b1f';
        this.ctx.fillRect(x, y, w, h);

        // 나무 무늬 그리기
        this.drawWoodTexture(x, y, w, h, false, true);

        // 원판 테두리
        this.ctx.strokeStyle = '#4a3424';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(x, y, w, h);

        // 그리드 (더 연하게)
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        this.ctx.lineWidth = 0.5;
        const gridSize = 100 * scale;

        for (let gx = gridSize; gx < w; gx += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x + gx, y);
            this.ctx.lineTo(x + gx, y + h);
            this.ctx.stroke();
        }
        for (let gy = gridSize; gy < h; gy += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, y + gy);
            this.ctx.lineTo(x + w, y + gy);
            this.ctx.stroke();
        }
    }

    drawWoodTexture(x, y, w, h, rotated, isBoard = false) {
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.rect(x, y, w, h);
        this.ctx.clip();

        // 배경 나무색 보강
        this.ctx.fillStyle = isBoard ? '#3d2b1f' : 'rgba(0,0,0,0.1)';
        this.ctx.fillRect(x, y, w, h);

        // 고유한 루프 패턴 (나이테) 그리기
        this.ctx.strokeStyle = isBoard ? 'rgba(0, 0, 0, 0.2)' : 'rgba(0, 0, 0, 0.15)';
        this.ctx.lineWidth = 1;

        // 중심점 (임의의 나무 중심 설정)
        const centerX = x + (rotated ? w * 0.8 : w * 0.2);
        const centerY = y + (rotated ? h * 0.2 : h * 0.8);

        const loopCount = 40;
        const spacing = 15;

        for (let i = 0; i < loopCount; i++) {
            this.ctx.beginPath();
            const radiusX = i * spacing * 2.5;
            const radiusY = i * spacing;

            if (rotated) {
                // 세로결 루프
                this.ctx.ellipse(centerX, centerY, radiusY, radiusX, 0, 0, Math.PI * 2);
            } else {
                // 가로결 루프
                this.ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
            }

            // 루프에 약간의 파동 효과 (노이즈 대신 단순 랜덤)
            this.ctx.setLineDash([100, 2]);
            this.ctx.stroke();
        }

        // 잔무늬 가미
        this.ctx.globalAlpha = 0.5;
        for (let i = 0; i < 20; i++) {
            this.ctx.beginPath();
            const offset = (i * 20);
            if (rotated) {
                this.ctx.moveTo(x + offset % w, y);
                this.ctx.lineTo(x + offset % w, y + h);
            } else {
                this.ctx.moveTo(x, y + offset % h);
                this.ctx.lineTo(x + w, y + offset % h);
            }
            this.ctx.stroke();
        }

        this.ctx.restore();
    }

    drawPart(item, scale, index) {
        const x = this.padding + item.x * scale;
        const y = this.padding + item.y * scale;
        const w = item.width * scale;
        const h = item.height * scale;

        const color = this.colors[item.originalId % this.colors.length];

        // 부품 배경 (그라데이션)
        const gradient = this.ctx.createLinearGradient(x, y, x + w, y + h);
        gradient.addColorStop(0, color);
        gradient.addColorStop(1, this.darkenColor(color, 15));
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(x + 1, y + 1, w - 2, h - 2);

        // 나무 무늬 추가
        this.ctx.save();
        this.ctx.globalAlpha = 0.2;
        this.drawWoodTexture(x + 1, y + 1, w - 2, h - 2, item.rotated);
        this.ctx.restore();

        // 부품 테두리
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);

        // 치수 라벨
        if (w > 30 && h > 20) {
            const originalW = item.rotated ? item.height : item.width;
            const originalH = item.rotated ? item.width : item.height;
            const label = `${originalW}×${originalH}`;

            this.ctx.fillStyle = '#fff';
            this.ctx.font = '600 10px Inter, sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';

            // 텍스트 외곽선으로 가독성 확보
            this.ctx.strokeStyle = 'rgba(0,0,0,0.5)';
            this.ctx.lineWidth = 3;
            this.ctx.strokeText(label, x + w / 2, y + h / 2);
            this.ctx.fillText(label, x + w / 2, y + h / 2);

            // 결 방향 아이콘
            if (!item.rotatable) {
                this.ctx.font = '10px sans-serif';
                this.ctx.fillText('🌾', x + 12, y + 12);
            }
        }
    }

    drawDimensions(width, height, scale) {
        const x = this.padding;
        const y = this.padding;
        const w = width * scale;
        const h = height * scale;

        this.ctx.fillStyle = '#888';
        this.ctx.font = '12px Inter, sans-serif';
        this.ctx.textAlign = 'center';

        // 상단 치수
        this.ctx.fillText(`${width} mm`, x + w / 2, y - 15);

        // 좌측 치수
        this.ctx.save();
        this.ctx.translate(x - 15, y + h / 2);
        this.ctx.rotate(-Math.PI / 2);
        this.ctx.fillText(`${height} mm`, 0, 0);
        this.ctx.restore();
    }

    darkenColor(color, percent) {
        const num = parseInt(color.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.max((num >> 16) - amt, 0);
        const G = Math.max((num >> 8 & 0x00FF) - amt, 0);
        const B = Math.max((num & 0x0000FF) - amt, 0);
        return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
    }

    /**
     * 캔버스를 이미지로 다운로드
     */
    downloadImage() {
        const link = document.createElement('a');
        link.download = `cutting-pattern-${Date.now()}.png`;
        link.href = this.canvas.toDataURL('image/png');
        link.click();
    }
}

// 전역 노출
window.CuttingRenderer = CuttingRenderer;
