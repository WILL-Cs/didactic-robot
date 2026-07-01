import sharp from "sharp";
import { mkdirSync } from "fs";

mkdirSync("public/icons", { recursive: true });

// Icône : disque sombre + mini radar + chiffre stylisé, aux couleurs de l'app.
const icon = (size, maskable) => {
  const pad = maskable ? size * 0.14 : 0; // safe-zone pour icônes maskable
  const s = size - pad * 2;
  const cx = size / 2, cy = size / 2;
  const r = s * 0.32;
  // petit polygone radar
  const pts = [
    [cx, cy - r],
    [cx + r * 0.85, cy - r * 0.25],
    [cx + r * 0.55, cy + r * 0.8],
    [cx - r * 0.55, cy + r * 0.8],
    [cx - r * 0.85, cy - r * 0.25],
  ];
  const poly = pts.map(p => p.join(",")).join(" ");
  const grid = [1, 0.66, 0.33].map(f => {
    const gp = pts.map(([x, y]) => [cx + (x - cx) * f, cy + (y - cy) * f].join(",")).join(" ");
    return `<polygon points="${gp}" fill="none" stroke="#1e2533" stroke-width="${size * 0.008}"/>`;
  }).join("");
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${maskable ? 0 : size * 0.22}" fill="#090b10"/>
  ${grid}
  <polygon points="${poly}" fill="#34d399" fill-opacity="0.18" stroke="#34d399" stroke-width="${size * 0.012}"/>
  ${pts.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="${size * 0.018}" fill="#60a5fa"/>`).join("")}
  <text x="${cx}" y="${cy + r * 1.75}" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-size="${size * 0.13}" font-weight="800" fill="#f8fafc" letter-spacing="-1">VST</text>
</svg>`);
};

const jobs = [
  ["public/icons/icon-192.png", 192, false],
  ["public/icons/icon-512.png", 512, false],
  ["public/icons/maskable-512.png", 512, true],
  ["public/icons/apple-touch-icon.png", 180, false],
  ["public/favicon.png", 64, false],
];

for (const [out, size, maskable] of jobs) {
  await sharp(icon(size, maskable)).png().toFile(out);
  console.log("✓", out);
}
