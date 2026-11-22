const cols = ["#ff3d8b", "#2d5bff", "#b6f03c"], words = ["AHORRA", "HOY", "YA"];
const step = Math.floor(t / 1.6) % 3, lt = t % 1.6, ink = step === 2 ? "#15131a" : "#fff";
ctx.fillStyle = cols[(step + 2) % 3]; ctx.fillRect(0, 0, W, H);
// barrido del color nuevo
const sweep = h.easeInOut(h.prog(lt, 0, 0.3));
ctx.fillStyle = cols[step]; ctx.fillRect(0, 0, W * sweep, H);
// forma que rueda
ctx.fillStyle = step === 0 ? "#ffd84d" : step === 1 ? "#ff8a1f" : "#ff3d8b";
ctx.beginPath(); ctx.arc(W * (-0.2 + 1.1 * h.ease(h.prog(lt, 0.1, 1.2))), H * 0.72, u * 26, 0, Math.PI * 2); ctx.fill();
// palabra ajustada al ancho
const text = words[step]; let px = u * 40;
ctx.font = `900 ${px}px system-ui, "Segoe UI", sans-serif`; px *= Math.min(1, (W * 0.86) / ctx.measureText(text).width);
const k = h.easeOutBack(h.prog(lt, 0.15, 0.35));
ctx.save(); ctx.translate(W / 2, H * 0.42 + (1 - k) * H * 0.5); ctx.rotate(Math.sin(t * 3) * 0.025); ctx.scale(k, k);
ctx.font = `900 ${px}px system-ui, "Segoe UI", sans-serif`; ctx.fillStyle = ink; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(text, 0, 0);
ctx.restore();
