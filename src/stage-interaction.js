import { FORTUNES, STAGE_STEPS, getPhaseIndex, matchesStepGesture } from './stage-content.js';

/**
 * 独立流程控制器。
 * 它不操作页面和模型：前端收到 state 后决定如何显示和播放动画即可。
 */
export class StageInteraction extends EventTarget {
  constructor({ steps = STAGE_STEPS, fortunes = FORTUNES, random = Math.random } = {}) {
    super();
    this.steps = steps;
    this.fortunes = fortunes;
    this.random = random;
    this.reset();
  }

  get step() { return this.steps[this.index]; }

  getState() {
    const step = this.step;
    const phaseIndex = getPhaseIndex(step.id);
    return {
      index: this.index,
      step,
      steps: this.steps,
      phaseIndex,
      phaseCount: 6,
      selectedFortune: this.selectedFortune,
      isComplete: step.id === 'blessing-complete',
      isAutoStep: Boolean(step.autoAdvance),
    };
  }

  reset() {
    this.index = 0;
    this.selectedFortune = null;
    this.emit('reset');
    return this.getState();
  }

  next({ source = 'button' } = {}) {
    if (this.index >= this.steps.length - 1) return false;
    const nextStep = this.steps[this.index + 1];
    if (nextStep.id === 'lift-blessing' && !this.selectedFortune) this.selectRandomFortune();
    this.index += 1;
    this.emit('stepchange', { source });
    return true;
  }

  previous() {
    if (this.index <= 0) return false;
    this.index -= 1;
    this.emit('stepchange', { source: 'previous' });
    return true;
  }

  acceptGesture(action) {
    const actionType = typeof action === 'string' ? action : action?.type;
    if (!matchesStepGesture(this.step, actionType)) return false;
    return this.next({ source: 'gesture' });
  }

  finishAutoAnimation() {
    if (!this.step.autoAdvance) return false;
    return this.next({ source: 'animation' });
  }

  selectFortune(fortuneId) {
    this.selectedFortune = this.fortunes.find((fortune) => fortune.id === fortuneId) ?? this.fortunes[0];
    this.emit('fortunechange');
    return this.selectedFortune;
  }

  selectRandomFortune() {
    const index = Math.floor(this.random() * this.fortunes.length);
    return this.selectFortune(this.fortunes[index]?.id);
  }

  emit(type, detail = {}) {
    this.dispatchEvent(new CustomEvent(type, { detail: { ...detail, state: this.getState() } }));
  }
}
