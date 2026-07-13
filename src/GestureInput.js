import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import defaultHandLandmarkerModelUrl from '../runtime/hand_landmarker.task?url';

const FRAME_INTERVAL_MS = 80;
const ACTION_COOLDOWN_MS = 1150;
const HOLD_MS = 900;
const HISTORY_MS = 900;
const TWO_HAND_HISTORY_MS = 700;
const RESET_STABLE_MS = 280;
const DEFAULT_WASM_BASE_URL = '/six-stage-sugar-experience/runtime/mediapipe-wasm';
const GESTURE_THRESHOLDS = {
  pinchDistance: 0.065,
  openFingertipDistance: 0.22,
  fistFingertipDistance: 0.27,
  fistStableMs: 160,
  pointPinchDistance: 0.085,
  horizontalMove: 0.09,
  verticalMove: 0.1,
  holdJitter: 0.03,
  circlePath: 0.18,
  circleSpanX: 0.055,
  circleSpanY: 0.075,
  liftMinY: 0.58,
  liftMinX: 0.28,
  liftMaxX: 0.72,
  liftMoveY: 0.09,
  liftHoldMs: 550,
  liftFrameJitter: 0.025,
  liftMaxDriftX: 0.14,
  twoHandMinSeparation: 0.05,
  twoHandMotionDelta: 0.12,
  twoHandMinDurationMs: 240,
  thumbIndexSpreadRatio: 1,
  thumbIndexResetRatio: 0.62,
  thumbIndexCloseRatio: 0.35,
  thumbIndexCloseDistance: 0.075,
  thumbIndexStableMs: 240,
};

const LANDMARK = {
  wrist: 0,
  thumbTip: 4,
  indexTip: 8,
  indexPip: 6,
  middleTip: 12,
  middlePip: 10,
  ringTip: 16,
  ringPip: 14,
  pinkyTip: 20,
  pinkyPip: 18,
};

export class GestureInput {
  constructor({
    videoElement,
    onAction,
    onStatus,
    wasmBaseUrl = DEFAULT_WASM_BASE_URL,
    modelUrl = defaultHandLandmarkerModelUrl,
  }) {
    this.videoElement = videoElement;
    this.onAction = onAction;
    this.onStatus = onStatus;
    this.wasmBaseUrl = wasmBaseUrl;
    this.modelUrl = modelUrl;
    this.active = false;
    this.loading = null;
    this.handLandmarker = null;
    this.animationFrame = null;
    this.lastFrameAt = 0;
    this.lastAcceptedAt = 0;
    this.previousPose = 'none';
    this.history = [];
    this.twoHandHistory = [];
    this.spreadStartedAt = null;
    this.closeStartedAt = null;
    this.fistStartedAt = null;
    this.expectedActions = new Set();
    this.liftTracking = this.createLiftTracking();
    this.stepGate = { enabled: false, armed: true, resetMode: null, neutralSince: null };
    this.gateBypassed = false;
  }

  async start() {
    if (this.active) return;
    this.active = true;
    this.emitStatus({ state: 'loading', action: null, engine: 'MediaPipe Hands' });

    try {
      await this.initialize();
      this.lastFrameAt = 0;
      this.loop();
    } catch (error) {
      this.active = false;
      this.emitStatus({
        state: 'error',
        action: null,
        engine: 'MediaPipe Hands',
        error: error?.message ?? String(error),
      });
    }
  }

  stop() {
    this.active = false;
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }

