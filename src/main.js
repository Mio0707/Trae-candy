import { BeastStage, FORTUNES } from './BeastStage.js';
import { GestureInput } from './GestureInput.js';
import { getStep, matchesStepGesture, getPhaseIndex } from './stage-content.js';
import modelUrl from './assets/hulushi-web.glb?url';

// ---- DOM refs ----
let landing, stagePage, btnModeCamera, btnModeButton, stageContainer;
let stepTitle, stepDesc, stepOverlay, knowledgeFloat, knowledgeText;
let btnNext, btnReset, btnScreen, btnShare, btnResetBottom;
let completeOverlay, fortuneDisplay, fortuneLabel, fortuneName, fortuneBlessing;
let loadingIndicator, modelError, errorMessage;
let progDots;
let videoPreview, gestureStatus, gestureHint, btnCamera;
let stageTitle;

let stage = null;
let gestureInput = null;
let currentStep = null;
let currentFortune = null;
let cameraActive = false;
let interactionMode = null; // 'camera' | 'button'
let stepOverlayTimer = null;

function queryDOM() {
  landing = document.getElementById('landing');
  stagePage = document.getElementById('stage-page');
  btnModeCamera = document.getElementById('btn-mode-camera');
  btnModeButton = document.getElementById('btn-mode-button');
  stageContainer = document.getElementById('beast-stage');

  stepTitle = document.getElementById('step-title');
  stepDesc = document.getElementById('step-desc');
  stepOverlay = document.getElementById('step-overlay');
  knowledgeFloat = document.getElementById('knowledge-float');
  knowledgeText = document.getElementById('knowledge-text');
  btnNext = document.getElementById('btn-next');
  btnReset = document.getElementById('btn-reset');
  btnScreen = document.getElementById('btn-screen');
  btnShare = document.getElementById('btn-share');
  btnResetBottom = document.getElementById('btn-reset-bottom');
  completeOverlay = document.getElementById('complete-overlay');
  fortuneLabel = document.getElementById('fortune-label');
  fortuneName = document.getElementById('fortune-name');
  fortuneBlessing = document.getElementById('fortune-blessing');
  loadingIndicator = document.getElementById('loading-indicator');
  modelError = document.getElementById('model-error');
  errorMessage = document.getElementById('error-message');
  progDots = document.querySelectorAll('.prog-dot');

  videoPreview = document.getElementById('video-preview');
  gestureStatus = document.getElementById('gesture-status');
  gestureHint = document.getElementById('gesture-hint');
  btnCamera = document.getElementById('btn-camera');
  stageTitle = document.getElementById('stage-title');
}

// ---- Init ----
queryDOM();

// Landing page: mode selection
btnModeCamera.addEventListener('click', () => enterStage('camera'));
btnModeButton.addEventListener('click', () => enterStage('button'));

async function enterStage(mode) {
  interactionMode = mode;

  // Fade out landing
  landing.classList.add('out');

  // Show stage page
  setTimeout(() => {
    stagePage.classList.add('active');
    initStage();
  }, 400);
}

async function initStage() {
  try {
    stage = new BeastStage(stageContainer, { modelUrl });

    stage.addEventListener('stepchange', onStepChange);
    stage.addEventListener('interactionchange', (e) => {
      const locked = e.detail.interactionLocked;
      btnNext.disabled = locked;
      btnNext.textContent = locked ? '…' : '继续';
    });

    loadingIndicator.classList.remove('hidden');
    await stage.load();
    loadingIndicator.classList.add('hidden');
    updateUI(stage.getState());

    // Init gesture input
    initGestureInput();

    // If camera mode, auto-start camera
    if (interactionMode === 'camera') {
      await startCamera();
    }
  } catch (err) {
    console.error('[BeastStage] 模型加载失败:', err);
    loadingIndicator.classList.add('hidden');
    modelError.classList.remove('hidden');
    errorMessage.textContent = `模型加载失败: ${err.message || '未知错误'}`;
    btnNext.disabled = true;
  }
}

function initGestureInput() {
  if (!videoPreview) return;

  gestureInput = new GestureInput({
    videoElement: videoPreview,
    wasmBaseUrl: import.meta.env.BASE_URL + 'runtime/mediapipe-wasm/',
    modelUrl: import.meta.env.BASE_URL + 'runtime/hand_landmarker.task',
    onAction: (action) => {
      if (!stage || !currentStep) return false;
      const stepConfig = getStep(currentStep.id);
      if (!stepConfig || !stepConfig.gesture) return false;

      const matched = matchesStepGesture(stepConfig, action.type);
      if (matched) {
        console.log('[Gesture] 匹配手势:', action.type, '→ 步骤:', currentStep.id);
        stage.next();
        return true;
      }
      return false;
    },
    onStatus: (status) => {
      if (gestureStatus) {
        gestureStatus.textContent = status.message || '';
      }
      if (stage && status.hand) {
        stage.setBlessingHandTarget(status.hand.normalizedX, status.hand.normalizedY);
      } else if (stage) {
        stage.clearBlessingHandTarget();
      }
      if (stage && status.liftState) {
        stage.setGesturePreview(status.liftState.progress || 0);
      }
    },
  });

  // Camera toggle button
  if (btnCamera) {
    btnCamera.addEventListener('click', toggleCamera);
  }
}

