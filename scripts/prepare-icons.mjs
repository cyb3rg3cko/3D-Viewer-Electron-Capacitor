// Builds app icons from icon.png and/or icon.ico in the repo root.
//
//   node scripts/prepare-icons.mjs            desktop icons (before electron-builder)
//   node scripts/prepare-icons.mjs --android  Android launcher icons (after "cap add android")
//
// Desktop output:
//   build/icon.png   electron-builder: macOS (.icns) + Linux, and Windows if no .ico
//   build/icon.ico   electron-builder: Windows (your icon.ico, used as-is)
//   build/icons/     Linux icon sizes 16-1024px
//   www/icon.png     window/taskbar icon at runtime on Windows and Linux
//
// icon.png is preferred. If only icon.ico exists, its largest PNG-encoded image is used
// (modern .ico files store their 256x256 image as PNG). 1024x1024 is ideal.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const android = process.argv.includes('--android');
const srcPng = path.join(root, 'icon.png');
const srcIco = path.join(root, 'icon.ico');
const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
// Android adaptive icons: launchers mask the 108dp layer with their own shape (circle,
// squircle...) and only a 66dp circle is guaranteed visible. The icon is a rounded
// square, so it's scaled to fit wholly inside that circle on a matching navy background.
const ANDROID_BG = '#04163f';
const ADAPTIVE_ICON_DP = 54; // of 108dp
const ROUND_ICON_RATIO = ADAPTIVE_ICON_DP / 66; // same look for pre-Android-8 round icons

function pngSize(buf) {
  if (buf.length < 24 || !buf.subarray(0, 8).equals(PNG_SIG)) return null;
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

/** Largest PNG-encoded image inside an .ico file, or null if it only holds BMPs. */
function largestPngFromIco(ico) {
  if (ico.readUInt16LE(0) !== 0 || ico.readUInt16LE(2) !== 1) throw new Error('icon.ico is not a valid .ico file');
  let best = null;
  for (let i = 0, n = ico.readUInt16LE(4); i < n; i++) {
    const entry = 6 + i * 16;
    const data = ico.subarray(ico.readUInt32LE(entry + 12), ico.readUInt32LE(entry + 12) + ico.readUInt32LE(entry + 8));
    const dims = pngSize(data);
    if (dims && (!best || dims.width > best.width)) best = { ...dims, data };
  }
  return best;
}

function write(rel, data) {
  const out = path.join(root, rel);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, data);
  console.log(`  wrote ${rel}`);
}

const transparent = { r: 0, g: 0, b: 0, alpha: 0 };
const fit = (img, size) => sharp(img).resize(size, size, { fit: 'contain', background: transparent, kernel: 'lanczos3' });

/** `img` scaled to `inner` px, centred on a transparent `size` px canvas. */
async function padded(img, size, inner) {
  const scaled = await fit(img, inner).png().toBuffer();
  return sharp({ create: { width: size, height: size, channels: 4, background: transparent } })
    .composite([{ input: scaled, gravity: 'center' }]).png().toBuffer();
}

/** `img` scaled to `size * ratio`, centred on a filled circle of `color`. */
async function onCircle(img, size, ratio, color) {
  const disc = Buffer.from(`<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="${color}"/></svg>`);
  const scaled = await fit(img, Math.round(size * ratio)).png().toBuffer();
  return sharp(disc).composite([{ input: scaled, gravity: 'center' }]).png().toBuffer();
}

// ---- Load the source image -------------------------------------------------
const hasPng = fs.existsSync(srcPng);
const hasIco = fs.existsSync(srcIco);
if (!hasPng && !hasIco) {
  console.log('No icon.png or icon.ico in the repo root; keeping default icons.');
  process.exit(0);
}

let png = null;
if (hasPng) {
  png = fs.readFileSync(srcPng);
  const dims = pngSize(png);
  if (!dims) throw new Error('icon.png is not a valid PNG file');
  console.log(`Using icon.png (${dims.width}x${dims.height})`);
} else {
  const best = largestPngFromIco(fs.readFileSync(srcIco));
  if (best) {
    png = best.data;
    console.log(`Using ${best.width}x${best.height} image extracted from icon.ico`);
  } else {
    console.warn('::warning::icon.ico has no PNG-encoded image, so only the Windows build gets a custom icon. Add an icon.png to cover the other platforms.');
  }
}

if (png) {
  const { width, height } = pngSize(png);
  if (width !== height) console.warn(`::warning::Icon is ${width}x${height}; it will be letterboxed into a square.`);
  if (Math.min(width, height) < 512) {
    console.warn(`::warning::Icon is only ${Math.min(width, height)}px; upscaling to 1024 (macOS requires 512+). Provide a 1024x1024 icon.png for a sharp result.`);
  }
  // Normalise to a 1024x1024 square so every platform gets the same input.
  png = await fit(png, 1024).png().toBuffer();
}

// ---- Desktop ---------------------------------------------------------------
if (!android) {
  if (png) {
    write('build/icon.png', png);
    write('www/icon.png', png);
    // Linux desktops pick the closest size from build/icons (hicolor theme).
    for (const size of [16, 24, 32, 48, 64, 128, 256, 512, 1024]) {
      write(`build/icons/${size}x${size}.png`, await fit(png, size).png().toBuffer());
    }
  }
  if (hasIco) write('build/icon.ico', fs.readFileSync(srcIco));
  process.exit(0);
}

// ---- Android ---------------------------------------------------------------
const res = 'android/app/src/main/res';
if (!fs.existsSync(path.join(root, res))) {
  console.error('android/ project not found. Run "npx cap add android" first.');
  process.exit(1);
}
if (!png) {
  console.warn('::warning::No usable PNG image for Android; keeping default launcher icon.');
  process.exit(0);
}

// Legacy icons are 48dp (pre-Android 8); adaptive-icon layers are 108dp.
const DENSITIES = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
for (const [name, scale] of Object.entries(DENSITIES)) {
  const legacy = Math.round(48 * scale);
  const layer = Math.round(108 * scale);
  write(`${res}/mipmap-${name}/ic_launcher.png`, await fit(png, legacy).png().toBuffer());
  write(`${res}/mipmap-${name}/ic_launcher_round.png`, await onCircle(png, legacy, ROUND_ICON_RATIO, ANDROID_BG));
  write(`${res}/mipmap-${name}/ic_launcher_foreground.png`, await padded(png, layer, Math.round(ADAPTIVE_ICON_DP * scale)));
}

const adaptive = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>
`;
write(`${res}/mipmap-anydpi-v26/ic_launcher.xml`, adaptive);
write(`${res}/mipmap-anydpi-v26/ic_launcher_round.xml`, adaptive);
write(`${res}/values/ic_launcher_background.xml`, `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">${ANDROID_BG}</color>
</resources>
`);
