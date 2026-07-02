// 2026 世界盃 32 強隊伍資料（2026-07-02 淘汰賽名單）
// 國旗全部用 canvas 程式繪製（簡化示意版），不依賴外部圖檔
// jc1 = 球衣主色、jc2 = 球褲/滾邊色

export const TEAMS = [
  { id: 'MEX', zh: '墨西哥',   en: 'Mexico',        jc1: '#006847', jc2: '#ffffff', flag: [
    { op: 'v', cs: ['#006847', '#ffffff', '#ce1126'] }, { op: 'circle', c: '#8c6239', x: .5, y: .5, r: .12 } ] },
  { id: 'RSA', zh: '南非',     en: 'South Africa',  jc1: '#ffb612', jc2: '#007749', flag: [
    { op: 'h', cs: ['#e03c31', '#ffffff', '#007749', '#ffffff', '#001489'], ws: [3, .8, 3, .8, 3] },
    { op: 'tri', c: '#ffb612', w: .42 }, { op: 'tri', c: '#000000', w: .32 } ] },
  { id: 'SUI', zh: '瑞士',     en: 'Switzerland',   jc1: '#d52b1e', jc2: '#ffffff', flag: [
    { op: 'fill', c: '#d52b1e' }, { op: 'cross', c: '#ffffff', w: .2, l: .62 } ] },
  { id: 'CAN', zh: '加拿大',   en: 'Canada',        jc1: '#d52b1e', jc2: '#ffffff', flag: [
    { op: 'v', cs: ['#d52b1e', '#ffffff', '#d52b1e'], ws: [1, 2, 1] }, { op: 'star', c: '#d52b1e', x: .5, y: .5, r: .2, n: 11 } ] },
  { id: 'BRA', zh: '巴西',     en: 'Brazil',        jc1: '#fedd00', jc2: '#009739', flag: [
    { op: 'fill', c: '#009739' }, { op: 'poly', c: '#fedd00', pts: [[.5, .1], [.92, .5], [.5, .9], [.08, .5]] },
    { op: 'circle', c: '#012169', x: .5, y: .5, r: .17 } ] },
  { id: 'MAR', zh: '摩洛哥',   en: 'Morocco',       jc1: '#c1272d', jc2: '#006233', flag: [
    { op: 'fill', c: '#c1272d' }, { op: 'star', c: '#006233', x: .5, y: .5, r: .2, n: 5 } ] },
  { id: 'USA', zh: '美國',     en: 'United States', jc1: '#ffffff', jc2: '#0a3161', flag: [
    { op: 'h', cs: ['#b31942', '#ffffff', '#b31942', '#ffffff', '#b31942', '#ffffff', '#b31942'] },
    { op: 'rect', c: '#0a3161', x: 0, y: 0, w: .45, h: .57 },
    { op: 'dots', c: '#ffffff', x0: .07, y0: .12, dx: .105, dy: .17, nx: 4, ny: 3, r: .028 } ] },
  { id: 'AUS', zh: '澳洲',     en: 'Australia',     jc1: '#ffcd00', jc2: '#006747', flag: [
    { op: 'fill', c: '#012169' },
    { op: 'rect', c: '#ffffff', x: 0, y: .2, w: .45, h: .1 }, { op: 'rect', c: '#ffffff', x: .18, y: 0, w: .09, h: .5 },
    { op: 'rect', c: '#c8102e', x: 0, y: .225, w: .45, h: .05 }, { op: 'rect', c: '#c8102e', x: .2, y: 0, w: .05, h: .5 },
    { op: 'star', c: '#ffffff', x: .22, y: .75, r: .11, n: 7 },
    { op: 'star', c: '#ffffff', x: .72, y: .2, r: .05, n: 7 }, { op: 'star', c: '#ffffff', x: .85, y: .38, r: .05, n: 7 },
    { op: 'star', c: '#ffffff', x: .68, y: .55, r: .05, n: 7 }, { op: 'star', c: '#ffffff', x: .82, y: .78, r: .05, n: 7 } ] },
  { id: 'GER', zh: '德國',     en: 'Germany',       jc1: '#ffffff', jc2: '#000000', flag: [
    { op: 'h', cs: ['#000000', '#dd0000', '#ffce00'] } ] },
  { id: 'CIV', zh: '象牙海岸', en: 'Ivory Coast',   jc1: '#ff8200', jc2: '#ffffff', flag: [
    { op: 'v', cs: ['#ff8200', '#ffffff', '#009a44'] } ] },
  { id: 'NED', zh: '荷蘭',     en: 'Netherlands',   jc1: '#ff7f00', jc2: '#21468b', flag: [
    { op: 'h', cs: ['#ae1c28', '#ffffff', '#21468b'] } ] },
  { id: 'JPN', zh: '日本',     en: 'Japan',         jc1: '#1a2f6b', jc2: '#ffffff', flag: [
    { op: 'fill', c: '#ffffff' }, { op: 'circle', c: '#bc002d', x: .5, y: .5, r: .3 } ] },
  { id: 'BEL', zh: '比利時',   en: 'Belgium',       jc1: '#ef3340', jc2: '#000000', flag: [
    { op: 'v', cs: ['#000000', '#fdda24', '#ef3340'] } ] },
  { id: 'EGY', zh: '埃及',     en: 'Egypt',         jc1: '#ce1126', jc2: '#ffffff', flag: [
    { op: 'h', cs: ['#ce1126', '#ffffff', '#000000'] }, { op: 'circle', c: '#c09300', x: .5, y: .5, r: .1 } ] },
  { id: 'ESP', zh: '西班牙',   en: 'Spain',         jc1: '#aa151b', jc2: '#f1bf00', flag: [
    { op: 'h', cs: ['#aa151b', '#f1bf00', '#aa151b'], ws: [1, 2, 1] }, { op: 'circle', c: '#aa151b', x: .3, y: .5, r: .07 } ] },
  { id: 'CPV', zh: '維德角',   en: 'Cape Verde',    jc1: '#003893', jc2: '#ffffff', flag: [
    { op: 'fill', c: '#003893' }, { op: 'rect', c: '#ffffff', x: 0, y: .5, w: 1, h: .25 },
    { op: 'rect', c: '#cf2027', x: 0, y: .583, w: 1, h: .084 }, { op: 'ring', c: '#f7d116', x: .38, y: .625, r: .15, w: .035 } ] },
  { id: 'FRA', zh: '法國',     en: 'France',        jc1: '#0055a4', jc2: '#ffffff', flag: [
    { op: 'v', cs: ['#0055a4', '#ffffff', '#ef4135'] } ] },
  { id: 'NOR', zh: '挪威',     en: 'Norway',        jc1: '#ba0c2f', jc2: '#00205b', flag: [
    { op: 'fill', c: '#ba0c2f' }, { op: 'ncross', c: '#ffffff', w: .2, x: .36 }, { op: 'ncross', c: '#00205b', w: .1, x: .36 } ] },
  { id: 'ARG', zh: '阿根廷',   en: 'Argentina',     jc1: '#74acdf', jc2: '#000000', flag: [
    { op: 'h', cs: ['#74acdf', '#ffffff', '#74acdf'] }, { op: 'star', c: '#f6b40e', x: .5, y: .5, r: .11, n: 12 } ] },
  { id: 'AUT', zh: '奧地利',   en: 'Austria',       jc1: '#ef3340', jc2: '#ffffff', flag: [
    { op: 'h', cs: ['#ef3340', '#ffffff', '#ef3340'] } ] },
  { id: 'COL', zh: '哥倫比亞', en: 'Colombia',      jc1: '#ffcd00', jc2: '#003087', flag: [
    { op: 'h', cs: ['#ffcd00', '#003087', '#c8102e'], ws: [2, 1, 1] } ] },
  { id: 'POR', zh: '葡萄牙',   en: 'Portugal',      jc1: '#a50021', jc2: '#006600', flag: [
    { op: 'v', cs: ['#046a38', '#da291c'], ws: [2, 3] }, { op: 'circle', c: '#ffe900', x: .4, y: .5, r: .15 },
    { op: 'circle', c: '#da291c', x: .4, y: .5, r: .08 } ] },
  { id: 'ENG', zh: '英格蘭',   en: 'England',       jc1: '#ffffff', jc2: '#1a2f6b', flag: [
    { op: 'fill', c: '#ffffff' }, { op: 'cross', c: '#ce1124', w: .16, l: 1 } ] },
  { id: 'CRO', zh: '克羅埃西亞', en: 'Croatia',     jc1: '#ffffff', jc2: '#c8102e', flag: [
    { op: 'h', cs: ['#c8102e', '#ffffff', '#012169'] }, { op: 'checker', c1: '#c8102e', c2: '#ffffff', x: .38, y: .22, w: .24, h: .38, n: 4 } ] },
  { id: 'PAR', zh: '巴拉圭',   en: 'Paraguay',      jc1: '#d52b1e', jc2: '#0038a8', flag: [
    { op: 'h', cs: ['#d52b1e', '#ffffff', '#0038a8'] }, { op: 'ring', c: '#009b3a', x: .5, y: .5, r: .1, w: .025 },
    { op: 'star', c: '#ffcc00', x: .5, y: .5, r: .05, n: 5 } ] },
  { id: 'BIH', zh: '波士尼亞', en: 'Bosnia & Herz.', jc1: '#002f6c', jc2: '#fecb00', flag: [
    { op: 'fill', c: '#002f6c' }, { op: 'poly', c: '#fecb00', pts: [[.3, 0], [.82, 0], [.82, 1]] },
    { op: 'star', c: '#ffffff', x: .22, y: .14, r: .05, n: 5 }, { op: 'star', c: '#ffffff', x: .36, y: .42, r: .05, n: 5 },
    { op: 'star', c: '#ffffff', x: .5, y: .7, r: .05, n: 5 }, { op: 'star', c: '#ffffff', x: .64, y: .97, r: .05, n: 5 } ] },
  { id: 'ECU', zh: '厄瓜多',   en: 'Ecuador',       jc1: '#ffd100', jc2: '#0072ce', flag: [
    { op: 'h', cs: ['#ffd100', '#0072ce', '#ef3340'], ws: [2, 1, 1] }, { op: 'circle', c: '#8d6e4b', x: .5, y: .5, r: .11 } ] },
  { id: 'SWE', zh: '瑞典',     en: 'Sweden',        jc1: '#fecc02', jc2: '#006aa7', flag: [
    { op: 'fill', c: '#006aa7' }, { op: 'ncross', c: '#fecc02', w: .17, x: .36 } ] },
  { id: 'SEN', zh: '塞內加爾', en: 'Senegal',       jc1: '#ffffff', jc2: '#00853f', flag: [
    { op: 'v', cs: ['#00853f', '#fdef42', '#e31b23'] }, { op: 'star', c: '#00853f', x: .5, y: .5, r: .13, n: 5 } ] },
  { id: 'ALG', zh: '阿爾及利亞', en: 'Algeria',     jc1: '#ffffff', jc2: '#006233', flag: [
    { op: 'v', cs: ['#006233', '#ffffff'] }, { op: 'crescent', c: '#d21034', x: .5, y: .5, r: .22, off: .07 },
    { op: 'star', c: '#d21034', x: .58, y: .5, r: .08, n: 5 } ] },
  { id: 'COD', zh: '民主剛果', en: 'DR Congo',      jc1: '#007fff', jc2: '#ce1021', flag: [
    { op: 'fill', c: '#007fff' }, { op: 'diag', c: '#f7d618', w: .3 }, { op: 'diag', c: '#ce1021', w: .19 },
    { op: 'star', c: '#f7d618', x: .17, y: .2, r: .12, n: 5 } ] },
  { id: 'GHA', zh: '迦納',     en: 'Ghana',         jc1: '#ffffff', jc2: '#000000', flag: [
    { op: 'h', cs: ['#ce1126', '#fcd116', '#006b3f'] }, { op: 'star', c: '#000000', x: .5, y: .5, r: .14, n: 5 } ] },
];

