// 球衣染色工具
// 策略：把原圖綠色襪條 → 藍色；可選把藍短褲整體換色
// 用 HSV 色相位移，可保留亮度/陰影細節（避免變成死板色塊）

const Recolor = {
    // 把指定色相範圍的像素替換成目標色相
    // hueFromRange: [h_low, h_high]（0~360），覆蓋的原色相範圍
    // hueTo: 目標色相（0~360）
    // satScale: 飽和度倍率，預設 1
    shiftHue(srcCanvas, hueFromRange, hueTo, satScale = 1) {
        const w = srcCanvas.width, h = srcCanvas.height;
        const dst = document.createElement('canvas');
        dst.width = w; dst.height = h;
        const dctx = dst.getContext('2d');
        dctx.drawImage(srcCanvas, 0, 0);
        const img = dctx.getImageData(0, 0, w, h);
        const d = img.data;
        for (let i = 0; i < d.length; i += 4) {
            const a = d[i + 3];
            if (a < 8) continue;
            const [H, S, V] = Recolor.rgbToHsv(d[i], d[i + 1], d[i + 2]);
            if (Recolor.hueInRange(H, hueFromRange) && S > 0.15) {
                const [R, G, B] = Recolor.hsvToRgb(hueTo, Math.min(1, S * satScale), V);
                d[i] = R; d[i + 1] = G; d[i + 2] = B;
            }
        }
        dctx.putImageData(img, 0, 0);
        return dst;
    },

    hueInRange(h, [lo, hi]) {
        if (lo <= hi) return h >= lo && h <= hi;
        return h >= lo || h <= hi; // 跨越 0 的環狀區間
    },

    rgbToHsv(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
        const v = mx, dlt = mx - mn;
        const s = mx === 0 ? 0 : dlt / mx;
        let h = 0;
        if (dlt !== 0) {
            if (mx === r) h = ((g - b) / dlt) % 6;
            else if (mx === g) h = (b - r) / dlt + 2;
            else h = (r - g) / dlt + 4;
            h *= 60;
            if (h < 0) h += 360;
        }
        return [h, s, v];
    },

    hsvToRgb(h, s, v) {
        const c = v * s;
        const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
        const m = v - c;
        let r = 0, g = 0, b = 0;
        if (h < 60)       { r = c; g = x; b = 0; }
        else if (h < 120) { r = x; g = c; b = 0; }
        else if (h < 180) { r = 0; g = c; b = x; }
        else if (h < 240) { r = 0; g = x; b = c; }
        else if (h < 300) { r = x; g = 0; b = c; }
        else              { r = c; g = 0; b = x; }
        return [
            Math.round((r + m) * 255),
            Math.round((g + m) * 255),
            Math.round((b + m) * 255),
        ];
    },

    // 從 Phaser 載入的 Image texture 產生 canvas
    textureToCanvas(scene, key) {
        const src = scene.textures.get(key).getSourceImage();
        const cv = document.createElement('canvas');
        cv.width = src.width; cv.height = src.height;
        cv.getContext('2d').drawImage(src, 0, 0);
        return cv;
    },

    // 把 canvas 註冊為新的 Phaser texture
    canvasToTexture(scene, canvas, newKey) {
        if (scene.textures.exists(newKey)) scene.textures.remove(newKey);
        scene.textures.addCanvas(newKey, canvas);
    },
};
