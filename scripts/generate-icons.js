// Generates PNG extension and PWA icons from the selected Slotto slot-picker
// concept. Uses only Node built-ins so icon generation works without external tools.
import { mkdir, writeFile } from 'node:fs/promises';
import { deflateSync } from 'node:zlib';

const sizes = [16, 32, 48, 128, 180, 192, 512];
const outDirs = [
  new URL('../assets/icons/', import.meta.url),
  new URL('../web/public/icons/', import.meta.url)
];
const crcTable = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  return value >>> 0;
});

await Promise.all(outDirs.map((outDir) => mkdir(outDir, { recursive: true })));

for (const size of sizes) {
  const png = renderIcon(size);
  await Promise.all(outDirs.map((outDir) => writeFile(new URL(`icon-${size}.png`, outDir), png)));
}

console.log(`generated ${sizes.map((size) => `icon-${size}.png`).join(', ')}`);

function renderIcon(size) {
  const supersample = size <= 32 ? 4 : 3;
  const canvasSize = size * supersample;
  const pixels = new Uint8ClampedArray(canvasSize * canvasSize * 4);
  const scale = canvasSize / 128;

  for (let y = 0; y < canvasSize; y += 1) {
    for (let x = 0; x < canvasSize; x += 1) {
      const px = x / scale;
      const py = y / scale;
      const t = clamp((px + py - 36) / 184, 0, 1);
      const bg = mix(hex('#0EA5E9'), hex('#10B981'), t);
      setPixel(pixels, canvasSize, x, y, roundedRect(px, py, 0, 0, 128, 128, 28) ? bg : [0, 0, 0, 0]);
    }
  }

  drawRoundedRect(pixels, canvasSize, scale, 26, 28, 76, 18, 9, [236, 254, 255, 235]);
  drawRoundedRect(pixels, canvasSize, scale, 26, 55, 76, 18, 9, [255, 255, 255, 255]);
  drawRoundedRect(pixels, canvasSize, scale, 26, 82, 76, 18, 9, [236, 254, 255, 235]);
  drawCircle(pixels, canvasSize, scale, 36, 37, 4, [2, 132, 199, 255]);
  drawCircle(pixels, canvasSize, scale, 36, 91, 4, [2, 132, 199, 255]);
  drawStroke(pixels, canvasSize, scale, [[32, 64], [40, 72], [57, 54]], 7, [5, 150, 105, 255]);
  drawRoundedRect(pixels, canvasSize, scale, 62, 61, 27, 6, 3, [21, 94, 239, 255]);
  drawPolygon(pixels, canvasSize, scale, [
    [95, 22],
    [98, 29.7],
    [105.7, 32.7],
    [98, 35.7],
    [95, 43.4],
    [92, 35.7],
    [84.3, 32.7],
    [92, 29.7]
  ], [250, 204, 21, 255]);

  return encodePng(downsample(pixels, canvasSize, size, supersample), size, size);
}

function drawRoundedRect(pixels, canvasSize, scale, x, y, width, height, radius, color) {
  drawShape(pixels, canvasSize, scale, color, (px, py) => roundedRect(px, py, x, y, width, height, radius));
}

function drawCircle(pixels, canvasSize, scale, cx, cy, radius, color) {
  drawShape(pixels, canvasSize, scale, color, (px, py) => (px - cx) ** 2 + (py - cy) ** 2 <= radius ** 2);
}

function drawPolygon(pixels, canvasSize, scale, points, color) {
  drawShape(pixels, canvasSize, scale, color, (px, py) => pointInPolygon(px, py, points));
}

function drawStroke(pixels, canvasSize, scale, points, width, color) {
  const radius = width / 2;
  drawShape(pixels, canvasSize, scale, color, (px, py) => {
    for (let index = 0; index < points.length - 1; index += 1) {
      if (distanceToSegment(px, py, points[index], points[index + 1]) <= radius) {
        return true;
      }
    }
    return false;
  });
}

