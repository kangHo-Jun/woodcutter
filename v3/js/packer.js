/**
 * 2D Guillotine Bin Packing Algorithm (Multi-Bin Support)
 * 목재 재단에 적합한 직선 컷팅 알고리즘
 */

class GuillotinePacker {
    constructor(width, height, kerf = 0) {
        this.binWidth = width;
        this.binHeight = height;
        this.kerf = kerf;
    }

    /**
     * 모든 부품을 배치 (부품이 많으면 여러 원판 사용)
     * @param {Array} items - [{width, height, qty, id, rotatable}]
     * @returns {Object} - {bins: [{placed, efficiency, usedArea, totalArea, cuttingCount}], unplaced}
     */
    pack(items) {
        // 부품을 수량만큼 펼치기
        const expandedItems = [];
        items.forEach((item, idx) => {
            for (let i = 0; i < item.qty; i++) {
                expandedItems.push({
                    width: item.width,
                    height: item.height,
                    id: `${idx}-${i}`,
                    originalId: idx,
                    rotatable: item.rotatable !== false
                });
            }
        });

        // 면적 큰 순으로 정렬 (Best Area Fit) - 패킹 효율을 높이기 위함
        expandedItems.sort((a, b) => (b.width * b.height) - (a.width * a.height));

        const bins = [];
        let remainingItems = [...expandedItems];

        // 모든 부품이 배치될 때까지 원판 추가
        while (remainingItems.length > 0) {
            const bin = new SingleBin(this.binWidth, this.binHeight, this.kerf);
            const result = bin.pack(remainingItems);

            // 더 이상 하나도 배치할 수 없는 경우 (부품이 원판보다 큼)
            if (result.placed.length === 0) break;

            bins.push(result);
            remainingItems = result.unplaced;
        }

        return {
            bins,
            unplaced: remainingItems,
            totalEfficiency: this.calculateTotalEfficiency(bins)
        };
    }

    calculateTotalEfficiency(bins) {
        if (bins.length === 0) return 0;
        const totalUsed = bins.reduce((sum, b) => sum + b.usedArea, 0);
        const totalArea = bins.reduce((sum, b) => sum + b.totalArea, 0);
        return (totalUsed / totalArea) * 100;
    }
}

/**
 * 단일 원판(Bin) 패킹 클래스
 */
class SingleBin {
    constructor(width, height, kerf) {
        this.width = width;
        this.height = height;
        this.kerf = kerf;
        this.freeRects = [{ x: 0, y: 0, width, height }];
        this.placed = [];
        this.cutLinesX = new Set(); // Unique vertical cut lines
        this.cutLinesY = new Set(); // Unique horizontal cut lines
    }

    pack(items) {
        const unplaced = [];

        for (const item of items) {
            const result = this.insert(item.width, item.height, item.rotatable);
            if (result) {
                this.placed.push({
                    ...item,
                    x: result.x,
                    y: result.y,
                    width: result.width,
                    height: result.height,
                    rotated: result.rotated
                });
            } else {
                unplaced.push(item);
            }
        }

        const usedArea = this.placed.reduce((sum, p) => sum + p.width * p.height, 0);
        const totalArea = this.width * this.height;
        const efficiency = (usedArea / totalArea) * 100;

        return {
            placed: this.placed,
            unplaced,
            efficiency,
            usedArea,
            totalArea,
            cuttingCount: this.cutLinesX.size + this.cutLinesY.size
        };
    }

    insert(width, height, rotatable) {
        let bestRect = null;
        let bestRectIndex = -1;
        let bestShortSideFit = Infinity;
        let bestRotated = false;

        for (let i = 0; i < this.freeRects.length; i++) {
            const rect = this.freeRects[i];

            // 톱날 두께(Kerf) 고려하여 배치 가능 확인
            if (rect.width >= width + this.kerf && rect.height >= height + this.kerf) {
                const shortSide = Math.min(rect.width - width, rect.height - height);
                if (shortSide < bestShortSideFit) {
                    bestRect = rect;
                    bestRectIndex = i;
                    bestShortSideFit = shortSide;
                    bestRotated = false;
                }
            }

            if (rotatable && rect.width >= height + this.kerf && rect.height >= width + this.kerf) {
                const shortSide = Math.min(rect.width - height, rect.height - width);
                if (shortSide < bestShortSideFit) {
                    bestRect = rect;
                    bestRectIndex = i;
                    bestShortSideFit = shortSide;
                    bestRotated = true;
                }
            }
        }

        if (!bestRect) return null;

        const pW = bestRotated ? height : width;
        const pH = bestRotated ? width : height;

        this.splitFreeRect(bestRectIndex, pW + this.kerf, pH + this.kerf);

        return { x: bestRect.x, y: bestRect.y, width: pW, height: pH, rotated: bestRotated };
    }

    splitFreeRect(index, uW, uH) {
        const rect = this.freeRects[index];
        const w = rect.width - uW;
        const h = rect.height - uH;

        if (w <= h) {
            if (w > 0) {
                this.freeRects.push({ x: rect.x + uW, y: rect.y, width: w, height: uH });
                this.cutLinesX.add(rect.x + uW);
            }
            if (h > 0) {
                this.freeRects.push({ x: rect.x, y: rect.y + uH, width: rect.width, height: h });
                this.cutLinesY.add(rect.y + uH);
            }
        } else {
            if (h > 0) {
                this.freeRects.push({ x: rect.x, y: rect.y + uH, width: uW, height: h });
                this.cutLinesY.add(rect.y + uH);
            }
            if (w > 0) {
                this.freeRects.push({ x: rect.x + uW, y: rect.y, width: w, height: rect.height });
                this.cutLinesX.add(rect.x + uW);
            }
        }
        this.freeRects.splice(index, 1);
    }
}

// 전역 노출
window.GuillotinePacker = GuillotinePacker;