// ---- Camera ----
async function startCamera() {
  if (!gestureInput || cameraActive) return;
  const cameraBg = document.getElementById('camera-bg');
  const cameraBgOverlay = document.getElementById('camera-bg-overlay');

  try {
    await gestureInput.init();
    cameraActive = true;
    if (btnCamera) btnCamera.textContent = '📷✓';
    updateGestureHint();
    if (currentStep) updateGestureStep(currentStep);
    // Bind camera stream to background
    if (cameraBg && videoPreview.srcObject) {
      cameraBg.srcObject = videoPreview.srcObject;
      cameraBg.play().catch(() => {});
      cameraBg.classList.add('active');
      if (cameraBgOverlay) cameraBgOverlay.classList.add('active');
    }
  } catch (err) {
    console.error('[Gesture] 摄像头启动失败:', err);
    const message = err?.message || '摄像头启动失败，请确保已授予摄像头权限。';
    if (gestureStatus) gestureStatus.textContent = message;
  }
}

async function toggleCamera() {
  if (!gestureInput) return;
  const cameraBg = document.getElementById('camera-bg');
  const cameraBgOverlay = document.getElementById('camera-bg-overlay');

  if (cameraActive) {
    gestureInput.stop();
    cameraActive = false;
    if (btnCamera) btnCamera.textContent = '📷';
    if (gestureStatus) gestureStatus.textContent = '';
    if (gestureHint) gestureHint.textContent = '';
    if (cameraBg) { cameraBg.classList.remove('active'); cameraBg.srcObject = null; }
    if (cameraBgOverlay) cameraBgOverlay.classList.remove('active');
  } else {
    await startCamera();
  }
}

function stopCamera() {
  if (!cameraActive || !gestureInput) return;
  gestureInput.stop();
  cameraActive = false;
  const cameraBg = document.getElementById('camera-bg');
  const cameraBgOverlay = document.getElementById('camera-bg-overlay');
  if (btnCamera) btnCamera.textContent = '📷';
  if (gestureStatus) gestureStatus.textContent = '';
  if (gestureHint) gestureHint.textContent = '';
  if (cameraBg) { cameraBg.classList.remove('active'); cameraBg.srcObject = null; }
  if (cameraBgOverlay) cameraBgOverlay.classList.remove('active');
}

// ---- Gesture step tracking ----
function updateGestureHint() {
  if (!gestureHint || !currentStep) return;
  const stepConfig = getStep(currentStep.id);
  if (stepConfig && stepConfig.gesture && stepConfig.gesture.recognitionHint) {
    gestureHint.textContent = stepConfig.gesture.recognitionHint;
  } else {
    gestureHint.textContent = '';
  }
}

function updateGestureStep(step) {
  if (!gestureInput || !step) return;
  const stepConfig = getStep(step.id);
  if (!stepConfig || !stepConfig.gesture) {
    gestureInput.beginStep({ actions: [], resetMode: null });
    return;
  }
  gestureInput.beginStep({
    actions: stepConfig.gesture.actions || [],
    resetMode: stepConfig.gesture.resetMode || null,
  });
}

// ---- Step change ----
function onStepChange(e) {
  updateUI(e.detail);
  updateGestureStep(e.detail.step);
}

function updateUI(state) {
  const step = state.step;
  const fortune = state.selectedFortune;
  currentStep = step;
  currentFortune = fortune;

  // Step overlay: show title + desc briefly, then fade out
  if (stepTitle) stepTitle.textContent = step.title || '';
  if (stepDesc) stepDesc.textContent = step.description || '';

  // Show step overlay with fade
  if (stepOverlay) {
    stepOverlay.classList.add('visible');
    clearTimeout(stepOverlayTimer);
    stepOverlayTimer = setTimeout(() => {
      stepOverlay.classList.remove('visible');
    }, 3000);
  }

  // Knowledge bubble
  if (step.knowledge) {
    knowledgeText.textContent = step.knowledge;
    knowledgeFloat.classList.add('visible');
  } else {
    knowledgeFloat.classList.remove('visible');
  }

  // Gesture hint
  if (cameraActive) {
    updateGestureHint();
  }

  // Progress dots
  const phaseIndex = getPhaseIndex(step.id);
  progDots.forEach((dot, i) => {
    const phase = parseInt(dot.dataset.phase);
    dot.classList.remove('active', 'completed');
    if (phase < phaseIndex) dot.classList.add('completed');
    else if (phase === phaseIndex) dot.classList.add('active');
  });

  // Fortune / complete
  if (step.id === 'blessing-complete' && fortune) {
    completeOverlay.classList.add('visible');
    fortuneLabel.textContent = fortune.label;
    fortuneName.textContent = fortune.name;
    fortuneBlessing.textContent = fortune.blessing;
    fortuneLabel.style.color = fortune.color ? '#' + fortune.color.toString(16).padStart(6, '0') : '#d73327';
  } else {
    completeOverlay.classList.remove('visible');
  }

  // Button state
  const isFinal = step.id === 'blessing-complete';
  btnNext.textContent = isFinal ? '重来' : '继续';
  btnNext.disabled = false;
}

