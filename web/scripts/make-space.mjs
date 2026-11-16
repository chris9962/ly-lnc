// sinh các file hình nền vũ trụ; số ngẫu nhiên có hạt cố định nên chạy lại ra đúng hình cũ
// hình có bộ lọc nhiễu được dựng sẵn thành WebP, vì để trình duyệt tự dựng SVG đó ở mỗi lần mở trang rất tốn CPU
// file ra nằm cạnh globals.css để Next gắn mã băm vào tên và cho trình duyệt giữ lâu dài
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
const OUT = path.join(import.meta.dirname, "../src/app/space");
fs.mkdirSync(OUT, { recursive: true });

let state = 4242;
const rand = () => ((state = (state * 1103515245 + 12345) % 2147483648) / 2147483648);
const gauss = () => (rand() + rand() + rand() + rand() - 2) / 2;
const f = (value) => Number(value.toFixed(1));
// sao thật có màu theo nhiệt độ: đa số trắng, một ít xanh lam và vàng cam
const starColor = () => {
  const roll = rand();
  return roll < 0.62 ? "#ffffff" : roll < 0.8 ? "#cfe0ff" : roll < 0.93 ? "#ffe9c4" : "#ffc9a3";
};

function stars(count, width, height, top = 0, big = 0.05) {
  const dim = [];
  const bright = [];
  for (let i = 0; i < count; i++) {
    const x = f(rand() * width);
    const y = f(top + rand() * (height - top));
    // phần lớn sao rất mờ và nhỏ, sao sáng thì hiếm
    const size = rand() ** 3;
    if (rand() < big) bright.push(`<circle cx="${x}" cy="${y}" r="${f(1.1 + size * 1.2)}" fill="${starColor()}"/>`);
    else dim.push(`<circle cx="${x}" cy="${y}" r="${f(0.35 + size * 0.9)}" fill="${starColor()}" opacity="${f(0.25 + rand() * 0.65)}"/>`);
  }
  return { dim: dim.join(""), bright: bright.join("") };
}

// raster: bề ngang ảnh ra tính bằng pixel và chất lượng nén; không có thì giữ nguyên SVG
async function save(name, svg, raster) {
  if (!raster) {
    fs.writeFileSync(path.join(OUT, name), svg);
    console.log(name, svg.length);
    return;
  }
  const source = Number(/width="(\d+)"/.exec(svg)[1]);
  const file = path.join(OUT, name.replace(".svg", ".webp"));
  await sharp(Buffer.from(svg), { density: (72 * raster.width) / source })
    .resize({ width: raster.width })
    .webp({ quality: raster.quality, alphaQuality: 80, effort: 6 })
    .toFile(file);
  console.log(path.basename(file), fs.statSync(file).size);
}

const GLOW = `<filter id="glow" x="-300%" y="-300%" width="700%" height="700%"><feGaussianBlur stdDeviation="1.8" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;
const HAZE = `<filter id="haze" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="7"/></filter>`;
const BLUR = `<filter id="blur2" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="1.2"/></filter>`;
// nửa tối của hành tinh, ánh sáng tới từ phía trên bên trái
const NIGHT = `<radialGradient id="night" cx="30%" cy="26%" r="82%"><stop offset="0.45" stop-color="#03040d" stop-opacity="0"/><stop offset="0.78" stop-color="#03040d" stop-opacity="0.62"/><stop offset="1" stop-color="#03040d" stop-opacity="0.96"/></radialGradient>`;

// ---- nền sao lặp lại
{
  const field = stars(150, 640, 640, 0, 0.045);
  await save(
    "stars.svg",
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" width="640" height="640">
<defs><filter id="glow" x="-300%" y="-300%" width="700%" height="700%"><feGaussianBlur stdDeviation="1.6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
<g>${field.dim}</g>
<g filter="url(#glow)">${field.bright}</g>
</svg>
`,
  );
}