export function getTeam(id) { return TEAMS.find(t => t.id === id); }

// ---- 國旗繪製 ----

function starPath(ctx, cx, cy, r, n, W, H) {
  const inner = r * (n <= 6 ? .5 : .55);
  ctx.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const a = -Math.PI / 2 + i * Math.PI / n;
    const rr = (i % 2 === 0 ? r : inner) * Math.min(W, H);
    const px = cx * W + Math.cos(a) * rr, py = cy * H + Math.sin(a) * rr;
    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
  }
  ctx.closePath();
}

export function drawFlag(canvas, flagOps) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  for (const o of flagOps) {
    ctx.fillStyle = o.c || '#fff';
    switch (o.op) {
      case 'fill': ctx.fillRect(0, 0, W, H); break;
      case 'h': {
        const ws = o.ws || o.cs.map(() => 1), total = ws.reduce((a, b) => a + b, 0);
        let y = 0;
        o.cs.forEach((c, i) => { const hh = H * ws[i] / total; ctx.fillStyle = c; ctx.fillRect(0, y, W, hh + 1); y += hh; });
        break;
      }
      case 'v': {
        const ws = o.ws || o.cs.map(() => 1), total = ws.reduce((a, b) => a + b, 0);
        let x = 0;
        o.cs.forEach((c, i) => { const ww = W * ws[i] / total; ctx.fillStyle = c; ctx.fillRect(x, 0, ww + 1, H); x += ww; });
        break;
      }
      case 'rect': ctx.fillRect(o.x * W, o.y * H, o.w * W, o.h * H); break;
      case 'circle':
        ctx.beginPath(); ctx.arc(o.x * W, o.y * H, o.r * Math.min(W, H), 0, Math.PI * 2); ctx.fill(); break;
      case 'ring':
        ctx.strokeStyle = o.c; ctx.lineWidth = o.w * Math.min(W, H);
        ctx.beginPath(); ctx.arc(o.x * W, o.y * H, o.r * Math.min(W, H), 0, Math.PI * 2); ctx.stroke(); break;
      case 'star': starPath(ctx, o.x, o.y, o.r, o.n || 5, W, H); ctx.fill(); break;
      case 'cross': { // 置中十字（瑞士/英格蘭）
        const w = o.w * H, len = (o.l || 1);
        ctx.fillRect(W / 2 - w / 2, H * (1 - len) / 2, w, H * len);
        ctx.fillRect(W * (1 - len * .85) / 2, H / 2 - w / 2, W * len * .85, w);
        break;
      }
      case 'ncross': { // 北歐十字（偏左）
        const w = o.w * H, cx = o.x * W;
        ctx.fillRect(cx - w / 2, 0, w, H);
        ctx.fillRect(0, H / 2 - w / 2, W, w);
        break;
      }
      case 'tri': { // 左側三角
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(o.w * W, H / 2); ctx.lineTo(0, H); ctx.closePath(); ctx.fill(); break;
      }
      case 'poly': {
        ctx.beginPath();
        o.pts.forEach((p, i) => i === 0 ? ctx.moveTo(p[0] * W, p[1] * H) : ctx.lineTo(p[0] * W, p[1] * H));
        ctx.closePath(); ctx.fill(); break;
      }
      case 'diag': { // 左下到右上斜帶
        const w = o.w * H;
        ctx.save(); ctx.translate(W / 2, H / 2); ctx.rotate(-Math.atan2(H, W));
        ctx.fillRect(-W, -w / 2, W * 2, w); ctx.restore(); break;
      }
      case 'checker': {
        const n = o.n || 4, cw = o.w * W / n, ch = o.h * H / n;
        for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
          ctx.fillStyle = (i + j) % 2 === 0 ? o.c1 : o.c2;
          ctx.fillRect(o.x * W + i * cw, o.y * H + j * ch, cw + .5, ch + .5);
        }
        break;
      }
      case 'dots': {
        for (let i = 0; i < o.nx; i++) for (let j = 0; j < o.ny; j++) {
          ctx.beginPath();
          ctx.arc((o.x0 + i * o.dx) * W, (o.y0 + j * o.dy) * H, o.r * Math.min(W, H), 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }
      case 'crescent': { // 用離屏 canvas 挖月牙
        const off = document.createElement('canvas'); off.width = W; off.height = H;
        const c2 = off.getContext('2d');
        c2.fillStyle = o.c;
        c2.beginPath(); c2.arc(o.x * W, o.y * H, o.r * Math.min(W, H), 0, Math.PI * 2); c2.fill();
        c2.globalCompositeOperation = 'destination-out';
        c2.beginPath(); c2.arc((o.x + o.off) * W, o.y * H, o.r * .88 * Math.min(W, H), 0, Math.PI * 2); c2.fill();
        ctx.drawImage(off, 0, 0);
        break;
      }
    }
  }
}

const flagCache = new Map();
export function flagCanvas(team, w = 96, h = 64) {
  const key = team.id + '_' + w;
  if (flagCache.has(key)) return flagCache.get(key);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  drawFlag(c, team.flag);
  flagCache.set(key, c);
  return c;
}
