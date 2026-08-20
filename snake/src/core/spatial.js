// 均勻空間網格：把大量物件依座標分格，查詢附近物件時只掃描鄰近幾格
export class UniformGrid {
  constructor(cellSize) {
    this.cell = cellSize;
    this.map = new Map();
  }
  clear() { this.map.clear(); }
  _key(cx, cy) { return cx * 73856093 ^ cy * 19349663; }
  insert(x, y, item) {
    const c = this.cell;
    const k = this._key(Math.floor(x / c), Math.floor(y / c));
    let arr = this.map.get(k);
    if (!arr) { arr = []; this.map.set(k, arr); }
    arr.push(item);
  }
  // 查詢以 (x,y) 為圓心、半徑 r 內可能命中的物件，逐一丟給 cb
  query(x, y, r, cb) {
    const c = this.cell;
    const x0 = Math.floor((x - r) / c), x1 = Math.floor((x + r) / c);
    const y0 = Math.floor((y - r) / c), y1 = Math.floor((y + r) / c);
    for (let cx = x0; cx <= x1; cx++) {
      for (let cy = y0; cy <= y1; cy++) {
        const arr = this.map.get(this._key(cx, cy));
        if (!arr) continue;
        for (let i = 0; i < arr.length; i++) cb(arr[i]);
      }
    }
  }
}
