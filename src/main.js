import { BeastStage, FORTUNES } from './BeastStage.js';
import { GestureInput } from './GestureInput.js';
import { getStep, matchesStepGesture } from './stage-content.js';
import modelUrl from './assets/hulushi-web.glb?url';

const PHASES = [
  { id: 'base', name: '底座', stepIds: ['base-small'] },
  { id: 'body', name: '身体', stepIds: ['body-block'] },
  { id: 'limbs', name: '四肢', stepIds: ['front-legs', 'back-mustache'] },
  { id: 'head', name: '头部', stepIds: ['head-block', 'head-place'] },
  { id: 'decoration', name: '装饰', stepIds: ['tail', 'ears', 'head-lines', 'ball-form', 'ball-place'] },
  { id: 'blessing', name: '赐福', stepIds: ['complete', 'lift-blessing', 'fortune-shell', 'blessing-complete'] },
];

function getPhaseIndex(stepId) {
  for (let i = 0; i < PHASES.length; i++) {
    if (PHASES[i].stepIds.includes(stepId)) return i;
  }
  return 0;
}

// ---- DOM refs ----
let introOverlay, app, btnEnter, stageContainer;
let stepTitle, stepDesc, knowledgeBubble, knowledgeText, stageHint;
let btnNext, btnReset, btnScreen, btnShare, btnResetBottom, completeSection;
let fortuneDisplay, fortuneLabel, fortuneName, fortuneBlessing;
let loadingIndicator, modelError, errorMessage;
let progressDots, progressNames;
let videoPreview, gestureStatus, btnCamera, gestureHint;

function queryDOM() {
  introOverlay = document.getElementById('intro-overlay');
  app = document.getElementById('app');
  btnEnter = document.getElementById('btn-enter');
  stageContainer = document.getElementById('beast-stage');

  stepTitle = document.getElementById('step-title');
  stepDesc = document.getElementById('step-desc');
  knowledgeBubble = document.getElementById('knowledge-bubble');
  knowledgeText = document.getElementById('knowledge-text');
  stageHint = document.getElementById('stage-hint');
  btnNext = document.getElementById('btn-next');
  btnReset = document.getElementById('btn-reset');
  btnScreen = document.getElementById('btn-screen');
  btnShare = document.getElementById('btn-share');
  btnResetBottom = document.getElementById('btn-reset-bottom');
  completeSection = document.getElementById('complete-section');
  fortuneDisplay = document.getElementById('fortune-display');
  fortuneLabel = document.getElementById('fortune-label');
  fortuneName = document.getElementById('fortune-name');
  fortuneBlessing = document.getElementById('fortune-blessing');
  loadingIndicator = document.getElementById('loading-indicator');
  modelError = document.getElementById('model-error');
  errorMessage = document.getElementById('error-message');
  progressDots = document.querySelectorAll('.stage-dot');
  progressNames = document.querySelectorAll('.stage-name');

  videoPreview = document.getElementById('video-preview');
  gestureStatus = document.getElementById('gesture-status');
  btnCamera = document.getElementById('btn-camera');
  gestureHint = document.getElementById('gesture-hint');
}

let stage = null;
let gestureInput = null;
let currentStep = null;
let currentFortune = null;
let cameraActive = false;

// ---- Enter ----
queryDOM();
btnEnter.addEventListener('click', () => {
  introOverlay.classList.add('hidden');
  app.classList.add('active');
  initStage();
});

async function initStage() {
  try {
    stage = new BeastStage(stageContainer, {
      modelUrl: modelUrl,
    });

    stage.addEventListener('stepchange', onStepChange);
    stage.addEventListener('interactionchange', (e) => {
      const locked = e.detail.interactionLocked;
      btnNext.disabled = locked;
      btnNext.textContent = locked ? '进行中…' : '继续造物';
    });

    loadingIndicator.classList.remove('hidden');
    await stage.load();
    loadingIndicator.classList.add('hidden');
    updateUI(stage.getState());

    // Init gesture input after model loads
    initGestureInput();
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
    wasmBaseUrl: '/runtime/mediapipe-wasm/',
    modelUrl: '/runtime/hand_landmarker.task',
    onAction: (action) => {
      if (!stage || !currentStep) return;
      const stepConfig = getStep(currentStep.id);
      if (!stepConfig || !stepConfig.gesture) return;

      const matched = matchesStepGesture(stepConfig, action.actionType);
      if (matched) {
        console.log('[Gesture] 匹配手势:', action.actionType, '→ 步骤:', currentStep.id);
        stage.next();
      }
    },
    onStatus: (status) => {
      if (gestureStatus) {
        gestureStatus.textContent = status.message || '';
      }
    },
  });

  // Camera toggle
  if (btnCamera) {
    btnCamera.addEventListener('click', toggleCamera);
  }
}

