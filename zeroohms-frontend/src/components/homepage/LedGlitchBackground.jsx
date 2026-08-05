import { useRef, useEffect } from "react";

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const clampByte = (v) =>
  Number.isFinite(v) ? Math.max(0, Math.min(255, Math.round(v))) : 0;

const DITHER = [0, 12, 3, 15, 8, 4, 11, 7, 2, 14, 1, 13, 10, 6, 9, 5];

function hexToRgb(hex) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || "");
  return m
    ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)]
    : [255, 255, 255];
}

function drawBitwiseCascade(buf, w, h, t, p) {
  const pSize = Math.max(1, Math.floor(1.0 + p.blockSize * 4.0));
  const maskVal = Math.floor(p.bitThresh * 31);
  const dropCutoff = Math.round(p.density * 16);
  const [hr, hg, hb] = p.highlightRgb;
  const [br, bg_, bb] = p.baseRgb;
  const [bgr, bgg, bgb] = p.bgRgb;

  for (let y = 0; y < h; y++) {
    const faultLine = Math.sin(y * 0.08 + t * 0.4) * Math.cos(y * 0.03);
    let hShift = 0;
    if (faultLine > 0.9 - p.tear * 0.7) {
      hShift = Math.floor(Math.tan(y * 0.05 + t) * (p.tear * 15.0));
    }

    for (let x = 0; x < w; x++) {
      const sx = Math.floor(((x + hShift + w) % w) / pSize) * pSize;
      const sy = Math.floor(y / pSize) * pSize;

      const streamSeed = Math.sin(Math.floor(sx / 8) * 54.12) * 0.5 + 0.5;
      let drop = Math.floor(sy / 4 - t * (0.6 + streamSeed * 0.4)) % 16;
      if (drop < 0) drop += 16;
      const rainMass = drop < dropCutoff ? 1.0 : 0.0;

      const bitField =
        (((sx / pSize) ^ (sy / pSize)) & maskVal) === 0 ? 0.5 : 0.0;

      let totalSignal = rainMass * 0.6 + bitField;

      const cx = sx - w * 0.5;
      const cy = sy - h * 0.5;
      const bgWave =
        Math.sin(Math.sqrt(cx * cx + cy * cy) * 0.15 - t) * 0.25;
      totalSignal += bgWave;

      const mx = x % 4;
      const my = y % 4;
      const thresh = DITHER[my * 4 + mx] / 16.0;

      let r = bgr,
        g = bgg,
        b = bgb;
      if (totalSignal > thresh) {
        if (rainMass > 0.0 && drop === 0) {
          r = hr;
          g = hg;
          b = hb;
        } else {
          r = br;
          g = bg_;
          b = bb;
        }
      }

      const i = (y * w + x) * 4;
      buf[i] = clampByte(r);
      buf[i + 1] = clampByte(g);
      buf[i + 2] = clampByte(b);
      buf[i + 3] = 255;
    }
  }
}

