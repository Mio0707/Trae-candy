export class AudioManager {
  constructor() {
    this.audioMap = new Map();
    this.currentAudio = null;
    this.enabled = false;
    this.basePath = import.meta.env.BASE_URL + 'assets/audio/';
    this.supported = typeof Audio !== 'undefined';
  }

  init() {
    if (!this.supported) {
      console.warn('Audio not supported');
      return;
    }

    const audioIds = [
      'landing-intro',
      'base-small', 'body-block', 'front-legs', 'back-mustache',
      'head-place', 'ears', 'head-lines', 'ball-place',
      'complete', 'lift-blessing', 'fortune-shell', 'blessing-complete'
    ];

    for (const id of audioIds) {
      const audio = new Audio(`${this.basePath}${id}.mp3`);
      audio.preload = 'auto';
      audio.playsInline = true;
      // 立即加入 map，不等待 loadeddata（移动端可能永远不触发）
      this.audioMap.set(id, audio);
    }

    this.enabled = true;
  }

  play(id, force = false) {
    if ((!this.enabled && !force) || !this.supported) return;

    this.stop();

    const audio = this.audioMap.get(id);
    if (!audio) {
      console.warn(`Audio ${id}.mp3 not loaded`);
      return;
    }

    audio.currentTime = 0;
    const p = audio.play();
    if (p && p.catch) {
      p.catch(e => {
        console.warn('Audio play failed:', e);
      });
    }
    this.currentAudio = audio;
  }

  stop() {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }
  }

  toggle() {
    this.enabled = !this.enabled;
    if (!this.enabled) {
      this.stop();
    }
    return this.enabled;
  }

  isPlaying() {
    return this.currentAudio && !this.currentAudio.paused;
  }
}
