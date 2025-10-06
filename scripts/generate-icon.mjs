import { PNG } from 'pngjs';
import { createWriteStream } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const size = 512;
const iconPath = path.join(process.cwd(), 'public', 'icon-512.png');

const primary = [37, 99, 235]; // #2563eb
const secondary = [15, 23, 42]; // #0f172a
const bubble = [226, 232, 240]; // slate-200 for bubble
const accent = [94, 234, 212]; // teal accent for tail highlight

function lerp(a, b, t) {
  return Math.round(a + (b - a) * t);
}

function fillGradient(png) {
  for (let y = 0; y < size; y++) {
    const t = y / (size - 1);
    for (let x = 0; x < size; x++) {
      const idx = (size * y + x) << 2;
      png.data[idx] = lerp(primary[0], secondary[0], t);
      png.data[idx + 1] = lerp(primary[1], secondary[1], t);
      png.data[idx + 2] = lerp(primary[2], secondary[2], t);
      png.data[idx + 3] = 255;
    }
  }
}

function drawRoundedRect(png, x0, y0, width, height, radius, color) {
  const [r, g, b] = color;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const globalX = x0 + x;
      const globalY = y0 + y;
      if (globalX < 0 || globalX >= size || globalY < 0 || globalY >= size) continue;

      const cornerX = x < radius ? radius - x : x >= width - radius ? x - (width - radius - 1) : 0;
      const cornerY = y < radius ? radius - y : y >= height - radius ? y - (height - radius - 1) : 0;
      if (cornerX > 0 && cornerY > 0 && cornerX * cornerX + cornerY * cornerY > radius * radius) {
        continue;
      }

      const idx = (size * globalY + globalX) << 2;
      png.data[idx] = r;
      png.data[idx + 1] = g;
      png.data[idx + 2] = b;
      png.data[idx + 3] = 255;
    }
  }
}

function drawTail(png, x0, y0, width, height, color) {
  const [r, g, b] = color;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const globalX = x0 + x;
      const globalY = y0 + y;
      if (globalX < 0 || globalX >= size || globalY < 0 || globalY >= size) continue;
      const t = y / (height - 1);
      const cutoff = width * (1 - t * 0.9);
      if (x > cutoff) continue;
      const idx = (size * globalY + globalX) << 2;
      png.data[idx] = r;
      png.data[idx + 1] = g;
      png.data[idx + 2] = b;
      png.data[idx + 3] = 255;
    }
  }
}

async function generate() {
  const png = new PNG({ width: size, height: size });

  fillGradient(png);

  const bubbleWidth = 320;
  const bubbleHeight = 220;
  const bubbleRadius = 48;
  const bubbleX = Math.round((size - bubbleWidth) / 2);
  const bubbleY = Math.round((size - bubbleHeight) / 2) - 20;

  drawRoundedRect(png, bubbleX, bubbleY, bubbleWidth, bubbleHeight, bubbleRadius, bubble);

  const tailWidth = 120;
  const tailHeight = 100;
  const tailX = bubbleX + bubbleWidth - 60;
  const tailY = bubbleY + bubbleHeight - 20;
  drawTail(png, tailX, tailY, tailWidth, tailHeight, bubble);

  const accentTailWidth = 60;
  const accentTailHeight = 70;
  const accentTailX = tailX + 20;
  const accentTailY = tailY + 20;
  drawTail(png, accentTailX, accentTailY, accentTailWidth, accentTailHeight, accent);

  const innerWidth = 220;
  const innerHeight = 120;
  const innerRadius = 32;
  const innerX = bubbleX + Math.round((bubbleWidth - innerWidth) / 2);
  const innerY = bubbleY + Math.round((bubbleHeight - innerHeight) / 2);
  const innerColor = [37, 99, 235];
  drawRoundedRect(png, innerX, innerY, innerWidth, innerHeight, innerRadius, innerColor);

  await mkdir(path.dirname(iconPath), { recursive: true });

  await new Promise((resolve, reject) => {
    const stream = createWriteStream(iconPath);
    stream.on('finish', resolve);
    stream.on('error', reject);
    png.pack().pipe(stream);
  });
}

generate().catch((error) => {
  console.error('[icon] Failed to generate icon-512.png:', error);
  process.exit(1);
});
