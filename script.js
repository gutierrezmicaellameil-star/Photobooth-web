"use strict";

// ── DOM References ────────────────────────────────────────
const videoFeed        = document.getElementById("videoFeed");
const filterCanvas     = document.getElementById("filterCanvas");
const cameraOffScreen  = document.getElementById("cameraOffScreen");
const countdownOverlay = document.getElementById("countdownOverlay");
const countdownNumber  = document.getElementById("countdownNumber");
const shotIndicator    = document.getElementById("shotIndicator");
const flashOverlay     = document.getElementById("flashOverlay");
const startBtn         = document.getElementById("startBtn");
const retakeBtn        = document.getElementById("retakeBtn");
const flipBtn          = document.getElementById("flipBtn");
const downloadBtn      = document.getElementById("downloadBtn");
const downloadArea     = document.getElementById("downloadArea");
const statusMsg        = document.getElementById("statusMsg");
const filterBtns       = document.querySelectorAll(".filter-btn");
const themeBtns        = document.querySelectorAll(".theme-btn");
const stripContainer   = document.getElementById("stripContainer");
const stripHeaderLabel = document.getElementById("stripHeaderLabel");
const stripTagline     = document.getElementById("stripTagline");
const stripFrames      = [0,1,2,3].map(i => document.getElementById(`frame${i}`));
const dots             = [0,1,2,3].map(i => document.getElementById(`dot${i}`));
const stripDate        = document.getElementById("stripDate");

// ── State ─────────────────────────────────────────────────
let stream          = null;
let currentFilter   = "normal";
let currentTheme    = "classic";
let capturedImages  = [];
let isRunning       = false;
let facingMode      = "user"; // "user" = front, "environment" = back

// ── Filter CSS map ────────────────────────────────────────
const FILTER_CSS = {
  normal:    "none",
  grayscale: "grayscale(1)",
  sepia:     "sepia(0.9)",
  vivid:     "saturate(2) contrast(1.1)",
};

// ── Sticker sets per theme ────────────────────────────────
const STICKERS = {
  classic:  ["", "", "", ""],
  pastel:   ["🌸", "⭐", "🐠", "🌙"],
  diner:    ["🎵", "🎶", "🎵", "🎵"],
  cottage:  ["🌻", "🌿", "🌸", "❋"],
};

const STICKER_POS = {
  classic:  null,
  pastel:   [
    { xRatio: 0.93, yRatio: 0.10, anchor: "tr" },
    { xRatio: 0.08, yRatio: 0.88, anchor: "bl" },
    { xRatio: 0.93, yRatio: 0.10, anchor: "tr" },
    { xRatio: 0.08, yRatio: 0.88, anchor: "bl" },
  ],
  diner: [
    { xRatio: 0.08, yRatio: 0.10, anchor: "tl" },
    { xRatio: 0.08, yRatio: 0.10, anchor: "tl" },
    { xRatio: 0.08, yRatio: 0.10, anchor: "tl" },
    { xRatio: 0.08, yRatio: 0.10, anchor: "tl" },
  ],
  cottage: [
    { xRatio: 0.5, yRatio: 0.5, anchor: "center" },
    { xRatio: 0.5, yRatio: 0.5, anchor: "center" },
    { xRatio: 0.5, yRatio: 0.5, anchor: "center" },
    { xRatio: 0.5, yRatio: 0.5, anchor: "center" },
  ],
};