// ---- Buttons ----
btnNext.addEventListener('click', () => {
  if (!stage) return;
  if (currentStep?.id === 'blessing-complete') {
    stopCamera();
    stage.reset();
    completeOverlay.classList.remove('visible');
    return;
  }
  stage.next();
});

btnReset.addEventListener('click', () => {
  if (!stage) return;
  stopCamera();
  stage.reset();
  completeOverlay.classList.remove('visible');
});

btnResetBottom.addEventListener('click', () => {
  if (!stage) return;
  stopCamera();
  stage.reset();
  completeOverlay.classList.remove('visible');
});

// Fullscreen
btnScreen.addEventListener('click', () => {
  const el = document.documentElement;
  if (el.requestFullscreen) el.requestFullscreen();
  else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
});

// Share card
btnShare.addEventListener('click', generateShareCard);

function generateShareCard() {
  const fortune = currentFortune;
  if (!fortune) return;

  const colorHex = '#' + fortune.color.toString(16).padStart(6, '0');
  const canvas = document.createElement('canvas');
  canvas.width = 750;
  canvas.height = 1000;
  const ctx = canvas.getContext('2d');

  const W = 750, H = 1000;

  // Dark background
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#1a0e08');
  grad.addColorStop(0.5, '#2a1a10');
  grad.addColorStop(1, '#1a0e08');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Top decorative band
  ctx.fillStyle = '#D73327';
  ctx.fillRect(0, 0, W, 6);
  ctx.fillStyle = '#F1BC36';
  ctx.fillRect(0, 6, W, 3);

  // Bottom decorative band
  ctx.fillStyle = '#F1BC36';
  ctx.fillRect(0, H - 9, W, 3);
  ctx.fillStyle = '#D73327';
  ctx.fillRect(0, H - 6, W, 6);

  // Title
  ctx.textAlign = 'center';
  ctx.fillStyle = '#f5e6d3';
  ctx.font = 'bold 48px "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.fillText('吹糖造物', W / 2, 100);

  // Subtitle
  ctx.fillStyle = '#a08a72';
  ctx.font = '18px "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.fillText('灵感来自国家级非遗 · 天门糖塑', W / 2, 140);

  // Divider
  ctx.strokeStyle = 'rgba(196,154,108,0.3)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(100, 170);
  ctx.lineTo(W - 100, 170);
  ctx.stroke();

  // Beast image
  let beastImg = null;
  try {
    if (stage && stage.renderer) {
      const dataUrl = stage.renderer.domElement.toDataURL('image/png');
      const img = new Image();
      img.src = dataUrl;
      if (img.complete && img.naturalWidth > 0) beastImg = img;
    }
  } catch { /* skip */ }

  if (beastImg) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(W / 2, 320, 140, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(beastImg, W / 2 - 140, 180, 280, 280);
    ctx.restore();
  } else {
    ctx.beginPath();
    ctx.arc(W / 2, 320, 130, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(196,154,108,0.1)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(196,154,108,0.3)';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 6]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#a08a72';
    ctx.font = '16px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillText('瑞兽·糖塑', W / 2, 330);
  }

  // Fortune circle
  const circleY = 490;
  ctx.beginPath();
  ctx.arc(W / 2, circleY, 72, 0, Math.PI * 2);
  ctx.fillStyle = colorHex;
  ctx.fill();

  ctx.strokeStyle = colorHex;
  ctx.lineWidth = 3;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.arc(W / 2, circleY, 82, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 64px "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.fillText(fortune.label, W / 2, circleY + 22);

  ctx.fillStyle = '#f5e6d3';
  ctx.font = 'bold 28px "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.fillText(fortune.name, W / 2, circleY + 130);

  ctx.fillStyle = '#a08a72';
  ctx.font = '20px "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.fillText(fortune.blessing, W / 2, circleY + 175);

  ctx.fillStyle = 'rgba(160,138,114,0.5)';
  ctx.font = '14px "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.fillText('天门糖塑 · 国家级非物质文化遗产', W / 2, H - 50);

  const link = document.createElement('a');
  link.download = `吹糖造物_${fortune.label}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}
