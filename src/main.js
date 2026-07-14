import { BeastStage, FORTUNES } from './BeastStage.js';
import { GestureInput } from './GestureInput.js';
import { LandingModel } from './LandingModel.js';
import { getStep, matchesStepGesture, getPhaseIndex } from './stage-content.js';
import { AudioManager } from './AudioManager.js';
const modelUrl = import.meta.env.BASE_URL + 'assets/hulushi-web.glb';

window.addEventListener('error', (event) => {
  console.error('=== Global Error ===');
  console.error('Error:', event.error);
  console.error('Message:', event.message);
  console.error('Source:', event.filename);
  console.error('Line:', event.lineno);
  console.error('Column:', event.colno);
  if (event.error && event.error.stack) {
    console.error('Stack:', event.error.stack);
  }
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});

document.addEventListener('DOMContentLoaded', () => {
  let landing, stagePage, btnModeCamera, btnModeButton, stageContainer;
  let landingModelContainer;
  let stepTitle, stepDesc, stepOverlay, knowledgeFloat, knowledgeText;
  let btnNext, btnReset, btnScreen, btnAudio, btnResetBottom;
  let completeOverlay, fortuneDisplay, fortuneLabel, fortuneName, fortuneBlessing;
  let loadingIndicator, modelError, errorMessage;
  let progDots;
  let videoPreview, gestureStatus, gestureHint, btnCamera;
  let stageTitle;
  let btnLandingAudio;

  let stage = null;
  let gestureInput = null;
  let landingModel = null;
  let audioManager = null;
  let currentStep = null;
  let currentFortune = null;
  let cameraActive = false;
  let interactionMode = null;
  let stepOverlayTimer = null;
  let guideMode = false;  // 讲解模式：首页开启后，进入舞台自动播放音频

  function queryDOM() {
    landing = document.getElementById('landing');
    stagePage = document.getElementById('stage-page');
    btnModeCamera = document.getElementById('btn-mode-camera');
    btnModeButton = document.getElementById('btn-mode-button');
    stageContainer = document.getElementById('beast-stage');
    landingModelContainer = document.getElementById('landing-model');

    stepTitle = document.getElementById('step-title');
    stepDesc = document.getElementById('step-desc');
    stepOverlay = document.getElementById('step-overlay');
    knowledgeFloat = document.getElementById('knowledge-float');
    knowledgeText = document.getElementById('knowledge-text');
    btnNext = document.getElementById('btn-next');
    btnReset = document.getElementById('btn-reset');
    btnScreen = document.getElementById('btn-screen');
    btnAudio = document.getElementById('btn-audio');
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
    btnLandingAudio = document.getElementById('btn-landing-audio');
  }

  queryDOM();

  initLandingModel();

  if (btnModeCamera) btnModeCamera.addEventListener('click', () => enterStage('camera'));
  if (btnModeButton) btnModeButton.addEventListener('click', () => enterStage('button'));

  // 首页讲解模式按钮
  if (btnLandingAudio) {
    btnLandingAudio.addEventListener('click', () => {
      guideMode = !guideMode;
      btnLandingAudio.textContent = guideMode ? '🔊' : '🔇';
      btnLandingAudio.classList.toggle('active', guideMode);
      btnLandingAudio.title = guideMode ? '讲解模式已开启' : '点击开启讲解模式';

      if (guideMode) {
        // 开启讲解模式时，立即播放首页介绍
        playLandingAudio();
      } else {
        // 关闭时停止播放
        if (audioManager) audioManager.stop();
      }
    });
  }

  if (btnNext) btnNext.addEventListener('click', () => {
    if (!stage) return;
    if (currentStep?.id === 'blessing-complete') {
      stopCamera();
      stage.reset();
      completeOverlay.classList.remove('visible');
      return;
    }
    stage.next();
  });

  if (btnReset) btnReset.addEventListener('click', () => {
    if (!stage) return;
    stopCamera();
    stage.reset();
    completeOverlay.classList.remove('visible');
  });

  if (btnResetBottom) btnResetBottom.addEventListener('click', () => {
    if (!stage) return;
    stopCamera();
    stage.reset();
    completeOverlay.classList.remove('visible');
  });

  if (btnScreen) btnScreen.addEventListener('click', () => {
    const el = document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen();
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
  });

  // 舞台内声音按钮：点击播放当前步骤对应的非遗文案（强制播放，不受 guideMode 限制）
  if (btnAudio) btnAudio.addEventListener('click', () => {
    if (audioManager && currentStep) {
      audioManager.play(currentStep.id, true);
    }
  });

  function initLandingModel() {
    if (!landingModelContainer) return;
    try {
      landingModel = new LandingModel(landingModelContainer, modelUrl);
      landingModel.load().catch((err) => {
        console.warn('[LandingModel] 加载失败:', err);
      });
    } catch (err) {
      console.warn('[LandingModel] 初始化失败:', err);
    }

    // 初始化音频管理器并播放首页介绍
    initAudio();
  }

  async function initAudio() {
    if (!audioManager) {
      audioManager = new AudioManager();
      await audioManager.init();
      console.log('[Audio] 音频管理器已初始化');
    }
  }

  async function enterStage(mode) {
    interactionMode = mode;

    // 停止首页音频
    if (audioManager) {
      audioManager.stop();
    }

    landing.classList.add('out');

    if (landingModel) {
      try { landingModel.dispose(); } catch (e) { /* ignore */ }
      landingModel = null;
    }

    setTimeout(() => {
      stagePage.classList.add('active');
      initStage();
    }, 400);
  }

  function playLandingAudio() {
    if (audioManager) {
      audioManager.play('landing-intro', true);
    }
  }

  function returnToLanding() {
    // 停止所有音频
    if (audioManager) {
      audioManager.stop();
    }
    // 停止摄像头
    stopCamera();
    // 重置舞台
    if (stage) {
      stage.reset();
    }
    // 隐藏舞台页面
    stagePage.classList.remove('active');
    // 显示首页
    landing.classList.remove('out');
    // 重新初始化首页模型
    initLandingModel();
  }

  async function initStage() {
    try {
      console.log('initStage called, stageContainer:', !!stageContainer);

      stage = new BeastStage(stageContainer, { modelUrl });
      console.log('stage created:', stage);

      if (!stage || typeof stage.addEventListener !== 'function') {
        throw new Error('stage is not a valid EventTarget');
      }

      stage.addEventListener('stepchange', onStepChange);
      stage.addEventListener('interactionchange', (e) => {
        const locked = e.detail.interactionLocked;
        btnNext.disabled = locked;
        btnNext.textContent = locked ? '…' : '继续';
      });

      loadingIndicator.classList.remove('hidden');
      await stage.load();
      loadingIndicator.classList.add('hidden');

      // 确保音频管理器已初始化，并根据讲解模式设置开关
      if (!audioManager) {
        audioManager = new AudioManager();
        await audioManager.init();
      }
      audioManager.enabled = guideMode;

      updateUI(stage.getState());

      initGestureInput();

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

    if (btnCamera) {
      btnCamera.addEventListener('click', toggleCamera);
    }
  }

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

  function onStepChange(e) {
    updateUI(e.detail);
    updateGestureStep(e.detail.step);
  }

  function updateUI(state) {
    const step = state.step;
    const fortune = state.selectedFortune;
    currentStep = step;
    currentFortune = fortune;

    if (step.knowledge) {
      if (stepTitle) stepTitle.textContent = '';
      if (stepDesc) stepDesc.textContent = step.knowledge;
      if (stepOverlay) {
        stepOverlay.classList.add('visible');
        clearTimeout(stepOverlayTimer);
      }
      if (audioManager && audioManager.enabled) {
        audioManager.play(step.id);
      }
    } else {
      // knowledge 为空时，隐藏上方提示区域
      if (stepOverlay) {
        stepOverlay.classList.remove('visible');
        clearTimeout(stepOverlayTimer);
      }
    }

    knowledgeFloat.classList.remove('visible');

    if (cameraActive) {
      updateGestureHint();
    }

    const phaseIndex = getPhaseIndex(step.id);
    progDots.forEach((dot, i) => {
      const phase = parseInt(dot.dataset.phase);
      dot.classList.remove('active', 'completed');
      if (phase < phaseIndex) dot.classList.add('completed');
      else if (phase === phaseIndex) dot.classList.add('active');
    });

    const isFinal = step.id === 'blessing-complete';
    btnNext.textContent = isFinal ? '重来' : '继续';
    btnNext.disabled = false;
  }


});