// ── Theme config ──────────────────────────────────────────
const THEMES = {
  classic: {
    header:  "SnapBooth",
    tagline: "",
    padding: 24, gap: 6, labelTop: 56, labelBtm: 44,
    drawBg(ctx, sw, sh) {
      ctx.fillStyle = "#f5f0e8";
      ctx.fillRect(0, 0, sw, sh);
      ctx.strokeStyle = "rgba(0,0,0,0.12)"; ctx.lineWidth = 3;
      ctx.strokeRect(6, 6, sw - 12, sh - 12);
    },
    drawHeader(ctx, sw, ltop, fw) {
      ctx.fillStyle = "#1a1a22";
      ctx.font = `italic ${Math.round(fw * 0.07)}px Georgia, serif`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("SnapBooth", sw / 2, ltop / 2 + 4);
      ctx.strokeStyle = "rgba(0,0,0,0.1)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(24, ltop - 4); ctx.lineTo(sw - 24, ltop - 4); ctx.stroke();
    },
    drawFooter(ctx, sw, sh, fw, fh, pad, ltop, lbtm, gap, dateStr) {
      const fy = ltop + 4 * (fh + gap) - gap + 8;
      ctx.strokeStyle = "rgba(0,0,0,0.1)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(pad, fy); ctx.lineTo(sw - pad, fy); ctx.stroke();
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.font = `${Math.round(fw * 0.028)}px 'Courier New', monospace`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(dateStr.toUpperCase(), sw / 2, fy + (lbtm + pad) / 2 - 4);
    },
  },
  pastel: {
    header:  "♡ booth",
    tagline: "always in bloom ✦",
    padding: 20, gap: 6, labelTop: 58, labelBtm: 50,
    drawBg(ctx, sw, sh) {
      ctx.fillStyle = "#FDF6FF";
      ctx.fillRect(0, 0, sw, sh);
      ctx.strokeStyle = "#E8C8F5"; ctx.lineWidth = 2;
      ctx.strokeRect(2, 2, sw - 4, sh - 4);
      ctx.strokeStyle = "#EDD5F9"; ctx.lineWidth = 0.8;
      ctx.setLineDash([3, 3]);
      ctx.strokeRect(7, 7, sw - 14, sh - 14);
      ctx.setLineDash([]);
      const corners = [[18,18],[sw-18,18],[18,sh-18],[sw-18,sh-18]];
      ctx.fillStyle = "#E9AFF5"; ctx.font = "13px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      corners.forEach(([x,y]) => ctx.fillText("✦", x, y));
    },
    drawHeader(ctx, sw, ltop, fw) {
      ctx.fillStyle = "#C78FE5";
      ctx.font = `italic ${Math.round(fw * 0.065)}px Georgia, serif`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("♡ booth", sw / 2, ltop / 2 + 2);
      ctx.strokeStyle = "#EDD5F9"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(20, ltop - 4); ctx.lineTo(sw - 20, ltop - 4); ctx.stroke();
    },
    drawFooter(ctx, sw, sh, fw, fh, pad, ltop, lbtm, gap, dateStr) {
      const fy = ltop + 4 * (fh + gap) - gap + 10;
      ctx.strokeStyle = "#EDD5F9"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(pad, fy); ctx.lineTo(sw - pad, fy); ctx.stroke();
      ctx.fillStyle = "#C78FE5";
      ctx.font = `italic ${Math.round(fw * 0.031)}px Georgia, serif`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("always in bloom ✦", sw / 2, fy + 16);
      ctx.font = `${Math.round(fw * 0.026)}px 'Courier New', monospace`;
      ctx.fillStyle = "#D5A8E8";
      ctx.fillText(dateStr, sw / 2, fy + 32);
    },
  },
  diner: {
    header:  "SNAP!",
    tagline: "★ PHOTO BOOTH ★",
    padding: 22, gap: 8, labelTop: 64, labelBtm: 54,
    drawBg(ctx, sw, sh) {
      ctx.fillStyle = "#FFF8E7";
      ctx.fillRect(0, 0, sw, sh);
      ctx.strokeStyle = "#E8394D"; ctx.lineWidth = 4;
      ctx.strokeRect(2, 2, sw - 4, sh - 4);
      ctx.strokeStyle = "#E8394D"; ctx.lineWidth = 1;
      ctx.strokeRect(8, 8, sw - 16, sh - 16);
    },
    drawHeader(ctx, sw, ltop, fw) {
      ctx.fillStyle = "#E8394D"; ctx.fillRect(0, 0, sw, ltop);
      ctx.fillStyle = "#FFF8E7";
      ctx.font = `900 ${Math.round(fw * 0.075)}px 'Arial Black', Arial, sans-serif`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("SNAP!", sw / 2, ltop / 2);
      ctx.fillStyle = "#FFD700"; ctx.font = "16px sans-serif";
      ctx.fillText("★", 16, ltop / 2 + 4); ctx.fillText("★", sw - 16, ltop / 2 + 4);
    },
    drawFooter(ctx, sw, sh, fw, fh, pad, ltop, lbtm, gap, dateStr) {
      const fy = ltop + 4 * (fh + gap) - gap + 12;
      ctx.strokeStyle = "#E8394D"; ctx.lineWidth = 1.5;
      ctx.beginPath();
      let zx = pad; ctx.moveTo(zx, fy);
      const zstep = 8;
      while (zx < sw - pad) {
        ctx.lineTo(Math.min(zx + zstep/2, sw - pad), fy + 5);
        ctx.lineTo(Math.min(zx + zstep, sw - pad), fy);
        zx += zstep;
      }
      ctx.stroke();
      ctx.fillStyle = "#E8394D";
      ctx.font = `bold ${Math.round(fw * 0.028)}px 'Arial Black', Arial, sans-serif`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("PHOTO BOOTH", sw / 2, fy + 18);
      ctx.font = `${Math.round(fw * 0.024)}px 'Courier New', monospace`;
      ctx.fillStyle = "#C4334A";
      ctx.fillText("★  " + dateStr + "  ★", sw / 2, fy + 34);
    },
  },
  cottage: {
    header:  "a little memory",
    tagline: "gathered & kept",
    padding: 20, gap: 7, labelTop: 58, labelBtm: 52,
    drawBg(ctx, sw, sh) {
      ctx.fillStyle = "#FAF3E6"; ctx.fillRect(0, 0, sw, sh);
      ctx.strokeStyle = "#8BAF72"; ctx.lineWidth = 1.5;
      ctx.strokeRect(2, 2, sw - 4, sh - 4);
      const drawLeaf = (x, y, angle) => {
        ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
        ctx.fillStyle = "#A8C98A";
        ctx.beginPath(); ctx.ellipse(0, 0, 10, 6, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      };
      drawLeaf(14, 14, -Math.PI/4); drawLeaf(sw-14, 14, Math.PI/4);
      drawLeaf(14, sh-14, Math.PI/4); drawLeaf(sw-14, sh-14, -Math.PI/4);
    },
    drawHeader(ctx, sw, ltop, fw) {
      ctx.fillStyle = "#6D8E56";
      ctx.font = `italic ${Math.round(fw * 0.055)}px Georgia, serif`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("a little memory", sw / 2, ltop / 2 + 2);
      ctx.strokeStyle = "#B8CF80"; ctx.lineWidth = 0.8;
      ctx.setLineDash([2, 2]);
      ctx.beginPath(); ctx.moveTo(18, ltop - 4); ctx.lineTo(sw - 18, ltop - 4); ctx.stroke();
      ctx.setLineDash([]);
    },
    drawFooter(ctx, sw, sh, fw, fh, pad, ltop, lbtm, gap, dateStr) {
      const fy = ltop + 4 * (fh + gap) - gap + 10;
      ctx.strokeStyle = "#B8CF80"; ctx.lineWidth = 0.8;
      ctx.setLineDash([2, 2]);
      ctx.beginPath(); ctx.moveTo(pad, fy); ctx.lineTo(sw - pad, fy); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "#7A9A63";
      ctx.font = `italic ${Math.round(fw * 0.032)}px Georgia, serif`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("gathered & kept", sw / 2, fy + 16);
      ctx.fillStyle = "#A09070";
      ctx.font = `${Math.round(fw * 0.026)}px 'Courier New', monospace`;
      const months = ["january","february","march","april","may","june","july","august","september","october","november","december"];
      const d = new Date();
      ctx.fillText(`${months[d.getMonth()]} ${d.getFullYear()}`, sw / 2, fy + 32);
    },
  },
};

// ── Apply theme to live strip UI ──────────────────────────
function applyThemeToUI(theme) {
  const t = THEMES[theme];
  stripContainer.dataset.theme = theme;
  stripHeaderLabel.textContent = t.header;
  stripTagline.textContent     = t.tagline || "";
  const stickers = STICKERS[theme] || ["", "", "", ""];
  stripFrames.forEach((frame, i) => {
    let stickerEl = frame.querySelector(".frame-sticker");
    if (!stickerEl) {
      stickerEl = document.createElement("span");
      stickerEl.className = `frame-sticker sticker-${i}`;
      frame.appendChild(stickerEl);
    }
    stickerEl.textContent = stickers[i] || "";
  });
}

// ── Date stamp ────────────────────────────────────────────
(function setDate() {
  const d   = new Date();
  const pad = n => String(n).padStart(2, "0");
  stripDate.textContent = `${d.getFullYear()}.${pad(d.getMonth()+1)}.${pad(d.getDate())}`;
})();

// ── Helpers ───────────────────────────────────────────────
function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

function setStatus(msg, cls = "") {
  statusMsg.textContent = msg;
  statusMsg.className   = `status-msg ${cls}`.trim();
}

function triggerFlash() {
  flashOverlay.classList.remove("flashing");
  void flashOverlay.offsetWidth;
  flashOverlay.classList.add("flashing");
}

function playShutterSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const bufLen = ctx.sampleRate * 0.04;
    const buf    = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data   = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufLen);
    const src  = ctx.createBufferSource();
    src.buffer = buf;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.45, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.07);
    src.connect(gain); gain.connect(ctx.destination);
    src.start(); src.stop(ctx.currentTime + 0.07);
  } catch (_) {}
}

