const chalk = "#f3efe4";
ctx.fillStyle = "#1f3b33"; ctx.fillRect(0, 0, W, H);
const v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.75);
v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(0,0,0,0.35)"); ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
for (let i = 0; i < 14; i++) { ctx.fillStyle = "rgba(255,255,255,0.03)"; ctx.beginPath(); ctx.ellipse(h.rand(i) * W, h.rand(i + 9) * H, u * 14, u * 5, h.rand(i + 3) * 3, 0, 7); ctx.fill(); }
function hand(x1, y1, x2, y2, p, seed, color) {
  const n = 16; ctx.beginPath();
  for (let i = 0; i <= n * p; i++) { const k = i / n, jx = (h.rand(seed + i) - 0.5) * u * 0.5, jy = (h.rand(seed + i + 50) - 0.5) * u * 0.5; const x = h.lerp(x1, x2, k) + jx, y = h.lerp(y1, y2, k) + jy; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
  ctx.strokeStyle = color || chalk; ctx.lineWidth = u * 0.9; ctx.lineCap = "round"; ctx.stroke();
}
const word = "¿AHORRAR?";
ctx.font = `600 ${u * 11}px "Segoe Print", "Comic Sans MS", system-ui, sans-serif`; ctx.fillStyle = chalk; ctx.textAlign = "center";
ctx.fillText(word.slice(0, Math.round(word.length * h.prog(t, 0.2, 0.9))), W / 2, H * 0.26);
hand(W * 0.2, H * 0.3, W * 0.8, H * 0.3, h.prog(t, 1.1, 0.4), 1, "#f6d96b");
hand(W * 0.22, H * 0.315, W * 0.78, H * 0.315, h.prog(t, 1.3, 0.4), 30, "#f6d96b");
// tres cajas unidas por flechas
for (let i = 0; i < 3; i++) {
  const p = h.prog(t, 1.6 + i * 0.5, 0.5), bx = W * (0.14 + i * 0.27), by = H * 0.5, bw = W * 0.18, bh = u * 12;
  hand(bx, by, bx + bw, by, p, 60 + i * 9); hand(bx + bw, by, bx + bw, by + bh, p, 70 + i * 9);
  hand(bx + bw, by + bh, bx, by + bh, p, 80 + i * 9); hand(bx, by + bh, bx, by, p, 90 + i * 9);
  if (i < 2) hand(bx + bw + u, by + bh / 2, bx + W * 0.27 - u, by + bh / 2, h.prog(t, 1.9 + i * 0.5, 0.3), 120 + i);
}