function drawShape(pixels, canvasSize, scale, color, contains) {
  for (let y = 0; y < canvasSize; y += 1) {
    for (let x = 0; x < canvasSize; x += 1) {
      if (contains(x / scale, y / scale)) {
        blendPixel(pixels, canvasSize, x, y, color);
      }
    }
  }
}

function roundedRect(px, py, x, y, width, height, radius) {
  const nearestX = clamp(px, x + radius, x + width - radius);
  const nearestY = clamp(py, y + radius, y + height - radius);
  return px >= x && px <= x + width && py >= y && py <= y + height
    && ((px - nearestX) ** 2 + (py - nearestY) ** 2 <= radius ** 2);
}

function pointInPolygon(px, py, points) {
  let inside = false;
  for (let index = 0, prev = points.length - 1; index < points.length; prev = index, index += 1) {
    const [xi, yi] = points[index];
    const [xj, yj] = points[prev];
    const intersects = ((yi > py) !== (yj > py)) && (px < ((xj - xi) * (py - yi)) / (yj - yi) + xi);
    if (intersects) {
      inside = !inside;
    }
  }
  return inside;
}

function distanceToSegment(px, py, a, b) {
  const [ax, ay] = a;
  const [bx, by] = b;
  const dx = bx - ax;
  const dy = by - ay;
  if (dx === 0 && dy === 0) {
    return Math.hypot(px - ax, py - ay);
  }
  const t = clamp(((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy), 0, 1);
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function downsample(source, sourceSize, targetSize, factor) {
  const target = new Uint8ClampedArray(targetSize * targetSize * 4);
  for (let y = 0; y < targetSize; y += 1) {
    for (let x = 0; x < targetSize; x += 1) {
      const total = [0, 0, 0, 0];
      for (let sy = 0; sy < factor; sy += 1) {
        for (let sx = 0; sx < factor; sx += 1) {
          const index = ((y * factor + sy) * sourceSize + (x * factor + sx)) * 4;
          total[0] += source[index];
          total[1] += source[index + 1];
          total[2] += source[index + 2];
          total[3] += source[index + 3];
        }
      }
      const count = factor * factor;
      setPixel(target, targetSize, x, y, total.map((value) => Math.round(value / count)));
    }
  }
  return target;
}

function blendPixel(pixels, width, x, y, color) {
  const index = (y * width + x) * 4;
  const alpha = color[3] / 255;
  const inverse = 1 - alpha;
  pixels[index] = Math.round(color[0] * alpha + pixels[index] * inverse);
  pixels[index + 1] = Math.round(color[1] * alpha + pixels[index + 1] * inverse);
  pixels[index + 2] = Math.round(color[2] * alpha + pixels[index + 2] * inverse);
  pixels[index + 3] = Math.round(color[3] + pixels[index + 3] * inverse);
}

function setPixel(pixels, width, x, y, color) {
  const index = (y * width + x) * 4;
  pixels[index] = color[0];
  pixels[index + 1] = color[1];
  pixels[index + 2] = color[2];
  pixels[index + 3] = color[3];
}

function encodePng(pixels, width, height) {
  const rowLength = width * 4 + 1;
  const raw = Buffer.alloc(rowLength * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * rowLength] = 0;
    for (let x = 0; x < width * 4; x += 1) {
      raw[y * rowLength + 1 + x] = pixels[y * width * 4 + x];
    }
  }

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', Buffer.concat([uint32(width), uint32(height), Buffer.from([8, 6, 0, 0, 0])])),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type);
  return Buffer.concat([uint32(data.length), typeBuffer, data, uint32(crc32(Buffer.concat([typeBuffer, data])))]);
}

function uint32(value) {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32BE(value >>> 0);
  return buffer;
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ byte) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function mix(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
    255
  ];
}

function hex(value) {
  return [
    Number.parseInt(value.slice(1, 3), 16),
    Number.parseInt(value.slice(3, 5), 16),
    Number.parseInt(value.slice(5, 7), 16)
  ];
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