// ── Camera ────────────────────────────────────────────────
async function startCamera() {
  // Stop any existing stream first
  if (stream) {
    stream.getTracks().forEach(t => t.stop());
    stream = null;
  }

  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: facingMode, width: { ideal: 1280 }, height: { ideal: 960 } },
      audio: false,
    });
    videoFeed.srcObject = stream;
    await new Promise(res => { videoFeed.onloadedmetadata = res; });
    await videoFeed.play();
    cameraOffScreen.classList.add("hidden");

    // Only mirror the front-facing camera
    videoFeed.style.transform = facingMode === "user" ? "scaleX(-1)" : "scaleX(1)";

    setStatus('Click "Start Photobooth" to begin your session');
    return true;
  } catch (err) {
    setStatus(`Camera error: ${err.message}`);
    cameraOffScreen.classList.remove("hidden");
    return false;
  }
}

function applyFilterToVideo() {
  videoFeed.style.filter = FILTER_CSS[currentFilter] || "none";
}

// ── Capture the full native video frame — no cropping, no forced ratio ─
// The web preview uses object-fit:cover which crops the image to fill the
// 4:3 frame box, but the DOWNLOAD should contain the complete photo as-is.
function captureFrame() {
  const vw = videoFeed.videoWidth  || 640;
  const vh = videoFeed.videoHeight || 480;

  filterCanvas.width  = vw;
  filterCanvas.height = vh;
  const ctx = filterCanvas.getContext("2d");
  ctx.save();

  // Mirror for front camera
  if (facingMode === "user") {
    ctx.translate(vw, 0);
    ctx.scale(-1, 1);
  }

  ctx.filter = FILTER_CSS[currentFilter] || "none";
  ctx.drawImage(videoFeed, 0, 0, vw, vh);
  ctx.restore();

  return filterCanvas.toDataURL("image/png");
}