async function toggleCamera() {
  if (!gestureInput) return;
  if (cameraActive) {
    gestureInput.stop();
    cameraActive = false;
    if (btnCamera) btnCamera.textContent = '开启摄像头';
    if (videoPreview) videoPreview.classList.add('hidden');
    if (gestureStatus) gestureStatus.textContent = '';
    if (gestureHint) gestureHint.textContent = '';
  } else {
    try {
      await gestureInput.init();
      cameraActive = true;
      if (btnCamera) btnCamera.textContent = '关闭摄像头';
      if (videoPreview) videoPreview.classList.remove('hidden');
      updateGestureHint();
    } catch (err) {
      console.error('[Gesture] 摄像头启动失败:', err);
      alert('摄像头启动失败，请确保已授予摄像头权限。');
    }
  }
}

function updateGestureHint() {
  if (!gestureHint || !currentStep) return;
  const stepConfig = getStep(currentStep.id);
  if (stepConfig && stepConfig.gesture && stepConfig.gesture.recognitionHint) {
    gestureHint.textContent = `手势：${stepConfig.gesture.recognitionHint}`;
  } else {
    gestureHint.textContent = '';
  }
}

function onStepChange(e) {
  updateUI(e.detail);
}

function updateUI(state) {
  const step = state.step;
  const fortune = state.selectedFortune;
  currentStep = step;
  currentFortune = fortune;

  // Title & description
  stepTitle.textContent = step.title || '';
  stepDesc.textContent = step.description || '';

  // Knowledge bubble
  if (step.knowledge) {
    knowledgeBubble.classList.remove('hidden');
    knowledgeText.textContent = step.knowledge;
    // Re-trigger animation
    knowledgeBubble.style.animation = 'none';
    requestAnimationFrame(() => {
      knowledgeBubble.style.animation = 'bubbleIn 0.5s ease forwards';
    });
  } else {
    knowledgeBubble.classList.add('hidden');
  }

  // Stage hint
  stageHint.textContent = step.description ? `提示：${step.description}` : '';

  // Gesture hint update
  if (cameraActive) {
    updateGestureHint();
  }

  // Progress dots
  const phaseIndex = getPhaseIndex(step.id);
  progressDots.forEach((dot, i) => {
    dot.classList.remove('active', 'completed');
    if (i < phaseIndex) dot.classList.add('completed');
    else if (i === phaseIndex) dot.classList.add('active');
  });

  // Fortune display
  if (step.id === 'blessing-complete' && fortune) {
    completeSection.classList.remove('hidden');
    fortuneLabel.textContent = fortune.label;
    fortuneName.textContent = fortune.name;
    fortuneBlessing.textContent = fortune.blessing;
    fortuneLabel.style.color = fortune.color ? '#' + fortune.color.toString(16).padStart(6, '0') : '#d73327';
    fortuneDisplay.classList.remove('hidden');
  } else {
    fortuneDisplay.classList.add('hidden');
    completeSection.classList.add('hidden');
  }

  // Button state
  const isFinal = step.id === 'blessing-complete';
  btnNext.textContent = isFinal ? '重新体验' : '继续造物';
  btnNext.disabled = false;
}

// ---- Button: next / reset ----
btnNext.addEventListener('click', () => {
  if (!stage) return;
  if (currentStep?.id === 'blessing-complete') {
    if (cameraActive && gestureInput) {
      gestureInput.stop();
      cameraActive = false;
      if (btnCamera) btnCamera.textContent = '开启摄像头';
      if (videoPreview) videoPreview.classList.add('hidden');
      if (gestureStatus) gestureStatus.textContent = '';
      if (gestureHint) gestureHint.textContent = '';
    }
    stage.reset();
    completeSection.classList.add('hidden');
    return;
  }
  stage.next();
});

btnReset.addEventListener('click', () => {
  if (!stage) return;
  if (cameraActive && gestureInput) {
    gestureInput.stop();
    cameraActive = false;
    if (btnCamera) btnCamera.textContent = '开启摄像头';
    if (videoPreview) videoPreview.classList.add('hidden');
    if (gestureStatus) gestureStatus.textContent = '';
    if (gestureHint) gestureHint.textContent = '';
  }
  stage.reset();
  completeSection.classList.add('hidden');
});

