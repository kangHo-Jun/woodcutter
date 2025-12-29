
const kerf = 5;
const binWidth = 2440;
const binHeight = 1220;

class SingleBin {
    constructor(width, height, kerf) {
        this.width = width;
        this.height = height;
        this.kerf = kerf;
        this.freeRects = [{ x: 0, y: 0, width, height }];
        this.placed = [];
        this.cuttingCount = 0;
    }

    pack(items) {
        const unplaced = [];
        for (const item of items) {
            const result = this.insert(item.width, item.height, item.rotatable);
            if (result) {
                this.placed.push({ ...item, x: result.x, y: result.y, width: result.width, height: result.height });
            } else {
                unplaced.push(item);
            }
        }
        return { placed: this.placed, unplaced, cuttingCount: this.cuttingCount };
    }

    insert(width, height, rotatable) {
        let bestRect = null;
        let bestRectIndex = -1;
        let bestShortSideFit = Infinity;
        let bestRotated = false;

        for (let i = 0; i < this.freeRects.length; i++) {
            const rect = this.freeRects[i];
            if (rect.width >= width + this.kerf && rect.height >= height + this.kerf) {
                const shortSide = Math.min(rect.width - width, rect.height - height);
                if (shortSide < bestShortSideFit) {
                    bestRect = rect; bestRectIndex = i; bestShortSideFit = shortSide; bestRotated = false;
                }
            }
            if (rotatable && rect.width >= height + this.kerf && rect.height >= width + this.kerf) {
                const shortSide = Math.min(rect.width - height, rect.height - width);
                if (shortSide < bestShortSideFit) {
                    bestRect = rect; bestRectIndex = i; bestShortSideFit = shortSide; bestRotated = true;
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
            if (w > 0) { this.freeRects.push({ x: rect.x + uW, y: rect.y, width: w, height: uH }); this.cuttingCount++; }
            if (h > 0) { this.freeRects.push({ x: rect.x, y: rect.y + uH, width: rect.width, height: h }); this.cuttingCount++; }
        } else {
            if (h > 0) { this.freeRects.push({ x: rect.x, y: rect.y + uH, width: uW, height: h }); this.cuttingCount++; }
            if (w > 0) { this.freeRects.push({ x: rect.x + uW, y: rect.y, width: w, height: rect.height }); this.cuttingCount++; }
        }
        this.freeRects.splice(index, 1);
    }
}

const items = [];
for (let i = 0; i < 6; i++) {
    items.push({ width: 1000, height: 600, rotatable: true });
}

let totalCuts = 0;
let remaining = [...items];
let binIdx = 1;
while (remaining.length > 0) {
    const bin = new SingleBin(binWidth, binHeight, kerf);
    const result = bin.pack(remaining);
    if (result.placed.length === 0) break;
    console.log(`Bin ${binIdx}: Placed ${result.placed.length}, Cuts: ${result.cuttingCount}`);
    totalCuts += result.cuttingCount;
    remaining = result.unplaced;
    binIdx++;
}
console.log(`Total Cuts: ${totalCuts}`);