async function runCountdown(from = 3) {
  countdownOverlay.hidden = false;
  for (let i = from; i >= 1; i--) {
    countdownNumber.textContent = i;
    countdownNumber.style.animation = "none";
    void countdownNumber.offsetWidth;
    countdownNumber.style.animation = "";
    setStatus(`Get ready… ${i}`, "active");
    await sleep(900);
  }
  countdownOverlay.hidden = true;
}

// ── Main Photobooth Sequence ──────────────────────────────
async function runPhotobooth() {
  isRunning = true;
  capturedImages = [];

  stripFrames.forEach((f, i) => {
    const sticker = STICKERS[currentTheme]?.[i] || "";
    f.innerHTML = `<span class="frame-num">${i+1}</span><span class="frame-sticker sticker-${i}">${sticker}</span>`;
    f.classList.add("empty");
    f.classList.remove("just-captured");
  });
  dots.forEach(d => d.classList.remove("taken"));
  downloadArea.hidden  = true;
  retakeBtn.hidden     = true;
  startBtn.disabled    = true;
  if (flipBtn) flipBtn.disabled = true;
  filterBtns.forEach(b => b.disabled = true);
  themeBtns.forEach(b => b.disabled = true);
  shotIndicator.hidden = false;

  for (let i = 0; i < 4; i++) {
    setStatus(`Photo ${i+1} of 4 — get ready!`, "active");
    await runCountdown(3);
    setStatus(`📸 Taking photo ${i+1} of 4…`, "active");

    triggerFlash();
    playShutterSound();

    const dataUrl = captureFrame();
    capturedImages.push(dataUrl);

    const frame = stripFrames[i];
    frame.innerHTML = "";
    const img = new Image();
    img.src = dataUrl; img.alt = `Photo ${i+1}`;
    frame.appendChild(img);
    const sticker = STICKERS[currentTheme]?.[i];
    if (sticker) {
      const stickerEl = document.createElement("span");
      stickerEl.className = `frame-sticker sticker-${i}`;
      stickerEl.textContent = sticker;
      frame.appendChild(stickerEl);
    }
    frame.classList.remove("empty");
    frame.classList.add("just-captured");
    setTimeout(() => frame.classList.remove("just-captured"), 600);
    dots[i].classList.add("taken");

    if (i < 3) await sleep(800);
  }

  shotIndicator.hidden = false;
  setStatus("Strip complete! Download or retake.", "done");
  startBtn.disabled    = false;
  startBtn.hidden      = true;
  retakeBtn.hidden     = false;
  if (flipBtn) flipBtn.disabled = false;
  filterBtns.forEach(b => b.disabled = false);
  themeBtns.forEach(b => b.disabled = false);
  downloadArea.hidden  = false;
  isRunning            = false;
}

