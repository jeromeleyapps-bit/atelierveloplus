import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "url";
import sharp from "sharp";
import pngToIco from "png-to-ico";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");
const publicDir = path.join(root, "public");
const iconsDir = path.join(publicDir, "icons");
const sourcePath = path.join(publicDir, "logo.png");

const sizes = [16, 32, 48, 64, 128, 192, 256, 384, 512];

async function ensureDir(dir) {
  await fs.promises.mkdir(dir, { recursive: true });
}

async function main() {
  await ensureDir(iconsDir);
  if (!fs.existsSync(sourcePath)) {
    console.error("Missing logo source at", sourcePath);
    process.exit(1);
  }

  for (const size of sizes) {
    const outPath = path.join(iconsDir, `icon-${size}x${size}.png`);
    await sharp(sourcePath)
      .resize(size, size)
      .png({ compressionLevel: 9 })
      .toFile(outPath);
    console.log("Generated", outPath);
  }

  // Apple touch icon (recommended 180x180)
  const applePath = path.join(publicDir, "apple-touch-icon.png");
  await sharp(sourcePath)
    .resize(180, 180)
    .png({ compressionLevel: 9 })
    .toFile(applePath);
  console.log("Generated", applePath);

  // favicon.ico (multi-size 16 + 32)
  const png16 = path.join(iconsDir, "icon-16x16.png");
  const png32 = path.join(iconsDir, "icon-32x32.png");
  if (fs.existsSync(png16) && fs.existsSync(png32)) {
    const icoBuf = await pngToIco([png16, png32]);
    const icoPath = path.join(publicDir, "favicon.ico");
    await fs.promises.writeFile(icoPath, icoBuf);
    console.log("Generated", icoPath);
  } else {
    console.warn("Skip favicon.ico: missing 16x16 or 32x32 PNG");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
