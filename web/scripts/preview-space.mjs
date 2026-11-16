// ghép các ảnh đã dựng lên nền tối thành một file PNG để xem lại bằng mắt sau khi chạy make-space.mjs
import path from "node:path";
import sharp from "sharp";

const dir = path.join(import.meta.dirname, "../src/app/space");
const out = process.argv[2];
if (!out) throw new Error("thiếu đường dẫn file PNG ra");

const galaxy = await sharp(path.join(dir, "galaxy.webp")).resize({ width: 1400 }).toBuffer();
const band = await sharp(path.join(dir, "cosmos-band.webp")).resize({ width: 1400 }).toBuffer();
const layers = [
  { input: galaxy, left: 0, top: 0 },
  { input: band, left: 0, top: 875 },
  { input: await sharp(path.join(dir, "planet-saturn.webp")).toBuffer(), left: 60, top: 900 },
  { input: await sharp(path.join(dir, "planet-mars.webp")).toBuffer(), left: 700, top: 920 },
  { input: await sharp(path.join(dir, "planet-moon.webp")).toBuffer(), left: 1000, top: 940 },
];
await sharp({ create: { width: 1400, height: 1240, channels: 4, background: "#0b1026" } }).composite(layers).png().toFile(out);
console.log(out);