// ── Download Strip — screenshot the live HTML strip directly ─────────────
async function downloadStrip() {
  if (capturedImages.length < 4) return;

  setStatus("Preparing download…", "active");

  // Dynamically load html2canvas if not already present
  if (!window.html2canvas) {
    await new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  try {
    const canvas = await window.html2canvas(stripContainer, {
      scale: 3,
      useCORS: true,
      allowTaint: true,
      backgroundColor: null,
      logging: false,
    });

    const link    = document.createElement("a");
    link.download = `snapbooth-${currentTheme}-${Date.now()}.png`;
    link.href     = canvas.toDataURL("image/png");
    link.click();
    setStatus("Strip downloaded!", "done");
  } catch (err) {
    setStatus("Download failed: " + err.message);
  }
}

// ── Retake ────────────────────────────────────────────────
function retake() {
  capturedImages = [];
  stripFrames.forEach((f, i) => {
    const sticker = STICKERS[currentTheme]?.[i] || "";
    f.innerHTML = `<span class="frame-num">${i+1}</span><span class="frame-sticker sticker-${i}">${sticker}</span>`;
    f.classList.add("empty");
  });
  dots.forEach(d => d.classList.remove("taken"));
  downloadArea.hidden = true;
  retakeBtn.hidden    = true;
  startBtn.hidden     = false;
  setStatus('Click "Start Photobooth" to begin your session');
}

// ── Camera Flip ───────────────────────────────────────────
async function flipCamera() {
  if (isRunning) return;
  facingMode = facingMode === "user" ? "environment" : "user";
  flipBtn.title = facingMode === "user" ? "Switch to back camera" : "Switch to front camera";
  setStatus("Switching camera…");
  const ok = await startCamera();
  if (ok) applyFilterToVideo();
}

// ── Event Listeners ───────────────────────────────────────
filterBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    if (isRunning) return;
    filterBtns.forEach(b => { b.classList.remove("active"); b.setAttribute("aria-pressed","false"); });
    btn.classList.add("active"); btn.setAttribute("aria-pressed","true");
    currentFilter = btn.dataset.filter;
    applyFilterToVideo();
  });
});

themeBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    if (isRunning) return;
    themeBtns.forEach(b => { b.classList.remove("active"); b.setAttribute("aria-pressed","false"); });
    btn.classList.add("active"); btn.setAttribute("aria-pressed","true");
    currentTheme = btn.dataset.theme;
    applyThemeToUI(currentTheme);
  });
});

startBtn.addEventListener("click", async () => {
  if (!stream) {
    setStatus("Requesting camera access…");
    const ok = await startCamera();
    if (!ok) return;
    await sleep(400);
  }
  applyFilterToVideo();
  runPhotobooth();
});

retakeBtn.addEventListener("click", retake);
downloadBtn.addEventListener("click", downloadStrip);
if (flipBtn) flipBtn.addEventListener("click", flipCamera);

// ── Init ──────────────────────────────────────────────────
applyThemeToUI(currentTheme);

(async () => {
  try {
    const perm = await navigator.permissions.query({ name: "camera" });
    if (perm.state === "granted") { await startCamera(); applyFilterToVideo(); }
  } catch (_) {}
})();