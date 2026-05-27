import { defineConfig } from "vite";
import fs from "fs";
import path from "path";

// 編輯器存檔插件：POST /api/slots → 直接寫回 LCD_LAYOUT.ts + public/slots.json
function slotsApiPlugin() {
  return {
    name: "slots-api",
    configureServer(server: any) {
      server.middlewares.use("/api/slots", (req: any, res: any) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          return res.end("only POST");
        }
        let body = "";
        req.on("data", (c: Buffer) => { body += c.toString(); });
        req.on("end", () => {
          try {
            const slots = JSON.parse(body);
            // 1) 寫回 public/slots.json
            const slotsJsonPath = path.resolve(__dirname, "public/slots.json");
            fs.writeFileSync(slotsJsonPath, JSON.stringify(slots, null, 2));

            // 2) 重組 LCD_LAYOUT.ts 的 SLOTS 區塊
            const layoutPath = path.resolve(__dirname, "src/scenes/LCD_LAYOUT.ts");
            const src = fs.readFileSync(layoutPath, "utf8");
            const lines: string[] = [];
            lines.push("  // === 從編輯器（editor.html）寫入 ===");
            for (const key of Object.keys(slots)) {
              const s = slots[key];
              const parts: string[] = [];
              parts.push(`x: ${s.x}`);
              parts.push(`y: ${s.y}`);
              parts.push(`w: ${s.w}`);
              parts.push(`h: ${s.h}`);
              if (s.anchor) parts.push(`anchor: "${s.anchor}"`);
              if (s.src) parts.push(`src: "${s.src}"`);
              if (s.gunOffsetX != null) parts.push(`gunOffsetX: ${s.gunOffsetX}`);
              if (s.gunOffsetY != null) parts.push(`gunOffsetY: ${s.gunOffsetY}`);
              lines.push(`  "${key}": { ${parts.join(", ")} },`);
            }
            const newBody = lines.join("\n");
            const updated = src.replace(
              /(export const SLOTS[^=]*=\s*\{)[\s\S]*?(\n\};)/,
              `$1\n${newBody}\n$2`
            );
            fs.writeFileSync(layoutPath, updated);

            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ ok: true, count: Object.keys(slots).length }));
          } catch (e: any) {
            res.statusCode = 500;
            res.end(JSON.stringify({ ok: false, error: String(e) }));
          }
        });
      });
    },
  };
}

export default defineConfig({
  base: "./",  // 部署在子路徑（github pages /westernBar/dist/）需相對路徑
  server: { host: true, port: 5173 },
  build: { target: "es2020", sourcemap: true },
  plugins: [slotsApiPlugin()],
});
