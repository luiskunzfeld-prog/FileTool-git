import sharp from "sharp";
import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const src = readFileSync(path.join(__dirname, "icon-source.svg"));
const outDir = path.join(__dirname, "..", "public", "icons");

const targets = [
  { name: "icon-192.png", size: 192 },
  { name: "icon-512.png", size: 512 },
  { name: "maskable-512.png", size: 512, padding: 0.16 }, // safe-zone padding for maskable
  { name: "apple-touch-icon.png", size: 180 },
];

const bg = { r: 28, g: 20, b: 16, alpha: 1 }; // #1C1410

for (const t of targets) {
  let pipeline = sharp(src, { density: 384 }).resize(t.size, t.size);
  if (t.padding) {
    const inner = Math.round(t.size * (1 - t.padding * 2));
    pipeline = sharp(src, { density: 384 })
      .resize(inner, inner)
      .extend({
        top: Math.round((t.size - inner) / 2),
        bottom: Math.round((t.size - inner) / 2),
        left: Math.round((t.size - inner) / 2),
        right: Math.round((t.size - inner) / 2),
        background: bg,
      });
  }
  await pipeline.png().toFile(path.join(outDir, t.name));
  console.log("wrote", t.name);
}

// simple favicon (32px) at project root's public/
await sharp(src, { density: 384 })
  .resize(32, 32)
  .png()
  .toFile(path.join(__dirname, "..", "public", "favicon.png"));
console.log("wrote favicon.png");
