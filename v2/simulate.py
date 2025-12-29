
kerf = 5
bin_width = 2440
bin_height = 1220

class SingleBin:
    def __init__(self, width, height, kerf):
        self.width = width
        self.height = height
        self.kerf = kerf
        self.free_rects = [{"x": 0, "y": 0, "width": width, "height": height}]
        self.placed = []
        self.cut_lines_x = set()
        self.cut_lines_y = set()

    def pack(self, items):
        unplaced = []
        for item in items:
            result = self.insert(item["width"], item["height"], item.get("rotatable", True))
            if result:
                self.placed.append({**item, **result})
            else:
                unplaced.append(item)
        return {
            "placed": self.placed, 
            "unplaced": unplaced, 
            "cutting_count": len(self.cut_lines_x) + len(self.cut_lines_y)
        }

    def insert(self, width, height, rotatable):
        best_rect = None
        best_rect_index = -1
        best_short_side_fit = float('inf')
        best_rotated = False

        for i, rect in enumerate(self.free_rects):
            # Normal
            if rect["width"] >= width + self.kerf and rect["height"] >= height + self.kerf:
                short_side = min(rect["width"] - width, rect["height"] - height)
                if short_side < best_short_side_fit:
                    best_rect = rect
                    best_rect_index = i
                    best_short_side_fit = short_side
                    best_rotated = False
            
            # Rotated
            if rotatable and rect["width"] >= height + self.kerf and rect["height"] >= width + self.kerf:
                short_side = min(rect["width"] - height, rect["height"] - width)
                if short_side < best_short_side_fit:
                    best_rect = rect
                    best_rect_index = i
                    best_short_side_fit = short_side
                    best_rotated = True

        if not best_rect:
            return None

        pW = height if best_rotated else width
        pH = width if best_rotated else height
        self.split_free_rect(best_rect_index, pW + self.kerf, pH + self.kerf)
        return {"x": best_rect["x"], "y": best_rect["y"], "width": pW, "height": pH, "rotated": best_rotated}

    def split_free_rect(self, index, uW, uH):
        rect = self.free_rects[index]
        w = rect["width"] - uW
        h = rect["height"] - uH

        if w <= h:
            if w > 0:
                self.free_rects.append({"x": rect["x"] + uW, "y": rect["y"], "width": w, "height": uH})
                self.cut_lines_x.add(rect["x"] + uW)
            if h > 0:
                self.free_rects.append({"x": rect["x"], "y": rect["y"] + uH, "width": rect["width"], "height": h})
                self.cut_lines_y.add(rect["y"] + uH)
        else:
            if h > 0:
                self.free_rects.append({"x": rect["x"], "y": rect["y"] + uH, "width": uW, "height": h})
                self.cut_lines_y.add(rect["y"] + uH)
            if w > 0:
                self.free_rects.append({"x": rect["x"] + uW, "y": rect["y"], "width": w, "height": rect["height"]})
                self.cut_lines_x.add(rect["x"] + uW)
        self.free_rects.pop(index)

items = [{"width": 1000, "height": 600, "rotatable": False} for _ in range(6)]
total_cuts = 0
remaining = items
bin_idx = 1

while len(remaining) > 0:
    bin_obj = SingleBin(bin_width, bin_height, kerf)
    result = bin_obj.pack(remaining)
    if not result["placed"]:
        break
    print(f"Bin {bin_idx}: Placed {len(result['placed'])}, Cuts: {result['cutting_count']}")
    total_cuts += result["cutting_count"]
    remaining = result["unplaced"]
    bin_idx += 1

print(f"Total Cuts: {total_cuts}")
print(f"Total Cost (18mm): {total_cuts * 1500} KRW")