// ---- dải ngân hà phủ cả trang
{
  const W = 1600;
  const H = 1000;
  const angle = (-27 * Math.PI) / 180;
  const dust = [];
  for (let i = 0; i < 900; i++) {
    // sao dày dần về trục dải ngân hà
    const along = (rand() - 0.5) * 2100;
    const across = gauss() * 150;
    const x = W / 2 + along * Math.cos(angle) - across * Math.sin(angle);
    const y = H / 2 + along * Math.sin(angle) + across * Math.cos(angle);
    if (x < 0 || x > W || y < 0 || y > H) continue;
    dust.push(`<circle cx="${f(x)}" cy="${f(y)}" r="${f(0.3 + rand() ** 4 * 1.1)}" fill="${starColor()}" opacity="${f(0.2 + rand() * 0.6)}"/>`);
  }
  const cloud = (seed, freq, rgb, gain, bias) =>
    `<filter id="c${seed}" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="${freq}" numOctaves="5" seed="${seed}"/><feColorMatrix values="0 0 0 0 ${rgb[0]}  0 0 0 0 ${rgb[1]}  0 0 0 0 ${rgb[2]}  ${gain} 0 0 0 ${bias}"/></filter>`;
  await save(
    "galaxy.svg",
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" preserveAspectRatio="xMidYMid slice">
<defs>
${cloud(3, 0.0032, [0.42, 0.22, 0.72], 2.6, -0.95)}
${cloud(11, 0.0048, [0.82, 0.25, 0.56], 2.4, -1.05)}
${cloud(23, 0.0026, [0.2, 0.36, 0.85], 2.4, -0.95)}
${cloud(31, 0.007, [0.02, 0.03, 0.09], 3.2, -1.25)}
<filter id="soft" x="-20%" y="-60%" width="140%" height="220%"><feGaussianBlur stdDeviation="70"/></filter>
<filter id="core" x="-50%" y="-100%" width="200%" height="300%"><feGaussianBlur stdDeviation="46"/></filter>
<mask id="band"><ellipse cx="${W / 2}" cy="${H / 2}" rx="1150" ry="200" fill="#fff" filter="url(#soft)" transform="rotate(-27 ${W / 2} ${H / 2})"/></mask>
<mask id="lane"><ellipse cx="${W / 2}" cy="${H / 2 + 14}" rx="1000" ry="46" fill="#fff" filter="url(#core)" transform="rotate(-27 ${W / 2} ${H / 2})"/></mask>
</defs>
<rect width="${W}" height="${H}" fill="#0b1026"/>
<g mask="url(#band)">
<rect width="${W}" height="${H}" filter="url(#c23)" opacity="0.75"/>
<rect width="${W}" height="${H}" filter="url(#c3)" opacity="0.9"/>
<rect width="${W}" height="${H}" filter="url(#c11)" opacity="0.7"/>
<ellipse cx="${W / 2}" cy="${H / 2}" rx="520" ry="60" fill="#ffe2bd" opacity="0.42" filter="url(#core)" transform="rotate(-27 ${W / 2} ${H / 2})"/>
<g>${dust.join("")}</g>
</g>
<rect width="${W}" height="${H}" filter="url(#c31)" mask="url(#lane)"/>
<rect width="${W}" height="${H}" fill="#0b1026" opacity="0.5"/>
</svg>
`,
    { width: 1600, quality: 52 },
  );
}

// ---- dải cuối trang: sao và hành tinh lớn ở chân trời; các hành tinh nhỏ là file riêng để CSS cho trôi
{
  const W = 1400;
  const H = 300;
  const field = stars(170, W, H, 100, 0.07);
  await save(
    "cosmos-band.svg",
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
<defs>
${GLOW}${HAZE}${BLUR}
<!-- mây và địa hình của hành tinh ở chân trời -->
<filter id="clouds" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.011 0.03" numOctaves="5" seed="5"/><feColorMatrix values="0 0 0 0 0.86  0 0 0 0 0.9  0 0 0 0 1  3.2 0 0 0 -1.7"/></filter>
<filter id="land" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.006 0.016" numOctaves="5" seed="14"/><feColorMatrix values="0 0 0 0 0.36  0 0 0 0 0.2  0 0 0 0 0.58  2.6 0 0 0 -1.1"/></filter>
<radialGradient id="world" cx="50%" cy="0%" r="60%"><stop offset="0" stop-color="#3b5fc4"/><stop offset="0.5" stop-color="#27308a"/><stop offset="1" stop-color="#120f3c"/></radialGradient>
<linearGradient id="worldNight" x1="0" x2="1"><stop offset="0.35" stop-color="#03040d" stop-opacity="0"/><stop offset="1" stop-color="#03040d" stop-opacity="0.88"/></linearGradient>
<linearGradient id="limb" x1="0" x2="1"><stop offset="0" stop-color="#9fd0ff"/><stop offset="0.5" stop-color="#bfe2ff"/><stop offset="0.85" stop-color="#7a8cff" stop-opacity="0.2"/><stop offset="1" stop-color="#7a8cff" stop-opacity="0"/></linearGradient>
<clipPath id="worldClip"><circle cx="700" cy="750" r="540"/></clipPath>
</defs>

<g>${field.dim}</g>
<g filter="url(#glow)">${field.bright}</g>

<!-- sao sáng có tia nhiễu xạ như ảnh chụp qua kính thiên văn -->
<g stroke="#ffffff" stroke-linecap="round" filter="url(#blur2)">
<path d="M470 128 v-15 M470 128 v15 M470 128 h-15 M470 128 h15" stroke-width="1" opacity="0.8"/>
<path d="M955 176 v-11 M955 176 v11 M955 176 h-11 M955 176 h11" stroke-width="0.9" opacity="0.7"/>
<path d="M1345 138 v-13 M1345 138 v13 M1345 138 h-13 M1345 138 h13" stroke-width="1" opacity="0.8"/>
</g>
<g filter="url(#glow)" fill="#ffffff"><circle cx="470" cy="128" r="2"/><circle cx="955" cy="176" r="1.7"/><circle cx="1345" cy="138" r="2"/></g>

<!-- hành tinh lớn nhìn từ quỹ đạo: chỉ thấy đường chân trời và lớp khí quyển -->
<circle cx="700" cy="750" r="546" fill="none" stroke="#7fb4ff" stroke-width="14" opacity="0.5" filter="url(#haze)"/>
<circle cx="700" cy="750" r="540" fill="url(#world)"/>
<g clip-path="url(#worldClip)">
<rect x="150" y="205" width="1100" height="100" filter="url(#land)"/>
<rect x="150" y="205" width="1100" height="100" filter="url(#clouds)" opacity="0.85"/>
<rect x="150" y="205" width="1100" height="100" fill="url(#worldNight)"/>
</g>
<path d="M330 357 A540 540 0 0 1 1070 357" fill="none" stroke="url(#limb)" stroke-width="2.2" filter="url(#blur2)"/>
</svg>
`,
    { width: 2100, quality: 60 },
  );
}

