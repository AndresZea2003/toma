const gy = H * 0.66;
const font = (px, w = 700) => `${w} ${px}px system-ui, "Segoe UI", sans-serif`;
ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
const g = ctx.createRadialGradient(W / 2, H * 0.42, 0, W / 2, H * 0.42, Math.max(W, H) * 0.6);
g.addColorStop(0, "rgba(255,255,255,0.09)"); g.addColorStop(1, "rgba(255,255,255,0)");
ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
ctx.strokeStyle = "rgba(255,255,255,0.3)"; ctx.lineWidth = u * 0.3; ctx.setLineDash([u * 0.8, u * 1.4]);
ctx.beginPath(); ctx.moveTo(W * 0.08, gy); ctx.lineTo(W * 0.92, gy); ctx.stroke(); ctx.setLineDash([]);
// silueta con birrete
const a = h.easeOutBack(h.prog(t, 0.2, 0.6)), s = u * 9, x = W * 0.3, py = gy + (1 - a) * s;
ctx.save(); ctx.globalAlpha = h.prog(t, 0.2, 0.3); ctx.fillStyle = "#fff"; ctx.shadowColor = "#fff"; ctx.shadowBlur = u * 4;
ctx.beginPath(); ctx.arc(x, py - s * 1.55, s * 0.42, 0, Math.PI * 2); ctx.fill();
ctx.beginPath(); ctx.roundRect(x - s * 0.62, py - s * 1.02, s * 1.24, s * 1.02, [s * 0.5, s * 0.5, s * 0.08, s * 0.08]); ctx.fill();
ctx.beginPath(); ctx.moveTo(x - s * 0.7, py - s * 2.02); ctx.lineTo(x, py - s * 2.3); ctx.lineTo(x + s * 0.7, py - s * 2.02); ctx.lineTo(x, py - s * 1.78); ctx.closePath(); ctx.fill();
ctx.restore();
// curva que se dibuja
const p = h.easeInOut(h.prog(t, 0.9, 1.6)), x0 = W * 0.5, x1 = W * 0.9, y0 = gy - u * 2, y1 = H * 0.3;
ctx.strokeStyle = "#fff"; ctx.lineWidth = u * 0.6; ctx.lineCap = "round"; ctx.beginPath();
for (let i = 0; i <= 40 * p; i++) { const k = i / 40, cx = h.lerp(x0, x1, k), cy = h.lerp(y0, y1, k * k * k); i ? ctx.lineTo(cx, cy) : ctx.moveTo(cx, cy); }
ctx.stroke();
// cifra y etiqueta
const c = h.prog(t, 1.2, 1.4);
ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.font = font(u * 9, 800); ctx.globalAlpha = h.prog(t, 1.1, 0.4);
ctx.fillText("$" + Math.round(1000 * h.easeInOut(c)), W * 0.7, H * 0.24);
ctx.font = font(u * 2.6); ctx.letterSpacing = `${u * 0.4}px`; ctx.globalAlpha = h.prog(t, 0.6, 0.4) * 0.8;
ctx.fillText("EL MÁS LISTO", x, gy - s * 2.9 - Math.sin(t * 2) * u * 0.4);
