// A* pathfinding for the grid
class AStar {
  constructor(cols, rows) {
    this.cols = cols;
    this.rows = rows;
  }

  findPath(blocked, sc, sr, ec, er) {
    const key = (c, r) => c * 100 + r; // fast integer key
    const h = (c, r) => Math.abs(c - ec) + Math.abs(r - er);

    const open = [];
    const openSet = new Set();
    const closed = new Set();
    const gScore = new Map();
    const parent = new Map();

    const sk = key(sc, sr);
    gScore.set(sk, 0);
    open.push({ c: sc, r: sr, f: h(sc, sr) });
    openSet.add(sk);

    const DIRS = [[1,0],[-1,0],[0,1],[0,-1]];

    while (open.length > 0) {
      // Pop lowest f
      let bi = 0;
      for (let i = 1; i < open.length; i++) {
        if (open[i].f < open[bi].f) bi = i;
      }
      const cur = open[bi];
      open.splice(bi, 1);
      const ck = key(cur.c, cur.r);
      openSet.delete(ck);

      if (cur.c === ec && cur.r === er) {
        // Reconstruct
        const path = [];
        let k = ck;
        while (k !== undefined) {
          const c = Math.floor(k / 100);
          const r = k % 100;
          path.unshift({ col: c, row: r });
          k = parent.get(k);
        }
        return path;
      }

      closed.add(ck);

      for (const [dc, dr] of DIRS) {
        const nc = cur.c + dc;
        const nr = cur.r + dr;
        if (nc < 0 || nc >= this.cols || nr < 0 || nr >= this.rows) continue;

        const nk = key(nc, nr);
        if (closed.has(nk)) continue;
        // blocked uses "col,row" string format
        if (blocked.has(`${nc},${nr}`)) continue;

        const ng = (gScore.get(ck) || 0) + 1;
        const eg = gScore.get(nk);

        if (eg === undefined || ng < eg) {
          gScore.set(nk, ng);
          parent.set(nk, ck);
          const f = ng + h(nc, nr);
          if (!openSet.has(nk)) {
            open.push({ c: nc, r: nr, f });
            openSet.add(nk);
          }
        }
      }
    }
    return null; // no path
  }
}