// ---- hành tinh khí có vành
{
  const rings = `<ellipse cx="130" cy="82" rx="112" ry="23" stroke-width="9"/><ellipse cx="130" cy="82" rx="96" ry="19" stroke-width="5" opacity="0.7"/><ellipse cx="130" cy="82" rx="84" ry="16" stroke-width="3" opacity="0.5"/>`;
  await save(
    "planet-saturn.svg",
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 164" width="260" height="164">
<defs>
${HAZE}${NIGHT}
<!-- dải mây: nhiễu kéo dài theo chiều ngang -->
<filter id="bands" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.007 0.13" numOctaves="4" seed="8"/><feColorMatrix values="0 0 0 0 0.45  0 0 0 0 0.22  0 0 0 0 0.1  3 0 0 0 -1.25"/></filter>
<filter id="bandsLight" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.01 0.2" numOctaves="3" seed="19"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 0.93  0 0 0 0 0.78  2.4 0 0 0 -1.3"/></filter>
<radialGradient id="giant" cx="38%" cy="32%" r="75%"><stop offset="0" stop-color="#f6dcae"/><stop offset="0.55" stop-color="#d9a868"/><stop offset="1" stop-color="#8a5a2e"/></radialGradient>
<linearGradient id="ring" x1="0" x2="1"><stop offset="0" stop-color="#c9a877" stop-opacity="0.15"/><stop offset="0.25" stop-color="#e9d3a6" stop-opacity="0.9"/><stop offset="0.5" stop-color="#b08a5a" stop-opacity="0.75"/><stop offset="0.75" stop-color="#f0deb8" stop-opacity="0.9"/><stop offset="1" stop-color="#c9a877" stop-opacity="0.15"/></linearGradient>
<clipPath id="giantClip"><circle cx="130" cy="82" r="54"/></clipPath>
<clipPath id="ringFront"><rect x="0" y="82" width="260" height="80"/></clipPath>
</defs>
<g transform="rotate(-16 130 82)">
<g fill="none" stroke="url(#ring)">${rings}</g>
<circle cx="130" cy="82" r="58" fill="#f1cf9a" opacity="0.22" filter="url(#haze)"/>
<circle cx="130" cy="82" r="54" fill="url(#giant)"/>
<g clip-path="url(#giantClip)">
<rect x="70" y="22" width="120" height="120" filter="url(#bands)"/>
<rect x="70" y="22" width="120" height="120" filter="url(#bandsLight)" opacity="0.7"/>
<ellipse cx="150" cy="102" rx="11" ry="5.5" fill="#a5522e" opacity="0.75"/>
<!-- bóng của vành đổ lên thân hành tinh -->
<ellipse cx="130" cy="76" rx="112" ry="23" fill="none" stroke="#1a0f08" stroke-width="5" opacity="0.4"/>
</g>
<circle cx="130" cy="82" r="54" fill="url(#night)"/>
<g fill="none" stroke="url(#ring)" clip-path="url(#ringFront)">${rings}</g>
</g>
</svg>
`,
    { width: 520, quality: 70 },
  );
}

// ---- hành tinh đỏ
await save(
  "planet-mars.svg",
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 60" width="60" height="60">
<defs>
${HAZE}${NIGHT}
<filter id="rock" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.09" numOctaves="4" seed="3"/><feColorMatrix values="0 0 0 0 0.3  0 0 0 0 0.1  0 0 0 0 0.06  2.6 0 0 0 -1.1"/></filter>
<radialGradient id="red" cx="36%" cy="30%" r="75%"><stop offset="0" stop-color="#f0a47a"/><stop offset="0.6" stop-color="#c2603a"/><stop offset="1" stop-color="#6e2c1c"/></radialGradient>
<clipPath id="redClip"><circle cx="30" cy="30" r="19"/></clipPath>
</defs>
<circle cx="30" cy="30" r="21" fill="#e98a5c" opacity="0.2" filter="url(#haze)"/>
<circle cx="30" cy="30" r="19" fill="url(#red)"/>
<g clip-path="url(#redClip)"><rect x="9" y="9" width="42" height="42" filter="url(#rock)"/><ellipse cx="30" cy="12.5" rx="9" ry="2.6" fill="#fff4ea" opacity="0.8"/></g>
<circle cx="30" cy="30" r="19" fill="url(#night)"/>
</svg>
`,
  { width: 128, quality: 72 },
);

// ---- mặt trăng
await save(
  "planet-moon.svg",
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
<defs>
${NIGHT}
<filter id="crater" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.07" numOctaves="4" seed="27"/><feColorMatrix values="0 0 0 0 0.2  0 0 0 0 0.2  0 0 0 0 0.24  2.8 0 0 0 -1.2"/></filter>
<radialGradient id="moon" cx="36%" cy="30%" r="75%"><stop offset="0" stop-color="#f3f1ea"/><stop offset="0.7" stop-color="#bdbab2"/><stop offset="1" stop-color="#7d7b78"/></radialGradient>
<clipPath id="moonClip"><circle cx="32" cy="32" r="27"/></clipPath>
</defs>
<circle cx="32" cy="32" r="27" fill="url(#moon)"/>
<g clip-path="url(#moonClip)">
<rect x="3" y="3" width="58" height="58" filter="url(#crater)"/>
<g fill="#5f5d5c" opacity="0.45"><circle cx="22" cy="24" r="5"/><circle cx="38" cy="42" r="3.4"/><circle cx="16" cy="42" r="2.4"/><circle cx="42" cy="20" r="2.2"/><circle cx="28" cy="52" r="1.8"/></g>
</g>
<circle cx="32" cy="32" r="27" fill="url(#night)"/>
</svg>
`,
  { width: 128, quality: 72 },
);