export default function LedGlitchBackground({
  tear = 0.4,
  velocity = 0.5,
  blockSize = 0.3,
  bitThresh = 0.18,
  density = 0.4,
  pixelSize = 4,
  bloom = 0.55,
  dotMask = true,
  highlightColor = "#ff0096",
  baseColor = "#ffffff",
  bgColor = "#050505",
  className = "",
  style,
}) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const maskCanvasRef = useRef(null);
  const maskKeyRef = useRef("");

  const propsRef = useRef({
    tear,
    velocity,
    blockSize,
    bitThresh,
    density,
    pixelSize,
    bloom,
    dotMask,
    highlightColor,
    baseColor,
    bgColor,
  });
  propsRef.current = {
    tear,
    velocity,
    blockSize,
    bitThresh,
    density,
    pixelSize,
    bloom,
    dotMask,
    highlightColor,
    baseColor,
    bgColor,
  };

  useEffect(() => {
    let raf;
    let last = performance.now();
    let timeAcc = 0;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    const off = document.createElement("canvas");
    const offCtx = off.getContext("2d");

    const bloomCanvas = document.createElement("canvas");
    const bloomCtx = bloomCanvas.getContext("2d");

    const sharp = document.createElement("canvas");
    const sharpCtx = sharp.getContext("2d");

    let W = 64,
      H = 32,
      cell = 4;
    let buf = new Uint8ClampedArray(W * H * 4);
    let imgData = offCtx.createImageData(W, H);

    const rebuildMask = () => {
      const key = `${W}x${H}x${cell}`;
      if (maskKeyRef.current === key && maskCanvasRef.current) return;
      maskKeyRef.current = key;
      const m = document.createElement("canvas");
      m.width = W * cell;
      m.height = H * cell;
      const mctx = m.getContext("2d");
      mctx.fillStyle = "#000";
      mctx.fillRect(0, 0, m.width, m.height);
      mctx.fillStyle = "#fff";
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          mctx.beginPath();
          mctx.arc(
            x * cell + cell / 2,
            y * cell + cell / 2,
            cell * 0.36,
            0,
            Math.PI * 2,
          );
          mctx.fill();
        }
      }
      maskCanvasRef.current = m;
    };

    const resize = () => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      cell = propsRef.current.pixelSize;
      W = clamp(Math.floor(rect.width / cell), 32, 260);
      H = clamp(Math.floor(rect.height / cell), 18, 160);

      canvas.width = Math.floor(rect.width * dpr) || 1;
      canvas.height = Math.floor(rect.height * dpr) || 1;
      canvas.style.width = rect.width + "px";
      canvas.style.height = rect.height + "px";

      off.width = W;
      off.height = H;
      imgData = offCtx.createImageData(W, H);
      buf = new Uint8ClampedArray(W * H * 4);

      bloomCanvas.width = canvas.width;
      bloomCanvas.height = canvas.height;
      sharp.width = canvas.width;
      sharp.height = canvas.height;

      rebuildMask();
    };

    resize();
    const ro = new ResizeObserver(resize);
    if (containerRef.current) ro.observe(containerRef.current);

    const tick = (now) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const p = propsRef.current;

      if (cell !== p.pixelSize) resize();

      timeAcc += dt * p.velocity * 3.0;

      drawBitwiseCascade(buf, W, H, timeAcc, {
        tear: p.tear,
        velocity: p.velocity,
        blockSize: p.blockSize,
        bitThresh: p.bitThresh,
        density: p.density,
        highlightRgb: hexToRgb(p.highlightColor),
        baseRgb: hexToRgb(p.baseColor),
        bgRgb: hexToRgb(p.bgColor),
      });

      imgData.data.set(buf);
      offCtx.putImageData(imgData, 0, 0);

      const cw = canvas.width,
        ch = canvas.height;

      if (p.bloom > 0.01) {
        bloomCtx.clearRect(0, 0, cw, ch);
        bloomCtx.filter = "blur(8px) saturate(1.4)";
        bloomCtx.drawImage(off, 0, 0, cw, ch);
        bloomCtx.filter = "none";
      }

      ctx.fillStyle = p.bgColor;
      ctx.fillRect(0, 0, cw, ch);

      if (p.bloom > 0.01) {
        ctx.globalAlpha = p.bloom;
        ctx.drawImage(bloomCanvas, 0, 0);
        ctx.globalAlpha = 1;
      }

      if (p.dotMask && maskCanvasRef.current) {
        sharpCtx.clearRect(0, 0, cw, ch);
        sharpCtx.imageSmoothingEnabled = false;
        sharpCtx.drawImage(off, 0, 0, cw, ch);
        sharpCtx.globalCompositeOperation = "destination-in";
        sharpCtx.drawImage(maskCanvasRef.current, 0, 0, cw, ch);
        sharpCtx.globalCompositeOperation = "source-over";
        ctx.drawImage(sharp, 0, 0);
      } else {
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(off, 0, 0, cw, ch);
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 w-full h-full overflow-hidden ${className}`}
      style={style}
    >
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
}
