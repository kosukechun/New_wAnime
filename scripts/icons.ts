import sharp from "sharp";
import { writeFileSync } from "node:fs";
for (const size of [192, 512])
  await sharp("public/icon.svg")
    .resize(size, size)
    .png()
    .toFile(`public/icon-${size}.png`);
await sharp("public/icon.svg")
  .resize(180, 180)
  .png()
  .toFile("public/apple-touch-icon.png");
const png = await sharp("public/icon.svg").resize(256, 256).png().toBuffer();
const header = Buffer.alloc(22);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(1, 4);
header.writeUInt16LE(1, 10);
header.writeUInt16LE(32, 12);
header.writeUInt32LE(png.length, 14);
header.writeUInt32LE(22, 18);
writeFileSync("public/app.ico", Buffer.concat([header, png]));
console.log("PWA / Windows アイコンを生成しました。");