    this.previousPose = 'none';
    this.history = [];
    this.twoHandHistory = [];
    this.spreadStartedAt = null;
    this.closeStartedAt = null;
    this.fistStartedAt = null;
    this.liftTracking = this.createLiftTracking();
    this.emitStatus({ state: 'paused', action: null, engine: 'MediaPipe Hands' });
  }

  beginStep({ actions = [], resetMode = null } = {}) {
    const enabled = actions.length > 0;
    this.expectedActions = new Set(actions);
    this.stepGate = {
      enabled,
      armed: !enabled,
      resetMode,
      neutralSince: null,
    };
    this.previousPose = 'none';
    this.history = [];
    this.twoHandHistory = [];
    this.spreadStartedAt = null;
    this.closeStartedAt = null;
    this.fistStartedAt = null;
    this.liftTracking = this.createLiftTracking();
  }

  createLiftTracking() {
    return {
      start: null,
      last: null,
      holdStartedAt: null,
      phase: 'ready',
      progress: 0,
      holdMs: 0,
    };
  }

  setGateBypassed(bypassed) {
    this.gateBypassed = bypassed;
    if (bypassed) this.stepGate.armed = true;
  }

  async initialize() {
    if (this.handLandmarker) return;
    if (!this.loading) {
      this.loading = this.createHandLandmarker();
    }

    this.handLandmarker = await this.loading;
  }

  async createHandLandmarker() {
    const fileset = await FilesetResolver.forVisionTasks(this.wasmBaseUrl);
    const options = {
      runningMode: 'VIDEO',
      numHands: 2,
      minHandDetectionConfidence: 0.55,
      minHandPresenceConfidence: 0.55,
      minTrackingConfidence: 0.5,
    };

    try {
      return await HandLandmarker.createFromOptions(fileset, {
        ...options,
        baseOptions: {
          modelAssetPath: this.modelUrl,
          delegate: 'GPU',
        },
      });
    } catch {
      return HandLandmarker.createFromOptions(fileset, {
        ...options,
        baseOptions: {
          modelAssetPath: this.modelUrl,
          delegate: 'CPU',
        },
      });
    }
  }

  loop = (time = 0) => {
    if (!this.active) return;

    if (time - this.lastFrameAt >= FRAME_INTERVAL_MS) {
      this.lastFrameAt = time;
      this.analyzeFrame(performance.now());
    }

    this.animationFrame = requestAnimationFrame(this.loop);
  };

  analyzeFrame(now) {
    if (!this.handLandmarker) {
      this.emitStatus({ state: 'loading', action: null, engine: 'MediaPipe Hands' });
      return;
    }

    if (!this.videoElement.srcObject || this.videoElement.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      this.emitStatus({ state: 'waiting-camera', action: null, engine: 'MediaPipe Hands' });
      return;
    }

    const result = this.handLandmarker.detectForVideo(this.videoElement, now);
    const hands = this.describeHands(result);
    const hand = this.pickHand(hands);

    if (!hand) {
      this.previousPose = 'none';
      this.history = [];
      this.twoHandHistory = [];
      this.spreadStartedAt = null;
      this.closeStartedAt = null;
      this.fistStartedAt = null;
      this.emitStatus({
        state: 'searching',
        action: null,
        engine: 'MediaPipe Hands',
        hands,
        handCount: hands.length,
      });
      return;
    }

    this.updateHistory(hand, now);
    const twoHandMovement = this.updateTwoHandHistory(hands, now);
    const movement = this.getMovement(now);
    const pose = this.classifyPose(hand);
    if (pose === 'thumb-index-spread') {
      if (this.spreadStartedAt == null) this.spreadStartedAt = now;
    } else {
      this.spreadStartedAt = null;
    }
    if (pose === 'thumb-index-close') {
      if (this.closeStartedAt == null) this.closeStartedAt = now;
    } else {
      this.closeStartedAt = null;
    }
    if (pose === 'fist') {
      if (this.fistStartedAt == null) this.fistStartedAt = now;
    } else {
      this.fistStartedAt = null;
    }
    const gate = this.updateStepGate({ hands, hand, movement, pose, now, twoHandMovement });
    const liftState = this.updateLiftTracking({ hand, pose, gate, now });
    const action = gate.armed
      ? this.classifyAction({ hand, movement, pose, now, twoHandMovement, liftState })
      : null;
    const accepted = this.maybeEmitAction(action, now);

    this.previousPose = pose;
    this.emitStatus({
      state: accepted ? 'accepted' : gate.armed ? 'tracking' : 'waiting-reset',
      action,
      engine: 'MediaPipe Hands',
      hand,
      hands,
      movement,
      twoHandMovement,
      liftState,
      pose,
      handCount: hands.length,
      cooldown: Math.max(0, ACTION_COOLDOWN_MS - (now - this.lastAcceptedAt)),
      resetHint: gate.hint,
    });
  }

  updateStepGate({ hands, hand, movement, pose, now, twoHandMovement }) {
    if (this.gateBypassed || !this.stepGate.enabled || this.stepGate.armed) {
      return { armed: true, hint: '' };
    }

    const resetState = this.getResetState({ hands, hand, movement, pose, twoHandMovement });
    if (!resetState.ready) {
      this.stepGate.neutralSince = null;
      return { armed: false, hint: resetState.hint };
    }

    if (this.stepGate.neutralSince == null) this.stepGate.neutralSince = now;
    if (now - this.stepGate.neutralSince < RESET_STABLE_MS) {
      return { armed: false, hint: '保持准备姿势片刻' };
    }

    this.stepGate.armed = true;
    this.history = [];
    this.twoHandHistory = [];
    this.previousPose = pose;
    return { armed: true, hint: '' };
  }

  getResetState({ hands, hand, movement, pose, twoHandMovement }) {
    switch (this.stepGate.resetMode) {
      case 'release-fist':
        return {
          ready: pose !== 'fist' && pose !== 'pinch' && hand.extendedCount >= 2,
          hint: '请先松开拳头，张开手掌',
        };
      case 'release-pinch':
        return {
          ready: pose !== 'pinch' && hand.pinchDistance >= 0.11,
          hint: '请先松开拇指和食指',
        };
      case 'two-hands-ready':
        return {
          ready: hands.length >= 2 && twoHandMovement.duration >= RESET_STABLE_MS && Math.abs(twoHandMovement.delta) <= 0.035,
          hint: '请让双手在画面中停稳',
        };
      case 'thumb-index-closed':
        return {
          ready: hand.thumbIndexSpreadRatio <= GESTURE_THRESHOLDS.thumbIndexResetRatio,
          hint: '请先合拢拇指和食指',
        };
      case 'thumb-index-open':
        return {
          ready: hand.thumbIndexSpreadRatio >= GESTURE_THRESHOLDS.thumbIndexSpreadRatio,
          hint: '请先张开拇指和食指',
        };
      case 'closed-hand':
        return {
          ready: pose !== 'open' && hand.extendedCount <= 1,
          hint: '请先收拢手指，再准备张掌',
        };
      case 'two-hands-close':
        return {
          ready: hands.length >= 2 && twoHandMovement.duration >= 180 && twoHandMovement.delta <= -0.06,
          hint: '请先把双手收近，再次准备拉开',
        };
      case 'two-hands-apart':
        return {
          ready: hands.length >= 2 && twoHandMovement.distance >= 0.24,
          hint: '请先把双手分开，准备向中间靠近',
        };
      case 'steady-hand':
        return {
          ready: movement.duration >= RESET_STABLE_MS && movement.pathLength <= 0.055,
          hint: '请先把手停稳，再开始轻扫',
        };
      case 'lift-ready':
        return {
          ready:
            pose === 'open' &&
            hand.normalizedX >= GESTURE_THRESHOLDS.liftMinX &&
            hand.normalizedX <= GESTURE_THRESHOLDS.liftMaxX &&
            hand.normalizedY < GESTURE_THRESHOLDS.liftMinY - 0.04,
          hint: '请先在画面中间、瑞兽上方张开手掌',
        };
      default:
        return { ready: true, hint: '' };
    }
  }

  updateLiftTracking({ hand, pose, gate, now }) {
    if (this.stepGate.resetMode !== 'lift-ready') {
      return this.createLiftTracking();
    }

    if (!gate.armed) {
      this.liftTracking = this.createLiftTracking();
      return this.liftTracking;
    }

    const tracking = this.liftTracking;
    if (pose !== 'open') {
      tracking.last = null;
      tracking.holdStartedAt = null;
      tracking.holdMs = 0;
      tracking.phase = 'move';
      tracking.progress = 0;
      return tracking;
    }

    const point = { x: hand.normalizedX, y: hand.normalizedY };
    const readyY = GESTURE_THRESHOLDS.liftMinY - 0.04;
    if (!tracking.start || point.y < readyY) {
      tracking.start = point;
      tracking.last = point;
      tracking.holdStartedAt = null;
      tracking.holdMs = 0;
      tracking.phase = 'move';
      tracking.progress = 0;
      return tracking;
    }

    const deltaY = point.y - tracking.start.y;
    const driftX = Math.abs(point.x - tracking.start.x);
    const inHorizontalZone =
      point.x >= GESTURE_THRESHOLDS.liftMinX &&
      point.x <= GESTURE_THRESHOLDS.liftMaxX &&
      driftX <= GESTURE_THRESHOLDS.liftMaxDriftX;
    const moveProgress = Math.min(1, Math.max(0, deltaY / GESTURE_THRESHOLDS.liftMoveY));
    const reachedTarget =
      inHorizontalZone &&
      point.y >= GESTURE_THRESHOLDS.liftMinY &&
      deltaY >= GESTURE_THRESHOLDS.liftMoveY;

    if (!reachedTarget) {
      tracking.holdStartedAt = null;
      tracking.holdMs = 0;
      tracking.phase = 'move';
      tracking.progress = moveProgress * 0.75;
      tracking.last = point;
      return tracking;
    }

    const frameMovement = tracking.last
      ? Math.hypot(point.x - tracking.last.x, point.y - tracking.last.y)
      : Infinity;
    if (frameMovement <= GESTURE_THRESHOLDS.liftFrameJitter) {
      if (tracking.holdStartedAt == null) tracking.holdStartedAt = now;
    } else {
      tracking.holdStartedAt = null;
    }

    tracking.holdMs = tracking.holdStartedAt == null ? 0 : now - tracking.holdStartedAt;
    tracking.phase = 'hold';
    tracking.progress = 0.75 + Math.min(1, tracking.holdMs / GESTURE_THRESHOLDS.liftHoldMs) * 0.25;
    tracking.last = point;
    return tracking;
  }

  describeHands(result) {
    const hands = result.landmarks ?? [];
    return hands.map((landmarks, index) => this.describeHand(landmarks, result.handedness?.[index]?.[0]));
  }

  pickHand(hands) {
    if (!hands.length) return null;

    let best = null;
    let bestScore = -Infinity;
    for (const hand of hands) {
      const score = hand.confidence * 100 + hand.boxArea * 2 + (hand.normalizedY > 0.22 ? 12 : 0);
      if (score > bestScore) {
        best = hand;
        bestScore = score;
      }
    }

    return best;
  }

  describeHand(landmarks, handedness) {
    const xs = landmarks.map((point) => point.x);
    const ys = landmarks.map((point) => point.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const wrist = landmarks[LANDMARK.wrist];
    const indexTip = landmarks[LANDMARK.indexTip];
    const thumbTip = landmarks[LANDMARK.thumbTip];
    const palm = this.averageLandmarks([
      landmarks[LANDMARK.wrist],
      landmarks[5],
      landmarks[9],
      landmarks[13],
      landmarks[17],
    ]);
    const pinchDistance = this.distance(thumbTip, indexTip);
    const palmWidth = Math.max(0.001, this.distance(landmarks[5], landmarks[17]));
    const thumbIndexSpreadRatio = pinchDistance / palmWidth;
    const fingers = {
      index: this.isFingerExtended(landmarks, LANDMARK.indexTip, LANDMARK.indexPip),
      middle: this.isFingerExtended(landmarks, LANDMARK.middleTip, LANDMARK.middlePip),
      ring: this.isFingerExtended(landmarks, LANDMARK.ringTip, LANDMARK.ringPip),
      pinky: this.isFingerExtended(landmarks, LANDMARK.pinkyTip, LANDMARK.pinkyPip),
    };
    const extendedCount = Object.values(fingers).filter(Boolean).length;
    const fingertipDistance = [
      LANDMARK.indexTip,
      LANDMARK.middleTip,
      LANDMARK.ringTip,
      LANDMARK.pinkyTip,
    ].reduce((total, landmarkIndex) => total + this.distance(landmarks[landmarkIndex], wrist), 0) / 4;

    return {
      landmarks,
      confidence: handedness?.score ?? 0.8,
      handedness: handedness?.categoryName ?? 'Unknown',
      x: palm.x,
      y: palm.y,
      normalizedX: 1 - palm.x,
      normalizedY: palm.y,
      boxArea: Math.max(0, maxX - minX) * Math.max(0, maxY - minY),
      extendedCount,
      fingers,
      fingertipDistance,
      pinchDistance,
      palmWidth,
      thumbIndexSpreadRatio,
      pinch: pinchDistance < GESTURE_THRESHOLDS.pinchDistance,
    };
  }

  averageLandmarks(points) {
    return points.reduce(
      (total, point) => ({
        x: total.x + point.x / points.length,
        y: total.y + point.y / points.length,
        z: total.z + (point.z ?? 0) / points.length,
      }),
      { x: 0, y: 0, z: 0 },
    );
  }

  isFingerExtended(landmarks, tipIndex, pipIndex) {
    const tip = landmarks[tipIndex];
    const pip = landmarks[pipIndex];
    return tip.y < pip.y - 0.025 || this.distance(tip, landmarks[LANDMARK.wrist]) > 0.28;
  }

  updateHistory(hand, now) {
    this.history.push({
      x: hand.x,
      y: hand.y,
      normalizedX: hand.normalizedX,
      normalizedY: hand.normalizedY,
      time: now,
    });
    this.history = this.history.filter((point) => now - point.time <= HISTORY_MS);
  }

  getMovement(now) {
    if (this.history.length < 2) {
      return { dx: 0, dy: 0, distance: 0, duration: 0, stableMs: 0, pathLength: 0, spanX: 0, spanY: 0 };
    }

    const first = this.history[0];
    const latest = this.history[this.history.length - 1];
    const dx = latest.x - first.x;
    const dy = latest.y - first.y;
    const distance = Math.hypot(dx, dy);
    const xs = this.history.map((point) => point.x);
    const ys = this.history.map((point) => point.y);
    const spanX = Math.max(...xs) - Math.min(...xs);
    const spanY = Math.max(...ys) - Math.min(...ys);
    const pathLength = this.history.reduce((total, point, index) => {
      if (index === 0) return total;
      const previous = this.history[index - 1];
      return total + Math.hypot(point.x - previous.x, point.y - previous.y);
    }, 0);
    const recent = this.history.filter((point) => now - point.time <= HOLD_MS);
    const center = recent.reduce(
      (total, point) => ({ x: total.x + point.x, y: total.y + point.y }),
      { x: 0, y: 0 },
    );

    center.x /= Math.max(1, recent.length);
    center.y /= Math.max(1, recent.length);

    const jitter = recent.reduce(
      (total, point) => total + Math.hypot(point.x - center.x, point.y - center.y),
      0,
    ) / Math.max(1, recent.length);
    const stableMs = recent.length >= 7 && jitter < GESTURE_THRESHOLDS.holdJitter ? now - recent[0].time : 0;

    return { dx, dy, distance, duration: latest.time - first.time, stableMs, pathLength, spanX, spanY };
  }

  updateTwoHandHistory(hands, now) {
    if (!hands || hands.length < 2) {
      this.twoHandHistory = [];
      return { distance: 0, delta: 0, duration: 0 };
    }

    const distance = this.getTwoHandSeparation(hands);
    this.twoHandHistory.push({ distance, time: now });
    this.twoHandHistory = this.twoHandHistory.filter((point) => now - point.time <= TWO_HAND_HISTORY_MS);

    const first = this.twoHandHistory[0];
    return {
      distance,
      delta: distance - first.distance,
      duration: now - first.time,
    };
  }

  classifyPose(hand) {
    const expectsThumbIndexClose = this.expectedActions.has('thumb-index-close');
    const isThumbIndexSpread =
      hand.fingers.index &&
      !hand.fingers.middle &&
      !hand.fingers.ring &&
      !hand.fingers.pinky &&
      hand.thumbIndexSpreadRatio >= GESTURE_THRESHOLDS.thumbIndexSpreadRatio;
    const isThumbIndexClose =
      expectsThumbIndexClose &&
      !hand.fingers.ring &&
      !hand.fingers.pinky &&
      (hand.thumbIndexSpreadRatio <= GESTURE_THRESHOLDS.thumbIndexCloseRatio ||
        hand.pinchDistance <= GESTURE_THRESHOLDS.thumbIndexCloseDistance);
    const isPinch =
      hand.pinchDistance < GESTURE_THRESHOLDS.pinchDistance &&
      hand.fingertipDistance < GESTURE_THRESHOLDS.fistFingertipDistance;
    const isOpen =
      hand.extendedCount >= 3 &&
      hand.fingertipDistance > GESTURE_THRESHOLDS.openFingertipDistance;
    const isPoint =
      (hand.extendedCount === 1 ||
        (hand.extendedCount === 2 && hand.fingertipDistance < 0.18)) &&
      hand.pinchDistance > GESTURE_THRESHOLDS.pointPinchDistance;
    const isFist =
      hand.extendedCount <= 1 &&
      hand.fingertipDistance < GESTURE_THRESHOLDS.fistFingertipDistance;

    if (isOpen) return 'open';
    if (isThumbIndexSpread) return 'thumb-index-spread';
    if (isThumbIndexClose) return 'thumb-index-close';
    if (isPoint) return 'point';
    if (isFist) return 'fist';
    if (isPinch) return 'pinch';
    return 'hand';
  }

  classifyAction({ hand, movement, pose, now, twoHandMovement, liftState }) {
    if (now - this.lastAcceptedAt < ACTION_COOLDOWN_MS) return null;

    const horizontalMove = Math.max(Math.abs(movement.dx), movement.spanX ?? 0);
    const verticalMove = Math.max(Math.abs(movement.dy), movement.spanY ?? 0);
    const hasMotion = movement.distance > 0.055 || movement.pathLength > 0.1;

    if (liftState?.holdMs >= GESTURE_THRESHOLDS.liftHoldMs) {
      return {
        type: 'lift',
        label: '托起',
        normalizedX: hand.normalizedX,
        normalizedY: hand.normalizedY,
      };
    }

    if (
      pose === 'thumb-index-spread' &&
      this.spreadStartedAt != null &&
      now - this.spreadStartedAt >= GESTURE_THRESHOLDS.thumbIndexStableMs
    ) {
      return {
        type: 'thumb-index-spread',
        label: '拇指食指张开',
        normalizedX: hand.normalizedX,
        normalizedY: hand.normalizedY,
      };
    }

    if (
      pose === 'thumb-index-close' &&
      this.closeStartedAt != null &&
      now - this.closeStartedAt >= GESTURE_THRESHOLDS.thumbIndexStableMs
    ) {
      return {
        type: 'thumb-index-close',
        label: '拇指食指并拢',
        normalizedX: hand.normalizedX,
        normalizedY: hand.normalizedY,
      };
    }

    if (
      twoHandMovement.duration >= GESTURE_THRESHOLDS.twoHandMinDurationMs &&
      twoHandMovement.distance >= GESTURE_THRESHOLDS.twoHandMinSeparation &&
      twoHandMovement.delta <= -GESTURE_THRESHOLDS.twoHandMotionDelta
    ) {
      return {
        type: 'two-hands-close',
        label: '双手靠近',
        normalizedX: hand.normalizedX,
        normalizedY: hand.normalizedY,
      };
    }

    if (
      twoHandMovement.duration >= GESTURE_THRESHOLDS.twoHandMinDurationMs &&
      twoHandMovement.delta >= GESTURE_THRESHOLDS.twoHandMotionDelta
    ) {
      return {
        type: 'two-hands-apart',
        label: '双手远离',
        normalizedX: hand.normalizedX,
        normalizedY: hand.normalizedY,
      };
    }

    if (
      pose === 'fist' &&
      this.fistStartedAt != null &&
      now - this.fistStartedAt >= GESTURE_THRESHOLDS.fistStableMs
    ) {
      return {
        type: 'fist',
        label: '握拳',
        normalizedX: hand.normalizedX,
        normalizedY: hand.normalizedY,
      };
    }

    if (pose === 'open' && this.previousPose !== 'open') {
      return {
        type: 'open',
        label: '张开手掌',
        normalizedX: hand.normalizedX,
        normalizedY: hand.normalizedY,
      };
    }

    if (
      ['point', 'hand'].includes(pose) &&
      movement.pathLength > GESTURE_THRESHOLDS.circlePath &&
      movement.spanX > GESTURE_THRESHOLDS.circleSpanX &&
      movement.spanY > GESTURE_THRESHOLDS.circleSpanY
    ) {
      return {
        type: 'circle',
        label: '单指绕圈',
        normalizedX: hand.normalizedX,
        normalizedY: hand.normalizedY,
      };
    }

    if (
      pose === 'point' &&
      horizontalMove > GESTURE_THRESHOLDS.horizontalMove &&
      horizontalMove > verticalMove * 1.1
    ) {
      return {
        type: 'one-finger-swipe',
        label: movement.dx > 0 ? '单指右扫' : '单指左扫',
        normalizedX: hand.normalizedX,
        normalizedY: hand.normalizedY,
      };
    }

    if (
      hasMotion &&
      pose === 'pinch' &&
      verticalMove > GESTURE_THRESHOLDS.verticalMove &&
      verticalMove > horizontalMove * 0.85
    ) {
      return {
        type: 'pinch-down',
        label: '捏合下放',
        normalizedX: hand.normalizedX,
        normalizedY: hand.normalizedY,
      };
    }

    if (hasMotion && pose === 'pinch') {
      return {
        type: 'pinch-place',
        label: '捏合安放',
        normalizedX: hand.normalizedX,
        normalizedY: hand.normalizedY,
      };
    }

    if (
      hasMotion &&
      pose === 'open' &&
      verticalMove > GESTURE_THRESHOLDS.verticalMove &&
      verticalMove > horizontalMove * 0.85
    ) {
      return {
        type: 'open-down',
        label: '张掌下贴',
        normalizedX: hand.normalizedX,
        normalizedY: hand.normalizedY,
      };
    }

    if (hasMotion && horizontalMove > GESTURE_THRESHOLDS.horizontalMove && horizontalMove > verticalMove * 1.25) {
      return {
        type: 'swipe',
        label: movement.dx > 0 ? '横向右扫' : '横向左扫',
        normalizedX: hand.normalizedX,
        normalizedY: hand.normalizedY,
      };
    }

    if (hasMotion && verticalMove > GESTURE_THRESHOLDS.verticalMove && verticalMove > horizontalMove * 1.1) {
      return {
        type: 'down',
        label: '向下移动',
        normalizedX: hand.normalizedX,
        normalizedY: hand.normalizedY,
      };
    }

    if (movement.stableMs >= HOLD_MS) {
      return {
        type: pose === 'open' ? 'open-hold' : 'hold',
        label: pose === 'open' ? '张掌停留' : '手势停留',
        normalizedX: hand.normalizedX,
        normalizedY: hand.normalizedY,
      };
    }

    return null;
  }

  getTwoHandSeparation(hands) {
    if (!hands || hands.length < 2) return 0;
    const [first, second] = hands
      .slice()
      .sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0))
      .slice(0, 2);

    return Math.hypot(first.normalizedX - second.normalizedX, first.normalizedY - second.normalizedY);
  }

  maybeEmitAction(action, now) {
    if (!action) return false;
    const accepted = Boolean(this.onAction?.(action));
    if (accepted) {
      this.lastAcceptedAt = now;
      this.history = [];
      this.twoHandHistory = [];
      this.spreadStartedAt = null;
      this.closeStartedAt = null;
      this.fistStartedAt = null;
    }
    return accepted;
  }

  distance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y, (a.z ?? 0) - (b.z ?? 0));
  }

  emitStatus(status) {
    this.onStatus?.(status);
  }
}
