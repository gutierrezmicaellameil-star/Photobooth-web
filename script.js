/* =========================================================
   SnapBooth — script.js
   Vanilla JS, no external dependencies
   ========================================================= */

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
const downloadBtn      = document.getElementById("downloadBtn");
const downloadArea     = document.getElementById("downloadArea");
const statusMsg        = document.getElementById("statusMsg");
const filterBtns       = document.querySelectorAll(".filter-btn");
const stripFrames      = [0,1,2,3].map(i => document.getElementById(`frame${i}`));
const dots             = [0,1,2,3].map(i => document.getElementById(`dot${i}`));
const stripDate        = document.getElementById("stripDate");

// ── State ─────────────────────────────────────────────────
let stream          = null;
let currentFilter   = "normal";
let capturedImages  = [];   // Array of data URLs
let isRunning       = false;

// ── Filter CSS map (for canvas rendering) ─────────────────
const FILTER_CSS = {
  normal:    "none",
  grayscale: "grayscale(1)",
  sepia:     "sepia(0.9)",
  vivid:     "saturate(2) contrast(1.1)",
};

// ── Date stamp ────────────────────────────────────────────
(function setDate() {
  const d   = new Date();
  const pad = n => String(n).padStart(2, "0");
  stripDate.textContent =
    `${d.getFullYear()}.${pad(d.getMonth()+1)}.${pad(d.getDate())}`;
})();

// ── Helpers ───────────────────────────────────────────────
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function setStatus(msg, cls = "") {
  statusMsg.textContent = msg;
  statusMsg.className   = `status-msg ${cls}`.trim();
}

function triggerFlash() {
  flashOverlay.classList.remove("flashing");
  void flashOverlay.offsetWidth; // reflow to re-trigger
  flashOverlay.classList.add("flashing");
}

function playShutterSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();

    // Mechanical click: short noise burst + sharp pitch drop
    const bufLen = ctx.sampleRate * 0.04;
    const buf    = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data   = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufLen);
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0.45, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.07);

    src.connect(gainNode);
    gainNode.connect(ctx.destination);
    src.start();
    src.stop(ctx.currentTime + 0.07);
  } catch (_) {
    // AudioContext not available — silently skip
  }
}

// ── Camera Initialisation ─────────────────────────────────
async function startCamera() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 960 } },
      audio: false,
    });
    videoFeed.srcObject = stream;
    await new Promise(res => { videoFeed.onloadedmetadata = res; });
    await videoFeed.play();
    cameraOffScreen.classList.add("hidden");
    setStatus('Click "Start Photobooth" to begin your session');
    return true;
  } catch (err) {
    setStatus(`Camera error: ${err.message}`, "");
    cameraOffScreen.classList.remove("hidden");
    return false;
  }
}

// ── Filter Selection ──────────────────────────────────────
filterBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    if (isRunning) return;
    filterBtns.forEach(b => { b.classList.remove("active"); b.setAttribute("aria-pressed","false"); });
    btn.classList.add("active");
    btn.setAttribute("aria-pressed","true");
    currentFilter = btn.dataset.filter;
    applyFilterToVideo();
  });
});

// Apply live CSS filter to video element for preview
function applyFilterToVideo() {
  videoFeed.style.filter = FILTER_CSS[currentFilter] || "none";
}

// ── Photo Capture ─────────────────────────────────────────
function captureFrame() {
  const w = videoFeed.videoWidth  || 640;
  const h = videoFeed.videoHeight || 480;

  filterCanvas.width  = w;
  filterCanvas.height = h;

  const ctx = filterCanvas.getContext("2d");

  // Mirror to match preview
  ctx.save();
  ctx.translate(w, 0);
  ctx.scale(-1, 1);

  ctx.filter = FILTER_CSS[currentFilter] || "none";
  ctx.drawImage(videoFeed, 0, 0, w, h);
  ctx.restore();

  return filterCanvas.toDataURL("image/png");
}

