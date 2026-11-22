// Fondos ilustrados procedurales. Todo se dibuja con vectores: nítido a cualquier resolución.
import type { Background } from "../types";

type Ctx = CanvasRenderingContext2D;

export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Fondos claros usan tinta oscura para el texto */
export const LIGHT_BACKGROUNDS: Partial<Record<Background, boolean>> = { paper: true };

function vgrad(ctx: Ctx, H: number, stops: [number, string][]) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  for (const [o, c] of stops) g.addColorStop(o, c);
  return g;
}

function glow(ctx: Ctx, x: number, y: number, r: number, color: string, alpha = 1) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.globalAlpha = alpha;
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.globalAlpha = 1;
}

function hills(ctx: Ctx, W: number, H: number, baseY: number, amp: number, color: string, offset: number, freq: number, seed: number) {
  ctx.beginPath();
  ctx.moveTo(-10, H + 10);
  const steps = 80;
  for (let i = 0; i <= steps; i++) {
    const x = (i / steps) * (W + 20) - 10;
    const k = x / W;
    const y =
      baseY +
      Math.sin(k * freq * Math.PI * 2 + offset + seed) * amp +
      Math.sin(k * freq * 1.7 * Math.PI * 2 + seed * 2.3 + offset * 0.6) * amp * 0.45;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(W + 10, H + 10);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function cloud(ctx: Ctx, x: number, y: number, s: number, alpha: number) {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.ellipse(x, y, s * 1.1, s * 0.42, 0, 0, Math.PI * 2);
  ctx.arc(x - s * 0.45, y - s * 0.12, s * 0.42, 0, Math.PI * 2);
  ctx.arc(x + s * 0.2, y - s * 0.3, s * 0.55, 0, Math.PI * 2);
  ctx.arc(x + s * 0.7, y - s * 0.05, s * 0.36, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function stars(ctx: Ctx, W: number, H: number, t: number, seed: number, count: number, maxY = 1) {
  const r = rng(seed);
  ctx.fillStyle = "#ffffff";
  for (let i = 0; i < count; i++) {
    const x = r() * W;
    const y = r() * H * maxY;
    const size = (r() * 1.8 + 0.6) * (W / 1080) * 1.6;
    const tw = 0.55 + 0.45 * Math.sin(t * (1 + r() * 2.5) + r() * 10);
    ctx.globalAlpha = tw * (0.5 + r() * 0.5);
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function pine(ctx: Ctx, x: number, base: number, h: number, color: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let k = 0; k < 3; k++) {
    const top = base - h + k * h * 0.22;
    const w = h * (0.28 + k * 0.1);
    ctx.moveTo(x, top);
    ctx.lineTo(x + w, top + h * 0.42);
    ctx.lineTo(x - w, top + h * 0.42);
    ctx.closePath();
  }
  ctx.fill();
  ctx.fillRect(x - h * 0.03, base - h * 0.14, h * 0.06, h * 0.16);
}

export function drawBackground(ctx: Ctx, bg: Background, W: number, H: number, t: number, seed: number) {
  const u = Math.min(W, H);
  const r = rng(seed);
  switch (bg) {
    case "sky": {
      ctx.fillStyle = vgrad(ctx, H, [
        [0, "#4fb3f6"],
        [0.55, "#a9dcff"],
        [1, "#fff1dc"],
      ]);
      ctx.fillRect(0, 0, W, H);
      glow(ctx, W * 0.8, H * 0.16, u * 0.45, "rgba(255,244,200,0.95)");
      ctx.fillStyle = "#fff7d6";
      ctx.beginPath();
      ctx.arc(W * 0.8, H * 0.16, u * 0.08, 0, Math.PI * 2);
      ctx.fill();
      for (let i = 0; i < 6; i++) {
        const speed = 8 + r() * 18;
        const s = u * (0.08 + r() * 0.1);
        const x = ((r() * (W + s * 4) + t * speed * (W / 1080)) % (W + s * 4)) - s * 2;
        cloud(ctx, x, H * (0.08 + r() * 0.45), s, 0.75 + r() * 0.25);
      }
      hills(ctx, W, H, H * 0.82, u * 0.04, "#9ed99b", t * 0.05, 1.2, seed % 7);
      hills(ctx, W, H, H * 0.88, u * 0.035, "#6cbf78", t * 0.09, 1.6, (seed % 11) + 2);
      break;
    }
    case "sunset": {
      ctx.fillStyle = vgrad(ctx, H, [
        [0, "#2b1055"],
        [0.38, "#a23b72"],
        [0.6, "#f0656a"],
        [0.78, "#ffb36b"],
        [1, "#ffd89a"],
      ]);
      ctx.fillRect(0, 0, W, H);
      const sy = H * 0.66 + t * u * 0.004;
      glow(ctx, W * 0.5, sy, u * 0.6, "rgba(255,210,120,0.8)");
      ctx.fillStyle = "#ffe7a8";
      ctx.beginPath();
      ctx.arc(W * 0.5, sy, u * 0.15, 0, Math.PI * 2);
      ctx.fill();
      stars(ctx, W, H, t, seed, 40, 0.3);
      hills(ctx, W, H, H * 0.72, u * 0.05, "#8a3a6e", t * 0.04, 1.1, seed % 5);
      hills(ctx, W, H, H * 0.8, u * 0.045, "#5b2459", t * 0.08, 1.5, (seed % 9) + 1);
      hills(ctx, W, H, H * 0.9, u * 0.04, "#33123d", t * 0.14, 2, (seed % 13) + 3);
      break;
    }
    case "night": {
      ctx.fillStyle = vgrad(ctx, H, [
        [0, "#070b22"],
        [0.6, "#16226a"],
        [1, "#3a3f8f"],
      ]);
      ctx.fillRect(0, 0, W, H);
      stars(ctx, W, H, t, seed, 160, 0.85);
      const mx = W * 0.74,
        my = H * 0.17;
      glow(ctx, mx, my, u * 0.35, "rgba(200,210,255,0.55)");
      ctx.fillStyle = "#f4f1e4";
      ctx.beginPath();
      ctx.arc(mx, my, u * 0.075, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(180,175,160,0.35)";
      for (const [dx, dy, rr] of [
        [-0.02, -0.015, 0.016],
        [0.025, 0.02, 0.012],
        [0.005, 0.035, 0.009],
      ]) {
        ctx.beginPath();
        ctx.arc(mx + dx * u, my + dy * u, rr * u, 0, Math.PI * 2);
        ctx.fill();
      }
      hills(ctx, W, H, H * 0.82, u * 0.05, "#141c4d", t * 0.05, 1.3, seed % 7);
      hills(ctx, W, H, H * 0.9, u * 0.04, "#0a0f30", t * 0.1, 1.8, (seed % 5) + 4);
      break;
    }
    case "ocean": {
      ctx.fillStyle = vgrad(ctx, H, [
        [0, "#7ec8f0"],
        [0.42, "#d9f2ff"],
        [0.46, "#2a9fd0"],
        [1, "#0a3561"],
      ]);
      ctx.fillRect(0, 0, W, H);
      glow(ctx, W * 0.3, H * 0.36, u * 0.4, "rgba(255,250,220,0.8)");
      for (let i = 0; i < 4; i++) cloud(ctx, ((r() * W + t * 10) % (W * 1.3)) - W * 0.15, H * (0.08 + r() * 0.22), u * (0.06 + r() * 0.06), 0.8);
      for (let layer = 0; layer < 6; layer++) {
        const baseY = H * (0.5 + layer * 0.085);
        const amp = u * (0.012 + layer * 0.006);
        ctx.beginPath();
        ctx.moveTo(-10, H + 10);
        for (let i = 0; i <= 90; i++) {
          const x = (i / 90) * (W + 20) - 10;
          const y = baseY + Math.sin((x / W) * Math.PI * (4 + layer) + t * (0.9 + layer * 0.25) + layer) * amp;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(W + 10, H + 10);
        ctx.closePath();
        const light = 50 - layer * 6;
        ctx.fillStyle = `hsla(${200 + layer * 2}, 75%, ${light}%, ${0.55 + layer * 0.07})`;
        ctx.fill();
      }
      break;
    }
    case "forest": {
      ctx.fillStyle = vgrad(ctx, H, [
        [0, "#ffe9c7"],
        [0.45, "#c9e8c0"],
        [1, "#5f9a6a"],
      ]);
      ctx.fillRect(0, 0, W, H);
      glow(ctx, W * 0.5, H * 0.3, u * 0.6, "rgba(255,240,200,0.7)");
      const rows: [number, number, string, number][] = [
        [0.66, 0.22, "#7fae86", 0.03],
        [0.78, 0.28, "#4c7d58", 0.06],
        [0.92, 0.36, "#24472f", 0.1],
      ];
      for (const [baseK, hK, color, par] of rows) {
        const count = 9;
        const h = u * hK;
        for (let i = -1; i <= count; i++) {
          const jitter = r();
          const x = ((i + jitter * 0.5) / count) * W - ((t * par * W) % (W / count));
          pine(ctx, x, H * baseK + jitter * u * 0.03, h * (0.75 + jitter * 0.4), color);
        }
        ctx.fillStyle = color;
        ctx.fillRect(0, H * baseK, W, H);
      }
      ctx.fillStyle = "#fff6b0";
      for (let i = 0; i < 18; i++) {
        const x = (r() * W + Math.sin(t * 0.6 + i) * u * 0.04) % W;
        const y = H * (0.55 + r() * 0.4) + Math.cos(t * 0.8 + i) * u * 0.03;
        ctx.globalAlpha = 0.4 + 0.5 * Math.max(0, Math.sin(t * 2 + i * 1.7));
        ctx.beginPath();
        ctx.arc(x, y, u * 0.005, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      break;
    }
    case "city": {
      ctx.fillStyle = vgrad(ctx, H, [
        [0, "#1d1748"],
        [0.5, "#6b3a8a"],
        [0.8, "#ff8a65"],
        [1, "#ffc48a"],
      ]);
      ctx.fillRect(0, 0, W, H);
      stars(ctx, W, H, t, seed, 50, 0.4);
      const layers: [number, string, number, number][] = [
        [0.58, "#3b2d6b", 0.02, 0.35],
        [0.7, "#221a45", 0.05, 0.5],
      ];
      for (const [topK, color, par, lit] of layers) {
        const lr = rng(seed + topK * 1000);
        let x = -((t * par * W) % (W * 0.2)) - W * 0.1;
        while (x < W + W * 0.1) {
          const bw = W * (0.07 + lr() * 0.09);
          const bh = H * (1 - topK) * (0.45 + lr() * 0.6);
          const by = H - bh;
          ctx.fillStyle = color;
          ctx.fillRect(x, by, bw - W * 0.006, bh);
          const cell = u * 0.018;
          for (let wy = by + cell; wy < H - cell; wy += cell * 1.9) {
            for (let wx = x + cell * 0.6; wx < x + bw - cell * 1.2; wx += cell * 1.6) {
              const v = lr();
              if (v < lit) {
                const flick = 0.75 + 0.25 * Math.sin(t * 1.3 + v * 50);
                ctx.fillStyle = `rgba(255, 214, 140, ${0.75 * flick})`;
                ctx.fillRect(wx, wy, cell * 0.8, cell);
              }
            }
          }
          x += bw;
        }
      }
      break;
    }
    case "space": {
      const g = ctx.createRadialGradient(W * 0.5, H * 0.5, 0, W * 0.5, H * 0.5, Math.max(W, H) * 0.8);
      g.addColorStop(0, "#1a0b3d");
      g.addColorStop(1, "#03010a");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      glow(ctx, W * 0.25, H * 0.35, u * 0.6, "rgba(124,58,237,0.45)");
      glow(ctx, W * 0.75, H * 0.7, u * 0.55, "rgba(14,165,233,0.35)");
      stars(ctx, W, H, t, seed, 220, 1);
      const px = W * 0.74,
        py = H * 0.22,
        pr = u * 0.12;
      const pg = ctx.createLinearGradient(px - pr, py - pr, px + pr, py + pr);
      pg.addColorStop(0, "#ffb88c");
      pg.addColorStop(1, "#de6262");
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(-0.35 + Math.sin(t * 0.3) * 0.03);
      ctx.strokeStyle = "rgba(255,220,190,0.7)";
      ctx.lineWidth = u * 0.012;
      ctx.beginPath();
      ctx.ellipse(0, 0, pr * 1.8, pr * 0.42, 0, Math.PI, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = pg;
      ctx.beginPath();
      ctx.arc(0, 0, pr, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(0, 0, pr * 1.8, pr * 0.42, 0, 0, Math.PI);
      ctx.stroke();
      ctx.restore();
      const cycle = (t * 0.35 + (seed % 10) / 10) % 1;
      if (cycle < 0.25) {
        const k = cycle / 0.25;
        const sx = W * (0.1 + k * 0.6),
          sy = H * (0.1 + k * 0.25);
        const tail = ctx.createLinearGradient(sx, sy, sx - u * 0.2, sy - u * 0.08);
        tail.addColorStop(0, "rgba(255,255,255,0.9)");
        tail.addColorStop(1, "rgba(255,255,255,0)");
        ctx.strokeStyle = tail;
        ctx.lineWidth = u * 0.004;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx - u * 0.2, sy - u * 0.08);
        ctx.stroke();
      }
      break;
    }
    case "aurora": {
      ctx.fillStyle = "#24164f";
      ctx.fillRect(0, 0, W, H);
      const blobs: [string, number, number, number][] = [
        ["rgba(255,95,170,0.85)", 0.25, 0.3, 0.55],
        ["rgba(118,95,255,0.85)", 0.75, 0.35, 0.6],
        ["rgba(40,210,220,0.75)", 0.35, 0.75, 0.55],
        ["rgba(255,170,80,0.7)", 0.8, 0.8, 0.5],
      ];
      blobs.forEach(([c, bx, by, br], i) => {
        const x = W * (bx + Math.sin(t * 0.35 + i * 1.9 + seed) * 0.12);
        const y = H * (by + Math.cos(t * 0.3 + i * 2.3 + seed) * 0.08);
        glow(ctx, x, y, Math.max(W, H) * br, c);
      });
      break;
    }
    case "paper": {
      ctx.fillStyle = "#f6eedf";
      ctx.fillRect(0, 0, W, H);
      glow(ctx, W * 0.5, H * 0.35, Math.max(W, H) * 0.6, "rgba(255,255,255,0.75)");
      const colors = ["#ff7a7a", "#ffc35c", "#6cc7a5", "#6b8cff", "#c58bff"];
      for (let i = 0; i < 26; i++) {
        const x = r() * W;
        const baseY = r() * H;
        const y = (baseY + t * u * (0.01 + r() * 0.02)) % H;
        const size = u * (0.012 + r() * 0.02);
        const kind = Math.floor(r() * 3);
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(t * (r() - 0.5) * 1.5 + r() * 6);
        ctx.fillStyle = colors[i % colors.length];
        ctx.strokeStyle = colors[i % colors.length];
        ctx.globalAlpha = 0.75;
        if (kind === 0) {
          ctx.beginPath();
          ctx.arc(0, 0, size * 0.5, 0, Math.PI * 2);
          ctx.fill();
        } else if (kind === 1) {
          ctx.fillRect(-size * 0.5, -size * 0.2, size, size * 0.4);
        } else {
          ctx.lineWidth = size * 0.22;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(-size, 0);
          ctx.quadraticCurveTo(-size * 0.5, -size * 0.6, 0, 0);
          ctx.quadraticCurveTo(size * 0.5, size * 0.6, size, 0);
          ctx.stroke();
        }
        ctx.restore();
      }
      ctx.globalAlpha = 1;
      break;
    }
  }
}