btnResetBottom.addEventListener('click', () => {
  if (!stage) return;
  if (cameraActive && gestureInput) {
    gestureInput.stop();
    cameraActive = false;
    if (btnCamera) btnCamera.textContent = '开启摄像头';
    if (videoPreview) videoPreview.classList.add('hidden');
    if (gestureStatus) gestureStatus.textContent = '';
    if (gestureHint) gestureHint.textContent = '';
  }
  stage.reset();
  completeSection.classList.add('hidden');
});

// ---- Fullscreen ----
btnScreen.addEventListener('click', () => {
  const el = stageContainer;
  if (el.requestFullscreen) el.requestFullscreen();
  else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
});

// ---- Share card ----
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

  // Background
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#FFF8F0');
  grad.addColorStop(0.5, '#FFFDF5');
  grad.addColorStop(1, '#FFF8F0');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Top decorative band
  ctx.fillStyle = '#D73327';
  ctx.fillRect(0, 0, W, 8);
  ctx.fillStyle = '#F1BC36';
  ctx.fillRect(0, 8, W, 4);

  // Bottom decorative band
  ctx.fillStyle = '#F1BC36';
  ctx.fillRect(0, H - 12, W, 4);
  ctx.fillStyle = '#D73327';
  ctx.fillRect(0, H - 8, W, 8);

  // Title
  ctx.textAlign = 'center';
  ctx.fillStyle = '#2C1810';
  ctx.font = 'bold 48px "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.fillText('吹糖造物', W / 2, 90);

  // Subtitle
  ctx.fillStyle = '#6B5244';
  ctx.font = '18px "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.fillText('灵感来自国家级非遗 · 天门糖塑', W / 2, 130);

  // Divider line
  ctx.strokeStyle = '#E8DDD0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(100, 160);
  ctx.lineTo(W - 100, 160);
  ctx.stroke();

  // Capture beast image from renderer
  let beastImg = null;
  try {
    if (stage && stage.renderer) {
      const dataUrl = stage.renderer.domElement.toDataURL('image/png');
      const img = new Image();
      img.src = dataUrl;
      // We'll use it synchronously if loaded, otherwise skip
      if (img.complete && img.naturalWidth > 0) {
        beastImg = img;
      }
    }
  } catch (e) {
    // continue without image
  }

  // Beast image or placeholder circle
  if (beastImg) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(W / 2, 310, 140, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(beastImg, W / 2 - 140, 170, 280, 280);
    ctx.restore();
  } else {
    // Decorative circle
    ctx.beginPath();
    ctx.arc(W / 2, 310, 130, 0, Math.PI * 2);
    ctx.fillStyle = '#FFF0E0';
    ctx.fill();
    ctx.strokeStyle = '#E8DDD0';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 6]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Placeholder text
    ctx.fillStyle = '#C49A6C';
    ctx.font = '16px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillText('瑞兽·糖塑', W / 2, 320);
  }

  // Fortune circle
  const circleY = 480;
  ctx.beginPath();
  ctx.arc(W / 2, circleY, 72, 0, Math.PI * 2);
  ctx.fillStyle = colorHex;
  ctx.fill();

  // Outer ring
  ctx.strokeStyle = colorHex;
  ctx.lineWidth = 3;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.arc(W / 2, circleY, 82, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // Fortune big character
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 64px "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.fillText(fortune.label, W / 2, circleY + 22);

  // Fortune name
  ctx.fillStyle = '#2C1810';
  ctx.font = 'bold 28px "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.fillText(fortune.name, W / 2, circleY + 130);

  // Blessing text
  ctx.fillStyle = '#6B5244';
  ctx.font = '20px "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.fillText(fortune.blessing, W / 2, circleY + 175);

  // Bottom info
  ctx.fillStyle = '#C49A6C';
  ctx.font = '14px "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.fillText('天门糖塑 · 国家级非物质文化遗产', W / 2, H - 50);

  ctx.fillStyle = '#B8A898';
  ctx.font = '12px "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.fillText('本体验基于吹、捏、拉、贴等糖塑造型语言进行数字化互动表达', W / 2, H - 28);

  // Download
  const link = document.createElement('a');
  link.download = `吹糖造物_${fortune.label}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}