// ── Countdown ─────────────────────────────────────────────
async function runCountdown(from = 3) {
  countdownOverlay.hidden = false;
  for (let i = from; i >= 1; i--) {
    countdownNumber.textContent = i;
    // Re-trigger animation each tick
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

  // Reset strip frames
  stripFrames.forEach((f, i) => {
    f.innerHTML = `<span class="frame-num">${i+1}</span>`;
    f.classList.add("empty");
    f.classList.remove("just-captured");
  });
  dots.forEach(d => d.classList.remove("taken"));
  downloadArea.hidden = true;
  retakeBtn.hidden    = true;
  startBtn.disabled   = true;
  filterBtns.forEach(b => b.disabled = true);

  // Show shot indicator
  shotIndicator.hidden = false;

  // 4 shots — each with its own 3-2-1 countdown
  for (let i = 0; i < 4; i++) {
    setStatus(`Photo ${i+1} of 4 — get ready!`, "active");

    // Full countdown before every shot
    await runCountdown(3);

    setStatus(`📸 Taking photo ${i+1} of 4…`, "active");

    // Flash + sound
    triggerFlash();
    playShutterSound();

    const dataUrl = captureFrame();
    capturedImages.push(dataUrl);

    // Update strip frame
    const frame = stripFrames[i];
    frame.innerHTML = "";
    const img = new Image();
    img.src = dataUrl;
    img.alt = `Photo ${i+1}`;
    frame.appendChild(img);
    frame.classList.remove("empty");
    frame.classList.add("just-captured");
    setTimeout(() => frame.classList.remove("just-captured"), 600);

    // Fill dot
    dots[i].classList.add("taken");

    // Brief pause after the shot before next countdown starts
    if (i < 3) {
      await sleep(800);
    }
  }

  // Done
  shotIndicator.hidden = true;
  setStatus("Strip complete! Download or retake.", "done");
  startBtn.disabled   = false;
  startBtn.hidden     = true;
  retakeBtn.hidden    = false;
  filterBtns.forEach(b => b.disabled = false);
  downloadArea.hidden = false;
  isRunning           = false;
}

// ── Download Strip ────────────────────────────────────────
async function downloadStrip() {
  if (capturedImages.length < 4) return;

  // Load all images
  const imgs = await Promise.all(capturedImages.map(src => {
    return new Promise((res, rej) => {
      const img = new Image();
      img.onload  = () => res(img);
      img.onerror = rej;
      img.src     = src;
    });
  }));

  const FRAME_W    = imgs[0].naturalWidth  || 640;
  const FRAME_H    = imgs[0].naturalHeight || 480;

  // Strip dimensions
  const PADDING    = 24;
  const GAP        = 10;
  const LABEL_TOP  = 56;
  const LABEL_BTM  = 44;
  const STRIP_W    = FRAME_W + PADDING * 2;
  const STRIP_H    = LABEL_TOP + (FRAME_H + GAP) * 4 - GAP + LABEL_BTM + PADDING;

  const canvas = document.createElement("canvas");
  canvas.width  = STRIP_W;
  canvas.height = STRIP_H;
  const ctx = canvas.getContext("2d");

  // Background — cream
  ctx.fillStyle = "#f5f0e8";
  ctx.fillRect(0, 0, STRIP_W, STRIP_H);

  // Decorative border
  ctx.strokeStyle = "rgba(0,0,0,0.12)";
  ctx.lineWidth   = 3;
  ctx.strokeRect(6, 6, STRIP_W - 12, STRIP_H - 12);

  // Header label
  ctx.fillStyle  = "#1a1a22";
  ctx.textAlign  = "center";
  ctx.textBaseline = "middle";

  // Italic serif font for header
  ctx.font = `italic ${Math.round(FRAME_W * 0.06)}px Georgia, serif`;
  ctx.fillText("SnapBooth", STRIP_W / 2, LABEL_TOP / 2 + 4);

  // Divider
  ctx.strokeStyle = "rgba(0,0,0,0.1)";
  ctx.lineWidth   = 1;
  ctx.beginPath();
  ctx.moveTo(PADDING, LABEL_TOP - 4);
  ctx.lineTo(STRIP_W - PADDING, LABEL_TOP - 4);
  ctx.stroke();

  // Draw frames
  imgs.forEach((img, i) => {
    const x = PADDING;
    const y = LABEL_TOP + i * (FRAME_H + GAP);

    // Subtle shadow under each frame
    ctx.shadowColor   = "rgba(0,0,0,0.18)";
    ctx.shadowBlur    = 8;
    ctx.shadowOffsetY = 3;
    ctx.drawImage(img, x, y, FRAME_W, FRAME_H);
    ctx.shadowColor = "transparent";
    ctx.shadowBlur  = 0;
    ctx.shadowOffsetY = 0;

    // Frame border
    ctx.strokeStyle = "rgba(0,0,0,0.1)";
    ctx.lineWidth   = 1;
    ctx.strokeRect(x, y, FRAME_W, FRAME_H);
  });

  // Footer label — date
  const d   = new Date();
  const pad = n => String(n).padStart(2, "0");
  const dateStr = `${d.getFullYear()}.${pad(d.getMonth()+1)}.${pad(d.getDate())}`;

  // Divider
  const footerY = LABEL_TOP + 4 * (FRAME_H + GAP) - GAP + 8;
  ctx.strokeStyle = "rgba(0,0,0,0.1)";
  ctx.lineWidth   = 1;
  ctx.beginPath();
  ctx.moveTo(PADDING, footerY);
  ctx.lineTo(STRIP_W - PADDING, footerY);
  ctx.stroke();

  ctx.fillStyle    = "rgba(0,0,0,0.35)";
  ctx.font         = `${Math.round(FRAME_W * 0.028)}px 'Courier New', monospace`;
  ctx.textAlign    = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(dateStr.toUpperCase(), STRIP_W / 2, footerY + (LABEL_BTM + PADDING) / 2 - 4);

  // Trigger download
  const link     = document.createElement("a");
  link.download  = `snapbooth-${Date.now()}.png`;
  link.href      = canvas.toDataURL("image/png");
  link.click();
}

// ── Retake ────────────────────────────────────────────────
function retake() {
  capturedImages = [];
  stripFrames.forEach((f, i) => {
    f.innerHTML = `<span class="frame-num">${i+1}</span>`;
    f.classList.add("empty");
  });
  dots.forEach(d => d.classList.remove("taken"));
  downloadArea.hidden = true;
  retakeBtn.hidden    = true;
  startBtn.hidden     = false;
  setStatus('Click "Start Photobooth" to begin your session');
}

// ── Event Listeners ───────────────────────────────────────
startBtn.addEventListener("click", async () => {
  // Init camera on first click if not already streaming
  if (!stream) {
    setStatus("Requesting camera access…");
    const ok = await startCamera();
    if (!ok) return;
    // Small pause to let camera warm up
    await sleep(400);
  }
  applyFilterToVideo();
  runPhotobooth();
});

retakeBtn.addEventListener("click", retake);
downloadBtn.addEventListener("click", downloadStrip);

// ── Init ──────────────────────────────────────────────────
// Attempt silent camera init on load (optional; comment out to require button click)
(async () => {
  // Check if permissions might already be granted without prompting
  try {
    const perm = await navigator.permissions.query({ name: "camera" });
    if (perm.state === "granted") {
      await startCamera();
      applyFilterToVideo();
    }
  } catch (_) {
    // permissions API not available, wait for user click
  }
})();